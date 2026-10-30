// Đăng nhập: GET me | POST google | POST login | POST logout
import { ready } from '../../../lib/server/turso';
import { readSession, signSession, setCookie, hashPassword } from '../../../lib/server/session';

const WEB_API_KEY = 'AIzaSyDxaz1uBWKpDZ-J7qRX81BajLHrOmfVyM0'; // key web công khai của Firebase project (chỉ để xác minh mật khẩu lần đầu)
const pub = (u) => ({ uid: u.uid, email: u.email || null, displayName: u.display_name || null, photoURL: u.photo_url || null });
const randomUid = () => Array.from(crypto.getRandomValues(new Uint8Array(28)), (b) => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[b % 62]).join('');

const getUser = async (c, uid) => (await c.execute({ sql: 'SELECT * FROM users WHERE uid = ?', args: [uid] })).rows[0] || null;
const byEmail = async (c, e) => (await c.execute({ sql: 'SELECT * FROM users WHERE email_lower = ?', args: [String(e).toLowerCase()] })).rows[0] || null;

async function tooManyFails(c, key) {
  const r = (await c.execute({ sql: 'SELECT v FROM meta WHERE k = ?', args: [key] })).rows[0];
  if (!r) return false;
  const [n, ts] = String(r.v).split(':').map(Number);
  return n >= 10 && Date.now() - ts < 15 * 60 * 1000;
}
async function noteFail(c, key, ok) {
  if (ok) return c.execute({ sql: 'DELETE FROM meta WHERE k = ?', args: [key] });
  const r = (await c.execute({ sql: 'SELECT v FROM meta WHERE k = ?', args: [key] })).rows[0];
  const [n, ts] = r ? String(r.v).split(':').map(Number) : [0, 0];
  const fresh = Date.now() - ts > 15 * 60 * 1000;
  return c.execute({ sql: 'INSERT OR REPLACE INTO meta (k, v) VALUES (?, ?)', args: [key, `${fresh ? 1 : n + 1}:${Date.now()}`] });
}

// null = không liên lạc được Firebase; true/false = đúng/sai mật khẩu.
async function verifyWithFirebase(email, password) {
  try {
    const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${WEB_API_KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: false }), signal: AbortSignal.timeout(8000),
    });
    const j = await r.json();
    if (r.ok) return j.localId;
    return /INVALID_PASSWORD|INVALID_LOGIN_CREDENTIALS|EMAIL_NOT_FOUND|USER_DISABLED/.test(j.error && j.error.message) ? false : null;
  } catch (e) { return null; }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const action = req.query.action;
  let c;
  try { c = await ready(); } catch (e) { return res.status(503).json({ code: 'auth/network-request-failed' }); }

  if (action === 'me' && req.method === 'GET') {
    const s = await readSession(req);
    const u = s && (await getUser(c, s.uid));
    return res.status(200).json({ user: u && !u.disabled ? pub(u) : null });
  }
  if (req.method !== 'POST') return res.status(405).json({ code: 'method' });
  const origin = req.headers.origin;
  if (origin && new URL(origin).host !== req.headers.host) return res.status(403).json({ code: 'bad_origin' });

  if (action === 'logout') { setCookie(res, '', req); return res.status(200).json({ ok: true }); }

  if (action === 'google') {
    const cid = process.env.GOOGLE_CLIENT_ID;
    const { access_token } = req.body || {};
    if (!cid || !access_token) return res.status(400).json({ code: 'auth/invalid-credential' });
    try {
      const ti = await (await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(access_token)}`)).json();
      if (ti.aud !== cid || !ti.email || ti.email_verified === 'false') return res.status(401).json({ code: 'auth/invalid-credential' });
      const info = await (await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${access_token}` } })).json();
      let u = (/^\d+$/.test(ti.sub || '') && (await c.execute({ sql: 'SELECT * FROM users WHERE providers LIKE ?', args: [`%"rawId":"${ti.sub}"%`] })).rows[0]) || (await byEmail(c, ti.email));
      if (!u) {
        const uid = randomUid();
        await c.execute({
          sql: 'INSERT INTO users (uid, email, email_lower, display_name, photo_url, providers, created_at) VALUES (?,?,?,?,?,?,?)',
          args: [uid, ti.email, ti.email.toLowerCase(), info.name || null, info.picture || null, JSON.stringify([{ providerId: 'google.com', rawId: ti.sub }]), Date.now()],
        });
        u = await getUser(c, uid);
      }
      if (u.disabled) return res.status(403).json({ code: 'auth/user-disabled' });
      setCookie(res, await signSession(u), req);
      return res.status(200).json({ user: pub(u) });
    } catch (e) { return res.status(502).json({ code: 'auth/network-request-failed' }); }
  }

  if (action === 'login') {
    const { email, password } = req.body || {};
    if (!email || !password || String(password).length > 512) return res.status(400).json({ code: 'auth/invalid-credential' });
    const failKey = `fail:${String(email).toLowerCase()}`;
    if (await tooManyFails(c, failKey)) return res.status(429).json({ code: 'auth/too-many-requests' });
    const u = await byEmail(c, email);
    const bad = async () => { await noteFail(c, failKey, false); return res.status(401).json({ code: 'auth/invalid-credential' }); };
    if (!u || u.disabled) return bad();

    let ok = false;
    if (u.password_hash) {
      ok = (await hashPassword(password, u.password_salt)).hash === u.password_hash;
    } else {
      // Chưa có hash cục bộ: xác minh một lần với Firebase rồi lưu hash riêng để lần sau không cần Firebase.
      const lid = await verifyWithFirebase(email, password);
      if (lid === null) return res.status(503).json({ code: 'auth/network-request-failed', message: 'Cần Firebase để xác minh mật khẩu lần đầu' });
      ok = lid === u.uid;
      if (ok) {
        const h = await hashPassword(password);
        await c.execute({ sql: 'UPDATE users SET password_hash = ?, password_salt = ? WHERE uid = ?', args: [h.hash, h.salt, u.uid] });
      }
    }
    if (!ok) return bad();
    await noteFail(c, failKey, true);
    setCookie(res, await signSession(u), req);
    return res.status(200).json({ user: pub(u) });
  }
  return res.status(404).json({ code: 'not_found' });
}
