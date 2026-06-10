import { useRouter } from 'next/router';
import { useEffect, useRef } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, onValue } from 'firebase/database';

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

export default function TVDisplay() {
const router = useRouter();
const isFirstRender = useRef(true);
const lastRenderHash = useRef("");
const zoomRef = useRef(1);

// --- LOGIC 1: ĐỊNH DẠNG SỐ ---
const formatVND = (val) => {
if (val === undefined || val === null || val === "") return "0";
return val.toString().replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

// --- LOGIC 2: ZOOM ---
useEffect(() => {
const saved = localStorage.getItem('tv_zoom_level');
if (saved) {
zoomRef.current = parseFloat(saved);
const board = document.getElementById('display-board');
if (board) board.style.zoom = zoomRef.current;
}
}, []);

const changeZoom = (delta) => {
const next = Math.min(Math.max(zoomRef.current + delta, 0.3), 3);
zoomRef.current = next;
localStorage.setItem('tv_zoom_level', next.toString());
const board = document.getElementById('display-board');
if (board) board.style.zoom = next;
};

// --- LOGIC 3: TIMER RELOAD ---
useEffect(() => {
// 1. Reload toàn trang mỗi 30 phút — giải phóng RAM TV
const pageReload = setTimeout(() => {
console.log("🔄 Reload trang sau 30 phút...");
window.location.reload();
}, 30 * 60 * 1000);

// 2. Reload iframe TradingView mỗi 5 phút
// - Dùng about:blank trước để TV browser BUỘC phải load mới
// - Stagger 3s giữa các iframe để tránh spike RAM
const iframeReload = setInterval(() => {
const iframes = document.querySelectorAll('#display-board iframe');
console.log(`🖼️ Đang reload ${iframes.length} iframe...`);
iframes.forEach((iframe, index) => {
// Lưu src gốc 1 lần duy nhất (không bị mất sau các lần reload)
if (!iframe.getAttribute('data-src')) {
iframe.setAttribute('data-src', iframe.src);
}
const originalSrc = iframe.getAttribute('data-src');

// Stagger: iframe 0 reload ngay, iframe 1 reload sau 3s, v.v.
setTimeout(() => {
iframe.src = 'about:blank';
setTimeout(() => {
iframe.src = originalSrc;
}, 2000);
}, index * 3000);
});
}, 5 * 60 * 1000);

return () => {
clearTimeout(pageReload);
clearInterval(iframeReload);
};
}, []);

// --- LOGIC 4: RENDER BOARD ---
const renderBoard = (data) => {
if (!data) return { fullHTML: "", rowsHtml: "" };

const isPro = data.plan === 'premium' || (data.trial_ends && Date.now() < data.trial_ends);
let html = data.html_template || "";
let rowT = data.row_template || "";
let rowsHtml = "";

const mText = isPro
? (data.marquee_text || "Chúc Quý Khách Phát Tài Phát Lộc!")
: "Chúc Quý Khách Phát Tài Phát Lộc!";

const displayPrices = isPro
? (data.prices || [])
: (data.prices || []).slice(0, 4);

displayPrices.forEach(p => {
rowsHtml += rowT
.replace(/{{LOAI_VANG}}/g, p.name || "")
.replace(/{{GIA_MUA}}/g, formatVND(p.mua))
.replace(/{{GIA_BAN}}/g, formatVND(p.ban));
});

const now = new Date();
const dateStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

const fullHTML = html
.replace(/{{SHOP_NAME}}/g, data.shop_name || "TIỆM VÀNG")
.replace(/{{SHOP_ADDRESS}}/g, data.shop_address || "")
.replace(/{{SHOP_PHONE}}/g, data.shop_phone || "")
.replace(/{{CURRENT_DATE}}/g, dateStr)
.replace(/{{MARQUEE_TEXT}}/g, mText)
.replace(/{{PRICE_LIST}}/g, rowsHtml);

return { fullHTML, rowsHtml };
};

// --- LOGIC 5: FIREBASE REALTIME ---
useEffect(() => {
if (!router.isReady) return;
const { id } = router.query;
if (!id) return;

const boardRef = ref(db, `tv_sessions/${id}`);
const unsubscribe = onValue(boardRef, (snapshot) => {
if (!snapshot.exists()) return;
const boardData = snapshot.val();
const { fullHTML, rowsHtml } = renderBoard(boardData);
const currentHash = `${boardData.template_id}_${boardData.shop_name}_${boardData.shop_address}_${boardData.shop_phone}_${(boardData.css_template || "").length}`;
if (isFirstRender.current || lastRenderHash.current !== currentHash) {
// ====================================================
// LẦN ĐẦU hoặc ĐỔI TEMPLATE: Render full HTML
// ====================================================
const container = document.getElementById('display-board');
if (container) {
container.innerHTML = `
<style id="template-style">${boardData.css_template || ""}</style>
<div class="template-content">${fullHTML}</div>
`;

// Lưu data-src cho tất cả iframe ngay sau khi render
// để timer reload có src gốc mà dùng
container.querySelectorAll('iframe').forEach(iframe => {
if (!iframe.getAttribute('data-src')) {
iframe.setAttribute('data-src', iframe.src);
}
});
}
isFirstRender.current = false;
lastRenderHash.current = currentHash;

} else {
// ====================================================
// CHỈ CẬP NHẬT GIÁ: KHÔNG overwrite container
// → Iframe TradingView sống sót, không bị kill
// ====================================================

// Thử tìm tbody trước (template dạng table)
const tbody = document.querySelector('.price-table tbody');
if (tbody) {
tbody.innerHTML = rowsHtml;
} else {
// Fallback: template dạng grid hoặc custom
const grid = document.querySelector('.grid-container') ||
document.querySelector('.price-table');
if (grid) grid.innerHTML = rowsHtml;
}

// Cập nhật marquee nếu thay đổi
const marquee = document.querySelector('marquee');
if (marquee) {
    const newMarquee = boardData.marquee_text || "Chúc Quý Khách Phát Tài Phát Lộc!";
    
    // CÁCH ỔN ĐỊNH NHẤT: Tìm thẻ con bên trong để nhét chữ (nếu có), không làm mất cấu trúc CSS.
    // Nếu không có thẻ con, nó sẽ tự update thẳng vào marquee. Dùng innerText để tối ưu RAM TV.
    const textNode = marquee.querySelector('*') || marquee;
    if (textNode.innerText !== newMarquee) {
        textNode.innerText = newMarquee;
    }
}

// Cập nhật ngày
const dateEl = document.getElementById('current-date');
if (dateEl) {
const now = new Date();
dateEl.innerText = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
}
}
});

return () => unsubscribe();
}, [router.isReady, router.query]);

// --- STYLE NÚT ZOOM ---
const btnStyle = {
width: '45px', height: '45px', borderRadius: '50%',
border: '2px solid rgba(255,255,255,0.4)',
background: 'rgba(0,0,0,0.6)',
color: '#fff', fontSize: '24px', fontWeight: 'bold',
cursor: 'pointer', display: 'flex',
alignItems: 'center', justifyContent: 'center',
transition: 'all 0.2s'
};

return (
<div>
{/* BỘ ĐIỀU KHIỂN ZOOM */}
<div style={{
position: 'fixed', top: '25px', right: '25px', zIndex: 9999,
display: 'flex', flexDirection: 'column', gap: '12px',
opacity: 0.1, transition: 'opacity 0.4s'
}}
onMouseEnter={e => e.currentTarget.style.opacity = 1}
onMouseLeave={e => e.currentTarget.style.opacity = 0.1}
>
<button onClick={() => changeZoom(0.05)} style={btnStyle}>+</button>
<button onClick={() => changeZoom(-0.05)} style={btnStyle}>-</button>
<button onClick={() => {
zoomRef.current = 1;
localStorage.removeItem('tv_zoom_level');
const board = document.getElementById('display-board');
if (board) board.style.zoom = 1;
}} style={{ ...btnStyle, fontSize: '10px' }}>100%</button>
</div>

{/* VÙNG HIỂN THỊ CHÍNH */}
<div
id="display-board"
style={{
transformOrigin: 'top center',
transition: 'zoom 0.1s ease-out'
}}
>
<div style={{
textAlign: 'center', paddingTop: '20%',
color: '#fff', fontFamily: 'sans-serif'
}}>
Đang kết nối bảng giá...
</div>
</div>

{/* Clock Realtime */}
<script dangerouslySetInnerHTML={{
__html: `
setInterval(() => {
const el = document.getElementById('clock');
if (el) el.innerText = new Date().toLocaleTimeString('vi-VN');
}, 1000);
`
}} />
</div>
);
} 