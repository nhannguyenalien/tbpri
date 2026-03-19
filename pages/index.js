import { useState, useEffect, useRef } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, get, update, set, onValue, push, serverTimestamp } from 'firebase/database';
import { getAuth, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';


// 1. Cấu hình Firebase
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
const ADMIN_UID = "mdEgge6YZcXO1RQmfKIZZaLRidF2"; // UID Admin của Nhan
// Component bọc các tính năng trả phí
const PremiumGate = ({ isPro, children, message = "Nâng cấp Premium" }) => {
  if (isPro) return children; // Nếu là Pro, cho xem nội dung gốc bình thường

  return (
    <div
      onClick={() => window.location.href = '/premium'}
      style={{
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        color: '#ff9800',
        fontSize: '13px',
        fontWeight: 'bold',
        textDecoration: 'underline'
      }}
    >
      🔒 {message}
    </div>
  );
};

export default function HomeAdmin() {
  const [user, setUser] = useState(null);
  const [boardData, setBoardData] = useState(null);
  const [globalTemplates, setGlobalTemplates] = useState({});
  const [history, setHistory] = useState([]);
  const [isArchiving, setIsArchiving] = useState(false);
  const isPro = boardData?.plan === 'premium';
  // Fingerprint để so sánh giá cũ/mới (Chống dư thừa dữ liệu)
  const lastSavedPricesRef = useRef("");

  // State cho Đăng nhập
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  //1. redirect tv link
  const [pairCode, setPairCode] = useState('');
  const [isPairing, setIsPairing] = useState(false);

  const handlePairTV = async () => {
    // 1. Kiểm tra quyền và đầu vào
    if (!isPro) return alert("Tính năng này chỉ dành cho gói Premium!");
    if (!user || !user.uid) return alert("Vui lòng đăng nhập để thực hiện!");
    if (pairCode.length !== 6) return alert("Vui lòng nhập đúng 6 chữ số hiện trên TV");

    setIsPairing(true);

    // 2. Tạo tham chiếu đến mã pairing trong Firebase
    const codeRef = ref(db, `pairing_codes/${pairCode}`);

    try {
      // 3. Lấy dữ liệu (Dùng hàm 'get' đã import)
      const snapshot = await get(codeRef);

      if (snapshot.exists()) {
        // 4. Cập nhật trạng thái (Dùng hàm 'update' đã import)
        await update(codeRef, {
          admin_uid: user.uid, // Ghi ID người quản lý
          status: 'paired',
          pairedAt: Date.now() // Nên thêm thời gian để quản lý
        });

        alert("Kết nối Tivi thành công! 🎉");
        setPairCode(''); // Xóa mã sau khi xong
      } else {
        alert("Mã không tồn tại hoặc đã hết hạn!");
      }
    } catch (err) {
      console.error("Lỗi Firebase:", err);
      alert("Lỗi kết nối: " + err.message);
    } finally {
      setIsPairing(false);
    }
  };

  // 2. Lắng nghe trạng thái User và Dữ liệu
  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Lấy giá hiện tại trên Tivi
        onValue(ref(db, `tv_sessions/${currentUser.uid}`), (s) => {
          if (s.exists()) setBoardData(s.val());
          else set(ref(db, `tv_sessions/${currentUser.uid}`), { shop_name: "Tiệm Vàng Mới", prices: [] });
        });
        // Lấy kho Template
        onValue(ref(db, 'global_templates'), (s) => s.exists() && setGlobalTemplates(s.val()));
        // Lấy 10 bản ghi lịch sử mới nhất
        onValue(ref(db, `price_history/${currentUser.uid}`), (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            const sorted = Object.entries(data)
              .map(([id, val]) => ({ id, ...val }))
              .sort((a, b) => b.timestamp - a.timestamp);
            setHistory(sorted.slice(0, 10));
          }
        });
      }
    });
  }, []);

  // 1. Khai báo Ref để ghi nhớ trạng thái (không gây render lại)
  const lastSavedFingerprint = useRef("");
  // 3. Logic Tự động Lưu Lịch sử (Thông minh & Tiết kiệm)
  // 3. Logic Tự động Lưu Lịch sử (Chỉ lưu 1 bản ghi duy nhất mỗi ngày)
  useEffect(() => {
    // Chỉ chạy nếu là Pro và có dữ liệu giá
    if (!isPro || !boardData?.prices || boardData.prices.length === 0) return;

    // 1. Lấy ngày hiện tại (Ví dụ: "19/3/2026")
    const today = new Date().toLocaleDateString('vi-VN');

    // 2. KIỂM TRA QUAN TRỌNG: Trong history đã có bản ghi nào của ngày hôm nay chưa?
    // Chúng ta duyệt qua mảng history và xem có dateString nào chứa ngày hôm nay không.
    const alreadySavedToday = history.some(record =>
      record.dateString && record.dateString.includes(today)
    );

    // Nếu hôm nay đã lưu rồi thì THOÁT LUÔN, không làm gì thêm.
    if (alreadySavedToday) {
      console.log(`📅 Ngày ${today} đã được lưu. Hệ thống sẽ không lưu thêm.`);
      return;
    }

    // 3. Nếu chưa có bản ghi cho hôm nay, đợi 10 giây sau khi ổn định giá rồi mới lưu
    const timer = setTimeout(() => {
      setIsArchiving(true);

      push(ref(db, `price_history/${user.uid}`), {
        prices: boardData.prices,
        timestamp: serverTimestamp(),
        dateString: new Date().toLocaleString('vi-VN') // Lưu định dạng "HH:mm:ss DD/MM/YYYY"
      }).then(() => {
        setIsArchiving(false);
        console.log("🌅 Đã chốt sổ giá cho ngày mới: " + today);
      }).catch(err => {
        console.error("Lỗi lưu lịch sử:", err);
        setIsArchiving(false);
      });

    }, 10000); // 10 giây delay để tránh lưu lúc đang gõ dở

    return () => clearTimeout(timer);
  }, [boardData?.prices, history, isPro]);

  const handleUpdate = (field, value) => update(ref(db, `tv_sessions/${user.uid}`), { [field]: value });

  const applyTheme = (themeKey) => {
    const theme = globalTemplates[themeKey];
    if (!theme) return;
    update(ref(db, `tv_sessions/${user.uid}`), {
      html_template: theme.html_template,
      row_template: theme.row_template,
      css_template: theme.css_template,
      template_id: themeKey
    });
    alert("Đã đổi giao diện: " + theme.name);
  };

  const downloadAllHistory = () => {
    if (!isPro) return alert("Vui lòng nâng cấp Premium để tải dữ liệu!"); // Check quyền ở đây

    let csv = "\uFEFFNgày giờ,Loại vàng,Mua vào,Bán ra\n"; // BOM để hiện đúng tiếng Việt

    // Gom tất cả các phiên bản trong history vào 1 file
    history.forEach(item => {
      (item.prices || []).forEach(p => {
        csv += `${item.dateString},${p.name},${p.mua},${p.ban}\n`;
      });
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `ToanBoLichSuGia.csv`;
    link.click();
  };

  // --- UI: LOGIN ---
  if (!user) {
    return (
      <div style={{ padding: '50px 20px', fontFamily: 'sans-serif', maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
        <h1 style={{ color: '#007acc' }}>GOLD PRICE ADMIN</h1>
        <button onClick={() => signInWithPopup(auth, googleProvider)} style={{ width: '100%', padding: '12px', background: '#fff', color: '#444', border: '1px solid #ddd', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', marginBottom: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20" /> Đăng nhập Google
        </button>
        <div style={{ margin: '15px 0', color: '#ccc', fontSize: '12px' }}>HOẶC DÙNG TÀI KHOẢN ADMIN</div>
        <form onSubmit={(e) => { e.preventDefault(); signInWithEmailAndPassword(auth, email, password).catch(err => alert("Sai thông tin!")); }} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '5px' }} />
          <input type="password" placeholder="Mật khẩu" value={password} onChange={e => setPassword(e.target.value)} style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '5px' }} />
          <button type="submit" style={{ padding: '12px', background: '#007acc', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Đăng nhập</button>
        </form>
      </div>
    );
  }

  // --- UI: DASHBOARD ---
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'Arial, sans-serif', background: '#f8f9fa', minHeight: '100vh' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '10px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#888' }}>Xin chào,</div>
          <strong style={{ fontSize: '14px' }}>{user.email}</strong>
        </div>
        <PremiumGate isPro={isPro} message="NÂNG CẤP NGAY" />
        <button onClick={() => signOut(auth)} style={{ padding: '5px 15px', background: '#f44336', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Đăng xuất</button>
      </header>

      {isArchiving && <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#333', color: '#fff', padding: '8px 20px', borderRadius: '20px', fontSize: '12px', zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>🔄 Đang tự động lưu lịch sử giá...</div>}

      <div style={{ background: '#e3f2fd', padding: '15px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>
        <strong>📺 Link hiển thị Tivi: </strong>
        <a href={`/${user.uid}`} target="_blank" rel="noreferrer" style={{ color: '#007acc' }}>{window.location.origin}/{user.uid}</a>

      </div>
      <div style={{
        background: '#fff',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid #dee2e6',
        marginTop: '20px',
        borderLeft: isPro ? '4px solid #007acc' : '4px solid #ff9800' // Đổi màu viền để phân biệt Pro/Free
      }}>
        <h3 style={{ marginTop: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          📺 Kết nối Tivi mới
          {!isPro && <PremiumGate isPro={isPro} message="PRO" />}
        </h3>

        <p style={{ fontSize: '12px', color: '#666' }}>
          Nhập 6 số đang hiển thị trên màn hình Tivi của bạn:
        </p>

        <div style={{
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          filter: isPro ? 'none' : 'grayscale(100%) opacity(0.6)', // Làm xám và mờ nếu là bản Free
        }}>
          <input
            type="text"
            maxLength="6"
            value={isPro ? pairCode : '******'} // Che mã nếu không phải Pro
            onChange={(e) => setPairCode(e.target.value.replace(/\D/g, ''))}
            placeholder="123456"
            disabled={!isPro} // Khóa input nếu không phải Pro
            style={{
              flex: 1,
              padding: '12px',
              fontSize: '18px',
              textAlign: 'center',
              letterSpacing: '5px',
              border: '2px solid #dee2e6',
              borderRadius: '6px',
              background: isPro ? '#fff' : '#f1f3f5'
            }}
          />

          {/* Dùng PremiumGate bọc nút bấm hoặc thay thế nút bấm */}
          <PremiumGate isPro={isPro} message="Mở khóa kết nối TV">
            <button
              onClick={handlePairTV}
              disabled={isPairing}
              style={{
                padding: '12px 20px',
                background: '#007acc',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {isPairing ? '...' : 'KẾT NỐI'}
            </button>
          </PremiumGate>
        </div>

        {!isPro && (
          <p style={{ fontSize: '11px', color: '#ff9800', marginTop: '10px', fontStyle: 'italic' }}>
            * Tính năng đồng bộ Tivi thời gian thực yêu cầu tài khoản Premium.
          </p>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
        {/* KHỐI 1: THÔNG TIN CƠ BẢN */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
          <h3 style={{ marginTop: 0, fontSize: '16px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>⚙️ Thông tin cửa hàng</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ fontSize: '12px', color: '#666' }}>Tên tiệm vàng:</label>
            <input type="text" value={boardData?.shop_name || ''} onChange={(e) => handleUpdate('shop_name', e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }} placeholder="Tên tiệm" />

            <label style={{ fontSize: '12px', color: '#666' }}>Địa chỉ:</label>
            <input type="text" value={boardData?.shop_address || ''} onChange={(e) => handleUpdate('shop_address', e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }} placeholder="Địa chỉ hiển thị trên TV" />

            <label style={{ fontSize: '12px', color: '#666' }}>Số điện thoại:</label>
            <input type="text" value={boardData?.shop_phone || ''} onChange={(e) => handleUpdate('shop_phone', e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }} placeholder="Số điện thoại hiển thị" />

            <label style={{ fontSize: '12px', color: '#666', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
              Chữ chạy thông báo: {!isPro && <span style={{ color: 'orange' }}>🔒 Chỉ dành cho Pro</span>}
              <PremiumGate isPro={isPro} message="Mở khóa tính năng này" />
            </label>
            <input
              type="text"
              disabled={!isPro}
              value={isPro ? (boardData?.marquee_text || '') : 'Chúc Quý Khách Phát Tài Phát Lộc!'}
              onChange={(e) => handleUpdate('marquee_text', e.target.value)}
              style={{
                width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px',
                background: isPro ? '#fff' : '#f0f0f0', cursor: isPro ? 'text' : 'not-allowed'
              }}
              placeholder={isPro ? "Nhập nội dung thông báo..." : "Nâng cấp Premium để tùy chỉnh chữ chạy"}
            />
          </div>
        </div>

        {/* KHỐI 2: CẬP NHẬT GIÁ (Giới hạn 4 dòng cho bản Free) */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
          <h3 style={{ marginTop: 0, fontSize: '16px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>💰 Bảng giá hiện tại</h3>
          {(boardData?.prices || []).map((p, i) => (
            <div key={i} style={{ marginBottom: '15px', padding: '10px', background: '#fcfcfc', border: '1px solid #f0f0f0', borderRadius: '6px' }}>
              <input type="text" value={p.name} onChange={(e) => {
                const newP = [...boardData.prices]; newP[i].name = e.target.value; handleUpdate('prices', newP);
              }} style={{ width: '100%', fontWeight: 'bold', border: 'none', background: 'transparent', marginBottom: '5px', fontSize: '15px' }} />
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <small style={{ color: 'green' }}>MUA VÀO</small>
                  <input type="number" value={p.mua} onChange={(e) => {
                    const newP = [...boardData.prices]; newP[i].mua = e.target.value; handleUpdate('prices', newP);
                  }} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', color: 'green', fontWeight: 'bold' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <small style={{ color: 'red' }}>BÁN RA</small>
                  <input type="number" value={p.ban} onChange={(e) => {
                    const newP = [...boardData.prices]; newP[i].ban = e.target.value; handleUpdate('prices', newP);
                  }} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', color: 'red', fontWeight: 'bold' }} />
                </div>
                <button onClick={() => handleUpdate('prices', boardData.prices.filter((_, idx) => idx !== i))} style={{ alignSelf: 'flex-end', padding: '8px', background: '#fff', color: 'red', border: '1px solid red', borderRadius: '4px', cursor: 'pointer' }}>Xóa</button>
              </div>
            </div>
          ))}

          {/* Logic hiện nút thêm hàng: Pro mở hết, Free dừng ở 4 dòng */}
          {(isPro || (boardData?.prices || []).length < 4) ? (
            <button onClick={() => handleUpdate('prices', [...(boardData?.prices || []), { name: "LOẠI VÀNG MỚI", mua: 0, ban: 0 }])} style={{ width: '100%', padding: '12px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>+ THÊM LOẠI VÀNG</button>
          ) : (
            <div style={{ textAlign: 'center', padding: '10px', color: 'orange', border: '1px dashed orange', borderRadius: '6px', fontSize: '13px' }}>
              ⚠️ Bản Miễn Phí giới hạn 4 dòng giá. Vui lòng nâng cấp Pro để thêm không giới hạn.
              <PremiumGate isPro={isPro} message="Click để mở khóa Lịch sử & Tải Excel" />
            </div>

          )}
        </div>

        {/* KHỐI 3: GIAO DIỆN (Khóa template trừ bản mặc định cho Free) */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
          <h3 style={{ marginTop: 0, fontSize: '16px' }}>🎨 Chọn giao diện Tivi</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {Object.keys(globalTemplates).map((key) => {
              const isLocked = !isPro && key !== 'mau_do_truyen_thong'; // 'mau_do_mac_dinh' là ID template free
              return (
                <button
                  key={key}
                  disabled={isLocked}
                  onClick={() => applyTheme(key)}
                  style={{
                    padding: '10px 15px',
                    cursor: isLocked ? 'not-allowed' : 'pointer',
                    background: isLocked ? '#eee' : (boardData?.template_id === key ? '#007acc' : '#f8f9fa'),
                    color: isLocked ? '#999' : (boardData?.template_id === key ? '#fff' : '#333'),
                    border: '1px solid #ddd', borderRadius: '6px'
                  }}
                >
                  {isLocked ? `🔒 ${globalTemplates[key].name}` : globalTemplates[key].name}
                </button>
              );
            })}
          </div>
        </div>


        {/* KHỐI 4: LỊCH SỬ - Luôn hiện để quảng bá tính năng */}
        <div style={{
          background: '#fff',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #dee2e6',
          position: 'relative', // Để làm lớp phủ mờ nếu cần
          opacity: isPro ? 1 : 0.7 // Làm mờ nhẹ bản Free cho đẹp
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '16px' }}>
              📜 Lịch sử đổi giá {!isPro && <span style={{ fontSize: '12px', color: 'orange' }}> (Premium)</span>}
            </h3>
            <button
              onClick={downloadAllHistory}
              style={{
                background: isPro ? '#17a2b8' : '#ccc',
                color: '#fff',
                border: 'none',
                padding: '8px 15px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              {isPro ? "📥 TẢI TOÀN BỘ (CSV)" : "🔒 Tải lịch sử"}
              <PremiumGate isPro={isPro} message="Click để mở khóa Lịch sử & Tải Excel" />
            </button>
          </div>

          <div style={{ maxHeight: '300px', overflowY: 'auto', filter: isPro ? 'none' : 'blur(2px)' }}>
            {/* Nếu là Pro thì hiện bảng thật, nếu Free thì hiện bảng mẫu hoặc bảng trống */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#eee' }}>
                <tr>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Thời gian</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Số loại vàng</th>
                </tr>
              </thead>
              <tbody>
                {isPro ? (
                  history.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '10px' }}>{item.dateString}</td>
                      <td style={{ padding: '10px' }}>{item.prices?.length || 0}</td>
                    </tr>
                  ))
                ) : (
                  // Hiển thị vài dòng giả để mồi chài khách bản Free
                  <>
                    <tr><td style={{ padding: '10px' }}>15/03/2026 08:30:15</td><td style={{ padding: '10px' }}>8</td></tr>
                    <tr><td style={{ padding: '10px' }}>14/03/2026 09:15:42</td><td style={{ padding: '10px' }}>8</td></tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Lớp phủ thông báo cho bản Free */}
          {!isPro && (
            <div style={{
              position: 'absolute', top: '50px', left: 0, right: 0, bottom: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.4)', zIndex: 5, borderRadius: '8px'
            }}>
              <div style={{
                background: '#333', color: '#fff', padding: '10px 20px',
                borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
              }}>
                ✨ Nâng cấp Premium để mở khóa Lịch sử & Tải Excel
              </div>
            </div>
          )}
        </div>

        {/* ADMIN ONLY */}
        {user?.uid === ADMIN_UID && (
          <button onClick={() => window.location.href = '/admintemplate'} style={{ padding: '15px', background: '#000', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>⚙️ QUẢN LÝ KHO TEMPLATE (ADMIN ONLY)</button>
        )}
      </div>
    </div>
  );
}