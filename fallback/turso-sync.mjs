// Đẩy bản sao Firebase (RTDB + user Auth) sang Turso cho hệ thống dự phòng Cloudflare (thư mục cf-system/).
// Tự chứa, không phụ thuộc gì. Lược đồ phải khớp cf-system/overlay/lib/server/turso.js.
// Đồng bộ MỘT CHIỀU: bản trên Turso bị ghi đè theo Firebase, trừ khi đặt meta.mode = 'primary' trên Turso
// (chuyển hẳn sang dùng hệ thống dự phòng làm chính — lúc đó đồng bộ tự dừng).
const val = (v) => (v === null || v === undefined ? { type: 'null' } : typeof v === 'number' ? (Number.isInteger(v) ? { type: 'integer', value: String(v) } : { type: 'float', value: v }) : { type: 'text', value: String(v) });
const stmtOf = (s) => (typeof s === 'string' ? { sql: s } : { sql: s.sql, args: (s.args || []).map(val) });

function turso(url, token) {
  const base = String(url).replace(/^libsql:\/\//, 'https://').replace(/\/$/, '');
  const pipeline = async (requests) => {
    const r = await fetch(`${base}/v2/pipeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ requests: [...requests, { type: 'close' }] }),
      signal: AbortSignal.timeout(60000),
    });
    if (!r.ok) throw new Error(`turso http ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return (await r.json()).results;
  };
  return {
    async execute(s) {
      const [res] = await pipeline([{ type: 'execute', stmt: stmtOf(s) }]);
      if (res.type !== 'ok') throw new Error(`turso: ${res.error && res.error.message}`);
      const { cols, rows } = res.response.result;
      return rows.map((row) => Object.fromEntries(row.map((c, i) => [cols[i].name, c.type === 'null' ? null : c.type === 'integer' ? Number(c.value) : c.value])));
    },
    async batch(stmts) {
      if (!stmts.length) return;
      const steps = [{ stmt: { sql: 'BEGIN' } }];
      stmts.forEach((s, i) => steps.push({ stmt: stmtOf(s), condition: { type: 'ok', step: i } }));
      const n = stmts.length;
      steps.push({ stmt: { sql: 'COMMIT' }, condition: { type: 'ok', step: n } });
      steps.push({ stmt: { sql: 'ROLLBACK' }, condition: { type: 'not', cond: { type: 'ok', step: n + 1 } } });
      const [res] = await pipeline([{ type: 'batch', batch: { steps } }]);
      if (res.type !== 'ok') throw new Error(`turso: ${res.error && res.error.message}`);
      const bad = (res.response.result.step_errors || []).find((e, i) => e && i <= n + 1);
      if (bad) throw new Error(`turso: ${bad.message}`);
    },
  };
}

const SCHEMA = [
  'CREATE TABLE IF NOT EXISTS kv (path TEXT PRIMARY KEY, val TEXT NOT NULL, gen INTEGER NOT NULL DEFAULT 0) WITHOUT ROWID',
  'CREATE TABLE IF NOT EXISTS versions (k TEXT PRIMARY KEY, v INTEGER NOT NULL) WITHOUT ROWID',
  `CREATE TABLE IF NOT EXISTS users (
     uid TEXT PRIMARY KEY, email TEXT, email_lower TEXT, display_name TEXT, photo_url TEXT,
     password_hash TEXT, password_salt TEXT, fb_hash TEXT, fb_salt TEXT,
     providers TEXT, disabled INTEGER NOT NULL DEFAULT 0, created_at INTEGER)`,
  'CREATE INDEX IF NOT EXISTS users_email ON users (email_lower)',
  'CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT) WITHOUT ROWID',
];

const BAD = /[.$#\[\]/]/;
function flatten(v, base, out) {
  if (v === null || v === undefined) return out;
  if (typeof v === 'object') {
    for (const k of Object.keys(v)) {
      if (BAD.test(k)) continue; // khoá lạ thì bỏ, không làm hỏng cả đợt
      flatten(v[k], base ? `${base}/${k}` : k, out);
    }
    return out;
  }
  out.push([base, JSON.stringify(v)]);
  return out;
}

const chunk = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, (i + 1) * n));

// data: toàn bộ RTDB (object) | users: mảng user từ accounts:batchGet (có thể rỗng/undefined)
export async function syncToTurso({ url, token, data, users }) {
  const t = turso(url, token);
  await t.batch(SCHEMA);
  const mode = (await t.execute({ sql: 'SELECT v FROM meta WHERE k = ?', args: ['mode'] }))[0];
  if (mode && mode.v === 'primary') return { skipped: 'turso đang ở chế độ primary' };

  const gen = Date.now();
  const leaves = flatten(data, '', []);
  for (const part of chunk(leaves, 400)) {
    await t.batch(part.map(([path, v]) => ({
      sql: 'INSERT INTO kv (path, val, gen) VALUES (?1, ?2, ?3) ON CONFLICT(path) DO UPDATE SET val = excluded.val, gen = excluded.gen',
      args: [path, v, gen],
    })));
  }
  // Chỉ xoá bản cũ SAU KHI mọi lô ở trên đã thành công (lỗi giữa chừng thì dữ liệu cũ vẫn còn nguyên).
  await t.execute({ sql: 'DELETE FROM kv WHERE gen < ?1', args: [gen] });

  let nUsers = 0;
  for (const part of chunk(users || [], 200)) {
    await t.batch(part.map((u) => ({
      sql: `INSERT INTO users (uid, email, email_lower, display_name, photo_url, fb_hash, fb_salt, providers, disabled, created_at)
            VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)
            ON CONFLICT(uid) DO UPDATE SET email = excluded.email, email_lower = excluded.email_lower, display_name = excluded.display_name,
              photo_url = excluded.photo_url, fb_hash = excluded.fb_hash, fb_salt = excluded.fb_salt, providers = excluded.providers,
              disabled = excluded.disabled`, // giữ nguyên password_hash cục bộ
      args: [u.localId, u.email || null, u.email ? String(u.email).toLowerCase() : null, u.displayName || null, u.photoUrl || null,
        u.passwordHash || null, u.salt || null, JSON.stringify(u.providerUserInfo || []), u.disabled ? 1 : 0, Number(u.createdAt) || null],
    })));
    nUsers += part.length;
  }

  await t.batch([
    { sql: "INSERT INTO meta (k, v) VALUES ('epoch', '1') ON CONFLICT(k) DO UPDATE SET v = CAST(v AS INTEGER) + 1" }, // buộc mọi client tải lại
    { sql: "INSERT OR REPLACE INTO meta (k, v) VALUES ('last_sync', ?1)", args: [String(gen)] },
  ]);
  return { rows: leaves.length, users: nUsers };
}
