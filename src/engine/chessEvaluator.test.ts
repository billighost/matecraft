import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeGameFull, cpToWinProbability, evaluatePosition } from './chessEvaluator';
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

test('evaluator finds obvious mate-in-1', () => {
  // White Rook on e1 can play Re8#
  const res = evaluatePosition('6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1', 2);
  assert.equal(res.bestMove?.san, 'Re8#');
  assert.equal(res.winProbWhite, 100);
});

test('full game review computes accuracy, move classifications, and detects blunders', () => {
  const review = analyzeGameFull('1. f3 e5 2. g4 Qh4#');
  assert.equal(review.moves.length, 4);
  assert.equal(review.moves[3].isCheckmate, true);
  assert.equal(review.moves[3].winProbWhite, 0);
  // White's 2. g4 allows instant mate-in-1 => should be a Blunder
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
