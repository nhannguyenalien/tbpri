import { useState, useEffect } from 'react';
import { ref, update, set, onValue, remove } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
import { db } from '../lib/firebase';
import { auth } from '../lib/auth';

const ADMIN_UID = "mdEgge6YZcXO1RQmfKIZZaLRidF2";

// ======================
// 📦 TEMPLATE (HTML + API)
// ======================
const JSON_TEMPLATE = {
  "html_example": {
    "name": "Tiệm vàng (HTML)",
    "url": "https://link-web-vang.com",
    "enabled": true,
    "row_selector": "table tr:has(td)",
    "name_selector": "td:nth-child(1)",
    "buy_selector": "td:nth-child(2)",
    "sell_selector": "td:nth-child(3)"
  },
  "api_example": {
    "name": "Tiệm vàng (API)",
    "enabled": true,
    "type": "api",
    "api_url": "https://api.example.com/gold",
    "mapping": {
      "name": "type",
      "buy": "buy",
      "sell": "sell"
    },
    "unit": "x1000"
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
        onValue(ref(db, 'crawler_configs'), (s) => {
          setCrawlerConfigs(s.exists() ? s.val() : {});
        });
      }
    });
    return () => unsubAuth();
  }, []);

  // ======================
  // 🧠 HANDLERS
  // ======================

  const handleAddTemplate = () => {
    setJsonInput(JSON.stringify(JSON_TEMPLATE, null, 2));
  };

  const handleSaveJson = async () => {
    try {
      const parsedData = JSON.parse(jsonInput);
      const writes = [];

      Object.entries(parsedData).forEach(([key, cfg]) => {

        // 🔴 Validate API
        if (cfg.type === "api") {
          if (!cfg.api_url || !cfg.mapping) {
            throw new Error(`Config ${key} thiếu api_url hoặc mapping`);
          }
        }

        // 🟢 Validate HTML
        if (!cfg.type) {
          if (!cfg.url) {
            throw new Error(`Config ${key} thiếu url`);
          }
        }

        writes.push(set(ref(db, `crawler_configs/${key}`), cfg));
      });

      await Promise.all(writes);
      alert("✅ Lưu cấu hình thành công!");
      setJsonInput("");

    } catch (e) {
      alert("❌ Lỗi: " + e.message);
    }
  };

  const handleDeleteConfig = async (id, name) => {
    const confirmMsg = `⚠️ XÓA TIỆM: ${name || id}?\n\nXóa toàn bộ dữ liệu!`;

    if (window.confirm(confirmMsg)) {
      try {
        await remove(ref(db, `crawler_configs/${id}`));
        await remove(ref(db, `external_prices/sources/${id}`));
        await remove(ref(db, `external_history/${id}`));

        alert("🗑️ Đã xóa sạch!");
      } catch (err) {
        alert("❌ Lỗi: " + err.message);
      }
    }
  };

  // ======================
  // 🔐 AUTH GUARD
  // ======================
  if (loading) return <div style={pageStyle}>Đang kiểm tra quyền...</div>;
  if (!user || user.uid !== ADMIN_UID) return <div style={pageStyle}>🚫 Truy cập bị từ chối</div>;

  // ======================
  // 🎨 UI
  // ======================
  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <div>
          <h2 style={{color: '#61dafb', margin: 0}}>🛠️ JSON CRAWLER EDITOR</h2>
          <p style={{fontSize: '12px', color: '#888'}}>Quản lý Robot quét giá</p>
        </div>
        <button onClick={() => window.location.href = '/'} style={btnStyle}>Dashboard</button>
      </header>

      <div style={gridStyle}>

        {/* EDITOR */}
        <div>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <button onClick={handleAddTemplate} style={btnStyle}>➕ Template</button>
            <button onClick={handleSaveJson} style={{ ...btnStyle, background: '#28a745' }}>💾 Save</button>
          </div>

          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder="// Dán JSON vào đây..."
            style={textareaStyle}
          />
        </div>

        {/* LIST */}
        <div>
          <h3 style={{color: '#ce9178'}}>📡 Sources ({Object.keys(crawlerConfigs).length})</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Object.entries(crawlerConfigs).map(([id, cfg]) => (
              <div key={id} style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong style={{color: '#4ec9b0'}}>{id}</strong>
                  <div>
                    <button onClick={() => setJsonInput(JSON.stringify({ [id]: cfg }, null, 2))} style={miniBtn}>Sửa</button>
                    <button onClick={() => handleDeleteConfig(id, cfg.name)} style={{ ...miniBtn, color: '#f44336' }}>Xóa</button>
                  </div>
                </div>

                <div style={{color: '#ce9178'}}>{cfg.name}</div>

                <div style={{fontSize: '11px', color: '#888'}}>
                  {cfg.type === 'api' ? '⚡ API' : '🌐 HTML'}
                </div>

                <div style={{fontSize: '11px', color: '#666', wordBreak: 'break-all'}}>
                  {cfg.url || cfg.api_url}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

// ======================
// 🎨 STYLES
// ======================
const pageStyle = { padding: 50, textAlign: 'center', background: '#1e1e1e', color: '#fff', minHeight: '100vh' };

const containerStyle = { padding: 20, maxWidth: 1200, margin: '0 auto', fontFamily: 'monospace', background: '#1e1e1e', color: '#d4d4d4', minHeight: '100vh' };

const headerStyle = { display: 'flex', justifyContent: 'space-between', marginBottom: 30 };

const gridStyle = { display: 'grid', gridTemplateColumns: '1fr 350px', gap: 30 };

const textareaStyle = {
  width: '100%',
  height: 450,
  background: '#252526',
  color: '#9cdcfe',
  padding: 15,
  borderRadius: 5,
  fontFamily: 'monospace'
};

const cardStyle = {
  background: '#2d2d2d',
  padding: 12,
  borderRadius: 6
};

const btnStyle = {
  padding: '10px 16px',
  background: '#007acc',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer'
};

const miniBtn = {
  marginLeft: 5,
  background: '#3e3e3e',
  border: 'none',
  color: '#569cd6',
  cursor: 'pointer',
  fontSize: 11,
  padding: '4px 8px'
};
