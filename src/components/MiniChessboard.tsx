import React, { useMemo } from 'react';
import { Chess } from 'chess.js';
import { BoardThemeId, PieceColor, PieceSetId, PieceType } from '../types/chess';
import { BOARD_THEME_MAP } from './BoardThemes';
import { ChessPieceSvg } from './ChessPieceSvg';

interface MiniChessboardProps {
  fen: string;
  boardTheme?: BoardThemeId;
  pieceSet?: PieceSetId;
  highlightFrom?: string;
  highlightTo?: string;
  matedKingSquare?: string;
  orientation?: PieceColor;
  className?: string;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

export const MiniChessboard: React.FC<MiniChessboardProps> = ({
  fen,
  boardTheme = 'obsidian-chalk',
  pieceSet = 'staunton',
  highlightFrom,
  highlightTo,
  matedKingSquare,
  orientation = 'w',
  className = 'w-full aspect-square',
}) => {
  const theme = BOARD_THEME_MAP[boardTheme] ?? BOARD_THEME_MAP['obsidian-chalk'];

  const squares = useMemo(() => {
    const chess = new Chess();
    try {
      chess.load(fen);
    } catch {
      // Keep start position if FEN invalid
    }
    const board = chess.board();
    const list: {
      sq: string;
      isDark: boolean;
      piece: { type: PieceType; color: PieceColor } | null;
    }[] = [];

    for (let displayR = 0; displayR < 8; displayR++) {
      for (let displayF = 0; displayF < 8; displayF++) {
        const boardR = orientation === 'w' ? displayR : 7 - displayR;
        const boardF = orientation === 'w' ? displayF : 7 - displayF;
        const sq = `${FILES[boardF]}${8 - boardR}`;
        const cell = board[boardR][boardF];
        list.push({
          sq,
          isDark: (boardR + boardF) % 2 === 1,
          piece: cell ? { type: cell.type as PieceType, color: cell.color as PieceColor } : null,
        });
      }
    }
    return list;
  }, [fen, orientation]);

  return (
    <div
      className={`relative grid grid-cols-8 grid-rows-8 overflow-hidden border select-none ${className}`}
      style={{ borderColor: theme.border }}
      aria-label="Chessboard position preview"
    >
      {squares.map(({ sq, isDark, piece }) => {
        const isLastMove = sq === highlightFrom || sq === highlightTo;
        const isMatedKing = sq === matedKingSquare;
        const bg = isLastMove
          ? isDark
            ? theme.lastMoveDark
            : theme.lastMoveLight
          : isDark
          ? theme.darkSquare
          : theme.lightSquare;

        return (
          <div
            key={sq}
            className="relative w-full h-full flex items-center justify-center"
            style={{ backgroundColor: bg }}
          >
            {isMatedKing && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundColor: theme.checkmateHighlight,
                  boxShadow: 'inset 0 0 0 1.5px rgba(220,38,38,0.85)',
                }}
              />
            )}
            {piece && (
              <div className="relative z-10 w-[86%] h-[86%]">
                <ChessPieceSvg type={piece.type} color={piece.color} pieceSet={pieceSet} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
