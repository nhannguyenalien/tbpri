// Engine quét giá: đọc 1 config (HTML hoặc API JSON) -> mảng items chuẩn hoá.
// Không đụng Firebase ở đây (xem store.mjs) nên chạy được cả trong script test lẫn API route.
import * as cheerio from 'cheerio';

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

// Slug phải trùng công thức của dashboard (pages/index.js) để tra lịch sử giá.
export const slugify = (label) => String(label).toLowerCase().replace(/[^a-z0-9]/g, '_');

export const formatVND = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const CONFIG_KEYS = [
  'name', 'enabled', 'type', 'url', 'row_selector', 'name_selector', 'buy_selector',
  'sell_selector', 'api_url', 'data_path', 'mapping', 'transform', 'include', 'exclude',
  'headers', 'fallbacks', 'note', 'unit', 'remove_comma',
];

// ---------- an toàn: chặn gọi vào mạng nội bộ ----------
export function assertPublicUrl(raw) {
  let u;
  try { u = new URL(raw); } catch { throw new Error(`URL không hợp lệ: ${raw}`); }
  if (!/^https?:$/.test(u.protocol)) throw new Error('Chỉ cho phép http/https');
  const h = u.hostname.toLowerCase();
  const bad =
    h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal') ||
    h === '[::1]' || /^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) ||
    /^169\.254\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h) || /^0\./.test(h);
  if (bad) throw new Error(`Không cho phép host nội bộ: ${h}`);
  return u;
}

// ---------- validate config ----------
export function validateConfig(cfg) {
  const errors = [];
  if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) return { ok: false, errors: ['config phải là object'] };
  const clean = {};
  for (const k of CONFIG_KEYS) if (cfg[k] !== undefined) clean[k] = cfg[k];
  const unknown = Object.keys(cfg).filter((k) => !CONFIG_KEYS.includes(k));
  if (unknown.length) errors.push(`field không hỗ trợ: ${unknown.join(', ')}`);

  // Schema cũ để unit / remove_comma ở gốc config -> gộp vào transform.
  if (clean.unit !== undefined || clean.remove_comma !== undefined) {
    clean.transform = { ...(clean.transform || {}) };
    if (clean.unit && !clean.transform.unit) clean.transform.unit = clean.unit;
    if (clean.remove_comma !== undefined && clean.transform.remove_comma === undefined) clean.transform.remove_comma = clean.remove_comma;
    delete clean.unit; delete clean.remove_comma;
  }
  if (!clean.name || typeof clean.name !== 'string') errors.push('thiếu name');
  if (clean.enabled === undefined) clean.enabled = true;
  if (typeof clean.enabled !== 'boolean') errors.push('enabled phải là boolean');
  if (!clean.type) clean.type = clean.api_url ? 'api' : 'html';
  if (!['html', 'api'].includes(clean.type)) errors.push('type chỉ nhận "html" hoặc "api"');

  if (clean.type === 'api') {
    if (!clean.api_url) errors.push('type=api cần api_url');
    const m = clean.mapping;
    if (!m || !m.name || !m.buy || !m.sell) errors.push('type=api cần mapping {name, buy, sell}');
  } else {
    if (!clean.url) errors.push('type=html cần url');
    for (const f of ['row_selector', 'name_selector', 'buy_selector', 'sell_selector'])
      if (!clean[f]) errors.push(`type=html cần ${f}`);
  }
  for (const f of ['url', 'api_url']) {
    if (clean[f]) { try { assertPublicUrl(clean[f]); } catch (e) { errors.push(`${f}: ${e.message}`); } }
  }
  for (const f of ['include', 'exclude']) {
    if (clean[f] !== undefined) {
      try { new RegExp(clean[f], 'i'); } catch { errors.push(`${f} không phải regex hợp lệ`); }
    }
  }
  if (clean.headers && (typeof clean.headers !== 'object' || Object.values(clean.headers).some((v) => typeof v !== 'string')))
    errors.push('headers phải là object {tên: "giá trị"}');
  if (clean.fallbacks !== undefined) {
    if (!Array.isArray(clean.fallbacks)) errors.push('fallbacks phải là mảng');
    else clean.fallbacks.forEach((fb, i) => {
      const merged = { ...clean, ...fb, fallbacks: undefined };
      const r = validateConfig(merged);
      if (!r.ok) errors.push(`fallbacks[${i}]: ${r.errors.join('; ')}`);
    });
  }
  return { ok: errors.length === 0, errors, clean };
}

// ---------- fetch ----------
async function fetchText(url, cfg = {}, timeoutMs = 15000) {
  assertPublicUrl(url);
  const origin = new URL(url).origin;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/json,application/xhtml+xml,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.5',
        Referer: origin + '/',
        ...(cfg.headers || {}),
      },
    });
    const text = await res.text();
    if (!res.ok) {
      const blocked = /just a moment|cf-chl|attention required/i.test(text) ? ' (bị Cloudflare chặn)' : '';
      throw new Error(`HTTP ${res.status}${blocked}`);
    }
    if (/<title>\s*just a moment/i.test(text)) throw new Error('Bị Cloudflare chặn (challenge)');
    return { text, status: res.status };
  } catch (e) {
    if (e.name === 'AbortError') throw new Error(`Timeout sau ${timeoutMs / 1000}s`);
    const cause = e.cause && (e.cause.code || e.cause.message);
    throw new Error(cause ? `${e.message} (${cause})` : e.message);
  } finally {
    clearTimeout(t);
  }
}

// ---------- parse giá ----------
// "13,170" / "13.170.000đ" / 14250 / "14250.0" -> số nguyên VNĐ (áp dụng unit nếu có)
export function parsePrice(raw, transform = {}) {
  if (raw === null || raw === undefined) return NaN;
  let s = String(raw).trim();
  if (typeof raw === 'number' && !Number.isInteger(raw)) s = String(Math.round(raw));
  // bỏ phần thập phân kiểu "14250.00" (chỉ khi đúng 1-2 chữ số sau dấu chấm cuối và không phải nhóm nghìn)
  s = s.replace(/[.,]\d{1,2}$/, '');
  const digits = s.replace(/\D/g, '');
  if (!digits) return NaN;
  let n = parseInt(digits, 10);
  const unit = String(transform.unit || '');
  const m = unit.match(/^x(\d+)$/i);
  if (m) n *= parseInt(m[1], 10);
  return n;
}

const getPath = (obj, path) => {
  if (!path) return obj;
  return String(path).split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
};

function finishItems(rawItems, cfg) {
  const inc = cfg.include ? new RegExp(cfg.include, 'i') : null;
  const exc = cfg.exclude ? new RegExp(cfg.exclude, 'i') : null;
  const seen = new Set();
  const items = [];
  for (const it of rawItems) {
    const label = String(it.label || '').replace(/\s+/g, ' ').trim();
    if (!label) continue;
    if (inc && !inc.test(label)) continue;
    if (exc && exc.test(label)) continue;
    const buy = parsePrice(it.buy, cfg.transform);
    const sell = parsePrice(it.sell, cfg.transform);
    // Cần ít nhất 1 giá hợp lệ; nguồn chỉ có 1 chiều thì chiều kia = 0 (TV hiển thị "0").
    if (!(buy > 0) && !(sell > 0)) continue;
    const slug = slugify(label);
    if (seen.has(slug)) continue; // trùng slug -> giữ dòng đầu, dashboard tra lịch sử theo slug
    seen.add(slug);
    items.push({ label, buy: formatVND(buy > 0 ? buy : 0), sell: formatVND(sell > 0 ? sell : 0), order: items.length + 1 });
  }
  return items;
}

// ---------- quét 1 nguồn ----------
async function extract(cfg, timeoutMs) {
  const diag = {};
  if (cfg.type === 'api') {
    const { text, status } = await fetchText(cfg.api_url, cfg, timeoutMs);
    diag.http = status;
    let json;
    try { json = JSON.parse(text); } catch { throw new Error('API không trả JSON hợp lệ'); }
    const list = getPath(json, cfg.data_path);
    if (!Array.isArray(list)) throw new Error(`data_path "${cfg.data_path || ''}" không trỏ tới mảng`);
    diag.rows = list.length;
    const m = cfg.mapping;
    const raw = list.map((r) => ({ label: getPath(r, m.name), buy: getPath(r, m.buy), sell: getPath(r, m.sell) }));
    return { raw, diag };
  }
  const { text, status } = await fetchText(cfg.url, cfg, timeoutMs);
  diag.http = status;
  const $ = cheerio.load(text);
  diag.title = $('title').first().text().trim().slice(0, 80);
  const rows = $(cfg.row_selector);
  diag.rows = rows.length;
  if (!rows.length) throw new Error(`row_selector "${cfg.row_selector}" không khớp dòng nào`);
  const raw = [];
  rows.each((_, tr) => {
    const row = $(tr);
    const pick = (sel) => row.find(sel).first().text();
    raw.push({ label: pick(cfg.name_selector), buy: pick(cfg.buy_selector), sell: pick(cfg.sell_selector) });
  });
  return { raw, diag };
}

// Trả về { ok, items, diag, via, error }. Không ném lỗi.
export async function crawlSource(cfg, { timeoutMs = 15000 } = {}) {
  const attempts = [cfg, ...(cfg.fallbacks || []).map((fb) => ({ ...cfg, ...fb, fallbacks: undefined }))];
  const errors = [];
  for (let i = 0; i < attempts.length; i++) {
    const c = attempts[i];
    try {
      const { raw, diag } = await extract(c, timeoutMs);
      const items = finishItems(raw, c);
      diag.items = items.length;
      if (!items.length) throw new Error(`Đọc được ${diag.rows} dòng nhưng không dòng nào có tên + giá hợp lệ (kiểm tra selector/mapping)`);
      return { ok: true, items, diag, via: i === 0 ? 'primary' : `fallback[${i - 1}]`, errors };
    } catch (e) {
      errors.push(`${i === 0 ? 'primary' : `fallback[${i - 1}]`}: ${e.message}`);
    }
  }
  return { ok: false, items: [], diag: {}, via: null, errors, error: errors.join(' | ') };
}
