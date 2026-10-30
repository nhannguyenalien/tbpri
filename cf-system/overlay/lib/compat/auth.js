// Bản thay thế `firebase/auth` (phần app đang dùng): đăng nhập Google + email/mật khẩu qua /api/auth.
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const subs = new Set();
const auth = { currentUser: null, __ready: false };
let loading = null;

const toUser = (u) => u && Object.assign({ providerData: [], getIdToken: async () => '', toJSON() { return { uid: this.uid }; } }, u);

function emit() { subs.forEach((f) => f(auth.currentUser)); }
function setUser(u) { auth.currentUser = toUser(u); auth.__ready = true; emit(); }

function load() {
  if (!loading) {
    loading = fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' })
      .then((r) => r.json()).then((j) => setUser(j.user)).catch(() => setUser(null));
  }
  return loading;
}

export function getAuth() { return auth; }
export function onAuthStateChanged(_auth, cb) {
  subs.add(cb);
  if (auth.__ready) setTimeout(() => subs.has(cb) && cb(auth.currentUser), 0); else load();
  return () => subs.delete(cb);
}

async function post(action, body) {
  const r = await fetch(`/api/auth/${action}`, {
    method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.message || j.code || 'Lỗi đăng nhập'), { code: j.code || 'auth/internal-error' });
  return j;
}

export async function signInWithEmailAndPassword(_auth, email, password) {
  const j = await post('login', { email, password });
  setUser(j.user);
  return { user: auth.currentUser };
}
export async function signOut() { await post('logout'); setUser(null); }

export class GoogleAuthProvider { constructor() { this.providerId = 'google.com'; } }

let gisReady = null;
function loadGis() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.google && window.google.accounts && window.google.accounts.oauth2) return Promise.resolve();
  if (!gisReady) {
    gisReady = new Promise((ok, fail) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
      s.onload = ok; s.onerror = () => { gisReady = null; fail(new Error('Không tải được Google Sign-In')); };
      document.head.appendChild(s);
    });
  }
  return gisReady;
}
if (typeof window !== 'undefined') loadGis().catch(() => {}); // tải sớm để popup mở kịp trong thao tác bấm

export async function signInWithPopup(_auth, provider) {
  if (!GOOGLE_CLIENT_ID) throw Object.assign(new Error('Chưa cấu hình GOOGLE_CLIENT_ID'), { code: 'auth/operation-not-allowed' });
  await loadGis();
  const token = await new Promise((ok, fail) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID, scope: 'openid email profile',
      callback: (resp) => (resp.access_token ? ok(resp.access_token) : fail(Object.assign(new Error(resp.error || 'Đăng nhập bị huỷ'), { code: 'auth/popup-closed-by-user' }))),
      error_callback: (e) => fail(Object.assign(new Error((e && e.type) || 'Đăng nhập bị huỷ'), { code: 'auth/popup-closed-by-user' })),
    });
    client.requestAccessToken({ prompt: 'select_account' });
  });
  const j = await post('google', { access_token: token });
  setUser(j.user);
  return { user: auth.currentUser, providerId: provider && provider.providerId };
}

const unsupported = () => { throw Object.assign(new Error('Đăng nhập bằng số điện thoại chưa hỗ trợ ở hệ thống dự phòng'), { code: 'auth/operation-not-supported-in-this-environment' }); };
export class RecaptchaVerifier { constructor() { unsupported(); } }
export const signInWithPhoneNumber = async () => unsupported();
