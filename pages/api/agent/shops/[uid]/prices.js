import { guard, fail } from '../../../../../lib/crawler/apiAuth.mjs';
import { rtdb } from '../../../../../lib/crawler/store.mjs';
import { parsePrice } from '../../../../../lib/crawler/engine.mjs';

const UID_RE = /^[A-Za-z0-9]{10,40}$/;

const clean = (list) => {
  const out = [], bad = [];
  (Array.isArray(list) ? list : []).forEach((p, i) => {
    const mua = parsePrice(p.mua), ban = parsePrice(p.ban);
    if (!p.name || !(mua > 0 || ban > 0)) { bad.push({ index: i, item: p }); return; }
    out.push({ name: String(p.name).trim(), mua: String(mua > 0 ? mua : 0), ban: String(ban > 0 ? ban : 0) });
  });
  return { out, bad };
};

// Bảng giá TV của 1 tiệm: tv_sessions/{uid}/prices = [{name, mua, ban}]
export default async function handler(req, res) {
  if (!guard(req, res, ['GET', 'PUT', 'POST'])) return;
  const { uid } = req.query;
  if (!UID_RE.test(uid)) return res.status(400).json({ error: 'uid không hợp lệ' });
  try {
    const path = `tv_sessions/${uid}/prices`;
    const exists = await rtdb('GET', `tv_sessions/${uid}/plan`);
    if (exists === null) return res.status(404).json({ error: 'Không có tiệm này' });
    const current = (await rtdb('GET', path)) || [];
    const arr = Array.isArray(current) ? current : Object.values(current);
    if (req.method === 'GET') return res.status(200).json({ uid, prices: arr });

    const { out, bad } = clean((req.body || {}).prices);
    if (!out.length) return res.status(400).json({ error: 'prices phải là mảng [{name,mua,ban}] không rỗng', bad });
    let next = out;
    if (req.method === 'POST') {
      next = arr.map((p) => ({ ...p }));
      for (const p of out) {
        const i = next.findIndex((x) => String(x.name).trim().toLowerCase() === p.name.toLowerCase());
        if (i >= 0) next[i] = { ...next[i], ...p }; else next.push(p);
      }
    }
    await rtdb('PUT', path, next);
    return res.status(200).json({ uid, count: next.length, skipped: bad });
  } catch (e) { return fail(res, e); }
}
