import '../style/globals.css'; // Đường dẫn đến file CSS có chứa dòng @import "tailwindcss"

export default function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />;
}