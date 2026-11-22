import { Chess, Move, PieceSymbol } from 'chess.js';
import { FullGameReview, MoveClassification, MoveReviewItem, PieceColor } from '../types/chess';
import { detectOpening } from './openings';

const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Piece-square tables from White's perspective (index 0 = a8, index 63 = h1)
const PST_PAWN = [
   0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
   5,  5, 10, 27, 27, 10,  5,  5,
   0,  0,  0, 24, 24,  0,  0,  0,
   5, -5,-10,  0,  0,-10, -5,  5,
   5, 10, 10,-22,-22, 10, 10,  5,
   0,  0,  0,  0,  0,  0,  0,  0,
];

const PST_KNIGHT = [
 -50,-40,-30,-30,-30,-30,-40,-50,
 -40,-20,  0,  0,  0,  0,-20,-40,
 -30,  0, 10, 15, 15, 10,  0,-30,
 -30,  5, 15, 20, 20, 15,  5,-30,
 -30,  0, 15, 20, 20, 15,  0,-30,
 -30,  5, 10, 15, 15, 10,  5,-30,
 -40,-20,  0,  5,  5,  0,-20,-40,
 -50,-40,-30,-30,-30,-30,-40,-50,
];

const PST_BISHOP = [
 -20,-10,-10,-10,-10,-10,-10,-20,
 -10,  0,  0,  0,  0,  0,  0,-10,
 -10,  0,  5, 10, 10,  5,  0,-10,
 -10,  5,  5, 10, 10,  5,  5,-10,
 -10,  0, 10, 10, 10, 10,  0,-10,
 -10, 10, 10, 10, 10, 10, 10,-10,
 -10,  5,  0,  0,  0,  0,  5,-10,
 -20,-10,-10,-10,-10,-10,-10,-20,
];

const PST_ROOK = [
   0,  0,  0,  0,  0,  0,  0,  0,
   5, 10, 10, 10, 10, 10, 10,  5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
   0,  0,  0,  5,  5,  0,  0,  0,
];

const PST_QUEEN = [
 -20,-10,-10, -5, -5,-10,-10,-20,
 -10,  0,  0,  0,  0,  0,  0,-10,
 -10,  0,  5,  5,  5,  5,  0,-10,
  -5,  0,  5,  5,  5,  5,  0, -5,
   0,  0,  5,  5,  5,  5,  0, -5,
 -10,  5,  5,  5,  5,  5,  0,-10,
 -10,  0,  5,  0,  0,  0,  0,-10,
 -20,-10,-10, -5, -5,-10,-10,-20,
];

const PST_KING_MID = [
 -30,-40,-40,-50,-50,-40,-40,-30,
 -30,-40,-40,-50,-50,-40,-40,-30,
 -30,-40,-40,-50,-50,-40,-40,-30,
 -30,-40,-40,-50,-50,-40,-40,-30,
 -20,-30,-30,-40,-40,-30,-30,-20,
 -10,-20,-20,-20,-20,-20,-20,-10,
  20, 20,  0,  0,  0,  0, 20, 20,
  20, 30, 10,  0,  0, 10, 30, 20,
];

const PST_MAP: Record<PieceSymbol, number[]> = {
  p: PST_PAWN,
  n: PST_KNIGHT,
  b: PST_BISHOP,
  r: PST_ROOK,
  q: PST_QUEEN,
  k: PST_KING_MID,
};

export const MATE_SCORE = 100000;

/**
 * Evaluates a position statically in centipawns from White's perspective.
 */
export function evaluateStaticCp(chess: Chess): number {
  if (chess.isCheckmate()) {
    return chess.turn() === 'w' ? -MATE_SCORE : MATE_SCORE;
  }
  if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition()) {
    return 0;
  }

  let score = 0;
  const board = chess.board();
  let whiteBishops = 0;
  let blackBishops = 0;

  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = board[r][f];
      if (!piece) continue;
      const base = PIECE_VALUES[piece.type];
      const idx = piece.color === 'w' ? r * 8 + f : (7 - r) * 8 + f;
      const pst = PST_MAP[piece.type][idx];

      if (piece.color === 'w') {
        score += base + pst;
        if (piece.type === 'b') whiteBishops++;
      } else {
        score -= base + pst;
        if (piece.type === 'b') blackBishops++;
      }
    }
  }

  // Bishop pair bonus
  if (whiteBishops >= 2) score += 28;
  if (blackBishops >= 2) score -= 28;

  // Small tempo bonus
  score += chess.turn() === 'w' ? 10 : -10;

  return score;
}

function scoreMoveOrder(m: Move): number {
  let s = 0;
  if (m.captured) {
    s += 10 * PIECE_VALUES[m.captured] - PIECE_VALUES[m.piece];
  }
  if (m.promotion) s += PIECE_VALUES[m.promotion];
  if (m.san.includes('#')) s += 50000;
  else if (m.san.includes('+')) s += 80;
  return s;
}

function alphaBeta(chess: Chess, depth: number, alpha: number, beta: number, maximizing: boolean): number {
  if (chess.isCheckmate()) {
    // Prefer faster mates
    return chess.turn() === 'w' ? -(MATE_SCORE + depth * 10) : MATE_SCORE + depth * 10;
  }
  if (chess.isDraw() || chess.isStalemate()) return 0;
  if (depth === 0) return evaluateStaticCp(chess);

  const moves = chess.moves({ verbose: true });
  moves.sort((a, b) => scoreMoveOrder(b) - scoreMoveOrder(a));

  if (maximizing) {
    let best = -Infinity;
    for (const move of moves) {
      chess.move(move);
      const val = alphaBeta(chess, depth - 1, alpha, beta, false);
      chess.undo();
      if (val > best) best = val;
      if (val > alpha) alpha = val;
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const move of moves) {
      chess.move(move);
      const val = alphaBeta(chess, depth - 1, alpha, beta, true);
      chess.undo();
      if (val < best) best = val;
      if (val < beta) beta = val;
      if (beta <= alpha) break;
    }
    return best;
  }
}

export interface PositionEvaluation {
  evalCp: number;
  evalLabel: string;
  winProbWhite: number;
  bestMove: { san: string; from: string; to: string } | null;
}

/**
 * Standard Lichess/Chess.com logistic win-probability curve (0..100 for White).
 */
export function cpToWinProbability(cp: number): number {
  if (cp >= MATE_SCORE - 500) return 100;
  if (cp <= -(MATE_SCORE - 500)) return 0;
  const clamped = Math.max(-2000, Math.min(2000, cp));
  const raw = 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * clamped)) - 1);
  return Math.round(raw * 10) / 10;
}

export function formatEvalLabel(cp: number, isCheckmate?: boolean): string {
  if (isCheckmate) return '#';
  if (Math.abs(cp) >= MATE_SCORE - 500) {
    return cp > 0 ? '+M' : '-M';
  }
  const pawns = cp / 100;
  const sign = pawns > 0 ? '+' : '';
  return `${sign}${pawns.toFixed(1)}`;
}

/**
 * Runs a fast tactical search on a FEN to find evaluation + top candidate move.
 */
export function evaluatePosition(fen: string, depth = 2): PositionEvaluation {
  const chess = new Chess();
  try {
    chess.load(fen);
  } catch {
    return { evalCp: 0, evalLabel: '0.0', winProbWhite: 50, bestMove: null };
  }

  if (chess.isCheckmate()) {
    const cp = chess.turn() === 'w' ? -MATE_SCORE : MATE_SCORE;
    return {
      evalCp: cp,
      evalLabel: '#',
      winProbWhite: cp > 0 ? 100 : 0,
      bestMove: null,
    };
  }
  if (chess.isDraw() || chess.isStalemate()) {
    return { evalCp: 0, evalLabel: '0.0', winProbWhite: 50, bestMove: null };
  }

  const maximizing = chess.turn() === 'w';
  const moves = chess.moves({ verbose: true });
  moves.sort((a, b) => scoreMoveOrder(b) - scoreMoveOrder(a));

  let bestMove: Move | null = moves[0] ?? null;
  let bestVal = maximizing ? -Infinity : Infinity;
  let alpha = -Infinity;
  let beta = Infinity;

  for (const move of moves) {
    chess.move(move);
    const val = alphaBeta(chess, Math.max(0, depth - 1), alpha, beta, !maximizing);
    chess.undo();

    if (maximizing) {
      if (val > bestVal) {
        bestVal = val;
        bestMove = move;
      }
      if (val > alpha) alpha = val;
    } else {
      if (val < bestVal) {
        bestVal = val;
        bestMove = move;
      }
      if (val < beta) beta = val;
    }
  }

  const finalCp = Number.isFinite(bestVal) ? bestVal : 0;
  return {
    evalCp: finalCp,
    evalLabel: formatEvalLabel(finalCp),
    winProbWhite: cpToWinProbability(finalCp),
    bestMove: bestMove ? { san: bestMove.san, from: bestMove.from, to: bestMove.to } : null,
  };
}

function classifyMoveQuality(
  winProbDrop: number,
  isBook: boolean,
  playedBest: boolean,
  isSacrificeBrilliant: boolean,
  isCheckmate: boolean
): MoveClassification {
  if (isCheckmate) return 'Best';
  if (isBook) return 'Book';
  if (isSacrificeBrilliant && winProbDrop <= 1.5) return 'Brilliant';
  if (playedBest && winProbDrop <= 1.2) return 'Best';
  if (winProbDrop <= 1.8) return 'Great';
  if (winProbDrop <= 5.0) return 'Good';
  if (winProbDrop <= 11.0) return 'Inaccuracy';
  if (winProbDrop <= 20.0) return 'Mistake';
  return 'Blunder';
}

function buildDeterministicCoachNote(
  san: string,
  color: PieceColor,
  classification: MoveClassification,
  bestMoveSan: string | null,
  winProbDrop: number,
  isCheckmate: boolean,
  isCheck: boolean,
  isCapture: boolean,
  openingName: string
): string {
  const side = color === 'w' ? 'White' : 'Black';
  if (isCheckmate) {
    return `${san} seals the deal — checkmate! Clean finishing blow by ${side}.`;
  }
  if (classification === 'Book') {
    return `${san} follows established theory in the ${openingName}. Solid foundation.`;
  }
  if (classification === 'Brilliant') {
    return `${san}!! Bold tactical strike that sacrifices material or tension for decisive initiative.`;
  }
  if (classification === 'Best') {
    return `${san} is the engine's top choice, keeping maximum pressure and piece coordination.`;
  }
  if (classification === 'Great') {
    return `${san} is an accurate, disciplined move that maintains ${side}'s strategic balance.`;
  }
  if (classification === 'Good') {
    return isCapture
      ? `${san} simplifies cleanly. ${bestMoveSan && bestMoveSan !== san ? `${bestMoveSan} was slightly sharper.` : ''}`
      : `${san} is playable and keeps the position healthy.`;
  }
  if (classification === 'Inaccuracy') {
    return `${san} drifts slightly (-${Math.round(winProbDrop)}% win chance). ${bestMoveSan ? `Prefer ${bestMoveSan} to keep stronger piece activity.` : ''}`;
  }
  if (classification === 'Mistake') {
    return `${san} gives away meaningful control (-${Math.round(winProbDrop)}% win chance). ${bestMoveSan ? `${bestMoveSan} kept the initiative much tighter.` : ''}`;
  }
  return `${san} is a costly blunder (-${Math.round(winProbDrop)}% win chance)${isCheck ? ' despite giving check' : ''}. ${bestMoveSan ? `${bestMoveSan} was critical to hold the position.` : ''}`;
}

function computeAccuracyFromDrops(drops: number[]): number {
  if (drops.length === 0) return 100;
  const moveAccuracies = drops.map((drop) => {
    const cleanDrop = Math.max(0, drop);
    const acc = 103.1668 * Math.exp(-0.04354 * cleanDrop) - 3.1669;
    return Math.max(0, Math.min(100, acc));
  });
  const avg = moveAccuracies.reduce((sum, v) => sum + v, 0) / moveAccuracies.length;
  return Math.round(avg * 10) / 10;
}

/**
 * Full Chess.com-style Game Review analyzer (runs synchronously in milliseconds for smooth UI).
 */
export function analyzeGameFull(pgn: string): FullGameReview {
  const source = new Chess();
  try {
    source.loadPgn(pgn);
  } catch {
    return {
      moves: [],
      whiteAccuracy: 100,
      blackAccuracy: 100,
      opening: { eco: 'A00', name: 'Custom Position', plan: 'Explore freely on the interactive board.' },
      keyMoments: [],
      counts: {
        white: { Brilliant: 0, Great: 0, Best: 0, Book: 0, Good: 0, Inaccuracy: 0, Mistake: 0, Blunder: 0 },
        black: { Brilliant: 0, Great: 0, Best: 0, Book: 0, Good: 0, Inaccuracy: 0, Mistake: 0, Blunder: 0 },
      },
    };
  }

  const history = source.history({ verbose: true });
  const replay = new Chess();
  const sanHistory: string[] = [];
  const moves: MoveReviewItem[] = [];
  const whiteDrops: number[] = [];
  const blackDrops: number[] = [];

  const counts: FullGameReview['counts'] = {
    white: { Brilliant: 0, Great: 0, Best: 0, Book: 0, Good: 0, Inaccuracy: 0, Mistake: 0, Blunder: 0 },
    black: { Brilliant: 0, Great: 0, Best: 0, Book: 0, Good: 0, Inaccuracy: 0, Mistake: 0, Blunder: 0 },
  };

  // Evaluate depth: use 2-ply for fast interactive full-game review (keeps total under ~60ms even for 60-move games)
  const searchDepth = history.length > 70 ? 1 : 2;
  let currentEval = evaluatePosition(replay.fen(), searchDepth);

  for (let i = 0; i < history.length; i++) {
    const mv = history[i];
    const fenBefore = replay.fen();
    const evalBefore = currentEval;
    const prevMoverProb = mv.color === 'w' ? evalBefore.winProbWhite : 100 - evalBefore.winProbWhite;

    replay.move(mv);
    sanHistory.push(mv.san);
    const fenAfter = replay.fen();

    const evalAfter = evaluatePosition(fenAfter, searchDepth);
    currentEval = evalAfter;

    const afterMoverProb = mv.color === 'w' ? evalAfter.winProbWhite : 100 - evalAfter.winProbWhite;
    const winProbDrop = Math.max(0, Math.round((prevMoverProb - afterMoverProb) * 10) / 10);

    const openingMatch = detectOpening(sanHistory);
    const isBook = i < 8 && openingMatch.eco !== 'A00' && openingMatch.name !== 'Starting Position';
    const playedBest = evalBefore.bestMove?.san === mv.san;
    const isCheckmate = replay.isCheckmate();
    const isCheck = replay.isCheck();
    const isCapture = Boolean(mv.captured);
    const isCastle = mv.flags.includes('k') || mv.flags.includes('q');
    const isPromotion = Boolean(mv.promotion);

    // Detect tactical brilliant flair (e.g. non-queen capture or bold check/sacrifice that boosts or holds winning eval)
    const isSacrificeBrilliant =
      !isBook &&
      !isCheckmate &&
      i >= 6 &&
      playedBest &&
      (mv.san.includes('+') || isCapture) &&
      afterMoverProb >= 65 &&
      (mv.piece === 'q' || mv.piece === 'r' || mv.piece === 'n');

    const classification = classifyMoveQuality(
      winProbDrop,
      isBook,
      playedBest,
      isSacrificeBrilliant,
      isCheckmate
    );

    if (mv.color === 'w') {
      whiteDrops.push(winProbDrop);
      counts.white[classification]++;
    } else {
      blackDrops.push(winProbDrop);
      counts.black[classification]++;
    }

    const coachNote = buildDeterministicCoachNote(
      mv.san,
      mv.color,
      classification,
      evalBefore.bestMove?.san ?? null,
      winProbDrop,
      isCheckmate,
      isCheck,
      isCapture,
      openingMatch.name
    );

    moves.push({
      ply: i + 1,
      moveNumber: Math.floor(i / 2) + 1,
      color: mv.color,
      san: mv.san,
      from: mv.from,
      to: mv.to,
      fenBefore,
      fenAfter,
      evalCpBefore: evalBefore.evalCp,
      evalCpAfter: evalAfter.evalCp,
      evalLabel: isCheckmate ? '#' : evalAfter.evalLabel,
      winProbWhite: evalAfter.winProbWhite,
      bestMoveSan: evalBefore.bestMove?.san ?? null,
      bestMoveFrom: evalBefore.bestMove?.from ?? null,
      bestMoveTo: evalBefore.bestMove?.to ?? null,
      classification,
      winProbDrop,
      coachNote,
      isCapture,
      isCheck,
      isCheckmate,
      isCastle,
      isPromotion,
    });
  }

  const finalOpening = detectOpening(sanHistory.slice(0, 12));
  const keyMoments = moves
    .filter(
      (m) =>
        m.classification === 'Blunder' ||
        m.classification === 'Mistake' ||
        m.classification === 'Brilliant' ||
        m.isCheckmate
    )
    .slice(0, 8);

  return {
    moves,
    whiteAccuracy: computeAccuracyFromDrops(whiteDrops),
    blackAccuracy: computeAccuracyFromDrops(blackDrops),
    opening: {
      eco: finalOpening.eco,
      name: finalOpening.name,
      plan: finalOpening.plan,
    },
    keyMoments,
    counts,
  };
}
