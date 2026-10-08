import { guard, fail } from '../../../../lib/crawler/apiAuth.mjs';
import { rtdb, listConfigs, ID_RE } from '../../../../lib/crawler/store.mjs';
import { validateConfig } from '../../../../lib/crawler/engine.mjs';

export default async function handler(req, res) {
  if (!guard(req, res, ['GET', 'POST'])) return;
  try {
    if (req.method === 'GET') {
      const [configs, status] = await Promise.all([listConfigs(), rtdb('GET', 'external_prices/sources')]);
      const out = {};
      for (const [id, cfg] of Object.entries(configs)) {
        const s = (status || {})[id] || {};
        out[id] = { config: cfg, status: s.status || null, lastCheck: s.lastCheck || null, lastError: s.lastError || null, items: Object.keys(s.items || {}).length };
      }
      return res.status(200).json({ count: Object.keys(out).length, sources: out });
    }
    // POST: {id, config} hoặc {configs: {id: config}}
    const body = req.body || {};
    const entries = body.configs ? Object.entries(body.configs) : body.id ? [[body.id, body.config]] : [];
    if (!entries.length) return res.status(400).json({ error: 'Cần {"id","config"} hoặc {"configs":{id:config}}' });
    const saved = {}, errors = {};
    for (const [id, cfg] of entries) {
      if (!ID_RE.test(id)) { errors[id] = 'id chỉ gồm a-z 0-9 _ (2-40 ký tự)'; continue; }
      const v = validateConfig(cfg);
      if (!v.ok) { errors[id] = v.errors; continue; }
      await rtdb('PUT', `crawler_configs/${id}`, v.clean);
      saved[id] = v.clean;
    }
    return res.status(Object.keys(errors).length && !Object.keys(saved).length ? 400 : 200).json({ saved: Object.keys(saved), errors });
  } catch (e) { return fail(res, e); }
}
