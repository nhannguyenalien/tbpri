# Agent API + Crawler

Crawler đọc `crawler_configs`, quét giá, ghi `external_prices/sources/<id>` và `external_history/<id>`
(cùng schema dashboard đang đọc). API cho AI agent nằm ở `/api/agent/*` — xem `GET /api/agent` (công khai) để lấy danh sách endpoint.

## Cài đặt (một lần)
Đặt env trên Vercel (xem `.env.example`): `AGENT_API_KEY` + `FIREBASE_SERVICE_ACCOUNT` (hoặc `FIREBASE_ADMIN_EMAIL/PASSWORD`).
Mọi request: `Authorization: Bearer <AGENT_API_KEY>`.

## Chạy crawler
- Tay: `curl -X POST $HOST/api/agent/crawl -H "Authorization: Bearer $KEY"` (`?dryRun=1` chỉ quét thử, `?ids=pnj,sjc` chọn nguồn)
- Định kỳ: gọi `GET /api/agent/crawl` từ scheduler ngoài (cron-job.org, GitHub Actions, Mac mini).
  Vercel Hobby chỉ cho cron 1 lần/ngày nên không đủ cho giá realtime.
- Local, không ghi gì: `node scripts/crawl-test.mjs [id ...] [--file configs.json]`

## Quy trình agent thêm nguồn mới
1. `POST /api/agent/sources/<id>/test` với `{"config": {...}}` → xem `items`, `diag.rows`, `errors` rồi chỉnh selector.
2. `POST /api/agent/sources` với `{"id":"<id>","config":{...}}` để lưu.
3. `POST /api/agent/crawl?ids=<id>` để ghi giá ngay.

## Config
| field | |
|---|---|
| `name`, `enabled` | tên hiển thị, bật/tắt |
| HTML: `url`, `row_selector`, `name_selector`, `buy_selector`, `sell_selector` | selector con tính **trong từng dòng**. Dòng có rowspan bị lệch cột → đếm từ cuối: `td:nth-last-child(3)` |
| API: `api_url`, `data_path`, `mapping{name,buy,sell}` | `data_path` trỏ tới mảng ("" = gốc) |
| `transform.unit` | `"x1000"` khi nguồn ghi giá theo nghìn |
| `include` / `exclude` | regex lọc theo tên loại vàng |
| `headers` | header tuỳ chọn |
| `fallbacks` | mảng config ghi đè, thử lần lượt khi nguồn chính lỗi |

## Đẩy giá thủ công
```
POST /api/agent/prices
{"source":"tiem_abc","name":"Tiệm ABC","items":[{"label":"Vàng 9999","buy":"14.100.000","sell":14250000}]}
```
`replace:true` thay toàn bộ danh sách; mặc định giữ các dòng cũ không nhắc tới. Giá bảng TV của 1 tiệm: `/api/agent/shops/<uid>/prices`.

## Sửa 3 nguồn đang lỗi (dán vào trang `/crawler` rồi Save)
Xem `scripts/crawler-configs.snapshot.json` (đã sửa `btmc`, `sjc`, `mao_thiet`).
- `btmc`: bảng có ô gộp làm lệch cột + giá tính theo nghìn → đếm cột từ cuối, `unit x1000`.
- `sjc`: sjc.com.vn chặn bằng Cloudflare (403) → thêm `fallbacks` lấy "Vàng miếng SJC" từ API PNJ.
- `mao_thiet`: domain `giavangmaothiet.com` không còn tồn tại (ENOTFOUND) → tắt, cần URL mới.
