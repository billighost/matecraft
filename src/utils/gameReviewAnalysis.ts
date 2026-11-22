import { analyzeGameProgressive } from '../engine/chessEvaluator';
import type { FullGameReview } from '../types/chess';

type ReviewProgress = (
  review: FullGameReview,
  analyzedPlies: number,
  totalPlies: number,
  isDone: boolean,
) => void;

interface WorkerProgress {
  review?: FullGameReview;
  analyzedPlies: number;
  totalPlies: number;
  isDone: boolean;
  error?: string;
}

const completedReviews = new Map<string, FullGameReview>();
const MAX_CACHED_REVIEWS = 20;

export function getCachedGameReview(pgn: string): FullGameReview | undefined {
  const review = completedReviews.get(pgn);
  if (review) {
    completedReviews.delete(pgn);
    completedReviews.set(pgn, review);
  }
  return review;
}

function cacheReview(pgn: string, review: FullGameReview) {
  completedReviews.delete(pgn);
  completedReviews.set(pgn, review);
  if (completedReviews.size > MAX_CACHED_REVIEWS) {
    completedReviews.delete(completedReviews.keys().next().value!);
  }
}

/** Keep evaluation off the UI thread; cancel immediately when leaving a game. */
export function analyzeGameInBackground(pgn: string, onProgress: ReviewProgress): () => void {
  const cached = getCachedGameReview(pgn);
  if (cached) {
    onProgress(cached, cached.moves.length, cached.moves.length, true);
    return () => {};
  }

  let cancelled = false;
  let worker: Worker | undefined;
  let cancelFallback: (() => void) | undefined;
  let fallbackStarted = false;

  const emit: ReviewProgress = (review, analyzed, total, isDone) => {
    if (cancelled) return;
    if (isDone) cacheReview(pgn, review);
    onProgress(review, analyzed, total, isDone);
    if (isDone) worker?.terminate();
  };

  const fallback = () => {
    if (cancelled || fallbackStarted) return;
    fallbackStarted = true;
    worker?.terminate();
    worker = undefined;
    cancelFallback = analyzeGameProgressive(pgn, emit);
  };

  if (typeof Worker === 'undefined') {
    fallback();
  } else {
    try {
      worker = new Worker(new URL('../workers/gameReview.worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = ({ data }: MessageEvent<WorkerProgress>) => {
        if (cancelled || fallbackStarted) return;
        if (data.error || !data.review) fallback();
        else emit(data.review, data.analyzedPlies, data.totalPlies, data.isDone);
      };
      worker.onerror = (event) => {
        event.preventDefault();
        fallback();
      };
      worker.onmessageerror = fallback;
      worker.postMessage({ pgn });
    } catch {
      fallback();
    }
  }

  return () => {
    cancelled = true;
    worker?.terminate();
    cancelFallback?.();
  };
}
