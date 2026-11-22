import { analyzeArchiveGame } from '../utils/chessArchiveAnalysis';
import type { ArchiveGameJob } from '../utils/chessArchiveAnalysis';
import type { AnalyzedGame } from '../types/chess';

interface AnalysisRequest {
  id: number;
  username: string;
  jobs: ArchiveGameJob[];
}

const context = self as unknown as {
  onmessage: ((event: MessageEvent<AnalysisRequest>) => void) | null;
  postMessage(message: { id: number; games?: AnalyzedGame[]; error?: string }): void;
};

context.onmessage = ({ data }) => {
  try {
    context.postMessage({
      id: data.id,
      games: data.jobs.map((job) => analyzeArchiveGame(job, data.username)),
    });
  } catch (error) {
    context.postMessage({ id: data.id, error: error instanceof Error ? error.message : 'Unable to analyze these games.' });
  }
};
