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

  // Ưu tiên biến môi trường; giữ fallback để bản đang chạy không gãy trước khi set env trên Vercel.
  const SECRET_TOKEN = process.env.WEBHOOK_SECRET || "NHAN_GOLD_2026";
  const { content, token } = req.body;

  if (token !== SECRET_TOKEN) return res.status(401).json({ message: 'Unauthorized' });

  try {
    // 1. Lọc UID (8 ký tự sau GP)
    const uidMatch = content.toUpperCase().match(/GP\s+([A-Z0-9]{8})/);
    if (!uidMatch) return res.status(200).json({ status: 'skip', reason: 'Không thấy mã GP' });
    const shortUid = uidMatch[1];

    // 2. Lọc số tiền (Xử lý cả dấu ngăn cách , hoặc .)
    const amountMatch = content.replace(/[,.]/g, '').match(/\+([0-9]+)/);
    const amountVal = amountMatch ? parseInt(amountMatch[1]) : 0;

    // 3. Định nghĩa logic gói giá của Minh Quân
    let daysToAdd = 0;
    let isCustomDesign = false;

    if (amountVal >= 6000000) daysToAdd = 730;      // Gói 2 năm (250k/tháng)
    else if (amountVal >= 3360000) daysToAdd = 365; // Gói 1 năm (280k/tháng)
    else if (amountVal >= 1000000) isCustomDesign = true; // Thiết kế riêng (1tr)
    else if (amountVal >= 300000) daysToAdd = 30;   // Gói 1 tháng (300k)
    else if (amountVal >= 2000) daysToAdd = 1;      // Gói Test (2k)
    else return res.status(200).json({ status: 'skip', reason: 'Số tiền không khớp gói' });

    // 4. Tìm Full UID từ Short UID
    const snapshot = await get(ref(db, 'tv_sessions'));
    let fullUid = null;
    if (snapshot.exists()) {
      Object.keys(snapshot.val()).forEach(uid => {
        if (uid.toUpperCase().startsWith(shortUid)) fullUid = uid;
      });
    }
    if (!fullUid) return res.status(200).json({ status: 'error', message: 'User không tồn tại' });

    // 5. Tính toán cộng dồn hạn dùng
    // App đọc field `premium_ends` (index.js / premium.js), field `expiry_date` cũ không nơi nào đọc.
    // -> lấy mốc cũ = max(premium_ends, expiry_date) và GHI CẢ HAI field cùng giá trị (additive, không phá user cũ).
    const now = Date.now();
    const [premEndsSnap, legacySnap] = await Promise.all([
      get(ref(db, `tv_sessions/${fullUid}/premium_ends`)),
      get(ref(db, `tv_sessions/${fullUid}/expiry_date`)),
    ]);
    const prevExpiry = Math.max(
      Number(premEndsSnap.val()) || 0,
      Number(legacySnap.val()) || 0
    );
    const currentExpiry = prevExpiry > now ? prevExpiry : now;

    const updateData = {
      last_pay: amountVal,
      last_pay_date: new Date().toLocaleString('vi-VN')
    };

    if (daysToAdd > 0) {
      const newExpiry = currentExpiry + (daysToAdd * 24 * 60 * 60 * 1000);
      updateData.plan = 'premium';
      updateData.premium_ends = newExpiry; // field app thực sự dùng
      updateData.expiry_date = newExpiry;  // giữ đồng bộ field cũ
    }

    if (isCustomDesign) {
      updateData.request_custom = true; // Đánh dấu để Quân liên hệ làm UI
    }

    await update(ref(db, `tv_sessions/${fullUid}`), updateData);

    return res.status(200).json({
      status: 'success',
      package: isCustomDesign ? "Thiết kế riêng" : `${daysToAdd} ngày`,
      expiry: updateData.premium_ends ? new Date(updateData.premium_ends).toLocaleString('vi-VN') : 'N/A'
    });

  } catch (error) {
    return res.status(500).json({ status: 'error', error: error.message });
  }
}