import React, { useState } from 'react';
import { motion } from 'motion/react';
import { soundEngine } from '../utils/soundEngine';

/**
 * Detailed, interactive, hand-drawn architectural SVG line-art Hero Illustration.
 * Depicts a goofy Smothered Checkmate in progress on a shaded monochrome board:
 * - Distinct hatched dark squares vs clean light squares (with blueprint coordinate ticks)
 * - A smug wide-eyed Knight leaping over the castle wall along a dashed parabolic arc
 * - A trapped Black King sweating animated drops with a wobbling crown
 * - Clickable to trigger a spring hop + playful commentary swap!
 */
export const HeroIllustration: React.FC = () => {
  const [hopCount, setHopCount] = useState(0);

  const quips = [
    'Nf7# — "Excuse me, hopping over your wall!"',
    'King on g8: "Who locked all three exits?!"',
    'Uncharted geometry? Scanning 38+ mate patterns...',
    'Rook on f8: "I am literally helping the enemy."',
  ];

  const activeQuip = quips[hopCount % quips.length];

  const triggerGoofyHop = () => {
    soundEngine.play(hopCount % 2 === 0 ? 'checkmate' : 'move');
    setHopCount((c) => c + 1);
  };

  // 4x4 focused corner crop of the Kingside (e5..h8) rendered with crisp perspective & architectural hatching
  const files = ['e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5'];

  return (
    <div className="relative w-full h-full flex flex-col justify-between select-none">
      <button
        type="button"
        onClick={triggerGoofyHop}
        aria-label="Replay goofy smothered mate animation"
        className="group relative w-full text-left border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114] p-4 sm:p-5 cursor-pointer focus-visible:outline-2 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-100 transition-colors hover:border-zinc-400 dark:hover:border-zinc-600"
      >
        {/* Top blueprint header strip */}
        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 dark:text-zinc-400 pb-3 mb-3 border-b border-zinc-200 dark:border-zinc-800">
          <span>FIG. 01 — SMOTHERED MATE ANATOMY</span>
          <span className="group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">
            Click to hop ↻
          </span>
        </div>

        <svg
          viewBox="0 0 460 340"
          className="w-full h-auto overflow-visible"
          role="img"
          aria-label="Hand-drawn animated chessboard illustration showing a goofy White Knight leaping into f7 to smother-mate a sweating Black King"
        >
          <defs>
            {/* Distinct architectural cross-hatching for DARK board squares */}
            <pattern id="hero-dark-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="8" height="8" className="fill-zinc-200 dark:fill-zinc-800" />
              <line x1="0" y1="0" x2="0" y2="8" className="stroke-zinc-300 dark:stroke-zinc-700" strokeWidth="1.4" />
            </pattern>
            {/* Subtle dot grain for LIGHT board squares */}
            <pattern id="hero-light-dots" width="10" height="10" patternUnits="userSpaceOnUse">
              <rect width="10" height="10" className="fill-[#FAFAFA] dark:fill-[#1A1A1F]" />
              <circle cx="5" cy="5" r="0.6" className="fill-zinc-300 dark:fill-zinc-700" />
            </pattern>
            {/* Diagonal hatching for Black pieces so Black vs White contrast is super clear */}
            <pattern id="black-piece-shade" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
              <rect width="5" height="5" className="fill-zinc-900 dark:fill-zinc-950" />
              <line x1="0" y1="0" x2="0" y2="5" className="stroke-zinc-700 dark:stroke-zinc-800" strokeWidth="1.2" />
            </pattern>
            <marker id="arrow-head" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" className="fill-zinc-900 dark:fill-zinc-100" />
            </marker>
          </defs>

          {/* Outer blueprint registration reticles */}
          <g className="stroke-zinc-400 dark:stroke-zinc-600" strokeWidth="0.9" fill="none">
            <path d="M26 24 H38 M32 18 V30" />
            <path d="M422 24 H434 M428 18 V30" />
            <path d="M26 312 H38 M32 306 V318" />
            <path d="M422 312 H434 M428 306 V318" />
          </g>

          {/* 4x4 Shaded Monochrome Chessboard Grid (x: 68..372, y: 34..306) */}
          <g transform="translate(68, 34)">
            <rect
              x="0"
              y="0"
              width="304"
              height="272"
              className="fill-none stroke-zinc-900 dark:stroke-zinc-200 animate-draw"
              style={{ ['--dash-length' as string]: 1200 }}
              strokeWidth="1.75"
            />
            {ranks.map((rank, rIdx) =>
              files.map((file, fIdx) => {
                const isDarkSq = (rIdx + fIdx) % 2 === 1;
                const x = fIdx * 76;
                const y = rIdx * 68;
                const isKingSq = file === 'h' && rank === '8';
                const isTargetSq = file === 'f' && rank === '7';
                return (
                  <g key={`${file}${rank}`}>
                    <rect
                      x={x}
                      y={y}
                      width="76"
                      height="68"
                      fill={isDarkSq ? 'url(#hero-dark-hatch)' : 'url(#hero-light-dots)'}
                      className="stroke-zinc-300 dark:stroke-zinc-700"
                      strokeWidth="0.75"
                    />
                    {isKingSq && (
                      <rect
                        x={x + 3}
                        y={y + 3}
                        width="70"
                        height="62"
                        fill="none"
                        className="stroke-zinc-900 dark:stroke-zinc-100"
                        strokeWidth="1.4"
                        strokeDasharray="4 3"
                      />
                    )}
                    {isTargetSq && (
                      <circle
                        cx={x + 38}
                        cy={y + 34}
                        r="24"
                        fill="none"
                        className="stroke-zinc-900 dark:stroke-zinc-100"
                        strokeWidth="1.2"
                        strokeDasharray="3 3"
                        opacity="0.55"
                      />
                    )}
                    {/* Coordinate micro-ticks */}
                    {fIdx === 0 && (
                      <text
                        x="-14"
                        y={y + 38}
                        className="fill-zinc-500 dark:fill-zinc-400 text-[10px] font-mono"
                        textAnchor="middle"
                      >
                        {rank}
                      </text>
                    )}
                    {rIdx === 3 && (
                      <text
                        x={x + 38}
                        y="290"
                        className="fill-zinc-500 dark:fill-zinc-400 text-[10px] font-mono"
                        textAnchor="middle"
                      >
                        {file}
                      </text>
                    )}
                  </g>
                );
              })
            )}

            {/* === BLACK ROOK ON g8 (blocking King!) === */}
            <g transform="translate(152, 4)">
              <path
                d="M20 56 L22 49 L25 46 L24 26 L20 23 L20 15 L27 15 L27 19 L33 19 L33 15 L43 15 L43 19 L49 19 L49 15 L56 15 L56 23 L52 26 L51 46 L54 49 L56 56 Z"
                fill="url(#black-piece-shade)"
                className="stroke-zinc-950 dark:stroke-zinc-100"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              {/* Awkward side-eye looking at the King */}
              <circle cx="34" cy="33" r="3.4" className="fill-white" />
              <circle cx="43" cy="33" r="3.4" className="fill-white" />
              <circle cx="35.6" cy="33" r="1.4" className="fill-zinc-950" />
              <circle cx="44.6" cy="33" r="1.4" className="fill-zinc-950" />
              <path d="M34 41 H43" className="stroke-zinc-100" strokeWidth="1.5" strokeLinecap="round" />
            </g>

            {/* === BLACK PAWNS ON g7 & h7 (blocking King's escape!) === */}
            {[152, 228].map((px, idx) => (
              <g key={px} transform={`translate(${px}, 76)`}>
                <path
                  d="M22 54 C24 46 28 43 30 35 C25 32 25 20 38 19 C51 20 51 32 46 35 C48 43 52 46 54 54 Z"
                  fill="url(#black-piece-shade)"
                  className="stroke-zinc-950 dark:stroke-zinc-100"
                  strokeWidth="1.75"
                  strokeLinejoin="round"
                />
                {/* Goofy wide oblivious eyes */}
                <circle cx="34" cy="27" r="2.8" className="fill-white" />
                <circle cx="42" cy="27" r="2.8" className="fill-white" />
                <circle cx={idx === 0 ? 33 : 43} cy="26.5" r="1.1" className="fill-zinc-950" />
                <circle cx={idx === 0 ? 41 : 43} cy="26.5" r="1.1" className="fill-zinc-950" />
                <path d="M35 33 Q38 35 41 33" fill="none" className="stroke-zinc-100" strokeWidth="1.3" strokeLinecap="round" />
              </g>
            ))}

            {/* === TRAPPED BLACK KING ON h8 (sweating + wobbling crown!) === */}
            <g transform="translate(228, 2)">
              {/* Wobbling crown cross on top */}
              <g className="animate-crown-wobble">
                <path
                  d="M38 2 V12 M33 7 H43"
                  className="stroke-zinc-950 dark:stroke-zinc-100"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </g>
              {/* King body */}
              <path
                d="M20 58 L22 50 C17 40 19 22 30 20 C34 20 36 23 38 24 C40 23 42 20 46 20 C57 22 59 40 54 50 L56 58 Z"
                fill="url(#black-piece-shade)"
                className="stroke-zinc-950 dark:stroke-zinc-100"
                strokeWidth="1.9"
                strokeLinejoin="round"
              />
              {/* Panicked wide eyes */}
              <circle cx="32" cy="34" r="4.2" className="fill-white" />
              <circle cx="44" cy="34" r="4.2" className="fill-white" />
              <circle cx="31" cy="34.5" r="1.4" className="fill-zinc-950" />
              <circle cx="43" cy="34.5" r="1.4" className="fill-zinc-950" />
              {/* Wavy "oh no" mouth */}
              <path
                d="M32 45 Q35 42 38 45 T44 45"
                fill="none"
                className="stroke-zinc-100"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              {/* Animated sweat drops */}
              <path
                d="M62 20 C62 20 66 26 62 29 C58 26 62 20 62 20 Z"
                className="fill-zinc-900 dark:fill-zinc-100 animate-sweat"
              />
              <path
                d="M68 30 C68 30 71 34 68 36 C65 34 68 30 68 30 Z"
                className="fill-zinc-500 dark:fill-zinc-400 animate-sweat"
                style={{ animationDelay: '750ms' }}
              />
            </g>

            {/* === ANIMATED DASHED LEAPING ARC FROM h6 -> f7 === */}
            <path
              d="M 262 174 Q 186 72 118 104"
              fill="none"
              className="stroke-zinc-900 dark:stroke-zinc-100 animate-dash-flow"
              strokeWidth="1.8"
              strokeDasharray="6 6"
              markerEnd="url(#arrow-head)"
            />
            {/* Origin ghost silhouette on h6 */}
            <circle
              cx="266"
              cy="176"
              r="7"
              fill="none"
              className="stroke-zinc-400 dark:stroke-zinc-500"
              strokeWidth="1.4"
              strokeDasharray="2 2"
            />

            {/* === LETHAL ATTACK RAY FROM KNIGHT ON f7 TO KING ON h8 === */}
            <path
              d="M 134 94 L 228 94 L 228 46"
              fill="none"
              className="stroke-zinc-900 dark:stroke-zinc-100 animate-draw"
              style={{ ['--dash-length' as string]: 240, ['--draw-delay' as string]: '250ms' }}
              strokeWidth="1.4"
              strokeDasharray="3 4"
              opacity="0.7"
            />
            {/* Sharp checkmate hash badge drawn right beside h8 */}
            <g transform="translate(292, -10)">
              <rect
                x="0"
                y="0"
                width="26"
                height="24"
                className="fill-zinc-900 dark:fill-zinc-100"
              />
              <text
                x="13"
                y="16.5"
                textAnchor="middle"
                className="fill-white dark:fill-zinc-950 font-mono text-[13px] font-bold"
              >
                #
              </text>
            </g>

            {/* === SMUG WHITE KNIGHT LANDING ON f7 (Spring animated!) === */}
            <motion.g
              key={hopCount}
              initial={{ x: 146, y: 74, rotate: -14, scale: 0.9 }}
              animate={{ x: 76, y: 70, rotate: [0, -6, 3, 0], scale: 1 }}
              transition={{
                type: 'spring',
                stiffness: 220,
                damping: 15,
                mass: 0.9,
              }}
            >
              {/* Crisp White Knight body (solid chalk fill + bold dark outline so white vs black is unmistakable) */}
              <path
                d="M16 58 C18 48 25 42 26 32 C19 30 16 23 22 17 C26 12 33 9 38 12 L43 7 L45 15 C53 18 57 26 52 34 C47 37 40 36 39 40 C41 46 49 48 54 58 Z"
                className="fill-[#FAFAFA] stroke-zinc-950"
                strokeWidth="2.1"
                strokeLinejoin="round"
              />
              {/* Decorative mane ink ticks */}
              <path
                d="M23 24 L28 25 M22 29 L27 30 M24 35 L29 36"
                className="stroke-zinc-900"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              {/* Smug goofy eyes + tiny grin */}
              <circle cx="38" cy="21" r="4" className="fill-zinc-950" />
              <circle cx="39.4" cy="20" r="1.4" className="fill-white" />
              <path d="M33 16 L43 17.5" className="stroke-zinc-950" strokeWidth="1.6" strokeLinecap="round" />
              <path d="M44 27 Q48 30 43 32" fill="none" className="stroke-zinc-950" strokeWidth="1.5" strokeLinecap="round" />
            </motion.g>

            {/* === SUPPORTING WHITE QUEEN ON e5 (watching from below with monocle!) === */}
            <g transform="translate(0, 204)">
              <g className="animate-float-subtle">
                <path
                  d="M18 56 L21 47 L15 20 L27 31 L38 15 L49 31 L61 20 L55 47 L58 56 Z"
                  className="fill-[#FAFAFA] stroke-zinc-950"
                  strokeWidth="1.9"
                  strokeLinejoin="round"
                />
                <circle cx="15" cy="17" r="3" className="fill-[#FAFAFA] stroke-zinc-950" strokeWidth="1.6" />
                <circle cx="38" cy="12" r="3.2" className="fill-[#FAFAFA] stroke-zinc-950" strokeWidth="1.6" />
                <circle cx="61" cy="17" r="3" className="fill-[#FAFAFA] stroke-zinc-950" strokeWidth="1.6" />
                <circle cx="32" cy="39" r="2.6" className="fill-zinc-950" />
                <circle cx="44" cy="39" r="2.6" className="fill-zinc-950" />
                {/* Tiny architectural monocle */}
                <circle cx="44" cy="39" r="5" fill="none" className="stroke-zinc-950" strokeWidth="1.2" />
                <path d="M34 46 Q38 49 42 46" fill="none" className="stroke-zinc-950" strokeWidth="1.4" strokeLinecap="round" />
              </g>
            </g>
          </g>
        </svg>

        {/* Playful architectural caption bar */}
        <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4 text-xs">
          <span className="font-mono text-zinc-700 dark:text-zinc-300 truncate">
            {activeQuip}
          </span>
          <span className="font-mono text-zinc-500 dark:text-zinc-500 shrink-0 tabular-nums">
            38+ Patterns
          </span>
        </div>
      </button>
    </div>
  );
};
