// Bản sao bảng giá ra file — chỉ bật trên VPS dự phòng (đặt FALLBACK_CACHE_DIR).
// Trên Vercel không đặt biến này nên mọi hàm ở đây là no-op.
const DB_URL = 'https://pricegold-4925d-default-rtdb.asia-southeast1.firebasedatabase.app';
const ID_RE = /^[\w-]{1,128}$/;

export const cacheDir = () => process.env.FALLBACK_CACHE_DIR || '';
export const isValidId = (id) => typeof id === 'string' && ID_RE.test(id);

export async function fetchFromFirebase(id) {
  const r = await fetch(`${DB_URL}/tv_sessions/${encodeURIComponent(id)}.json`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error(`firebase ${r.status}`);
  return r.json();
}

export async function writeCache(id, data) {
  const dir = cacheDir();
  if (!dir || data == null) return;
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `${id}.json`);
  await fs.writeFile(`${file}.tmp`, JSON.stringify({ ts: Date.now(), v: data }));
  await fs.rename(`${file}.tmp`, file);
}

export async function readCache(id) {
  const dir = cacheDir();
  if (!dir) return null;
  try {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    return JSON.parse(await fs.readFile(path.join(dir, `${id}.json`), 'utf8'));
  } catch (e) {
    return null;
  }
}

// Làm mới mọi id đã biết (mỗi lần chạy định kỳ). Lỗi từng id thì bỏ qua, giữ bản cũ.
export async function refreshAll() {
  const dir = cacheDir();
  if (!dir) return;
  const fs = await import('node:fs/promises');
  let files = [];
  try { files = await fs.readdir(dir); } catch (e) { return; }
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    const id = f.slice(0, -5);
    if (!isValidId(id)) continue;
    try { await writeCache(id, await fetchFromFirebase(id)); } catch (e) { /* giữ bản cũ */ }
  }
}
