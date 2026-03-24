import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, onValue } from 'firebase/database';

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

export default function TVDisplay() {
    const router = useRouter();
    const [data, setData] = useState(null);
    const [time, setTime] = useState("");
    
    // --- LOGIC ZOOM & CACHE ---
    const [zoom, setZoom] = useState(1);

    // Load zoom từ bộ nhớ khi vừa mở trang
    useEffect(() => {
        const savedZoom = localStorage.getItem('tv_zoom_level');
        if (savedZoom) {
            setZoom(parseFloat(savedZoom));
        }
    }, []);

    // Lưu zoom vào bộ nhớ mỗi khi thay đổi
    useEffect(() => {
        localStorage.setItem('tv_zoom_level', zoom.toString());
    }, [zoom]);

    const isFirstRender = useRef(true);
    const currentTemplateId = useRef("");

    // Hàm định dạng số có dấu chấm
    const formatVND = (val) => {
        if (val === undefined || val === null || val === "") return "0";
        return val.toString().replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    };

    // 1. Đồng hồ cập nhật mỗi giây
    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            setTime(now.toLocaleTimeString('vi-VN'));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // 2. Lắng nghe dữ liệu Firebase Realtime
    useEffect(() => {
        if (!router.isReady) return;

        const { id } = router.query;
        if (!id) return;

        const boardRef = ref(db, `tv_sessions/${id}`);
        const unsubscribe = onValue(boardRef, (snapshot) => {
            if (snapshot.exists()) {
                const boardData = snapshot.val();
                setData(boardData);

                const { fullHTML, rowsHtml, marqueeText } = renderBoard(boardData);

                // Nếu đổi Template hoặc lần đầu load: Thay toàn bộ HTML
                if (isFirstRender.current || currentTemplateId.current !== boardData.template_id) {
                    const container = document.getElementById('display-board');
                    if (container) container.innerHTML = fullHTML;
                    isFirstRender.current = false;
                    currentTemplateId.current = boardData.template_id;
                } else {
                    // Nếu chỉ cập nhật giá: Chỉ thay phần tbody/rows để tránh lag
                    const target = document.querySelector('.price-table tbody') ||
                        document.querySelector('.grid-container') ||
                        document.querySelector('.price-table');

                    if (target) target.innerHTML = rowsHtml;

                    const marqueeTag = document.querySelector('marquee');
                    if (marqueeTag && marqueeTag.innerText !== marqueeText) {
                        marqueeTag.innerText = marqueeText;
                    }
                }
            }
        });

        return () => unsubscribe();
    }, [router.isReady, router.query]);

    // 3. Logic Render Board (Giữ nguyên logic của bạn)
    const renderBoard = (data) => {
        if (!data) return { fullHTML: "", rowsHtml: "", marqueeText: "" };

        const isPro = data.plan === 'premium';
        let html = data.html_template || "";
        let rowT = data.row_template || "";
        let rowsHtml = "";

        let mText = isPro ? (data.marquee_text || "Chúc Quý Khách Phát Tài Phát Lộc!") : "Chúc Quý Khách Phát Tài Phát Lộc!";
        const displayPrices = isPro ? (data.prices || []) : (data.prices || []).slice(0, 4);

        displayPrices.forEach(p => {
            rowsHtml += rowT
                .replace(/{{LOAI_VANG}}/g, p.name || "")
                .replace(/{{GIA_MUA}}/g, formatVND(p.mua)) 
                .replace(/{{GIA_BAN}}/g, formatVND(p.ban)); 
        });

        const now = new Date();
        const dateStr = now.getDate() + "/" + (now.getMonth() + 1) + "/" + now.getFullYear();

        const fullHTML = html
            .replace(/{{SHOP_NAME}}/g, data.shop_name || "TIỆM VÀNG")
            .replace(/{{SHOP_ADDRESS}}/g, data.shop_address || "")
            .replace(/{{SHOP_PHONE}}/g, data.shop_phone || "")
            .replace(/{{CURRENT_DATE}}/g, dateStr)
            .replace(/{{MARQUEE_TEXT}}/g, mText)
            .replace(/{{PRICE_LIST}}/g, rowsHtml);

        return { fullHTML, rowsHtml, marqueeText: mText };
    };

    // Style cho các nút điều khiển Zoom
    const controlBtnStyle = {
        width: '45px',
        height: '45px',
        borderRadius: '50%',
        border: '2px solid rgba(255,255,255,0.4)',
        background: 'rgba(0,0,0,0.6)',
        color: '#fff',
        fontSize: '24px',
        fontWeight: 'bold',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        outline: 'none',
        transition: 'all 0.2s'
    };

    return (
        <div style={{  }}>
            
            {/* --- BỘ ĐIỀU KHIỂN ZOOM (Ghi nhớ tự động) --- */}
            <div style={{ 
                position: 'fixed', 
                top: '25px', 
                right: '25px', 
                zIndex: 9999, 
                display: 'flex', 
                flexDirection: 'column',
                gap: '12px',
                opacity: 0.1, // Mặc định rất mờ để không làm phiền khách xem giá
                transition: 'opacity 0.4s'
            }} onMouseEnter={(e) => e.currentTarget.style.opacity = 1} 
               onMouseLeave={(e) => e.currentTarget.style.opacity = 0.1}>
                
                <button title="Phóng to" onClick={() => setZoom(z => Math.min(z + 0.05, 3))} style={controlBtnStyle}>+</button>
                <button title="Thu nhỏ" onClick={() => setZoom(z => Math.max(z - 0.05, 0.3))} style={controlBtnStyle}>-</button>
                <button title="Mặc định" onClick={() => { setZoom(1); localStorage.removeItem('tv_zoom_level'); }} 
                        style={{...controlBtnStyle, fontSize: '11px'}}>100%</button>
            </div>

            {/* CSS Template từ Database */}
            <style dangerouslySetInnerHTML={{ __html: (data && data.css_template) ? data.css_template : "" }} />
            
            {/* --- VÙNG HIỂN THỊ CHÍNH (Áp dụng Zoom & Cache) --- */}
            <div id="display-board" style={{ 
                zoom: zoom, 
                WebkitZoom: zoom, // Hỗ trợ Smart TV đời cũ (Tizen, WebOS)
                transformOrigin: 'top center',
                transition: 'zoom 0.15s ease-out'
            }}>
                <div style={{ textAlign: 'center', paddingTop: '20%', color: '#fff', fontFamily: 'sans-serif' }}>
                    Đang kết nối bảng giá...
                </div>
            </div>

            {/* Script hỗ trợ Clock cho các thẻ có id="clock" trong HTML Template */}
            <script dangerouslySetInnerHTML={{
                __html: `
                    setInterval(() => {
                        const el = document.getElementById('clock');
                        if(el) el.innerText = new Date().toLocaleTimeString('vi-VN');
                    }, 1000);
                `}} 
            />
        </div>
    );
}