import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Bot,
  Brain,
  Check,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Compass,
  Copy,
  FlipVertical2,
  GitBranch,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Send,
  SlidersHorizontal,
  Sparkles,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import {
  AnalyzedGame,
  BoardThemeId,
  FullGameReview,
  GmCoachResponse,
  MoveClassification,
  PieceColor,
  PieceSetId,
  PieceType,
} from '../types/chess';
import {
  evaluatePosition,
  inspectPositionTactics,
  parseGameSkeleton,
  positionKeyFromFen,
} from '../engine/chessEvaluator';
import { classifyCheckmate } from '../engine/checkmateClassifier';
import { detectOpening } from '../engine/openings';
import { BOARD_THEMES, PIECE_SETS } from './BoardThemes';
import { InteractiveBoard } from './InteractiveBoard';
import { EvalChart } from './EvalChart';
import { soundEngine } from '../utils/soundEngine';
import { analyzeGameInBackground, getCachedGameReview } from '../utils/gameReviewAnalysis';

interface GameReviewStudioProps {
  game: AnalyzedGame;
  boardTheme: BoardThemeId;
  pieceSet: PieceSetId;
  onChangeBoardTheme: (theme: BoardThemeId) => void;
  onChangePieceSet: (set: PieceSetId) => void;
  onBack: () => void;
}

const CLASSIFICATION_SYMBOL: Record<MoveClassification, { symbol: string; cls: string }> = {
  Brilliant: { symbol: '!!', cls: 'text-emerald-600 dark:text-emerald-400 font-bold' },
  Great: { symbol: '!', cls: 'text-sky-600 dark:text-sky-400 font-bold' },
  Best: { symbol: '★', cls: 'text-emerald-600 dark:text-emerald-400 font-semibold' },
  Book: { symbol: 'B', cls: 'text-zinc-500 dark:text-zinc-400' },
  Good: { symbol: '✓', cls: 'text-zinc-600 dark:text-zinc-400' },
  Inaccuracy: { symbol: '?!', cls: 'text-amber-600 dark:text-amber-400 font-semibold' },
  Mistake: { symbol: '?', cls: 'text-orange-600 dark:text-orange-400 font-bold' },
  Blunder: { symbol: '??', cls: 'text-red-600 dark:text-red-400 font-bold' },
};

const CAPTURED_GLYPH: Record<Exclude<PieceType, 'k'>, { w: string; b: string }> = {
  q: { w: '♕', b: '♛' },
  r: { w: '♖', b: '♜' },
  b: { w: '♗', b: '♝' },
  n: { w: '♘', b: '♞' },
  p: { w: '♙', b: '♟' },
};

export const GameReviewStudio: React.FC<GameReviewStudioProps> = ({
  game,
  boardTheme,
  pieceSet,
  onChangeBoardTheme,
  onChangePieceSet,
  onBack,
}) => {
  const initialAnalysis = useMemo(() => {
    const cached = getCachedGameReview(game.pgn);
    const initialReview = cached ?? parseGameSkeleton(game.pgn);
    return { review: initialReview, isDone: Boolean(cached) || initialReview.moves.length === 0 };
  }, [game.pgn]);
  const [review, setReview] = useState<FullGameReview>(initialAnalysis.review);
  const [analysisProgress, setAnalysisProgress] = useState<{
    done: number;
    total: number;
    isDone: boolean;
  }>(() => {
    const total = initialAnalysis.review.moves.length;
    return { done: initialAnalysis.isDone ? total : 0, total, isDone: initialAnalysis.isDone };
  });

  const totalPlies = review.moves.length;

  // For normal games start on final move; for 1-move Codex drills start on ply 0 so user can play the mate!
  const [currentPly, setCurrentPly] = useState<number>(() => {
    const total = initialAnalysis.review.moves.length;
    if (game.id.startsWith('codex-') && total === 1) return 0;
    return total;
  });
  const [orientation, setOrientation] = useState<PieceColor>(game.userColor);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(soundEngine.enabled);
  const [showBestArrow, setShowBestArrow] = useState(true);
  const [showThreats, setShowThreats] = useState(true);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [isBiggerMode, setIsBiggerMode] = useState(false);
  const [showAppearanceDrawer, setShowAppearanceDrawer] = useState(false);
  const [activeTab, setActiveTab] = useState<'coach' | 'opening' | 'checkmate'>('coach');
  const [copiedState, setCopiedState] = useState<'fen' | 'summary' | null>(null);

  // Variation / Sandbox tweaking state
  const [variationHistory, setVariationHistory] = useState<
    { fen: string; from: string; to: string; san: string; byEngine?: boolean }[]
  >([]);

  // Gemini Grandmaster Coach state
  const [gmCoach, setGmCoach] = useState<GmCoachResponse | null>(null);
  const [gmLoading, setGmLoading] = useState(false);
  const [gmError, setGmError] = useState<string | null>(null);
  const [coachQuestion, setCoachQuestion] = useState('');

  const movesContainerRef = useRef<HTMLDivElement | null>(null);

  // Reset immediately, then deepen the review in a worker or reuse a completed review.
  useEffect(() => {
    const skeleton = initialAnalysis.review;
    setReview(skeleton);
    setAnalysisProgress({
      done: initialAnalysis.isDone ? skeleton.moves.length : 0,
      total: skeleton.moves.length,
      isDone: initialAnalysis.isDone,
    });
    setCurrentPly(game.id.startsWith('codex-') && skeleton.moves.length === 1 ? 0 : skeleton.moves.length);
    setOrientation(game.userColor);
    setVariationHistory([]);
    setIsAutoPlaying(false);
    setGmCoach(null);
    setGmError(null);
    setAutoReplyEnabled(false);

    const cancel = analyzeGameInBackground(game.pgn, (partialReview, analyzedPlies, total, isDone) => {
      setReview(partialReview);
      setAnalysisProgress({ done: analyzedPlies, total, isDone });
    });

    return cancel;
  }, [game.id, game.pgn, game.userColor, initialAnalysis]);

  const isExploringVariation = variationHistory.length > 0;
  const activeReviewMove = currentPly > 0 ? review.moves[currentPly - 1] : null;

  // Active FEN shown on the board (BUG FIX: 0-ply Codex positions load game.finalFen, never starting board!)
  const activeFen = useMemo(() => {
    if (variationHistory.length > 0) {
      return variationHistory[variationHistory.length - 1].fen;
    }
    if (currentPly === 0) {
      return review.moves[0]?.fenBefore ?? game.finalFen;
    }
    return review.moves[currentPly - 1]?.fenAfter ?? game.finalFen;
  }, [variationHistory, currentPly, review.moves, game.finalFen]);

  // Build repetition history keys so the engine NEVER suggests back-and-forth repeating loops!
  const recentPositionSignature = useMemo(() => {
    const keys = new Set<string>();
    const startFen = review.moves[0]?.fenBefore ?? game.finalFen;
    keys.add(positionKeyFromFen(startFen));
    for (let i = 0; i < Math.min(currentPly, review.moves.length); i++) {
      keys.add(positionKeyFromFen(review.moves[i].fenAfter));
    }
    for (const v of variationHistory) {
      keys.add(positionKeyFromFen(v.fen));
    }
    return [...keys].join('\n');
  }, [review.moves, game.finalFen, currentPly, variationHistory]);
  const recentPositionKeys = useMemo(
    () => new Set(recentPositionSignature.split('\n')),
    [recentPositionSignature],
  );

  // Active last move highlight
  const activeLastMove = useMemo(() => {
    if (variationHistory.length > 0) {
      const top = variationHistory[variationHistory.length - 1];
      return { from: top.from, to: top.to };
    }
    if (activeReviewMove) {
      return { from: activeReviewMove.from, to: activeReviewMove.to };
    }
    return null;
  }, [variationHistory, activeReviewMove]);

  const needsLiveEvaluation = isExploringVariation || currentPly === 0 || currentPly === totalPlies
    || !analysisProgress.isDone || !activeReviewMove;
  // Progress updates change move annotations, not this board position. Reuse its search.
  const positionEvaluation = useMemo(
    () => evaluatePosition(activeFen, needsLiveEvaluation ? 2 : 1, recentPositionKeys, true),
    [activeFen, needsLiveEvaluation, recentPositionKeys],
  );

  // Live position evaluation and repetition-aware principal variation.
  const liveEval = useMemo(() => {
    if (needsLiveEvaluation) return positionEvaluation;

    const nextBest =
      currentPly < totalPlies && review.moves[currentPly]?.bestMoveFrom && review.moves[currentPly]?.bestMoveTo
        ? {
            san: review.moves[currentPly].bestMoveSan!,
            from: review.moves[currentPly].bestMoveFrom!,
            to: review.moves[currentPly].bestMoveTo!,
          }
        : null;

    // Fast 1-ply PV extraction so user always gets a clickable continuation line!
    const quickPv = positionEvaluation;
    return {
      evalCp: activeReviewMove.evalCpAfter,
      evalLabel: activeReviewMove.evalLabel,
      winProbWhite: activeReviewMove.winProbWhite,
      bestMove: nextBest ?? quickPv.bestMove,
      pvLine: quickPv.pvLine,
    };
  }, [
    needsLiveEvaluation,
    positionEvaluation,
    currentPly,
    totalPlies,
    analysisProgress.isDone,
    activeReviewMove,
    activeFen,
    recentPositionKeys,
    review.moves,
  ]);

  // Built-in FREE local Grandmaster tactical inspection (hanging pieces, captured pieces, material lead, plan)
  const tactics = useMemo(() => inspectPositionTactics(activeFen), [activeFen]);

  // Live checkmate inspection (if the user tweaked pieces into a new checkmate!)
  const liveCheckmate = useMemo(() => {
    if (!isExploringVariation && currentPly === totalPlies && totalPlies > 0 && game.checkmate) {
      return game.checkmate;
    }
    return classifyCheckmate({ fen: activeFen, totalPlies: currentPly + variationHistory.length });
  }, [isExploringVariation, currentPly, totalPlies, game.checkmate, activeFen, variationHistory.length]);

  // Live opening book match at the current ply (only for standard starting positions)
  const liveOpening = useMemo(() => {
    if (game.ecoCode === 'CODEX') {
      return {
        eco: 'CODEX',
        name: game.openingName,
        plan: game.checkmate?.howItWorks ?? 'Practice delivering this checkmate motif or explore defensive escapes.',
        suggestions: [],
      };
    }
    const sanList = [
      ...review.moves.slice(0, currentPly).map((m) => m.san),
      ...variationHistory.map((v) => v.san),
    ];
    return detectOpening(sanList);
  }, [game.ecoCode, game.openingName, game.checkmate?.howItWorks, review.moves, currentPly, variationHistory]);

  const playSoundForMove = useCallback(
    (meta: {
      isCheckmate?: boolean;
      isCheck?: boolean;
      isCapture?: boolean;
      isCastle?: boolean;
      isPromotion?: boolean;
      isBlunder?: boolean;
    }) => {
      if (meta.isCheckmate) soundEngine.play('checkmate');
      else if (meta.isPromotion) soundEngine.play('promote');
      else if (meta.isCastle) soundEngine.play('castle');
      else if (meta.isCheck) soundEngine.play('check');
      else if (meta.isCapture) soundEngine.play('capture');
      else soundEngine.play('move');

      if (meta.isBlunder && !meta.isCheckmate) {
        setTimeout(() => soundEngine.play('blunder'), 140);
      }
    },
    []
  );

  const jumpToPly = useCallback(
    (ply: number, playAudio = true) => {
      const clamped = Math.max(0, Math.min(totalPlies, ply));
      setVariationHistory([]);
      setCurrentPly(clamped);
      if (playAudio && clamped > 0) {
        const mv = review.moves[clamped - 1];
        if (mv) {
          playSoundForMove({
            isCheckmate: mv.isCheckmate,
            isCheck: mv.isCheck,
            isCapture: mv.isCapture,
            isCastle: mv.isCastle,
            isPromotion: mv.isPromotion,
            isBlunder: mv.classification === 'Blunder',
          });
        }
      } else if (playAudio) {
        soundEngine.play('click');
      }
    },
    [totalPlies, review.moves, playSoundForMove]
  );

  // Autoplay timer
  useEffect(() => {
    if (!isAutoPlaying) return;
    if (currentPly >= totalPlies) {
      setIsAutoPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => {
      jumpToPly(currentPly + 1, true);
    }, 850);
    return () => window.clearTimeout(timer);
  }, [isAutoPlaying, currentPly, totalPlies, jumpToPly]);

  // Keyboard shortcuts (ArrowLeft, ArrowRight, Home, End, Space, F)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setIsAutoPlaying(false);
        jumpToPly(currentPly - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setIsAutoPlaying(false);
        jumpToPly(currentPly + 1);
      } else if (e.key === 'Home' || e.key === 'ArrowUp') {
        e.preventDefault();
        setIsAutoPlaying(false);
        jumpToPly(0);
      } else if (e.key === 'End' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsAutoPlaying(false);
        jumpToPly(totalPlies);
      } else if (e.key === ' ') {
        e.preventDefault();
        if (currentPly >= totalPlies) jumpToPly(0, false);
        setIsAutoPlaying((p) => !p);
      } else if (e.key.toLowerCase() === 'f') {
        setOrientation((o) => (o === 'w' ? 'b' : 'w'));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentPly, totalPlies, jumpToPly]);

  // Execute a move on the board (user drag/click or engine play)
  const executeMoveOnBoard = useCallback(
    (from: string, to: string, promotion?: PieceType, byEngine = false): boolean => {
      const chess = new Chess();
      try {
        chess.load(activeFen);
        const move = chess.move({
          from,
          to,
          promotion: promotion ?? 'q',
        });
        if (!move) return false;

        setIsAutoPlaying(false);

        // If playing the exact next main-line move from the main line (and not auto-replying in sandbox), advance cleanly!
        if (
          !byEngine &&
          variationHistory.length === 0 &&
          currentPly < totalPlies &&
          review.moves[currentPly].from === from &&
          review.moves[currentPly].to === to
        ) {
          jumpToPly(currentPly + 1, true);
          return true;
        }

        const nextFen = chess.fen();
        setVariationHistory((prev) => [
          ...prev,
          { fen: nextFen, from: move.from, to: move.to, san: move.san, byEngine },
        ]);

        playSoundForMove({
          isCheckmate: chess.isCheckmate(),
          isCheck: chess.isCheck(),
          isCapture: Boolean(move.captured),
          isCastle: move.flags.includes('k') || move.flags.includes('q'),
          isPromotion: Boolean(move.promotion),
        });
        return true;
      } catch {
        return false;
      }
    },
    [activeFen, variationHistory.length, currentPly, totalPlies, review.moves, jumpToPly, playSoundForMove]
  );

  // Auto-Reply Sandbox Sparring: when Auto-Reply is ON and user just played a sandbox move, engine replies automatically!
  useEffect(() => {
    if (!autoReplyEnabled || variationHistory.length === 0) return;
    const latest = variationHistory[variationHistory.length - 1];
    if (latest.byEngine) return; // Don't reply to ourselves!

    const checkBoard = new Chess();
    try {
      checkBoard.load(latest.fen);
      if (checkBoard.isGameOver()) return;
    } catch {
      return;
    }

    const timer = window.setTimeout(() => {
      const replyEval = evaluatePosition(latest.fen, 2, recentPositionKeys, false);
      if (replyEval.bestMove) {
        executeMoveOnBoard(replyEval.bestMove.from, replyEval.bestMove.to, 'q', true);
      }
    }, 360);

    return () => window.clearTimeout(timer);
  }, [autoReplyEnabled, variationHistory, recentPositionKeys, executeMoveOnBoard]);

  // Play any SAN move (from Opening Book, Principal Variation, or Play Best button)
  const handlePlaySuggestedSan = useCallback(
    (san: string) => {
      const chess = new Chess();
      try {
        chess.load(activeFen);
        const mv = chess.move(san);
        if (mv) {
          executeMoveOnBoard(mv.from, mv.to, mv.promotion as PieceType | undefined, false);
        }
      } catch {
        // Ignore illegal suggestion
      }
    },
    [activeFen, executeMoveOnBoard]
  );

  const handleCopy = async (kind: 'fen' | 'summary') => {
    const text =
      kind === 'fen'
        ? activeFen
        : [
            `Matecraft Analysis — ${liveCheckmate?.patternName ?? game.checkmate?.patternName ?? game.openingName}`,
            `${game.white.username} (${game.white.rating}) vs ${game.black.username} (${game.black.rating}) · ${game.fullTimestamp}`,
            `Accuracy: White ${review.whiteAccuracy}% | Black ${review.blackAccuracy}% · Eval: ${liveEval.evalLabel}`,
            liveCheckmate ? `Uniqueness: ${liveCheckmate.uniquenessScore}% (${liveCheckmate.rarity}) — "${liveCheckmate.goofyQuip}"` : '',
            `FEN: ${activeFen}`,
          ]
            .filter(Boolean)
            .join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopiedState(kind);
      soundEngine.play('click');
      window.setTimeout(() => setCopiedState((cur) => (cur === kind ? null : cur)), 1800);
    } catch {
      // Clipboard blocked in restricted iframe — fail silently
    }
  };

  // Call live server-side Gemini Grandmaster Coach (uses AI Studio's built-in GEMINI_API_KEY)
  const requestGmCoach = async (customQuestion?: string) => {
    setGmLoading(true);
    setGmError(null);
    try {
      const response = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fen: activeFen,
          pgn: game.pgn,
          currentMoveSan:
            variationHistory.length > 0
              ? variationHistory[variationHistory.length - 1].san
              : activeReviewMove?.san ?? 'Start',
          moveIndex: currentPly + variationHistory.length,
          bestMoveSan: liveEval.bestMove?.san,
          evalLabel: liveEval.evalLabel,
          winProbWhite: liveEval.winProbWhite,
          checkmateName: liveCheckmate?.patternName ?? game.checkmate?.patternName,
          openingName: liveOpening.name,
          playerColor: game.userColor,
          question: customQuestion?.trim() || undefined,
          keyMoments: review.keyMoments.map(
            (m) => `Move ${m.moveNumber}${m.color === 'w' ? '.' : '...'} ${m.san} (${m.classification})`
          ),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Could not reach the Gemini Coach right now.');
      }
      setGmCoach(data as GmCoachResponse);
      if (customQuestion) setCoachQuestion('');
    } catch (err: unknown) {
      setGmError(err instanceof Error ? err.message : 'Gemini Coach request failed.');
    } finally {
      setGmLoading(false);
    }
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    soundEngine.enabled = next;
    setSoundEnabled(next);
    if (next) soundEngine.play('click');
  };

  const whiteBarPct = Math.max(4, Math.min(96, liveEval.winProbWhite));
  const topColor: PieceColor = orientation === 'w' ? 'b' : 'w';
  const bottomColor: PieceColor = orientation === 'w' ? 'w' : 'b';
  const topPlayer = topColor === 'b' ? game.black : game.white;
  const bottomPlayer = bottomColor === 'w' ? game.white : game.black;
  const topAccuracy = topColor === 'b' ? review.blackAccuracy : review.whiteAccuracy;
  const bottomAccuracy = bottomColor === 'w' ? review.whiteAccuracy : review.blackAccuracy;

  const topCaptured = topColor === 'w' ? tactics.capturedByWhite : tactics.capturedByBlack;
  const bottomCaptured = bottomColor === 'w' ? tactics.capturedByWhite : tactics.capturedByBlack;
  const topMatAdvantage = topColor === 'w' ? tactics.materialDiffWhite : -tactics.materialDiffWhite;
  const bottomMatAdvantage = bottomColor === 'w' ? tactics.materialDiffWhite : -tactics.materialDiffWhite;

  // Group moves in pairs for crisp algebraic move sheet
  const movePairs = useMemo(() => {
    const pairs: {
      moveNumber: number;
      white?: (typeof review.moves)[number];
      black?: (typeof review.moves)[number];
    }[] = [];
    for (let i = 0; i < review.moves.length; i += 2) {
      pairs.push({
        moveNumber: Math.floor(i / 2) + 1,
        white: review.moves[i],
        black: review.moves[i + 1],
      });
    }
    return pairs;
  }, [review.moves]);

  return (
    <section
      aria-label="Interactive Game Review Studio"
      className="w-full max-w-[1400px] mx-auto px-2.5 sm:px-6 lg:px-8 py-4 sm:py-6"
    >
      {/* Top Studio Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 pb-4 sm:pb-5 mb-5 sm:mb-6 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0 max-w-full">
          <button
            type="button"
            onClick={() => {
              soundEngine.play('click');
              onBack();
            }}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-[11px] sm:text-xs font-mono border border-zinc-300 dark:border-zinc-800 hover:border-zinc-900 dark:hover:border-zinc-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden min-[380px]:inline">Archive</span>
          </button>

          <div className="min-w-0">
            <h2 className="text-base sm:text-xl font-bold tracking-tight truncate">
              {liveCheckmate ? liveCheckmate.patternName : game.checkmate ? game.checkmate.patternName : game.openingName}
            </h2>
            <p className="text-[11px] sm:text-xs font-mono text-zinc-500 dark:text-zinc-400 truncate">
              {game.fullTimestamp} · {game.timeClass} · {game.ecoCode}
            </p>
          </div>
        </div>

        {/* Utility Toolbar */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => {
              soundEngine.play('click');
              setShowAppearanceDrawer((v) => !v);
            }}
            aria-expanded={showAppearanceDrawer}
            className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-[11px] sm:text-xs font-mono border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              showAppearanceDrawer
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 border-zinc-900 dark:border-zinc-100'
                : 'border-zinc-300 dark:border-zinc-800 hover:border-zinc-900 dark:hover:border-zinc-400'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Style</span>
          </button>

          <button
            type="button"
            onClick={() => handleCopy('fen')}
            className="inline-flex items-center gap-1.5 px-2.5 py-2 text-[11px] sm:text-xs font-mono border border-zinc-300 dark:border-zinc-800 hover:border-zinc-900 dark:hover:border-zinc-400 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            {copiedState === 'fen' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedState === 'fen' ? 'Copied' : 'FEN'}</span>
          </button>

          <button
            type="button"
            onClick={toggleSound}
            aria-label={soundEnabled ? 'Mute chess sounds' : 'Enable chess sounds'}
            className="inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 border border-zinc-300 dark:border-zinc-800 hover:border-zinc-900 dark:hover:border-zinc-400 transition-colors cursor-pointer shrink-0"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-zinc-400" />}
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.play('click');
              setIsBiggerMode((v) => !v);
            }}
            className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-mono border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              isBiggerMode
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 border-zinc-900 dark:border-zinc-100'
                : 'border-zinc-300 dark:border-zinc-800 hover:border-zinc-900 dark:hover:border-zinc-400'
            }`}
          >
            {isBiggerMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            {isBiggerMode ? 'Exit Bigger' : 'Bigger Mode'}
          </button>
        </div>
      </div>

      {/* Non-blocking Progressive Analysis Progress Bar (zero freezing on long Chess.com games!) */}
      {!analysisProgress.isDone && analysisProgress.total > 0 && (
        <div className="mb-4 px-3 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114] flex items-center justify-between gap-3 text-[11px] font-mono text-zinc-600 dark:text-zinc-400">
          <span className="truncate">
            Computing accuracy & blunders ({analysisProgress.done}/{analysisProgress.total} moves)...
          </span>
          <div className="w-24 sm:w-40 h-1.5 bg-zinc-200 dark:bg-zinc-800 overflow-hidden shrink-0">
            <div
              className="h-full bg-zinc-900 dark:bg-zinc-100 transition-all duration-150"
              style={{ width: `${Math.round((analysisProgress.done / analysisProgress.total) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Collapsible HD Board Theme & Piece Set Switcher */}
      {showAppearanceDrawer && (
        <div className="mb-5 p-3.5 sm:p-4 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114] grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div>
            <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400 mb-2.5">
              Board Texture & Shades
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {BOARD_THEMES.map((t) => {
                const active = t.id === boardTheme;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      soundEngine.play('click');
                      onChangeBoardTheme(t.id);
                    }}
                    className={`flex items-center gap-2 p-2 text-left border transition-colors cursor-pointer min-w-0 ${
                      active
                        ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-100 dark:bg-zinc-900'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-500'
                    }`}
                  >
                    <span className="grid grid-cols-2 w-5 h-5 shrink-0 border border-zinc-400 dark:border-zinc-700 overflow-hidden">
                      <span style={{ backgroundColor: t.lightSquare }} />
                      <span style={{ backgroundColor: t.darkSquare }} />
                      <span style={{ backgroundColor: t.darkSquare }} />
                      <span style={{ backgroundColor: t.lightSquare }} />
                    </span>
                    <span className="text-[11px] sm:text-xs font-medium truncate">{t.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400 mb-2.5">
              Piece Sculpt & Style
            </p>
            <div className="grid grid-cols-2 gap-2">
              {PIECE_SETS.map((ps) => {
                const active = ps.id === pieceSet;
                return (
                  <button
                    key={ps.id}
                    type="button"
                    onClick={() => {
                      soundEngine.play('click');
                      onChangePieceSet(ps.id);
                    }}
                    className={`p-2 text-left border transition-colors cursor-pointer min-w-0 ${
                      active
                        ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-100 dark:bg-zinc-900'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-500'
                    }`}
                  >
                    <div className="text-xs font-semibold truncate">{ps.name}</div>
                    <div className="text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                      {ps.tagline}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Studio Grid */}
      <div
        className={`grid gap-5 sm:gap-6 items-start ${
          isBiggerMode
            ? 'grid-cols-1 xl:grid-cols-[minmax(0,780px)_minmax(340px,1fr)] justify-center'
            : 'grid-cols-1 lg:grid-cols-[minmax(0,580px)_minmax(340px,1fr)]'
        }`}
      >
        {/* LEFT COLUMN: Eval Bar + Player Bars + Captured Pieces + Interactive Board + Controls */}
        <div className="flex flex-col gap-2.5 sm:gap-3 w-full mx-auto min-w-0">
          {/* Top Player Row + Captured Pieces & Material Lead */}
          <div className="flex items-center justify-between gap-2 text-xs px-0.5 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 font-medium min-w-0">
              <span
                className={`w-3 h-3 shrink-0 border border-zinc-400 ${
                  topColor === 'b' ? 'bg-zinc-900' : 'bg-zinc-100'
                }`}
              />
              <span className="font-semibold truncate">{topPlayer.username}</span>
              <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums shrink-0">
                ({topPlayer.rating})
              </span>
              {topCaptured.length > 0 && (
                <span className="hidden min-[380px]:inline-flex items-center text-[11px] text-zinc-500 dark:text-zinc-400 tracking-tighter truncate">
                  {topCaptured.slice(0, 8).map((pt, i) => (
                    <span key={`${pt}-${i}`}>{CAPTURED_GLYPH[pt][topColor === 'w' ? 'b' : 'w']}</span>
                  ))}
                  {topMatAdvantage > 0 && (
                    <span className="ml-1 font-mono text-[10px] font-semibold text-zinc-800 dark:text-zinc-200 tabular-nums">
                      +{topMatAdvantage}
                    </span>
                  )}
                </span>
              )}
            </div>
            <div className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums shrink-0">
              <strong className="text-zinc-900 dark:text-zinc-100">{topAccuracy}%</strong>
            </div>
          </div>

          {/* Eval Bar + Interactive Board Row */}
          <div className="flex items-stretch gap-1.5 sm:gap-2.5">
            {/* Vertical Real-Time Win Probability Bar */}
            <div
              className="relative w-5 sm:w-8 shrink-0 border border-zinc-300 dark:border-zinc-700 bg-zinc-900 overflow-hidden flex flex-col justify-between select-none"
              aria-label={`Evaluation ${liveEval.evalLabel}, White win probability ${Math.round(liveEval.winProbWhite)}%`}
            >
              <div
                className="absolute left-0 right-0 bg-[#F4F4F5] transition-all duration-300 ease-out"
                style={{
                  height: `${whiteBarPct}%`,
                  bottom: orientation === 'w' ? 0 : 'auto',
                  top: orientation === 'w' ? 'auto' : 0,
                }}
              />
              <span
                className={`relative z-10 text-[9px] sm:text-[10px] font-mono font-bold text-center pt-1 sm:pt-1.5 tabular-nums ${
                  orientation === 'w' ? 'text-zinc-100' : 'text-zinc-950'
                }`}
              >
                {liveEval.evalCp < 0 ? liveEval.evalLabel : ''}
              </span>
              <span
                className={`relative z-10 text-[9px] sm:text-[10px] font-mono font-bold text-center pb-1 sm:pb-1.5 tabular-nums ${
                  orientation === 'w' ? 'text-zinc-950' : 'text-zinc-100'
                }`}
              >
                {liveEval.evalCp >= 0 ? liveEval.evalLabel : ''}
              </span>
            </div>

            {/* Interactive Board Container */}
            <div className="flex-1 min-w-0">
              <InteractiveBoard
                fen={activeFen}
                orientation={orientation}
                boardTheme={boardTheme}
                pieceSet={pieceSet}
                lastMove={activeLastMove}
                bestMoveArrow={
                  liveEval.bestMove
                    ? { from: liveEval.bestMove.from, to: liveEval.bestMove.to }
                    : null
                }
                showBestMoveArrow={showBestArrow}
                hangingSquares={tactics.hangingSquares}
                showThreats={showThreats}
                interactive={true}
                onMoveAttempt={(from, to, promo) => executeMoveOnBoard(from, to, promo, false)}
              />
            </div>
          </div>

          {/* Bottom Player Row + Captured Pieces & Material Lead */}
          <div className="flex items-center justify-between gap-2 text-xs px-0.5 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 font-medium min-w-0">
              <span
                className={`w-3 h-3 shrink-0 border border-zinc-400 ${
                  bottomColor === 'w' ? 'bg-zinc-100' : 'bg-zinc-900'
                }`}
              />
              <span className="font-semibold truncate">{bottomPlayer.username}</span>
              <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums shrink-0">
                ({bottomPlayer.rating})
              </span>
              {bottomCaptured.length > 0 && (
                <span className="hidden min-[380px]:inline-flex items-center text-[11px] text-zinc-500 dark:text-zinc-400 tracking-tighter truncate">
                  {bottomCaptured.slice(0, 8).map((pt, i) => (
                    <span key={`${pt}-${i}`}>{CAPTURED_GLYPH[pt][bottomColor === 'w' ? 'b' : 'w']}</span>
                  ))}
                  {bottomMatAdvantage > 0 && (
                    <span className="ml-1 font-mono text-[10px] font-semibold text-zinc-800 dark:text-zinc-200 tabular-nums">
                      +{bottomMatAdvantage}
                    </span>
                  )}
                </span>
              )}
            </div>
            <div className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums shrink-0">
              <strong className="text-zinc-900 dark:text-zinc-100">{bottomAccuracy}%</strong>
            </div>
          </div>

          {/* Active Variation Banner when user drags/tweaks pieces */}
          {isExploringVariation && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 sm:px-3 py-2 border border-zinc-900 dark:border-zinc-200 bg-zinc-100 dark:bg-zinc-900 text-[11px] sm:text-xs font-mono">
              <div className="flex items-center gap-1.5 min-w-0">
                <GitBranch className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  Line: {variationHistory.map((v) => v.san).join(' ')}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.play('click');
                    setVariationHistory((prev) => prev.slice(0, -1));
                  }}
                  className="px-2 py-1 border border-zinc-400 dark:border-zinc-700 hover:bg-white dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Undo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.play('click');
                    setVariationHistory([]);
                  }}
                  className="px-2 py-1 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 cursor-pointer"
                >
                  Reset
                </button>
              </div>
            </div>
          )}

          {/* Playback & Smart Coach Controls Strip */}
          <div className="flex flex-col gap-2 p-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114]">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <div className="flex items-center gap-0.5 sm:gap-1">
                <button
                  type="button"
                  aria-label="First move"
                  onClick={() => {
                    setIsAutoPlaying(false);
                    jumpToPly(0);
                  }}
                  className="p-1.5 sm:p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <ChevronFirst className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  aria-label="Previous move"
                  onClick={() => {
                    setIsAutoPlaying(false);
                    jumpToPly(currentPly - 1);
                  }}
                  className="p-1.5 sm:p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  aria-label={isAutoPlaying ? 'Pause replay' : 'Play game replay'}
                  onClick={() => {
                    if (currentPly >= totalPlies) jumpToPly(0, false);
                    setIsAutoPlaying((p) => !p);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-[11px] sm:text-xs font-mono cursor-pointer spring-btn"
                >
                  {isAutoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isAutoPlaying ? 'Pause' : 'Replay'}</span>
                </button>
                <button
                  type="button"
                  aria-label="Next move"
                  onClick={() => {
                    setIsAutoPlaying(false);
                    jumpToPly(currentPly + 1);
                  }}
                  className="p-1.5 sm:p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  aria-label="Last move"
                  onClick={() => {
                    setIsAutoPlaying(false);
                    jumpToPly(totalPlies);
                  }}
                  className="p-1.5 sm:p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <ChevronLast className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1">
                {liveEval.bestMove && (
                  <button
                    type="button"
                    onClick={() => handlePlaySuggestedSan(liveEval.bestMove!.san)}
                    className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-[11px] font-mono border border-zinc-900 dark:border-zinc-200 hover:bg-zinc-900 hover:text-white dark:hover:bg-zinc-100 dark:hover:text-zinc-950 transition-colors cursor-pointer"
                  >
                    <Zap className="w-3 h-3" />
                    <span>Play {liveEval.bestMove.san}</span>
                  </button>
                )}

                <button
                  type="button"
                  aria-label="Flip board perspective"
                  onClick={() => {
                    soundEngine.play('click');
                    setOrientation((o) => (o === 'w' ? 'b' : 'w'));
                  }}
                  className="inline-flex items-center gap-1 px-2 py-1.5 text-[11px] font-mono border border-zinc-300 dark:border-zinc-800 hover:border-zinc-900 dark:hover:border-zinc-300 cursor-pointer"
                >
                  <FlipVertical2 className="w-3.5 h-3.5" />
                  <span>Flip</span>
                </button>
              </div>
            </div>

            {/* Secondary Interactive Toggles Row (Arrow, Threats, Auto-Reply Sparring) */}
            <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 text-[11px] font-mono">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.play('click');
                    setShowBestArrow((v) => !v);
                  }}
                  className={`px-2 py-1 border transition-colors cursor-pointer ${
                    showBestArrow
                      ? 'border-zinc-900 dark:border-zinc-200 text-zinc-900 dark:text-zinc-100'
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-500'
                  }`}
                >
                  Arrow: {showBestArrow ? 'On' : 'Off'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.play('click');
                    setShowThreats((v) => !v);
                  }}
                  className={`inline-flex items-center gap-1 px-2 py-1 border transition-colors cursor-pointer ${
                    showThreats
                      ? 'border-amber-600/70 dark:border-amber-400/70 text-amber-800 dark:text-amber-300'
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-500'
                  }`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span>
                    Threats{tactics.hangingSquares.length > 0 ? ` (${tactics.hangingSquares.length})` : ''}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.play('click');
                    setAutoReplyEnabled((v) => !v);
                  }}
                  className={`inline-flex items-center gap-1 px-2 py-1 border transition-colors cursor-pointer ${
                    autoReplyEnabled
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 border-zinc-900 dark:border-zinc-100'
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-500'
                  }`}
                >
                  <Bot className="w-3 h-3" />
                  <span>Auto-Reply: {autoReplyEnabled ? 'On' : 'Off'}</span>
                </button>
              </div>

              {isExploringVariation && (
                <button
                  type="button"
                  aria-label="Reset sandbox variation"
                  onClick={() => setVariationHistory([])}
                  className="p-1 border border-zinc-300 dark:border-zinc-800 hover:border-zinc-900 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 px-0.5">
            Drag or click any piece to explore lines · Turn on Auto-Reply to spar against the engine.
          </p>
        </div>

        {/* RIGHT COLUMN: Win Probability Graph + Intelligence Deck + Move Sheet */}
        <div className="flex flex-col gap-4 min-w-0">
          {/* Win Probability Advantage Chart */}
          <EvalChart
            moves={review.moves}
            currentPly={currentPly}
            onSelectPly={(p) => {
              setIsAutoPlaying(false);
              jumpToPly(p);
            }}
          />

          {/* Intelligence Deck Tabs */}
          <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114]">
            <div className="grid grid-cols-3 border-b border-zinc-200 dark:border-zinc-800 text-[11px] sm:text-xs font-mono">
              <button
                type="button"
                onClick={() => setActiveTab('coach')}
                className={`flex items-center justify-center gap-1 sm:gap-1.5 py-2.5 sm:py-3 border-r border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer ${
                  activeTab === 'coach'
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-semibold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
                }`}
              >
                <Brain className="w-3.5 h-3.5 shrink-0" />
                <span>Coach</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('opening')}
                className={`flex items-center justify-center gap-1 sm:gap-1.5 py-2.5 sm:py-3 border-r border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer ${
                  activeTab === 'opening'
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-semibold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 shrink-0" />
                <span>Openings</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('checkmate')}
                className={`flex items-center justify-center gap-1 sm:gap-1.5 py-2.5 sm:py-3 transition-colors cursor-pointer ${
                  activeTab === 'checkmate'
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-semibold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
                }`}
              >
                <Compass className="w-3.5 h-3.5 shrink-0" />
                <span>Mate DNA</span>
              </button>
            </div>

            {/* TAB 1: GRANDMASTER COACH (Built-in Local Engine Coach + Optional Live Gemini AI Coach) */}
            {activeTab === 'coach' && (
              <div className="p-3.5 sm:p-4 space-y-4">
                {/* 1. Instant Tactical Move Verdict */}
                <div className="pb-3.5 border-b border-zinc-200 dark:border-zinc-800">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <span className="text-[11px] sm:text-xs font-mono text-zinc-500 dark:text-zinc-400">
                      {isExploringVariation
                        ? `Variation · ${variationHistory[variationHistory.length - 1].san}`
                        : activeReviewMove
                        ? `Move ${activeReviewMove.moveNumber}${activeReviewMove.color === 'w' ? '.' : '...'} ${activeReviewMove.san}`
                        : game.ecoCode === 'CODEX'
                        ? 'Codex Checkmate Drill'
                        : 'Starting Position'}
                    </span>
                    <span className="text-[11px] sm:text-xs font-mono tabular-nums">
                      Eval: <strong>{liveEval.evalLabel}</strong> · Win {Math.round(liveEval.winProbWhite)}%
                    </span>
                  </div>

                  {!isExploringVariation && activeReviewMove ? (
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                        <span className={CLASSIFICATION_SYMBOL[activeReviewMove.classification].cls}>
                          {CLASSIFICATION_SYMBOL[activeReviewMove.classification].symbol}
                        </span>
                        <span>{activeReviewMove.classification}</span>
                        {activeReviewMove.bestMoveSan && activeReviewMove.bestMoveSan !== activeReviewMove.san && (
                          <span className="text-xs font-mono font-normal text-zinc-500 dark:text-zinc-400">
                            · Best was {activeReviewMove.bestMoveSan}
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                        {activeReviewMove.coachNote}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                      {liveEval.bestMove
                        ? `Recommended continuation: ${liveEval.bestMove.san} (${liveEval.evalLabel}). White win odds: ${Math.round(liveEval.winProbWhite)}%.`
                        : liveCheckmate
                        ? `Checkmate on the board — ${liveCheckmate.patternName}!`
                        : 'Position evaluated cleanly.'}
                    </p>
                  )}
                </div>

                {/* 2. Built-in Instant Tactical Coach (100% Free, Zero API Calls) */}
                <div className="pb-3.5 border-b border-zinc-200 dark:border-zinc-800 space-y-2.5 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                      Instant Engine Breakdown
                    </span>
                    {liveEval.pvLine.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="font-mono text-[10px] text-zinc-400 mr-0.5">Line:</span>
                        {liveEval.pvLine.map((san, idx) => (
                          <button
                            key={`${san}-${idx}`}
                            type="button"
                            disabled={idx > 0}
                            onClick={() => idx === 0 && handlePlaySuggestedSan(san)}
                            className={`px-1.5 py-0.5 font-mono text-[11px] border ${
                              idx === 0
                                ? 'border-zinc-900 dark:border-zinc-200 hover:bg-zinc-900 hover:text-white dark:hover:bg-zinc-100 dark:hover:text-zinc-950 cursor-pointer'
                                : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 cursor-default'
                            }`}
                          >
                            {san}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {tactics.threatSummary.length > 0 && (
                    <ul className="space-y-1 text-amber-800 dark:text-amber-300 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 p-2.5">
                      {tactics.threatSummary.map((alert, i) => (
                        <li key={i} className="leading-snug">
                          • {alert}
                        </li>
                      ))}
                    </ul>
                  )}

                  <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    <span className="font-mono text-zinc-500">Plan: </span>
                    {(liveEval.evalLabel === '+M' || liveEval.evalLabel === '-M') && liveEval.bestMove
                      ? `Forced checkmate is on the board right now — play ${liveEval.bestMove.san} to seal the game!`
                      : tactics.positionalPlan}
                  </p>
                </div>

                {/* 3. Key Turning Points quick jump */}
                {review.keyMoments.length > 0 && (
                  <div className="pb-3.5 border-b border-zinc-200 dark:border-zinc-800">
                    <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mb-2">
                      Key Turning Points
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {review.keyMoments.map((km) => (
                        <button
                          key={km.ply}
                          type="button"
                          onClick={() => jumpToPly(km.ply)}
                          className={`px-2 py-1 text-[11px] font-mono border transition-colors cursor-pointer ${
                            currentPly === km.ply && !isExploringVariation
                              ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950'
                              : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-500'
                          }`}
                        >
                          {km.moveNumber}
                          {km.color === 'w' ? '.' : '...'}
                          {km.san}{' '}
                          <span className={CLASSIFICATION_SYMBOL[km.classification].cls}>
                            {km.isCheckmate ? '#' : CLASSIFICATION_SYMBOL[km.classification].symbol}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Deep Grandmaster AI Coach (Server-side Gemini — included with AI Studio) */}
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold">AI Grandmaster Deep Review</span>
                    <button
                      type="button"
                      disabled={gmLoading}
                      onClick={() => requestGmCoach()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] sm:text-xs font-mono bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer spring-btn"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {gmLoading ? 'Analyzing...' : gmCoach ? 'Re-Analyze' : 'Ask AI Coach'}
                    </button>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (coachQuestion.trim()) requestGmCoach(coachQuestion);
                    }}
                    className="flex gap-1.5 sm:gap-2"
                  >
                    <input
                      type="text"
                      value={coachQuestion}
                      onChange={(e) => setCoachQuestion(e.target.value)}
                      placeholder="Ask Coach: Why was that a blunder?"
                      aria-label="Ask Grandmaster Coach a question about this position"
                      className="flex-1 min-w-0 px-2.5 sm:px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-300"
                    />
                    <button
                      type="submit"
                      disabled={gmLoading || !coachQuestion.trim()}
                      aria-label="Send question to coach"
                      className="px-2.5 sm:px-3 py-2 border border-zinc-300 dark:border-zinc-800 hover:border-zinc-900 dark:hover:border-zinc-300 disabled:opacity-40 cursor-pointer shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>

                  {gmError && (
                    <div className="p-3 border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/30 text-xs text-red-700 dark:text-red-300">
                      {gmError}
                    </div>
                  )}

                  {gmCoach && (
                    <div className="p-3 sm:p-3.5 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 space-y-2.5 text-xs">
                      <div className="font-display font-bold text-sm">{gmCoach.headline}</div>
                      <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                        {gmCoach.positionInsight}
                      </p>
                      <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                        <span className="font-mono text-zinc-500">Better Plan: </span>
                        <span className="text-zinc-800 dark:text-zinc-200">{gmCoach.betterPlan}</span>
                      </div>
                      <div>
                        <span className="font-mono text-zinc-500">Mate & King Safety: </span>
                        <span className="text-zinc-800 dark:text-zinc-200">{gmCoach.checkmateTakeaway}</span>
                      </div>
                      {gmCoach.drillChecklist?.length > 0 && (
                        <ul className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-1 text-zinc-700 dark:text-zinc-300 list-disc pl-4">
                          {gmCoach.drillChecklist.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      )}
                      <p className="pt-2 border-t border-zinc-200 dark:border-zinc-800 italic text-zinc-500 dark:text-zinc-400">
                        “{gmCoach.coachQuip}”
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: OPENING BOOK & EXPLORER */}
            {activeTab === 'opening' && (
              <div className="p-3.5 sm:p-4 space-y-4">
                <div>
                  <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                    ECO {liveOpening.eco}
                  </div>
                  <h3 className="text-base font-bold mt-0.5">{liveOpening.name}</h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1.5 leading-relaxed">
                    {liveOpening.plan}
                  </p>
                </div>

                {liveOpening.suggestions.length > 0 ? (
                  <div className="space-y-2">
                    <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                      Master Continuations (Click to play on board)
                    </div>
                    {liveOpening.suggestions.map((sug) => (
                      <button
                        key={sug.san}
                        type="button"
                        onClick={() => handlePlaySuggestedSan(sug.san)}
                        className="w-full text-left p-2.5 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-900 dark:hover:border-zinc-300 transition-colors cursor-pointer"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div>
                            <span className="font-mono font-bold mr-2">{sug.san}</span>
                            <span className="text-zinc-600 dark:text-zinc-300">
                              {sug.nextOpeningName}
                            </span>
                          </div>
                          <span className="font-mono text-[11px] text-zinc-500 tabular-nums shrink-0">
                            {sug.whiteWinPct}% / {sug.drawPct}% / {sug.blackWinPct}%
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full flex overflow-hidden border border-zinc-300 dark:border-zinc-700">
                          <div style={{ width: `${sug.whiteWinPct}%` }} className="bg-zinc-100" />
                          <div style={{ width: `${sug.drawPct}%` }} className="bg-zinc-400" />
                          <div style={{ width: `${sug.blackWinPct}%` }} className="bg-zinc-900" />
                        </div>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                          {sug.note}
                        </p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-600 dark:text-zinc-400 space-y-2">
                    <p>
                      {game.ecoCode === 'CODEX'
                        ? 'This is a custom checkmate study drill from the Codex. Use "Play Best" or drag pieces to test defenses!'
                        : 'You’re past standard opening book depth—now in pure middlegame/endgame territory!'}
                    </p>
                    {game.ecoCode !== 'CODEX' && totalPlies > 0 && (
                      <button
                        type="button"
                        onClick={() => jumpToPly(Math.min(4, totalPlies))}
                        className="font-mono underline text-zinc-900 dark:text-zinc-100 cursor-pointer"
                      >
                        Jump back to Move 2 to explore opening branches →
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: CHECKMATE DNA & UNIQUENESS */}
            {activeTab === 'checkmate' && (
              <div className="p-3.5 sm:p-4 space-y-3.5 text-xs">
                {liveCheckmate ? (
                  <>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div>
                        <div className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                          {liveCheckmate.category} · {liveCheckmate.rarity}
                        </div>
                        <h3 className="text-lg font-bold mt-0.5">{liveCheckmate.patternName}</h3>
                      </div>
                      <span className="font-mono text-xs tabular-nums border border-zinc-300 dark:border-zinc-700 px-2 py-0.5">
                        {liveCheckmate.uniquenessScore}% Novelty
                      </span>
                    </div>

                    <p className="p-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 italic text-zinc-700 dark:text-zinc-300">
                      “{liveCheckmate.goofyQuip}”
                    </p>

                    <div>
                      <span className="font-mono text-zinc-500">Fun Fact: </span>
                      <span className="text-zinc-800 dark:text-zinc-200 leading-relaxed">
                        {liveCheckmate.funFact}
                      </span>
                    </div>

                    <div>
                      <span className="font-mono text-zinc-500">Uniqueness Verdict: </span>
                      <span className="text-zinc-800 dark:text-zinc-200 leading-relaxed">
                        {liveCheckmate.uniquenessVerdict}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-zinc-500 tabular-nums">
                      <span>Mated King: {liveCheckmate.matedKingSquare} · {liveCheckmate.geometrySignature}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy('summary')}
                        className="inline-flex items-center gap-1 px-2 py-1 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 hover:border-zinc-900 dark:hover:border-zinc-300 cursor-pointer"
                      >
                        {copiedState === 'summary' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedState === 'summary' ? 'Copied Report' : 'Copy Mate Report'}</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-2 text-zinc-600 dark:text-zinc-400">
                    <p>No checkmate on the current ply.</p>
                    {game.endedByCheckmate && totalPlies > 0 && (
                      <button
                        type="button"
                        onClick={() => jumpToPly(totalPlies)}
                        className="font-mono underline text-zinc-900 dark:text-zinc-100 cursor-pointer"
                      >
                        Jump to final move ({game.lastMove?.san}) to inspect {game.checkmate?.patternName} →
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Interactive Move Sheet */}
          <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114]">
            <div className="flex items-center justify-between px-3.5 sm:px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-800 text-[11px] sm:text-xs font-mono text-zinc-500 dark:text-zinc-400">
              <span>Move Sheet ({totalPlies} plies)</span>
              <span className="tabular-nums">
                W {review.whiteAccuracy}% · B {review.blackAccuracy}%
              </span>
            </div>
            <div
              ref={movesContainerRef}
              className="max-h-56 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-900 text-xs font-mono"
            >
              {movePairs.length === 0 ? (
                <div className="px-4 py-6 text-center text-zinc-500">
                  Custom sandbox position — drag pieces on the board to build a line.
                </div>
              ) : (
                movePairs.map((pair) => (
                  <div key={pair.moveNumber} className="grid grid-cols-[36px_1fr_1fr] items-center">
                    <span className="px-2.5 py-1.5 text-zinc-400 tabular-nums">{pair.moveNumber}.</span>
                    {[pair.white, pair.black].map((mv, idx) =>
                      mv ? (
                        <button
                          key={mv.ply}
                          type="button"
                          onClick={() => {
                            setIsAutoPlaying(false);
                            jumpToPly(mv.ply);
                          }}
                          className={`flex items-center justify-between px-2.5 sm:px-3 py-1.5 text-left transition-colors cursor-pointer ${
                            currentPly === mv.ply && !isExploringVariation
                              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-semibold'
                              : 'hover:bg-zinc-100 dark:hover:bg-zinc-900'
                          }`}
                        >
                          <span>{mv.san}</span>
                          <span
                            className={`text-[10px] ${
                              currentPly === mv.ply && !isExploringVariation
                                ? 'opacity-85'
                                : CLASSIFICATION_SYMBOL[mv.classification].cls
                            }`}
                          >
                            {mv.isCheckmate ? '#' : CLASSIFICATION_SYMBOL[mv.classification].symbol}
                          </span>
                        </button>
                      ) : (
                        <span key={`empty-${pair.moveNumber}-${idx}`} className="px-2.5 py-1.5" />
                      )
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
