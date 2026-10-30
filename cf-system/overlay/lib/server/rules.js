// Luật phân quyền phía server (thay cho RTDB Rules). Mặc định: từ chối.
export const ADMIN_UID = process.env.ADMIN_UID || 'mdEgge6YZcXO1RQmfKIZZaLRidF2';

// Các field chỉ admin / webhook thanh toán được ghi — chủ tiệm không tự cấp gói cho mình.
const PROTECTED = new Set(['plan', 'premium_ends', 'expiry_date', 'trial_ends', 'last_pay', 'last_pay_date', 'request_custom']);
const PUBLIC_READ = new Set(['global_templates', 'external_prices', 'external_history']);
const TRIAL_MAX_MS = 31 * 24 * 3600 * 1000;

export const isAdmin = (uid) => !!uid && uid === ADMIN_UID;

export function canRead(segs, uid) {
  if (isAdmin(uid)) return true;
  const [top, second] = segs;
  if (!top) return false;
  if (PUBLIC_READ.has(top)) return true;
  if (top === 'tv_sessions' || top === 'slugs' || top === 'pairing_codes') return segs.length >= 2; // TV đọc không cần đăng nhập
  if (top === 'price_history') return !!uid && second === uid;
  return false;
}

// existing: giá trị hiện có tại đường dẫn (để kiểm tra tạo mới / quyền sở hữu slug).
export function canWrite(segs, value, uid, existing) {
  if (isAdmin(uid)) return { ok: true };
  const [top, second, third] = segs;
  const deny = (why) => ({ ok: false, why });

  if (top === 'tv_sessions' && second) {
    if (!uid || uid !== second) return deny('không phải chủ tiệm');
    if (segs.length === 2) { // set cả node: chỉ được TẠO MỚI, và chỉ gói dùng thử
      if (existing !== null && existing !== undefined) return deny('đã tồn tại');
      if (!value || typeof value !== 'object') return deny('dữ liệu không hợp lệ');
      if (value.plan !== 'trial') return deny('chỉ được tạo gói dùng thử');
      const t = Number(value.trial_ends) || 0;
      if (t > Date.now() + TRIAL_MAX_MS) return deny('hạn dùng thử quá dài');
      for (const k of ['premium_ends', 'expiry_date', 'last_pay', 'last_pay_date', 'request_custom']) if (k in value) return deny(`field ${k} bị cấm`);
      return { ok: true };
    }
    if (PROTECTED.has(third)) return deny(`field ${third} chỉ admin/webhook được ghi`);
    return { ok: true };
  }
  if (top === 'price_history' && second) return uid && uid === second ? { ok: true } : deny('không phải chủ');
  if (top === 'slugs' && second && segs.length === 2) {
    if (!uid) return deny('cần đăng nhập');
    if (value === null) return existing === uid ? { ok: true } : deny('slug không thuộc bạn');
    if (value !== uid) return deny('slug chỉ được trỏ về uid của bạn');
    return existing == null || existing === uid ? { ok: true } : deny('slug đã có người dùng');
  }
  if (top === 'pairing_codes' && second && /^[\w-]{1,32}$/.test(second)) return { ok: true }; // TV chưa đăng nhập vẫn tạo mã
  return deny('không có quyền ghi');
}
