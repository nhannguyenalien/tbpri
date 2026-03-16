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
  const { id } = router.query; 
  const [data, setData] = useState(null);
  const [time, setTime] = useState("");
  const isFirstRender = useRef(true);
  const currentTemplateId = useRef(""); // Theo dõi nếu admin đổi mẫu giao diện

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
    if (!id) return;
    const boardRef = ref(db, `tv_sessions/${id}`);
    onValue(boardRef, (snapshot) => {
      if (snapshot.exists()) {
        const boardData = snapshot.val();
        setData(boardData);
        
        const { fullHTML, rowsHtml } = renderBoard(boardData);

        // NẾU: Lần đầu load HOẶC Admin đổi mẫu giao diện khác
        if (isFirstRender.current || currentTemplateId.current !== boardData.template_id) {
          document.getElementById('display-board').innerHTML = fullHTML;
          isFirstRender.current = false;
          currentTemplateId.current = boardData.template_id;
        } else {
          // NẾU: Chỉ là cập nhật giá (vẫn dùng mẫu cũ) -> Chỉ thay phần ruột
          // Tìm chỗ dán phù hợp cho từng mẫu:
          const target = document.querySelector('.price-table tbody') || 
                         document.querySelector('.grid-container') || 
                         document.querySelector('.price-table');
          
          if (target) {
            target.innerHTML = rowsHtml;
          }
          // 2. CẬP NHẬT CHỮ CHẠY (Đây là phần bạn cần)
          const marqueeTag = document.querySelector('marquee');
          if (marqueeTag) {
              // Chỉ cập nhật nếu chữ chạy khác với cái đang hiển thị
              if (marqueeTag.innerText !== marqueeText) {
                marqueeTag.innerText = marqueeText;
              }
          }
        }
      }
    });
  }, [id]);

  const renderBoard = (data) => {
    if (!data) return { fullHTML: "", rowsHtml: "" };
    
    let html = data.html_template || "";
    let rowT = data.row_template || "";
    let rowsHtml = "";

    // Tạo danh sách hàng giá vàng
    if (data.prices) {
      data.prices.forEach(p => {
        rowsHtml += rowT
          .replace(/{{LOAI_VANG}}/g, p.name || "")
          .replace(/{{GIA_MUA}}/g, Number(p.mua || 0).toLocaleString('vi-VN'))
          .replace(/{{GIA_BAN}}/g, Number(p.ban || 0).toLocaleString('vi-VN'));
      });
    }

    const now = new Date();
    const dateStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

    const fullHTML = html
      .replace(/{{SHOP_NAME}}/g, data.shop_name || "TIỆM VÀNG")
      .replace(/{{SHOP_ADDRESS}}/g, data.shop_address || "")
      .replace(/{{SHOP_PHONE}}/g, data.shop_phone || "")
      .replace(/{{CURRENT_DATE}}/g, dateStr)
      .replace(/{{MARQUEE_TEXT}}/g, data.marquee_text || "Chúc Quý Khách Phát Tài Phát Lộc!")
      .replace(/{{PRICE_LIST}}/g, rowsHtml);

    return { fullHTML, rowsHtml };
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <style dangerouslySetInnerHTML={{ __html: data?.css_template || "" }} />
      <div id="display-board">
        <div style={{textAlign:'center', paddingTop:'20%'}}>Đang tải...</div>
      </div>
      {/* Đồng hồ hiển thị nếu mẫu Hữu Tín/Xanh cần ID clock */}
      <script dangerouslySetInnerHTML={{ __html: `
        setInterval(() => {
          const el = document.getElementById('clock');
          if(el) el.innerText = new Date().toLocaleTimeString('vi-VN');
        }, 1000);
      `}} />
    </div>
  );
}