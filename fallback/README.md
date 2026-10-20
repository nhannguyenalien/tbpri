# Dịch vụ dự phòng bảng giá (độc lập với app chính)
Node thuần + SQLite (`node:sqlite`), không dependency. Đồng bộ một chiều từ Firebase RTDB mỗi 5 phút,
phục vụ `/:id` (trang TV) và `/api/board/:id` (JSON) kể cả khi Firebase/Vercel chết.
Deploy Coolify: base directory `/fallback`, Dockerfile `/Dockerfile`, port 3000, volume `/data`.
Env: `BOARD_IDS` (id cách nhau dấu phẩy, tuỳ chọn), `FIREBASE_SERVICE_ACCOUNT` (tuỳ chọn, để tự liệt kê mọi id).
