// Xuất dữ liệu sao lưu ra JSON để kiểm tra/khôi phục (chạy trong container: node restore.mjs ...).
//   node restore.mjs list         -> liệt kê snapshot RTDB
//   node restore.mjs rtdb [ts]    -> in toàn bộ RTDB (mới nhất hoặc theo ts) ra stdout
//   node restore.mjs auth         -> in user Auth dạng { users: [...] } (dùng cho accounts:batchCreate / auth:import)
import { DatabaseSync } from 'node:sqlite';
import { gunzipSync } from 'node:zlib';

const db = new DatabaseSync(process.env.DB_PATH || '/data/boards.db');
const [cmd, arg] = process.argv.slice(2);

if (cmd === 'list') {
  for (const r of db.prepare('SELECT ts, bytes FROM snapshots ORDER BY ts DESC').all()) {
    console.log(new Date(r.ts).toISOString(), `${r.bytes} bytes(gz)`, r.ts);
  }
} else if (cmd === 'rtdb') {
  const r = arg
    ? db.prepare('SELECT data FROM snapshots WHERE ts = ?').get(Number(arg))
    : db.prepare('SELECT data FROM snapshots ORDER BY ts DESC LIMIT 1').get();
  if (!r) { console.error('không có snapshot'); process.exit(1); }
  process.stdout.write(gunzipSync(r.data).toString('utf8'));
} else if (cmd === 'auth') {
  console.log(JSON.stringify({ users: db.prepare('SELECT data FROM auth_users').all().map((r) => JSON.parse(r.data)) }));
} else {
  console.error('dùng: node restore.mjs list | rtdb [ts] | auth');
  process.exit(1);
}
