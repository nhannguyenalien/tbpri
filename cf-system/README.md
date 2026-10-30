# Hệ thống dự phòng độc lập — Cloudflare + Turso

Bản sao chạy được **không cần Firebase/Vercel**: giao diện y hệt app chính, dữ liệu nằm ở Turso (libSQL),
API chạy trên Cloudflare (OpenNext → Workers + static assets, kế thừa của Pages).

```
TV / dashboard ──► Cloudflare Worker (Next + /api/db + /api/auth) ──► Turso
                                                                        ▲
Firebase RTDB + Auth ──(mỗi giờ, 1 chiều)── dịch vụ Coolify (fallback/) ┘
```

## Cách hoạt động
- `scripts/prepare.mjs` ghép `.build/` = `pages/` + `style/` của app chính + `overlay/` (không sửa app chính).
  Mỗi lần build đều lấy giao diện mới nhất.
- `overlay/lib/compat/*`: thay thế `firebase/database|auth|app` (alias trong `next.config.js`). Các trang không đổi dòng nào.
  `onValue` = polling 6 giây, chỉ tải lại khi số phiên bản đổi (1 dòng đọc / lần).
- `overlay/lib/server/rules.js`: luật phân quyền (chặt hơn RTDB Rules hiện tại): chủ tiệm không tự ghi `plan`,
  `premium_ends`…; tiệm mới chỉ được tạo gói `trial` ≤ 31 ngày; slug không giành của người khác; chỉ admin ghi template/crawler.
- Đăng nhập: Google (token client + kiểm tra `aud`) và email/mật khẩu; phiên = cookie HttpOnly ký HMAC. **uid giữ nguyên** từ Firebase.
- Mật khẩu: lần đầu một user đăng nhập, hệ thống xác minh với Firebase (nếu còn sống) rồi lưu hash PBKDF2 riêng;
  từ đó đăng nhập không cần Firebase.

## Đồng bộ
Dịch vụ `fallback/` (Coolify) mỗi giờ đẩy RTDB + user Auth sang Turso (`fallback/turso-sync.mjs`).
Một chiều: Turso bị ghi đè theo Firebase. Muốn chuyển hẳn sang dùng bản này làm chính (Firebase chết thật):
`INSERT OR REPLACE INTO meta (k, v) VALUES ('mode', 'primary');` trên Turso — đồng bộ tự dừng.

## Triển khai
1. Turso: `turso auth login` → `turso db create goldprice-fallback --location sin` →
   `turso db show goldprice-fallback --url` và `turso db tokens create goldprice-fallback`.
2. Google OAuth (để đăng nhập Google): Google Cloud Console → Credentials → OAuth client **Web application**,
   Authorized JavaScript origins = domain của hệ thống này. Lấy Client ID.
3. Cloudflare: đặt biến cho Worker `goldprice-fallback`: `TURSO_URL`, `TURSO_AUTH_TOKEN`, `SESSION_SECRET`
   (≥ 24 ký tự ngẫu nhiên), `GOOGLE_CLIENT_ID`. Build với `NEXT_PUBLIC_GOOGLE_CLIENT_ID=<Client ID>`.
4. `npm install && NEXT_PUBLIC_GOOGLE_CLIENT_ID=... npm run cf:deploy`.
5. Coolify (app `goldprice-fallback`): thêm `TURSO_URL`, `TURSO_AUTH_TOKEN`, restart → `/health` có `turso_last_ok`.

## Chưa có / giới hạn
- Đăng nhập số điện thoại không hỗ trợ.
- Webhook thanh toán không chạy ở đây (trả 410) — thanh toán vẫn vào hệ thống chính.
- Crawler giá vẫn ghi vào Firebase; ở đây giá cập nhật theo đợt đồng bộ mỗi giờ.
- Chưa xác minh hash scrypt của Firebase trực tiếp (cần tham số hash của project); user chưa từng đăng nhập khi Firebase còn sống sẽ cần Firebase để đăng nhập lần đầu.
- Realtime = polling 6 giây (không phải websocket).
