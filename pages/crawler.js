import { useState, useEffect } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, update, set, onValue, remove } from 'firebase/database';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

// 1. CẤU HÌNH FIREBASE (Dữ liệu của ông)
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
const ADMIN_UID = "mdEgge6YZcXO1RQmfKIZZaLRidF2";

// MẪU JSON MẶC ĐỊNH
const JSON_TEMPLATE = {
  "id_tiem_vang": {
    "name": "Tên Tiệm Vàng",
    "url": "https://link-web-vang.com",
    "enabled": true,
    "row_selector": "table tr:has(td)",
    "name_selector": "td:nth-child(1)",
    "buy_selector": "td:nth-child(2)",
    "sell_selector": "td:nth-child(3)"
  }
};

export default function CrawlerManager() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [crawlerConfigs, setCrawlerConfigs] = useState({});
  const [jsonInput, setJsonInput] = useState("");

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser && currentUser.uid === ADMIN_UID) {
        onValue(ref(db, 'crawler_configs'), (s) => setCrawlerConfigs(s.exists() ? s.val() : {}));
      }
    });
    return () => unsubAuth();
  }, []);

  // --- HÀM XỬ LÝ CHÍNH ---

  const handleAddTemplate = () => {
    setJsonInput(JSON.stringify(JSON_TEMPLATE, null, 2));
  };

  const handleSaveJson = () => {
    try {
      const parsedData = JSON.parse(jsonInput);
      Object.keys(parsedData).forEach(key => {
        set(ref(db, `crawler_configs/${key}`), parsedData[key]);
      });
      alert("✅ Lưu cấu hình thành công!");
      setJsonInput("");
    } catch (e) {
      alert("❌ Lỗi: Định dạng JSON không chuẩn. Kiểm tra lại dấu ngoặc/phẩy.");
    }
  };

  // HÀM XÓA TỔNG LỰC (Xóa Config + Giá Live + Lịch sử)
  const handleDeleteConfig = async (id, name) => {
    const confirmMsg = `⚠️ BẠN CÓ CHẮC CHẮN MUỐN XÓA TIỆM: ${name || id}?\n\nHành động này sẽ xóa sạch cấu hình, bảng giá tham khảo và lịch sử biểu đồ của tiệm này.`;
    
    if (window.confirm(confirmMsg)) {
      try {
        // 1. Xóa cấu hình
        await remove(ref(db, `crawler_configs/${id}`));
        // 2. Xóa giá đang hiển thị
        await remove(ref(db, `external_prices/sources/${id}`));
        // 3. Xóa lịch sử biểu đồ
        await remove(ref(db, `external_history/${id}`));
        
        alert("🗑️ Đã xóa sạch dữ liệu khỏi hệ thống!");
      } catch (err) {
        alert("❌ Lỗi khi xóa: " + err.message);
      }
    }
  };

  if (loading) return <div style={{padding: '50px', textAlign: 'center', color: '#fff', background: '#1e1e1e', minHeight: '100vh'}}>Đang kiểm tra quyền...</div>;
  if (!user || user.uid !== ADMIN_UID) return <div style={{padding: '50px', textAlign: 'center', color: 'red', background: '#1e1e1e', minHeight: '100vh'}}>🚫 Truy cập bị từ chối</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'monospace', background: '#1e1e1e', color: '#d4d4d4', minHeight: '100vh' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', borderBottom: '1px solid #333', paddingBottom: '15px' }}>
        <div>
          <h2 style={{color: '#61dafb', margin: 0}}>🛠️ JSON CRAWLER EDITOR</h2>
          <p style={{fontSize: '12px', color: '#888'}}>Quản lý Robot quét giá thị trường</p>
        </div>
        <button onClick={() => window.location.href = '/'} style={{padding: '10px 20px', cursor: 'pointer', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '5px'}}>Về Dashboard</button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '30px' }}>
        
        {/* CỘT TRÁI: EDITOR */}
        <div>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <button onClick={handleAddTemplate} style={btnStyle}>➕ Thêm Mẫu Mới</button>
            <button onClick={handleSaveJson} style={{ ...btnStyle, background: '#28a745' }}>💾 Lưu Cấu Hình</button>
          </div>
          
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder="// Dán JSON cấu hình tiệm vàng vào đây..."
            style={{
              width: '100%',
              height: '450px',
              background: '#252526',
              color: '#9cdcfe',
              padding: '15px',
              border: '1px solid #3c3c3c',
              borderRadius: '5px',
              fontSize: '14px',
              lineHeight: '1.5',
              outline: 'none',
              fontFamily: 'Consolas, monospace'
            }}
          />
        </div>

        {/* CỘT PHẢI: DANH SÁCH SOURCE HIỆN TẠI */}
        <div>
          <h3 style={{marginTop: 0, color: '#ce9178'}}>📡 Nguồn đã lưu ({Object.keys(crawlerConfigs).length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '500px', overflowY: 'auto', paddingRight: '5px' }}>
            {Object.entries(crawlerConfigs).map(([id, cfg]) => (
              <div key={id} style={{ 
                background: '#2d2d2d', 
                padding: '15px', 
                borderRadius: '8px', 
                borderLeft: `4px solid ${cfg.enabled ? '#28a745' : '#dc3545'}`,
                fontSize: '13px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <strong style={{color: '#4ec9b0'}}>{id}</strong>
                  <div style={{display: 'flex', gap: '8px'}}>
                    <button onClick={() => setJsonInput(JSON.stringify({ [id]: cfg }, null, 2))} style={miniBtn}>Sửa</button>
                    <button onClick={() => handleDeleteConfig(id, cfg.name)} style={{ ...miniBtn, color: '#f44336' }}>Xóa</button>
                  </div>
                </div>
                <div style={{color: '#ce9178', fontWeight: 'bold'}}>{cfg.name}</div>
                <div style={{fontSize: '11px', color: '#666', marginTop: '5px', wordBreak: 'break-all'}}>{cfg.url}</div>
              </div>
            ))}
          </div>
        </div>

      </div>

      <footer style={{marginTop: '50px', borderTop: '1px solid #333', paddingTop: '20px', fontSize: '12px', color: '#555'}}>
        * Lưu ý: Khi xóa tiệm, tất cả dữ liệu lịch sử liên quan sẽ biến mất vĩnh viễn.
      </footer>
    </div>
  );
}

// STYLES
const btnStyle = { 
  padding: '12px 20px', 
  cursor: 'pointer', 
  border: 'none', 
  borderRadius: '4px', 
  background: '#007acc', 
  color: '#fff', 
  fontWeight: 'bold',
  transition: '0.2s',
  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
};

const miniBtn = { 
  background: '#3e3e3e', 
  border: 'none', 
  color: '#569cd6', 
  cursor: 'pointer', 
  fontSize: '11px', 
  padding: '4px 8px',
  borderRadius: '3px'
};