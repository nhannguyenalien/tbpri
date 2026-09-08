import { useRouter } from 'next/router';
import { useEffect, useRef } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../lib/firebase';

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

const fullScreen = () => {
  document.documentElement.requestFullscreen();
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

const mText = data.marquee_text || "Chúc Quý Khách Phát Tài Phát Lộc!";

const displayPrices = data.prices || [];

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

// Hash để phát hiện đổi template (giữ nguyên công thức cũ).
const computeHash = (d) =>
`${d.template_id}_${d.shop_name}_${d.shop_address}_${d.shop_phone}_${(d.css_template || "").length}`;

// Vẽ bảng giá lên DOM. Dùng chung cho: dữ liệu cache lúc mở trang + dữ liệu realtime.
const paintBoard = (boardData) => {
if (!boardData) return;
const { fullHTML, rowsHtml } = renderBoard(boardData);
const currentHash = computeHash(boardData);
if (isFirstRender.current || lastRenderHash.current !== currentHash) {
// LẦN ĐẦU hoặc ĐỔI TEMPLATE: render full HTML
const container = document.getElementById('display-board');
if (container) {
let styleTag = document.getElementById('tv-dynamic-style');
if (!styleTag) {
styleTag = document.createElement('style');
styleTag.id = 'tv-dynamic-style';
document.head.appendChild(styleTag);
}
styleTag.innerHTML = boardData.css_template || "";
container.innerHTML = `<div class="template-content">${fullHTML}</div>`;
container.querySelectorAll('iframe').forEach(iframe => {
if (!iframe.getAttribute('data-src')) {
iframe.setAttribute('data-src', iframe.src);
}
});
}
isFirstRender.current = false;
lastRenderHash.current = currentHash;
} else {
// CHỈ CẬP NHẬT GIÁ: không overwrite container → iframe TradingView sống sót
const tbody = document.querySelector('.price-table tbody');
if (tbody) {
tbody.innerHTML = rowsHtml;
} else {
const grid = document.querySelector('.grid-container') ||
document.querySelector('.price-table');
if (grid) grid.innerHTML = rowsHtml;
}
const marquee = document.querySelector('marquee');
if (marquee) {
const newMarquee = boardData.marquee_text || "Chúc Quý Khách Phát Tài Phát Lộc!";
const textNode = marquee.querySelector('*') || marquee;
if (textNode.textContent !== newMarquee) {
textNode.textContent = newMarquee;
}
}
const dateEl = document.getElementById('current-date');
if (dateEl) {
const now = new Date();
dateEl.innerText = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
}
}
};

// Báo mất kết nối máy chủ — KHÔNG xoá bảng giá đang hiển thị.
const setConnLost = (lost) => {
let badge = document.getElementById('tv-conn-badge');
if (lost) {
if (!badge) {
badge = document.createElement('div');
badge.id = 'tv-conn-badge';
badge.style.cssText =
'position:fixed;left:12px;bottom:12px;z-index:99999;background:rgba(180,30,30,.92);' +
'color:#fff;font:600 13px/1.35 sans-serif;padding:6px 12px;border-radius:8px;' +
'box-shadow:0 4px 14px rgba(0,0,0,.4)';
badge.textContent = '⚠ Mất kết nối máy chủ — đang hiển thị giá lưu tạm';
document.body.appendChild(badge);
}
} else if (badge) {
badge.remove();
}
};

const CONN_ERR_HTML =
'<div style="position:fixed;inset:0;background:#0a1f3d;color:#fff;font-family:sans-serif;' +
'display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;line-height:1.6;padding:24px">' +
'<div style="font-size:26px;margin-bottom:10px;font-weight:700">Không kết nối được máy chủ giá</div>' +
'<div style="font-size:17px;opacity:.9">Mạng WiFi có thể đang chặn kết nối.<br>' +
'Thử tắt WiFi dùng 4G, hoặc đổi DNS về 8.8.8.8 / 1.1.1.1.</div>' +
'<div style="font-size:14px;opacity:.6;margin-top:16px">Hệ thống đang tự thử lại…</div>' +
'</div>';

// --- LOGIC 5: FIREBASE REALTIME + CACHE CHỐNG TRẮNG MÀN HÌNH ---
useEffect(() => {
if (!router.isReady) return;
const { id } = router.query;
if (!id) return;

const cacheKey = `tv_cache_${id}`;

// 1. Vẽ ngay bằng dữ liệu lần trước (nếu có) — TV không bị trắng khi mạng chặn Firebase.
try {
const raw = localStorage.getItem(cacheKey);
if (raw) {
const cached = JSON.parse(raw);
if (cached && cached.v) {
paintBoard(cached.v);
console.info('[tv] hiển thị từ cache, lưu lúc', cached.ts ? new Date(cached.ts).toLocaleString('vi-VN') : '?');
}
} else {
console.info('[tv] chưa có cache, chờ máy chủ');
}
} catch (e) { /* cache hỏng thì bỏ qua */ }

// 2. Sau 15s vẫn trống → hiện thông báo lỗi rõ ràng (vẫn tự thử lại ngầm).
const connTimeout = setTimeout(() => {
if (isFirstRender.current) {
const container = document.getElementById('display-board');
if (container) container.innerHTML = CONN_ERR_HTML;
}
}, 15000);

// 3. Lắng nghe realtime.
const boardRef = ref(db, `tv_sessions/${id}`);
const unsubscribe = onValue(
boardRef,
(snapshot) => {
if (!snapshot.exists()) return;
const boardData = snapshot.val();
paintBoard(boardData);
try {
localStorage.setItem(cacheKey, JSON.stringify({ v: boardData, ts: Date.now() }));
} catch (e) { /* hết quota thì bỏ qua */ }
},
(error) => {
console.warn('Firebase onValue error:', error && error.message);
if (isFirstRender.current) {
const container = document.getElementById('display-board');
if (container) container.innerHTML = CONN_ERR_HTML;
}
}
);

// 4. Theo dõi trạng thái kết nối để hiện/ẩn badge "mất kết nối".
const unsubConn = onValue(ref(db, '.info/connected'), (s) => {
if (s.val() === true) setConnLost(false);
else if (!isFirstRender.current) setConnLost(true);
});

return () => {
clearTimeout(connTimeout);
unsubscribe();
unsubConn();
};
}, [router.isReady, router.query.id]);

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
<button onClick={fullScreen} style={btnStyle}>⛶</button>
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
position: 'fixed', inset: 0, background: '#0a1f3d',
display: 'flex', alignItems: 'center', justifyContent: 'center',
textAlign: 'center', color: '#fff', fontFamily: 'sans-serif', fontSize: '20px'
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