import '../style/globals.css';
import Script from 'next/script';
import { useRouter } from 'next/router';

export default function MyApp({ Component, pageProps }) {
  const router = useRouter();

  // Khai báo chính xác các trang bạn muốn hiện khung Chat tư vấn
  // Dựa trên file của bạn: '/' (index.js), '/landing' (landing.js), '/premium' (premium.js)
  const showChatOnPages = ['/', '/landing', '/premium']; 

  const isShowChat = showChatOnPages.includes(router.pathname);

  return (
    <>
      <Component {...pageProps} />
      
      {/* Chỉ load Chat Widget ở các trang Sale & Dashboard, tự động ẩn trên Tivi và Admin */}
      {isShowChat && (
        <Script 
          src="https://chat.schoolsai.work/chat-widget.js" 
          strategy="lazyOnload" 
          data-tenant="bot_0u3tp5wnbcvshpd" 
          data-domain="priceg.phanmemvangta.com"
          data-botname="Phần mềm bảng giá vàng"
        />
      )}
    </>
  );
}