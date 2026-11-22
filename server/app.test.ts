import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import app from './app';

test('shared API serves health, validates input, and proxies Chess.com responses', async (t) => {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  t.after(async () => {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
    server.close();
    await once(server, 'close');
  });

  await t.test('health and unavailable coach return JSON', async () => {
    const health = await fetch(`${base}/api/health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { status: 'ok', coachConfigured: false });
    const coach = await fetch(`${base}/api/coach`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
    });
    assert.equal(coach.status, 503);
    assert.match((await coach.json()).error, /coaching is unavailable/i);
  });

  await t.test('invalid usernames and non-Chess.com URLs are rejected', async () => {
    assert.equal((await fetch(`${base}/api/chess/player/x`)).status, 400);
    const archives = await fetch(`${base}/api/chess/archives/batch`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls: ['https://example.com/private'] }),
    });
    assert.equal(archives.status, 400);
    assert.equal((await fetch(`${base}/api/missing`)).status, 404);
  });

  await t.test('profile and batch routes preserve successful upstream data', async () => {
    const archiveUrl = 'https://api.chess.com/pub/player/matecraft-test/games/2026/01';
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      if (!url.startsWith('https://api.chess.com/')) return originalFetch(input, init);
      assert.ok(init?.signal, 'Upstream requests must have a timeout');
      const data = url === archiveUrl ? { games: [{ pgn: '1. f3 e5 2. g4 Qh4#' }] }
        : url.endsWith('/archives') ? { archives: [archiveUrl] }
        : { username: 'matecraft-test' };
      return Response.json(data);
    };
    const player = await fetch(`${base}/api/chess/player/matecraft-test`);
    assert.equal(player.status, 200);
    assert.deepEqual(await player.json(), {
      profile: { username: 'matecraft-test' }, archives: [archiveUrl],
    });
    const batch = await fetch(`${base}/api/chess/archives/batch`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls: [archiveUrl] }),
    });
    assert.equal(batch.status, 200);
    assert.deepEqual(await batch.json(), {
      fetchedCount: 1, totalRequested: 1, games: [{ pgn: '1. f3 e5 2. g4 Qh4#' }],
    });
  });
});
