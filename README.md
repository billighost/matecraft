# Matecraft

Find the checkmates hidden in your Chess.com archive, understand their patterns, and replay your games in an interactive study studio.

[**Open Matecraft**](https://matecraft-beige.vercel.app) · [Try the sample archive](https://matecraft-beige.vercel.app/?autostart=1)

Built with React, TypeScript, Vite, Tailwind CSS, Express, and chess.js. Optional AI explanations use Google's Gemini API from the server.

## What you can do

- **Scan public Chess.com archives:** download recent monthly archives in parallel and find games that ended in checkmate.
- **Choose your date range:** scan 1, 3, 6, 12, or 24 months, all time, or an inclusive custom range using the calendar.
- **Explore the Checkmate Codex:** study 38 checkmate entries with board examples, explanations, and geometry-based rarity scores.
- **Review games move by move:** inspect evaluations, suggested moves, opening ideas, tactical highlights, and accuracy estimates.
- **Practice on the board:** play variations and try checkmate drills with customizable boards, piece sets, and sound effects.
- **Import PGN or try sample games:** start studying without a Chess.com account or API key.
- **Ask the AI coach:** get position explanations and study takeaways when a server-side Gemini key is configured.

The built-in evaluator uses a lightweight heuristic search. Evaluations, win probabilities, accuracy, and rarity scores are study aids; they are not Stockfish analysis or verified claims that a checkmate is historically unique.

Archive downloads run up to 12 months at once, with cached downloads and analysis. Background workers handle archive parsing and game review so controls stay responsive. Archive tabs update immediately, show skeletons while results update, and initially display 24 games with a Load more control. Completed Studio reviews are cached when you revisit them.

## Run locally

Requires **Node.js 24 LTS** and npm.

```sh
git clone https://github.com/billighost/matecraft.git
cd matecraft
npm ci
npm run dev
```

Open **http://localhost:3000**. Enter a public Chess.com username, paste a PGN, or load the built-in sample archive. You can also open `http://localhost:3000/?autostart=1` to load the samples immediately.

The development server serves both the React app and its API. Use `npm install` when intentionally changing dependencies; commit the resulting `package-lock.json`.

## Configuration

Core analysis and sample games work without a Gemini key. To enable the AI coach, copy `.env.example` to `.env` and set your own key.

| Variable | Purpose | Default |
| --- | --- | --- |
| `PORT` | Local HTTP server port | `3000` |
| `GEMINI_API_KEY` | Optional key for live AI coaching | Unset |
| `GEMINI_MODEL` | Gemini model used by the coach | `gemini-2.5-flash` |

Keep the API key on the server. Do not add a `VITE_` prefix or commit `.env` files. Without a key, the coach endpoint explains that AI coaching is unavailable; the rest of the app remains available.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Express with Vite development middleware |
| `npm run lint` | Check TypeScript types |
| `npm test` | Run chess-engine and server API tests |
| `npm run build` | Build the frontend into `dist/` |
| `npm start` | Start the Express server; set `NODE_ENV=production` to serve the build |
| `npm run preview` | Preview the frontend build with Vite |

For a local production run:

```sh
npm run build
NODE_ENV=production npm start
```

In PowerShell, run `$env:NODE_ENV = 'production'` before `npm start`.

## Deploy to Vercel

The repository's `vercel.json` builds the Vite frontend and routes `/api/*` through `api/index.ts`, which exports the shared Express API. Frontend navigation falls back to `index.html`.

With an authenticated Vercel CLI:

```sh
vercel link
vercel --prod
```

Set `GEMINI_API_KEY` in the Vercel project's production environment variables if you want live coaching, then redeploy. `GEMINI_MODEL` is optional. Public Chess.com data can be temporarily unavailable or rate limited; sample games and PGN import remain useful alternatives.

## Project layout

```text
src/components/    Archive dashboard, boards, codex, and review studio
src/engine/        Checkmate classification, openings, evaluation, and tests
src/data/          Curated sample games
src/utils/         Chess.com client and sound utilities
server/app.ts      Shared Express API for Chess.com and Gemini
server.ts          Local development and production server
api/index.ts       Vercel function entry point
vercel.json        Build and routing configuration
```

Matecraft uses the public Chess.com Published-Data API and is not affiliated with or endorsed by Chess.com.
