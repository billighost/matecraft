import React from 'react';
import { motion } from 'motion/react';
import { soundEngine } from '../utils/soundEngine';

interface ThemeToggleProps {
  isDark: boolean;
  onToggle: () => void;
}

/**
 * Unique animated Chess King Eclipse Light/Dark theme switch.
 * Flips between a Chalk White King (Light Mode) and an Obsidian Black King (Dark Mode)
 * with spring rotation and crisp architectural stroke geometry.
 */
export const ThemeToggle: React.FC<ThemeToggleProps> = ({ isDark, onToggle }) => {
  const handleClick = () => {
    soundEngine.play('theme');
    onToggle();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to Chalk Light Mode' : 'Switch to Obsidian Dark Mode'}
      className="group relative inline-flex items-center justify-center gap-2 h-9 w-9 sm:w-auto sm:h-10 sm:px-3 border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 hover:border-zinc-900 dark:hover:border-zinc-400 transition-colors spring-btn cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-100"
    >
      {/* Dual-tone miniature chessboard slider track */}
      <span className="relative flex items-center justify-center w-6 h-6 overflow-hidden">
        <motion.svg
          viewBox="0 0 28 28"
          className="w-6 h-6"
          initial={false}
          animate={{ rotate: isDark ? 0 : 180 }}
          transition={{ type: 'spring', stiffness: 280, damping: 20 }}
          aria-hidden="true"
        >
          {/* Outer architectural reticle ring */}
          <circle
            cx="14"
            cy="14"
            r="12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeDasharray={isDark ? '4 2.5' : '75 0'}
          />
          {/* Half-eclipse split */}
          <path
            d="M14 2 A12 12 0 0 1 14 26 Z"
            fill="currentColor"
            opacity={isDark ? 0.16 : 0.12}
          />
          {/* Hand-drawn miniature Chess King crown inside */}
          <g transform={isDark ? 'rotate(0 14 14)' : 'rotate(180 14 14)'}>
            <path
              d="M14 6 V10 M12 8 H16"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path
              d="M9.5 20.5 L8.5 13 L11.5 15 L14 11 L16.5 15 L19.5 13 L18.5 20.5 Z"
              fill={isDark ? '#F4F4F5' : '#09090B'}
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinejoin="round"
            />
          </g>
        </motion.svg>
      </span>
      <span className="hidden sm:inline text-xs font-mono tracking-tight">
        {isDark ? 'Obsidian' : 'Chalk'}
      </span>
    </button>
  );
};
