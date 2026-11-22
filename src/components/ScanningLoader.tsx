import React from 'react';
import { FetchProgress } from '../utils/chessComApi';

interface ScanningLoaderProps {
  progress: FetchProgress;
}

/**
 * Playful monochrome SVG line-art scanner shown while parallel Chess.com archive requests run.
 */
export const ScanningLoader: React.FC<ScanningLoaderProps> = ({ progress }) => {
  const pct =
    progress.archivesTotal > 0
      ? Math.min(100, Math.round((progress.archivesFetched / progress.archivesTotal) * 100))
      : progress.stage === 'profile'
      ? 18
      : 65;

  return (
    <div className="w-full max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114] p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6">
        {/* Goofy animated SVG Detective Knight with magnifying monocle */}
        <svg
          viewBox="0 0 110 96"
          className="w-24 h-20 shrink-0 overflow-visible"
          aria-hidden="true"
        >
          {/* Floating scoresheet lines */}
          <g className="stroke-zinc-300 dark:stroke-zinc-700" strokeWidth="1.4" strokeLinecap="round">
            <rect x="64" y="14" width="36" height="46" fill="none" />
            <line x1="70" y1="24" x2="94" y2="24" />
            <line x1="70" y1="33" x2="90" y2="33" />
            <line x1="70" y1="42" x2="94" y2="42" />
            <line x1="70" y1="51" x2="84" y2="51" />
          </g>

          {/* Animated Knight silhouette */}
          <g className="animate-float-subtle">
            <path
              d="M16 78 C18 66 25 60 27 49 C19 46 17 37 23 30 C28 24 36 21 41 25 L46 19 L48 28 C57 32 61 42 55 51 C49 55 41 53 40 58 C42 66 51 68 57 78 Z"
              className="fill-[#FAFAFA] dark:fill-zinc-900 stroke-zinc-950 dark:stroke-zinc-100"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* Detective eye + magnifying glass inspecting scoresheet */}
            <circle cx="40" cy="36" r="3.4" className="fill-zinc-950 dark:fill-zinc-100" />
            <circle cx="58" cy="37" r="11" fill="none" className="stroke-zinc-950 dark:stroke-zinc-100" strokeWidth="2" />
            <line x1="66" y1="45" x2="75" y2="54" className="stroke-zinc-950 dark:stroke-zinc-100" strokeWidth="2.4" strokeLinecap="round" />
          </g>
        </svg>

        <div className="flex-1 w-full min-w-0">
          <div className="flex items-center justify-between gap-4 text-xs font-mono mb-2">
            <span className="font-semibold truncate">{progress.message}</span>
            <span className="tabular-nums text-zinc-500 shrink-0">{pct}%</span>
          </div>

          <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div
              className="h-full bg-zinc-950 dark:bg-zinc-100 transition-all duration-300 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono text-zinc-500 dark:text-zinc-400 tabular-nums">
            <span>
              Archives: {progress.archivesFetched}/{progress.archivesTotal || '—'}
            </span>
            <span>·</span>
            <span>Games parsed: {progress.gamesParsed}</span>
            <span>·</span>
            <span>Parallel batch mode active</span>
          </div>
        </div>
      </div>
    </div>
  );
};
