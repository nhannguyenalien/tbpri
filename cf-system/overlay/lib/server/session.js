// Phiên đăng nhập: cookie HttpOnly chứa JWT HS256 (WebCrypto, chạy được trên Cloudflare Workers).
const enc = new TextEncoder();
const COOKIE = 'gp_session';
const MAX_AGE = 30 * 24 * 3600;

const b64 = (buf) => Buffer.from(buf).toString('base64url');
const unb64 = (s) => Buffer.from(s, 'base64url');

async function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 24) throw new Error('Thiếu SESSION_SECRET (>= 24 ký tự)');
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signSession(user) {
  const body = b64(enc.encode(JSON.stringify({ uid: user.uid, exp: Math.floor(Date.now() / 1000) + MAX_AGE })));
  const sig = await crypto.subtle.sign('HMAC', await key(), enc.encode(body));
  return `${body}.${b64(sig)}`;
}

export async function readSession(req) {
  const tok = req.cookies && req.cookies[COOKIE];
  if (!tok) return null;
  const [body, sig] = String(tok).split('.');
  if (!body || !sig) return null;
  try {
    const ok = await crypto.subtle.verify('HMAC', await key(), unb64(sig), enc.encode(body));
    if (!ok) return null;
    const p = JSON.parse(unb64(body).toString('utf8'));
    return p.exp > Date.now() / 1000 ? { uid: p.uid } : null;
  } catch (e) { return null; }
}

export function setCookie(res, token, req) {
  const secure = (req.headers['x-forwarded-proto'] || '').includes('https') || process.env.NODE_ENV === 'production';
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${token ? MAX_AGE : 0}${secure ? '; Secure' : ''}`);
}

// PBKDF2-SHA256 (Workers giới hạn tối đa 100.000 vòng).
export async function hashPassword(password, saltB64) {
  const salt = saltB64 ? unb64(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const k = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 }, k, 256);
  return { hash: b64(bits), salt: b64(salt) };
}
