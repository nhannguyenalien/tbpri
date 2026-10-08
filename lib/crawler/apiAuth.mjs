// Xác thực API cho AI agent: header "Authorization: Bearer <key>" hoặc "x-api-key: <key>".
// Key hợp lệ: AGENT_API_KEY (agent) hoặc CRON_SECRET (Vercel cron tự gửi Bearer này).
import { timingSafeEqual } from 'node:crypto';
import { isConfigured } from './store.mjs';

const same = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
};

// Trả true nếu được phép; ngược lại đã tự trả response lỗi.
export function guard(req, res, methods) {
  res.setHeader('Cache-Control', 'no-store');
  if (methods && !methods.includes(req.method)) {
    res.setHeader('Allow', methods.join(', '));
    res.status(405).json({ error: `Method ${req.method} không hỗ trợ`, allowed: methods });
    return false;
  }
  const keys = [process.env.AGENT_API_KEY, process.env.CRON_SECRET].filter(Boolean);
  if (!keys.length) {
    res.status(503).json({ error: 'Server chưa cấu hình AGENT_API_KEY' });
    return false;
  }
  const given = (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || req.headers['x-api-key'] || '';
  if (!given || !keys.some((k) => same(given, k))) {
    res.status(401).json({ error: 'Sai hoặc thiếu API key (Authorization: Bearer <AGENT_API_KEY>)' });
    return false;
  }
  if (!isConfigured()) {
    res.status(503).json({ error: 'Server chưa cấu hình quyền ghi Firebase (FIREBASE_SERVICE_ACCOUNT)' });
    return false;
  }
  return true;
}

export const fail = (res, e, code = 500) => res.status(code).json({ error: e && e.message ? e.message : String(e) });
