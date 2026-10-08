import { guard, fail } from '../../../../../lib/crawler/apiAuth.mjs';
import { getConfig, ID_RE } from '../../../../../lib/crawler/store.mjs';
import { validateConfig, crawlSource } from '../../../../../lib/crawler/engine.mjs';

export const config = { maxDuration: 60 };

// Quét thử, KHÔNG ghi gì. Body {config} để thử config chưa lưu.
export default async function handler(req, res) {
  if (!guard(req, res, ['POST'])) return;
  const { id } = req.query;
  if (!ID_RE.test(id)) return res.status(400).json({ error: 'id không hợp lệ' });
  try {
    const cfg = (req.body && req.body.config) || (await getConfig(id));
    if (!cfg) return res.status(404).json({ error: 'Không có config; truyền {"config":{...}} để thử' });
    const v = validateConfig(cfg);
    if (!v.ok) return res.status(400).json({ error: 'Config không hợp lệ', details: v.errors });
    const r = await crawlSource(v.clean);
    return res.status(200).json({ id, ok: r.ok, via: r.via, count: r.items.length, diag: r.diag, errors: r.errors, items: r.items });
  } catch (e) { return fail(res, e); }
}
