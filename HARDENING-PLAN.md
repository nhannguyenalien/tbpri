# Kế hoạch làm cứng (hardening) — goldprice / tableg

Cập nhật: 2026-09-10 · Branch: `fix/production-hardening` · Đã push: `tbpri` (nhannguyenalien/tbpri)
`main`, `origin` (Vercel), `toidayhoc` — CHƯA đụng.

---

## 1. TRẠNG THÁI

- 8 commit trên `670a061`. Build pass mọi commit. Không đổi schema DB, không đụng RTDB Rules.
- Test bằng `next build` + smoke test trình duyệt (`/[id]`, `/landing`, `/premium`, `/connect`).
- Chưa deploy. Chưa chạy migration.

### Resume làm tiếp
```
cd ~/Desktop/spacehuge/goldprice
git checkout fix/production-hardening
npm install
npm run dev        # http://localhost:3000
# test bảng giá:   /mdEgge6YZcXO1RQmfKIZZaLRidF2
```

### Deploy (khi review xong)
```
git checkout main && git merge fix/production-hardening
git push origin main          # -> Vercel deploy production
```
Trước khi deploy: set env `WEBHOOK_SECRET` trên Vercel (giá trị mới). Chưa set thì
webhook vẫn chạy bằng fallback `"NHAN_GOLD_2026"` như cũ.

---

## 2. ĐÃ LÀM (8 commit)

| Commit | Việc | Test |
|---|---|---|
| `8395af9` | **webhook**: ghi đúng field `premium_ends` (+ giữ `expiry_date` đồng bộ); `SECRET_TOKEN` đọc từ `process.env.WEBHOOK_SECRET`, fallback chuỗi cũ | build |
| `1c7207a` | **`[id].js`**: cache localStorage chống trắng bảng giá TV; `onValue` có error callback + timeout 15s -> thông báo "WiFi có thể chặn, thử 4G / DNS 8.8.8.8"; badge `.info/connected`; sửa deps effect `router.query` -> `router.query.id` (hết leak listener) | browser: live render, cache ghi/đọc, timeout -> màn báo lỗi |
| `9553b3a` | **`[id].js`**: nền tối `#0a1f3d` cho màn "Đang kết nối" + màn báo lỗi (trước là chữ trắng / nền trắng, không đọc được) | screenshot |
| `288ad1c` | **refactor**: gom Firebase vào `lib/firebase.js` (export `app`, `db`) + `lib/auth.js` (export `auth`). Bỏ config lặp ở 8 file | browser: 3 trang render OK |
| `493c266` | **`index.js`**: gom 4 `onValue` (tv_sessions, global_templates, price_history, external_prices) vào mảng `dataUnsubs`, dọn trong cleanup + mỗi lần auth callback chạy lại (trước đây rò rỉ) | build + redirect path |
| `cd9ecda` | dọn nhỏ: `[id].js` đồng hồ `#clock` -> `useEffect` có `clearInterval`; `index.js` bọc `window.location.origin` bằng `typeof window` guard; `connect.js` `set()` có `.then/.catch` báo trạng thái | browser |
| `aaa4858` | **`[id].js`**: escape `< > & " '` cho `shop_name`, `shop_address`, `shop_phone`, `marquee_text`, tên loại vàng trước khi ghép template (chống XSS). Dùng replacer dạng hàm (giá trị có `$` không lỗi). Không đổi kiến trúc render | browser: render y hệt |
| `59aa933` | **script** `scripts/migrate-premium-ends.mjs` (mục E, chưa chạy) |

---

## 3. CẦN LÀM TIẾP

### E — Migration `expiry_date` -> `premium_ends` (khách đã trả tiền trước `8395af9`)
Script đã có. Tự chạy (Claude bị chặn đọc bảng khách hàng hàng loạt):
```
node scripts/migrate-premium-ends.mjs           # DRY-RUN, xem danh sách
node scripts/migrate-premium-ends.mjs --apply   # ghi thật
```
Chỉ đụng account có `expiry_date > premium_ends`. Không đổi `plan`, không cấp/thu quyền.

### C — Khoá RTDB Rules + webhook dùng Admin SDK  ⚠️ ƯU TIÊN CAO
**Vấn đề:** rules đang mở toang. Bất kỳ ai:
- đọc được toàn bộ `tv_sessions` (tên tiệm, địa chỉ, SĐT, giá, `last_pay`, `last_pay_date`)
- đọc `pairing_codes` công khai (đã xác nhận qua REST)
- **ghi thẳng vào `tv_sessions/<uid>` để tự set `plan: 'premium'`** — token webhook vô nghĩa
- ghi `html_template`/`css_template` bất kỳ -> XSS trên TV tiệm đó (escape ở `aaa4858` chỉ chặn field text, không chặn template)

**Việc:**
1. Nhан đưa **rules hiện tại** (Firebase Console -> Realtime Database -> Rules).
2. Viết `database.rules.json`:
   - `tv_sessions/<uid>`: đọc công khai (TV không đăng nhập) HOẶC chuyển sang đọc bằng token; ghi chỉ cho `auth.uid === uid` + validate field (không cho client tự ghi `plan`, `premium_ends`, `expiry_date`).
   - `global_templates`: đọc công khai; ghi chỉ `ADMIN_UID`.
   - `pairing_codes/<code>`: đọc/ghi có kiểm soát, TTL.
   - `price_history/<uid>`, `external_history`, `external_prices`, `crawler_configs`: theo vai trò.
3. `pages/api/payment-webhook.js`: chuyển từ Firebase client SDK sang **firebase-admin** (service account qua env `FIREBASE_SERVICE_ACCOUNT` — KHÔNG commit). Bỏ `get(ref(db,'tv_sessions'))` quét cả bảng.
4. Rollout: deploy code đọc-được-với-rules-mới TRƯỚC, rồi mới siết rules, theo dõi log TV không mất kết nối.

### D2 (tùy chọn, hoãn) — SSR bảng giá
`getServerSideProps` ở `[id].js` gọi Firebase REST `tv_sessions/<id>.json` render sẵn HTML -> khách luôn thấy giá kể cả client bị chặn WebSocket. Cần rules cho đọc + test kỹ nhiều template. Rủi ro cao, làm sau khi C xong.

---

## 4. REVIEW — CHƯA XỬ LÝ (từ lần soát toàn bộ code)

### Bảo mật / đúng đắn
- **`payment-webhook.js`**: không idempotent — cùng nội dung SMS gọi lại N lần thì cộng dồn hạn N lần. Cần lưu id giao dịch đã xử lý.
- **`payment-webhook.js`**: `get(ref(db,'tv_sessions'))` tải cả bảng mỗi lần webhook để tìm user theo 8 ký tự UID. Nên có map `short_uid -> uid`.
- **`ADMIN_UID` hardcode** trong bundle client (`index.js`, `crawler.js`, `admintemplate.js`) — gate admin chỉ ở client. Phải kiểm tra server-side (gắn với C).
- **`admintemplate.js` `syncToAllTVs`**: `update(ref(db), updates)` multi-path cho toàn bộ tiệm — vượt giới hạn payload RTDB khi nhiều tiệm; ghi đè tuỳ biến từng shop, không backup.
- **`crawler.js` `handleSaveJson`**: `set()` trong `forEach` không `await`/`.catch`, `alert("thành công")` trước khi ghi xong.
- **`connect.js`**: mã pairing 6 số random, KHÔNG kiểm tra trùng — 2 TV có thể sinh trùng, ghi đè nhau.
- **`isPro` không bao giờ hết hạn**: `plan === 'premium'` là Pro vĩnh viễn, không nơi nào hạ cấp khi `premium_ends < now`. Cần quyết định sản phẩm trước khi sửa (đừng tự hạ cấp khách đang trả tiền).

### Kiến trúc / hiệu năng
- **`index.js` 1310 dòng, 1 component**: style object tạo lại mỗi render, không `useMemo`, re-render toàn bộ mỗi tick giá (gồm cả cây chứa iframe TradingView).
- **`getHistoryForChart` / `downloadAllHistory` / listener `price_history`**: tải nguyên node lịch sử để hiện 90 điểm / 10 dòng. Dùng `orderByKey().limitToLast(n)`.
- **`openbb.js`**: gọi `https://macmini.tail5d608a.ts.net/...` — hostname Tailscale cá nhân, khách không phân giải được -> AI chat luôn "Lỗi kết nối!". Cần endpoint thật + đưa vào env.
- **Không dùng `.env`**: webhook secret (đã một phần), admin uid, URL n8n, endpoint chat — nên chuyển hết.
- Không test, không lint config, không CI.

### KHÔNG phải lỗi (đã kiểm tra kỹ, bỏ)
- Tailwind: `style/globals.css` = `@import "tailwindcss";` (v4, đúng). Đang chạy tốt.
- `next.config.js` `output: "standalone"`: **bắt buộc** cho `@opennextjs/cloudflare`. Repo deploy kép Vercel + Cloudflare Workers, cố ý.

---

## 5. GHI CHÚ

- Firebase project: `pricegold-4925d`, RTDB region `asia-southeast1`.
- `ADMIN_UID = "mdEgge6YZcXO1RQmfKIZZaLRidF2"` (cũng là 1 key trong `tv_sessions`).
- TV board = route `/[id]` (id = uid tiệm). Pairing = `/connect`. Dashboard = `/`. Admin template = `/admintemplate`. Crawler = `/crawler`.
- Field app đọc để tính Pro/hạn: `plan`, `premium_ends`, `trial_ends` (KHÔNG phải `expiry_date`).
- SSH cho repo: key riêng `~/.ssh/id_ed25519_goldprice` (origin, :443), `~/.ssh/id_ed25519_tbpri` (tbpri, :443). Cổng 22 bị mạng chặn -> đều đi qua `ssh.github.com:443`.
