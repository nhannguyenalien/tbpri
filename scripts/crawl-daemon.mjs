// Chạy crawler định kỳ (dùng trên Coolify/VPS): node scripts/crawl-daemon.mjs
// Env: CRAWL_INTERVAL_MIN (mặc định 10), PORT (health, mặc định 3000), + quyền Firebase (xem lib/crawler/store.mjs)
import { createServer } from 'node:http';
import { runCrawl, isConfigured } from '../lib/crawler/store.mjs';

const everyMs = Math.max(1, Number(process.env.CRAWL_INTERVAL_MIN || 10)) * 60 * 1000;
let last = { status: 'starting' };
let running = false;

async function tick() {
  if (running) return;
  running = true;
  const t0 = Date.now();
  try {
    if (!isConfigured()) throw new Error('Thiếu FIREBASE_SERVICE_ACCOUNT (hoặc FIREBASE_ADMIN_EMAIL + FIREBASE_ADMIN_PASSWORD)');
    const r = await runCrawl();
    last = { status: 'ok', at: new Date().toISOString(), ms: Date.now() - t0, ok: r.ok, failed: r.failed,
      errors: r.results.filter((x) => !x.ok).map((x) => `${x.id}: ${x.error}`) };
  } catch (e) {
    last = { status: 'error', at: new Date().toISOString(), error: e.message };
  }
  console.log('[crawl]', JSON.stringify(last));
  running = false;
}

createServer((req, res) => {
  res.writeHead(last.status === 'error' ? 500 : 200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(last));
}).listen(Number(process.env.PORT || 3000));

tick();
setInterval(tick, everyMs);
