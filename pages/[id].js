import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
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

  // 1. Logic chạy đồng hồ Realtime
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      setTime(`${h}:${m}:${s}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Cập nhật đồng hồ vào HTML sau khi đã vẽ xong giao diện
  useEffect(() => {
    const clockEl = document.getElementById('clock');
    if (clockEl) clockEl.innerText = time;
  }, [time]);

  // 2. Lấy dữ liệu từ Firebase
  useEffect(() => {
    if (!id) return;
    return onValue(ref(db, `tv_sessions/${id}`), (s) => s.exists() && setData(s.val()));
  }, [id]);

  if (!data) return <div style={{background:'#800000', color:'#fff', height:'100vh', display:'flex', alignItems:'center', justifyContent:'center'}}><h1>Đang tải...</h1></div>;

  const renderHTML = () => {
    // SỬA LỖI: Kiểm tra xem template có thực sự tồn tại không
    let html = (data.html_template && data.html_template !== "") ? data.html_template : "<div style='color:white; padding:50px;'><h1>{{SHOP_NAME}}</h1><p>Vui lòng chọn giao diện tại trang Admin</p></div>";
    let rowT = (data.row_template && data.row_template !== "") ? data.row_template : "<tr><td>{{LOAI_VANG}}</td><td>{{GIA_MUA}}</td><td>{{GIA_BAN}}</td></tr>";
    
    let rowsHtml = "";
    // SỬA LỖI: Nếu chưa có giá nào thì hiện dòng thông báo thay vì để trống
    if (!data.prices || data.prices.length === 0) {
      rowsHtml = "<tr><td colspan='3' style='font-size:2rem; color:#fff;'>Đang cập nhật giá...</td></tr>";
    } else {
      data.prices.forEach(p => {
        rowsHtml += rowT
          .replace(/{{LOAI_VANG}}/g, p.name || "")
          .replace(/{{GIA_MUA}}/g, Number(p.mua || 0).toLocaleString('vi-VN'))
          .replace(/{{GIA_BAN}}/g, Number(p.ban || 0).toLocaleString('vi-VN'));
      });
    }

    const now = new Date();
    const dateStr = `Ngày ${now.getDate()} thg ${now.getMonth() + 1} năm ${now.getFullYear()}`;

    return html
      .replace(/{{SHOP_NAME}}/g, data.shop_name || "Tên Tiệm Vàng")
      .replace(/{{SHOP_ADDRESS}}/g, data.shop_address || "Địa chỉ chưa cập nhật")
      .replace(/{{SHOP_PHONE}}/g, data.shop_phone || "SĐT chưa cập nhật")
      .replace(/{{CURRENT_DATE}}/g, dateStr)
      .replace(/{{MARQUEE_TEXT}}/g, data.marquee_text || "Kính chào quý khách!")
      .replace(/{{PRICE_LIST}}/g, rowsHtml);
  };

  return (
    <>
      {/* Nạp CSS từ Database */}
      <style>{data.css_template}</style>
      <div dangerouslySetInnerHTML={{ __html: renderHTML() }} />
    </>
  );
}