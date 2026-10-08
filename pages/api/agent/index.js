// Tài liệu API cho AI agent (công khai, không cần key). Chi tiết thêm: AGENT-API.md
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.status(200).json({
    name: 'Goldprice Agent API',
    auth: 'Authorization: Bearer <AGENT_API_KEY>  (hoặc header x-api-key)',
    note: 'Mọi endpoint (trừ trang này) cần key. Body/response là JSON.',
    price_format: 'buy/sell nhận số hoặc chuỗi ("14.300.000", "14300000", "14,300" kèm transform.unit). Lưu dạng "14.300.000".',
    endpoints: [
      { m: 'GET', p: '/api/agent/sources', d: 'Liệt kê config + trạng thái (online/offline, lastCheck, lastError, số item)' },
      { m: 'POST', p: '/api/agent/sources', d: 'Thêm/ghi đè config. Body: {"id":"abc","config":{...}} hoặc {"configs":{"abc":{...},"xyz":{...}}}' },
      { m: 'GET', p: '/api/agent/sources/{id}', d: 'Xem 1 config + giá hiện tại' },
      { m: 'PUT', p: '/api/agent/sources/{id}', d: 'Thay toàn bộ config. Body: config' },
      { m: 'PATCH', p: '/api/agent/sources/{id}', d: 'Sửa một phần config (merge nông). Body: các field cần đổi' },
      { m: 'DELETE', p: '/api/agent/sources/{id}?purge=1', d: 'Xoá config; purge=1 xoá luôn giá + lịch sử' },
      { m: 'POST', p: '/api/agent/sources/{id}/test', d: 'Quét thử (không ghi). Body tuỳ chọn {"config":{...}} để thử config chưa lưu. Trả items + diag (http, rows, title) để chỉnh selector' },
      { m: 'GET|POST', p: '/api/agent/crawl', d: 'Chạy crawler. Body/query: ids=a,b (mặc định tất cả enabled), dryRun=1. GET dùng cho cron' },
      { m: 'GET', p: '/api/agent/prices?source={id}', d: 'Giá hiện tại của 1 nguồn (không có source = tất cả)' },
      { m: 'POST', p: '/api/agent/prices', d: 'Đẩy giá thủ công. Body: {"source":"id","name":"Tên hiển thị","replace":false,"items":[{"label":"Vàng 9999","buy":"14.100.000","sell":14250000}]}' },
      { m: 'DELETE', p: '/api/agent/prices?source={id}&label={label}', d: 'Xoá 1 loại vàng khỏi nguồn' },
      { m: 'GET', p: '/api/agent/shops/{uid}/prices', d: 'Bảng giá của 1 tiệm (tv_sessions/{uid}/prices)' },
      { m: 'PUT', p: '/api/agent/shops/{uid}/prices', d: 'Thay cả bảng giá tiệm. Body: {"prices":[{"name":"Vàng 9999","mua":"14100000","ban":"14250000"}]}' },
      { m: 'POST', p: '/api/agent/shops/{uid}/prices', d: 'Thêm/cập nhật theo tên (giữ các dòng khác). Cùng body với PUT' },
    ],
    config_schema: {
      common: { name: 'string (bắt buộc)', enabled: 'boolean (mặc định true)', type: '"html" | "api" (tự đoán theo api_url)', include: 'regex lọc tên loại vàng', exclude: 'regex loại bỏ', headers: '{ "Header": "giá trị" }', transform: '{ unit: "x1000" } khi nguồn ghi giá theo nghìn', fallbacks: '[ {field ghi đè} ] thử lần lượt khi nguồn chính lỗi' },
      html: { url: '', row_selector: 'CSS chọn các dòng, vd "table tr"', name_selector: 'CSS tương đối trong dòng, vd "td:nth-child(1)"', buy_selector: '', sell_selector: '', tip: 'Dòng có ô gộp (rowspan) lệch cột -> đếm từ cuối: td:nth-last-child(3)' },
      api: { format: '"seroval" cho site TanStack Start (/_serverFn/<id>, cần header x-tsr-serverfn: true)', api_url: '', data_path: 'đường dẫn tới mảng, vd "data" hoặc "result.items" ("" = gốc)', mapping: '{ name, buy, sell } là tên field trong mỗi phần tử' },
    },
  });
}
