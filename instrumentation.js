// Chỉ chạy trên VPS dự phòng: 5 phút làm mới bản sao của mọi bảng giá đã từng được hỏi tới.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || !process.env.FALLBACK_CACHE_DIR) return;
  const { refreshAll } = await import('./lib/boardCache');
  setTimeout(refreshAll, 5000);
  setInterval(refreshAll, 5 * 60 * 1000);
}
