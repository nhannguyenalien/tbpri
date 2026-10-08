import { guard, fail } from '../../../../../lib/crawler/apiAuth.mjs';
import { rtdb, getConfig, ID_RE } from '../../../../../lib/crawler/store.mjs';
import { validateConfig } from '../../../../../lib/crawler/engine.mjs';

export default async function handler(req, res) {
  if (!guard(req, res, ['GET', 'PUT', 'PATCH', 'DELETE'])) return;
  const { id } = req.query;
  if (!ID_RE.test(id)) return res.status(400).json({ error: 'id không hợp lệ' });
  try {
    const current = await getConfig(id);
    if (req.method === 'GET') {
      if (!current) return res.status(404).json({ error: 'Không có config này' });
      const prices = await rtdb('GET', `external_prices/sources/${id}`);
      return res.status(200).json({ id, config: current, prices });
    }
    if (req.method === 'DELETE') {
      if (!current) return res.status(404).json({ error: 'Không có config này' });
      const purge = req.query.purge === '1' || req.query.purge === 'true';
      const updates = { [`crawler_configs/${id}`]: null };
      if (purge) { updates[`external_prices/sources/${id}`] = null; updates[`external_history/${id}`] = null; }
      await rtdb('PATCH', '', updates);
      return res.status(200).json({ deleted: id, purged: purge });
    }
    let next = req.body;
    if (req.method === 'PATCH') {
      if (!current) return res.status(404).json({ error: 'Không có config để sửa (dùng PUT để tạo mới)' });
      next = { ...current, ...(req.body || {}) };
      for (const k of Object.keys(next)) if (next[k] === null) delete next[k]; // null = xoá field
    }
    const v = validateConfig(next);
    if (!v.ok) return res.status(400).json({ error: 'Config không hợp lệ', details: v.errors });
    await rtdb('PUT', `crawler_configs/${id}`, v.clean);
    return res.status(200).json({ id, config: v.clean, created: !current });
  } catch (e) { return fail(res, e); }
}
