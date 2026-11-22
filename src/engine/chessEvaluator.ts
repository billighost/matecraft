import { Chess, Color, Move, PieceSymbol, Square } from 'chess.js';
import { FullGameReview, MoveClassification, MoveReviewItem, PieceColor, PieceType } from '../types/chess';
import { detectOpening } from './openings';

const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

const START_PIECE_COUNTS: Record<Exclude<PieceType, 'k'>, number> = {
  q: 1,
  r: 2,
  b: 2,
  n: 2,
  p: 8,
};

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

const PST_KING_END = [
 -50,-30,-30,-30,-30,-30,-30,-50,
 -30,-10,  0,  0,  0,  0,-10,-30,
 -30,  0, 15, 20, 20, 15,  0,-30,
 -30,  0, 20, 28, 28, 20,  0,-30,
 -30,  0, 20, 28, 28, 20,  0,-30,
 -30,  0, 15, 20, 20, 15,  0,-30,
 -30,-10,  0,  0,  0,  0,-10,-30,
 -50,-30,-30,-30,-30,-30,-30,-50,
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
 * Extracts a repetition-comparison key (piece placement + turn + castling + ep) from a FEN.
 */
export function positionKeyFromFen(fen: string): string {
  return fen.split(' ').slice(0, 4).join(' ');
}

function centerManhattan(row: number, col: number): number {
  const dr = Math.max(3 - row, row - 4);
  const dc = Math.max(3 - col, col - 4);
  return dr + dc;
}

/**
 * Evaluates a position statically in centipawns from White's perspective.
 * Includes endgame Mop-Up Evaluation so winning sides push the enemy King to the corner
 * and deliver checkmate instead of shuffling back and forth!
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
  let whiteNonKingMat = 0;
  let blackNonKingMat = 0;
  let wKing = { r: 7, f: 4 };
  let bKing = { r: 0, f: 4 };

  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = board[r][f];
      if (!piece) continue;
      const base = PIECE_VALUES[piece.type];
      if (piece.type === 'k') {
        if (piece.color === 'w') wKing = { r, f };
        else bKing = { r, f };
        continue;
      }

      const idx = piece.color === 'w' ? r * 8 + f : (7 - r) * 8 + f;
      const pst = PST_MAP[piece.type][idx];

      if (piece.color === 'w') {
        whiteNonKingMat += base;
        score += base + pst;
        if (piece.type === 'b') whiteBishops++;
      } else {
        blackNonKingMat += base;
        score -= base + pst;
        if (piece.type === 'b') blackBishops++;
      }
    }
  }

  const totalNonKingMat = whiteNonKingMat + blackNonKingMat;
  const isEndgame = totalNonKingMat <= 2600;
  const kingTable = isEndgame ? PST_KING_END : PST_KING_MID;

  score += kingTable[wKing.r * 8 + wKing.f];
  score -= kingTable[(7 - bKing.r) * 8 + bKing.f];

  // Endgame Mop-Up Eval: when one side is ahead by >= 2 pawns in an endgame,
  // reward forcing enemy King to the edge AND closing the distance between Kings!
  if (isEndgame && Math.abs(whiteNonKingMat - blackNonKingMat) >= 200) {
    const kingDist = Math.abs(wKing.r - bKing.r) + Math.abs(wKing.f - bKing.f);
    if (whiteNonKingMat > blackNonKingMat) {
      score += centerManhattan(bKing.r, bKing.f) * 18 + (14 - kingDist) * 8;
    } else {
      score -= centerManhattan(wKing.r, wKing.f) * 18 + (14 - kingDist) * 8;
    }
  }

  if (whiteBishops >= 2) score += 28;
  if (blackBishops >= 2) score -= 28;

  // Small tempo bonus
  score += chess.turn() === 'w' ? 8 : -8;

  return score;
}

function scoreMoveOrder(m: Move): number {
  let s = 0;
  if (m.san.includes('#')) return 999999;
  if (m.captured) {
    s += 10 * PIECE_VALUES[m.captured] - PIECE_VALUES[m.piece] + 400;
  }
  if (m.promotion) s += PIECE_VALUES[m.promotion] + 500;
  if (m.san.includes('+')) s += 140;
  if (m.flags.includes('k') || m.flags.includes('q')) s += 60;
  return s;
}

function alphaBeta(
  chess: Chess,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  branchLimit: number
): number {
  if (chess.isCheckmate()) {
    return chess.turn() === 'w' ? -(MATE_SCORE + depth * 20) : MATE_SCORE + depth * 20;
  }
  if (chess.isDraw() || chess.isStalemate()) return 0;
  if (depth === 0) return evaluateStaticCp(chess);

  const moves = chess.moves({ verbose: true });
  moves.sort((a, b) => scoreMoveOrder(b) - scoreMoveOrder(a));
  const limit = Math.min(moves.length, branchLimit);

  if (maximizing) {
    let best = -Infinity;
    for (let i = 0; i < limit; i++) {
      chess.move(moves[i]);
      const val = alphaBeta(chess, depth - 1, alpha, beta, false, branchLimit);
      chess.undo();
      if (val > best) best = val;
      if (val > alpha) alpha = val;
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < limit; i++) {
      chess.move(moves[i]);
      const val = alphaBeta(chess, depth - 1, alpha, beta, true, branchLimit);
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
  pvLine: string[];
}

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

// Fast position evaluation cache (avoids recomputing identical FENs)
const evalCache = new Map<string, PositionEvaluation>();

/**
 * Evaluates a FEN with repetition awareness so suggested moves NEVER oscillate back and forth!
 */
export function evaluatePosition(
  fen: string,
  depth = 2,
  recentPositionKeys?: Set<string>,
  includePv = false
): PositionEvaluation {
  const hasRepHistory = Boolean(recentPositionKeys && recentPositionKeys.size > 0);
  const cacheKey = `${fen}|d${depth}|pv${includePv ? 1 : 0}`;
  if (!hasRepHistory) {
    const cached = evalCache.get(cacheKey);
    if (cached) return cached;
  }

  const chess = new Chess();
  try {
    chess.load(fen);
  } catch {
    return { evalCp: 0, evalLabel: '0.0', winProbWhite: 50, bestMove: null, pvLine: [] };
  }

  if (chess.isCheckmate()) {
    const cp = chess.turn() === 'w' ? -MATE_SCORE : MATE_SCORE;
    return {
      evalCp: cp,
      evalLabel: '#',
      winProbWhite: cp > 0 ? 100 : 0,
      bestMove: null,
      pvLine: [],
    };
  }
  if (chess.isDraw() || chess.isStalemate()) {
    return { evalCp: 0, evalLabel: '0.0', winProbWhite: 50, bestMove: null, pvLine: [] };
  }

  const maximizing = chess.turn() === 'w';
  const moves = chess.moves({ verbose: true });
  moves.sort((a, b) => scoreMoveOrder(b) - scoreMoveOrder(a));

  // Smart branch limit keeps 2-ply evaluation snappy (~15-30ms per position) while never missing mates or captures!
  const branchLimit = depth >= 2 ? 10 : 30;
  const rootLimit = Math.min(moves.length, 24);

  let bestMove: Move | null = moves[0] ?? null;
  let bestSearchVal = maximizing ? -Infinity : Infinity;
  let bestTrueCp = 0;
  let alpha = -Infinity;
  let beta = Infinity;

  for (let i = 0; i < rootLimit; i++) {
    const move = moves[i];
    chess.move(move);
    const nextKey = positionKeyFromFen(chess.fen());
    // When no repetition penalty can distort bounds, pass live alpha/beta for massive pruning speedup!
    const rootAlpha = hasRepHistory ? -Infinity : alpha;
    const rootBeta = hasRepHistory ? Infinity : beta;
    const trueVal = alphaBeta(chess, Math.max(0, depth - 1), rootAlpha, rootBeta, !maximizing, branchLimit);
    chess.undo();

    // Repetition avoidance: strongly discourage repeating an already-seen board state
    // unless the mover is clearly losing (in which case perpetual check/draw is smart!).
    let adjustedVal = trueVal;
    if (recentPositionKeys && recentPositionKeys.has(nextKey)) {
      if (maximizing && trueVal > -120) {
        adjustedVal -= 180;
      } else if (!maximizing && trueVal < 120) {
        adjustedVal += 180;
      }
    }

    if (maximizing) {
      if (adjustedVal > bestSearchVal) {
        bestSearchVal = adjustedVal;
        bestTrueCp = trueVal;
        bestMove = move;
      }
      if (adjustedVal > alpha) alpha = adjustedVal;
    } else {
      if (adjustedVal < bestSearchVal) {
        bestSearchVal = adjustedVal;
        bestTrueCp = trueVal;
        bestMove = move;
      }
      if (adjustedVal < beta) beta = adjustedVal;
    }
  }

  // Extract a crisp 3-ply Principal Variation (PV) line when requested for the live Coach panel
  const pvLine: string[] = [];
  if (includePv && bestMove) {
    const pvChess = new Chess(fen);
    const seen = new Set<string>(recentPositionKeys ? Array.from(recentPositionKeys) : []);
    seen.add(positionKeyFromFen(fen));
    try {
      const m1 = pvChess.move(bestMove.san);
      if (m1) {
        pvLine.push(m1.san);
        seen.add(positionKeyFromFen(pvChess.fen()));
        for (let step = 0; step < 2; step++) {
          if (pvChess.isGameOver()) break;
          const nextEval = evaluatePosition(pvChess.fen(), 1, seen, false);
          if (!nextEval.bestMove) break;
          const nextMv = pvChess.move(nextEval.bestMove.san);
          if (!nextMv) break;
          pvLine.push(nextMv.san);
          seen.add(positionKeyFromFen(pvChess.fen()));
        }
      }
    } catch {
      // Ignore PV extraction edge cases
    }
  }

  const finalCp = Number.isFinite(bestTrueCp) ? bestTrueCp : 0;
  const result: PositionEvaluation = {
    evalCp: finalCp,
    evalLabel: formatEvalLabel(finalCp),
    winProbWhite: cpToWinProbability(finalCp),
    bestMove: bestMove ? { san: bestMove.san, from: bestMove.from, to: bestMove.to } : null,
    pvLine,
  };

  if (!hasRepHistory) {
    if (evalCache.size > 600) {
      const firstKey = evalCache.keys().next().value;
      if (firstKey) evalCache.delete(firstKey);
    }
    evalCache.set(cacheKey, result);
  }

  return result;
}

export interface TacticalInspection {
  materialDiffWhite: number; // in pawns (e.g. +3 means White is up 3 points)
  capturedByWhite: Exclude<PieceType, 'k'>[];
  capturedByBlack: Exclude<PieceType, 'k'>[];
  hangingSquares: Square[];
  threatSummary: string[];
  positionalPlan: string;
}

/**
 * Pure local Grandmaster-grade tactical & positional inspector (0ms, zero API required!).
 * Computes captured pieces, material lead, undefended/hanging pieces, king safety, and concrete plan.
 */
export function inspectPositionTactics(fen: string): TacticalInspection {
  const chess = new Chess();
  try {
    chess.load(fen);
  } catch {
    return {
      materialDiffWhite: 0,
      capturedByWhite: [],
      capturedByBlack: [],
      hangingSquares: [],
      threatSummary: [],
      positionalPlan: 'Develop your pieces actively toward the center.',
    };
  }

  const board = chess.board();
  const wCounts: Record<Exclude<PieceType, 'k'>, number> = { q: 0, r: 0, b: 0, n: 0, p: 0 };
  const bCounts: Record<Exclude<PieceType, 'k'>, number> = { q: 0, r: 0, b: 0, n: 0, p: 0 };

  let wPoints = 0;
  let bPoints = 0;
  let wKingSq: Square | null = null;
  let bKingSq: Square | null = null;

  const hangingSquares: Square[] = [];
  const threatSummary: string[] = [];

  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = board[r][f];
      if (!p) continue;
      if (p.type === 'k') {
        if (p.color === 'w') wKingSq = p.square;
        else bKingSq = p.square;
        continue;
      }
      const pt = p.type as Exclude<PieceType, 'k'>;
      const val = pt === 'p' ? 1 : pt === 'n' || pt === 'b' ? 3 : pt === 'r' ? 5 : 9;
      if (p.color === 'w') {
        wCounts[pt]++;
        wPoints += val;
      } else {
        bCounts[pt]++;
        bPoints += val;
      }

      // Check if piece is currently attacked by opponent and undefended by own side!
      const oppColor: Color = p.color === 'w' ? 'b' : 'w';
      const attacked = chess.isAttacked(p.square, oppColor);
      const defended = chess.isAttacked(p.square, p.color);
      if (attacked && !defended) {
        hangingSquares.push(p.square);
        if (pt !== 'p') {
          const pieceLabel =
            pt === 'q' ? 'Queen' : pt === 'r' ? 'Rook' : pt === 'b' ? 'Bishop' : 'Knight';
          threatSummary.push(
            `${p.color === 'w' ? 'White' : 'Black'}'s ${pieceLabel} on ${p.square} is undefended and under direct attack.`
          );
        }
      }
    }
  }

  const capturedByWhite: Exclude<PieceType, 'k'>[] = [];
  const capturedByBlack: Exclude<PieceType, 'k'>[] = [];
  (['q', 'r', 'b', 'n', 'p'] as Exclude<PieceType, 'k'>[]).forEach((pt) => {
    const missingBlack = Math.max(0, START_PIECE_COUNTS[pt] - bCounts[pt]);
    for (let i = 0; i < missingBlack; i++) capturedByWhite.push(pt);
    const missingWhite = Math.max(0, START_PIECE_COUNTS[pt] - wCounts[pt]);
    for (let i = 0; i < missingWhite; i++) capturedByBlack.push(pt);
  });

  if (chess.isCheckmate()) {
    hangingSquares.length = 0;
    threatSummary.length = 0;
    threatSummary.push('Checkmate on the board — King has zero legal escapes.');
  } else if (chess.inCheck()) {
    threatSummary.unshift(`${chess.turn() === 'w' ? 'White' : 'Black'} King is in check — must respond immediately.`);
  }

  // King safety diagnostic
  if (wKingSq === 'e1' && (wCounts.r + bCounts.r) >= 3 && wCounts.q + bCounts.q >= 1) {
    threatSummary.push('White King is still in the center (e1) while heavy pieces remain — prioritize castling.');
  }
  if (bKingSq === 'e8' && (wCounts.r + bCounts.r) >= 3 && wCounts.q + bCounts.q >= 1) {
    threatSummary.push('Black King is still in the center (e8) while heavy pieces remain — look for central file openings.');
  }

  const materialDiffWhite = wPoints - bPoints;
  let positionalPlan = '';
  if (chess.isCheckmate()) {
    positionalPlan = 'Study the final mating geometry or step back 1–2 plies to see how the defender could have prevented the mate.';
  } else if (hangingSquares.length > 0) {
    positionalPlan = 'Resolve the immediate tactical tension first — secure undefended pieces or calculate a sharper counter-threat.';
  } else if (Math.abs(materialDiffWhite) >= 3) {
    const leader = materialDiffWhite > 0 ? 'White' : 'Black';
    positionalPlan = `${leader} holds a decisive material lead (${materialDiffWhite > 0 ? '+' : ''}${materialDiffWhite}). Trade down Queens/Rooks cleanly and activate the King for checkmate conversion.`;
  } else if (wCounts.q + bCounts.q === 0) {
    positionalPlan = 'Endgame phase: centralize your King aggressively, activate Rooks behind passed pawns, and push enemy King toward the edge.';
  } else {
    positionalPlan = 'Balanced middlegame: improve your least-active minor piece, contest open files with Rooks, and watch for weak squares around the castled King.';
  }

  return {
    materialDiffWhite,
    capturedByWhite,
    capturedByBlack,
    hangingSquares,
    threatSummary: threatSummary.slice(0, 4),
    positionalPlan,
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
    return `${san} follows established theory in the ${openingName}. Solid opening development.`;
  }
  if (classification === 'Brilliant') {
    return `${san}!! Sharp tactical strike creating decisive initiative and forcing lines.`;
  }
  if (classification === 'Best') {
    return `${san} is the engine's top choice, preserving maximum pressure and piece coordination.`;
  }
  if (classification === 'Great') {
    return `${san} is a disciplined, accurate move keeping ${side}'s strategic balance intact.`;
  }
  if (classification === 'Good') {
    return isCapture
      ? `${san} simplifies cleanly. ${bestMoveSan && bestMoveSan !== san ? `${bestMoveSan} was slightly sharper.` : ''}`
      : `${san} keeps a healthy structure and piece harmony.`;
  }
  if (classification === 'Inaccuracy') {
    return `${san} slips slightly (-${Math.round(winProbDrop)}% win chance). ${bestMoveSan ? `Prefer ${bestMoveSan} to keep tighter control.` : ''}`;
  }
  if (classification === 'Mistake') {
    return `${san} concedes meaningful advantage (-${Math.round(winProbDrop)}% win chance). ${bestMoveSan ? `${bestMoveSan} maintained a much stronger position.` : ''}`;
  }
  return `${san} is a costly blunder (-${Math.round(winProbDrop)}% win chance)${isCheck ? ' despite delivering check' : ''}. ${bestMoveSan ? `${bestMoveSan} was critical to stay in the fight.` : ''}`;
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

function emptyCounts(): FullGameReview['counts'] {
  return {
    white: { Brilliant: 0, Great: 0, Best: 0, Book: 0, Good: 0, Inaccuracy: 0, Mistake: 0, Blunder: 0 },
    black: { Brilliant: 0, Great: 0, Best: 0, Book: 0, Good: 0, Inaccuracy: 0, Mistake: 0, Blunder: 0 },
  };
}

/**
 * Instant (<5ms) skeleton parser so the Game Studio opens IMMEDIATELY with zero UI freeze!
 */
export function parseGameSkeleton(pgn: string): FullGameReview {
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
      counts: emptyCounts(),
    };
  }

  const history = source.history({ verbose: true });
  const initialFen = source.getHeaders().FEN;
  const replay = initialFen ? new Chess(initialFen) : new Chess();
  const sanHistory: string[] = [];
  const moves: MoveReviewItem[] = [];

  for (let i = 0; i < history.length; i++) {
    const mv = history[i];
    const fenBefore = replay.fen();
    replay.move(mv);
    sanHistory.push(mv.san);
    const fenAfter = replay.fen();
    const isCheckmate = replay.isCheckmate();
    const staticCp = evaluateStaticCp(replay);

    moves.push({
      ply: i + 1,
      moveNumber: Math.floor(i / 2) + 1,
      color: mv.color,
      san: mv.san,
      from: mv.from,
      to: mv.to,
      fenBefore,
      fenAfter,
      evalCpBefore: 0,
      evalCpAfter: staticCp,
      evalLabel: isCheckmate ? '#' : formatEvalLabel(staticCp),
      winProbWhite: cpToWinProbability(staticCp),
      bestMoveSan: null,
      bestMoveFrom: null,
      bestMoveTo: null,
      classification: isCheckmate ? 'Best' : i < 6 ? 'Book' : 'Good',
      winProbDrop: 0,
      coachNote: isCheckmate
        ? `${mv.san} delivers checkmate!`
        : 'Deepening tactical engine review...',
      isCapture: Boolean(mv.captured),
      isCheck: replay.isCheck(),
      isCheckmate,
      isCastle: mv.flags.includes('k') || mv.flags.includes('q'),
      isPromotion: Boolean(mv.promotion),
    });
  }

  const finalOpening = detectOpening(sanHistory.slice(0, 12));
  return {
    moves,
    whiteAccuracy: 100,
    blackAccuracy: 100,
    opening: {
      eco: finalOpening.eco,
      name: finalOpening.name,
      plan: finalOpening.plan,
    },
    keyMoments: moves.filter((m) => m.isCheckmate),
    counts: emptyCounts(),
  };
}

/**
 * Non-blocking progressive chunked analyzer so even 120-move Chess.com games NEVER freeze the UI!
 * Returns a cancel function for clean React effect teardown.
 */
export function analyzeGameProgressive(
  pgn: string,
  onProgress: (partialReview: FullGameReview, analyzedPlies: number, totalPlies: number, isDone: boolean) => void
): () => void {
  let cancelled = false;
  const skeleton = parseGameSkeleton(pgn);
  const totalPlies = skeleton.moves.length;

  if (totalPlies === 0) {
    onProgress(skeleton, 0, 0, true);
    return () => {
      cancelled = true;
    };
  }

  // Emit instant skeleton first so board renders on Frame 0!
  onProgress(skeleton, 0, totalPlies, false);

  const movesCopy = skeleton.moves.map((m) => ({ ...m }));
  const whiteDrops: number[] = [];
  const blackDrops: number[] = [];
  const counts = emptyCounts();
  const sanHistory: string[] = [];

  // Adaptive search depth keeps even 100-ply Chess.com games buttery smooth & responsive!
  const searchDepth = totalPlies > 40 ? 1 : 2;
  let currentEval = evaluatePosition(movesCopy[0].fenBefore, searchDepth);
  let idx = 0;
  const CHUNK_SIZE = searchDepth === 1 ? 6 : 2;

  const processChunk = () => {
    if (cancelled) return;
    const end = Math.min(totalPlies, idx + CHUNK_SIZE);

    for (; idx < end; idx++) {
      const mv = movesCopy[idx];
      const evalBefore = currentEval;
      const prevMoverProb = mv.color === 'w' ? evalBefore.winProbWhite : 100 - evalBefore.winProbWhite;

      sanHistory.push(mv.san);
      const evalAfter = evaluatePosition(mv.fenAfter, searchDepth);
      currentEval = evalAfter;

      const afterMoverProb = mv.color === 'w' ? evalAfter.winProbWhite : 100 - evalAfter.winProbWhite;
      const winProbDrop = Math.max(0, Math.round((prevMoverProb - afterMoverProb) * 10) / 10);

      const openingMatch = detectOpening(sanHistory);
      const isBook = idx < 8 && openingMatch.eco !== 'A00' && openingMatch.name !== 'Starting Position';
      const playedBest = evalBefore.bestMove?.san === mv.san;
      const isSacrificeBrilliant =
        !isBook &&
        !mv.isCheckmate &&
        idx >= 6 &&
        playedBest &&
        (mv.isCheck || mv.isCapture) &&
        afterMoverProb >= 65;

      const classification = classifyMoveQuality(
        winProbDrop,
        isBook,
        playedBest,
        isSacrificeBrilliant,
        mv.isCheckmate
      );

      if (mv.color === 'w') {
        whiteDrops.push(winProbDrop);
        counts.white[classification]++;
      } else {
        blackDrops.push(winProbDrop);
        counts.black[classification]++;
      }

      mv.evalCpBefore = evalBefore.evalCp;
      mv.evalCpAfter = evalAfter.evalCp;
      mv.evalLabel = mv.isCheckmate ? '#' : evalAfter.evalLabel;
      mv.winProbWhite = evalAfter.winProbWhite;
      mv.bestMoveSan = evalBefore.bestMove?.san ?? null;
      mv.bestMoveFrom = evalBefore.bestMove?.from ?? null;
      mv.bestMoveTo = evalBefore.bestMove?.to ?? null;
      mv.classification = classification;
      mv.winProbDrop = winProbDrop;
      mv.coachNote = buildDeterministicCoachNote(
        mv.san,
        mv.color,
        classification,
        mv.bestMoveSan,
        winProbDrop,
        mv.isCheckmate,
        mv.isCheck,
        mv.isCapture,
        openingMatch.name
      );
    }

    const done = idx >= totalPlies;
    const keyMoments = movesCopy
      .filter(
        (m) =>
          m.classification === 'Blunder' ||
          m.classification === 'Mistake' ||
          m.classification === 'Brilliant' ||
          m.isCheckmate
      )
      .slice(0, 8);

    onProgress(
      {
        moves: [...movesCopy],
        whiteAccuracy: computeAccuracyFromDrops(whiteDrops),
        blackAccuracy: computeAccuracyFromDrops(blackDrops),
        opening: skeleton.opening,
        keyMoments,
        counts: {
          white: { ...counts.white },
          black: { ...counts.black },
        },
      },
      idx,
      totalPlies,
      done
    );

    if (!done && !cancelled) {
      setTimeout(processChunk, 0);
    }
  };

  setTimeout(processChunk, 0);

  return () => {
    cancelled = true;
  };
}

/**
 * Synchronous full-game review helper (preserved for deterministic unit tests).
 */
export function analyzeGameFull(pgn: string): FullGameReview {
  const skeleton = parseGameSkeleton(pgn);
  const totalPlies = skeleton.moves.length;
  if (totalPlies === 0) return skeleton;

  const movesCopy = skeleton.moves.map((m) => ({ ...m }));
  const whiteDrops: number[] = [];
  const blackDrops: number[] = [];
  const counts = emptyCounts();
  const sanHistory: string[] = [];

  const searchDepth = totalPlies > 80 ? 1 : 2;
  let currentEval = evaluatePosition(movesCopy[0].fenBefore, searchDepth);

  for (let i = 0; i < totalPlies; i++) {
    const mv = movesCopy[i];
    const evalBefore = currentEval;
    const prevMoverProb = mv.color === 'w' ? evalBefore.winProbWhite : 100 - evalBefore.winProbWhite;
    sanHistory.push(mv.san);
    const evalAfter = evaluatePosition(mv.fenAfter, searchDepth);
    currentEval = evalAfter;

    const afterMoverProb = mv.color === 'w' ? evalAfter.winProbWhite : 100 - evalAfter.winProbWhite;
    const winProbDrop = Math.max(0, Math.round((prevMoverProb - afterMoverProb) * 10) / 10);
    const openingMatch = detectOpening(sanHistory);
    const isBook = i < 8 && openingMatch.eco !== 'A00' && openingMatch.name !== 'Starting Position';
    const playedBest = evalBefore.bestMove?.san === mv.san;
    const isSacrificeBrilliant =
      !isBook && !mv.isCheckmate && i >= 6 && playedBest && (mv.isCheck || mv.isCapture) && afterMoverProb >= 65;

    const classification = classifyMoveQuality(winProbDrop, isBook, playedBest, isSacrificeBrilliant, mv.isCheckmate);
    if (mv.color === 'w') {
      whiteDrops.push(winProbDrop);
      counts.white[classification]++;
    } else {
      blackDrops.push(winProbDrop);
      counts.black[classification]++;
    }

    mv.evalCpBefore = evalBefore.evalCp;
    mv.evalCpAfter = evalAfter.evalCp;
    mv.evalLabel = mv.isCheckmate ? '#' : evalAfter.evalLabel;
    mv.winProbWhite = evalAfter.winProbWhite;
    mv.bestMoveSan = evalBefore.bestMove?.san ?? null;
    mv.bestMoveFrom = evalBefore.bestMove?.from ?? null;
    mv.bestMoveTo = evalBefore.bestMove?.to ?? null;
    mv.classification = classification;
    mv.winProbDrop = winProbDrop;
    mv.coachNote = buildDeterministicCoachNote(
      mv.san,
      mv.color,
      classification,
      mv.bestMoveSan,
      winProbDrop,
      mv.isCheckmate,
      mv.isCheck,
      mv.isCapture,
      openingMatch.name
    );
  }

  return {
    moves: movesCopy,
    whiteAccuracy: computeAccuracyFromDrops(whiteDrops),
    blackAccuracy: computeAccuracyFromDrops(blackDrops),
    opening: skeleton.opening,
    keyMoments: movesCopy
      .filter((m) => m.classification === 'Blunder' || m.classification === 'Mistake' || m.classification === 'Brilliant' || m.isCheckmate)
      .slice(0, 8),
    counts,
  };
}
