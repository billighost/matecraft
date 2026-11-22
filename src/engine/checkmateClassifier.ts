import { Chess, Color, PieceSymbol, Square } from 'chess.js';
import { CHECKMATE_MAP } from './checkmateLibrary';
import { CheckmateAnalysis, PieceType } from '../types/chess';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;

function squareToCoords(sq: string): { file: number; rank: number } {
  return {
    file: sq.charCodeAt(0) - 97, // 0..7
    rank: Number(sq[1]) - 1, // 0..7
  };
}

function coordsToSquare(file: number, rank: number): Square | null {
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
  return `${FILES[file]}${rank + 1}` as Square;
}

function getAdjacentSquares(sq: string): Square[] {
  const { file, rank } = squareToCoords(sq);
  const res: Square[] = [];
  for (let df = -1; df <= 1; df++) {
    for (let dr = -1; dr <= 1; dr++) {
      if (df === 0 && dr === 0) continue;
      const next = coordsToSquare(file + df, rank + dr);
      if (next) res.push(next);
    }
  }
  return res;
}

function isCorner(sq: string): boolean {
  return sq === 'a1' || sq === 'a8' || sq === 'h1' || sq === 'h8';
}

function isEdge(sq: string): boolean {
  const { file, rank } = squareToCoords(sq);
  return file === 0 || file === 7 || rank === 0 || rank === 7;
}

function findKingSquare(chess: Chess, color: Color): Square | null {
  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = board[r][f];
      if (piece && piece.type === 'k' && piece.color === color) {
        return piece.square;
      }
    }
  }
  return null;
}

/**
 * Find all squares of `attackerColor` that currently attack `targetSquare`.
 */
function getAttackersOfSquare(chess: Chess, targetSquare: Square, attackerColor: Color): { square: Square; type: PieceSymbol }[] {
  const target = squareToCoords(targetSquare);
  const board = chess.board();
  const attackers: { square: Square; type: PieceSymbol }[] = [];

  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = board[r][f];
      if (!piece || piece.color !== attackerColor) continue;
      const from = squareToCoords(piece.square);
      const df = target.file - from.file;
      const dr = target.rank - from.rank;
      const adf = Math.abs(df);
      const adr = Math.abs(dr);

      let attacks = false;
      if (piece.type === 'p') {
        const dir = attackerColor === 'w' ? 1 : -1;
        attacks = adr === 1 && adf === 1 && dr === dir;
      } else if (piece.type === 'n') {
        attacks = (adf === 1 && adr === 2) || (adf === 2 && adr === 1);
      } else if (piece.type === 'k') {
        attacks = adf <= 1 && adr <= 1 && (adf > 0 || adr > 0);
      } else {
        const isDiag = adf === adr && adf > 0;
        const isOrtho = (df === 0 || dr === 0) && (adf > 0 || adr > 0);
        const canMove =
          (piece.type === 'b' && isDiag) ||
          (piece.type === 'r' && isOrtho) ||
          (piece.type === 'q' && (isDiag || isOrtho));
        if (canMove) {
          const stepF = Math.sign(df);
          const stepR = Math.sign(dr);
          let curF = from.file + stepF;
          let curR = from.rank + stepR;
          let blocked = false;
          while (curF !== target.file || curR !== target.rank) {
            const midSq = coordsToSquare(curF, curR)!;
            if (chess.get(midSq)) {
              blocked = true;
              break;
            }
            curF += stepF;
            curR += stepR;
          }
          attacks = !blocked;
        }
      }

      if (attacks) {
        attackers.push({ square: piece.square, type: piece.type });
      }
    }
  }
  return attackers;
}

function hashSignature(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * Formats a Unix epoch timestamp (seconds) or PGN UTCDate/UTCTime into a full crisp date & time string.
 */
export function formatFullGameTimestamp(epochSeconds?: number, pgn?: string): string {
  if (epochSeconds && Number.isFinite(epochSeconds) && epochSeconds > 0) {
    const d = new Date(epochSeconds * 1000);
    const datePart = d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
    const timePart = d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'UTC',
    });
    return `${datePart} · ${timePart} UTC`;
  }

  if (pgn) {
    const dateMatch = pgn.match(/\[(?:UTCDate|Date)\s+"([^"]+)"\]/);
    const timeMatch = pgn.match(/\[(?:UTCTime|StartTime|EndTime)\s+"([^"]+)"\]/);
    if (dateMatch) {
      const cleanDate = dateMatch[1].replace(/\./g, '-');
      const timeStr = timeMatch ? `${timeMatch[1]} UTC` : '00:00:00 UTC';
      const parsed = new Date(`${cleanDate}T${timeMatch ? timeMatch[1] : '00:00:00'}Z`);
      if (!Number.isNaN(parsed.getTime())) {
        const datePart = parsed.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          timeZone: 'UTC',
        });
        return `${datePart} · ${timeStr}`;
      }
      return `${cleanDate} · ${timeStr}`;
    }
  }

  return 'Date unavailable';
}

export interface ClassifyLastMove {
  san: string;
  from: Square;
  to: Square;
  piece: PieceSymbol;
  flags: string;
  promotion?: PieceSymbol;
}

export interface ClassifyInput {
  pgn?: string;
  fen?: string;
  lastMoveSan?: string;
  lastMoveFrom?: string;
  lastMoveTo?: string;
  totalPlies?: number;
  lastMove?: ClassifyLastMove;
}

/**
 * Core deterministic checkmate classifier + uniqueness/novelty detector.
 */
export function classifyCheckmate(input: ClassifyInput): CheckmateAnalysis | null {
  const chess = new Chess();
  let lastMove: ClassifyLastMove | null = input.lastMove ?? null;
  let totalPlies = input.totalPlies ?? 0;

  if (input.pgn) {
    try {
      chess.loadPgn(input.pgn);
      const history = chess.history({ verbose: true });
      totalPlies = history.length;
      if (history.length > 0) {
        const last = history[history.length - 1];
        lastMove = {
          san: last.san,
          from: last.from,
          to: last.to,
          piece: last.piece,
          flags: last.flags,
          promotion: last.promotion,
        };
      }
    } catch {
      if (input.fen) {
        try {
          chess.load(input.fen);
        } catch {
          return null;
        }
      } else {
        return null;
      }
    }
  } else if (input.fen) {
    try {
      chess.load(input.fen);
    } catch {
      return null;
    }
  } else {
    return null;
  }

  if (!chess.isCheckmate()) {
    return null;
  }

  const loserColor: Color = chess.turn();
  const winnerColor: Color = loserColor === 'w' ? 'b' : 'w';
  const kingSq = findKingSquare(chess, loserColor);
  if (!kingSq) return null;

  const kingCoords = squareToCoords(kingSq);
  const checkers = getAttackersOfSquare(chess, kingSq, winnerColor);
  const adjacent = getAdjacentSquares(kingSq);

  // Inspect surrounding squares
  const friendlyBlockers = adjacent.filter((sq) => {
    const p = chess.get(sq);
    return p && p.color === loserColor;
  });

  // Collect all attacking pieces involved in the mating net (checkers + escape controllers)
  const escapeAttackers = new Map<Square, PieceSymbol>();
  for (const sq of adjacent) {
    const occupant = chess.get(sq);
    if (occupant && occupant.color === loserColor) continue;
    const att = getAttackersOfSquare(chess, sq, winnerColor);
    for (const a of att) {
      escapeAttackers.set(a.square, a.type);
    }
  }
  for (const c of checkers) {
    escapeAttackers.set(c.square, c.type);
  }

  // Count winner's non-king pieces on board (useful for endgame mates)
  const board = chess.board();
  const winnerPieces: { type: PieceSymbol; square: Square }[] = [];
  const loserPieces: { type: PieceSymbol; square: Square }[] = [];
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = board[r][f];
      if (!p) continue;
      if (p.color === winnerColor && p.type !== 'k') winnerPieces.push({ type: p.type, square: p.square });
      if (p.color === loserColor && p.type !== 'k') loserPieces.push({ type: p.type, square: p.square });
    }
  }

  const primaryChecker = checkers[0];
  const primaryPieceType: PieceType = (lastMove?.promotion ?? lastMove?.piece ?? primaryChecker?.type ?? 'q') as PieceType;
  const matingSan = lastMove?.san ?? input.lastMoveSan ?? '#';
  const backRank = loserColor === 'w' ? 0 : 7;
  const onBackRank = kingCoords.rank === backRank;
  const forwardDir = loserColor === 'w' ? 1 : -1;

  // Helpers for pattern tests
  const checkerTypes = new Set(checkers.map((c) => c.type));
  const netTypes = new Set(Array.from(escapeAttackers.values()));
  const checkerCount = checkers.length;

  let patternId = 'uncharted-mate';

  // 1. Ultra-special rule mates first
  if (lastMove?.flags?.includes('e')) {
    patternId = 'en-passant-mate';
  } else if (lastMove?.flags?.includes('k') || lastMove?.flags?.includes('q') || /^O-O/.test(matingSan)) {
    patternId = 'castling-mate';
  } else if (totalPlies > 0 && totalPlies <= 4 && primaryChecker?.type === 'q') {
    patternId = 'fools-mate';
  } else if (
    totalPlies > 0 &&
    totalPlies <= 9 &&
    primaryChecker?.type === 'q' &&
    (primaryChecker.square === 'f7' || primaryChecker.square === 'f2')
  ) {
    patternId = 'scholars-mate';
  } else if (
    totalPlies > 0 &&
    totalPlies <= 16 &&
    primaryChecker?.type === 'n' &&
    (primaryChecker.square === 'd5' || primaryChecker.square === 'd4') &&
    netTypes.has('b') &&
    winnerPieces.filter((p) => p.type === 'n').length >= 2 &&
    !winnerPieces.some((p) => p.type === 'q')
  ) {
    patternId = 'legals-mate';
  } else if (checkerTypes.has('n') && friendlyBlockers.length === adjacent.length) {
    // Smothered Mate: Knight checks and ALL adjacent squares are blocked by own pieces!
    patternId = 'smothered-mate';
  } else if (checkerCount >= 2) {
    patternId = 'double-check-mate';
  } else if (lastMove && !checkers.some((c) => c.square === lastMove!.to)) {
    // The piece that moved is NOT the piece delivering check => Discovered Mate!
    patternId = 'discovered-mate';
  } else if (lastMove?.promotion) {
    patternId = 'promotion-mate';
  } else if (primaryChecker?.type === 'p') {
    patternId = 'david-goliath-mate';
  } else {
    // 2. Classic named tactical & geometric patterns
    const chk = primaryChecker;
    const chkCoords = chk ? squareToCoords(chk.square) : null;
    const distFile = chkCoords ? Math.abs(chkCoords.file - kingCoords.file) : 9;
    const distRank = chkCoords ? Math.abs(chkCoords.rank - kingCoords.rank) : 9;
    const isAdjacentCheck = distFile <= 1 && distRank <= 1;

    // Boden's Mate: Bishop checks + another Bishop in mating net on opposite color
    const bishopsInNet = Array.from(escapeAttackers.entries()).filter(([, t]) => t === 'b');
    const rooksInNet = Array.from(escapeAttackers.entries()).filter(([, t]) => t === 'r');
    const queensInNet = Array.from(escapeAttackers.entries()).filter(([, t]) => t === 'q');
    const knightsInNet = Array.from(escapeAttackers.entries()).filter(([, t]) => t === 'n');
    const pawnsInNet = Array.from(escapeAttackers.entries()).filter(([, t]) => t === 'p');

    // Check side-flank blockers for Epaulette (two friendly pieces directly left & right or up & down of king)
    const leftSq = coordsToSquare(kingCoords.file - 1, kingCoords.rank);
    const rightSq = coordsToSquare(kingCoords.file + 1, kingCoords.rank);
    const upSq = coordsToSquare(kingCoords.file, kingCoords.rank + 1);
    const downSq = coordsToSquare(kingCoords.file, kingCoords.rank - 1);
    const hasHorizEpaulettes =
      !!leftSq &&
      !!rightSq &&
      chess.get(leftSq)?.color === loserColor &&
      chess.get(rightSq)?.color === loserColor;
    const hasVertEpaulettes =
      !!upSq &&
      !!downSq &&
      chess.get(upSq)?.color === loserColor &&
      chess.get(downSq)?.color === loserColor;

    // Check Swallow's Tail: Queen checks orthogonally adjacent, and the two diagonally opposite squares behind king have friendly pieces
    const isSwallowsTail = (() => {
      if (chk?.type !== 'q' || !chkCoords || !isAdjacentCheck) return false;
      const df = kingCoords.file - chkCoords.file;
      const dr = kingCoords.rank - chkCoords.rank;
      if (Math.abs(df) + Math.abs(dr) !== 1) return false;
      const back1 = coordsToSquare(kingCoords.file + df + (dr !== 0 ? -1 : 0), kingCoords.rank + dr + (df !== 0 ? -1 : 0));
      const back2 = coordsToSquare(kingCoords.file + df + (dr !== 0 ? 1 : 0), kingCoords.rank + dr + (df !== 0 ? 1 : 0));
      return (
        !!back1 &&
        !!back2 &&
        chess.get(back1)?.color === loserColor &&
        chess.get(back2)?.color === loserColor
      );
    })();

    // Check Dovetail: Queen checks diagonally adjacent, and the two orthogonal squares behind king have friendly pieces
    const isDovetail = (() => {
      if (chk?.type !== 'q' || !chkCoords || !isAdjacentCheck) return false;
      const df = kingCoords.file - chkCoords.file;
      const dr = kingCoords.rank - chkCoords.rank;
      if (Math.abs(df) !== 1 || Math.abs(dr) !== 1) return false;
      const orth1 = coordsToSquare(kingCoords.file + df, kingCoords.rank);
      const orth2 = coordsToSquare(kingCoords.file, kingCoords.rank + dr);
      return (
        !!orth1 &&
        !!orth2 &&
        chess.get(orth1)?.color === loserColor &&
        chess.get(orth2)?.color === loserColor
      );
    })();

    // Arabian Mate: King in corner, Rook adjacent check, Knight covers the diagonal & supports Rook
    const isArabian =
      isCorner(kingSq) &&
      chk?.type === 'r' &&
      isAdjacentCheck &&
      knightsInNet.some(([nSq]) => {
        const nc = squareToCoords(nSq);
        return Math.abs(nc.file - kingCoords.file) === 2 && Math.abs(nc.rank - kingCoords.rank) === 2;
      });

    // Anastasia's Mate: King on edge file (a or h), Rook/Queen checks along that file, Knight sits 2 files away blocking inner escapes
    const isAnastasia =
      (kingCoords.file === 0 || kingCoords.file === 7) &&
      (chk?.type === 'r' || chk?.type === 'q') &&
      chkCoords?.file === kingCoords.file &&
      knightsInNet.some(([nSq]) => {
        const nc = squareToCoords(nSq);
        return Math.abs(nc.file - kingCoords.file) === 3 && Math.abs(nc.rank - kingCoords.rank) <= 1;
      });

    // Opera Mate: King on back rank, Rook checks on back rank supported by a Bishop, friendly piece blocks escape
    const isOpera =
      onBackRank &&
      chk?.type === 'r' &&
      chkCoords?.rank === backRank &&
      getAttackersOfSquare(chess, chk.square, winnerColor).some((a) => a.type === 'b') &&
      friendlyBlockers.length >= 1;

    // Back-Rank Mate: King on back rank, Rook/Queen checks along back rank, own pawns block all 2-3 forward squares
    const isBackRank = (() => {
      if (!onBackRank || (chk?.type !== 'r' && chk?.type !== 'q') || chkCoords?.rank !== backRank) return false;
      const forwardRank = backRank + forwardDir;
      const forwardSqs = [kingCoords.file - 1, kingCoords.file, kingCoords.file + 1]
        .map((f) => coordsToSquare(f, forwardRank))
        .filter((s): s is Square => s !== null);
      const pawnBlocks = forwardSqs.filter((s) => {
        const p = chess.get(s);
        return p && p.color === loserColor && p.type === 'p';
      });
      return pawnBlocks.length >= Math.min(2, forwardSqs.length);
    })();

    // Blind Swine: Two rooks on 7th/2nd rank
    const seventhRank = winnerColor === 'w' ? 6 : 1;
    const rooksOnSeventh = winnerPieces.filter((p) => p.type === 'r' && squareToCoords(p.square).rank === seventhRank);
    const isBlindSwine = chk?.type === 'r' && onBackRank && rooksOnSeventh.length >= 2;

    // Hook Mate: Rook checks adjacent to King, protected by Knight, Knight protected by Pawn
    const isHook =
      chk?.type === 'r' &&
      isAdjacentCheck &&
      getAttackersOfSquare(chess, chk.square, winnerColor).some(
        (a) => a.type === 'n' && getAttackersOfSquare(chess, a.square, winnerColor).some((p) => p.type === 'p')
      );

    // Lolli / Damiano: Queen checks adjacent to edge/back-rank King, supported by pawn
    const queenSupportedByPawn =
      chk?.type === 'q' &&
      isAdjacentCheck &&
      getAttackersOfSquare(chess, chk.square, winnerColor).some((a) => a.type === 'p');

    // Kill Box: Rook checks adjacent to edge King, defended by Queen
    const isKillBox =
      chk?.type === 'r' &&
      isAdjacentCheck &&
      getAttackersOfSquare(chess, chk.square, winnerColor).some((a) => a.type === 'q');

    // Anderssen's Mate: Rook checks on back rank supported by pawn on 7th/2nd
    const isAnderssen =
      onBackRank &&
      chk?.type === 'r' &&
      isAdjacentCheck &&
      getAttackersOfSquare(chess, chk.square, winnerColor).some((a) => a.type === 'p');

    // Vukovic Mate: Rook checks adjacent on edge, protected by Knight
    const isVukovic =
      isEdge(kingSq) &&
      chk?.type === 'r' &&
      isAdjacentCheck &&
      getAttackersOfSquare(chess, chk.square, winnerColor).some((a) => a.type === 'n');

    // Suffocation Mate: Knight checks, Bishop controls escape(s), at least 1 friendly blocker
    const isSuffocation = chk?.type === 'n' && bishopsInNet.length >= 1 && friendlyBlockers.length >= 1;

    // Corner Mate: Knight checks cornered King with Rook/Queen blocking adjacent file/rank
    const isCornerMate = isCorner(kingSq) && chk?.type === 'n' && (rooksInNet.length > 0 || queensInNet.length > 0);

    // Blackburne's Mate: Cornered King, Bishop checks, another Bishop + Knight in mating net
    const isBlackburne =
      isEdge(kingSq) && chk?.type === 'b' && bishopsInNet.length >= 2 && knightsInNet.length >= 1;

    // Boden's Mate: Two bishops crisscrossing with friendly blockers
    const isBoden = chk?.type === 'b' && bishopsInNet.length >= 2 && friendlyBlockers.length >= 1;

    // Balestra Mate: Bishop checks, Queen controls orthogonal escapes
    const isBalestra = chk?.type === 'b' && queensInNet.length >= 1;

    // Morphy's Mate: Cornered King, Bishop checks, Rook seals adjacent file
    const isMorphy = isCorner(kingSq) && chk?.type === 'b' && rooksInNet.length >= 1;

    // Pillsbury's Mate / Greco's Mate: Edge/corner King, Rook checks while Bishop seals escape diagonal
    const isPillsbury = isCorner(kingSq) && chk?.type === 'r' && bishopsInNet.length >= 1;
    const isGreco = isEdge(kingSq) && (chk?.type === 'r' || chk?.type === 'q') && bishopsInNet.length >= 1 && friendlyBlockers.length >= 1;

    // Endgame pure mates
    const isTwoBishopsEndgame =
      winnerPieces.length === 2 &&
      winnerPieces.every((p) => p.type === 'b') &&
      loserPieces.length <= 1;
    const isBishopKnightEndgame =
      winnerPieces.length === 2 &&
      winnerPieces.some((p) => p.type === 'b') &&
      winnerPieces.some((p) => p.type === 'n') &&
      loserPieces.length <= 1;
    const isKingRookBox =
      chk?.type === 'r' &&
      isEdge(kingSq) &&
      loserPieces.length <= 2 &&
      winnerPieces.length <= 2 &&
      Array.from(escapeAttackers.values()).includes('k');
    const isLadderMate =
      (chk?.type === 'r' || chk?.type === 'q') &&
      isEdge(kingSq) &&
      !isAdjacentCheck &&
      (rooksInNet.length + queensInNet.length >= 2) &&
      friendlyBlockers.length === 0;
    const isKissOfDeath =
      chk?.type === 'q' &&
      isAdjacentCheck &&
      isEdge(kingSq) &&
      getAttackersOfSquare(chess, chk.square, winnerColor).length >= 1;

    if (isArabian) patternId = 'arabian-mate';
    else if (isAnastasia) patternId = 'anastasias-mate';
    else if (isBlackburne) patternId = 'blackburnes-mate';
    else if (isBoden) patternId = 'bodens-mate';
    else if (isOpera) patternId = 'opera-mate';
    else if (isBackRank) patternId = 'back-rank-mate';
    else if (isBlindSwine) patternId = 'blind-swine-mate';
    else if (isSwallowsTail) patternId = 'swallows-tail-mate';
    else if (isDovetail) patternId = 'dovetail-mate';
    else if (chk?.type === 'q' && (hasHorizEpaulettes || hasVertEpaulettes)) patternId = 'epaulette-mate';
    else if (isHook) patternId = 'hook-mate';
    else if (queenSupportedByPawn) {
      patternId =
        pawnsInNet.length > 0 && (kingSq === 'g8' || kingSq === 'g1' || kingSq === 'h8' || kingSq === 'h1') &&
        (chess.get('f6')?.type === 'p' || chess.get('f3')?.type === 'p')
          ? 'lollis-mate'
          : 'damianos-mate';
    } else if (isKillBox) patternId = 'kill-box-mate';
    else if (isAnderssen) patternId = 'anderssens-mate';
    else if (isVukovic) patternId = 'vukovic-mate';
    else if (isSuffocation) patternId = 'suffocation-mate';
    else if (isCornerMate) patternId = 'corner-mate';
    else if (isMorphy) patternId = 'morphys-mate';
    else if (isPillsbury) patternId = 'pillsburys-mate';
    else if (isBalestra) patternId = 'balestra-mate';
    else if (isGreco) patternId = 'grecos-mate';
    else if (isTwoBishopsEndgame) patternId = 'two-bishops-mate';
    else if (isBishopKnightEndgame) patternId = 'bishop-knight-mate';
    else if (isKingRookBox) patternId = 'king-rook-box';
    else if (isLadderMate) patternId = 'ladder-mate';
    else if (isKissOfDeath) patternId = 'kiss-of-death';
    else patternId = 'uncharted-mate';
  }

  // Build structural geometry signature for uniqueness assessment
  const centerDistance =
    Math.abs(kingCoords.file - 3.5) + Math.abs(kingCoords.rank - 3.5);
  const netSignatureParts = Array.from(escapeAttackers.entries())
    .map(([sq, t]) => {
      const c = squareToCoords(sq);
      return `${t}(${c.file - kingCoords.file},${c.rank - kingCoords.rank})`;
    })
    .sort();
  const blockerParts = friendlyBlockers
    .map((sq) => {
      const c = squareToCoords(sq);
      const p = chess.get(sq);
      return `B_${p?.type ?? 'x'}(${c.file - kingCoords.file},${c.rank - kingCoords.rank})`;
    })
    .sort();

  const rawGeo = `K@${kingSq}|CHK:${checkers.map((c) => c.type).sort().join('+')}|NET:${netSignatureParts.join(',')}|BLK:${blockerParts.join(',')}`;
  const sigHash = hashSignature(rawGeo).toString(36).toUpperCase().slice(0, 6);
  const geometrySignature = `GEO-${sigHash}-${netSignatureParts.length}A${blockerParts.length}B`;

  const def = CHECKMATE_MAP[patternId] ?? CHECKMATE_MAP['uncharted-mate'];
  const isUncharted = patternId === 'uncharted-mate';

  // Compute deterministic uniqueness score (0..100)
  let uniquenessScore = 25;
  if (def.rarity === 'Common') uniquenessScore = 18;
  else if (def.rarity === 'Uncommon') uniquenessScore = 44;
  else if (def.rarity === 'Rare') uniquenessScore = 71;
  else if (def.rarity === 'Mythic') uniquenessScore = 94;
  else if (def.rarity === 'Uncharted') uniquenessScore = 88;

  // Center-board checkmates or dense multi-piece webs boost structural rarity!
  if (centerDistance <= 2.5) uniquenessScore += 10;
  if (escapeAttackers.size >= 4) uniquenessScore += 5;
  if (checkerCount >= 2) uniquenessScore += 5;
  if (totalPlies >= 75) uniquenessScore += 4;
  uniquenessScore = Math.min(99, Math.max(10, uniquenessScore));

  let uniquenessVerdict = '';
  if (isUncharted || uniquenessScore >= 92) {
    uniquenessVerdict =
      isUncharted
        ? `Potentially One-of-a-Kind Mate (${uniquenessScore}% novelty) — No standard textbook archetype matches this exact ${escapeAttackers.size}-piece web around ${kingSq}. Statistically unlikely to be truly the first in human history, yet remarkably original!`
        : `Mythic Collector's Mate (${uniquenessScore}% novelty) — One of the rarest checkmate events in all of competitive chess.`;
  } else if (uniquenessScore >= 68) {
    uniquenessVerdict = `Rare Tactical Gem (${uniquenessScore}% novelty) — A sharp, artistic checkmate pattern that most club players rarely land cleanly.`;
  } else if (uniquenessScore >= 40) {
    uniquenessVerdict = `Classic Craft (${uniquenessScore}% novelty) — A well-known tactical motif executed with clean geometry.`;
  } else {
    uniquenessVerdict = `Battle-Tested Staple (${uniquenessScore}% novelty) — A foundational checkmate pattern seen across millions of games.`;
  }

  return {
    patternId: def.id,
    patternName: def.name,
    aka: def.aka,
    category: def.category,
    rarity: def.rarity,
    isUncharted,
    uniquenessScore,
    uniquenessVerdict,
    geometrySignature,
    funFact: def.funFact,
    goofyQuip: def.goofyQuip,
    howItWorks: def.howItWorks,
    matedKingSquare: kingSq,
    checkingPieceSquares: checkers.map((c) => c.square),
    matingMoveSan: matingSan,
    matingPieceType: primaryPieceType,
    totalPlies,
  };
}
