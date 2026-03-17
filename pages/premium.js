import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, update, get } from 'firebase/database';

const firebaseConfig = { 
  apiKey: "AIzaSyDxaz1uBWKpDZ-J7qRX81BajLHrOmfVyM0",
  authDomain: "pricegold-4925d.firebaseapp.com",
  databaseURL: "https://pricegold-4925d-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "pricegold-4925d",
  storageBucket: "pricegold-4925d.firebasestorage.app",
  messagingSenderId: "982593294309",
  appId: "1:982593294309:web:5120ab6d735aeadde8a90c"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getDatabase(app);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const SECRET_TOKEN = "NHAN_GOLD_2026"; 
  const { content, token } = req.body; // MacroDroid gửi content là toàn bộ tin nhắn

  if (token !== SECRET_TOKEN) return res.status(401).json({ message: 'Unauthorized' });

  try {
    // 1. Tìm UID (8 ký tự sau chữ GP)
    const uidMatch = content.toUpperCase().match(/GP\s+([A-Z0-9]{8})/);
    if (!uidMatch) return res.status(200).json({ status: 'skip', reason: 'Không thấy mã GP' });
    const shortUid = uidMatch[1];

    // 2. Tìm số tiền (Tìm số sau dấu +)
    const amountMatch = content.replace(/,/g, '').match(/\+([0-9]+)/);
    const amountVal = amountMatch ? parseInt(amountMatch[1]) : 0;

    if (amountVal < 1000) return res.status(200).json({ status: 'skip', reason: 'Số tiền quá nhỏ' });

    // 3. Tìm Full UID của Minh Quân trong DB
    const snapshot = await get(ref(db, 'tv_sessions'));
    let fullUid = null;
    if (snapshot.exists()) {
      Object.keys(snapshot.val()).forEach(uid => {
        if (uid.toUpperCase().startsWith(shortUid)) fullUid = uid;
      });
    }

    if (!fullUid) return res.status(200).json({ status: 'error', message: 'Không tìm thấy User' });

    // 4. Cộng hạn dùng (1.000đ test cho 1 ngày, >50k cho 1 tháng)
    const daysToAdd = amountVal >= 50000 ? 30 : 1;
    const now = Date.now();
    
    // Lấy hạn cũ nếu có để cộng dồn
    const userSnap = await get(ref(db, `tv_sessions/${fullUid}/expiry_date`));
    const currentExpiry = (userSnap.exists() && userSnap.val() > now) ? userSnap.val() : now;
    const newExpiry = currentExpiry + (daysToAdd * 24 * 60 * 60 * 1000);

    await update(ref(db, `tv_sessions/${fullUid}`), {
      plan: 'premium',
      expiry_date: newExpiry,
      last_pay: amountVal
    });

    return res.status(200).json({ status: 'success', uid: fullUid, expiry: new Date(newExpiry).toLocaleString() });
  } catch (error) {
    return res.status(500).json({ status: 'error', error: error.message });
  }
}