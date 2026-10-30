// Client Turso tối giản qua HTTP (Hrana /v2/pipeline) — chỉ dùng fetch nên chạy được trên Cloudflare Workers
// (thư viện @libsql/client kéo theo websocket, không đóng gói được cho Workers).
const val = (v) => {
  if (v === null || v === undefined) return { type: 'null' };
  if (typeof v === 'number') return Number.isInteger(v) ? { type: 'integer', value: String(v) } : { type: 'float', value: v };
  if (typeof v === 'boolean') return { type: 'integer', value: v ? '1' : '0' };
  return { type: 'text', value: String(v) };
};
const unval = (c) => (c.type === 'null' ? null : c.type === 'integer' ? Number(c.value) : c.type === 'float' ? c.value : c.value);
const stmtOf = (s) => (typeof s === 'string' ? { sql: s } : { sql: s.sql, args: (s.args || []).map(val) });
const rowsOf = (r) => {
  const cols = r.cols.map((c) => c.name);
  return r.rows.map((row) => Object.fromEntries(row.map((c, i) => [cols[i], unval(c)])));
};

export function createTurso(url, authToken) {
  const base = String(url).replace(/^libsql:\/\//, 'https://').replace(/\/$/, '');
  async function pipeline(requests) {
    const r = await fetch(`${base}/v2/pipeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
      body: JSON.stringify({ requests: [...requests, { type: 'close' }] }),
    });
    if (!r.ok) throw new Error(`turso http ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return (await r.json()).results;
  }
  return {
    async execute(s) {
      const [res] = await pipeline([{ type: 'execute', stmt: stmtOf(s) }]);
      if (res.type !== 'ok') throw new Error(`turso: ${res.error && res.error.message}`);
      return { rows: rowsOf(res.response.result) };
    },
    // Chạy nhiều câu trong MỘT transaction (BEGIN ... COMMIT, lỗi thì ROLLBACK).
    async batch(stmts) {
      if (!stmts.length) return;
      const steps = [{ stmt: { sql: 'BEGIN' } }];
      stmts.forEach((s, i) => steps.push({ stmt: stmtOf(s), condition: { type: 'ok', step: i } }));
      const n = stmts.length;
      steps.push({ stmt: { sql: 'COMMIT' }, condition: { type: 'ok', step: n } });
      steps.push({ stmt: { sql: 'ROLLBACK' }, condition: { type: 'not', cond: { type: 'ok', step: n + 1 } } });
      const [res] = await pipeline([{ type: 'batch', batch: { steps } }]);
      if (res.type !== 'ok') throw new Error(`turso: ${res.error && res.error.message}`);
      const errs = res.response.result.step_errors || [];
      const bad = errs.find((e, i) => e && i <= n + 1);
      if (bad) throw new Error(`turso: ${bad.message}`);
    },
  };
}

let client = null;
let schemaReady = null;

export function turso() {
  if (!client) {
    if (!process.env.TURSO_URL) throw new Error('Thiếu TURSO_URL');
    client = createTurso(process.env.TURSO_URL, process.env.TURSO_AUTH_TOKEN);
  }
  return client;
}

export const SCHEMA = [
  // Cây dữ liệu kiểu Firebase RTDB, lưu theo lá: path = "tv_sessions/<uid>/prices/0/name", val = JSON.
  // gen > 0: bản sao do đồng bộ từ Firebase; gen = 0: ghi trực tiếp tại hệ thống này.
  'CREATE TABLE IF NOT EXISTS kv (path TEXT PRIMARY KEY, val TEXT NOT NULL, gen INTEGER NOT NULL DEFAULT 0) WITHOUT ROWID',
  'CREATE TABLE IF NOT EXISTS versions (k TEXT PRIMARY KEY, v INTEGER NOT NULL) WITHOUT ROWID',
  `CREATE TABLE IF NOT EXISTS users (
     uid TEXT PRIMARY KEY, email TEXT, email_lower TEXT, display_name TEXT, photo_url TEXT,
     password_hash TEXT, password_salt TEXT,   -- hash PBKDF2 của hệ thống này
     fb_hash TEXT, fb_salt TEXT,               -- hash gốc của Firebase (scrypt cải biên)
     providers TEXT, disabled INTEGER NOT NULL DEFAULT 0, created_at INTEGER)`,
  'CREATE INDEX IF NOT EXISTS users_email ON users (email_lower)',
  'CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT) WITHOUT ROWID',
];

export async function ready() {
  if (!schemaReady) {
    schemaReady = turso().batch(SCHEMA).catch((e) => { schemaReady = null; throw e; });
  }
  await schemaReady;
  return turso();
}
