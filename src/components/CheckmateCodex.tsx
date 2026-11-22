import React, { useMemo, useState } from 'react';
import { ArrowUpRight, Search } from 'lucide-react';
import { CHECKMATE_LIBRARY } from '../engine/checkmateLibrary';
import {
  AnalyzedGame,
  BoardThemeId,
  CheckmateCategory,
  CheckmatePatternDef,
  PieceSetId,
} from '../types/chess';
import { MiniChessboard } from './MiniChessboard';
import { soundEngine } from '../utils/soundEngine';

interface CheckmateCodexProps {
  analyzedGames: AnalyzedGame[];
  boardTheme: BoardThemeId;
  pieceSet: PieceSetId;
  onInspectPattern: (pattern: CheckmatePatternDef) => void;
}

const CATEGORIES: ('All' | CheckmateCategory)[] = [
  'All',
  'Opening Trap',
  'Classic Tactical',
  'Royal Geometry',
  'Endgame',
  'Special & Rare',
];

export const CheckmateCodex: React.FC<CheckmateCodexProps> = ({
  analyzedGames,
  boardTheme,
  pieceSet,
  onInspectPattern,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'All' | CheckmateCategory>('All');
  const [search, setSearch] = useState('');

  // Track which patterns the current player has delivered or suffered!
  const unlockMap = useMemo(() => {
    const map = new Map<string, { delivered: number; suffered: number }>();
    for (const g of analyzedGames) {
      if (!g.checkmate) continue;
      const cur = map.get(g.checkmate.patternId) ?? { delivered: 0, suffered: 0 };
      if (g.userWon) cur.delivered++;
      else cur.suffered++;
      map.set(g.checkmate.patternId, cur);
    }
    return map;
  }, [analyzedGames]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return CHECKMATE_LIBRARY.filter((p) => {
      if (selectedCategory !== 'All' && p.category !== selectedCategory) return false;
      if (!q) return true;
      return `${p.name} ${p.aka ?? ''} ${p.funFact} ${p.goofyQuip}`.toLowerCase().includes(q);
    });
  }, [selectedCategory, search]);

  const unlockedCount = unlockMap.size;

  return (
    <section
      aria-label="Checkmate Codex Encyclopedia"
      className="w-full max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-10"
    >
      <div className="flex flex-wrap items-end justify-between gap-4 pb-6 mb-8 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
            Complete Checkmate Encyclopedia · {CHECKMATE_LIBRARY.length} Archetypes Indexed
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">
            The Checkmate Codex
          </h2>
        </div>
        <div className="text-xs font-mono text-zinc-600 dark:text-zinc-400 tabular-nums">
          Unlocked in current archive:{' '}
          <strong className="text-zinc-950 dark:text-zinc-100">
            {unlockedCount} / {CHECKMATE_LIBRARY.length}
          </strong>
        </div>
      </div>

      {/* Category Filter & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex flex-wrap items-center gap-1 p-1 border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                soundEngine.play('click');
                setSelectedCategory(cat);
              }}
              className={`px-3 py-1.5 text-xs font-mono transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                selectedCategory === cat
                  ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white border border-zinc-300 dark:border-zinc-700 font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 border border-transparent'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search 38 checkmates..."
            aria-label="Search checkmate patterns"
            className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-white dark:bg-[#111114] border border-zinc-300 dark:border-zinc-800 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-300"
          />
        </div>
      </div>

      {/* 3-Column Encyclopedia Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map((pattern) => {
          const stats = unlockMap.get(pattern.id);
          const isUnlocked = Boolean(stats);

          return (
            <article
              key={pattern.id}
              className={`border bg-white dark:bg-[#111114] flex flex-col justify-between transition-colors ${
                isUnlocked
                  ? 'border-zinc-900 dark:border-zinc-300'
                  : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600'
              }`}
            >
              <div className="p-4 flex gap-4">
                <div className="w-24 sm:w-28 shrink-0">
                  <MiniChessboard
                    fen={pattern.exampleFen}
                    boardTheme={boardTheme}
                    pieceSet={pieceSet}
                    highlightFrom={pattern.exampleHighlight?.from}
                    highlightTo={pattern.exampleHighlight?.to}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                    {pattern.category} · {pattern.rarity}
                  </div>
                  <h3 className="text-base font-display font-bold leading-snug mt-0.5">
                    {pattern.name}
                  </h3>
                  {pattern.aka && (
                    <div className="text-[11px] font-mono text-zinc-500 truncate">
                      aka {pattern.aka}
                    </div>
                  )}
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2 leading-relaxed">
                    {pattern.howItWorks}
                  </p>
                </div>
              </div>

              <div className="px-4 pb-4 pt-3 border-t border-zinc-100 dark:border-zinc-900 space-y-2 text-xs">
                <p className="italic text-zinc-800 dark:text-zinc-200">
                  “{pattern.goofyQuip}”
                </p>
                <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  {pattern.funFact}
                </p>

                <div className="pt-2 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
                    {stats
                      ? `Delivered ${stats.delivered} · Suffered ${stats.suffered}`
                      : 'Not encountered yet'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.play('click');
                      onInspectPattern(pattern);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-zinc-900 dark:text-zinc-100 hover:underline cursor-pointer whitespace-nowrap"
                  >
                    Tweak on Board
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
