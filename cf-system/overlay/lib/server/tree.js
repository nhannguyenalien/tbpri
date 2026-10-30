// Mô phỏng cây Realtime Database trên bảng kv (path -> lá JSON).
export const MAX_VALUE_BYTES = 1024 * 1024;
const BAD = /[.$#\[\]]/;

export function splitPath(p) {
  const segs = String(p || '').split('/').filter(Boolean);
  for (const s of segs) if (BAD.test(s) || s.length > 256) throw new Error('đường dẫn không hợp lệ');
  if (segs.length > 32) throw new Error('đường dẫn quá sâu');
  return segs;
}
export const joinPath = (segs) => segs.join('/');

// Khoá phiên bản: tầng 1 và tầng 2 của đường dẫn.
export function versionKeys(segs) {
  if (segs.length === 0) return ['*'];
  const ks = [segs[0]];
  if (segs.length > 1) ks.push(`${segs[0]}/${segs[1]}`);
  return ks;
}
export const readVersionKey = (segs) => (segs.length === 0 ? '*' : segs.length === 1 ? segs[0] : `${segs[0]}/${segs[1]}`);

const isObj = (v) => v !== null && typeof v === 'object';

export function resolveSentinels(v) {
  if (isObj(v)) {
    if (!Array.isArray(v) && v['.sv'] === 'timestamp' && Object.keys(v).length === 1) return Date.now();
    const out = Array.isArray(v) ? [] : {};
    for (const k of Object.keys(v)) out[k] = resolveSentinels(v[k]);
    return out;
  }
  return v;
}

// Làm phẳng giá trị thành các lá; null / object rỗng bị bỏ (giống RTDB).
export function flatten(value, base, out = []) {
  if (value === null || value === undefined) return out;
  if (isObj(value)) {
    for (const k of Object.keys(value)) {
      if (BAD.test(k) || k.includes('/')) throw new Error(`khoá không hợp lệ: ${k}`);
      flatten(value[k], base ? `${base}/${k}` : k, out);
    }
    return out;
  }
  if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('số không hợp lệ');
  out.push([base, JSON.stringify(value)]);
  return out;
}

function toArrays(node) {
  if (!isObj(node)) return node;
  const keys = Object.keys(node);
  for (const k of keys) node[k] = toArrays(node[k]);
  if (keys.length && keys.every((k) => /^(0|[1-9]\d*)$/.test(k))) {
    const max = Math.max(...keys.map(Number));
    if (max < keys.length * 2) { // giống RTDB: >= nửa số chỉ mục có giá trị thì coi là mảng
      const arr = [];
      for (let i = 0; i <= max; i++) arr.push(node[i] === undefined ? null : node[i]);
      return arr;
    }
  }
  return node;
}

export function buildTree(rows, base) {
  if (!rows.length) return null;
  if (rows.length === 1 && rows[0].path === base) return JSON.parse(rows[0].val);
  const root = {};
  const cut = base ? base.length + 1 : 0;
  for (const r of rows) {
    const segs = r.path.slice(cut).split('/');
    let n = root;
    for (let i = 0; i < segs.length - 1; i++) n = n[segs[i]] ??= {};
    n[segs[segs.length - 1]] = JSON.parse(r.val);
  }
  return toArrays(root);
}

export async function readTree(c, segs) {
  const base = joinPath(segs);
  const rs = base
    ? await c.execute({ sql: 'SELECT path, val FROM kv WHERE path = ?1 OR (path >= ?2 AND path < ?3)', args: [base, `${base}/`, `${base}0`] })
    : await c.execute('SELECT path, val FROM kv');
  return buildTree(rs.rows.map((r) => ({ path: String(r.path), val: String(r.val) })), base);
}

// Các câu lệnh SQL để ghi `value` vào `segs` (null = xoá) — gom lại để chạy trong 1 transaction.
export function writeStatements(segs, value) {
  const base = joinPath(segs);
  const stmts = [];
  stmts.push(base
    ? { sql: 'DELETE FROM kv WHERE path = ?1 OR (path >= ?2 AND path < ?3)', args: [base, `${base}/`, `${base}0`] }
    : { sql: 'DELETE FROM kv', args: [] });
  for (const [path, val] of flatten(resolveSentinels(value), base)) {
    stmts.push({ sql: 'INSERT OR REPLACE INTO kv (path, val, gen) VALUES (?1, ?2, 0)', args: [path, val] });
  }
  for (const k of versionKeys(segs)) {
    stmts.push({ sql: 'INSERT INTO versions (k, v) VALUES (?1, 1) ON CONFLICT(k) DO UPDATE SET v = v + 1', args: [k] });
  }
  return stmts;
}

export async function getVersion(c, key) {
  const rs = await c.execute({
    sql: "SELECT COALESCE((SELECT v FROM versions WHERE k = ?1), 0) + COALESCE((SELECT CAST(v AS INTEGER) FROM meta WHERE k = 'epoch'), 0) AS v",
    args: [key],
  });
  return Number(rs.rows[0].v);
}
