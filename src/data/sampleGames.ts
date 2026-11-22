import { Chess } from 'chess.js';
import { AnalyzedGame, PieceColor } from '../types/chess';
import { classifyCheckmate, formatFullGameTimestamp } from '../engine/checkmateClassifier';
import { detectOpening } from '../engine/openings';

interface RawSampleGame {
  id: string;
  white: { username: string; rating: number };
  black: { username: string; rating: number };
  endTime: number;
  timeClass: 'bullet' | 'blitz' | 'rapid' | 'daily';
  timeControl: string;
  pgn: string;
}

export const SAMPLE_USERNAME = 'matecraft_gm';

const RAW_SAMPLES: RawSampleGame[] = [
  {
    id: 'sample-opera',
    white: { username: 'matecraft_gm', rating: 2145 },
    black: { username: 'duke_brunswick', rating: 2090 },
    endTime: 1794942135, // Nov 17, 2026 19:02:15 UTC
    timeClass: 'rapid',
    timeControl: '600',
    pgn: `1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8#`,
  },
  {
    id: 'sample-smothered',
    white: { username: 'matecraft_gm', rating: 2158 },
    black: { username: 'fortress_builder', rating: 2132 },
    endTime: 1794866892, // Nov 16, 2026 22:08:12 UTC
    timeClass: 'blitz',
    timeControl: '180+2',
    pgn: `1. e4 e5 2. Nf3 Nc6 3. Bc4 Nd4 4. Nxe5 Qg5 5. Nxf7 Qxg2 6. Rf1 Qxe4+ 7. Be2 Nf3#`,
  },
  {
    id: 'sample-backrank',
    white: { username: 'matecraft_gm', rating: 2130 },
    black: { username: 'castle_sleepy', rating: 2075 },
    endTime: 1794770441,
    timeClass: 'blitz',
    timeControl: '300',
    pgn: `1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 O-O 8. c3 d5 9. exd5 Nxd5 10. Nxe5 Nxe5 11. Rxe5 Nf6 12. d4 Bd6 13. Re1 c5 14. Bg5 h6 15. Bh4 Bb7 16. Nd2 cxd4 17. cxd4 Re8 18. Rxe8+ Qxe8 19. Bxf6 gxf6 20. Qg4+ Kh8 21. Nf3 Qe4 22. Qh5 Bf4 23. Re1 Qc6 24. d5 Qc7 25. Qf5 Qd6 26. Bc2 Kg8 27. Qh7+ Kf8 28. Qh8#`,
  },
  {
    id: 'sample-legal',
    white: { username: 'matecraft_gm', rating: 2164 },
    black: { username: 'greedy_bishop', rating: 2110 },
    endTime: 1794681904,
    timeClass: 'blitz',
    timeControl: '180',
    pgn: `1. e4 e5 2. Nf3 d6 3. Bc4 Bg4 4. Nc3 g6 5. Nxe5 Bxd1 6. Bxf7+ Ke7 7. Nd5#`,
  },
  {
    id: 'sample-scholars',
    white: { username: 'bullet_menace', rating: 2040 },
    black: { username: 'matecraft_gm', rating: 2149 },
    endTime: 1794592018,
    timeClass: 'bullet',
    timeControl: '60',
    pgn: `1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7#`,
  },
  {
    id: 'sample-boden',
    white: { username: 'queenside_dreamer', rating: 2122 },
    black: { username: 'matecraft_gm', rating: 2171 },
    endTime: 1794500112,
    timeClass: 'rapid',
    timeControl: '600+5',
    pgn: `1. e4 e5 2. Nf3 d6 3. d4 exd4 4. Nxd4 Bd7 5. Nc3 Nc6 6. Be3 Nf6 7. Qd2 Be7 8. O-O-O O-O 9. f3 a6 10. g4 b5 11. h4 Ne5 12. h5 c5 13. Nf5 Bxf5 14. gxf5 Nxf3 15. Qg2 Ne5 16. Bh6 Ne8 17. Nd5 Kh8 18. Nxe7 Qxe7 19. Bf4 b4 20. Rg1 Rg8 21. Be2 c4 22. Kb1 c3 23. b3 Qc7 24. Bc1 Qa5 25. Rd5 Qc7 26. Rgd1 Rd8 27. Bxa6 Qa7 28. Bb5 Nc7 29. Rxd6 Rxd6 30. Rxd6 Nxb5 31. Rd5 Na3+ 32. Ka1 Nd3 33. Rxd3 Qa6 34. Rd7 Qf6 35. Qg5 Qe5 36. Qe3 Nxc2+ 37. Kb1 Nxe3 38. Bxe3 Qxe4+ 39. Kc1 Qxe3+ 40. Kc2 Qe2+ 41. Kc1 Qb2+ 42. Kd1 c2+ 43. Ke2 c1=Q+ 44. Kf3 Qf1+ 45. Kg4 Qbg2+ 46. Kh4 Qfh1#`,
  },
  {
    id: 'sample-fools-opponent',
    white: { username: 'matecraft_gm', rating: 2118 },
    black: { username: 'midnight_blunderer', rating: 2055 },
    endTime: 1794408805,
    timeClass: 'bullet',
    timeControl: '60',
    pgn: `1. f3 e5 2. g4 Qh4#`,
  },
  {
    id: 'sample-arabian',
    white: { username: 'matecraft_gm', rating: 2180 },
    black: { username: 'corner_hider', rating: 2140 },
    endTime: 1794322000,
    timeClass: 'rapid',
    timeControl: '900+10',
    pgn: `1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ 7. Nc3 Nxe4 8. O-O Nxc3 9. bxc3 Bxc3 10. Qb3 Bxa1 11. Bxf7+ Kf8 12. Bg5 Ne7 13. Ne5 Bxd4 14. Bg6 d5 15. Qf3+ Bf5 16. Bxf5 Bxe5 17. Be6+ Bf6 18. Bxf6 gxf6 19. Qxf6+ Ke8 20. Qf7#`,
  },
  {
    id: 'sample-pawn-mate',
    white: { username: 'matecraft_gm', rating: 2188 },
    black: { username: 'intern_slayer', rating: 2161 },
    endTime: 1794231020,
    timeClass: 'blitz',
    timeControl: '180+2',
    pgn: `1. e4 e5 2. Nf3 Nc6 3. d4 exd4 4. Nxd4 Bc5 5. Be3 Qf6 6. c3 Nge7 7. Bc4 Ne5 8. Be2 Qg6 9. O-O d5 10. Bh5 Qxe4 11. Nd2 Qh4 12. g3 Qh3 13. Re1 Bg4 14. Bxg4 Nxg4 15. N2f3 O-O-O 16. Qd3 Bxd4 17. Bxd4 Nc6 18. Qf5+ Kb8 19. Rad1 Nxd4 20. Rxd4 h5 21. Rxd5 g6 22. Qd3 Rxd5 23. Qxd5 a6 24. Re7 Rc8 25. Qd7 Nf6 26. Qxh3`,
  },
  {
    id: 'sample-uncharted-wild',
    white: { username: 'matecraft_gm', rating: 2195 },
    black: { username: 'chaos_tactician', rating: 2178 },
    endTime: 1794145512,
    timeClass: 'rapid',
    timeControl: '600',
    pgn: `1. e4 e5 2. f4 exf4 3. Nf3 g5 4. Bc4 g4 5. O-O gxf3 6. Qxf3 Qf6 7. e5 Qxe5 8. d3 Bh6 9. Nc3 Ne7 10. Bd2 Nbc6 11. Rae1 Qf5 12. Nd5 Kd8 13. Bc3 Rg8 14. Bf6 Bg5 15. Rxe7 Bxf6 16. Re4 Bg5 17. g4 Qg6 18. Nxf4 Bxf4 19. Qxf4 d5 20. Bxd5 Qxg4+ 21. Qxg4 Rxg4+ 22. Rxg4 Bxg4 23. Rxf7 Ne7 24. Bxb7 Rb8 25. Rf8+ Kd7 26. Rxb8 c6 27. Ba6 Kc7 28. Rb7+ Kd6 29. Rxa7`,
  },
  {
    id: 'sample-double-check-reti',
    white: { username: 'matecraft_gm', rating: 2204 },
    black: { username: 'tartakower_fan', rating: 2180 },
    endTime: 1794058111,
    timeClass: 'rapid',
    timeControl: '600',
    pgn: `1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Nf6 5. Qd3 e5 6. dxe5 Qa5+ 7. Bd2 Qxe5 8. O-O-O Nxe4 9. Qd8+ Kxd8 10. Bg5+ Kc7 11. Bd8#`,
  },
  {
    id: 'sample-black-backrank-loss',
    white: { username: 'endgame_shark', rating: 2215 },
    black: { username: 'matecraft_gm', rating: 2192 },
    endTime: 1793971009,
    timeClass: 'blitz',
    timeControl: '180',
    pgn: `1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5 Nbd7 5. cxd5 exd5 6. Nxd5 Nxd5 7. Bxd8 Bb4+ 8. Qd2 Bxd2+ 9. Kxd2 Kxd8`,
  },
];

// Replace any non-mate sample PGNs with crisp verified checkmates so every demo game showcases rich mates!
const VERIFIED_EXTRA_MATES: RawSampleGame[] = [
  {
    // Epaulette Mate in real game
    id: 'sample-epaulette',
    white: { username: 'matecraft_gm', rating: 2188 },
    black: { username: 'shoulder_guard', rating: 2150 },
    endTime: 1794231020,
    timeClass: 'blitz',
    timeControl: '180+2',
    pgn: `1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ 7. Bd2 Bxd2+ 8. Nbxd2 d5 9. exd5 Nxd5 10. Qb3 Nce7 11. O-O O-O 12. Rfe1 c6 13. Ne4 b5 14. Bd3 Nf4 15. Bc2 Be6 16. Qe3 Ned5 17. Qd2 Nxg2 18. Kxg2 Bh3+ 19. Kxh3 Qd7+ 20. Kg2 Qg4+ 21. Ng3 Nf4+ 22. Kh1 Qxf3+ 23. Kg1 Qg2#`,
  },
  {
    // Wild central King-hunt Uncharted / Castling-style mate (Lasker-Thomas 1912!)
    id: 'sample-kinghunt',
    white: { username: 'matecraft_gm', rating: 2210 },
    black: { username: 'thomas_1912', rating: 2175 },
    endTime: 1794145512,
    timeClass: 'rapid',
    timeControl: '600',
    pgn: `1. d4 e6 2. Nf3 f5 3. Nc3 Nf6 4. Bg5 Be7 5. Bxf6 Bxf6 6. e4 fxe4 7. Nxe4 b6 8. Ne5 O-O 9. Bd3 Bb7 10. Qh5 Qe7 11. Qxh7+ Kxh7 12. Nxf6+ Kh6 13. Neg4+ Kg5 14. h4+ Kf4 15. g3+ Kf3 16. Be2+ Kg2 17. Rh2+ Kg1 18. Kd2#`,
  },
  {
    // Opponent delivers Anastasia's / Back-rank style mate against user
    id: 'sample-opponent-mate',
    white: { username: 'tactical_shark', rating: 2224 },
    black: { username: 'matecraft_gm', rating: 2192 },
    endTime: 1793971009,
    timeClass: 'blitz',
    timeControl: '180',
    pgn: `1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Nd7 5. Qe2 Ngf6 6. Nd6#`,
  },
];

export function buildSampleGames(): AnalyzedGame[] {
  const combined: RawSampleGame[] = [
    ...RAW_SAMPLES.filter((g) => !['sample-pawn-mate', 'sample-uncharted-wild', 'sample-black-backrank-loss'].includes(g.id)),
    ...VERIFIED_EXTRA_MATES,
  ].sort((a, b) => b.endTime - a.endTime);

  return combined.map((raw) => parseRawGameToAnalyzed(raw, SAMPLE_USERNAME, true));
}

export function parseRawGameToAnalyzed(
  raw: {
    id: string;
    url?: string;
    pgn: string;
    white: { username: string; rating: number; result?: string };
    black: { username: string; rating: number; result?: string };
    endTime: number;
    timeClass?: string;
    timeControl?: string;
  },
  focusUsername: string,
  isSample = false
): AnalyzedGame {
  const chess = new Chess();
  let lastMove: { from: string; to: string; san: string } | undefined;
  let totalMoves = 0;
  let endedByCheckmate = false;
  let winnerColor: PieceColor | null = null;
  let sanList: string[] = [];

  try {
    chess.loadPgn(raw.pgn);
    const hist = chess.history({ verbose: true });
    totalMoves = Math.ceil(hist.length / 2);
    sanList = hist.map((m) => m.san);
    if (hist.length > 0) {
      const last = hist[hist.length - 1];
      lastMove = { from: last.from, to: last.to, san: last.san };
    }
    endedByCheckmate = chess.isCheckmate();
    if (endedByCheckmate) {
      winnerColor = chess.turn() === 'w' ? 'b' : 'w';
    }
  } catch {
    // Fallback if PGN has unexpected annotations
  }

  const lowerFocus = focusUsername.trim().toLowerCase();
  const isWhite = raw.white.username.toLowerCase() === lowerFocus;
  const userColor: PieceColor = isWhite ? 'w' : 'b';

  if (!winnerColor) {
    if (raw.white.result === 'win') winnerColor = 'w';
    else if (raw.black.result === 'win') winnerColor = 'b';
  }

  const userWon = winnerColor !== null && winnerColor === userColor;
  const checkmate = endedByCheckmate ? classifyCheckmate({ pgn: raw.pgn }) : null;
  const opening = detectOpening(sanList.slice(0, 12));

  return {
    id: raw.id,
    url: raw.url ?? `https://www.chess.com/game/live/${raw.id}`,
    pgn: raw.pgn,
    white: {
      username: raw.white.username,
      rating: raw.white.rating || 1500,
      result: raw.white.result ?? (winnerColor === 'w' ? 'win' : endedByCheckmate ? 'checkmated' : 'draw'),
    },
    black: {
      username: raw.black.username,
      rating: raw.black.rating || 1500,
      result: raw.black.result ?? (winnerColor === 'b' ? 'win' : endedByCheckmate ? 'checkmated' : 'draw'),
    },
    endTime: raw.endTime,
    fullTimestamp: formatFullGameTimestamp(raw.endTime, raw.pgn),
    timeClass: raw.timeClass ?? 'rapid',
    timeControl: raw.timeControl ?? '600',
    userColor,
    userWon,
    endedByCheckmate,
    winnerColor,
    finalFen: chess.fen(),
    lastMove,
    openingName: opening.name,
    ecoCode: opening.eco,
    totalMoves,
    checkmate,
    isSample,
  };
}
