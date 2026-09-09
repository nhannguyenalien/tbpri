/**
 * Migration 1 lần: copy `expiry_date` (webhook cũ ghi) -> `premium_ends`
 * (field mà app thực sự đọc để hiển thị hạn Premium / đếm ngược).
 *
 * Chỉ đụng tài khoản có expiry_date > premium_ends hiện tại. Không đổi `plan`,
 * không cấp/thu quyền — chỉ sửa hiển thị hạn.
 *
 * Dùng:
 *   node scripts/migrate-premium-ends.mjs            # DRY-RUN, chỉ in ra
 *   node scripts/migrate-premium-ends.mjs --apply    # ghi thật vào Firebase
 *
 * (Chạy được vì RTDB rules hiện đang mở. Sau khi khoá rules (việc C) thì cần
 *  service account / token — nhưng migration này chỉ chạy 1 lần trước đó.)
 */

const DB = 'https://pricegold-4925d-default-rtdb.asia-southeast1.firebasedatabase.app';
const APPLY = process.argv.includes('--apply');

const fmt = (ms) => ms ? new Date(ms).toLocaleString('vi-VN') : '(trống)';

const all = await fetch(`${DB}/tv_sessions.json`).then((r) => r.json());
if (!all || typeof all !== 'object') {
  console.log('Không đọc được tv_sessions (rỗng hoặc lỗi quyền).');
  process.exit(all === null ? 0 : 1);
}

const now = Date.now();
const todo = [];
for (const [uid, s] of Object.entries(all)) {
  if (!s || typeof s !== 'object') continue;
  const legacy = Number(s.expiry_date) || 0;
  const current = Number(s.premium_ends) || 0;
  if (legacy > 0 && legacy > current) {
    todo.push({
      uid,
      shop: s.shop_name || '',
      plan: s.plan || '',
      from: current,
      to: legacy,
      expired: legacy < now,
    });
  }
}

console.log(`Tổng tài khoản: ${Object.keys(all).length}`);
console.log(`Cần cập nhật premium_ends: ${todo.length}\n`);
for (const t of todo) {
  console.log(
    ` - ${t.uid.slice(0, 8)}… | ${t.shop || '(không tên)'} | plan=${t.plan || '-'} | ` +
      `${fmt(t.from)} -> ${fmt(t.to)}${t.expired ? '  [đã hết hạn]' : ''}`
  );
}

if (!APPLY) {
  console.log('\n== DRY-RUN ==  Không ghi gì. Thêm --apply để thực hiện.');
  process.exit(0);
}

console.log('\n== ĐANG GHI ==');
let ok = 0;
let fail = 0;
for (const t of todo) {
  try {
    const res = await fetch(`${DB}/tv_sessions/${t.uid}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ premium_ends: t.to }),
    });
    if (res.ok) {
      ok++;
    } else {
      fail++;
      console.error(`  LỖI ${t.uid}: HTTP ${res.status}`);
    }
  } catch (e) {
    fail++;
    console.error(`  LỖI ${t.uid}: ${e.message}`);
  }
}
console.log(`\nXong: ${ok} thành công, ${fail} lỗi.`);
process.exit(fail ? 1 : 0);
