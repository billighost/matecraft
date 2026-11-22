import React from 'react';
import { PieceColor, PieceSetId, PieceType } from '../types/chess';

interface ChessPieceSvgProps {
  type: PieceType;
  color: PieceColor;
  pieceSet?: PieceSetId;
  className?: string;
}

/**
 * Custom high-definition SVG chess piece renderer supporting 4 distinct visual styles.
 * Guarantees crisp visual contrast between White (ivory/chalk with dark ink stroke)
 * and Black (deep obsidian with crisp light rim highlights) across every board theme.
 */
export const ChessPieceSvg: React.FC<ChessPieceSvgProps> = ({
  type,
  color,
  pieceSet = 'staunton',
  className = 'w-full h-full',
}) => {
  const isWhite = color === 'w';

  // Palette tuned so White and Black pieces are unmistakably distinct on both dark & light squares
  const fillMain = isWhite ? '#FAFAFA' : '#141417';
  const fillSecondary = isWhite ? '#E4E4E7' : '#27272A';
  const strokeMain = isWhite ? '#111114' : '#F4F4F5';
  const detailStroke = isWhite ? '#18181B' : '#E4E4E7';
  const outerHalo = isWhite ? 'rgba(9,9,11,0.38)' : 'rgba(250,250,250,0.22)';

  const filterId = `piece-shadow-${color}-${pieceSet}`;

  if (pieceSet === 'neo-geo') {
    return (
      <svg viewBox="0 0 45 45" className={className} aria-hidden="true">
        <defs>
          <filter id={filterId} x="-15%" y="-15%" width="130%" height="130%">
            <feDropShadow dx="0" dy="1.4" stdDeviation="1" floodColor={outerHalo} />
          </filter>
        </defs>
        <g filter={`url(#${filterId})`} stroke={strokeMain} strokeWidth="1.75" strokeLinejoin="miter" strokeLinecap="square">
          {type === 'p' && (
            <>
              <rect x="13" y="34" width="19" height="5" fill={fillMain} />
              <polygon points="16,34 22.5,19 29,34" fill={fillSecondary} />
              <rect x="18" y="10" width="9" height="9" fill={fillMain} />
            </>
          )}
          {type === 'r' && (
            <>
              <rect x="10" y="34" width="25" height="5" fill={fillMain} />
              <rect x="14" y="16" width="17" height="18" fill={fillSecondary} />
              <path d="M11 16 V9 H16 V13 H20 V9 H25 V13 H29 V9 H34 V16 Z" fill={fillMain} />
            </>
          )}
          {type === 'n' && (
            <>
              <rect x="10" y="34" width="25" height="5" fill={fillMain} />
              <polygon points="14,34 15,15 24,8 34,15 31,22 23,20 29,34" fill={fillMain} />
              <line x1="19" y1="14" x2="23" y2="14" stroke={detailStroke} strokeWidth="2" />
            </>
          )}
          {type === 'b' && (
            <>
              <rect x="11" y="34" width="23" height="5" fill={fillMain} />
              <polygon points="15,34 22.5,11 30,34" fill={fillMain} />
              <rect x="20.5" y="6" width="4" height="4" fill={fillSecondary} />
              <line x1="22.5" y1="18" x2="22.5" y2="27" stroke={detailStroke} strokeWidth="1.6" />
              <line x1="19" y1="22.5" x2="26" y2="22.5" stroke={detailStroke} strokeWidth="1.6" />
            </>
          )}
          {type === 'q' && (
            <>
              <rect x="9" y="34" width="27" height="5" fill={fillMain} />
              <polygon points="12,34 8,14 17,22 22.5,10 28,22 37,14 33,34" fill={fillMain} />
              <line x1="13" y1="30" x2="32" y2="30" stroke={detailStroke} strokeWidth="1.5" />
            </>
          )}
          {type === 'k' && (
            <>
              <rect x="9" y="34" width="27" height="5" fill={fillMain} />
              <polygon points="12,34 11,16 34,16 33,34" fill={fillMain} />
              <rect x="20.5" y="6" width="4" height="10" fill={fillMain} />
              <rect x="17" y="9" width="11" height="3.5" fill={fillMain} />
              <line x1="14" y1="26" x2="31" y2="26" stroke={detailStroke} strokeWidth="1.5" />
            </>
          )}
        </g>
      </svg>
    );
  }

  if (pieceSet === 'ink-sketch') {
    const eyeFill = isWhite ? '#111114' : '#FAFAFA';
    const pupilFill = isWhite ? '#FAFAFA' : '#111114';
    return (
      <svg viewBox="0 0 45 45" className={className} aria-hidden="true">
        <defs>
          <filter id={filterId} x="-15%" y="-15%" width="130%" height="130%">
            <feDropShadow dx="0.8" dy="1.4" stdDeviation="0.9" floodColor={outerHalo} />
          </filter>
        </defs>
        <g filter={`url(#${filterId})`} stroke={strokeMain} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          {type === 'p' && (
            <>
              <path d="M12 38 C13 33 17 31 18 25 C14 23 14 15 22.5 14 C31 15 31 23 27 25 C28 31 32 33 33 38 Z" fill={fillMain} />
              <circle cx="20" cy="20" r="2.1" fill={eyeFill} stroke="none" />
              <circle cx="25.5" cy="20" r="2.1" fill={eyeFill} stroke="none" />
              <circle cx="20.5" cy="19.5" r="0.7" fill={pupilFill} stroke="none" />
              <circle cx="26" cy="19.5" r="0.7" fill={pupilFill} stroke="none" />
              <path d="M20.5 23.5 Q22.8 25.3 25 23.5" fill="none" stroke={detailStroke} strokeWidth="1.3" />
            </>
          )}
          {type === 'r' && (
            <>
              <path d="M11 38 L12 33 L15 31 L14 16 L11 14 L11 9 L16 9 L16 12 L20 12 L20 9 L25 9 L25 12 L29 12 L29 9 L34 9 L34 14 L31 16 L30 31 L33 33 L34 38 Z" fill={fillMain} />
              <rect x="17.5" y="19.5" width="3.5" height="3.5" rx="0.8" fill={eyeFill} stroke="none" />
              <rect x="24" y="19.5" width="3.5" height="3.5" rx="0.8" fill={eyeFill} stroke="none" />
              <line x1="17" y1="18" x2="21.5" y2="18.8" stroke={detailStroke} strokeWidth="1.4" />
              <line x1="28" y1="18" x2="23.5" y2="18.8" stroke={detailStroke} strokeWidth="1.4" />
              <line x1="18" y1="26.5" x2="27" y2="26.5" stroke={detailStroke} strokeWidth="1.5" />
            </>
          )}
          {type === 'n' && (
            <>
              <path d="M11 38 C12 32 16 28 17 22 C13 21 11 16 15 12 C18 9 22 7 25 9 L28 6 L29 11 C34 13 36 18 33 23 C30 25 26 24 25 26 C26 30 31 32 34 38 Z" fill={fillMain} />
              <circle cx="24" cy="14.5" r="2.6" fill={eyeFill} stroke="none" />
              <circle cx="24.8" cy="14" r="0.9" fill={pupilFill} stroke="none" />
              <path d="M29 18.5 Q31.5 20.5 28 21.5" fill="none" stroke={detailStroke} strokeWidth="1.3" />
            </>
          )}
          {type === 'b' && (
            <>
              <path d="M12 38 C14 33 17 31 17 27 C13 23 14 14 22.5 10 C31 14 32 23 28 27 C28 31 31 33 33 38 Z" fill={fillMain} />
              <circle cx="22.5" cy="7.5" r="2.5" fill={fillMain} />
              <path d="M25 13 L21 17" stroke={detailStroke} strokeWidth="1.5" />
              <circle cx="19.5" cy="21" r="1.9" fill={eyeFill} stroke="none" />
              <circle cx="25.5" cy="21" r="1.9" fill={eyeFill} stroke="none" />
              <path d="M20 25.5 Q22.5 24 25 25.5" fill="none" stroke={detailStroke} strokeWidth="1.3" />
            </>
          )}
          {type === 'q' && (
            <>
              <path d="M10 38 L12 32 L8 14 L16 21 L22.5 11 L29 21 L37 14 L33 32 L35 38 Z" fill={fillMain} />
              <circle cx="8" cy="12" r="2.1" fill={fillMain} />
              <circle cx="22.5" cy="9" r="2.3" fill={fillMain} />
              <circle cx="37" cy="12" r="2.1" fill={fillMain} />
              <circle cx="19" cy="26" r="2.1" fill={eyeFill} stroke="none" />
              <circle cx="26" cy="26" r="2.1" fill={eyeFill} stroke="none" />
              <path d="M19.5 30 Q22.5 32.5 25.5 30" fill="none" stroke={detailStroke} strokeWidth="1.4" />
            </>
          )}
          {type === 'k' && (
            <>
              <path d="M22.5 6 V13 M19 9.5 H26" stroke={strokeMain} strokeWidth="2.2" />
              <path d="M11 38 L12 32 C9 25 10 16 17 15 C20 15 21.5 17 22.5 18 C23.5 17 25 15 28 15 C35 16 36 25 33 32 L34 38 Z" fill={fillMain} />
              <circle cx="19" cy="23.5" r="2.2" fill={eyeFill} stroke="none" />
              <circle cx="26" cy="23.5" r="2.2" fill={eyeFill} stroke="none" />
              <circle cx="19.6" cy="23" r="0.8" fill={pupilFill} stroke="none" />
              <circle cx="26.6" cy="23" r="0.8" fill={pupilFill} stroke="none" />
              <path d="M19 28.5 Q22.5 27 26 28.5" fill="none" stroke={detailStroke} strokeWidth="1.4" />
            </>
          )}
        </g>
      </svg>
    );
  }

  // Editorial Staunton & Woodcut Engraving (woodcut adds crisp cross-hatch shading!)
  const isWoodcut = pieceSet === 'woodcut';
  const hatchPatternId = `woodcut-hatch-${color}`;

  return (
    <svg viewBox="0 0 45 45" className={className} aria-hidden="true">
      <defs>
        <filter id={filterId} x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.1" floodColor={outerHalo} />
        </filter>
        {isWoodcut && (
          <pattern id={hatchPatternId} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
            <rect width="4" height="4" fill={fillMain} />
            <line x1="0" y1="0" x2="0" y2="4" stroke={isWhite ? '#A1A1AA' : '#3F3F46'} strokeWidth="1.2" />
          </pattern>
        )}
      </defs>
      <g
        filter={`url(#${filterId})`}
        fill={isWoodcut ? `url(#${hatchPatternId})` : fillMain}
        stroke={strokeMain}
        strokeWidth={isWoodcut ? '1.85' : '1.65'}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {type === 'p' && (
          <>
            <path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" />
            <path d="M13 36.5h19" fill="none" stroke={detailStroke} strokeWidth="1.2" />
          </>
        )}
        {type === 'r' && (
          <>
            <path d="M9 39h27v-3H9v3zM12 36v-4h21v4H12zM11 14V9h4v2h5V9h5v2h5V9h4v5" />
            <path d="M34 14l-3 3H14l-3-3" />
            <path d="M31 17v12.5H14V17" />
            <path d="M31 29.5l1.5 2.5h-20l1.5-2.5" />
            <path d="M11 14h23" fill="none" stroke={detailStroke} strokeWidth="1.25" />
            <path d="M14 29.5h17" fill="none" stroke={detailStroke} strokeWidth="1.2" />
          </>
        )}
        {type === 'n' && (
          <>
            <path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" />
            <path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3" />
            <circle cx="15" cy="15.5" r="1.2" fill={detailStroke} stroke="none" />
            <path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0z" fill={detailStroke} stroke="none" />
            <path d="M24.55 10.4l-.45 1.45.5.15c3.15 1 5.65 2.49 7.9 6.75S35.75 29.06 35.25 39" fill="none" stroke={detailStroke} strokeWidth="1.1" />
          </>
        )}
        {type === 'b' && (
          <>
            <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z" />
            <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z" />
            <circle cx="22.5" cy="8" r="2.5" />
            <path d="M17.5 26h10M15 30h15M22.5 15.5v5M20 18h5" fill="none" stroke={detailStroke} strokeWidth="1.4" />
          </>
        )}
        {type === 'q' && (
          <>
            <circle cx="6" cy="12" r="2.2" />
            <circle cx="14" cy="9" r="2.2" />
            <circle cx="22.5" cy="8" r="2.2" />
            <circle cx="31" cy="9" r="2.2" />
            <circle cx="39" cy="12" r="2.2" />
            <path d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.3-14.1-5.2 13.6-3-14.5-3 14.5-5.2-13.6L14 25 6.5 13.5 9 26z" />
            <path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" />
            <path d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0" fill="none" stroke={detailStroke} strokeWidth="1.25" />
          </>
        )}
        {type === 'k' && (
          <>
            <path d="M22.5 11.63V6M20 8h5" fill="none" stroke={strokeMain} strokeWidth="2" />
            <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" />
            <path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10V37z" />
            <path d="M11.5 30c5.5-3 15.5-3 21 0M11.5 33.5c5.5-3 15.5-3 21 0M11.5 37c5.5-3 15.5-3 21 0" fill="none" stroke={detailStroke} strokeWidth="1.25" />
          </>
        )}
      </g>
    </svg>
  );
};
