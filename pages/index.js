import { useState, useEffect } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, update, set, onValue } from 'firebase/database';
import { getAuth, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';

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
const googleProvider = new GoogleAuthProvider();

export default function HomeAdmin() {
  const [user, setUser] = useState(null);
  const [boardData, setBoardData] = useState(null);
  const [globalTemplates, setGlobalTemplates] = useState({});
  
  // State cho Form đăng nhập Email
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        onValue(ref(db, `tv_sessions/${currentUser.uid}`), (s) => {
          if (s.exists()) setBoardData(s.val());
          else set(ref(db, `tv_sessions/${currentUser.uid}`), { shop_name: "Tiệm Vàng Mới", prices: [] });
        });
        onValue(ref(db, 'global_templates'), (s) => s.exists() && setGlobalTemplates(s.val()));
      }
    });
  }, []);

  const handleUpdate = (field, value) => update(ref(db, `tv_sessions/${user.uid}`), { [field]: value });

  // Hàm đăng nhập bằng Email
  const loginWithEmail = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      alert("Lỗi: " + error.message);
    }
  };

  const applyTheme = (themeKey) => {
    const theme = globalTemplates[themeKey];
    update(ref(db, `tv_sessions/${user.uid}`), {
      html_template: theme.html_template,
      row_template: theme.row_template,
      css_template: theme.css_template
    });
    alert("Đã áp dụng giao diện!");
  };

  // --- GIAO DIỆN 1: MÀN HÌNH ĐĂNG NHẬP ---
  if (!user) {
    return (
      <div style={{ padding: '50px 20px', fontFamily: 'sans-serif', maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
        <h1 style={{ color: '#e94560' }}>🔐 HỆ THỐNG QUẢN TRỊ</h1>
        
        {/* Đăng nhập bằng Google */}
        <button onClick={() => signInWithPopup(auth, googleProvider)} style={{ width: '100%', padding: '15px', background: '#4285F4', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', marginBottom: '20px' }}>
          Tiếp tục với Google
        </button>

        <div style={{ margin: '20px 0', color: '#999' }}>─── HOẶC ───</div>

        {/* Form Đăng nhập Email/Mật khẩu cho Admin */}
        <form onSubmit={loginWithEmail} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input type="email" placeholder="Email Admin" value={email} onChange={(e) => setEmail(e.target.value)} style={{ padding: '15px', borderRadius: '5px', border: '1px solid #ccc' }} required />
          <input type="password" placeholder="Mật khẩu" value={password} onChange={(e) => setPassword(e.target.value)} style={{ padding: '15px', borderRadius: '5px', border: '1px solid #ccc' }} required />
          <button type="submit" style={{ padding: '15px', background: '#333', color: '#fff', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>Đăng nhập Admin</button>
        </form>
      </div>
    );
  }

  // --- GIAO DIỆN 2: BẢNG ĐIỀU KHIỂN (Giữ nguyên phần render giá vàng của bạn) ---
  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <span>ID: <strong>{user.uid.slice(0,8)}...</strong></span>
        <button onClick={() => signOut(auth)}>Đăng xuất</button>
      </div>

      <div style={{ background: '#e3f2fd', padding: '15px', borderRadius: '10px', marginBottom: '20px' }}>
        <strong>Link Tivi: </strong>
        <a href={`/${user.uid}`} target="_blank" rel="noreferrer">{window.location.origin}/{user.uid}</a>
      </div>

      <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #ddd' }}>
        <h3>⚙️ Thông tin tiệm</h3>
        <input type="text" value={boardData?.shop_name || ''} onChange={(e) => handleUpdate('shop_name', e.target.value)} style={{width:'100%', padding:'10px', marginBottom:'10px'}} placeholder="Tên tiệm" />
        <input type="text" value={boardData?.shop_address || ''} onChange={(e) => handleUpdate('shop_address', e.target.value)} style={{width:'100%', padding:'10px', marginBottom:'10px'}} placeholder="Địa chỉ" />
        <input type="text" value={boardData?.shop_phone || ''} onChange={(e) => handleUpdate('shop_phone', e.target.value)} style={{width:'100%', padding:'10px', marginBottom:'10px'}} placeholder="Số điện thoại" />
        <input type="text" value={boardData?.marquee_text || ''} onChange={(e) => handleUpdate('marquee_text', e.target.value)} style={{width:'100%', padding:'10px'}} placeholder="Chữ chạy quảng cáo" />
      </div>

      <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #ddd' }}>
        <h3>💰 Giá Vàng</h3>
        {(boardData?.prices || []).map((p, i) => (
          <div key={i} style={{ marginBottom: '10px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
            <input type="text" value={p.name} onChange={(e) => {
              const newP = [...boardData.prices]; newP[i].name = e.target.value; handleUpdate('prices', newP);
            }} style={{width:'100%', fontWeight:'bold'}} />
            <div style={{display:'flex', gap:'5px', marginTop:'5px'}}>
              <input type="number" value={p.mua} onChange={(e) => {
                const newP = [...boardData.prices]; newP[i].mua = e.target.value; handleUpdate('prices', newP);
              }} style={{flex:1, color:'green'}} />
              <input type="number" value={p.ban} onChange={(e) => {
                const newP = [...boardData.prices]; newP[i].ban = e.target.value; handleUpdate('prices', newP);
              }} style={{flex:1, color:'red'}} />
              <button onClick={() => handleUpdate('prices', boardData.prices.filter((_, idx) => idx !== i))} style={{background:'red', color:'white', border:'none'}}>Xóa</button>
            </div>
          </div>
        ))}
        <button onClick={() => handleUpdate('prices', [...(boardData?.prices || []), { name: "VÀNG MỚI", mua: 0, ban: 0 }])} style={{ width: '100%', padding: '10px', background: '#00cc66', color: '#fff', border: 'none' }}>+ THÊM HÀNG</button>
      </div>
      <div style={{ marginTop: '10px' }}>
        <label>Chữ chạy dưới màn hình:</label>
        <input 
          type="text" 
          value={boardData?.marquee_text || ""} 
          onChange={(e) => handleUpdate('marquee_text', e.target.value)} 
          style={{ width: '100%', padding: '10px', marginTop: '5px' }}
          placeholder="Nhập nội dung thông báo..."
        />
      </div>

      <div style={{ marginTop: '20px' }}>
        <h3>🎨 Chọn Giao Diện</h3>
        {Object.keys(globalTemplates).map((key) => (
          <button key={key} onClick={() => applyTheme(key)} style={{ padding: '10px', marginRight: '10px', cursor: 'pointer' }}>
            {globalTemplates[key].name || key}
          </button>
        ))}
      </div>
    </div>
  );
}