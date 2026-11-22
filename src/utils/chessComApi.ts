import type { AnalyzedGame } from '../types/chess';
import { analyzeArchiveGame } from './chessArchiveAnalysis';
import type { ArchiveGameJob, RawChessComGame } from './chessArchiveAnalysis';

export interface ChessComDateRange { startDate: string; endDate: string }
export interface ChessComProfile {
  username: string; name?: string; title?: string; avatar?: string;
  country?: string; followers?: number; url?: string;
}
export interface FetchProgress {
  stage: 'profile' | 'archives' | 'analyzing' | 'done';
  message: string; archivesFetched: number; archivesTotal: number;
  gamesParsed: number; checkmatesFound: number;
}
export interface ChessComFetchResult {
  profile: ChessComProfile; games: AnalyzedGame[]; totalGamesScanned: number;
  archivesScanned: number; durationMs: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_PARALLEL_ARCHIVES = 12;
const clientCache = new Map<string, { result: ChessComFetchResult; expiresAt: number }>();
const monthCache = new Map<string, { games: RawChessComGame[]; expiresAt: number }>();
const analysisCache = new Map<string, AnalyzedGame>();

function readDay(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Choose a valid start and end date.');
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== value) {
    throw new Error('Choose a valid start and end date.');
  }
  return timestamp;
}

export function dateRangeBounds(range?: ChessComDateRange): { start: number; end: number } | undefined {
  if (!range) return undefined;
  const start = readDay(range.startDate);
  const end = readDay(range.endDate) + 86_400_000 - 1;
  if (start > end) throw new Error('The end date must be on or after the start date.');
  return { start, end };
}

export function selectArchiveUrls(archives: string[], months: number, range?: ChessComDateRange): string[] {
  const bounds = dateRangeBounds(range);
  const sorted = [...new Set(archives)].filter((url) => /\/games\/\d{4}\/\d{2}$/.test(url)).sort();
  if (!bounds) return (months > 0 ? sorted.slice(-Math.floor(months)) : sorted).reverse();
  return sorted.filter((url) => {
    const match = /\/games\/(\d{4})\/(\d{2})$/.exec(url)!;
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (month < 1 || month > 12) return false;
    const monthStart = Date.UTC(year, month - 1, 1);
    const monthEnd = Date.UTC(year, month, 1) - 1;
    return monthStart <= bounds.end && monthEnd >= bounds.start;
  }).reverse();
}

function cacheAnalysis(key: string, game: AnalyzedGame) {
  if (analysisCache.size >= 6000) analysisCache.delete(analysisCache.keys().next().value!);
  analysisCache.set(key, game);
}

function analysisKey(job: ArchiveGameJob, username: string): string {
  const game = job.raw;
  return `${username}:${game.url || job.index}:${game.end_time || 0}:${game.pgn}`;
}

async function analyzeGames(
  jobs: ArchiveGameJob[], username: string, onProgress: (processed: number, mates: number) => void,
): Promise<AnalyzedGame[]> {
  const result = new Array<AnalyzedGame>(jobs.length);
  const pending: { job: ArchiveGameJob; resultIndex: number; key: string }[] = [];
  let processed = 0;
  let mates = 0;
  for (let i = 0; i < jobs.length; i++) {
    const key = analysisKey(jobs[i], username);
    const cached = analysisCache.get(key);
    if (cached) {
      result[i] = cached;
      processed++;
      if (cached.endedByCheckmate) mates++;
    } else pending.push({ job: jobs[i], resultIndex: i, key });
  }
  onProgress(processed, mates);
  const complete = (entries: typeof pending, games: AnalyzedGame[]) => {
    entries.forEach((entry, i) => {
      result[entry.resultIndex] = games[i];
      cacheAnalysis(entry.key, games[i]);
      processed++;
      if (games[i].endedByCheckmate) mates++;
    });
    onProgress(processed, mates);
  };
  if (!pending.length) return result;

  const fallback = async (entries: typeof pending) => {
    // A short time budget also keeps older browsers responsive without Workers.
    let sliceStart = performance.now();
    for (const entry of entries) {
      complete([entry], [analyzeArchiveGame(entry.job, username)]);
      if (performance.now() - sliceStart >= 8) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        sliceStart = performance.now();
      }
    }
  };
  if (typeof Worker === 'undefined') {
    await fallback(pending);
    return result;
  }

  const chunks: (typeof pending)[] = [];
  for (let i = 0; i < pending.length; i += 16) chunks.push(pending.slice(i, i + 16));
  const cores = typeof navigator === 'undefined' ? 4 : navigator.hardwareConcurrency || 4;
  const workerCount = Math.min(3, chunks.length, Math.max(1, cores - 1));
  let nextChunk = 0;
  await Promise.all(Array.from({ length: workerCount }, async () => {
    let worker: Worker | undefined;
    try {
      worker = new Worker(new URL('../workers/chessAnalysis.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      while (nextChunk < chunks.length) await fallback(chunks[nextChunk++]);
      return;
    }
    try {
      while (nextChunk < chunks.length) {
        const chunk = chunks[nextChunk++];
        try {
          const games = await new Promise<AnalyzedGame[]>((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Analysis worker timed out.')), 30_000);
            worker!.onmessage = ({ data }: MessageEvent<{ games?: AnalyzedGame[]; error?: string }>) => {
              clearTimeout(timer);
              if (data.error || !data.games) reject(new Error(data.error || 'Analysis worker returned no games.'));
              else resolve(data.games);
            };
            worker!.onerror = (event) => { clearTimeout(timer); event.preventDefault(); reject(new Error('Analysis worker could not start.')); };
            try {
              worker!.postMessage({ id: nextChunk, username, jobs: chunk.map((entry) => entry.job) });
            } catch (error) { clearTimeout(timer); reject(error); }
          });
          complete(chunk, games);
        } catch {
          worker.terminate();
          worker = undefined;
          await fallback(chunk);
          while (nextChunk < chunks.length) await fallback(chunks[nextChunk++]);
          return;
        }
      }
    } finally { worker?.terminate(); }
  }));
  return result;
}

async function fetchMonth(url: string): Promise<RawChessComGame[]> {
  const cached = monthCache.get(url);
  if (cached && cached.expiresAt > Date.now()) return cached.games;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch('/api/chess/archives/batch', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        // One month per response avoids oversized serverless responses for busy players.
        body: JSON.stringify({ urls: [url] }), signal: AbortSignal.timeout(25_000),
      });
      const data = await response.json();
      if (!response.ok || data.fetchedCount !== 1 || !Array.isArray(data.games)) {
        throw new Error(data.error || 'Chess.com could not provide this monthly archive.');
      }
      if (monthCache.size >= 180) monthCache.delete(monthCache.keys().next().value!);
      monthCache.set(url, { games: data.games, expiresAt: Date.now() + CACHE_TTL_MS });
      return data.games;
    } catch (error) {
      if (attempt === 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }
  throw new Error('Unable to download this archive.');
}

/** Downloads up to twelve months concurrently; chess parsing runs in a bounded worker pool. */
export async function fetchAndAnalyzeChessComUser(
  username: string, monthsToScan = 6, onProgress?: (progress: FetchProgress) => void,
  dateRange?: ChessComDateRange,
): Promise<ChessComFetchResult> {
  const cleanUser = username.trim().toLowerCase();
  if (!/^[a-z0-9_-]{2,40}$/.test(cleanUser)) throw new Error('Please enter a valid Chess.com username.');
  const bounds = dateRangeBounds(dateRange);
  const cacheKey = `${cleanUser}:${dateRange ? `${dateRange.startDate}:${dateRange.endDate}` : monthsToScan}`;
  const cached = clientCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    onProgress?.({ stage: 'done', message: 'Loaded instantly from cache', archivesFetched: cached.result.archivesScanned,
      archivesTotal: cached.result.archivesScanned, gamesParsed: cached.result.totalGamesScanned,
      checkmatesFound: cached.result.games.filter((game) => game.endedByCheckmate).length });
    return cached.result;
  }
  const startedAt = performance.now();
  onProgress?.({ stage: 'profile', message: `Locating Chess.com profile for ${cleanUser}...`,
    archivesFetched: 0, archivesTotal: 0, gamesParsed: 0, checkmatesFound: 0 });
  const playerResp = await fetch(`/api/chess/player/${encodeURIComponent(cleanUser)}`, { signal: AbortSignal.timeout(25_000) });
  const playerData = await playerResp.json();
  if (!playerResp.ok) throw new Error(playerData?.error || `Could not fetch profile for "${cleanUser}".`);
  const profile: ChessComProfile = {
    username: playerData.profile?.username || cleanUser, name: playerData.profile?.name,
    title: playerData.profile?.title, avatar: playerData.profile?.avatar,
    followers: playerData.profile?.followers, url: playerData.profile?.url,
  };
  const allArchives = Array.isArray(playerData.archives) ? playerData.archives.filter((url: unknown): url is string => typeof url === 'string') : [];
  const targetArchives = selectArchiveUrls(allArchives, monthsToScan, dateRange);
  const downloaded: RawChessComGame[][] = new Array(targetArchives.length);
  let nextArchive = 0;
  let archivesFetched = 0;
  let downloadedGames = 0;
  let failures = 0;
  const reportArchives = () => onProgress?.({ stage: 'archives',
    message: `Parallel download: ${archivesFetched}/${targetArchives.length} monthly archives ready...`,
    archivesFetched, archivesTotal: targetArchives.length, gamesParsed: downloadedGames, checkmatesFound: 0 });
  reportArchives();
  await Promise.all(Array.from({ length: Math.min(MAX_PARALLEL_ARCHIVES, targetArchives.length) }, async () => {
    while (nextArchive < targetArchives.length) {
      const index = nextArchive++;
      try {
        downloaded[index] = await fetchMonth(targetArchives[index]);
        downloadedGames += downloaded[index].length;
        archivesFetched++;
      } catch { failures++; downloaded[index] = []; }
      reportArchives();
    }
  }));
  if (failures) {
    throw new Error(`Chess.com could not load ${failures} of ${targetArchives.length} monthly archives. Try again; the completed downloads are cached.`);
  }
  const seen = new Set<string>();
  const standardGames = downloaded.flat().filter((game) => {
    if (!game.pgn || (game.rules && game.rules !== 'chess')) return false;
    if (bounds && (!game.end_time || game.end_time * 1000 < bounds.start || game.end_time * 1000 > bounds.end)) return false;
    const key = game.url || `${game.end_time}:${game.pgn}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => (b.end_time || 0) - (a.end_time || 0));
  let recentNonMates = 0;
  const jobs: ArchiveGameJob[] = [];
  standardGames.forEach((raw, index) => {
    const isMate = raw.white?.result === 'checkmated' || raw.black?.result === 'checkmated' || raw.pgn!.includes('#');
    if (isMate || recentNonMates++ < 60) jobs.push({ raw, index });
  });
  const analyzed = await analyzeGames(jobs, cleanUser, (processed, mates) => onProgress?.({
    stage: 'analyzing', message: `Analyzing ${processed}/${jobs.length} review games from ${standardGames.length} archive games...`,
    archivesFetched, archivesTotal: targetArchives.length, gamesParsed: processed, checkmatesFound: mates,
  }));
  const result: ChessComFetchResult = { profile, games: analyzed, totalGamesScanned: standardGames.length,
    archivesScanned: archivesFetched, durationMs: Math.round(performance.now() - startedAt) };
  if (clientCache.size >= 12) clientCache.delete(clientCache.keys().next().value!);
  clientCache.set(cacheKey, { result, expiresAt: Date.now() + CACHE_TTL_MS });
  onProgress?.({ stage: 'done', message: `Scanned ${standardGames.length} games in ${(result.durationMs / 1000).toFixed(2)}s`,
    archivesFetched, archivesTotal: targetArchives.length, gamesParsed: standardGames.length,
    checkmatesFound: analyzed.filter((game) => game.endedByCheckmate).length });
  return result;
}
