import assert from 'node:assert/strict';
import test from 'node:test';
import { dateRangeBounds, fetchAndAnalyzeChessComUser, selectArchiveUrls } from './chessComApi';

const matePgn = '1. f3 e5 2. g4 Qh4#';
const archive = (user: string, year: number, month: number) =>
  `https://api.chess.com/pub/player/${user}/games/${year}/${String(month).padStart(2, '0')}`;
const game = (user: string, id: string, day: string) => ({
  url: `https://www.chess.com/game/live/${id}`, pgn: matePgn,
  end_time: Date.parse(`${day}T12:00:00Z`) / 1000,
  white: { username: user, result: 'checkmated' }, black: { username: 'opponent', result: 'win' },
});

test('custom archive ranges cross years and preserve inclusive end dates', () => {
  const urls = [archive('range-test', 2026, 2), archive('range-test', 2025, 11), archive('range-test', 2025, 12), archive('range-test', 2026, 1)];
  assert.deepEqual(selectArchiveUrls(urls, 0, { startDate: '2025-12-31', endDate: '2026-01-01' }), [urls[3], urls[2]]);
  assert.equal(selectArchiveUrls(urls, 0).length, 4);
  assert.deepEqual(selectArchiveUrls(urls, 1), [urls[0]]);
  const sameDay = dateRangeBounds({ startDate: '2026-01-01', endDate: '2026-01-01' })!;
  assert.equal(sameDay.end - sameDay.start, 86_400_000 - 1);
  assert.throws(() => dateRangeBounds({ startDate: '2026-02-30', endDate: '2026-03-01' }), /valid/);
  assert.throws(() => dateRangeBounds({ startDate: '2026-02-02', endDate: '2026-02-01' }), /end date/);
});

test('custom scan includes both boundary days and excludes other days in downloaded months', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const username = 'inclusive-test';
  const urls = [archive(username, 2026, 1), archive(username, 2026, 2), archive(username, 2026, 3)];
  const requested: string[] = [];
  globalThis.fetch = async (input, init) => {
    if (String(input).startsWith('/api/chess/player/')) return Response.json({ profile: { username }, archives: urls });
    const url = JSON.parse(init!.body as string).urls[0];
    requested.push(url);
    const games = url.endsWith('/01')
      ? [game(username, 'outside-before', '2026-01-30'), { ...game(username, 'start', '2026-01-31'), end_time: Date.parse('2026-01-31T00:00:00Z') / 1000 }]
      : [{ ...game(username, 'end', '2026-02-01'), end_time: Date.parse('2026-02-01T23:59:59Z') / 1000 }, game(username, 'outside-after', '2026-02-02')];
    return Response.json({ fetchedCount: 1, games });
  };
  const result = await fetchAndAnalyzeChessComUser(username, 0, undefined, { startDate: '2026-01-31', endDate: '2026-02-01' });
  assert.equal(requested.length, 2);
  assert.equal(result.totalGamesScanned, 2);
  assert.deepEqual(result.games.map((item) => item.id), ['end', 'start']);
  assert.ok(result.games.every((item) => item.endedByCheckmate));
});

test('downloads twelve archives concurrently, retries failures, and reuses overlapping scan caches', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const username = 'parallel-test';
  const urls = Array.from({ length: 15 }, (_, index) => archive(username, 2025 + Math.floor(index / 12), index % 12 + 1));
  let active = 0;
  let maxActive = 0;
  let downloads = 0;
  let transientFailed = false;
  const progress: number[] = [];
  globalThis.fetch = async (input, init) => {
    if (String(input).startsWith('/api/chess/player/')) return Response.json({ profile: { username }, archives: urls });
    const requested = JSON.parse(init!.body as string).urls;
    assert.equal(requested.length, 1, 'Monthly responses stay small for serverless hosting');
    downloads++;
    active++;
    maxActive = Math.max(maxActive, active);
    await new Promise((resolve) => setTimeout(resolve, 10));
    active--;
    if (requested[0] === urls[0] && !transientFailed) {
      transientFailed = true;
      return Response.json({ fetchedCount: 0, games: [] });
    }
    return Response.json({ fetchedCount: 1, games: [game(username, `parallel-${urls.indexOf(requested[0])}`, '2026-01-01')] });
  };
  const result = await fetchAndAnalyzeChessComUser(username, 0, (state) => progress.push(state.archivesFetched));
  assert.equal(maxActive, 12);
  assert.equal(downloads, 16);
  assert.equal(result.archivesScanned, 15);
  assert.equal(result.games.length, 15);
  assert.equal(Math.max(...progress), 15, 'Retries never inflate completed archive counts');
  const recent = await fetchAndAnalyzeChessComUser(username, 3);
  assert.equal(recent.archivesScanned, 3);
  assert.equal(downloads, 16, 'Overlapping ranges reuse monthly downloads');
  const cached = await fetchAndAnalyzeChessComUser(username, 0);
  assert.equal(cached, result, 'Repeated scans return the cached analysis');
});

test('an unavailable worker falls back without dropping games or waiting indefinitely', async (t) => {
  const originalFetch = globalThis.fetch;
  const originalWorker = globalThis.Worker;
  let terminated = 0;
  class BrokenWorker {
    onerror: ((event: ErrorEvent) => void) | null = null;
    postMessage() { setTimeout(() => this.onerror?.({ preventDefault() {} } as ErrorEvent), 0); }
    terminate() { terminated++; }
  }
  globalThis.Worker = BrokenWorker as unknown as typeof Worker;
  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalWorker === undefined) delete (globalThis as { Worker?: typeof Worker }).Worker;
    else globalThis.Worker = originalWorker;
  });
  const username = 'worker-fallback-test';
  globalThis.fetch = async (input) => String(input).startsWith('/api/chess/player/')
    ? Response.json({ profile: { username }, archives: [archive(username, 2026, 1)] })
    : Response.json({ fetchedCount: 1, games: Array.from({ length: 20 }, (_, index) => game(username, `worker-${index}`, '2026-01-01')) });
  const result = await fetchAndAnalyzeChessComUser(username, 1);
  assert.equal(result.games.length, 20);
  assert.ok(result.games.every((item) => item.checkmate?.patternId === 'fools-mate'));
  assert.ok(terminated > 0);
});

test('persistent monthly failures produce an error instead of a misleading complete archive', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const username = 'failed-archive-test';
  let attempts = 0;
  globalThis.fetch = async (input) => {
    if (String(input).startsWith('/api/chess/player/')) return Response.json({ profile: { username }, archives: [archive(username, 2026, 1)] });
    attempts++;
    return Response.json({ fetchedCount: 0, games: [] });
  };
  await assert.rejects(fetchAndAnalyzeChessComUser(username, 1), /could not load 1 of 1/);
  assert.equal(attempts, 2);
});
