import React, { useEffect, useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { ArrowRight, FileText, Sparkles } from 'lucide-react';
import {
  AnalyzedGame,
  BoardThemeId,
  CheckmatePatternDef,
  PieceSetId,
} from './types/chess';
import { buildSampleGames, parseRawGameToAnalyzed, SAMPLE_USERNAME } from './data/sampleGames';
import { fetchAndAnalyzeChessComUser, FetchProgress } from './utils/chessComApi';
import { classifyCheckmate, formatFullGameTimestamp } from './engine/checkmateClassifier';
import { ThemeToggle } from './components/ThemeToggle';
import { HeroIllustration } from './components/HeroIllustration';
import { ScanningLoader } from './components/ScanningLoader';
import { ArchiveDashboard } from './components/ArchiveDashboard';
import { GameReviewStudio } from './components/GameReviewStudio';
import { CheckmateCodex } from './components/CheckmateCodex';
import { soundEngine } from './utils/soundEngine';

type AppView = 'analyzer' | 'codex' | 'studio';

export default function App() {
  // Light / Dark Mode state (synced with <html class="dark">)
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const saved = window.localStorage.getItem('matecraft-theme');
    if (saved === 'light') return false;
    return true;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      window.localStorage.setItem('matecraft-theme', 'dark');
    } else {
      root.classList.remove('dark');
      window.localStorage.setItem('matecraft-theme', 'light');
    }
  }, [isDark]);

  // Persistent Board Theme & Piece Set preferences
  const [boardTheme, setBoardTheme] = useState<BoardThemeId>('obsidian-chalk');
  const [pieceSet, setPieceSet] = useState<PieceSetId>('staunton');

  // Navigation View
  const [activeView, setActiveView] = useState<AppView>('analyzer');

  // Username Form & Parallel Fetch State
  const [usernameInput, setUsernameInput] = useState('');
  const [monthsToScan, setMonthsToScan] = useState<number>(6);
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchProgress, setFetchProgress] = useState<FetchProgress | null>(null);

  // Optional PGN Paste Escape Hatch
  const [showPgnImport, setShowPgnImport] = useState(false);
  const [pgnDraft, setPgnDraft] = useState('');
  const [pgnError, setPgnError] = useState<string | null>(null);

  // Analyzed Archive State
  const sampleGames = useMemo(() => buildSampleGames(), []);
  const [analyzedUsername, setAnalyzedUsername] = useState<string | null>(null);
  const [analyzedGames, setAnalyzedGames] = useState<AnalyzedGame[]>([]);
  const [isSampleArchive, setIsSampleArchive] = useState<boolean>(false);
  const [totalGamesScanned, setTotalGamesScanned] = useState<number>(0);
  const [scanDurationMs, setScanDurationMs] = useState<number>(0);

  // Currently selected game in the Game Review Studio
  const [selectedGame, setSelectedGame] = useState<AnalyzedGame | null>(null);

  // Support ?autostart=1 for deterministic instant loading
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        handleLoadSampleArchive(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLoadSampleArchive = (scrollToResults = true) => {
    soundEngine.play('checkmate');
    setFormError(null);
    setAnalyzedUsername(SAMPLE_USERNAME);
    setAnalyzedGames(sampleGames);
    setIsSampleArchive(true);
    setTotalGamesScanned(sampleGames.length);
    setScanDurationMs(42);
    setActiveView('analyzer');

    if (scrollToResults) {
      window.setTimeout(() => {
        document.getElementById('archive-results')?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    }
  };

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = usernameInput.trim();
    if (!trimmed) {
      setFormError('Enter a public Chess.com username first (for example: Hikaru, GothamChess, or MagnusCarlsen).');
      return;
    }
    if (!/^[a-zA-Z0-9_-]{2,40}$/.test(trimmed)) {
      setFormError('Chess.com usernames only contain letters, numbers, underscores, and hyphens.');
      return;
    }

    soundEngine.play('click');
    setFormError(null);
    setIsLoading(true);
    setActiveView('analyzer');

    try {
      const result = await fetchAndAnalyzeChessComUser(trimmed, monthsToScan, (prog) => {
        setFetchProgress(prog);
      });

      setAnalyzedUsername(result.profile.username);
      setAnalyzedGames(result.games);
      setIsSampleArchive(false);
      setTotalGamesScanned(result.totalGamesScanned);
      setScanDurationMs(result.durationMs);
      soundEngine.play('checkmate');

      window.setTimeout(() => {
        document.getElementById('archive-results')?.scrollIntoView({ behavior: 'smooth' });
      }, 80);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Unable to fetch games from Chess.com.');
    } finally {
      setIsLoading(false);
      setFetchProgress(null);
    }
  };

  const handleImportCustomPgn = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = pgnDraft.trim();
    if (!cleaned) {
      setPgnError('Paste a valid PGN move list before analyzing.');
      return;
    }

    const testChess = new Chess();
    try {
      testChess.loadPgn(cleaned);
      if (testChess.history().length === 0) {
        setPgnError('No legal chess moves were found in that PGN.');
        return;
      }
    } catch {
      setPgnError('That PGN could not be parsed. Please check the notation and try again.');
      return;
    }

    const headers = testChess.getHeaders();
    const customGame = parseRawGameToAnalyzed(
      {
        id: `custom-${Date.now()}`,
        pgn: cleaned,
        white: { username: headers.White || 'White', rating: Number(headers.WhiteElo) || 1600 },
        black: { username: headers.Black || 'Black', rating: Number(headers.BlackElo) || 1600 },
        endTime: Math.floor(Date.now() / 1000),
        timeClass: 'custom',
        timeControl: headers.TimeControl || 'Custom',
      },
      headers.White || 'White',
      false
    );

    setPgnError(null);
    setSelectedGame(customGame);
    setActiveView('studio');
    soundEngine.play('move');
  };

  const handleOpenReview = (game: AnalyzedGame) => {
    setSelectedGame(game);
    setActiveView('studio');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Convert any Checkmate Codex pattern into an inspectable, playable Studio drill!
  const handleInspectCodexPattern = (pattern: CheckmatePatternDef) => {
    const checkmate = classifyCheckmate({ fen: pattern.exampleFen });

    // Try reversing the final checkmate move so the user can step back 1 ply and practice delivering it!
    let drillPgn = `[FEN "${pattern.exampleFen}"]\n[SetUp "1"]\n*`;
    let drillLastMove: { from: string; to: string; san: string } | undefined = pattern.exampleHighlight
      ? { from: pattern.exampleHighlight.from, to: pattern.exampleHighlight.to, san: '#' }
      : undefined;

    if (pattern.exampleHighlight) {
      try {
        const finalBoard = new Chess(pattern.exampleFen);
        const toSq = pattern.exampleHighlight.to as Parameters<Chess['get']>[0];
        const fromSq = pattern.exampleHighlight.from as Parameters<Chess['get']>[0];
        const matingPiece = finalBoard.get(toSq);
        const originPiece = finalBoard.get(fromSq);

        if (matingPiece && !originPiece && matingPiece.color !== finalBoard.turn()) {
          const preBoard = new Chess(pattern.exampleFen);
          preBoard.remove(toSq);
          preBoard.put(matingPiece, fromSq);
          const fenParts = preBoard.fen().split(' ');
          fenParts[1] = matingPiece.color; // Side who delivers checkmate moves!
          fenParts[3] = '-';
          const candidatePreFen = fenParts.join(' ');

          const verify = new Chess(candidatePreFen);
          const mv = verify.move({ from: fromSq, to: toSq, promotion: 'q' });
          if (mv && verify.isCheckmate()) {
            drillPgn = `[FEN "${candidatePreFen}"]\n[SetUp "1"]\n\n1.${matingPiece.color === 'b' ? '..' : ''} ${mv.san} ${matingPiece.color === 'w' ? '1-0' : '0-1'}`;
            drillLastMove = { from: mv.from, to: mv.to, san: mv.san };
          }
        }
      } catch {
        // Fallback to static FEN study cleanly
      }
    }

    const patternGame: AnalyzedGame = {
      id: `codex-${pattern.id}`,
      url: '',
      pgn: drillPgn,
      white: { username: 'White (Codex Study)', rating: 2500, result: 'win' },
      black: { username: 'Black (Codex Study)', rating: 2500, result: 'checkmated' },
      endTime: Math.floor(Date.now() / 1000),
      fullTimestamp: formatFullGameTimestamp(Math.floor(Date.now() / 1000)),
      timeClass: 'study',
      timeControl: 'Codex Drill',
      userColor: 'w',
      userWon: true,
      endedByCheckmate: Boolean(checkmate),
      winnerColor: 'w',
      finalFen: pattern.exampleFen,
      lastMove: drillLastMove,
      openingName: pattern.name,
      ecoCode: 'CODEX',
      totalMoves: 1,
      checkmate: checkmate ?? {
        patternId: pattern.id,
        patternName: pattern.name,
        aka: pattern.aka,
        category: pattern.category,
        rarity: pattern.rarity,
        isUncharted: pattern.id === 'uncharted-mate',
        uniquenessScore: 75,
        uniquenessVerdict: pattern.howItWorks,
        geometrySignature: 'CODEX-REF',
        funFact: pattern.funFact,
        goofyQuip: pattern.goofyQuip,
        howItWorks: pattern.howItWorks,
        matedKingSquare: 'g8',
        checkingPieceSquares: [],
        matingMoveSan: drillLastMove?.san ?? '#',
        matingPieceType: 'q',
        totalPlies: 1,
      },
      isSample: true,
    };

    setSelectedGame(patternGame);
    setActiveView('studio');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const studioGame = selectedGame ?? analyzedGames[0] ?? sampleGames[0];

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-[#09090B] dark:bg-[#09090B] dark:text-[#F4F4F5] transition-colors duration-200 overflow-x-clip">
      {/* Strict 3-Zone Top Bar Contract — Ultra-responsive down to 300px */}
      <header className="sticky top-0 z-40 border-b border-zinc-200 dark:border-zinc-800 bg-[#FAFAFA]/92 dark:bg-[#09090B]/92 backdrop-blur-md">
        <div className="max-w-[1400px] mx-auto px-2.5 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-8">
          {/* Zone 1: Single-element brand wordmark */}
          <button
            type="button"
            onClick={() => {
              soundEngine.play('click');
              setActiveView('analyzer');
            }}
            className="font-display text-base sm:text-xl font-extrabold tracking-tight text-zinc-950 dark:text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            Matecraft
          </button>

          {/* Zone 2: Clean single-line text nav links */}
          <nav
            aria-label="Primary navigation"
            className="flex items-center gap-2.5 sm:gap-7 text-[11px] sm:text-sm font-medium"
          >
            {(
              [
                { id: 'analyzer', label: 'Analyzer', short: 'Analyzer' },
                { id: 'codex', label: 'Checkmate Codex', short: 'Codex' },
                { id: 'studio', label: 'Game Studio', short: 'Studio' },
              ] as { id: AppView; label: string; short: string }[]
            ).map((nav) => {
              const isCurrent = activeView === nav.id;
              return (
                <button
                  key={nav.id}
                  type="button"
                  onClick={() => {
                    soundEngine.play('click');
                    setActiveView(nav.id);
                  }}
                  className={`relative py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    isCurrent
                      ? 'text-zinc-950 dark:text-white font-semibold'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
                  }`}
                >
                  <span className="sm:hidden">{nav.short}</span>
                  <span className="hidden sm:inline">{nav.label}</span>
                  {isCurrent && (
                    <span className="absolute left-0 right-0 -bottom-[17px] sm:-bottom-[21px] h-[2px] bg-zinc-950 dark:bg-white" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Single primary utility action — Unique Animated King Light/Dark Switch */}
          <div className="flex items-center shrink-0">
            <ThemeToggle isDark={isDark} onToggle={() => setIsDark((d) => !d)} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {activeView === 'analyzer' && (
          <>
            {/* Editorial Split Hero Section */}
            <section className="max-w-[1320px] mx-auto px-3 sm:px-6 lg:px-8 pt-7 pb-10 sm:pt-14 sm:pb-16">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 lg:gap-12 items-stretch">
                {/* Left Column: Clear Instructions + Username Form + Parallel Speed Controls */}
                <div className="lg:col-span-6 flex flex-col justify-between gap-7 sm:gap-8 min-w-0">
                  <div className="space-y-4 sm:space-y-5">
                    <p className="text-[11px] sm:text-xs font-mono text-zinc-500 dark:text-zinc-400">
                      Chess.com Checkmate Identifier · Parallel Scanner · Grandmaster Studio
                    </p>

                    <h1 className="font-display text-[28px] min-[360px]:text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.08] text-balance">
                      Name every checkmate you ever played—or walked right into.
                    </h1>

                    <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-xl">
                      Enter your public Chess.com username below. We fetch your monthly archives in
                      parallel, classify every checkmate across 38+ patterns, flag rare one-of-a-kind
                      geometries, and open any game in a grandmaster board studio.
                    </p>
                  </div>

                  {/* Primary Username Form */}
                  <div className="space-y-4">
                    <form onSubmit={handleUsernameSubmit} noValidate className="space-y-3">
                      <label
                        htmlFor="chesscom-username"
                        className="block text-xs font-mono text-zinc-500 dark:text-zinc-400"
                      >
                        Step 1 — Enter your Chess.com username
                      </label>

                      <div className="flex flex-col sm:flex-row gap-2.5">
                        <input
                          id="chesscom-username"
                          type="text"
                          value={usernameInput}
                          onChange={(e) => {
                            setUsernameInput(e.target.value);
                            if (formError) setFormError(null);
                          }}
                          placeholder="e.g. Hikaru, GothamChess"
                          autoComplete="username"
                          className="w-full sm:flex-1 min-w-0 h-12 px-4 text-sm font-mono bg-white dark:bg-[#111114] border border-zinc-300 dark:border-zinc-700 text-zinc-950 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-200 transition-colors"
                        />

                        <select
                          aria-label="Archive depth in months"
                          value={monthsToScan}
                          onChange={(e) => setMonthsToScan(Number(e.target.value))}
                          className="h-12 px-3.5 text-xs font-mono bg-white dark:bg-[#111114] border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-200 cursor-pointer shrink-0"
                        >
                          <option value={3}>Last 3 mo</option>
                          <option value={6}>Last 6 mo</option>
                          <option value={12}>Last 12 mo</option>
                        </select>

                        <button
                          type="submit"
                          disabled={isLoading}
                          className="inline-flex items-center justify-center gap-2 h-12 px-6 text-sm font-semibold bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer whitespace-nowrap shrink-0 spring-btn"
                        >
                          {isLoading ? 'Scanning...' : 'Analyze Games'}
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>

                      {formError && (
                        <p role="alert" className="text-xs font-mono text-red-600 dark:text-red-400">
                          {formError}
                        </p>
                      )}
                    </form>

                    {/* Clear Quick Actions beneath input */}
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-xs font-mono">
                      <button
                        type="button"
                        onClick={() => handleLoadSampleArchive(true)}
                        className="inline-flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100 underline underline-offset-4 hover:opacity-75 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Try Sample GM Archive (12 Mates)
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.play('click');
                          setShowPgnImport((v) => !v);
                        }}
                        className="inline-flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        {showPgnImport ? 'Hide PGN Paste' : 'Paste Single PGN'}
                      </button>
                    </div>

                    {/* Optional PGN Paste Drawer */}
                    {showPgnImport && (
                      <form
                        onSubmit={handleImportCustomPgn}
                        className="p-4 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114] space-y-2.5"
                      >
                        <label
                          htmlFor="custom-pgn-input"
                          className="block text-xs font-mono text-zinc-500 dark:text-zinc-400"
                        >
                          Paste any PGN to inspect checkmate DNA & open in Game Studio
                        </label>
                        <textarea
                          id="custom-pgn-input"
                          rows={3}
                          value={pgnDraft}
                          onChange={(e) => {
                            setPgnDraft(e.target.value);
                            if (pgnError) setPgnError(null);
                          }}
                          placeholder="1. e4 e5 2. Nf3 Nc6 3. Bc4 Nd4 4. Nxe5 Qg5 5. Nxf7 Qxg2 6. Rf1 Qxe4+ 7. Be2 Nf3#"
                          className="w-full p-2.5 text-xs font-mono bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-300"
                        />
                        {pgnError && (
                          <p role="alert" className="text-xs font-mono text-red-600 dark:text-red-400">
                            {pgnError}
                          </p>
                        )}
                        <div className="flex justify-end">
                          <button
                            type="submit"
                            className="px-4 py-2 text-xs font-mono bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 cursor-pointer"
                          >
                            Analyze PGN
                          </button>
                        </div>
                      </form>
                    )}

                    {/* 3-Step Micro-Guide */}
                    <div className="grid grid-cols-1 min-[420px]:grid-cols-3 gap-4 pt-5 border-t border-zinc-200 dark:border-zinc-800 text-xs">
                      <div>
                        <div className="font-mono text-zinc-400">01. Fetch</div>
                        <p className="text-zinc-700 dark:text-zinc-300 mt-1">
                          Parallel batch requests scan monthly Chess.com archives fast.
                        </p>
                      </div>
                      <div>
                        <div className="font-mono text-zinc-400">02. Classify</div>
                        <p className="text-zinc-700 dark:text-zinc-300 mt-1">
                          38+ checkmate archetypes, fun facts, quips & novelty scoring.
                        </p>
                      </div>
                      <div>
                        <div className="font-mono text-zinc-400">03. Review</div>
                        <p className="text-zinc-700 dark:text-zinc-300 mt-1">
                          Drag pieces, watch win odds shift, and ask the GM Coach.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Detailed Goofy Animated SVG Hero Illustration */}
                <div className="lg:col-span-6 flex items-stretch">
                  <HeroIllustration />
                </div>
              </div>
            </section>

            {/* Parallel Fetching Animated Loader */}
            {isLoading && fetchProgress && <ScanningLoader progress={fetchProgress} />}

            {/* Analyzed Archive Results */}
            {!isLoading && analyzedUsername && (
              <ArchiveDashboard
                username={analyzedUsername}
                isSample={isSampleArchive}
                games={analyzedGames}
                totalGamesScanned={totalGamesScanned}
                durationMs={scanDurationMs}
                boardTheme={boardTheme}
                pieceSet={pieceSet}
                onChangeBoardTheme={setBoardTheme}
                onChangePieceSet={setPieceSet}
                onOpenReview={handleOpenReview}
                onOpenCodex={() => {
                  setActiveView('codex');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            )}
          </>
        )}

        {activeView === 'codex' && (
          <CheckmateCodex
            analyzedGames={analyzedGames.length > 0 ? analyzedGames : sampleGames}
            boardTheme={boardTheme}
            pieceSet={pieceSet}
            onInspectPattern={handleInspectCodexPattern}
          />
        )}

        {activeView === 'studio' && studioGame && (
          <GameReviewStudio
            game={studioGame}
            boardTheme={boardTheme}
            pieceSet={pieceSet}
            onChangeBoardTheme={setBoardTheme}
            onChangePieceSet={setPieceSet}
            onBack={() => setActiveView('analyzer')}
          />
        )}
      </main>

      {/* Quiet Editorial Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-6 mt-12">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-zinc-500 dark:text-zinc-500">
          <span>Matecraft · Public Chess.com Published-Data API Analyzer</span>
          <span>Obsidian & Chalk Monochrome Studio</span>
        </div>
      </footer>
    </div>
  );
}
