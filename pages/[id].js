import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';
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
  const [data, setData] = useState(null);
  const [time, setTime] = useState("");
  const isFirstRender = useRef(true);
  const currentTemplateId = useRef("");

  // 1. Đồng hồ
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTime(now.toLocaleTimeString('vi-VN'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Lắng nghe dữ liệu Firebase
  useEffect(() => {
    // THÊM: Đợi router sẵn sàng để lấy ID (Rất quan trọng cho Tivi)
    if (!router.isReady) return;

    const { id } = router.query;
    if (!id) return;

    const boardRef = ref(db, `tv_sessions/${id}`);
    const unsubscribe = onValue(boardRef, (snapshot) => {
      if (snapshot.exists()) {
        const boardData = snapshot.val();
        setData(boardData);
        
        // SỬA: Nhận thêm marqueeText từ hàm renderBoard
        const { fullHTML, rowsHtml, marqueeText } = renderBoard(boardData);

        if (isFirstRender.current || currentTemplateId.current !== boardData.template_id) {
          const container = document.getElementById('display-board');
          if (container) container.innerHTML = fullHTML;
          isFirstRender.current = false;
          currentTemplateId.current = boardData.template_id;
        } else {
          const target = document.querySelector('.price-table tbody') || 
                         document.querySelector('.grid-container') || 
                         document.querySelector('.price-table');
          
          if (target) target.innerHTML = rowsHtml;

          // Cập nhật chữ chạy Realtime
          const marqueeTag = document.querySelector('marquee');
          if (marqueeTag && marqueeTag.innerText !== marqueeText) {
             marqueeTag.innerText = marqueeText;
          }
        }
      }
    });

    return () => unsubscribe();
  }, [router.isReady, router.query]); // Theo dõi router

  const renderBoard = (data) => {
    if (!data) return { fullHTML: "", rowsHtml: "", marqueeText: "" };
    
    let html = data.html_template || "";
    let rowT = data.row_template || "";
    let rowsHtml = "";
    let mText = data.marquee_text || "Chúc Quý Khách Phát Tài Phát Lộc!";

    if (data.prices) {
      data.prices.forEach(p => {
        rowsHtml += rowT
          .replace(/{{LOAI_VANG}}/g, p.name || "")
          .replace(/{{GIA_MUA}}/g, Number(p.mua || 0).toLocaleString('vi-VN'))
          .replace(/{{GIA_BAN}}/g, Number(p.ban || 0).toLocaleString('vi-VN'));
      });
    }

    const now = new Date();
    const dateStr = now.getDate() + "/" + (now.getMonth() + 1) + "/" + now.getFullYear();

    const fullHTML = html
      .replace(/{{SHOP_NAME}}/g, data.shop_name || "TIỆM VÀNG")
      .replace(/{{SHOP_ADDRESS}}/g, data.shop_address || "")
      .replace(/{{SHOP_PHONE}}/g, data.shop_phone || "")
      .replace(/{{CURRENT_DATE}}/g, dateStr)
      .replace(/{{MARQUEE_TEXT}}/g, mText)
      .replace(/{{PRICE_LIST}}/g, rowsHtml);

    return { fullHTML, rowsHtml, marqueeText: mText }; // Trả về đủ 3 thứ
  };

  return (
    <div style={{ minHeight: '100vh'}}>
      {/* Trình duyệt Tivi cũ không thích dấu ?. nên viết kiểu an toàn */}
      <style dangerouslySetInnerHTML={{ __html: (data && data.css_template) ? data.css_template : "" }} />
      <div id="display-board">
        <div style={{textAlign:'center', paddingTop:'20%'}}>Đang kết nối bảng giá...</div>
      </div>
      <script dangerouslySetInnerHTML={{ __html: `
        setInterval(() => {
          const el = document.getElementById('clock');
          if(el) el.innerText = new Date().toLocaleTimeString('vi-VN');
        }, 1000);
      `}} />
    </div>
  );
}