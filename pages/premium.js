import { useState, useEffect } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, onValue } from 'firebase/database';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

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
const auth = getAuth(app);

export default function PremiumPage() {
  const [boardData, setBoardData] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);

  useEffect(() => {
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
  const shortUid = user?.uid.slice(0, 8).toUpperCase() || "";

  // Bảng giá mới cập nhật theo yêu cầu
  const plans = [
    { 
      id: 'day', 
      code: 'D', 
      label: 'Gói Ngày (Dùng thử)', 
      amount: 50000, 
      desc: 'Trải nghiệm đầy đủ tính năng trong 24h', 
      color: '#6c757d' 
    },
    { 
      id: 'month', 
      code: 'M',
      label: 'Gói 1 Tháng', 
      amount: 700000, 
      desc: 'Phù hợp nhu cầu ngắn hạn (700.000đ/tháng)', 
      color: '#007acc' 
    },
    { 
      id: 'year', 
      code: 'Y',
      label: 'Gói 1 Năm (Siêu Tiết Kiệm)', 
      amount: 5880000, // 490.000 * 12
      desc: 'Chỉ còn 490.000đ/tháng - Tiết kiệm 2.520.000đ/năm', 
      color: '#28a745' 
    },
    { 
      id: 'custom', 
      code: 'C',
      label: '🎨 Thiết Kế Riêng (VIP)', 
      amount: 1000000, 
      desc: 'Phí thiết kế giao diện độc quyền (Thanh toán 1 lần)', 
      color: '#d63384' 
    },
  ];

  // Hàm tạo QR Code (Đã thêm mã gói vào memo để hệ thống tự động nhận diện tốt hơn)
  const getQRUrl = (plan) => {
    const STK = "9704229244878273"; 
    const BANK = "MB"; 
    const memo = `GP ${plan.code} ${shortUid}`;
    return `https://img.vietqr.io/image/${BANK}-${STK}-compact.png?amount=${plan.amount}&addInfo=${memo}&accountName=NGUYEN%20HUU%20NHAN`;
  };

  if (loading) return <div style={{padding:'50px', textAlign:'center'}}>Đang kết nối hệ thống...</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      <h2 style={{ textAlign: 'center', color: '#333', marginBottom: '30px' }}>💎 Nâng cấp Premium</h2>

      {/* BOX TRẠNG THÁI HIỆN TẠI */}
      <div style={{ 
        background: isPro ? '#e8f5e9' : '#fff3e0', 
        padding: '20px', 
        borderRadius: '12px', 
        marginBottom: '25px', 
        textAlign: 'center', 
        border: '1px solid #ddd',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
      }}>
        <div style={{fontSize: '14px', color: '#666'}}>Trạng thái tài khoản</div>
        <strong style={{ fontSize: '20px', color: isPro ? '#2e7d32' : '#e65100' }}>
            {isPro ? "✅ ĐÃ NÂNG CẤP PREMIUM" : "❌ BẢN MIỄN PHÍ"}
        </strong>
        {isPro && boardData?.expiry_date && (
            <div style={{marginTop: '10px', fontSize: '14px', color: '#2e7d32'}}>
                Hạn dùng đến: <strong>{new Date(boardData.expiry_date).toLocaleString('vi-VN')}</strong>
            </div>
        )}
      </div>

      {/* DANH SÁCH GÓI GỌN GÀNG */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {plans.map((plan) => (
          <div key={plan.id} style={{ 
            border: '1px solid #ddd', 
            borderRadius: '12px', 
            overflow: 'hidden',
            boxShadow: selectedPlan === plan.id ? '0 4px 15px rgba(0,0,0,0.1)' : 'none'
          }}>
            <button 
              onClick={() => setSelectedPlan(selectedPlan === plan.id ? null : plan.id)}
              style={{
                width: '100%', padding: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: selectedPlan === plan.id ? plan.color : '#fff',
                color: selectedPlan === plan.id ? '#fff' : '#333',
                border: 'none', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.3s ease'
              }}
            >
              <div style={{ textAlign: 'left' }}>
                <div style={{fontSize: '16px'}}>{plan.label}</div>
                <div style={{fontSize: '11px', fontWeight: 'normal', opacity: 0.8}}>{plan.desc}</div>
              </div>
              <div style={{fontSize: '18px'}}>{plan.amount.toLocaleString()}đ</div>
            </button>

            {selectedPlan === plan.id && (
              <div style={{ padding: '25px', textAlign: 'center', background: '#fff' }}>
                <img 
                  src={getQRUrl(plan)} 
                  alt="QR Code" 
                  style={{ width: '100%', maxWidth: '280px', borderRadius: '12px', marginBottom: '15px' }} 
                />
                <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '8px', fontSize: '13px', color: '#444' }}>
                  Nội dung chuyển khoản: <strong style={{color: '#d32f2f'}}>GP {plan.code} {shortUid}</strong>
                </div>
                <p style={{fontSize: '12px', color: '#888', marginTop: '15px'}}>
                    * Hệ thống tự động mở khóa sau khi nhận tiền.<br/>
                    * Riêng gói Thiết kế, Admin sẽ liên hệ sau khi nhận thanh toán.
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <button 
        onClick={() => window.location.href='/'} 
        style={{ 
            width: '100%', marginTop: '30px', padding: '15px', border: 'none', 
            borderRadius: '10px', background: '#333', color: '#fff', 
            cursor: 'pointer', fontWeight: 'bold', fontSize: '15px'
        }}
      >
        ← Quay lại trang Quản lý
      </button>

      <div style={{textAlign: 'center', marginTop: '20px', fontSize: '12px', color: '#aaa'}}>
          Hệ thống thanh toán tự động Bluetechai © 2026
      </div>
    </div>
  );
}