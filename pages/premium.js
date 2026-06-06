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

const app = !getApps().length
  ? initializeApp(firebaseConfig)
  : getApp();

const db = getDatabase(app);
const auth = getAuth(app);

const WHOP_URL =
  'https://whop.com/schoolsai/software-price-gold/';

export default function PremiumPage() {
  const [user, setUser] = useState(null);
  const [boardData, setBoardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);

      if (!u) {
        setLoading(false);
        return;
      }

      const sessionRef = ref(db, `tv_sessions/${u.uid}`);

      onValue(sessionRef, (snapshot) => {
        if (snapshot.exists()) {
          setBoardData(snapshot.val());
        }

        setLoading(false);
      });
    });

    return () => unsub();
  }, []);

  const isPremium = boardData?.plan === 'premium';

  const plans = [
    {
      id: 'month',
      name: 'Premium Tháng',
      price: '299.000đ',
      desc: 'Thanh toán theo tháng'
    },
    {
      id: 'year',
      name: 'Premium Năm',
      price: '2.499.000đ',
      desc: 'Tiết kiệm hơn 30%'
    }
  ];

  if (loading) {
    return (
      <div
        style={{
          padding: 50,
          textAlign: 'center'
        }}
      >
        Đang tải...
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 700,
        margin: '0 auto',
        padding: 20,
        fontFamily: 'Arial, sans-serif'
      }}
    >
      <h1
        style={{
          textAlign: 'center',
          marginBottom: 25
        }}
      >
        💎 Nâng cấp Premium
      </h1>

      <div
        style={{
          background: isPremium
            ? '#e8f5e9'
            : '#fff3cd',
          borderRadius: 16,
          padding: 20,
          marginBottom: 30,
          textAlign: 'center'
        }}
      >
        <div
          style={{
            fontSize: 15,
            color: '#666'
          }}
        >
          Trạng thái tài khoản
        </div>

        <div
          style={{
            marginTop: 10,
            fontSize: 24,
            fontWeight: 'bold'
          }}
        >
          {isPremium
            ? '✅ PREMIUM'
            : '❌ FREE'}
        </div>

        {isPremium &&
          boardData?.premium_ends && (
            <div
              style={{
                marginTop: 10
              }}
            >
              Hết hạn:
              {' '}
              {new Date(
                boardData.premium_ends
              ).toLocaleString('vi-VN')}
            </div>
          )}
      </div>

      {!isPremium && (
        <>
          {plans.map((plan) => (
            <div
              key={plan.id}
              style={{
                border: '1px solid #ddd',
                borderRadius: 16,
                padding: 20,
                marginBottom: 20,
                background: '#fff'
              }}
            >
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 'bold'
                }}
              >
                {plan.name}
              </div>

              <div
                style={{
                  marginTop: 8,
                  color: '#666'
                }}
              >
                {plan.desc}
              </div>

              <div
                style={{
                  marginTop: 15,
                  fontSize: 30,
                  fontWeight: 'bold',
                  color: '#28a745'
                }}
              >
                {plan.price}
              </div>

              <button
                onClick={() =>
                  window.open(
                    WHOP_URL,
                    '_blank'
                  )
                }
                style={{
                  width: '100%',
                  marginTop: 20,
                  padding: '16px',
                  border: 'none',
                  borderRadius: 12,
                  background: '#635BFF',
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: 18,
                  cursor: 'pointer'
                }}
              >
                🚀 Thanh toán qua Whop
              </button>
            </div>
          ))}
        </>
      )}

      {isPremium && (
        <div
          style={{
            background: '#e8f5e9',
            borderRadius: 16,
            padding: 20,
            textAlign: 'center'
          }}
        >
          <h3>
            🎉 Bạn đang sử dụng Premium
          </h3>

          <p>
            Tất cả tính năng cao cấp đã
            được mở khóa.
          </p>
        </div>
      )}

      <button
        onClick={() =>
          (window.location.href = '/')
        }
        style={{
          width: '100%',
          marginTop: 25,
          padding: 16,
          border: 'none',
          borderRadius: 12,
          background: '#222',
          color: '#fff',
          cursor: 'pointer'
        }}
      >
        ← Quay lại trang chủ
      </button>
    </div>
  );
}