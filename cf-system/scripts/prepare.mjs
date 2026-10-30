// Dựng thư mục .build = giao diện của app chính (pages/, style/) + lớp thay thế Firebase bằng Turso (overlay/).
// App chính không bị sửa; mỗi lần build đều lấy bản mới nhất của giao diện.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');          // cf-system/
const main = path.join(root, '..');          // repo chính
const out = path.join(root, '.build');

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const copy = (from, to, filter) => fs.cpSync(from, to, { recursive: true, filter });
// pages/ của app chính, bỏ api/ (api của hệ thống này nằm trong overlay)
copy(path.join(main, 'pages'), path.join(out, 'pages'), (src) => !src.startsWith(path.join(main, 'pages', 'api')));
copy(path.join(main, 'style'), path.join(out, 'style'));
fs.mkdirSync(path.join(out, 'lib'), { recursive: true });
fs.copyFileSync(path.join(main, 'lib', 'auth.js'), path.join(out, 'lib', 'auth.js'));
fs.copyFileSync(path.join(main, 'postcss.config.mjs'), path.join(out, 'postcss.config.mjs'));
copy(path.join(root, 'overlay'), out);       // đè lên: lib/firebase.js, lib/compat, lib/server, pages/api, next.config.js
for (const f of ['open-next.config.ts', 'wrangler.jsonc']) {
  if (fs.existsSync(path.join(root, f))) fs.copyFileSync(path.join(root, f), path.join(out, f));
}
fs.writeFileSync(path.join(out, 'package.json'), JSON.stringify({ name: 'goldprice-cf-build', private: true, type: 'module', scripts: { build: 'next build' } }, null, 2));
console.log('prepared', out);
