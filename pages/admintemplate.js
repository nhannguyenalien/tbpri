import { useState, useEffect, useRef } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, remove, get, update } from 'firebase/database';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import Editor from '@monaco-editor/react';

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

const SAMPLE_DATA = {
  shop_name: "TIỆM VÀNG DEMO", shop_address: "123 Đường ABC, Quận 1", shop_phone: "0909 123 456",
  marquee_text: "Chào mừng quý khách! Chúc quý khách vạn sự như ý!",
  prices: [
    { name: "VÀNG SJC", mua: "82000", ban: "84500" },
    { name: "VÀNG 9999", mua: "78000", ban: "79500" },
    { name: "VÀNG 24K", mua: "76000", ban: "77500" }
  ]
};

export default function AdminTemplate() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [templates, setTemplates] = useState({});
  const [form, setForm] = useState({ id: '', name: '', css: '', html: '', row: '' });
  
  // State quản lý độ rộng các cột
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const [editorWidth, setEditorWidth] = useState(500);
  const isResizingSidebar = useRef(false);
  const isResizingEditor = useRef(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      if (u && u.uid === ADMIN_UID) {
        setIsAdmin(true);
        onValue(ref(db, 'global_templates'), (s) => setTemplates(s.val() || {}));
      } else { setIsAdmin(false); }
    });
  }, []);

  // Logic kéo thả các cột
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isResizingSidebar.current) {
        setSidebarWidth(e.clientX);
      }
      if (isResizingEditor.current) {
        const newWidth = e.clientX - sidebarWidth;
        if (newWidth > 200) setEditorWidth(newWidth);
      }
    };
    const handleMouseUp = () => {
      isResizingSidebar.current = false;
      isResizingEditor.current = false;
      document.body.style.cursor = 'default';
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [sidebarWidth]);

  const save = () => {
    if (!form.id) return alert("Nhập ID!");
    set(ref(db, `global_templates/${form.id}`), {
      name: form.name, css_template: form.css, html_template: form.html, row_template: form.row
    }).then(() => alert("Đã lưu!"));
  };

  const syncToAllTVs = async () => {
    if (!form.id) return alert("Vui lòng chọn một mẫu để đồng bộ!");
    
    // Hỏi lại cho chắc chắn tránh lỡ tay bấm nhầm
    if (!confirm(`Bạn có chắc muốn chép đè giao diện này lên TOÀN BỘ Tivi đang dùng mẫu "${form.id}" không?`)) return;

    try {
      const sessionsSnapshot = await get(ref(db, 'tv_sessions'));
      if (sessionsSnapshot.exists()) {
        const sessions = sessionsSnapshot.val();
        const updates = {};
        let affectedTVs = 0;

        // Quét toàn bộ khách hàng
        Object.entries(sessions).forEach(([uid, sessionData]) => {
          if (sessionData.template_id === form.id) {
            updates[`tv_sessions/${uid}/css_template`] = form.css;
            updates[`tv_sessions/${uid}/html_template`] = form.html;
            updates[`tv_sessions/${uid}/row_template`] = form.row;
            affectedTVs++;
          }
        });

        if (affectedTVs > 0) {
          await update(ref(db), updates);
          alert(`✅ Đã ép đồng bộ thành công tới ${affectedTVs} màn hình Tivi!`);
        } else {
          alert(`⚠️ Hiện tại chưa có Tivi nào cài đặt mẫu này.`);
        }
      }
    } catch (err) {
      console.error("Lỗi đồng bộ:", err);
      alert("Lỗi hệ thống: " + err.message);
    }
  };

  const duplicate = () => {
    if (!form.id) return alert("Hãy chọn một mẫu để nhân bản!");
    const newId = form.id + "_copy";
    setForm({ ...form, id: newId, name: form.name + " (Bản sao)" });
    alert("Đã nhân bản dữ liệu sang ID mới. Hãy sửa và bấm Lưu.");
  };

  const getPreviewSrcDoc = () => {
    let rowsHtml = "";
    SAMPLE_DATA.prices.forEach(p => {
      rowsHtml += (form.row || "")
        .replace(/{{LOAI_VANG}}/g, p.name)
        .replace(/{{GIA_MUA}}/g, Number(p.mua).toLocaleString('vi-VN'))
        .replace(/{{GIA_BAN}}/g, Number(p.ban).toLocaleString('vi-VN'));
    });
    const fullHTML = (form.html || "")
      .replace(/{{SHOP_NAME}}/g, SAMPLE_DATA.shop_name)
      .replace(/{{MARQUEE_TEXT}}/g, SAMPLE_DATA.marquee_text)
      .replace(/{{PRICE_LIST}}/g, rowsHtml);
    return `<html><head><style>body{margin:0}${form.css}</style></head><body>${fullHTML}</body></html>`;
  };

  if (!isAdmin) return <div style={{textAlign:'center', marginTop:'100px'}}><h2>⚠️ Từ chối truy cập</h2></div>;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#fff', color: '#333', fontFamily: 'Arial' }}>
      
      {/* HEADER TRẮNG */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 15px', borderBottom: '1px solid #ddd', background: '#fff' }}>
        <h3 style={{margin:0, color:'#007acc'}}>🚀 Quản Lý Template</h3>
        <div style={{display:'flex', gap:'10px'}}>
            <button onClick={() => setForm({id:'', name:'', css:'', html:'', row:''})} style={{padding:'5px 15px', cursor:'pointer', background:'#f0f0f0', border:'1px solid #ccc'}}>➕ THÊM MỚI</button>
            <button onClick={duplicate} style={{padding:'5px 15px', cursor:'pointer', background:'#e1f5fe', border:'1px solid #01579b', color:'#01579b'}}>👯 NHÂN BẢN</button>
            <button onClick={() => window.location.href='/'} style={{cursor:'pointer', border:'none', background:'none', color:'#666'}}>Thoát</button>
        </div>
      </div>
      
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* CỘT 1: DANH SÁCH (Sidebar) */}
        <div style={{ width: sidebarWidth, minWidth: '150px', borderRight: '1px solid #eee', background: '#fcfcfc', overflowY: 'auto', padding: '10px' }}>
          <small style={{fontWeight:'bold', color:'#888'}}>KHO MẪU</small>
          {Object.entries(templates).map(([id, data]) => (
            <div key={id} style={{ borderBottom: '1px solid #f0f0f0', padding: '8px 0', display:'flex', flexDirection:'column' }}>
              <span style={{fontSize:'0.9rem', fontWeight:'500'}}>{data.name}</span>
              <small style={{color:'#aaa', fontSize:'0.7rem'}}>{id}</small>
              <div style={{marginTop:'5px', display:'flex', gap:'5px'}}>
                <button onClick={() => setForm({ id, name: data.name, css: data.css_template, html: data.html_template, row: data.row_template })} style={{fontSize:'11px', cursor:'pointer'}}>Sửa</button>
                <button onClick={() => confirm('Xóa?') && remove(ref(db, `global_templates/${id}`))} style={{fontSize:'11px', color:'red', cursor:'pointer', background:'none', border:'none'}}>Xóa</button>
              </div>
            </div>
          ))}
        </div>

        {/* RESIZER 1 */}
        <div 
          onMouseDown={() => { isResizingSidebar.current = true; document.body.style.cursor = 'col-resize'; }}
          style={{ width: '4px', cursor: 'col-resize', background: '#f0f0f0', transition: 'background 0.2s' }}
          onMouseEnter={(e) => e.target.style.background = '#007acc'}
          onMouseLeave={(e) => e.target.style.background = '#f0f0f0'}
        />

        {/* CỘT 2: TRÌNH SOẠN THẢO (EDITOR) */}
        <div style={{ width: editorWidth, minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '8px', background: '#fff', padding: '10px', borderRight:'1px solid #eee' }}>
          <div style={{display:'flex', gap:'5px'}}>
            <input placeholder="ID Mẫu" value={form.id} onChange={e => setForm({...form, id: e.target.value})} style={{flex:1, border:'1px solid #ddd', padding:'8px'}} />
            <input placeholder="Tên Giao Diện" value={form.name} onChange={e => setForm({...form, name: e.target.value})} style={{flex:2, border:'1px solid #ddd', padding:'8px'}} />
          </div>

          <label style={{fontSize:'11px', fontWeight:'bold', color:'#007acc'}}>HTML (Body)</label>
          <div style={{flex: 1.5, border:'1px solid #eee'}}>
            <Editor theme="light" language="html" value={form.html} onChange={(val) => setForm({...form, html: val})} options={{ minimap: { enabled: false }, fontSize: 13, wordWrap: "on" }} />
          </div>

          <label style={{fontSize:'11px', fontWeight:'bold', color:'#007acc'}}>CSS (Style)</label>
          <div style={{flex: 1.5, border:'1px solid #eee'}}>
            <Editor theme="light" language="css" value={form.css} onChange={(val) => setForm({...form, css: val})} options={{ minimap: { enabled: false }, fontSize: 13, wordWrap: "on" }} />
          </div>

          <label style={{fontSize:'11px', fontWeight:'bold', color:'#007acc'}}>Row Template</label>
          <div style={{height:'80px', border:'1px solid #eee'}}>
            <Editor theme="light" language="html" value={form.row} onChange={(val) => setForm({...form, row: val})} options={{ minimap: { enabled: false }, fontSize: 13, lineNumbers:'off' }} />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button onClick={save} style={{ flex: 1, padding:'12px', background:'#007acc', color:'#fff', border:'none', cursor:'pointer', fontWeight:'bold', borderRadius:'4px' }}>
              💾 LƯU DATABASE
            </button>
            <button onClick={syncToAllTVs} style={{ flex: 1, padding:'12px', background:'#ff9800', color:'#fff', border:'none', cursor:'pointer', fontWeight:'bold', borderRadius:'4px' }}>
              🔄 ĐỒNG BỘ TIVI
            </button>
          </div>
        </div>

        {/* RESIZER 2 */}
        <div 
          onMouseDown={() => { isResizingEditor.current = true; document.body.style.cursor = 'col-resize'; }}
          style={{ width: '4px', cursor: 'col-resize', background: '#f0f0f0' }}
          onMouseEnter={(e) => e.target.style.background = '#007acc'}
          onMouseLeave={(e) => e.target.style.background = '#f0f0f0'}
        />

        {/* CỘT 3: PREVIEW (Chiếm phần còn lại) */}
        <div style={{ flex: 1, background: '#eee', display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: '#f0f0f0', padding: '5px 15px', fontSize: '12px', borderBottom:'1px solid #ddd', display:'flex', justifyContent:'space-between'}}>
            <span style={{fontWeight:'bold'}}>📺 LIVE PREVIEW</span>
            <span style={{color:'#666'}}>ID: {form.id || 'N/A'}</span>
          </div>
          <iframe srcDoc={getPreviewSrcDoc()} style={{ flex: 1, border: 'none', background: '#fff' }} title="preview" />
        </div>

      </div>
    </div>
  );
}