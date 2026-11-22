import { BoardThemeId, PieceSetId } from '../types/chess';

export interface BoardThemeConfig {
  id: BoardThemeId;
  name: string;
  tagline: string;
  lightSquare: string;
  darkSquare: string;
  lightCoord: string;
  darkCoord: string;
  border: string;
  lastMoveLight: string;
  lastMoveDark: string;
  selectedSquare: string;
  checkmateHighlight: string;
  texture: 'none' | 'hatch' | 'paper' | 'wood' | 'marble' | 'slate';
}

export const BOARD_THEMES: BoardThemeConfig[] = [
  {
    id: 'obsidian-chalk',
    name: 'Obsidian & Chalk',
    tagline: 'Signature monochrome high-contrast shades',
    lightSquare: '#EAEAE6',
    darkSquare: '#27272B',
    lightCoord: '#52525B',
    darkCoord: '#A1A1AA',
    border: '#3F3F46',
    lastMoveLight: '#D4D4C8',
    lastMoveDark: '#3F3F4A',
    selectedSquare: 'rgba(250, 204, 21, 0.34)',
    checkmateHighlight: 'rgba(220, 38, 38, 0.42)',
    texture: 'none',
  },
  {
    id: 'blueprint-ink',
    name: 'Blueprint Ink',
    tagline: 'Architectural cross-hatch technical shading',
    lightSquare: '#F5F5F4',
    darkSquare: '#D6D6D2',
    lightCoord: '#3F3F46',
    darkCoord: '#27272A',
    border: '#18181B',
    lastMoveLight: '#E2E2DA',
    lastMoveDark: '#BDBDB6',
    selectedSquare: 'rgba(24, 24, 27, 0.2)',
    checkmateHighlight: 'rgba(185, 28, 28, 0.35)',
    texture: 'hatch',
  },
  {
    id: 'broadsheet',
    name: 'Newspaper Broadsheet',
    tagline: 'Warm archival bone & halftone print grain',
    lightSquare: '#F3EFE6',
    darkSquare: '#7C7870',
    lightCoord: '#57534E',
    darkCoord: '#F5F5F4',
    border: '#44403C',
    lastMoveLight: '#E5DEC9',
    lastMoveDark: '#948F84',
    selectedSquare: 'rgba(217, 119, 6, 0.32)',
    checkmateHighlight: 'rgba(220, 38, 38, 0.42)',
    texture: 'paper',
  },
  {
    id: 'walnut',
    name: 'Brushed Walnut',
    tagline: 'Artisan maple & smoked dark walnut grain',
    lightSquare: '#E7D7BE',
    darkSquare: '#6E4B32',
    lightCoord: '#6E4B32',
    darkCoord: '#E7D7BE',
    border: '#4A3120',
    lastMoveLight: '#DEC58B',
    lastMoveDark: '#8E663C',
    selectedSquare: 'rgba(250, 204, 21, 0.35)',
    checkmateHighlight: 'rgba(220, 38, 38, 0.45)',
    texture: 'wood',
  },
  {
    id: 'carrara',
    name: 'Carrara Marble',
    tagline: 'Sculpted alabaster & veined basalt stone',
    lightSquare: '#F1F2F4',
    darkSquare: '#5C6470',
    lightCoord: '#475569',
    darkCoord: '#E2E8F0',
    border: '#334155',
    lastMoveLight: '#D9E2EC',
    lastMoveDark: '#737F8F',
    selectedSquare: 'rgba(56, 189, 248, 0.32)',
    checkmateHighlight: 'rgba(220, 38, 38, 0.42)',
    texture: 'marble',
  },
  {
    id: 'tournament-slate',
    name: 'Tournament Slate',
    tagline: 'Distraction-free matte steel & frost',
    lightSquare: '#DDE2E6',
    darkSquare: '#3B4652',
    lightCoord: '#3B4652',
    darkCoord: '#CBD5E1',
    border: '#1E293B',
    lastMoveLight: '#C5D3DF',
    lastMoveDark: '#4F5E6E',
    selectedSquare: 'rgba(250, 204, 21, 0.34)',
    checkmateHighlight: 'rgba(220, 38, 38, 0.44)',
    texture: 'slate',
  },
];

export const BOARD_THEME_MAP: Record<BoardThemeId, BoardThemeConfig> = Object.fromEntries(
  BOARD_THEMES.map((t) => [t.id, t])
) as Record<BoardThemeId, BoardThemeConfig>;

export interface PieceSetConfig {
  id: PieceSetId;
  name: string;
  tagline: string;
}

export const PIECE_SETS: PieceSetConfig[] = [
  { id: 'staunton', name: 'Editorial Staunton', tagline: 'Crisp classic silhouettes with sharp contrast' },
  { id: 'ink-sketch', name: 'Ink Sketch (Goofy)', tagline: 'Hand-drawn quirky pieces with expressive eyes' },
  { id: 'neo-geo', name: 'Neo-Geometric', tagline: 'Architectural monolith chess forms' },
  { id: 'woodcut', name: 'Woodcut Engraving', tagline: 'High-contrast fine hatched print style' },
];
