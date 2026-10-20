// Proxy đọc bảng giá từ Firebase RTDB (REST) qua chính domain của app.
// Dùng làm đường dự phòng khi mạng của TV chặn trực tiếp *.firebasedatabase.app.
const DB_URL = 'https://pricegold-4925d-default-rtdb.asia-southeast1.firebasedatabase.app';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { id } = req.query;
  if (!id || !/^[\w-]{1,128}$/.test(id)) {
    return res.status(400).json({ error: 'bad id' });
  }
  try {
    const r = await fetch(`${DB_URL}/tv_sessions/${encodeURIComponent(id)}.json`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return res.status(502).json({ error: `upstream ${r.status}` });
    const data = await r.json();
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=5');
    return res.status(200).json({ v: data });
  } catch (e) {
    return res.status(502).json({ error: 'upstream failed' });
  }
}
