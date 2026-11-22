import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import app from './server/app.js';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT) || 3000;

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(rootDir, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Matecraft server listening on http://localhost:${port}`);
  });
}

startServer().catch((error) => {
  console.error('Unable to start Matecraft:', error);
  process.exitCode = 1;
});
