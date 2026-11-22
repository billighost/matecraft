import React from 'react';
import { MoveReviewItem } from '../types/chess';

interface EvalChartProps {
  moves: MoveReviewItem[];
  currentPly: number;
  onSelectPly: (ply: number) => void;
}

/**
 * Interactive monochrome Win Probability Advantage Graph.
 * Shows White vs Black win probability over every ply; click any point to jump directly there.
 */
export const EvalChart: React.FC<EvalChartProps> = ({ moves, currentPly, onSelectPly }) => {
  const width = 420;
  const height = 104;
  const padX = 6;
  const padY = 8;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const points = [
    { ply: 0, prob: 50, classification: 'Book' as const },
    ...moves.map((m) => ({
      ply: m.ply,
      prob: m.winProbWhite,
      classification: m.classification,
    })),
  ];

  const maxPly = Math.max(1, points.length - 1);

  const toX = (ply: number) => padX + (ply / maxPly) * innerW;
  const toY = (prob: number) => padY + ((100 - prob) / 100) * innerH;

  const linePath = points
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${toX(pt.ply).toFixed(1)} ${toY(pt.prob).toFixed(1)}`)
    .join(' ');

  const areaPath = `${linePath} L ${toX(maxPly).toFixed(1)} ${(padY + innerH).toFixed(1)} L ${toX(0).toFixed(1)} ${(padY + innerH).toFixed(1)} Z`;

  const clampedPly = Math.max(0, Math.min(maxPly, currentPly));
  const activePoint = points[clampedPly] ?? points[0];

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetPly = Math.round(ratio * maxPly);
    onSelectPly(targetPly);
  };

  return (
    <div className="w-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#111114] p-3">
      <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mb-2">
        <span>Win Probability Timeline</span>
        <span className="tabular-nums">
          White {Math.round(activePoint.prob)}% · Black {Math.round(100 - activePoint.prob)}%
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full h-24 cursor-pointer select-none overflow-visible"
        onClick={handleSvgClick}
        role="img"
        aria-label="Interactive win probability evaluation graph across game moves"
      >
        {/* Black advantage upper field */}
        <rect
          x={padX}
          y={padY}
          width={innerW}
          height={innerH}
          className="fill-zinc-900/90 dark:fill-zinc-950"
        />

        {/* White advantage filled area below curve */}
        <path d={areaPath} className="fill-zinc-100 dark:fill-zinc-200" />

        {/* 50% Equilibrium hairline */}
        <line
          x1={padX}
          y1={toY(50)}
          x2={padX + innerW}
          y2={toY(50)}
          className="stroke-zinc-400 dark:stroke-zinc-500"
          strokeWidth="1"
          strokeDasharray="3 3"
        />

        {/* Evaluation curve stroke */}
        <path
          d={linePath}
          fill="none"
          className="stroke-zinc-950 dark:stroke-white"
          strokeWidth="1.6"
        />

        {/* Turning-point blunder/brilliant dots */}
        {points.map((pt) => {
          if (pt.ply === 0) return null;
          if (pt.classification !== 'Blunder' && pt.classification !== 'Brilliant') return null;
          const isBlunder = pt.classification === 'Blunder';
          return (
            <circle
              key={pt.ply}
              cx={toX(pt.ply)}
              cy={toY(pt.prob)}
              r="3"
              fill={isBlunder ? '#DC2626' : '#16A34A'}
              stroke="#FFFFFF"
              strokeWidth="1"
            />
          );
        })}

        {/* Active ply vertical scrubber */}
        <line
          x1={toX(clampedPly)}
          y1={padY}
          x2={toX(clampedPly)}
          y2={padY + innerH}
          stroke="#D97706"
          strokeWidth="1.5"
        />
        <circle
          cx={toX(clampedPly)}
          cy={toY(activePoint.prob)}
          r="4"
          fill="#D97706"
          stroke="#FFFFFF"
          strokeWidth="1.4"
        />
      </svg>
    </div>
  );
};
