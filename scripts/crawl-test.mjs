// Chạy thử crawler (KHÔNG ghi Firebase): node scripts/crawl-test.mjs [id ...] [--file path.json]
import { readFileSync } from 'node:fs';
import { crawlSource, validateConfig } from '../lib/crawler/engine.mjs';

const args = process.argv.slice(2);
const fi = args.indexOf('--file');
const file = fi >= 0 ? args[fi + 1] : new URL('./crawler-configs.snapshot.json', import.meta.url).pathname;
const ids = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--file');
const configs = JSON.parse(readFileSync(file, 'utf8'));

for (const [id, cfg] of Object.entries(configs)) {
  if (ids.length && !ids.includes(id)) continue;
  const v = validateConfig(cfg);
  if (!v.ok) { console.log(`✗ ${id}: config sai: ${v.errors.join('; ')}`); continue; }
  const r = await crawlSource(v.clean);
  if (r.ok) {
    console.log(`✓ ${id} [${r.via}] ${r.items.length} loại (rows=${r.diag.rows})`);
    r.items.slice(0, 4).forEach((i) => console.log(`    ${i.label} | mua ${i.buy} | bán ${i.sell}`));
  } else console.log(`✗ ${id}: ${r.error}`);
}
