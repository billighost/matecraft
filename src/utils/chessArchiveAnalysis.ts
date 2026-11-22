import { parseRawGameToAnalyzed } from '../data/sampleGames';
import type { AnalyzedGame } from '../types/chess';

export interface RawChessComGame {
  url?: string;
  pgn?: string;
  end_time?: number;
  time_class?: string;
  time_control?: string;
  rules?: string;
  white?: { username?: string; rating?: number; result?: string };
  black?: { username?: string; rating?: number; result?: string };
}

export interface ArchiveGameJob {
  index: number;
  raw: RawChessComGame;
}

export function analyzeArchiveGame({ raw, index }: ArchiveGameJob, username: string): AnalyzedGame {
  return parseRawGameToAnalyzed({
    id: raw.url?.split('/').pop() || `game-${index}-${raw.end_time || 0}`,
    url: raw.url,
    pgn: raw.pgn!,
    white: { username: raw.white?.username || 'White', rating: raw.white?.rating || 1200, result: raw.white?.result },
    black: { username: raw.black?.username || 'Black', rating: raw.black?.rating || 1200, result: raw.black?.result },
    endTime: raw.end_time || 0,
    timeClass: raw.time_class || 'rapid',
    timeControl: raw.time_control || '600',
  }, username, false);
}
