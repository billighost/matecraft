import { OpeningMatch, OpeningSuggestion } from '../types/chess';

interface OpeningEntry {
  moves: string[];
  eco: string;
  name: string;
  plan: string;
  suggestions: OpeningSuggestion[];
}

export const OPENING_BOOK: OpeningEntry[] = [
  {
    moves: [],
    eco: 'A00',
    name: 'Starting Position',
    plan: 'Claim the center immediately with e4 or d4, develop Knights before Bishops, and castle early for King safety.',
    suggestions: [
      { san: 'e4', nextOpeningName: "King's Pawn Opening", whiteWinPct: 38, drawPct: 31, blackWinPct: 31, note: 'Sharp, open games with fast piece activity.' },
      { san: 'd4', nextOpeningName: "Queen's Pawn Opening", whiteWinPct: 39, drawPct: 34, blackWinPct: 27, note: 'Solid central control and strategic maneuvering.' },
      { san: 'Nf3', nextOpeningName: 'Réti Opening', whiteWinPct: 37, drawPct: 36, blackWinPct: 27, note: 'Flexible hypermodern development.' },
      { san: 'c4', nextOpeningName: 'English Opening', whiteWinPct: 38, drawPct: 34, blackWinPct: 28, note: 'Flank control aiming at the d5 square.' },
    ],
  },
  {
    moves: ['e4'],
    eco: 'B00',
    name: "King's Pawn Game",
    plan: 'White opens lines for the Queen and light-squared Bishop. Black chooses between symmetrical control (e5), asymmetrical counterattack (c5), or sturdy counter-structure (e6/c6).',
    suggestions: [
      { san: 'e5', nextOpeningName: 'Open Game', whiteWinPct: 36, drawPct: 33, blackWinPct: 31, note: 'Classical central fight.' },
      { san: 'c5', nextOpeningName: 'Sicilian Defense', whiteWinPct: 35, drawPct: 31, blackWinPct: 34, note: 'Sharpest winning try for Black.' },
      { san: 'e6', nextOpeningName: 'French Defense', whiteWinPct: 38, drawPct: 32, blackWinPct: 30, note: 'Solid pawn chain preparing ...d5.' },
      { san: 'c6', nextOpeningName: 'Caro-Kann Defense', whiteWinPct: 36, drawPct: 34, blackWinPct: 30, note: 'Rock-solid structure with endgame resilience.' },
    ],
  },
  {
    moves: ['e4', 'e5'],
    eco: 'C20',
    name: "King's Pawn Open Game",
    plan: 'Rapid development toward f7 and central squares. Avoid premature Queen raids unless the opponent ignores development.',
    suggestions: [
      { san: 'Nf3', nextOpeningName: "King's Knight Opening", whiteWinPct: 38, drawPct: 33, blackWinPct: 29, note: 'Develops with tempo attacking e5.' },
      { san: 'Bc4', nextOpeningName: "Bishop's Opening", whiteWinPct: 37, drawPct: 32, blackWinPct: 31, note: 'Targets f7 while keeping f4 flexible.' },
      { san: 'Nc3', nextOpeningName: 'Vienna Game', whiteWinPct: 38, drawPct: 31, blackWinPct: 31, note: 'Flexible prep for f4 or Bc4.' },
      { san: 'f4', nextOpeningName: "King's Gambit", whiteWinPct: 37, drawPct: 25, blackWinPct: 38, note: 'Romantic pawn sacrifice for ferocious initiative.' },
    ],
  },
  {
    moves: ['e4', 'e5', 'Nf3'],
    eco: 'C40',
    name: "King's Knight Opening",
    plan: 'White attacks e5 immediately. Black usually defends with Nc6, counterattacks with Nf6 (Petrov), or plays solid d6 (Philidor).',
    suggestions: [
      { san: 'Nc6', nextOpeningName: 'Classical Defense', whiteWinPct: 37, drawPct: 34, blackWinPct: 29, note: 'Most natural developing defense.' },
      { san: 'Nf6', nextOpeningName: "Petrov's Defense", whiteWinPct: 33, drawPct: 42, blackWinPct: 25, note: 'Symmetrical counterattack on e4.' },
      { san: 'd6', nextOpeningName: 'Philidor Defense', whiteWinPct: 41, drawPct: 31, blackWinPct: 28, note: 'Solid but slightly passive central hold.' },
    ],
  },
  {
    moves: ['e4', 'e5', 'Nf3', 'Nc6'],
    eco: 'C44',
    name: "King's Knight — Classical",
    plan: 'Both sides contest d4 and d5. White chooses between Spanish pressure (Bb5), Italian pressure on f7 (Bc4), or immediate central break (d4).',
    suggestions: [
      { san: 'Bb5', nextOpeningName: 'Ruy Lopez (Spanish)', whiteWinPct: 37, drawPct: 36, blackWinPct: 27, note: 'Grandmaster staple exerting long-term pressure.' },
      { san: 'Bc4', nextOpeningName: 'Italian Game', whiteWinPct: 37, drawPct: 33, blackWinPct: 30, note: 'Direct aim at f7 and smooth castling.' },
      { san: 'd4', nextOpeningName: 'Scotch Game', whiteWinPct: 38, drawPct: 33, blackWinPct: 29, note: 'Opens the center right away.' },
      { san: 'Nc3', nextOpeningName: 'Three Knights / Four Knights', whiteWinPct: 35, drawPct: 38, blackWinPct: 27, note: 'Classical symmetrical development.' },
    ],
  },
  {
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'],
    eco: 'C50',
    name: 'Italian Game',
    plan: 'Eye the f7 weakness and prepare c3 + d4 to build a broad central pawn duo.',
    suggestions: [
      { san: 'Bc5', nextOpeningName: 'Giuoco Piano', whiteWinPct: 37, drawPct: 34, blackWinPct: 29, note: 'Balanced, rich middlegame play.' },
      { san: 'Nf6', nextOpeningName: 'Two Knights Defense', whiteWinPct: 38, drawPct: 31, blackWinPct: 31, note: 'Invites tactical fireworks like Ng5 or d4.' },
      { san: 'Be7', nextOpeningName: 'Hungarian Defense', whiteWinPct: 40, drawPct: 34, blackWinPct: 26, note: 'Ultra-solid defensive setup.' },
    ],
  },
  {
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'],
    eco: 'C50',
    name: 'Italian Game: Giuoco Piano',
    plan: 'White builds with c3 and d3/d4 or gambits with b4 (Evans Gambit). Black seeks timely ...d5 counterplay.',
    suggestions: [
      { san: 'c3', nextOpeningName: 'Giuoco Piano Main Line', whiteWinPct: 38, drawPct: 34, blackWinPct: 28, note: 'Prepares a strong d4 central advance.' },
      { san: 'b4', nextOpeningName: 'Evans Gambit', whiteWinPct: 41, drawPct: 24, blackWinPct: 35, note: 'Sacrifices a wing pawn for blazing development.' },
      { san: 'd3', nextOpeningName: 'Giuoco Pianissimo', whiteWinPct: 37, drawPct: 35, blackWinPct: 28, note: 'Quiet maneuvering game favored by top GMs.' },
    ],
  },
  {
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6'],
    eco: 'C55',
    name: 'Two Knights Defense',
    plan: 'Black counterattacks e4 immediately. White can launch the sharp Ng5 Fried Liver attack or play positional d3/d4.',
    suggestions: [
      { san: 'Ng5', nextOpeningName: 'Knight Attack (Fried Liver)', whiteWinPct: 40, drawPct: 27, blackWinPct: 33, note: 'Immediate tactical assault on f7.' },
      { san: 'd3', nextOpeningName: 'Modern Italian', whiteWinPct: 37, drawPct: 35, blackWinPct: 28, note: 'Solid development avoiding sharp gambits.' },
      { san: 'd4', nextOpeningName: 'Scotch / Max Lange Attack', whiteWinPct: 39, drawPct: 30, blackWinPct: 31, note: 'Explosive central opening.' },
    ],
  },
  {
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'],
    eco: 'C60',
    name: 'Ruy Lopez (Spanish Opening)',
    plan: 'Pressurize the defender of e5, castle quickly, and build c3 + d4 while maneuvering the b1-Knight via d2-f1-g3.',
    suggestions: [
      { san: 'a6', nextOpeningName: 'Morphy Defense', whiteWinPct: 36, drawPct: 37, blackWinPct: 27, note: 'Asks the Bishop the question immediately.' },
      { san: 'Nf6', nextOpeningName: 'Berlin Defense', whiteWinPct: 32, drawPct: 44, blackWinPct: 24, note: 'The endgame wall favored in World Championships.' },
      { san: 'Bc5', nextOpeningName: 'Classical Defense', whiteWinPct: 39, drawPct: 33, blackWinPct: 28, note: 'Active Bishop development.' },
    ],
  },
  {
    moves: ['e4', 'e5', 'Nf3', 'd6'],
    eco: 'C41',
    name: 'Philidor Defense',
    plan: 'White grabs central space with d4. Black must carefully untangle the f8-Bishop without falling behind in development.',
    suggestions: [
      { san: 'd4', nextOpeningName: 'Philidor Main Line', whiteWinPct: 42, drawPct: 31, blackWinPct: 27, note: 'Seizes central space and open lines.' },
      { san: 'Bc4', nextOpeningName: 'Philidor — Bishop Attack', whiteWinPct: 40, drawPct: 31, blackWinPct: 29, note: 'Fast pressure against f7.' },
    ],
  },
  {
    moves: ['e4', 'e5', 'Nf3', 'd6', 'd4', 'Bg4'],
    eco: 'C41',
    name: 'Philidor Defense: Opera Game Variation',
    plan: 'Black pins the Knight early, risking a serious development lag if White trades on e5 and targets b7 and f7.',
    suggestions: [
      { san: 'dxe5', nextOpeningName: 'Morphy Opera Line', whiteWinPct: 52, drawPct: 26, blackWinPct: 22, note: 'Forces Black to concede the Bishop pair or a pawn.' },
    ],
  },
  {
    moves: ['e4', 'e5', 'Qh5'],
    eco: 'C20',
    name: 'Wayward Queen Attack',
    plan: 'White threatens e5 and f7 prematurely. Black should calmly defend e5 with Nc6 and chase the Queen with tempo (...g6, ...Nf6).',
    suggestions: [
      { san: 'Nc6', nextOpeningName: 'Accurate Defense vs Wayward Queen', whiteWinPct: 30, drawPct: 26, blackWinPct: 44, note: 'Defends e5 cleanly—never play g6 before defending e5!' },
    ],
  },
  {
    moves: ['e4', 'e5', 'Bc4'],
    eco: 'C23',
    name: "Bishop's Opening",
    plan: 'Targets f7 immediately while keeping f4 open. Solid, flexible, and rich in traps.',
    suggestions: [
      { san: 'Nf6', nextOpeningName: 'Berlin Defense to Bishop Opening', whiteWinPct: 36, drawPct: 34, blackWinPct: 30, note: 'Counterattacks e4 with tempo.' },
      { san: 'Bc5', nextOpeningName: 'Classical Bishop Opening', whiteWinPct: 37, drawPct: 33, blackWinPct: 30, note: 'Matches piece activity.' },
    ],
  },
  {
    moves: ['e4', 'c5'],
    eco: 'B20',
    name: 'Sicilian Defense',
    plan: 'Black creates an asymmetrical battle, trading a flank c-pawn for White’s central d-pawn and fighting on the c-file.',
    suggestions: [
      { san: 'Nf3', nextOpeningName: 'Open Sicilian Prep', whiteWinPct: 37, drawPct: 31, blackWinPct: 32, note: 'Prepares d4 for dynamic piece play.' },
      { san: 'Nc3', nextOpeningName: 'Closed Sicilian', whiteWinPct: 36, drawPct: 32, blackWinPct: 32, note: 'Builds a slow Kingside pawn storm.' },
      { san: 'c3', nextOpeningName: 'Alapin Sicilian', whiteWinPct: 37, drawPct: 33, blackWinPct: 30, note: 'Clean anti-Sicilian aiming for d4.' },
    ],
  },
  {
    moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3'],
    eco: 'B56',
    name: 'Open Sicilian',
    plan: 'Classic race: White attacks on the Kingside while Black generates ferocious Queenside counterplay along the c-file.',
    suggestions: [
      { san: 'a6', nextOpeningName: 'Sicilian Najdorf', whiteWinPct: 36, drawPct: 33, blackWinPct: 31, note: 'The Cadillac of chess openings.' },
      { san: 'g6', nextOpeningName: 'Sicilian Dragon', whiteWinPct: 39, drawPct: 26, blackWinPct: 35, note: 'Razor-sharp opposite-side castling battles.' },
      { san: 'Nc6', nextOpeningName: 'Classical Sicilian', whiteWinPct: 37, drawPct: 32, blackWinPct: 31, note: 'Direct central piece development.' },
    ],
  },
  {
    moves: ['e4', 'e6'],
    eco: 'C00',
    name: 'French Defense',
    plan: 'Black prepares ...d5 to challenge e4, accepting a temporarily hemmed-in c8-Bishop in exchange for a resilient pawn chain.',
    suggestions: [
      { san: 'd4', nextOpeningName: 'French Main Line', whiteWinPct: 38, drawPct: 32, blackWinPct: 30, note: 'Claims full central space.' },
      { san: 'd3', nextOpeningName: "King's Indian Attack vs French", whiteWinPct: 36, drawPct: 33, blackWinPct: 31, note: 'Flexible Kingside buildup.' },
    ],
  },
  {
    moves: ['e4', 'e6', 'd4', 'd5'],
    eco: 'C01',
    name: 'French Defense: Main Tabiya',
    plan: 'White decides the central tension: advance with e5, defend with Nc3/Nd2, or liquidate with exd5.',
    suggestions: [
      { san: 'Nc3', nextOpeningName: 'Classical / Winawer French', whiteWinPct: 38, drawPct: 32, blackWinPct: 30, note: 'Sharpest try for an advantage.' },
      { san: 'Nd2', nextOpeningName: 'Tarrasch Variation', whiteWinPct: 37, drawPct: 35, blackWinPct: 28, note: 'Avoids the Bb4 pin.' },
      { san: 'e5', nextOpeningName: 'Advance Variation', whiteWinPct: 37, drawPct: 31, blackWinPct: 32, note: 'Grabs space; Black attacks the d4 base with ...c5.' },
    ],
  },
  {
    moves: ['e4', 'c6'],
    eco: 'B10',
    name: 'Caro-Kann Defense',
    plan: 'Black prepares ...d5 while keeping the c8-Bishop free to develop outside the pawn chain.',
    suggestions: [
      { san: 'd4', nextOpeningName: 'Caro-Kann Main Line', whiteWinPct: 37, drawPct: 34, blackWinPct: 29, note: 'Establishes a full center.' },
      { san: 'Nc3', nextOpeningName: 'Two Knights Caro-Kann', whiteWinPct: 37, drawPct: 33, blackWinPct: 30, note: 'Keeps tactical options open.' },
    ],
  },
  {
    moves: ['e4', 'c6', 'd4', 'd5'],
    eco: 'B12',
    name: 'Caro-Kann Defense: Main Line',
    plan: 'Black challenges e4 solidly. White pushes e5 for space, defends with Nc3, or trades on d5.',
    suggestions: [
      { san: 'Nc3', nextOpeningName: 'Classical / Modern Caro-Kann', whiteWinPct: 37, drawPct: 34, blackWinPct: 29, note: 'Invites ...dxe4 Nxe4.' },
      { san: 'e5', nextOpeningName: 'Advance Caro-Kann', whiteWinPct: 38, drawPct: 32, blackWinPct: 30, note: 'Space advantage with ...Bf5 or ...c5.' },
      { san: 'exd5', nextOpeningName: 'Exchange Caro-Kann', whiteWinPct: 36, drawPct: 37, blackWinPct: 27, note: 'Clean Carlsbad structure.' },
    ],
  },
  {
    moves: ['d4'],
    eco: 'A40',
    name: "Queen's Pawn Game",
    plan: 'White stakes a protected central pawn immediately, leading toward Queen’s Gambit, London System, or Indian defenses.',
    suggestions: [
      { san: 'd5', nextOpeningName: 'Closed Game', whiteWinPct: 38, drawPct: 35, blackWinPct: 27, note: 'Direct central equality.' },
      { san: 'Nf6', nextOpeningName: 'Indian Defense', whiteWinPct: 37, drawPct: 34, blackWinPct: 29, note: 'Flexible control over e4.' },
      { san: 'f5', nextOpeningName: 'Dutch Defense', whiteWinPct: 40, drawPct: 29, blackWinPct: 31, note: 'Ambitious Kingside attack.' },
    ],
  },
  {
    moves: ['d4', 'd5'],
    eco: 'D00',
    name: 'Closed Game',
    plan: 'White usually undermines d5 with c4 (Queen’s Gambit) or builds the resilient London System (Bf4).',
    suggestions: [
      { san: 'c4', nextOpeningName: "Queen's Gambit", whiteWinPct: 39, drawPct: 35, blackWinPct: 26, note: 'Classic flank strike at the center.' },
      { san: 'Bf4', nextOpeningName: 'London System', whiteWinPct: 37, drawPct: 34, blackWinPct: 29, note: 'Reliable pyramid setup with low theory.' },
      { san: 'Nf3', nextOpeningName: 'Zukertort / Colle System', whiteWinPct: 37, drawPct: 35, blackWinPct: 28, note: 'Flexible piece development.' },
    ],
  },
  {
    moves: ['d4', 'd5', 'c4'],
    eco: 'D06',
    name: "Queen's Gambit",
    plan: 'White offers the c4 pawn to deflect Black’s central d5 pawn and dominate the center with e4.',
    suggestions: [
      { san: 'e6', nextOpeningName: "Queen's Gambit Declined", whiteWinPct: 38, drawPct: 37, blackWinPct: 25, note: 'Rock-solid classical defense.' },
      { san: 'c6', nextOpeningName: 'Slav Defense', whiteWinPct: 37, drawPct: 36, blackWinPct: 27, note: 'Supports d5 while keeping c8-Bishop active.' },
      { san: 'dxc4', nextOpeningName: "Queen's Gambit Accepted", whiteWinPct: 38, drawPct: 35, blackWinPct: 27, note: 'Releases central tension for active piece play.' },
    ],
  },
  {
    moves: ['d4', 'Nf6', 'c4', 'g6'],
    eco: 'E60',
    name: "King's Indian Defense",
    plan: 'Black concedes the center temporarily to fianchetto on g7 and launch a fierce ...e5 or ...c5 Kingside counterattack.',
    suggestions: [
      { san: 'Nc3', nextOpeningName: "King's Indian / Grünfeld", whiteWinPct: 39, drawPct: 33, blackWinPct: 28, note: 'Prepares a massive e4 center.' },
      { san: 'Nf3', nextOpeningName: 'Fianchetto / Classical KID', whiteWinPct: 38, drawPct: 34, blackWinPct: 28, note: 'Solid development before committing.' },
    ],
  },
  {
    moves: ['f3', 'e5', 'g4'],
    eco: 'A00',
    name: "Barnes Opening — Fool's Trap",
    plan: 'White has fatally opened the e1-h4 diagonal! Never neglect King safety on move 2.',
    suggestions: [
      { san: 'Qh4#', nextOpeningName: "Fool's Mate!", whiteWinPct: 0, drawPct: 0, blackWinPct: 100, note: 'Instant checkmate on move 2!' },
    ],
  },
];

/**
 * Matches the longest prefix of SAN moves in the opening book.
 */
export function detectOpening(sanMoves: string[]): OpeningMatch {
  let bestMatch: OpeningEntry = OPENING_BOOK[0];
  let bestLen = -1;

  for (const entry of OPENING_BOOK) {
    if (entry.moves.length > sanMoves.length) continue;
    let matches = true;
    for (let i = 0; i < entry.moves.length; i++) {
      // Strip check/mate symbols for matching
      const a = sanMoves[i].replace(/[+#]/g, '');
      const b = entry.moves[i].replace(/[+#]/g, '');
      if (a !== b) {
        matches = false;
        break;
      }
    }
    if (matches && entry.moves.length > bestLen) {
      bestLen = entry.moves.length;
      bestMatch = entry;
    }
  }

  // Filter suggestions only if we are at or near the matched book node
  const isAtExactNode = bestMatch.moves.length === sanMoves.length;
  return {
    eco: bestMatch.eco,
    name: bestMatch.name,
    plan: bestMatch.plan,
    suggestions: isAtExactNode ? bestMatch.suggestions : [],
  };
}
