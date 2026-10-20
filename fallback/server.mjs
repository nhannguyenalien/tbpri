// Dịch vụ DỰ PHÒNG bảng giá TV — chạy độc lập (Coolify), không dùng code của app chính.
// - SQLite lưu bản sao các tv_sessions/{id} (đồng bộ MỘT CHIỀU từ Firebase RTDB).
// - Phục vụ trang TV (/:id) và JSON (/api/board/:id) kể cả khi Firebase/Vercel chết.
// Env: PORT, DB_PATH, BOARD_IDS (id cách nhau dấu phẩy), SYNC_MINUTES,
//      FIREBASE_SERVICE_ACCOUNT | FIREBASE_ADMIN_EMAIL+FIREBASE_ADMIN_PASSWORD (tuỳ chọn: tự liệt kê mọi id)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createSign } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

const DB_URL = 'https://pricegold-4925d-default-rtdb.asia-southeast1.firebasedatabase.app';
const WEB_API_KEY = 'AIzaSyDxaz1uBWKpDZ-J7qRX81BajLHrOmfVyM0'; // public (có sẵn trong app)
const PORT = Number(process.env.PORT || 3000);
const DB_PATH = process.env.DB_PATH || '/data/boards.db';
const SYNC_MS = Number(process.env.SYNC_MINUTES || 5) * 60 * 1000;
const FRESH_MS = 60 * 1000; // dữ liệu trẻ hơn mức này thì khỏi hỏi Firebase
const ID_RE = /^[\w-]{1,128}$/;

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode=WAL');
db.exec('CREATE TABLE IF NOT EXISTS boards (id TEXT PRIMARY KEY, data TEXT, ts INTEGER NOT NULL DEFAULT 0)');
const qGet = db.prepare('SELECT data, ts FROM boards WHERE id = ?');
const qPut = db.prepare('INSERT INTO boards (id, data, ts) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, ts = excluded.ts');
const qTouch = db.prepare('INSERT OR IGNORE INTO boards (id, data, ts) VALUES (?, NULL, 0)');
const qIds = db.prepare('SELECT id FROM boards');

const log = (...a) => console.log(new Date().toISOString(), ...a);

// ---------- Firebase (REST) ----------
let tok = null;
async function adminToken() {
  if (tok && tok.exp > Date.now()) return tok;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    const sa = JSON.parse(raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8'));
    const b = (x) => Buffer.from(x).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const head = b(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claim = b(JSON.stringify({
      iss: sa.client_email, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
      scope: 'https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email',
    }));
    const sig = createSign('RSA-SHA256').update(`${head}.${claim}`).sign(String(sa.private_key).replace(/\\n/g, '\n'), 'base64url');
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${head}.${claim}.${sig}` }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(`service account: ${j.error_description || j.error}`);
    return (tok = { kind: 'access_token', value: j.access_token, exp: Date.now() + (j.expires_in - 120) * 1000 });
  }
  if (process.env.FIREBASE_ADMIN_EMAIL && process.env.FIREBASE_ADMIN_PASSWORD) {
    const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${WEB_API_KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: process.env.FIREBASE_ADMIN_EMAIL, password: process.env.FIREBASE_ADMIN_PASSWORD, returnSecureToken: true }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(`admin login: ${j.error && j.error.message}`);
    return (tok = { kind: 'auth', value: j.idToken, exp: Date.now() + (Number(j.expiresIn) - 120) * 1000 });
  }
  return null;
}

async function fbGet(p, query = {}) {
  const t = p === 'tv_sessions' ? await adminToken() : null; // liệt kê gốc cần quyền admin
  const qs = new URLSearchParams(query);
  if (t) qs.set(t.kind, t.value);
  const r = await fetch(`${DB_URL}/${p}.json?${qs}`, { signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new Error(`firebase ${r.status}`);
  return r.json();
}

async function refreshOne(id) {
  const v = await fbGet(`tv_sessions/${encodeURIComponent(id)}`);
  if (v != null) qPut.run(id, JSON.stringify(v), Date.now());
  return v;
}

async function syncAll() {
  for (const id of (process.env.BOARD_IDS || '').split(',').map((s) => s.trim()).filter((s) => ID_RE.test(s))) qTouch.run(id);
  try { // tự liệt kê id nếu có quyền admin; không có thì bỏ qua
    const keys = await fbGet('tv_sessions', { shallow: 'true' });
    if (keys && typeof keys === 'object') for (const id of Object.keys(keys)) if (ID_RE.test(id)) qTouch.run(id);
  } catch (e) { /* không có quyền / Firebase lỗi: dùng danh sách đã biết */ }
  let ok = 0, fail = 0;
  for (const { id } of qIds.all()) {
    try { await refreshOne(id); ok++; } catch (e) { fail++; }
  }
  log(`sync: ${ok} ok, ${fail} lỗi`);
}

// ---------- HTTP ----------
const PAGE = fs.readFileSync(new URL('./tv.html', import.meta.url), 'utf8');

async function getBoard(id) {
  let row = qGet.get(id);
  if (!row || Date.now() - row.ts > FRESH_MS) {
    try { await refreshOne(id); row = qGet.get(id); } catch (e) { /* Firebase lỗi: dùng bản đã lưu */ }
  }
  return row && row.data ? { v: JSON.parse(row.data), ts: row.ts } : null;
}

const send = (res, code, body, type = 'application/json; charset=utf-8', extra = {}) => {
  res.writeHead(code, { 'Content-Type': type, 'Access-Control-Allow-Origin': '*', ...extra });
  res.end(body);
};

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const parts = url.pathname.split('/').filter(Boolean);
  try {
    if (req.method === 'OPTIONS') return send(res, 204, '');
    if (url.pathname === '/health') return send(res, 200, '{"ok":true}');
    if (parts[0] === 'api' && parts[1] === 'board' && parts[2]) {
      const id = decodeURIComponent(parts[2]);
      if (!ID_RE.test(id)) return send(res, 400, '{"error":"bad id"}');
      qTouch.run(id); // nhớ id này để lần đồng bộ sau cập nhật
      const b = await getBoard(id);
      return b ? send(res, 200, JSON.stringify(b), undefined, { 'Cache-Control': 'no-store' })
               : send(res, 404, '{"error":"chưa có dữ liệu"}');
    }
    if (parts.length === 1 && ID_RE.test(parts[0])) return send(res, 200, PAGE, 'text/html; charset=utf-8', { 'Cache-Control': 'no-cache' });
    return send(res, 404, '{"error":"not found"}');
  } catch (e) {
    return send(res, 500, '{"error":"internal"}');
  }
}).listen(PORT, '0.0.0.0', () => log(`fallback listening :${PORT}, db ${DB_PATH}`));

setTimeout(syncAll, 3000);
setInterval(syncAll, SYNC_MS);
