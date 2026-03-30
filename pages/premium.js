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
  const [sending, setSending] = useState(false);

  const TELE_TOKEN = "8712190407:AAEZVriLK6kgfQlMmicTnbB2vd1BhJ1yGzA"; 
  const TELE_CHAT_ID = "907199790";

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
    { id: 'day', code: 'D', label: 'Gói Ngày (Dùng thử)', amount: 50000, desc: 'Trải nghiệm đầy đủ tính năng trong 24h', color: '#6c757d' },
    { id: 'month', code: 'M', label: 'Gói 1 Tháng', amount: 700000, desc: 'Phù hợp nhu cầu ngắn hạn (700.000đ/tháng)', color: '#007acc' },
    { id: 'year', code: 'Y', label: 'Gói 1 Năm (Siêu Tiết Kiệm)', amount: 5880000, desc: 'Chỉ còn 490.000đ/tháng - Tiết kiệm 2.520.000đ/năm', color: '#28a745' },
    { id: 'custom', code: 'C', label: '🎨 Thiết Kế Riêng (VIP)', amount: 1000000, desc: 'Phí thiết kế giao diện độc quyền (Thanh toán 1 lần)', color: '#d63384' },
  ];

  const getQRUrl = (plan) => {
    const STK = "9704229244878273"; 
    const BANK = "MB"; 
    const memo = `GP ${plan.code} ${shortUid}`;
    return `https://img.vietqr.io/image/${BANK}-${STK}-compact.png?amount=${plan.amount}&addInfo=${memo}&accountName=NGUYEN%20HUU%20NHAN`;
  };

  const handleSendBill = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const selectedPlanData = plans.find(p => p.id === selectedPlan);
    if (!selectedPlanData) return alert("Vui lòng chọn một gói trước khi gửi bill!");

    setSending(true);
    const formData = new FormData();
    formData.append('chat_id', TELE_CHAT_ID);
    formData.append('photo', file);
    
    const captionMsg = `💰 YÊU CẦU DUYỆT GÓI MỚI\n👤 User ID: ${user.uid}\n📦 Gói chọn: ${selectedPlanData.label} (${selectedPlanData.amount.toLocaleString()}đ)\n📝 Nội dung CK: GP ${selectedPlanData.code} ${shortUid}\n🕒 Thời gian: ${new Date().toLocaleString('vi-VN')}\n--------------------------\nAdmin vui lòng kiểm tra và kích hoạt!`;
    formData.append('caption', captionMsg);

    try {
      const res = await fetch(`https://api.telegram.org/bot${TELE_TOKEN}/sendPhoto`, {
        method: 'POST',
        body: formData
      });
      
      if (res.ok) {
        alert("🎉 Đã gửi ảnh giao dịch thành công! Xin vui lòng chờ Admin kiểm tra và kích hoạt gói cho bạn.");
      } else {
        alert("❌ Lỗi khi gửi ảnh, vui lòng kiểm tra lại kết nối mạng!");
      }
    } catch (err) {
      alert("❌ Lỗi hệ thống: " + err.message);
    } finally {
      setSending(false);
      e.target.value = null; 
    }
  };

  if (loading) return <div style={{padding:'50px', textAlign:'center', fontSize: '18px'}}>Đang kết nối hệ thống...</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      <h2 style={{ textAlign: 'center', color: '#333', marginBottom: '30px' }}>💎 Nâng cấp Premium</h2>

      <div style={{ 
        background: isPro ? '#e8f5e9' : '#fff3e0', 
        padding: '20px', 
        borderRadius: '12px', 
        marginBottom: '25px', 
        textAlign: 'center', 
        border: '1px solid #ddd',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
      }}>
        <div style={{fontSize: '16px', color: '#666', marginBottom: '5px'}}>Trạng thái tài khoản</div>
        <strong style={{ fontSize: '22px', color: isPro ? '#2e7d32' : '#e65100' }}>
            {isPro ? "✅ ĐÃ NÂNG CẤP PREMIUM" : "❌ BẢN MIỄN PHÍ"}
        </strong>
        {isPro && boardData?.expiry_date && (
            <div style={{marginTop: '10px', fontSize: '16px', color: '#2e7d32'}}>
                Hạn dùng đến: <strong>{new Date(boardData.expiry_date).toLocaleString('vi-VN')}</strong>
            </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {plans.map((plan) => (
          <div key={plan.id} style={{ 
            border: '2px solid', 
            borderColor: selectedPlan === plan.id ? plan.color : '#e0e0e0',
            borderRadius: '12px', 
            overflow: 'hidden',
            boxShadow: selectedPlan === plan.id ? '0 4px 15px rgba(0,0,0,0.15)' : 'none',
            transition: 'all 0.2s ease-in-out'
          }}>
            <button 
              onClick={() => setSelectedPlan(selectedPlan === plan.id ? null : plan.id)}
              style={{
                width: '100%', padding: '20px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: selectedPlan === plan.id ? plan.color : '#fff',
                color: selectedPlan === plan.id ? '#fff' : '#333',
                border: 'none', cursor: 'pointer', transition: 'all 0.3s ease'
              }}
            >
              <div style={{ textAlign: 'left' }}>
                <div style={{fontSize: '18px', fontWeight: 'bold'}}>{plan.label}</div>
                <div style={{fontSize: '14px', marginTop: '4px', opacity: 0.9}}>{plan.desc}</div>
              </div>
              <div style={{fontSize: '20px', fontWeight: 'bold'}}>{plan.amount.toLocaleString()}đ</div>
            </button>

            {selectedPlan === plan.id && (
              <div style={{ padding: '25px', textAlign: 'center', background: '#fff' }}>
                <p style={{ fontSize: '16px', color: '#333', marginBottom: '15px', fontWeight: 'bold' }}>
                  Quét mã QR dưới đây để thanh toán:
                </p>
                <img 
                  src={getQRUrl(plan)} 
                  alt="QR Code Thanh Toán" 
                  style={{ width: '100%', maxWidth: '280px', borderRadius: '12px', marginBottom: '15px', border: '1px solid #ddd' }} 
                />
                
                <div style={{ background: '#fff3cd', border: '1px solid #ffeeba', padding: '15px', borderRadius: '8px', fontSize: '16px', color: '#856404', marginBottom: '25px' }}>
                  Nội dung chuyển khoản (Bắt buộc):<br/>
                  <strong style={{color: '#d32f2f', fontSize: '20px', display: 'block', marginTop: '8px'}}>GP {plan.code} {shortUid}</strong>
                </div>
                
                {/* 📸 KHU VỰC UPLOAD ẢNH BILL ĐÃ ĐƯỢC THIẾT KẾ LẠI CHO NGƯỜI LỚN */}
                <div style={{ 
                    borderTop: '2px dashed #ccc', 
                    paddingTop: '25px', 
                    marginTop: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                }}>
                  <p style={{ fontSize: '17px', fontWeight: 'bold', color: '#333', marginBottom: '8px' }}>
                    Xác nhận đã chuyển khoản?
                  </p>
                  <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
                    Bấm vào nút bên dưới để tải lên ảnh chụp màn hình giao dịch thành công.
                  </p>

                  {/* Ẩn thẻ input thật đi */}
                  <input 
                    type="file" 
                    id={`upload-bill-${plan.id}`}
                    accept="image/*" 
                    onChange={handleSendBill} 
                    disabled={sending}
                    style={{ display: 'none' }} 
                  />

                  {/* Dùng thẻ label làm nút bấm giả */}
                  <label 
                    htmlFor={`upload-bill-${plan.id}`}
                    style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        width: '100%', 
                        maxWidth: '350px',
                        padding: '18px 20px', 
                        borderRadius: '50px',
                        background: sending ? '#9e9e9e' : '#1976d2',
                        color: '#fff',
                        fontSize: '18px',
                        fontWeight: 'bold',
                        cursor: sending ? 'not-allowed' : 'pointer',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                        transition: 'all 0.2s ease',
                        textAlign: 'center'
                    }} 
                  >
                    {sending ? "⏳ ĐANG GỬI ẢNH..." : "📸 BẤM ĐỂ CHỌN ẢNH GIAO DỊCH"}
                  </label>
                </div>

                <div style={{fontSize: '14px', color: '#666', marginTop: '25px', textAlign: 'left', lineHeight: '1.6', background: '#f8f9fa', padding: '15px', borderRadius: '8px'}}>
                    <strong style={{color: '#333'}}>Lưu ý:</strong><br/>
                    1. Admin sẽ kiểm tra và tự động mở khóa tài khoản sau khi nhận được thông báo.<br/>
                    2. Hãy chắc chắn bạn đã ghi đúng <strong>Nội dung chuyển khoản</strong>.
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <button 
        onClick={() => window.location.href='/'} 
        style={{ 
            width: '100%', marginTop: '30px', padding: '18px', border: 'none', 
            borderRadius: '50px', background: '#333', color: '#fff', 
            cursor: 'pointer', fontWeight: 'bold', fontSize: '18px',
            boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
        }}
      >
        ← QUAY LẠI TRANG CHỦ
      </button>

      <div style={{textAlign: 'center', marginTop: '30px', fontSize: '14px', color: '#999'}}>
          Hệ thống thanh toán tự động Bluetechai © 2026
      </div>
    </div>
  );
}