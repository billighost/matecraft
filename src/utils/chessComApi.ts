import { AnalyzedGame } from '../types/chess';
import { parseRawGameToAnalyzed } from '../data/sampleGames';

export interface ChessComProfile {
  username: string;
  name?: string;
  title?: string;
  avatar?: string;
  country?: string;
  followers?: number;
  url?: string;
}

export interface FetchProgress {
  stage: 'profile' | 'archives' | 'analyzing' | 'done';
  message: string;
  archivesFetched: number;
  archivesTotal: number;
  gamesParsed: number;
  checkmatesFound: number;
}

export interface ChessComFetchResult {
  profile: ChessComProfile;
  games: AnalyzedGame[];
  totalGamesScanned: number;
  archivesScanned: number;
  durationMs: number;
}

interface RawChessComGame {
  url?: string;
  pgn?: string;
  end_time?: number;
  time_class?: string;
  time_control?: string;
  rules?: string;
  white?: { username?: string; rating?: number; result?: string };
  black?: { username?: string; rating?: number; result?: string };
}

// Client-side memory cache so repeat lookups are instantaneous
const clientCache = new Map<string, { result: ChessComFetchResult; expiresAt: number }>();

/**
 * Fetches a Chess.com user's recent monthly archives in parallel batches and classifies all checkmates.
 */
export async function fetchAndAnalyzeChessComUser(
  username: string,
  monthsToScan = 6,
  onProgress?: (progress: FetchProgress) => void
): Promise<ChessComFetchResult> {
  const cleanUser = username.trim().toLowerCase();
  if (!cleanUser) {
    throw new Error('Please enter a Chess.com username.');
  }

  const cacheKey = `${cleanUser}:${monthsToScan}`;
  const cached = clientCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    onProgress?.({
      stage: 'done',
      message: 'Loaded instantaneously from cache',
      archivesFetched: cached.result.archivesScanned,
      archivesTotal: cached.result.archivesScanned,
      gamesParsed: cached.result.totalGamesScanned,
      checkmatesFound: cached.result.games.filter((g) => g.endedByCheckmate).length,
    });
    return cached.result;
  }

  const startedAt = performance.now();

  onProgress?.({
    stage: 'profile',
    message: `Locating Chess.com profile for ${cleanUser}...`,
    archivesFetched: 0,
    archivesTotal: 0,
    gamesParsed: 0,
    checkmatesFound: 0,
  });

  const playerResp = await fetch(`/api/chess/player/${encodeURIComponent(cleanUser)}`);
  const playerData = await playerResp.json();
  if (!playerResp.ok) {
    throw new Error(playerData?.error || `Could not fetch profile for "${cleanUser}".`);
  }

  const profile: ChessComProfile = {
    username: playerData.profile?.username || cleanUser,
    name: playerData.profile?.name,
    title: playerData.profile?.title,
    avatar: playerData.profile?.avatar,
    followers: playerData.profile?.followers,
    url: playerData.profile?.url,
  };

  const allArchives: string[] = Array.isArray(playerData.archives) ? playerData.archives : [];
  if (allArchives.length === 0) {
    return {
      profile,
      games: [],
      totalGamesScanned: 0,
      archivesScanned: 0,
      durationMs: Math.round(performance.now() - startedAt),
    };
  }

  // Take the most recent N monthly archives (reverse chronological)
  const targetArchives = allArchives.slice(-monthsToScan).reverse();
  const batchSize = 4; // Parallel batches of 4 monthly archives at a time
  const batches: string[][] = [];
  for (let i = 0; i < targetArchives.length; i += batchSize) {
    batches.push(targetArchives.slice(i, i + batchSize));
  }

  onProgress?.({
    stage: 'archives',
    message: `Fetching ${targetArchives.length} monthly archives in parallel...`,
    archivesFetched: 0,
    archivesTotal: targetArchives.length,
    gamesParsed: 0,
    checkmatesFound: 0,
  });

  const allRawGames: RawChessComGame[] = [];
  let archivesFetched = 0;

  // Run up to 2 batch requests in parallel for maximum throughput!
  await Promise.all(
    batches.map(async (urls) => {
      const resp = await fetch('/api/chess/archives/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls }),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data.games)) {
          allRawGames.push(...data.games);
        }
        archivesFetched += urls.length;
        onProgress?.({
          stage: 'archives',
          message: `Parallel download: ${archivesFetched}/${targetArchives.length} monthly archives ready...`,
          archivesFetched,
          archivesTotal: targetArchives.length,
          gamesParsed: allRawGames.length,
          checkmatesFound: 0,
        });
      }
    })
  );

  onProgress?.({
    stage: 'analyzing',
    message: `Scanning ${allRawGames.length} games for checkmate geometry & rare patterns...`,
    archivesFetched: targetArchives.length,
    archivesTotal: targetArchives.length,
    gamesParsed: allRawGames.length,
    checkmatesFound: 0,
  });

  // Filter standard chess games that have a PGN and sort newest first
  const standardGames = allRawGames
    .filter((g) => g.pgn && (!g.rules || g.rules === 'chess'))
    .sort((a, b) => (b.end_time || 0) - (a.end_time || 0));

  // Prioritize checkmated games first for fast parsing, while also keeping recent non-mate games available for full review
  const analyzed: AnalyzedGame[] = [];
  let checkmatesFound = 0;

  for (let i = 0; i < standardGames.length; i++) {
    const g = standardGames[i];
    const isLikelyCheckmate =
      g.white?.result === 'checkmated' ||
      g.black?.result === 'checkmated' ||
      (g.pgn && g.pgn.includes('#'));

    // Parse all checkmates + up to 40 most recent non-mate games so large 2,000-game archives stay snappy
    if (!isLikelyCheckmate && analyzed.length >= 60) {
      continue;
    }

    const parsed = parseRawGameToAnalyzed(
      {
        id: g.url?.split('/').pop() || `game-${i}-${g.end_time || 0}`,
        url: g.url,
        pgn: g.pgn!,
        white: {
          username: g.white?.username || 'White',
          rating: g.white?.rating || 1200,
          result: g.white?.result,
        },
        black: {
          username: g.black?.username || 'Black',
          rating: g.black?.rating || 1200,
          result: g.black?.result,
        },
        endTime: g.end_time || 0,
        timeClass: g.time_class || 'rapid',
        timeControl: g.time_control || '600',
      },
      cleanUser,
      false
    );

    if (parsed.endedByCheckmate) {
      checkmatesFound++;
    }
    analyzed.push(parsed);
  }

  const result: ChessComFetchResult = {
    profile,
    games: analyzed,
    totalGamesScanned: standardGames.length,
    archivesScanned: targetArchives.length,
    durationMs: Math.round(performance.now() - startedAt),
  };

  clientCache.set(cacheKey, { result, expiresAt: Date.now() + 5 * 60 * 1000 });

  onProgress?.({
    stage: 'done',
    message: `Scanned ${standardGames.length} games in ${(result.durationMs / 1000).toFixed(2)}s`,
    archivesFetched: targetArchives.length,
    archivesTotal: targetArchives.length,
    gamesParsed: standardGames.length,
    checkmatesFound,
  });

  return result;
}
