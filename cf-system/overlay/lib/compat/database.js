// Bản thay thế `firebase/database` (phần app đang dùng), nói chuyện với /api/db trên Turso.
// onValue = polling kiểm tra số phiên bản (rẻ: 1 dòng/lần), chỉ tải lại dữ liệu khi có đổi.
const API = '/api/db';
const POLL_MS = 6000;
const DB = { __compat: true };
const listeners = new Set();
const conn = { ok: null, subs: new Set() };

const norm = (p) => String(p || '').split('/').filter(Boolean).join('/');
const clone = (v) => (v === null || v === undefined ? null : JSON.parse(JSON.stringify(v)));

class Ref {
  constructor(path) { this.path = path; this.key = path ? path.split('/').pop() : null; }
  get parent() { const i = this.path.lastIndexOf('/'); return this.path ? new Ref(i < 0 ? '' : this.path.slice(0, i)) : null; }
  get root() { return new Ref(''); }
  toString() { return `/${this.path}`; }
}

class Snapshot {
  constructor(path, val) { this.ref = new Ref(path); this.key = this.ref.key; this._v = val === undefined ? null : val; }
  exists() { return this._v !== null; }
  val() { return clone(this._v); }
  exportVal() { return clone(this._v); }
  hasChildren() { return this._v !== null && typeof this._v === 'object' && Object.keys(this._v).length > 0; }
  numChildren() { return this.hasChildren() ? Object.keys(this._v).length : 0; }
  child(p) {
    let v = this._v;
    for (const s of norm(p).split('/').filter(Boolean)) v = v && typeof v === 'object' ? v[s] : null;
    return new Snapshot(norm(`${this.ref.path}/${p}`), v);
  }
  hasChild(p) { return this.child(p).exists(); }
  forEach(cb) {
    if (!this.hasChildren()) return false;
    for (const k of Object.keys(this._v)) if (cb(new Snapshot(`${this.ref.path}/${k}`.replace(/^\//, ''), this._v[k])) === true) return true;
    return false;
  }
}

export function getDatabase() { return DB; }
export function ref(_db, path = '') { return new Ref(norm(path)); }
export function child(r, p) { return new Ref(norm(`${r.path}/${p}`)); }
export const serverTimestamp = () => ({ '.sv': 'timestamp' });

function setConn(ok) {
  if (conn.ok === ok) return;
  conn.ok = ok;
  conn.subs.forEach((f) => f(ok));
}

async function fetchNode(path, since) {
  const q = new URLSearchParams({ path });
  if (since !== undefined && since !== null) q.set('v', String(since));
  let r;
  try { r = await fetch(`${API}?${q}`, { credentials: 'same-origin', cache: 'no-store' }); }
  catch (e) { setConn(false); throw Object.assign(new Error('network'), { network: true }); }
  setConn(true);
  if (r.status === 403) throw Object.assign(new Error('permission_denied'), { code: 'PERMISSION_DENIED' });
  if (!r.ok) throw Object.assign(new Error(`HTTP ${r.status}`), { network: r.status >= 500 });
  return r.json();
}

async function send(op, path, value) {
  const r = await fetch(API, {
    method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ op, path, value }),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw Object.assign(new Error(j.why || j.error || `HTTP ${r.status}`), { code: r.status === 403 ? 'PERMISSION_DENIED' : 'ERROR' });
  }
  // Làm tươi ngay các listener liên quan để UI cập nhật tức thì sau khi ghi.
  listeners.forEach((l) => { if (path === '' || l.path === '' || l.path.startsWith(path) || path.startsWith(l.path)) l.refresh(); });
}

export function onValue(r, cb, errCb) {
  if (r.path === '.info/connected') {
    const f = (ok) => cb(new Snapshot('.info/connected', ok));
    conn.subs.add(f);
    if (conn.ok !== null) f(conn.ok);
    return () => conn.subs.delete(f);
  }
  let ver = null, timer = null, stopped = false, busy = false;
  const l = {
    path: r.path,
    async refresh() {
      if (stopped || busy) return;
      busy = true;
      try {
        const j = await fetchNode(r.path, ver);
        if (stopped) return;
        if (!j.same) { ver = j.v; cb(new Snapshot(r.path, j.data)); }
      } catch (e) {
        if (e.code === 'PERMISSION_DENIED' && errCb) { errCb(e); stopped = true; }
      } finally { busy = false; }
    },
  };
  const loop = async () => {
    if (stopped) return;
    if (!document.hidden) await l.refresh();
    if (!stopped) timer = setTimeout(loop, POLL_MS);
  };
  listeners.add(l);
  loop();
  return () => { stopped = true; clearTimeout(timer); listeners.delete(l); };
}

export async function get(r) {
  const j = await fetchNode(r.path);
  return new Snapshot(r.path, j.data);
}
export async function set(r, value) { await send('set', r.path, value === undefined ? null : value); }
export async function update(r, values) { await send('update', r.path, values); }
export async function remove(r) { await send('remove', r.path, null); }

const ALPHABET = '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';
let lastTs = 0, lastRand = [];
function pushId() { // giống thuật toán push id của Firebase: sắp xếp được theo thời gian
  let now = Date.now(); const dup = now === lastTs; lastTs = now;
  const ts = new Array(8);
  for (let i = 7; i >= 0; i--) { ts[i] = ALPHABET.charAt(now % 64); now = Math.floor(now / 64); }
  let id = ts.join('');
  if (!dup) { lastRand = Array.from({ length: 12 }, () => Math.floor(Math.random() * 64)); }
  else { let i = 11; for (; i >= 0 && lastRand[i] === 63; i--) lastRand[i] = 0; if (i >= 0) lastRand[i]++; }
  return id + lastRand.map((n) => ALPHABET.charAt(n)).join('');
}
export function push(r, value) {
  const p = norm(`${r.path}/${pushId()}`);
  const plain = new Ref(p);
  const thenable = new Ref(p);
  if (value !== undefined) {
    const prom = set(plain, value);
    thenable.then = (a, b) => prom.then(() => plain).then(a, b);
    thenable.catch = (b) => prom.catch(b);
  }
  return thenable;
}
