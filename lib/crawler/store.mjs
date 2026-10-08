// Đọc/ghi Realtime Database bằng REST với quyền admin (rules chỉ cho ADMIN_UID ghi
// crawler_configs / external_prices / external_history).
//
// Cách cấp quyền (chọn 1, ưu tiên cách 1):
//   1. FIREBASE_SERVICE_ACCOUNT = JSON service account (hoặc base64 của JSON)  -> bỏ qua rules
//   2. FIREBASE_ADMIN_EMAIL + FIREBASE_ADMIN_PASSWORD = tài khoản admin (uid = ADMIN_UID)
import { createSign } from 'node:crypto';
import { crawlSource, slugify, validateConfig } from './engine.mjs';

const DB_URL = 'https://pricegold-4925d-default-rtdb.asia-southeast1.firebasedatabase.app';
const WEB_API_KEY = 'AIzaSyDxaz1uBWKpDZ-J7qRX81BajLHrOmfVyM0'; // public (có sẵn trong lib/firebase.js)
const HISTORY_DAYS = 7;

let tokenCache = null; // { kind: 'access_token' | 'auth', value, exp }

const b64url = (b) => Buffer.from(b).toString('base64url');

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  const txt = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  const sa = JSON.parse(txt);
  return { ...sa, private_key: String(sa.private_key).replace(/\\n/g, '\n') };
}

async function mintServiceToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const sig = createSign('RSA-SHA256').update(`${head}.${claim}`).sign(sa.private_key, 'base64url');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${head}.${claim}.${sig}`,
    }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`Service account bị từ chối: ${j.error_description || j.error}`);
  return { kind: 'access_token', value: j.access_token, exp: Date.now() + (j.expires_in - 120) * 1000 };
}

async function signInAdmin() {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${WEB_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.FIREBASE_ADMIN_EMAIL,
      password: process.env.FIREBASE_ADMIN_PASSWORD,
      returnSecureToken: true,
    }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`Đăng nhập admin thất bại: ${j.error && j.error.message}`);
  return { kind: 'auth', value: j.idToken, exp: Date.now() + (Number(j.expiresIn) - 120) * 1000 };
}

async function getToken() {
  if (tokenCache && tokenCache.exp > Date.now()) return tokenCache;
  const sa = loadServiceAccount();
  if (sa) tokenCache = await mintServiceToken(sa);
  else if (process.env.FIREBASE_ADMIN_EMAIL && process.env.FIREBASE_ADMIN_PASSWORD) tokenCache = await signInAdmin();
  else throw new Error('Chưa cấu hình quyền ghi Firebase: đặt FIREBASE_SERVICE_ACCOUNT (hoặc FIREBASE_ADMIN_EMAIL + FIREBASE_ADMIN_PASSWORD)');
  return tokenCache;
}

// path: 'external_prices/sources/pnj' ; query: { orderBy: '"$key"', limitToLast: 5 }
export async function rtdb(method, path, body, query = {}) {
  const tok = await getToken();
  const qs = new URLSearchParams({ ...query, [tok.kind]: tok.value });
  const res = await fetch(`${DB_URL}/${path}.json?${qs}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error(`RTDB ${method} /${path}: ${res.status} ${(data && data.error) || text}`);
  return data;
}

export const isConfigured = () =>
  !!(process.env.FIREBASE_SERVICE_ACCOUNT || (process.env.FIREBASE_ADMIN_EMAIL && process.env.FIREBASE_ADMIN_PASSWORD));

// ---------- configs ----------
export const ID_RE = /^[a-z0-9_]{2,40}$/;

export async function listConfigs() {
  return (await rtdb('GET', 'crawler_configs')) || {};
}

export async function getConfig(id) {
  return rtdb('GET', `crawler_configs/${id}`);
}

// ---------- ghi giá 1 nguồn (dùng chung cho crawler và API push giá thủ công) ----------
// items: [{label, buy, sell, order}] đã chuẩn hoá. Chỉ ghi lịch sử khi giá đổi.
export async function writeSourcePrices(id, name, items, { replace = true } = {}) {
  const now = Date.now();
  const prev = (await rtdb('GET', `external_prices/sources/${id}/items`)) || {};
  const hist = (await rtdb('GET', `external_history/${id}`)) || {};
  const cutoff = now - HISTORY_DAYS * 24 * 3600 * 1000;

  const next = replace ? {} : { ...prev };
  const updates = {};
  let changed = 0;
  for (const it of items) {
    const slug = slugify(it.label);
    const old = prev[slug];
    const same = old && old.buy === it.buy && old.sell === it.sell;
    next[slug] = {
      label: it.label, buy: it.buy, sell: it.sell, order: it.order,
      updatedAt: same ? old.updatedAt : now,
    };
    if (!same) {
      changed++;
      updates[`external_history/${id}/${slug}/${now}`] = { buy: it.buy, sell: it.sell };
    }
  }
  // dọn lịch sử quá hạn
  for (const [slug, points] of Object.entries(hist)) {
    for (const ts of Object.keys(points || {})) {
      if (Number(ts) < cutoff) updates[`external_history/${id}/${slug}/${ts}`] = null;
    }
  }
  updates[`external_prices/sources/${id}`] = { name, status: 'online', lastCheck: now, items: next };
  await rtdb('PATCH', '', updates);
  return { count: items.length, changed };
}

export async function markOffline(id, error) {
  const now = Date.now();
  await rtdb('PATCH', `external_prices/sources/${id}`, { status: 'offline', lastCheck: now, lastError: String(error).slice(0, 300) });
}

// ---------- chạy crawler ----------
// ids rỗng = tất cả config enabled. dryRun = chỉ quét, không ghi.
export async function runCrawl({ ids, dryRun = false, configs } = {}) {
  const all = configs || (await listConfigs());
  const targets = Object.entries(all).filter(([id, c]) => (ids && ids.length ? ids.includes(id) : c && c.enabled !== false));
  const results = await Promise.all(
    targets.map(async ([id, raw]) => {
      const v = validateConfig(raw);
      if (!v.ok) {
        if (!dryRun) await markOffline(id, `config sai: ${v.errors.join('; ')}`).catch(() => {});
        return { id, ok: false, error: `config sai: ${v.errors.join('; ')}` };
      }
      const r = await crawlSource(v.clean);
      if (!r.ok) {
        if (!dryRun) await markOffline(id, r.error).catch(() => {});
        return { id, ok: false, error: r.error };
      }
      let write = null;
      if (!dryRun) write = await writeSourcePrices(id, v.clean.name, r.items);
      return { id, ok: true, via: r.via, items: r.items.length, ...(write ? { changed: write.changed } : { preview: r.items.slice(0, 5) }) };
    })
  );
  return {
    dryRun,
    at: Date.now(),
    ok: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  };
}
