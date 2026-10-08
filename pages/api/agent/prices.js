import { guard, fail } from '../../../lib/crawler/apiAuth.mjs';
import { rtdb, writeSourcePrices, ID_RE } from '../../../lib/crawler/store.mjs';
import { slugify, parsePrice, formatVND } from '../../../lib/crawler/engine.mjs';

export default async function handler(req, res) {
  if (!guard(req, res, ['GET', 'POST', 'DELETE'])) return;
  try {
    const { source, label } = req.query;
    if (req.method === 'GET') {
      const data = await rtdb('GET', source ? `external_prices/sources/${source}` : 'external_prices/sources');
      return res.status(200).json(data || {});
    }
    if (req.method === 'DELETE') {
      if (!source || !label) return res.status(400).json({ error: 'Cần ?source=&label=' });
      await rtdb('DELETE', `external_prices/sources/${source}/items/${slugify(label)}`);
      return res.status(200).json({ deleted: label, source });
    }
    // POST: đẩy giá thủ công
    const b = req.body || {};
    if (!ID_RE.test(b.source || '')) return res.status(400).json({ error: 'source chỉ gồm a-z 0-9 _ (2-40 ký tự)' });
    if (!Array.isArray(b.items) || !b.items.length) return res.status(400).json({ error: 'items phải là mảng không rỗng' });
    const items = [], bad = [];
    b.items.forEach((it, i) => {
      const buy = parsePrice(it.buy, b.transform), sell = parsePrice(it.sell, b.transform);
      if (!it.label || !(buy > 0 || sell > 0)) { bad.push({ index: i, item: it, reason: 'thiếu label hoặc giá' }); return; }
      items.push({ label: String(it.label).trim(), buy: formatVND(buy > 0 ? buy : 0), sell: formatVND(sell > 0 ? sell : 0), order: it.order || i + 1 });
    });
    if (!items.length) return res.status(400).json({ error: 'Không có item hợp lệ', bad });
    const existing = await rtdb('GET', `external_prices/sources/${b.source}/name`);
    const name = b.name || existing || b.source;
    const r = await writeSourcePrices(b.source, name, items, { replace: b.replace === true });
    return res.status(200).json({ source: b.source, name, written: r.count, changed: r.changed, skipped: bad });
  } catch (e) { return fail(res, e); }
}
