import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const CHESS_USER_AGENT = 'MatecraftChessAnalyzer/1.0 (contact: support@matecraft.local)';

// Simple in-memory TTL cache for Chess.com archive URLs (5 minutes)
interface CacheEntry {
  data: unknown;
  expiresAt: number;
}
const archiveCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function getCached(key: string): unknown | null {
  const entry = archiveCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    archiveCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCached(key: string, data: unknown) {
  if (archiveCache.size > 150) {
    const firstKey = archiveCache.keys().next().value;
    if (firstKey) archiveCache.delete(firstKey);
  }
  archiveCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

function isValidChessArchiveUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname === 'api.chess.com' &&
      /^\/pub\/player\/[a-zA-Z0-9_-]+\/games\/\d{4}\/\d{2}$/.test(parsed.pathname)
    );
  } catch {
    return false;
  }
}

async function fetchChessJson(url: string) {
  const cached = getCached(url);
  if (cached) return { ok: true, status: 200, data: cached, fromCache: true };

  const resp = await fetch(url, {
    headers: {
      'User-Agent': CHESS_USER_AGENT,
      Accept: 'application/json',
    },
  });

  if (!resp.ok) {
    return { ok: false, status: resp.status, data: null, fromCache: false };
  }

  const data = await resp.json();
  setCached(url, data);
  return { ok: true, status: 200, data, fromCache: false };
}

function createGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // 1. Fetch player profile + archive index in parallel
  app.get('/api/chess/player/:username', async (req, res) => {
    const rawUser = String(req.params.username || '').trim().toLowerCase();
    if (!/^[a-z0-9_-]{2,40}$/i.test(rawUser)) {
      res.status(400).json({ error: 'Please enter a valid Chess.com username (letters, numbers, _ or -).' });
      return;
    }

    try {
      const [profileRes, archivesRes] = await Promise.all([
        fetchChessJson(`https://api.chess.com/pub/player/${encodeURIComponent(rawUser)}`),
        fetchChessJson(`https://api.chess.com/pub/player/${encodeURIComponent(rawUser)}/games/archives`),
      ]);

      if (!profileRes.ok) {
        if (profileRes.status === 404) {
          res.status(404).json({ error: `No Chess.com account found for "${rawUser}". Check the spelling and try again.` });
          return;
        }
        res.status(profileRes.status).json({ error: `Chess.com returned status ${profileRes.status}. Try again shortly.` });
        return;
      }

      const archives = (archivesRes.ok && (archivesRes.data as { archives?: string[] })?.archives) || [];
      res.json({
        profile: profileRes.data,
        archives,
      });
    } catch (err) {
      console.error('Chess.com player proxy error:', err);
      res.status(502).json({
        error: 'Unable to reach Chess.com right now. You can try again or load the built-in Sample GM Archive.',
      });
    }
  });

  // 2. Parallel batch fetcher for Chess.com monthly archive URLs
  app.post('/api/chess/archives/batch', async (req, res) => {
    const urls = Array.isArray(req.body?.urls) ? req.body.urls : [];
    const validUrls = urls
      .filter((u: unknown): u is string => typeof u === 'string' && isValidChessArchiveUrl(u))
      .slice(0, 12);

    if (validUrls.length === 0) {
      res.status(400).json({ error: 'No valid Chess.com archive URLs provided.' });
      return;
    }

    try {
      const results = await Promise.all(
        validUrls.map(async (url: string) => {
          try {
            const result = await fetchChessJson(url);
            if (!result.ok) return { url, games: [], ok: false };
            const payload = result.data as { games?: unknown[] };
            return { url, games: Array.isArray(payload?.games) ? payload.games : [], ok: true };
          } catch {
            return { url, games: [], ok: false };
          }
        })
      );

      const games = results.flatMap((r) => r.games);
      res.json({
        fetchedCount: results.filter((r) => r.ok).length,
        totalRequested: validUrls.length,
        games,
      });
    } catch (err) {
      console.error('Chess.com batch fetch error:', err);
      res.status(502).json({ error: 'Failed while fetching monthly archives in parallel.' });
    }
  });

  // 3. Grandmaster AI Coach via @google/genai (server-side only)
  app.post('/api/coach', async (req, res) => {
    const ai = createGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'Gemini API key is not configured on the server. Add GEMINI_API_KEY in Settings > Secrets to unlock live Grandmaster AI explanations.',
      });
      return;
    }

    const {
      fen,
      pgn,
      currentMoveSan,
      moveIndex,
      bestMoveSan,
      evalLabel,
      winProbWhite,
      checkmateName,
      openingName,
      playerColor,
      question,
      keyMoments,
    } = req.body ?? {};

    if (!fen || typeof fen !== 'string') {
      res.status(400).json({ error: 'Missing board FEN position for coach analysis.' });
      return;
    }

    const promptLines = [
      `Position FEN: ${fen}`,
      `Player perspective: ${playerColor === 'b' ? 'Black' : 'White'}`,
      `Current ply #${Number(moveIndex) || 0}, last move played: ${currentMoveSan || 'Start position'}`,
      `Engine evaluation: ${evalLabel || '0.00'} (White win probability: ${Math.round(Number(winProbWhite) || 50)}%)`,
      bestMoveSan ? `Engine top candidate move: ${bestMoveSan}` : '',
      openingName ? `Detected opening: ${openingName}` : '',
      checkmateName ? `Game ended in checkmate pattern: ${checkmateName}` : '',
      Array.isArray(keyMoments) && keyMoments.length > 0
        ? `Key turning points: ${keyMoments.slice(0, 5).join('; ')}`
        : '',
      pgn ? `Game moves excerpt: ${String(pgn).slice(0, 1200)}` : '',
      question
        ? `User's specific question about this position: "${String(question).slice(0, 400)}"`
        : 'Provide a crisp, grandmaster-level review of this exact moment and the overall game plan.',
    ]
      .filter(Boolean)
      .join('\n');

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: promptLines,
        config: {
          systemInstruction:
            'You are a witty, super-sharp Chess Grandmaster Coach (2700+ Elo) reviewing a student game. Be concise, concrete, and genuinely instructive—reference exact squares, piece coordination, tactical motifs, and practical human plans. Avoid fluff. Add one sharp, memorable playful remark.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              headline: {
                type: Type.STRING,
                description: 'Punchy 5-10 word grandmaster verdict headline for this position or game.',
              },
              positionInsight: {
                type: Type.STRING,
                description: '2-3 crisp sentences analyzing the exact current position, threats, and structural imbalances.',
              },
              betterPlan: {
                type: Type.STRING,
                description: 'Specific alternative move or concrete 2-3 move strategic plan the player should aim for.',
              },
              checkmateTakeaway: {
                type: Type.STRING,
                description: 'Actionable lesson about the mating pattern, king safety, or endgame conversion.',
              },
              coachQuip: {
                type: Type.STRING,
                description: 'A playful, witty one-line remark from the coach.',
              },
              drillChecklist: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '2 to 3 short, concrete study takeaways for future games.',
              },
            },
            required: ['headline', 'positionInsight', 'betterPlan', 'checkmateTakeaway', 'coachQuip', 'drillChecklist'],
          },
        },
      });

      const raw = (response.text ?? '').trim();
      const parsed = JSON.parse(raw);
      res.json(parsed);
    } catch (err: unknown) {
      console.error('Gemini Coach error:', err);
      const message = err instanceof Error ? err.message : 'Grandmaster Coach request failed.';
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Matecraft server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
