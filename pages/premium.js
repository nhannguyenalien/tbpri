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
  const [selectedPlan, setSelectedPlan] = useState(null); // State để ẩn/hiện QR

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

  const plans = [
    { id: 'test', label: 'Gói Test', amount: 1000, desc: 'Dùng thử 1 ngày', color: '#ff5722' },
    { id: 'month', label: '1 Tháng', amount: 50000, desc: 'Dịch vụ hàng tháng', color: '#007acc' },
    { id: 'year', label: '1 Năm', amount: 500000, desc: 'Tiết kiệm 20%', color: '#28a745' },
  ];

  const getQRUrl = (amount) => {
    const STK = "9704229244878273"; 
    const BANK = "MB"; 
    const memo = `GP ${shortUid}`;
    return `https://img.vietqr.io/image/${BANK}-${STK}-compact.png?amount=${amount}&addInfo=${memo}&accountName=NGUYEN%20HUU%20NHAN`;
  };

  if (loading) return <div style={{padding:'50px', textAlign:'center'}}>Đang tải...</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h2 style={{ textAlign: 'center', color: '#333' }}>💎 Nâng cấp Premium</h2>

      {/* TRẠNG THÁI HIỆN TẠI */}
      <div style={{ background: isPro ? '#e8f5e9' : '#fff3e0', padding: '15px', borderRadius: '10px', marginBottom: '20px', textAlign: 'center', border: '1px solid #ddd' }}>
        <strong>Gói hiện tại: {isPro ? "✅ PREMIUM" : "❌ MIỄN PHÍ"}</strong>
        {isPro && <div style={{fontSize:'13px'}}>Hạn dùng: {new Date(boardData.expiry_date).toLocaleString('vi-VN')}</div>}
      </div>

      {/* DANH SÁCH GÓI (Dạng Toggle) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {plans.map((plan) => (
          <div key={plan.id} style={{ border: '1px solid #ddd', borderRadius: '10px', overflow: 'hidden' }}>
            <button 
              onClick={() => setSelectedPlan(selectedPlan === plan.id ? null : plan.id)}
              style={{
                width: '100%', padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: selectedPlan === plan.id ? plan.color : '#fff',
                color: selectedPlan === plan.id ? '#fff' : '#333',
                border: 'none', cursor: 'pointer', fontWeight: 'bold', transition: '0.3s'
              }}
            >
              <span>{plan.label} - {plan.amount.toLocaleString()}đ</span>
              <span>{selectedPlan === plan.id ? '▲' : '▼'}</span>
            </button>

            {selectedPlan === plan.id && (
              <div style={{ padding: '20px', textAlign: 'center', background: '#fff' }}>
                <p style={{fontSize:'14px', color:'#666'}}>{plan.desc}</p>
                <img 
                  src={getQRUrl(plan.amount)} 
                  alt="QR Code" 
                  style={{ width: '100%', maxWidth: '250px', borderRadius: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }} 
                />
                <div style={{marginTop:'10px', fontSize:'12px', color:'#888'}}>
                  Nội dung: <strong>GP {shortUid}</strong>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <button 
        onClick={() => window.location.href='/'} 
        style={{ width: '100%', marginTop: '30px', padding: '12px', border: 'none', borderRadius: '8px', background: '#333', color: '#fff', cursor: 'pointer' }}
      >
        Quay lại Quản lý
      </button>
    </div>
  );
}