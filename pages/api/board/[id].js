// Proxy đọc bảng giá từ Firebase RTDB (REST) qua chính domain của app.
// Dùng làm đường dự phòng khi mạng của TV chặn trực tiếp *.firebasedatabase.app.
// Trên VPS dự phòng (FALLBACK_CACHE_DIR): mỗi lần đọc được sẽ lưu file; Firebase lỗi thì trả file.
import { isValidId, fetchFromFirebase, writeCache, readCache, cacheDir } from '../../../lib/boardCache';

export default async function handler(req, res) {
  // TV chạy trên domain chính có thể gọi sang domain dự phòng.
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const { id } = req.query;
  if (!isValidId(id)) return res.status(400).json({ error: 'bad id' });

  try {
    const data = await fetchFromFirebase(id);
    if (cacheDir()) writeCache(id, data).catch(() => {});
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=5');
    return res.status(200).json({ v: data });
  } catch (e) {
    const cached = await readCache(id);
    if (cached && cached.v) {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Board-Source', 'cache');
      return res.status(200).json({ v: cached.v, ts: cached.ts, stale: true });
    }
    return res.status(502).json({ error: 'upstream failed' });
  }
}
