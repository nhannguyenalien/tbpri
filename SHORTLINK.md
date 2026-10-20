# Đường dẫn rút gọn (domain/ten-tiem)

Khách đặt tên trong Dashboard → "Địa chỉ xem bảng giá trên Tivi" (tự bỏ dấu, ví dụ "Tiệm Vàng Hữu Tín" → `tiem-vang-huu-tin`).
Trên Tivi chỉ cần gõ `https://<domain>/tiem-vang-huu-tin` là ra bảng giá. Link dài `/<uid>` vẫn chạy như cũ.

## Cách hoạt động
- `slugs/<slug> = <uid>` (RTDB). Ghi thêm `tv_sessions/<uid>/slug` để Dashboard hiển thị.
- `pages/[id].js`: id ≤ 24 ký tự = slug (không phân biệt hoa thường) → tra `slugs` ra uid. UID Firebase dài 28 ký tự nên không nhầm.
  Tra lỗi (chưa có rules) → thử coi id là uid. Slug không tồn tại → màn "Không tìm thấy bảng giá".
- `pages/api/board/[id].js` (đường dự phòng khi WiFi chặn Firebase) cũng tự giải slug.
- Slug: `a-z 0-9 -`, 3–24 ký tự, không trùng tên trang hệ thống (api, connect, landing, premium, crawler, admintemplate, openbb, admin, login, www, static).

## BẮT BUỘC: thêm rule vào Realtime Database (Rules → Publish)
Thêm khối `slugs` cạnh các khối hiện có (không sửa khối khác):

```json
"slugs": {
  "$slug": {
    ".read": true,
    ".validate": "newData.isString() && $slug.matches(/^[a-z0-9-]{3,24}$/) && !$slug.matches(/^(api|connect|landing|premium|crawler|admintemplate|openbb|admin|login|www|static)$/)",
    ".write": "auth != null && (!data.exists() || data.val() === auth.uid) && (newData.val() === auth.uid || (!newData.exists() && data.val() === auth.uid))"
  }
}
```
- Chỉ đọc từng slug, không liệt kê được cả bảng.
- Chỉ chủ tài khoản được tạo/đổi/xoá slug của mình; slug đã có người dùng thì người khác không ghi đè được.
- Chưa publish rules: Dashboard báo "máy chủ chưa bật tính năng", link cũ vẫn chạy bình thường.
