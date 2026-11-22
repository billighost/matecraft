import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import {
  analyzeGameFull,
  analyzeGameProgressive,
  cpToWinProbability,
  evaluatePosition,
  inspectPositionTactics,
  parseGameSkeleton,
  positionKeyFromFen,
} from './chessEvaluator';
import { detectOpening } from './openings';

test('win probability curve is symmetric and monotonic', () => {
  assert.equal(cpToWinProbability(0), 50);
  const plus3 = cpToWinProbability(300);
  const minus3 = cpToWinProbability(-300);
  assert.ok(plus3 > 72 && plus3 < 85, `Expected +300cp around 75%, got ${plus3}`);
  assert.ok(Math.abs(plus3 + minus3 - 100) < 0.2, 'Curve should be symmetric around 50%');
  assert.equal(cpToWinProbability(100000), 100);
  assert.equal(cpToWinProbability(-100000), 0);
});

test('evaluator finds obvious mate-in-1 and extracts principal variation', () => {
  const res = evaluatePosition('6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1', 2, undefined, true);
  assert.equal(res.bestMove?.san, 'Re8#');
  assert.equal(res.winProbWhite, 100);
  assert.deepEqual(res.pvLine, ['Re8#']);
});

test('evaluator avoids repeating already-visited positions (no oscillation loop)', () => {
  const fen = '4k3/8/8/8/8/4Q3/8/4K3 w - - 0 1';
  const firstEval = evaluatePosition(fen, 2);
  assert.ok(firstEval.bestMove, 'Should find a best move');

  // Mark the position reached by firstEval.bestMove as already visited
  const nextBoard = new Chess(fen);
  nextBoard.move(firstEval.bestMove.san);
  const visited = new Set<string>([positionKeyFromFen(nextBoard.fen())]);

  const secondEval = evaluatePosition(fen, 2, visited);
  assert.ok(secondEval.bestMove, 'Should pick an alternate non-repeating move');
  assert.notEqual(
    secondEval.bestMove.san,
    firstEval.bestMove.san,
    'Engine must avoid repeating a recently visited position when winning'
  );
});

test('custom FEN PGN (e.g., Epaulette Mate Codex drill) parses cleanly via parseGameSkeleton', () => {
  const drillPgn = `[FEN "3rkr2/8/8/8/8/8/4Q3/6K1 w - - 0 1"]\n[SetUp "1"]\n\n1. Qe6# 1-0`;
  const sk = parseGameSkeleton(drillPgn);
  assert.equal(sk.moves.length, 1);
  assert.equal(sk.moves[0].san, 'Qe6#');
  assert.equal(sk.moves[0].isCheckmate, true);
  assert.equal(sk.moves[0].fenBefore, '3rkr2/8/8/8/8/8/4Q3/6K1 w - - 0 1');
});

test('progressive chunked analyzer completes asynchronously without dropping moves', async () => {
  const pgn = '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+';
  let finalPlies = 0;
  let progressTicks = 0;

  await new Promise<void>((resolve) => {
    analyzeGameProgressive(pgn, (partial, analyzed, total, isDone) => {
      progressTicks++;
      if (isDone) {
        finalPlies = partial.moves.length;
        assert.equal(analyzed, total);
        resolve();
      }
    });
  });

  assert.equal(finalPlies, 12);
  assert.ok(progressTicks >= 2, 'Should emit skeleton + chunked progress updates');
});

test('inspectPositionTactics detects material lead, captured pieces, and hanging pieces', () => {
  // White has Queen on d4 attacking undefended Black Knight on b6; Black is down a Queen
  const fen = '4k3/8/1n6/8/3Q4/8/8/4K3 w - - 0 1';
  const tactics = inspectPositionTactics(fen);
  assert.equal(tactics.materialDiffWhite, 6); // Q(9) - N(3) = +6
  assert.ok(tactics.hangingSquares.includes('b6'), 'Undefended Black Knight on b6 should be flagged as hanging');
  assert.ok(tactics.capturedByWhite.includes('q'), 'Missing Black Queen should appear in capturedByWhite');
});

test('full game review computes accuracy, move classifications, and detects blunders', () => {
  const review = analyzeGameFull('1. f3 e5 2. g4 Qh4#');
  assert.equal(review.moves.length, 4);
  assert.equal(review.moves[3].isCheckmate, true);
  assert.equal(review.moves[3].winProbWhite, 0);
  assert.equal(review.moves[2].classification, 'Blunder');
  assert.ok(review.blackAccuracy > review.whiteAccuracy);
});

test('opening book detects Italian Game and provides suggestions', () => {
  const match = detectOpening(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4']);
  assert.equal(match.eco, 'C50');
  assert.equal(match.name, 'Italian Game');
  assert.ok(match.suggestions.length >= 2);
  assert.ok(match.suggestions.some((s) => s.san === 'Bc5'));
});
