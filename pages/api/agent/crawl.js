import { guard, fail } from '../../../lib/crawler/apiAuth.mjs';
import { runCrawl } from '../../../lib/crawler/store.mjs';

export const config = { maxDuration: 60 };

// GET (cron) hoặc POST. ids=a,b  dryRun=1
export default async function handler(req, res) {
  if (!guard(req, res, ['GET', 'POST'])) return;
  try {
    const src = { ...req.query, ...(req.body || {}) };
    const ids = Array.isArray(src.ids) ? src.ids : src.ids ? String(src.ids).split(',').map((s) => s.trim()).filter(Boolean) : undefined;
    const dryRun = src.dryRun === true || src.dryRun === '1' || src.dryRun === 'true';
    return res.status(200).json(await runCrawl({ ids, dryRun }));
  } catch (e) { return fail(res, e); }
}
