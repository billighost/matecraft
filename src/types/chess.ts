export type PieceColor = 'w' | 'b';
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export type CheckmateCategory =
  | 'Opening Trap'
  | 'Classic Tactical'
  | 'Royal Geometry'
  | 'Endgame'
  | 'Special & Rare';

export type CheckmateRarity = 'Common' | 'Uncommon' | 'Rare' | 'Mythic' | 'Uncharted';

export interface CheckmatePatternDef {
  id: string;
  name: string;
  aka?: string;
  category: CheckmateCategory;
  rarity: CheckmateRarity;
  funFact: string;
  goofyQuip: string;
  howItWorks: string;
  exampleFen: string;
  exampleHighlight?: { from: string; to: string };
}

export interface CheckmateAnalysis {
  patternId: string;
  patternName: string;
  aka?: string;
  category: CheckmateCategory;
  rarity: CheckmateRarity;
  isUncharted: boolean;
  uniquenessScore: number; // 0-100 structural rarity estimate
  uniquenessVerdict: string;
  geometrySignature: string;
  funFact: string;
  goofyQuip: string;
  howItWorks: string;
  matedKingSquare: string;
  checkingPieceSquares: string[];
  matingMoveSan: string;
  matingPieceType: PieceType;
  totalPlies: number;
}

export interface AnalyzedGame {
  id: string;
  url: string;
  pgn: string;
  white: { username: string; rating: number; result: string };
  black: { username: string; rating: number; result: string };
  endTime: number; // Unix seconds
  fullTimestamp: string; // e.g. "Nov 18, 2026 · 19:42:15"
  timeClass: string; // bullet | blitz | rapid | daily
  timeControl: string;
  userColor: PieceColor;
  userWon: boolean;
  endedByCheckmate: boolean;
  winnerColor: PieceColor | null;
  finalFen: string;
  lastMove?: { from: string; to: string; san: string };
  openingName: string;
  ecoCode: string;
  totalMoves: number;
  checkmate: CheckmateAnalysis | null;
  isSample?: boolean;
}

export type MoveClassification =
  | 'Brilliant'
  | 'Great'
  | 'Best'
  | 'Book'
  | 'Good'
  | 'Inaccuracy'
  | 'Mistake'
  | 'Blunder';

export interface MoveReviewItem {
  ply: number; // 1-indexed ply after start
  moveNumber: number;
  color: PieceColor;
  san: string;
  from: string;
  to: string;
  fenBefore: string;
  fenAfter: string;
  evalCpBefore: number; // from White's POV
  evalCpAfter: number; // from White's POV
  evalLabel: string; // e.g. "+1.4", "-0.8", "M1", "#"
  winProbWhite: number; // 0 to 100
  bestMoveSan: string | null;
  bestMoveFrom: string | null;
  bestMoveTo: string | null;
  classification: MoveClassification;
  winProbDrop: number; // how much the mover lost in win %
  coachNote: string;
  isCapture: boolean;
  isCheck: boolean;
  isCheckmate: boolean;
  isCastle: boolean;
  isPromotion: boolean;
}

export interface FullGameReview {
  moves: MoveReviewItem[];
  whiteAccuracy: number;
  blackAccuracy: number;
  opening: {
    eco: string;
    name: string;
    plan: string;
  };
  keyMoments: MoveReviewItem[];
  counts: {
    white: Record<MoveClassification, number>;
    black: Record<MoveClassification, number>;
  };
}

export interface OpeningSuggestion {
  san: string;
  nextOpeningName: string;
  whiteWinPct: number;
  drawPct: number;
  blackWinPct: number;
  note: string;
}

export interface OpeningMatch {
  eco: string;
  name: string;
  plan: string;
  suggestions: OpeningSuggestion[];
}

export interface GmCoachResponse {
  headline: string;
  positionInsight: string;
  betterPlan: string;
  checkmateTakeaway: string;
  coachQuip: string;
  drillChecklist: string[];
}

export type BoardThemeId =
  | 'obsidian-chalk'
  | 'blueprint-ink'
  | 'broadsheet'
  | 'walnut'
  | 'carrara'
  | 'tournament-slate';

export type PieceSetId = 'staunton' | 'ink-sketch' | 'neo-geo' | 'woodcut';
