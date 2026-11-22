import React, { useDeferredValue, useMemo, useState } from 'react';
import { ArrowUpRight, Search, SlidersHorizontal } from 'lucide-react';
import { AnalyzedGame, BoardThemeId, PieceSetId } from '../types/chess';
import { MiniChessboard } from './MiniChessboard';
import { BOARD_THEMES, PIECE_SETS } from './BoardThemes';
import { soundEngine } from '../utils/soundEngine';

interface ArchiveDashboardProps {
  username: string;
  isSample: boolean;
  games: AnalyzedGame[];
  totalGamesScanned: number;
  durationMs: number;
  boardTheme: BoardThemeId;
  pieceSet: PieceSetId;
  onChangeBoardTheme: (theme: BoardThemeId) => void;
  onChangePieceSet: (set: PieceSetId) => void;
  onOpenReview: (game: AnalyzedGame) => void;
  onOpenCodex: () => void;
}

type FilterMode = 'all-mates' | 'my-mates' | 'opponent-mates' | 'rare' | 'all-games';

const GAMES_PER_PAGE = 24;

function ArchiveCardSkeletons() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114] flex flex-col sm:flex-row overflow-hidden animate-pulse motion-reduce:animate-none">
          <div className="sm:w-44 md:w-48 shrink-0 p-3 sm:p-3.5 sm:border-r border-b sm:border-b-0 border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60">
            <div className="aspect-square w-full max-w-[210px] sm:max-w-none mx-auto bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-3 mt-3 w-2/3 bg-zinc-200 dark:bg-zinc-800" />
          </div>
          <div className="flex-1 min-w-0 p-3.5 sm:p-5 space-y-3">
            <div className="h-3 w-1/2 bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-6 w-3/4 bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-3 w-5/6 bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-3 w-2/3 bg-zinc-200 dark:bg-zinc-800" />
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
              <div className="h-3 w-full bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-3 w-5/6 bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-3 w-3/4 bg-zinc-200 dark:bg-zinc-800" />
            </div>
            <div className="h-8 w-28 ml-auto bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

export const ArchiveDashboard: React.FC<ArchiveDashboardProps> = ({
  username,
  isSample,
  games,
  totalGamesScanned,
  durationMs,
  boardTheme,
  pieceSet,
  onChangeBoardTheme,
  onChangePieceSet,
  onOpenReview,
  onOpenCodex,
}) => {
  const [filterMode, setFilterMode] = useState<FilterMode>('all-mates');
  const [searchQuery, setSearchQuery] = useState('');
  const [showStyleBar, setShowStyleBar] = useState(false);
  const [pagination, setPagination] = useState({ games, count: GAMES_PER_PAGE });
  const visibleCount = pagination.games === games ? pagination.count : GAMES_PER_PAGE;
  const selectedFilters = useMemo(() => ({ filterMode, searchQuery }), [filterMode, searchQuery]);
  const renderedFilters = useDeferredValue(selectedFilters);
  const isFiltering = selectedFilters !== renderedFilters;

  const selectFilter = (mode: FilterMode) => {
    setFilterMode(mode);
    setPagination({ games, count: GAMES_PER_PAGE });
  };

  const stats = useMemo(() => {
    const mateGames = games.filter((g) => g.endedByCheckmate && g.checkmate);
    const myMates = mateGames.filter((g) => g.userWon);
    const oppMates = mateGames.filter((g) => !g.userWon);
    const rareMates = mateGames.filter(
      (g) => g.checkmate && (g.checkmate.isUncharted || g.checkmate.uniquenessScore >= 68)
    );

    // Signature most-used mate
    const freq = new Map<string, number>();
    for (const g of myMates) {
      const name = g.checkmate!.patternName;
      freq.set(name, (freq.get(name) ?? 0) + 1);
    }
    let signatureMate = 'None yet';
    let maxFreq = 0;
    for (const [name, count] of freq.entries()) {
      if (count > maxFreq) {
        maxFreq = count;
        signatureMate = name;
      }
    }

    const fastestMate =
      myMates.length > 0
        ? myMates.reduce((best, cur) => (cur.totalMoves < best.totalMoves ? cur : best), myMates[0])
        : null;

    const uniquePatternIds = new Set(mateGames.map((g) => g.checkmate!.patternId));

    return {
      totalMates: mateGames.length,
      myMatesCount: myMates.length,
      oppMatesCount: oppMates.length,
      rareCount: rareMates.length,
      signatureMate,
      fastestMoves: fastestMate ? `${fastestMate.totalMoves} moves` : '—',
      uniquePatternCount: uniquePatternIds.size,
      gamesByFilter: {
        'all-mates': games.filter((g) => g.endedByCheckmate),
        'my-mates': games.filter((g) => g.endedByCheckmate && g.userWon),
        'opponent-mates': games.filter((g) => g.endedByCheckmate && !g.userWon),
        rare: rareMates,
        'all-games': games,
      } satisfies Record<FilterMode, AnalyzedGame[]>,
    };
  }, [games]);

  const filteredGames = useMemo(() => {
    const q = renderedFilters.searchQuery.trim().toLowerCase();
    const candidates = stats.gamesByFilter[renderedFilters.filterMode];
    if (!q) return candidates;
    return candidates.filter((g) => {
      const haystack = [
        g.checkmate?.patternName ?? '',
        g.checkmate?.aka ?? '',
        g.white.username,
        g.black.username,
        g.openingName,
        g.timeClass,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [stats, renderedFilters]);

  return (
    <section
      id="archive-results"
      aria-label="Analyzed Chess.com Archive"
      className="scroll-mt-20 w-full max-w-[1320px] mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-10 border-t border-zinc-200 dark:border-zinc-800"
    >
      {/* Archive Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6 sm:mb-8">
        <div className="min-w-0">
          <p className="text-[11px] sm:text-xs font-mono text-zinc-500 dark:text-zinc-400">
            {isSample ? 'Curated Sample GM Archive' : 'Live Chess.com Parallel Scan'} · {totalGamesScanned} games scanned
            {durationMs > 0 ? ` in ${(durationMs / 1000).toFixed(2)}s` : ''}
          </p>
          <h2 className="text-xl sm:text-3xl font-bold tracking-tight mt-1 break-words">
            {username}’s Checkmate Ledger
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              soundEngine.play('click');
              setShowStyleBar((v) => !v);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-[11px] sm:text-xs font-mono border border-zinc-300 dark:border-zinc-800 hover:border-zinc-900 dark:hover:border-zinc-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Board Style
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.play('click');
              onOpenCodex();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-[11px] sm:text-xs font-mono bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap shrink-0"
          >
            Codex ({stats.uniquePatternCount}/38)
          </button>
        </div>
      </div>

      {/* Optional inline Board & Piece Quick Customizer */}
      {showStyleBar && (
        <div className="mb-6 sm:mb-8 p-3.5 sm:p-4 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114] grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mb-2">
              Board Theme
            </div>
            <div className="flex flex-wrap gap-1.5">
              {BOARD_THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    soundEngine.play('click');
                    onChangeBoardTheme(t.id);
                  }}
                  className={`px-2.5 py-1.5 text-[11px] sm:text-xs font-mono border cursor-pointer transition-colors ${
                    boardTheme === t.id
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 border-zinc-900 dark:border-zinc-100'
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-500'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mb-2">
              Piece Set
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PIECE_SETS.map((ps) => (
                <button
                  key={ps.id}
                  type="button"
                  onClick={() => {
                    soundEngine.play('click');
                    onChangePieceSet(ps.id);
                  }}
                  className={`px-2.5 py-1.5 text-[11px] sm:text-xs font-mono border cursor-pointer transition-colors ${
                    pieceSet === ps.id
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 border-zinc-900 dark:border-zinc-100'
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-500'
                  }`}
                >
                  {ps.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Architectural 5-Column KPI Strip (No nested cards — clean 1px hairlines) */}
      <div className="grid grid-cols-2 md:grid-cols-5 border border-zinc-200 dark:border-zinc-800 divide-y md:divide-y-0 md:divide-x divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-[#111114] mb-6 sm:mb-8">
        <div className="p-3 sm:p-4">
          <div className="text-[11px] sm:text-xs font-mono text-zinc-500 dark:text-zinc-400">Mates Delivered</div>
          <div className="text-xl sm:text-2xl font-display font-bold mt-1 tabular-nums">{stats.myMatesCount}</div>
        </div>
        <div className="p-3 sm:p-4 border-l border-zinc-200 dark:border-zinc-800 md:border-l-0">
          <div className="text-[11px] sm:text-xs font-mono text-zinc-500 dark:text-zinc-400">Suffered</div>
          <div className="text-xl sm:text-2xl font-display font-bold mt-1 tabular-nums">{stats.oppMatesCount}</div>
        </div>
        <div className="p-3 sm:p-4">
          <div className="text-[11px] sm:text-xs font-mono text-zinc-500 dark:text-zinc-400">Rare & Uncharted</div>
          <div className="text-xl sm:text-2xl font-display font-bold mt-1 tabular-nums">{stats.rareCount}</div>
        </div>
        <div className="p-3 sm:p-4 border-l border-zinc-200 dark:border-zinc-800 md:border-l-0">
          <div className="text-[11px] sm:text-xs font-mono text-zinc-500 dark:text-zinc-400">Fastest Mate</div>
          <div className="text-xl sm:text-2xl font-display font-bold mt-1 tabular-nums">{stats.fastestMoves}</div>
        </div>
        <div className="p-3 sm:p-4 col-span-2 md:col-span-1">
          <div className="text-[11px] sm:text-xs font-mono text-zinc-500 dark:text-zinc-400">Signature Weapon</div>
          <div className="text-base font-display font-bold mt-1 truncate" title={stats.signatureMate}>
            {stats.signatureMate}
          </div>
        </div>
      </div>

      {/* Filter Segmented Bar & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 mb-6">
        <div role="tablist" aria-label="Archive game filters" className="flex flex-wrap items-center gap-1 p-1 border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950">
          {(
            [
              { id: 'all-mates', label: `All Mates (${stats.totalMates})` },
              { id: 'my-mates', label: `Mine (${stats.myMatesCount})` },
              { id: 'opponent-mates', label: `Opponent (${stats.oppMatesCount})` },
              { id: 'rare', label: `Rare (${stats.rareCount})` },
              { id: 'all-games', label: `All (${games.length})` },
            ] as { id: FilterMode; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`archive-tab-${tab.id}`}
              aria-selected={filterMode === tab.id}
              aria-controls="archive-filtered-games"
              tabIndex={filterMode === tab.id ? 0 : -1}
              onKeyDown={(event) => {
                if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                const tabs = Array.from(event.currentTarget.parentElement!.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
                const index = tabs.indexOf(event.currentTarget);
                const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
                  : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
                event.preventDefault();
                tabs[nextIndex].focus();
                tabs[nextIndex].click();
              }}
              onClick={() => {
                soundEngine.play('click');
                selectFilter(tab.id);
              }}
              className={`px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-mono transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                filterMode === tab.id
                  ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white border border-zinc-300 dark:border-zinc-700 font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 border border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPagination({ games, count: GAMES_PER_PAGE });
            }}
            placeholder="Filter mate, opponent, opening..."
            aria-label="Filter analyzed games"
            className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-white dark:bg-[#111114] border border-zinc-300 dark:border-zinc-800 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-300"
          />
        </div>
      </div>

      <div
        id="archive-filtered-games"
        role="tabpanel"
        aria-labelledby={`archive-tab-${filterMode}`}
        aria-busy={isFiltering}
      >
      {isFiltering ? (
        <>
          <span role="status" className="sr-only">Loading matching games.</span>
          <ArchiveCardSkeletons />
        </>
      ) : filteredGames.length === 0 ? (
        <div className="py-14 px-4 sm:px-6 text-center border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114]">
          <p className="text-base font-display font-semibold">No matching games in this filter.</p>
          <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400 mt-1.5">
            Try switching to “All Mates” or clearing your search query.
          </p>
          <button
            type="button"
            onClick={() => {
              selectFilter('all-mates');
              setSearchQuery('');
            }}
            className="mt-4 px-4 py-2 text-xs font-mono border border-zinc-900 dark:border-zinc-200 hover:bg-zinc-900 hover:text-white dark:hover:bg-zinc-100 dark:hover:text-zinc-950 transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        /* Architectural Game Cards Grid */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
          {filteredGames.slice(0, visibleCount).map((game) => {
            const mate = game.checkmate;
            const opponent = game.userColor === 'w' ? game.black : game.white;
            const userPlayer = game.userColor === 'w' ? game.white : game.black;

            return (
              <article
                key={game.id}
                className="group border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114] hover:border-zinc-900 dark:hover:border-zinc-400 transition-colors flex flex-col sm:flex-row overflow-hidden"
              >
                {/* Left: Shaded Mini-Chessboard showing final checkmate geometry */}
                <div className="sm:w-44 md:w-48 shrink-0 p-3 sm:p-3.5 sm:border-r border-b sm:border-b-0 border-zinc-200 dark:border-zinc-800 flex flex-col justify-between bg-zinc-50 dark:bg-zinc-950/60">
                  <div className="w-full max-w-[210px] sm:max-w-none mx-auto">
                    <MiniChessboard
                      fen={game.finalFen}
                      boardTheme={boardTheme}
                      pieceSet={pieceSet}
                      highlightFrom={game.lastMove?.from}
                      highlightTo={game.lastMove?.to}
                      matedKingSquare={mate?.matedKingSquare}
                      orientation={game.userColor}
                    />
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono text-zinc-500 dark:text-zinc-400 tabular-nums">
                    <span>{game.lastMove?.san ?? '—'}</span>
                    <span>{game.totalMoves} moves</span>
                  </div>
                </div>

                {/* Right: Editorial Details, Uniqueness, Fun Fact, Goofy Quip, Full Timestamp */}
                <div className="flex-1 min-w-0 p-3.5 sm:p-5 flex flex-col justify-between gap-3">
                  <div>
                    {/* Clean Unboxed Metadata Line (Zero Pill Discipline!) */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                      <span
                        className={
                          game.userWon
                            ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                            : 'text-red-700 dark:text-red-400 font-semibold'
                        }
                      >
                        {game.endedByCheckmate
                          ? game.userWon
                            ? 'You delivered mate'
                            : 'Opponent checkmated you'
                          : game.userWon
                          ? 'Won'
                          : 'Finished'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{mate ? mate.rarity : game.timeClass}</span>
                      {mate && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">{mate.uniquenessScore}% novelty</span>
                        </>
                      )}
                    </div>

                    {/* Primary Checkmate Pattern Title */}
                    <h3 className="text-lg font-display font-bold tracking-tight mt-1">
                      {mate ? mate.patternName : game.openingName}
                    </h3>

                    {/* Players & Full Timestamp */}
                    <div className="mt-1 text-xs font-mono text-zinc-600 dark:text-zinc-400 space-y-0.5">
                      <div className="truncate">
                        {userPlayer.username} ({userPlayer.rating}) vs {opponent.username} ({opponent.rating})
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-500 tabular-nums">
                        Played {game.fullTimestamp} · {game.timeClass}
                      </div>
                    </div>

                    {/* Goofy Quip & Historical Fun Fact */}
                    {mate ? (
                      <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2 text-xs">
                        <p className="italic text-zinc-800 dark:text-zinc-200 leading-relaxed">
                          “{mate.goofyQuip}”
                        </p>
                        <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                          <span className="font-mono text-zinc-500">Fact: </span>
                          {mate.funFact}
                        </p>
                        {mate.isUncharted && (
                          <p className="font-mono text-[11px] text-zinc-900 dark:text-zinc-100">
                            ✦ Potentially unique board web ({mate.geometrySignature}) — outside 36 standard textbook mates.
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400">
                        Ended without checkmate ({game.white.result} / {game.black.result}). Open in Studio for full accuracy & coach review.
                      </p>
                    )}
                  </div>

                  {/* Action Footer */}
                  <div className="pt-2 flex items-center justify-between gap-3">
                    <span className="text-[11px] font-mono text-zinc-500 truncate">
                      {game.ecoCode} · {game.openingName}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.play('click');
                        onOpenReview(game);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-mono bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap shrink-0 spring-btn"
                    >
                      Review Game
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {!isFiltering && filteredGames.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-zinc-500 dark:text-zinc-400">
          <span>Showing {Math.min(visibleCount, filteredGames.length)} of {filteredGames.length} matching games</span>
          {visibleCount < filteredGames.length && (
            <button
              type="button"
              onClick={() => setPagination({ games, count: visibleCount + GAMES_PER_PAGE })}
              className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 hover:border-zinc-900 dark:hover:border-zinc-300 transition-colors cursor-pointer"
            >
              Load more games
            </button>
          )}
        </div>
      )}
      </div>
    </section>
  );
};
