import { useState, useEffect } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app'; // Thêm dòng này
import { getDatabase, ref, onValue } from 'firebase/database';
import { getAuth, onAuthStateChanged } from 'firebase/auth'; // Thêm onAuthStateChanged

// 1. Cấu hình Firebase (Phải có đoạn này ở đầu file)
const firebaseConfig = {
  apiKey: "AIzaSyDxaz1uBWKpDZ-J7qRX81BajLHrOmfVyM0",
  authDomain: "pricegold-4925d.firebaseapp.com",
  databaseURL: "https://pricegold-4925d-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "pricegold-4925d",
  storageBucket: "pricegold-4925d.firebasestorage.app",
  messagingSenderId: "982593294309",
  appId: "1:982593294309:web:5120ab6d735aeadde8a90c"
};

// Khởi tạo Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getDatabase(app);
const auth = getAuth(app);

export default function PremiumPage() {
  const [boardData, setBoardData] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Thêm state loading để dễ theo dõi

  useEffect(() => {
    // Sử dụng onAuthStateChanged trực tiếp để lấy thông tin user
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        onValue(ref(db, `tv_sessions/${u.uid}`), (s) => {
          if (s.exists()) setBoardData(s.val());
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const isPro = boardData?.plan === 'premium';
  const expiryDate = boardData?.expiry_date ? new Date(boardData.expiry_date).toLocaleDateString('vi-VN') : null;

  const getQRUrl = (amount) => {
    const STK = "9704229244878273"; 
    const BANK = "MB"; 
    const memo = `GP ${user?.uid.slice(0, 8).toUpperCase()}`;
    return `https://img.vietqr.io/image/${BANK}-${STK}-compact.png?amount=${amount}&addInfo=${memo}&accountName=NGUYEN%20HUU%20NHAN`;
  };

  // 2. Xử lý các trạng thái hiển thị
  if (loading) return <div style={{padding:'50px', textAlign:'center'}}>Đang kết nối dữ liệu...</div>;
  
  if (!user) return (
    <div style={{padding:'50px', textAlign:'center'}}>
      <h3>🔒 Vui lòng đăng nhập Admin trước!</h3>
      <button onClick={() => window.location.href='/'} style={{padding:'10px 20px', cursor:'pointer'}}>Quay lại Trang chủ</button>
    </div>
  );

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h2 style={{ textAlign: 'center' }}>💎 Nâng cấp Premium</h2>
      
      {/* TRẠNG THÁI HIỆN TẠI */}
      <div style={{ background: isPro ? '#e8f5e9' : '#fff3e0', padding: '15px', borderRadius: '10px', marginBottom: '20px', textAlign: 'center', border: '1px solid #ddd' }}>
        <p>Gói hiện tại: <strong>{isPro ? "PREMIUM" : "MIỄN PHÍ"}</strong></p>
        {isPro && <p style={{ color: '#2e7d32' }}>Hạn dùng đến: <strong>{expiryDate}</strong></p>}
      </div>

      {!isPro ? (
        <div style={{ display: 'grid', gap: '15px' }}>
          <div style={{ border: '2px solid #007acc', padding: '15px', borderRadius: '10px', textAlign: 'center' }}>
            <h3>Gói 1 Tháng</h3>
            <p style={{ fontSize: '24px', fontWeight: 'bold' }}>50.000đ</p>
            <img src={getQRUrl(50000)} alt="QR" style={{ width: '100%', maxWidth: '200px' }} />
            <p style={{ fontSize: '12px', color: '#666' }}>Quét mã để kích hoạt tự động</p>
          </div>
          
          <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '10px', textAlign: 'center' }}>
            <h3>Gói 1 Năm (Tiết kiệm)</h3>
            <p style={{ fontSize: '24px', fontWeight: 'bold' }}>500.000đ</p>
            <img src={getQRUrl(500000)} alt="QR" style={{ width: '100%', maxWidth: '200px' }} />
          </div>
        </div>
      ) : (
        <div style={{textAlign:'center'}}>
           <p>✨ Bạn đang sử dụng các tính năng cao cấp.</p>
           <button onClick={() => window.location.href='/'} style={{ width: '100%', padding: '15px', background: '#007acc', color:'#fff', border: 'none', borderRadius: '10px', cursor:'pointer' }}>Quay lại Quản lý</button>
        </div>
      )}

      <div style={{ marginTop: '20px', fontSize: '13px', color: '#888', background: '#f9f9f9', padding: '10px', borderRadius: '5px' }}>
        <strong>Lưu ý:</strong> Hệ thống tự động kích hoạt sau 1-3 phút kể từ khi nhận được tiền. Vui lòng giữ nguyên nội dung chuyển khoản.
      </div>
    </div>
  );
}