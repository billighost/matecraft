import { analyzeGameProgressive } from '../engine/chessEvaluator';

let cancelCurrent: (() => void) | undefined;

self.onmessage = ({ data }: MessageEvent<{ pgn: string }>) => {
  cancelCurrent?.();
  try {
    cancelCurrent = analyzeGameProgressive(data.pgn, (review, analyzedPlies, totalPlies, isDone) => {
      self.postMessage({ review, analyzedPlies, totalPlies, isDone });
    });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'Game review failed.' });
  }
};
