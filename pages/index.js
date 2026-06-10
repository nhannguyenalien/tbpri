import { useState, useEffect, useRef } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, get, update, set, onValue, push, serverTimestamp } from 'firebase/database';
import { getAuth, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/router';
import OpenBBChat from './openbb';


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

const TradingViewChart = ({ data }) => {
  const [hoverIndex, setHoverIndex] = useState(null);
  const svgRef = useRef(null);

  if (!data || data.length < 2) return null;

  const buyPoints = data.map(d => parseFloat(String(d.buy || 0).replace(/[^0-9]/g, '')));
  const sellPoints = data.map(d => parseFloat(String(d.sell || 0).replace(/[^0-9]/g, '')));

  const allPoints = [...buyPoints, ...sellPoints];
  const min = Math.min(...allPoints) * 0.999;
  const max = Math.max(...allPoints) * 1.001;
  const range = max - min;

  const width = 1000;
  const height = 300; // Tăng thêm chiều cao cho thoáng
  const margin = { top: 40, right: 90, bottom: 40, left: 20 };
  const chartWidth = width - margin.right;
  const chartHeight = height - margin.bottom - margin.top;

  const getX = (i) => (i / (data.length - 1)) * chartWidth;
  const getY = (p) => margin.top + chartHeight - ((p - min) / range) * chartHeight;

  // Tạo đường kẻ Path
  const buyPath = data.map((_, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(buyPoints[i])}`).join(' ');
  const sellPath = data.map((_, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(sellPoints[i])}`).join(' ');

  // Xử lý khi rà chuột
  const handleMouseMove = (e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = x / rect.width;
    const index = Math.round(ratio * (data.length - 1));
    setHoverIndex(Math.max(0, Math.min(data.length - 1, index)));
  };

  return (
    <div style={{ background: '#131722', position: 'relative', cursor: 'crosshair', userSelect: 'none' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoverIndex(null)}>

      <svg ref={svgRef} width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        {/* Lưới ngang (Grid) */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
          <g key={i}>
            <line x1="0" y1={getY(min + pct * range)} x2={chartWidth} y2={getY(min + pct * range)} stroke="#2a2e39" strokeWidth="1" strokeDasharray="4" />
            <text x={chartWidth + 10} y={getY(min + pct * range) + 4} fill="#868993" fontSize="12">{(min + pct * range).toLocaleString('vi-VN')}</text>
          </g>
        ))}

        {/* Đổ bóng vùng giá */}
        <path d={`${sellPath} L ${chartWidth} ${height - margin.bottom} L 0 ${height - margin.bottom} Z`} fill="url(#gradRed)" />
        <defs>
          <linearGradient id="gradRed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f23645" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#f23645" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Đường vẽ chính */}
        <path d={buyPath} fill="none" stroke="#22ab94" strokeWidth="3" strokeLinejoin="round" />
        <path d={sellPath} fill="none" stroke="#f23645" strokeWidth="3" strokeLinejoin="round" />

        {/* Trục thời gian */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const idx = Math.floor(pct * (data.length - 1));
          return (
            <text key={i} x={getX(idx)} y={height - 10} fill="#868993" fontSize="11" textAnchor="middle">
              {new Date(data[idx].timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </text>
          );
        })}

        {/* --- ĐIỂM TƯƠNG TÁC (CROSSHAIR) --- */}
        {hoverIndex !== null && (
          <g>
            <line x1={getX(hoverIndex)} y1={margin.top} x2={getX(hoverIndex)} y2={height - margin.bottom} stroke="#ffffff" strokeWidth="1" strokeDasharray="4" />
            <circle cx={getX(hoverIndex)} cy={getY(buyPoints[hoverIndex])} r="6" fill="#22ab94" stroke="#fff" strokeWidth="2" />
            <circle cx={getX(hoverIndex)} cy={getY(sellPoints[hoverIndex])} r="6" fill="#f23645" stroke="#fff" strokeWidth="2" />
          </g>
        )}
      </svg>

      {/* --- TOOLTIP (HỘP THÔNG TIN) --- */}
      {hoverIndex !== null && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: getX(hoverIndex) > width / 2 ? (getX(hoverIndex) / 10 * 8) : (getX(hoverIndex) / 10 * 12),
          transform: 'translateX(-50%)',
          background: 'rgba(30, 34, 45, 0.95)',
          border: '1px solid #363a45',
          borderRadius: '4px',
          padding: '10px',
          color: '#fff',
          fontSize: '12px',
          pointerEvents: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          zIndex: 10
        }}>
          <div style={{ color: '#868993', marginBottom: '5px', borderBottom: '1px solid #363a45', pb: '5px' }}>
            🕒 {new Date(data[hoverIndex].timestamp).toLocaleString('vi-VN')}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
            <span style={{ color: '#22ab94' }}>MUA: <b>{data[hoverIndex].buy}</b></span>
            <span style={{ color: '#f23645' }}>BÁN: <b>{data[hoverIndex].sell}</b></span>
          </div>
        </div>
      )}

      {/* Chú thích cố định */}
      <div style={{ position: 'absolute', top: 10, left: 20, display: 'flex', gap: '15px', fontSize: '11px' }}>
        <b style={{ color: '#22ab94' }}>● GIÁ MUA</b>
        <b style={{ color: '#f23645' }}>● GIÁ BÁN</b>
      </div>
    </div>
  );
};


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

// Định nghĩa các biến Style để giao diện nhìn sạch đẹp
const ruleRowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '15px',
  background: '#f9f9f9',
  padding: '12px 20px',
  borderRadius: '10px',
  border: '1px solid #eee',
  fontSize: '16px',
  color: '#333'
};

const ruleInputStyle = {
  padding: '8px 12px',
  width: '120px',
  border: '2px solid #007acc',
  borderRadius: '6px',
  fontWeight: 'bold',
  fontSize: '16px',
  textAlign: 'center',
  outline: 'none'
};

const SAMPLE_DATA = {
  shop_name: "TIỆM VÀNG DEMO",
  shop_address: "123 Đường ABC, Quận 1",
  shop_phone: "0909 123 456",
  marquee_text: "Chào mừng quý khách! Chúc quý khách vạn sự như ý!",
  prices: [
    { name: "VÀNG SJC", mua: "82000000", ban: "84500000" },
    { name: "VÀNG 9999", mua: "78000000", ban: "79500000" },
    { name: "VÀNG 24K", mua: "76000000", ban: "77500000" },
    { name: "VÀNG 18K", mua: "55000000", ban: "57000000" }
  ]
};

// Hàm tạo HTML để nhét vào iframe (Giống hệt trang AdminTemplate của bạn)
const getPreviewHtml = (template, formatVND) => {
  if (!template) return "";
  let rowsHtml = "";
  SAMPLE_DATA.prices.forEach(p => {
    rowsHtml += (template.row_template || "")
      .replace(/{{LOAI_VANG}}/g, p.name)
      .replace(/{{GIA_MUA}}/g, formatVND(p.mua))
      .replace(/{{GIA_BAN}}/g, formatVND(p.ban));
  });

  const fullHTML = (template.html_template || "")
    .replace(/{{SHOP_NAME}}/g, SAMPLE_DATA.shop_name)
    .replace(/{{SHOP_ADDRESS}}/g, SAMPLE_DATA.shop_address)
    .replace(/{{SHOP_PHONE}}/g, SAMPLE_DATA.shop_phone)
    .replace(/{{MARQUEE_TEXT}}/g, SAMPLE_DATA.marquee_text)
    .replace(/{{PRICE_LIST}}/g, rowsHtml)
    .replace(/{{CURRENT_DATE}}/g, "23/03/2026");

  return `
    <html>
      <head>
        <style>
          body { margin: 0; padding: 0; overflow: hidden; width: 1920px; height: 1080px; background: #000; }
          ${template.css_template}
        </style>
      </head>
      <body>${fullHTML}</body>
    </html>
  `;
};

export default function HomeAdmin() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [user, setUser] = useState(null);
  const [boardData, setBoardData] = useState(null);
  const [globalTemplates, setGlobalTemplates] = useState({});
  const [history, setHistory] = useState([]);
  const [externalPrices, setExternalPrices] = useState({});
  const [isArchiving, setIsArchiving] = useState(false);
  const isPro = boardData?.plan === 'premium' || (boardData?.trial_ends && Date.now() < boardData.trial_ends);
  const lastSavedFingerprint = useRef("");
  // Tính số ngày dùng thử còn lại (để hiển thị UI)
  const trialDaysLeft = boardData?.trial_ends
    ? Math.max(0, Math.ceil((boardData.trial_ends - Date.now()) / (24 * 60 * 60 * 1000)))
    : 0;
  const [previewingTemplate, setPreviewingTemplate] = useState(null);
  // Fingerprint để so sánh giá cũ/mới (Chống dư thừa dữ liệu)
  const lastSavedPricesRef = useRef("");
  const [externalHistory, setExternalHistory] = useState({});
  // State cho Đăng nhập
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const getHistoryForChart = (sourceId, itemSlug) => {
    const historyObj = externalHistory[sourceId]?.[itemSlug];
    if (!historyObj) return [];

    return Object.keys(historyObj)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .map(time => ({
        sell: historyObj[time].sell,
        buy: historyObj[time].buy,
        timestamp: parseInt(time)
      }))
      .slice(-90); // Lấy 90 điểm để có sóng dài
  };

  // --- LOGIC ĐẾM NGƯỢC CHUẨN (LUÔN ĐỌC TỪ DB) ---
  const [timeLeft, setTimeLeft] = useState("");


  useEffect(() => {
    // Lấy mốc thời gian hết hạn thực tế từ DB (Ưu tiên Premium, sau đó là Trial)
    const expireDate = boardData?.premium_ends || boardData?.trial_ends;

    if (!expireDate) {
      setTimeLeft("---");
      return;
    }

    const timer = setInterval(() => {
      const now = Date.now();
      const diff = expireDate - now;

      if (diff <= 0) {
        setTimeLeft("HẾT HẠN");
        clearInterval(timer);
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        // Hiển thị gọn: 250n 05:30:15 (n = ngày)
        setTimeLeft(
          `${days > 0 ? days + 'n ' : ''}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        );
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [boardData]);

  //1. redirect tv link
  const [pairCode, setPairCode] = useState('');
  const [isPairing, setIsPairing] = useState(false);

  const [expandedSources, setExpandedSources] = useState({});
  const [searchTerm, setSearchTerm] = useState(""); // Để tìm kiếm tiệm

  const formatVND = (val) => {
    if (val === undefined || val === null || val === "") return "";
    return val.toString().replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  // 2. Xóa dấu chấm để lấy số thuần túy (Vd: 19.000.000 -> 19000000)
  const parseVND = (val) => {
    if (typeof val !== 'string') return val;
    return val.replace(/\./g, "");
  };

  const toggleExpand = (id) => {
    setExpandedSources(prev => ({ ...prev, [id]: !prev[id] }));
  };

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


  useEffect(() => {
    if (user && isPro) {
      // Lắng nghe lịch sử giá (Lấy 20 bản ghi gần nhất của mỗi tiệm)
      const historyRef = ref(db, 'external_history');
      return onValue(historyRef, (snapshot) => {
        if (snapshot.exists()) setExternalHistory(snapshot.val());
      });
    }
  }, [user, isPro]);

  // 2. Lắng nghe trạng thái User và Dữ liệu
  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        // --- NẾU CHƯA ĐĂNG NHẬP: Lập tức đá sang trang Landing ---
        router.push('/landing');
      } else {
        // --- NẾU ĐÃ ĐĂNG NHẬP: Lưu user và tắt loading ---
        setUser(currentUser);
        setIsCheckingAuth(false); // Quan trọng: Báo cho app biết đã kiểm tra xong để tắt loading

        // Lấy giá hiện tại trên Tivi
        onValue(ref(db, `tv_sessions/${currentUser.uid}`), (s) => {
          if (s.exists()) {
            setBoardData(s.val());
          } else {
            // NGƯỜI DÙNG MỚI: Tặng 3 ngày Pro
            const trialDays = 3;
            const trialEnds = Date.now() + (trialDays * 24 * 60 * 60 * 1000); // Hiện tại + 3 ngày (ms)
            get(ref(db, 'global_templates/mau_do_truyen_thong')).then((tmplSnap) => {
              const defaultTmpl = tmplSnap.exists() ? tmplSnap.val() : {};

              const initialData = {
                shop_name: "Tiệm Vàng Mới",
                prices: [
                  { name: "VÀNG 9999", mua: "10000000", ban: "10000000" },
                  { name: "VÀNG 99", mua: "10000000", ban: "10000000" }
                ],
                plan: 'trial',
                trial_ends: trialEnds,

                // 👇 Gắn sẵn ID và toàn bộ HTML/CSS mặc định vào user mới
                template_id: 'mau_do_truyen_thong',
                html_template: defaultTmpl.html_template || "",
                css_template: defaultTmpl.css_template || "",
                row_template: defaultTmpl.row_template || "",
                created_at: serverTimestamp()
              };

              set(ref(db, `tv_sessions/${currentUser.uid}`), initialData);
              setBoardData(initialData);
            }).catch(err => {
              console.error("Lỗi lấy template mặc định:", err);
            });
          }
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

        // Lấy giá các nguồn ngoài
        onValue(ref(db, 'external_prices/sources'), (snapshot) => {
          if (snapshot.exists()) {
            setExternalPrices(snapshot.val());
          }
        });

      } // ---> ĐÂY LÀ DẤU NGOẶC ĐÓNG CỦA KHỐI ELSE BỊ THIẾU <---
    });
  }, [router]); // Thêm router vào đây để React không cảnh báo

  if (isCheckingAuth) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid #007acc', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) return null;
  // 1. Khai báo Ref để ghi nhớ trạng thái (không gây render lại)

  // 3. Logic Tự động Lưu Lịch sử (Thông minh & Tiết kiệm)
  // 3. Logic Tự động Lưu Lịch sử (Chỉ lưu 1 bản ghi duy nhất mỗi ngày)

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

  const downloadAllHistory = async () => {
  if (!isPro) return alert("Vui lòng nâng cấp Premium để tải dữ liệu!");

  try {
    // 1. Chọc trực tiếp vào DB để lấy bản FULL, không dùng biến 'history' đang bị giới hạn
    const historyRef = ref(db, `price_history/${user.uid}`);
    const snapshot = await get(historyRef);

    if (!snapshot.exists()) {
      return alert("Chưa có dữ liệu lịch sử để tải!");
    }

    const allData = snapshot.val();
    
    // 2. Chuyển đổi object từ Firebase thành mảng và sắp xếp theo thời gian
    const sortedRecords = Object.entries(allData)
      .map(([id, val]) => ({ id, ...val }))
      .sort((a, b) => b.timestamp - a.timestamp);

    // 3. Xây dựng nội dung CSV từ toàn bộ dữ liệu
    let csv = "\uFEFFNgày giờ,Loại vàng,Mua vào,Bán ra\n"; // BOM để hiện đúng tiếng Việt trong Excel

    sortedRecords.forEach(record => {
      (record.prices || []).forEach(p => {
        // Thay thế dấu phẩy nếu có trong tên vàng để tránh lỗi định dạng CSV
        const safeName = String(p.name).replace(/,/g, '');
        csv += `${record.dateString},${safeName},${p.mua},${p.ban}\n`;
      });
    });

    // 4. Tạo file và tải về
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const fileName = `LichSuGia_ToanBo_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.csv`;
    
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    
    // Giải phóng bộ nhớ
    URL.revokeObjectURL(link.href);

  } catch (error) {
    console.error("Lỗi khi tải lịch sử:", error);
    alert("Có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại!");
  }
};

  const quickApplyPrice = (item) => {
    if (!isPro) return alert("Nâng cấp Premium để sử dụng tính năng 'Copy' giá nhanh!");

    const newPrices = [...(boardData?.prices || [])];
    // Tìm xem trong bảng giá của tiệm đã có loại vàng này chưa (so sánh tên)
    const index = newPrices.findIndex(p => p.name.toLowerCase().includes(item.label.toLowerCase()));

    if (index !== -1) {
      newPrices[index].mua = item.buy;
      newPrices[index].ban = item.sell;
      alert(`Đã cập nhật giá ${item.label} vào bảng của tiệm!`);
    } else {
      // Nếu chưa có thì thêm hàng mới luôn
      newPrices.push({ name: item.label, mua: item.buy, ban: item.sell });
      alert(`Đã thêm loại vàng ${item.label} mới vào bảng!`);
    }
    handleUpdate('prices', newPrices);
  };

  const getPriceDiff = (sourceId, itemSlug, currentPrice) => {
    const history = externalHistory[sourceId]?.[itemSlug];
    if (!history) return { diff: 0, symbol: '', color: '#888' };

    // Lấy danh sách thời gian, sắp xếp mới nhất lên đầu
    const timestamps = Object.keys(history).sort((a, b) => b - a);
    if (timestamps.length < 2) return { diff: 0, symbol: '', color: '#888' };

    // Lấy giá của lần quét ngay trước đó (vị trí index 1)
    const prevPriceStr = history[timestamps[1]].sell;
    const curr = parseInt(currentPrice.replace(/[^0-9]/g, '')) || 0;
    const prev = parseInt(prevPriceStr.replace(/[^0-9]/g, '')) || 0;

    const diff = curr - prev;

    return {
      diff: Math.abs(diff).toLocaleString('vi-VN'),
      symbol: diff > 0 ? '▲' : diff < 0 ? '▼' : '—',
      color: diff > 0 ? '#28a745' : diff < 0 ? '#dc3545' : '#888'
    };
  };




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
      {/* BANNER THÔNG TIN PRO/PREMIUM TỔNG HỢP */}
      {(boardData?.trial_ends || boardData?.premium_ends) && (
        <div style={{
          background: boardData?.plan === 'premium'
            ? 'linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%)' // Xanh lá Premium
            : 'linear-gradient(135deg, #e65100 0%, #ef6c00 100%)', // Màu cam Trial
          color: '#fff', padding: '12px 20px', borderRadius: '12px', marginBottom: '20px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          boxShadow: '0 4px 15px rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ fontSize: '28px' }}>{boardData?.plan === 'premium' ? '💎' : '🎁'}</div>
            <div>
              <div style={{ fontSize: '10px', opacity: 0.8, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                GÓI ĐANG DÙNG: {boardData?.plan === 'premium' ? 'BẢN QUYỀN PREMIUM' : 'DÙNG THỬ PRO'}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                Hạn đến: <span style={{ color: '#ffeb3b' }}>
                  {/* Hiển thị chính xác ngày từ DB */}
                  {new Date(boardData?.premium_ends || boardData?.trial_ends).toLocaleDateString('vi-VN')}
                </span>
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: '10px', opacity: 0.7 }}>THỜI GIAN CÒN LẠI</div>
            <div style={{
              fontSize: '24px',
              fontWeight: '900',
              fontFamily: 'monospace',
              letterSpacing: '1px'
            }}>
              {timeLeft}
            </div>
          </div>

          <button
            onClick={() => window.location.href = '/premium'}
            style={{
              background: '#fff',
              color: boardData?.plan === 'premium' ? '#1b5e20' : '#e65100',
              border: 'none', padding: '8px 15px', borderRadius: '6px',
              fontWeight: 'bold', cursor: 'pointer', fontSize: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            {boardData?.plan === 'premium' ? 'GIA HẠN' : 'NÂNG CẤP'}
          </button>
        </div>
      )}

      {/* Banner thông báo dùng thử */}
      {boardData?.plan !== 'premium' && isPro && (
        <div style={{
          background: 'linear-gradient(90deg, #FF9800, #F44336)',
          color: '#fff',
          padding: '10px',
          borderRadius: '8px',
          marginBottom: '20px',
          textAlign: 'center',
          fontWeight: 'bold',
          fontSize: '14px',
          boxShadow: '0 4px 10px rgba(244, 67, 54, 0.3)'
        }}>
          🎁 Chào mừng bạn! Bạn đang được tặng {trialDaysLeft} ngày trải nghiệm đầy đủ tính năng Premium.
        </div>
      )}

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
        borderLeft: isPro ? '4px solid #007acc' : '4px solid #ff9800'
      }}>
        <h3 style={{ marginTop: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
          📺 Đồng bộ giá lên Tivi
          {!isPro && <PremiumGate isPro={isPro} message="PRO" />}
        </h3>

        {/* --- KHUNG HƯỚNG DẪN BƯỚC 1 --- */}
        <div style={{
          background: '#fff3cd',
          color: '#856404',
          padding: '12px 15px',
          borderRadius: '6px',
          fontSize: '13px',
          marginBottom: '15px',
          border: '1px solid #ffeeba'
        }}>
          <strong style={{ display: 'block', marginBottom: '5px' }}>Bước 1: Trên Tivi của bạn</strong>
          Mở trình duyệt web (Trình duyệt Internet) trên Tivi và truy cập vào địa chỉ:
          <div style={{ fontSize: '18px', color: '#d32f2f', fontWeight: 'bold', marginTop: '8px', letterSpacing: '0.5px' }}>
            {typeof window !== 'undefined' ? window.location.origin : ''}/connect
          </div>
        </div>

        {/* --- KHUNG BƯỚC 2 (NHẬP MÃ) --- */}
        <div style={{ fontSize: '13px', color: '#333', fontWeight: 'bold', marginBottom: '8px' }}>
          Bước 2: Nhập mã 6 số hiển thị trên Tivi vào ô dưới đây:
        </div>

        <div style={{
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          filter: isPro ? 'none' : 'grayscale(100%) opacity(0.6)',
        }}>
          <input
            type="text"
            maxLength="6"
            value={isPro ? pairCode : '******'}
            onChange={(e) => setPairCode(e.target.value.replace(/\D/g, ''))}
            placeholder="Ví dụ: 123456"
            disabled={!isPro}
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
              {isPairing ? 'ĐANG XỬ LÝ...' : 'KẾT NỐI NGAY'}
            </button>
          </PremiumGate>
        </div>

        {!isPro && (
          <p style={{ fontSize: '11px', color: '#ff9800', marginTop: '10px', fontStyle: 'italic' }}>
            * Tính năng kết nối và đồng bộ Tivi thời gian thực yêu cầu tài khoản Premium.
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
              Chữ chạy thông báo:
            </label>
            <input
              type="text"
              value={boardData?.marquee_text || ''}
              onChange={(e) => handleUpdate('marquee_text', e.target.value)}
              style={{
                width: '100%', 
                padding: '10px', 
                border: '1px solid #ddd', 
                borderRadius: '4px',
                background: '#fff', 
                cursor: 'text'
              }}
              placeholder="Nhập nội dung thông báo hiển thị trên TV..."
            />
          </div>
        </div>

        {/* --- 📊 KHỐI THỊ TRƯỜNG: HIỆN TITLE, LÀM MỜ NỘI DUNG NẾU KHÔNG PHẢI PRO --- */}
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{
            color: '#333',
            borderLeft: '4px solid #007acc',
            paddingLeft: '10px',
            marginBottom: '15px',
            fontSize: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>📈 THỊ TRƯỜNG QUỐC TẾ & TỶ GIÁ</span>
            {!isPro && <span style={{ fontSize: '10px', background: '#ff9800', color: '#fff', padding: '2px 8px', borderRadius: '4px' }}>PREMIUM</span>}
          </h3>

          <div style={{
            position: 'relative', // Quan trọng để làm lớp phủ
            background: '#fff',
            padding: '15px',
            borderRadius: '12px',
            border: '1px solid #dee2e6',
            boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
            overflow: 'hidden'
          }}>

            {/* NỘI DUNG BÊN TRONG: BỊ LÀM MỜ NẾU !ISPRO */}
            <div style={{
              filter: isPro ? 'none' : 'blur(8px)',
              pointerEvents: isPro ? 'auto' : 'none', // Khóa click nếu không phải pro
              transition: 'all 0.3s ease'
            }}>
              {/* 1. Biểu đồ Vàng (TradingView & Kitco) */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginBottom: '20px' }}>
                <div style={{ flex: '1', minWidth: '320px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#007acc', marginBottom: '5px', textAlign: 'center' }}>TRADINGVIEW XAU/USD</div>
                  <iframe
                    style={{ width: '100%', height: '360px', border: '1px solid #eee', borderRadius: '8px' }}
                    src="https://s.tradingview.com/widgetembed/?symbol=XAUUSD&interval=1&hidesidetoolbar=1&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=[]&theme=light&style=1&timezone=Etc%2FUTC&studies_overrides={}&overrides={}&enabled_features=[]&disabled_features=[]&locale=vi"
                  ></iframe>
                </div>

                <div style={{ flex: '1', minWidth: '320px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#d00', marginBottom: '5px', textAlign: 'center' }}>KITCO LIVE CHART</div>
                  <div style={{ border: '1px solid #eee', borderRadius: '8px', overflow: 'hidden', height: '360px', display: 'flex', alignItems: 'center', background: '#fff' }}>
                    <img id="kitcoLiveGold" src="https://m.taiem.com.vn/images/kitcoChart.png" style={{ width: '100%', height: 'auto' }} alt="Kitco" />
                  </div>
                </div>
              </div>

              {/* 2. Tỷ giá Ngoại tệ */}
              <div style={{ borderTop: '2px solid #f8f9fa', paddingTop: '15px' }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#28a745', marginBottom: '10px', textAlign: 'center' }}>💱 TỶ GIÁ NGOẠI TỆ HÔM NAY</div>
                <iframe style={{ border: 'none', width: '100%', height: '500px', borderRadius: '8px' }} src="https://chogia.vn/ma-nhung-cho-iframe?ma=ofr"></iframe>
              </div>
            </div>

            {/* LỚP PHỦ NÂNG CẤP (CHỈ HIỆN KHI !ISPRO) */}
            {!isPro && (
              <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(255, 255, 255, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
                textAlign: 'center',
                padding: '20px'
              }}>
                <div style={{
                  background: '#fff',
                  padding: '25px',
                  borderRadius: '15px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                  border: '1px solid #eee'
                }}>
                  <div style={{ fontSize: '40px', marginBottom: '10px' }}>🔒</div>
                  <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>Tính năng Premium</h4>
                  <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px', maxWidth: '250px' }}>
                    Xem biểu đồ vàng thế giới và tỷ giá ngoại tệ trực tuyến để bám sát thị trường.
                  </p>
                  <button
                    onClick={() => window.location.href = '/premium'}
                    style={{
                      padding: '12px 25px',
                      background: '#007acc',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(0,122,204,0.3)'
                    }}
                  >
                    🚀 NÂNG CẤP PREMIUM NGAY
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {Object.entries(externalPrices).map(([sourceId, source]) => {
            const isExpanded = expandedSources[sourceId];
            const sortedItems = Object.values(source.items || {}).sort((a, b) => (a.order || 0) - (b.order || 0));

            // Lấy dữ liệu của loại vàng đầu tiên để vẽ biểu đồ đại diện cho tiệm
            const firstItemSlug = sortedItems[0]?.label.toLowerCase().replace(/[^a-z0-9]/g, '_');
            const historyData = getHistoryForChart(sourceId, firstItemSlug);

            return (
              <div key={sourceId} style={{
                background: '#fff', borderRadius: '16px', border: '3px solid #222',
                boxShadow: '0 12px 24px rgba(0,0,0,0.15)', overflow: 'hidden'
              }}>
                {/* --- PHẦN 1: HEADER TIỆM --- */}
                <div onClick={() => toggleExpand(sourceId)} style={{
                  padding: '20px 25px', background: isExpanded ? '#131722' : '#f8f9fa',
                  color: isExpanded ? '#fff' : '#000', cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  transition: 'all 0.3s'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{
                      width: '12px', height: '12px', background: '#22ab94', borderRadius: '50%',
                      boxShadow: '0 0 10px #22ab94', animation: 'pulse 1.5s infinite'
                    }}></div>
                    <strong style={{ fontSize: '24px', letterSpacing: '-0.5px' }}>{source.name}</strong>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '10px', opacity: 0.6, fontWeight: 'bold' }}>CẬP NHẬT</div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                        {sortedItems[0]?.updatedAt ? new Date(sortedItems[0].updatedAt).toLocaleTimeString('vi-VN') : '--:--'}
                      </div>
                    </div>
                    <span style={{ fontSize: '28px' }}>{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>

                {/* --- PHẦN 2: BIỂU ĐỒ TRADINGVIEW (CHỈ HIỆN KHI MỞ RỘNG) --- */}
                {isExpanded && historyData.length >= 2 && (
                  <div style={{ borderBottom: '2px solid #222' }}>
                    <TradingViewChart data={historyData} />
                  </div>
                )}

                {/* --- PHẦN 3: BẢNG GIÁ CHI TIẾT --- */}
                {isExpanded && (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                      <thead style={{ background: '#1e222d', color: '#afb1b6' }}>
                        <tr>
                          <th style={{ padding: '15px', textAlign: 'left', paddingLeft: '25px', width: '40%' }}>LOẠI VÀNG</th>
                          <th style={{ padding: '15px', textAlign: 'center' }}>MUA VÀO</th>
                          <th style={{ padding: '15px', textAlign: 'center' }}>BÁN RA</th>
                        </tr>
                      </thead>
                      <tbody style={{ filter: isPro ? 'none' : 'blur(8px)' }}>
                        {sortedItems.map((item, idx) => {
                          const itemSlug = item.label.toLowerCase().replace(/[^a-z0-9]/g, '_');
                          const buyChange = getPriceDiff(sourceId, itemSlug, item.buy);
                          const sellChange = getPriceDiff(sourceId, itemSlug, item.sell);
                          const isJustUpdated = (Date.now() - item.updatedAt) < 60000;

                          return (
                            <tr key={idx} className={isJustUpdated ? 'flash-live' : ''} style={{
                              borderBottom: '1px solid #eee',
                              background: idx % 2 === 0 ? '#fff' : '#fcfcfc'
                            }}>
                              {/* TÊN LOẠI VÀNG */}
                              <td style={{ padding: '20px 25px', fontSize: '18px', fontWeight: 'bold', color: '#000' }}>
                                {item.label}
                              </td>

                              {/* GIÁ MUA */}
                              <td style={{ padding: '15px', textAlign: 'center' }}>
                                <div style={{ fontSize: '24px', fontWeight: '900', color: '#22ab94' }}>{item.buy}</div>
                                <div style={{ fontSize: '13px', color: buyChange.color, fontWeight: 'bold' }}>
                                  {buyChange.symbol} {buyChange.diff !== '0' ? buyChange.diff : ''}
                                </div>
                              </td>

                              {/* GIÁ BÁN */}
                              <td style={{ padding: '15px', textAlign: 'center' }}>
                                <div style={{ fontSize: '24px', fontWeight: '900', color: '#f23645' }}>{item.sell}</div>
                                <div style={{ fontSize: '13px', color: sellChange.color, fontWeight: 'bold' }}>
                                  {sellChange.symbol} {sellChange.diff !== '0' ? sellChange.diff : ''}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* KHỐI AI OPENBB */}
        {/* <OpenBBChat userId={user.uid} plan={isPro ? 'pro' : 'free'} /> */}

        {/* KHỐI 2: CẬP NHẬT GIÁ (Tự động thêm dấu chấm phần ngàn) */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '2px solid #333' }}>
          <h3 style={{ marginTop: 0, fontSize: '18px', borderBottom: '2px solid #eee', paddingBottom: '12px' }}>
            💰 Bảng giá hôm nay (Số to - Có dấu chấm)
          </h3>

          {(boardData?.prices || []).map((p, i) => (
            <div key={i} style={{ marginBottom: '20px', padding: '15px', background: '#fdfdfd', border: '1px solid #ccc', borderRadius: '10px' }}>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <input
                  type="text"
                  value={p.name}
                  onChange={(e) => {
                    const newP = [...boardData.prices]; newP[i].name = e.target.value; handleUpdate('prices', newP);
                  }}
                  style={{ width: '80%', fontWeight: '900', border: 'none', background: 'transparent', fontSize: '20px', color: '#000' }}
                />
                <button onClick={() => handleUpdate('prices', boardData.prices.filter((_, idx) => idx !== i))} style={{ color: 'red', border: '1px solid red', background: 'none', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer' }}>Xóa</button>
              </div>

              <div style={{ display: 'flex', gap: '15px' }}>
                {/* MUA VÀO */}
                <div style={{ flex: 1 }}>
                  <small style={{ color: 'green', fontWeight: 'bold' }}>MUA VÀO</small>
                  <input
                    type="text"
                    inputMode="numeric" // Hiện bàn phím số trên điện thoại
                    value={formatVND(p.mua)}
                    onChange={(e) => {
                      const rawValue = parseVND(e.target.value);
                      const newP = [...boardData.prices];
                      newP[i].mua = rawValue;
                      handleUpdate('prices', newP);
                    }}
                    style={{
                      width: '100%', padding: '15px 10px', border: '2px solid green', borderRadius: '8px',
                      color: 'green', fontWeight: '900', fontSize: '26px', textAlign: 'center'
                    }}
                  />
                </div>

                {/* BÁN RA */}
                <div style={{ flex: 1 }}>
                  <small style={{ color: 'red', fontWeight: 'bold' }}>BÁN RA</small>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatVND(p.ban)}
                    onChange={(e) => {
                      const rawValue = parseVND(e.target.value);
                      const newP = [...boardData.prices];
                      newP[i].ban = rawValue;
                      handleUpdate('prices', newP);
                    }}
                    style={{
                      width: '100%', padding: '15px 10px', border: '2px solid red', borderRadius: '8px',
                      color: 'red', fontWeight: '900', fontSize: '26px', textAlign: 'center'
                    }}
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Nút thêm hàng */}
          {(isPro || (boardData?.prices || []).length < 4) ? (
            <button onClick={() => handleUpdate('prices', [...(boardData?.prices || []), { name: "VÀNG MỚI", mua: "", ban: "" }])} style={{ width: '100%', padding: '18px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}>+ THÊM DÒNG GIÁ</button>
          ) : (
            <div style={{ textAlign: 'center', padding: '10px', color: 'orange' }}>⚠️ Đã đạt giới hạn 4 dòng</div>
          )}
        </div>

        {/* KHỐI 3: GIAO DIỆN (Khóa template trừ bản mặc định cho Free) */}
        {/* KHỐI 3: CHỌN GIAO DIỆN CÓ LIVE PREVIEW */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #dee2e6' }}>
          <h3 style={{ marginTop: 0, fontSize: '18px', marginBottom: '15px' }}>🎨 Chọn giao diện Tivi</h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '15px' }}>
            {Object.keys(globalTemplates).map((key) => {
              const template = globalTemplates[key];
              const isLocked = !isPro && key !== 'mau_do_truyen_thong';
              const isActive = boardData?.template_id === key;

              return (
                <div key={key} style={{ position: 'relative', borderRadius: '8px', border: isActive ? '3px solid #007acc' : '1px solid #ddd', overflow: 'hidden' }}>
                  {/* Vùng xem trước nhỏ */}
                  <div style={{ height: '80px', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    onClick={() => setPreviewingTemplate({ ...template, id: key })}>
                    <small style={{ color: '#fff', fontSize: '10px' }}>👁️ Bấm để Xem thử</small>
                    {isLocked && <div style={{ position: 'absolute', top: 5, right: 5 }}>🔒</div>}
                  </div>

                  {/* Nút chọn */}
                  <button
                    disabled={isLocked}
                    onClick={() => applyTheme(key)}
                    style={{
                      width: '100%', padding: '8px', border: 'none', cursor: isLocked ? 'not-allowed' : 'pointer',
                      background: isLocked ? '#eee' : (isActive ? '#007acc' : '#f8f9fa'),
                      color: isActive ? '#fff' : '#333', fontSize: '12px', fontWeight: 'bold'
                    }}
                  >
                    {isActive ? 'ĐANG DÙNG' : template.name}
                  </button>
                </div>
              );
            })}
          </div>

          {/* --- MODAL HIỂN THỊ LIVE PREVIEW (Giống hệt TV thật) --- */}
          {previewingTemplate && (
            <div style={{
              position: 'fixed', inset: 0, zIndex: 10000,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', padding: '20px'
            }} onClick={() => setPreviewingTemplate(null)}>

              <div style={{
                width: '90%', maxWidth: '1000px', // Khung Popup
                background: '#fff', borderRadius: '15px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                overflow: 'hidden'
              }} onClick={e => e.stopPropagation()}>

                {/* Tiêu đề */}
                <div style={{ padding: '15px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee' }}>
                  <h4 style={{ margin: 0 }}>📺 Xem thử: {previewingTemplate.name}</h4>
                  <button onClick={() => setPreviewingTemplate(null)} style={{ cursor: 'pointer', border: 'none', background: 'none', fontSize: '20px' }}>✕</button>
                </div>

                {/* VÙNG HIỂN THỊ TV - QUAN TRỌNG NHẤT */}
                <div style={{ background: '#1a1a1a', padding: '20px', display: 'flex', justifyContent: 'center' }}>
                  <div style={{
                    width: '100%',
                    aspectRatio: '16 / 9', // Giữ đúng tỉ lệ Tivi
                    background: '#000',
                    position: 'relative',
                    overflow: 'hidden', // Cắt bỏ phần thừa khi scale
                    boxShadow: '0 0 30px rgba(0,0,0,0.5)',
                    border: '4px solid #333', // Viền Tivi
                    borderRadius: '4px'
                  }}>
                    {/* Iframe khổ lớn 1920px được thu nhỏ lại bằng scale */}
                    <iframe
                      srcDoc={getPreviewHtml(previewingTemplate, formatVND)}
                      style={{
                        width: '1920px',
                        height: '1080px',
                        border: 'none',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        transformOrigin: 'top left',
                        // Tự động tính toán tỷ lệ thu nhỏ dựa trên chiều rộng thực tế của container
                        transform: `scale(${(1000 * 0.9 - 48) / 1920})`, // 48 là phần padding/border trừ ra
                        pointerEvents: 'none'
                      }}
                      className="preview-iframe"
                    />
                  </div>
                </div>

                {/* Nút bấm */}
                <div style={{ padding: '15px 25px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button onClick={() => setPreviewingTemplate(null)} style={{ padding: '8px 20px', borderRadius: '5px', border: '1px solid #ccc', cursor: 'pointer' }}>Đóng</button>
                  <button
                    onClick={() => { applyTheme(previewingTemplate.id); setPreviewingTemplate(null); }}
                    style={{ padding: '8px 20px', borderRadius: '5px', border: 'none', background: '#007acc', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    DÙNG GIAO DIỆN NÀY
                  </button>
                </div>
              </div>

              <style>{`
      /* Script để iframe luôn vừa khít khi resize màn hình admin */
      @media (max-width: 1000px) {
        .preview-iframe {
          transform: scale(calc((100vw * 0.9 - 80) / 1920)) !important;
        }
      }
    `}</style>
            </div>
          )}
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
        {user?.uid === ADMIN_UID && (
          <div style={{ marginTop: '20px', padding: '15px', background: '#000', borderRadius: '8px', textAlign: 'center' }}>
            <p style={{ color: '#fff', margin: '0 0 10px 0', fontSize: '13px' }}>🛠 Khu vực quản trị hệ thống</p>
            <button
              onClick={() => window.location.href = '/crawler'}
              style={{ padding: '10px 20px', background: '#ffc107', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              🤖 QUẢN LÝ ROBOT CRAWLER
            </button>
          </div>
        )}
      </div>
    </div>
  );
}