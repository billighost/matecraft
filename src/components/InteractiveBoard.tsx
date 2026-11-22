import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Chess, Square } from 'chess.js';
import { motion } from 'motion/react';
import { BoardThemeId, PieceColor, PieceSetId, PieceType } from '../types/chess';
import { BOARD_THEME_MAP } from './BoardThemes';
import { ChessPieceSvg } from './ChessPieceSvg';
import { soundEngine } from '../utils/soundEngine';

interface InteractiveBoardProps {
  fen: string;
  orientation: PieceColor;
  boardTheme: BoardThemeId;
  pieceSet: PieceSetId;
  lastMove?: { from: string; to: string } | null;
  bestMoveArrow?: { from: string; to: string } | null;
  showBestMoveArrow?: boolean;
  hangingSquares?: string[];
  showThreats?: boolean;
  interactive?: boolean;
  onMoveAttempt?: (from: string, to: string, promotion?: PieceType) => boolean;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

function squareToGrid(sq: string, orientation: PieceColor): { col: number; row: number } {
  const fileIdx = sq.charCodeAt(0) - 97; // 0..7
  const rankIdx = Number(sq[1]) - 1; // 0..7
  if (orientation === 'w') {
    return { col: fileIdx, row: 7 - rankIdx };
  }
  return { col: 7 - fileIdx, row: rankIdx };
}

function gridToSquare(col: number, row: number, orientation: PieceColor): Square | null {
  if (col < 0 || col > 7 || row < 0 || row > 7) return null;
  const fileIdx = orientation === 'w' ? col : 7 - col;
  const rankIdx = orientation === 'w' ? 7 - row : row;
  return `${FILES[fileIdx]}${rankIdx + 1}` as Square;
}

export const InteractiveBoard: React.FC<InteractiveBoardProps> = ({
  fen,
  orientation,
  boardTheme,
  pieceSet,
  lastMove,
  bestMoveArrow,
  showBestMoveArrow = true,
  hangingSquares = [],
  showThreats = false,
  interactive = true,
  onMoveAttempt,
}) => {
  const theme = BOARD_THEME_MAP[boardTheme] ?? BOARD_THEME_MAP['obsidian-chalk'];
  const boardRef = useRef<HTMLDivElement | null>(null);

  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [dragging, setDragging] = useState<{
    from: Square;
    type: PieceType;
    color: PieceColor;
    x: number;
    y: number;
    hoverSquare: Square | null;
  } | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{
    from: Square;
    to: Square;
    color: PieceColor;
  } | null>(null);

  // Clear selection whenever external FEN updates
  useEffect(() => {
    setSelectedSquare(null);
    setDragging(null);
    setPendingPromotion(null);
  }, [fen]);

  const chess = useMemo(() => {
    const c = new Chess();
    try {
      c.load(fen);
    } catch {
      // Fallback
    }
    return c;
  }, [fen]);

  const inCheckColor: PieceColor | null = chess.inCheck() ? (chess.turn() as PieceColor) : null;
  const isCheckmate = chess.isCheckmate();

  // Compute legal targets for the currently selected or dragged piece
  const activeSource = dragging?.from ?? selectedSquare;
  const legalTargets = useMemo(() => {
    const map = new Map<Square, { isCapture: boolean; isPromotion: boolean }>();
    if (!interactive || !activeSource) return map;
    const moves = chess.moves({ square: activeSource, verbose: true });
    for (const m of moves) {
      map.set(m.to as Square, {
        isCapture: Boolean(m.captured),
        isPromotion: Boolean(m.promotion),
      });
    }
    return map;
  }, [chess, activeSource, interactive]);

  // Build stable piece list for animated rendering
  const pieces = useMemo(() => {
    const board = chess.board();
    const list: {
      key: string;
      sq: Square;
      type: PieceType;
      color: PieceColor;
      col: number;
      row: number;
    }[] = [];
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const cell = board[r][f];
        if (!cell) continue;
        const { col, row } = squareToGrid(cell.square, orientation);
        list.push({
          key: `${cell.color}-${cell.type}-${cell.square}`,
          sq: cell.square,
          type: cell.type as PieceType,
          color: cell.color as PieceColor,
          col,
          row,
        });
      }
    }
    return list;
  }, [chess, orientation]);

  const executeOrPromptPromotion = (from: Square, to: Square) => {
    if (!onMoveAttempt) return;
    const targetInfo = legalTargets.get(to);
    if (!targetInfo) return;

    if (targetInfo.isPromotion) {
      const piece = chess.get(from);
      setPendingPromotion({
        from,
        to,
        color: (piece?.color ?? 'w') as PieceColor,
      });
      return;
    }

    onMoveAttempt(from, to);
    setSelectedSquare(null);
  };

  const handleSquareClick = (sq: Square) => {
    if (!interactive || pendingPromotion) return;

    if (selectedSquare && legalTargets.has(sq)) {
      executeOrPromptPromotion(selectedSquare, sq);
      return;
    }

    const clickedPiece = chess.get(sq);
    if (clickedPiece && clickedPiece.color === chess.turn()) {
      if (selectedSquare === sq) {
        setSelectedSquare(null);
      } else {
        soundEngine.play('pickup');
        setSelectedSquare(sq);
      }
    } else {
      setSelectedSquare(null);
    }
  };

  const getSquareFromPointer = (clientX: number, clientY: number): Square | null => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const relX = clientX - rect.left;
    const relY = clientY - rect.top;
    if (relX < 0 || relY < 0 || relX >= rect.width || relY >= rect.height) return null;
    const col = Math.floor((relX / rect.width) * 8);
    const row = Math.floor((relY / rect.height) * 8);
    return gridToSquare(col, row, orientation);
  };

  const handlePiecePointerDown = (
    e: React.PointerEvent,
    sq: Square,
    type: PieceType,
    color: PieceColor
  ) => {
    if (!interactive || pendingPromotion) return;
    if (color !== chess.turn()) return; // Allow click handler on square to capture if selected

    e.preventDefault();
    e.stopPropagation();

    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return;

    soundEngine.play('pickup');
    setSelectedSquare(sq);
    setDragging({
      from: sq,
      type,
      color,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      hoverSquare: sq,
    });

    const handleMove = (moveEvent: PointerEvent) => {
      const bRect = boardRef.current?.getBoundingClientRect();
      if (!bRect) return;
      const hoverSq = getSquareFromPointer(moveEvent.clientX, moveEvent.clientY);
      setDragging((prev) =>
        prev
          ? {
              ...prev,
              x: moveEvent.clientX - bRect.left,
              y: moveEvent.clientY - bRect.top,
              hoverSquare: hoverSq,
            }
          : null
      );
    };

    const handleUp = (upEvent: PointerEvent) => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);

      const dropSq = getSquareFromPointer(upEvent.clientX, upEvent.clientY);
      setDragging(null);

      if (dropSq && dropSq !== sq) {
        // Verify legal move directly against fresh chess instance
        const moves = chess.moves({ square: sq, verbose: true });
        const matched = moves.find((m) => m.to === dropSq);
        if (matched) {
          if (matched.promotion) {
            setPendingPromotion({ from: sq, to: dropSq, color });
          } else if (onMoveAttempt) {
            onMoveAttempt(sq, dropSq);
            setSelectedSquare(null);
          }
        }
      }
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  // Compute SVG arrow geometry for engine best move
  const arrowCoords = useMemo(() => {
    if (!showBestMoveArrow || !bestMoveArrow) return null;
    const fromG = squareToGrid(bestMoveArrow.from, orientation);
    const toG = squareToGrid(bestMoveArrow.to, orientation);
    return {
      x1: (fromG.col + 0.5) * 100,
      y1: (fromG.row + 0.5) * 100,
      x2: (toG.col + 0.5) * 100,
      y2: (toG.row + 0.5) * 100,
    };
  }, [bestMoveArrow, showBestMoveArrow, orientation]);

  // Procedural SVG overlay texture for HD tactile feel
  const renderTextureOverlay = () => {
    if (theme.texture === 'none') return null;
    if (theme.texture === 'hatch') {
      return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30" aria-hidden="true">
          <defs>
            <pattern id="board-hatch-pattern" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="6" stroke="#18181B" strokeWidth="0.9" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#board-hatch-pattern)" />
        </svg>
      );
    }
    if (theme.texture === 'wood') {
      return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20 mix-blend-multiply" aria-hidden="true">
          <filter id="wood-grain-filter">
            <feTurbulence type="fractalNoise" baseFrequency="0.015 0.14" numOctaves="3" seed="8" />
            <feColorMatrix type="saturate" values="0.2" />
          </filter>
          <rect width="100%" height="100%" filter="url(#wood-grain-filter)" />
        </svg>
      );
    }
    if (theme.texture === 'marble') {
      return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-25 mix-blend-overlay" aria-hidden="true">
          <filter id="marble-vein-filter">
            <feTurbulence type="turbulence" baseFrequency="0.018" numOctaves="4" seed="4" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#marble-vein-filter)" />
        </svg>
      );
    }
    if (theme.texture === 'paper' || theme.texture === 'slate') {
      return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-15" aria-hidden="true">
          <filter id="paper-grain-filter">
            <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#paper-grain-filter)" />
        </svg>
      );
    }
    return null;
  };

  return (
    <div
      ref={boardRef}
      data-testid="interactive-chessboard"
      className="relative w-full aspect-square select-none touch-none border-2 overflow-hidden shadow-sm"
      style={{ borderColor: theme.border }}
    >
      {/* 1. 64 Board Squares */}
      <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
        {Array.from({ length: 64 }).map((_, idx) => {
          const row = Math.floor(idx / 8);
          const col = idx % 8;
          const sq = gridToSquare(col, row, orientation)!;
          const fileIdx = sq.charCodeAt(0) - 97;
          const rankNum = Number(sq[1]);
          const isDark = (fileIdx + rankNum) % 2 === 1;
          const isLastMove = lastMove?.from === sq || lastMove?.to === sq;
          const isSelected = selectedSquare === sq;
          const isDropHover = dragging?.hoverSquare === sq && legalTargets.has(sq);
          const targetMeta = legalTargets.get(sq);

          const pieceOnSq = chess.get(sq);
          const isCheckedKing =
            pieceOnSq?.type === 'k' && pieceOnSq.color === inCheckColor;

          const bg = isLastMove
            ? isDark
              ? theme.lastMoveDark
              : theme.lastMoveLight
            : isDark
            ? theme.darkSquare
            : theme.lightSquare;

          const coordColor = isDark ? theme.darkCoord : theme.lightCoord;

          return (
            <button
              key={sq}
              type="button"
              onClick={() => handleSquareClick(sq)}
              aria-label={`Square ${sq}${pieceOnSq ? `, ${pieceOnSq.color === 'w' ? 'White' : 'Black'} ${pieceOnSq.type}` : ''}`}
              className="relative w-full h-full p-0 border-0 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-zinc-900 dark:focus-visible:outline-white"
              style={{ backgroundColor: bg }}
            >
              {/* Selection tint */}
              {isSelected && (
                <span
                  className="absolute inset-0 pointer-events-none"
                  style={{ backgroundColor: theme.selectedSquare }}
                />
              )}

              {/* Check / Checkmate alert halo */}
              {isCheckedKing && (
                <span
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundColor: theme.checkmateHighlight,
                    boxShadow: isCheckmate
                      ? 'inset 0 0 0 3px rgba(220,38,38,0.95)'
                      : 'inset 0 0 0 2px rgba(220,38,38,0.75)',
                  }}
                />
              )}

              {/* Undefended / Hanging Piece Threat Indicator */}
              {showThreats && !isCheckedKing && hangingSquares.includes(sq) && (
                <span
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundColor: 'rgba(217, 119, 6, 0.24)',
                    boxShadow: 'inset 0 0 0 2px rgba(217, 119, 6, 0.9)',
                  }}
                />
              )}

              {/* Drop hover outline */}
              {isDropHover && (
                <span
                  className="absolute inset-0 pointer-events-none ring-2 ring-inset ring-zinc-950 dark:ring-white"
                />
              )}

              {/* Rank coordinate on left edge */}
              {col === 0 && (
                <span
                  className="absolute top-0.5 left-1 text-[10px] font-mono font-semibold leading-none pointer-events-none"
                  style={{ color: coordColor }}
                >
                  {sq[1]}
                </span>
              )}

              {/* File coordinate on bottom edge */}
              {row === 7 && (
                <span
                  className="absolute bottom-0.5 right-1 text-[10px] font-mono font-semibold leading-none pointer-events-none"
                  style={{ color: coordColor }}
                >
                  {sq[0]}
                </span>
              )}

              {/* Legal move dot or capture ring */}
              {targetMeta && !targetMeta.isCapture && (
                <span className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                  <span className="w-[28%] h-[28%] rounded-full bg-zinc-950/35 dark:bg-white/40 border border-white/50 dark:border-zinc-950/40" />
                </span>
              )}
              {targetMeta && targetMeta.isCapture && (
                <span className="absolute inset-[6%] rounded-full border-[4px] border-zinc-950/45 dark:border-white/55 pointer-events-none z-20" />
              )}
            </button>
          );
        })}
      </div>

      {/* 2. Subtle Procedural HD Surface Texture */}
      {renderTextureOverlay()}

      {/* 3. Engine Best Move SVG Arrow Overlay */}
      {arrowCoords && (
        <svg
          viewBox="0 0 800 800"
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          aria-hidden="true"
        >
          <defs>
            <marker
              id="engine-arrow-tip"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="4.5"
              markerHeight="4.5"
              orient="auto"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#16A34A" fillOpacity="0.88" />
            </marker>
          </defs>
          <line
            x1={arrowCoords.x1}
            y1={arrowCoords.y1}
            x2={arrowCoords.x2}
            y2={arrowCoords.y2}
            stroke="#16A34A"
            strokeOpacity="0.78"
            strokeWidth="16"
            strokeLinecap="round"
            markerEnd="url(#engine-arrow-tip)"
          />
        </svg>
      )}

      {/* 4. Smooth Animated Chess Pieces Layer */}
      <div className="absolute inset-0 pointer-events-none z-20">
        {pieces.map((p) => {
          const isBeingDragged = dragging?.from === p.sq;
          const canDrag = interactive && p.color === chess.turn();

          return (
            <motion.div
              key={p.key}
              initial={false}
              animate={{
                left: `${p.col * 12.5}%`,
                top: `${p.row * 12.5}%`,
                scale: isBeingDragged ? 0.8 : 1,
                opacity: isBeingDragged ? 0.25 : 1,
              }}
              transition={{
                type: 'spring',
                stiffness: 420,
                damping: 32,
                mass: 0.7,
              }}
              onPointerDown={(e) => handlePiecePointerDown(e, p.sq, p.type, p.color)}
              className={`absolute w-[12.5%] h-[12.5%] flex items-center justify-center ${
                canDrag ? 'pointer-events-auto cursor-grab active:cursor-grabbing' : 'pointer-events-none'
              }`}
            >
              <ChessPieceSvg
                type={p.type}
                color={p.color}
                pieceSet={pieceSet}
                className="w-[86%] h-[86%]"
              />
            </motion.div>
          );
        })}
      </div>

      {/* 5. Floating Dragged Piece following cursor at 60fps */}
      {dragging && (
        <div
          className="absolute z-40 pointer-events-none w-[14%] h-[14%]"
          style={{
            left: dragging.x,
            top: dragging.y,
            transform: 'translate(-50%, -50%) scale(1.12)',
            filter: 'drop-shadow(0 10px 16px rgba(0,0,0,0.35))',
          }}
        >
          <ChessPieceSvg type={dragging.type} color={dragging.color} pieceSet={pieceSet} />
        </div>
      )}

      {/* 6. Promotion Picker Overlay */}
      {pendingPromotion && (
        <div className="absolute inset-0 z-50 bg-zinc-950/60 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 p-4 max-w-xs w-full">
            <p className="text-xs font-mono text-zinc-600 dark:text-zinc-400 mb-3 text-center">
              Choose promotion piece
            </p>
            <div className="grid grid-cols-4 gap-2">
              {(['q', 'r', 'b', 'n'] as PieceType[]).map((promo) => (
                <button
                  key={promo}
                  type="button"
                  aria-label={`Promote to ${promo}`}
                  onClick={() => {
                    onMoveAttempt?.(pendingPromotion.from, pendingPromotion.to, promo);
                    setPendingPromotion(null);
                    setSelectedSquare(null);
                  }}
                  className="aspect-square p-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
                >
                  <ChessPieceSvg type={promo} color={pendingPromotion.color} pieceSet={pieceSet} />
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setPendingPromotion(null)}
              className="mt-3 w-full py-1.5 text-xs font-mono text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
