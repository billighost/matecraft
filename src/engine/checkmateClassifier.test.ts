import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyCheckmate, formatFullGameTimestamp } from './checkmateClassifier';
import { buildSampleGames } from '../data/sampleGames';

test('classifies Fool’s Mate accurately', () => {
  const res = classifyCheckmate({ pgn: '1. f3 e5 2. g4 Qh4#' });
  assert.ok(res);
  assert.equal(res.patternId, 'fools-mate');
  assert.equal(res.matedKingSquare, 'e1');
  assert.ok(res.funFact.length > 10);
  assert.ok(res.goofyQuip.length > 10);
});

test('classifies Scholar’s Mate accurately', () => {
  const res = classifyCheckmate({ pgn: '1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7#' });
  assert.ok(res);
  assert.equal(res.patternId, 'scholars-mate');
});

test('classifies Smothered Mate accurately', () => {
  const res = classifyCheckmate({
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nd4 4. Nxe5 Qg5 5. Nxf7 Qxg2 6. Rf1 Qxe4+ 7. Be2 Nf3#',
  });
  assert.ok(res);
  assert.equal(res.patternId, 'smothered-mate');
  assert.equal(res.matingPieceType, 'n');
});

test('classifies Opera Mate accurately (Paul Morphy 1858)', () => {
  const res = classifyCheckmate({
    pgn: '1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8#',
  });
  assert.ok(res);
  assert.equal(res.patternId, 'opera-mate');
});

test('classifies Légal’s Mate accurately', () => {
  const res = classifyCheckmate({
    pgn: '1. e4 e5 2. Nf3 d6 3. Bc4 Bg4 4. Nc3 g6 5. Nxe5 Bxd1 6. Bxf7+ Ke7 7. Nd5#',
  });
  assert.ok(res);
  assert.equal(res.patternId, 'legals-mate');
});

test('classifies Back-Rank Mate accurately', () => {
  const res = classifyCheckmate({
    fen: '4R1k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1',
  });
  assert.ok(res);
  assert.equal(res.patternId, 'back-rank-mate');
});

test('classifies Arabian Mate accurately', () => {
  const res = classifyCheckmate({
    fen: '7k/7R/5N2/8/8/8/8/6K1 b - - 0 1',
  });
  assert.ok(res);
  assert.equal(res.patternId, 'arabian-mate');
});

test('classifies Epaulette Mate accurately', () => {
  const res = classifyCheckmate({
    fen: '3rkr2/8/4Q3/8/8/8/8/6K1 b - - 0 1',
  });
  assert.ok(res);
  assert.equal(res.patternId, 'epaulette-mate');
});

test('classifies Swallow’s Tail Mate accurately', () => {
  const res = classifyCheckmate({
    fen: '3r1r2/4k3/4Q3/3P4/8/8/8/6K1 b - - 0 1',
  });
  assert.ok(res);
  assert.equal(res.patternId, 'swallows-tail-mate');
});

test('classifies David & Goliath Pawn Mate accurately', () => {
  const res = classifyCheckmate({
    fen: '6bk/6Pp/5P2/8/8/8/8/6K1 b - - 0 1',
  });
  assert.ok(res);
  assert.equal(res.patternId, 'david-goliath-mate');
});

test('returns null on non-checkmate position', () => {
  const res = classifyCheckmate({
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
  });
  assert.equal(res, null);
});

test('formats full Unix timestamp cleanly with date and exact time', () => {
  const formatted = formatFullGameTimestamp(1794942135);
  assert.match(formatted, /2026/);
  assert.match(formatted, /\d{2}:\d{2}:\d{2} UTC/);
});

test('all curated sample games are legal PGNs ending in checkmate', () => {
  const samples = buildSampleGames();
  assert.ok(samples.length >= 10, 'Expected at least 10 sample games');
  for (const g of samples) {
    assert.equal(g.endedByCheckmate, true, `Sample game ${g.id} did not end in checkmate!`);
    assert.ok(g.checkmate !== null, `Sample game ${g.id} missing checkmate classification`);
    assert.ok(g.fullTimestamp.includes('UTC'), `Sample game ${g.id} missing full timestamp`);
  }
});
