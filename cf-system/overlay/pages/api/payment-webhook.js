// Thanh toán chỉ xử lý ở hệ thống chính (Vercel + Firebase). Hệ thống dự phòng không nhận webhook.
export default function handler(req, res) {
  res.status(410).json({ message: 'Webhook thanh toán chỉ chạy ở hệ thống chính' });
}
