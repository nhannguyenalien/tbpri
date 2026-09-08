import { motion } from 'motion/react';
import {
    CheckCircle2,
    Smartphone,
    Tv,
    TrendingUp,
    RefreshCw,
    Eye,
    LayoutTemplate,
    FileSpreadsheet,
    ArrowRight,
    Gift,
    ShieldCheck,
    Zap,
    Check,
    X,
    PlayCircle,
    Globe, 
    Coins
} from 'lucide-react';
import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { AnimatePresence } from 'motion/react'; // Bổ sung AnimatePresence
import {
    getAuth, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, onAuthStateChanged, RecaptchaVerifier,
    signInWithPhoneNumber
} from 'firebase/auth';
import '../lib/firebase'; // khởi tạo Firebase app mặc định cho getAuth()

export default function Landing() {
    const router = useRouter();
    // --- STATE ---
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [loginInput, setLoginInput] = useState(''); // Tài khoản hoặc Email
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    // --- CHECK AUTH ---
    useEffect(() => {
        const auth = getAuth();
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                router.push('/'); // Nếu đã login thì vào Dashboard
            } else {
                setIsCheckingAuth(false);
            }
        });
        return () => unsubscribe();
    }, [router]);

    // --- XỬ LÝ ĐĂNG NHẬP ---
    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Lấy trực tiếp loginInput (là email đầy đủ khách vừa gõ)
            await signInWithEmailAndPassword(getAuth(), loginInput, password);
            // Thành công sẽ tự vào Dashboard
        } catch (error) {
            alert("Email hoặc mật khẩu không chính xác!");
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        try {
            await signInWithPopup(getAuth(), new GoogleAuthProvider());
        } catch (error) {
            alert("Lỗi: " + error.message);
            setIsLoading(false);
        }
    };

    if (isCheckingAuth) {
        return (
            <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
                <div className="animate-spin w-10 h-10 border-4 border-[#007acc] border-t-transparent rounded-full"></div>
            </div>
        );
    }
    return (

        <div className="min-h-screen bg-[#F8F9FA] font-sans text-slate-800 selection:bg-[#007ACC] selection:text-white">
            <Head>

                <title>SmartGold - The Best Gold Price Tracking App</title>
                <meta name="description" content="Track gold prices in real-time with SmartGold" />
            </Head>
            <video
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover opacity-30"
            >
                <source src="https://videos.pexels.com/video-files/35417493/15005770_1440_2560_25fps.mp4" type="video/mp4" />
            </video>
            {/* Navigation */}
            <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FFC107] to-amber-600 flex items-center justify-center shadow-sm">
                                <Tv className="w-5 h-5 text-white" />
                            </div>
                            <span className="font-bold text-xl tracking-tight text-slate-900">SmartGold</span>
                        </div>
                        <div className="hidden md:flex items-center gap-8">
                            <a href="#benefits" className="text-sm font-medium text-slate-600 hover:text-[#007ACC] transition-colors">Lợi ích</a>
                            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-[#007ACC] transition-colors">Tính năng</a>
                            <a href="#pricing" className="text-sm font-medium text-slate-600 hover:text-[#007ACC] transition-colors">Bảng giá</a>

                            <button
                                onClick={() => setIsLoginOpen(true)}
                                className="text-sm font-medium text-slate-600 hover:text-[#007ACC] transition-colors"
                            >
                                Đăng nhập Admin
                            </button>

                            <button
                                onClick={() => setIsLoginOpen(true)}
                                className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white transition-all bg-[#007ACC] rounded-full hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/30"
                            >
                                Nhận 3 ngày Pro
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-20 pb-32 overflow-hidden">
                {/* Video Background Overlay */}
                <div className="absolute inset-0 w-full h-full -z-10">

                    {/* Light overlay to maintain the Light Mode theme and text readability */}
                    <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px]"></div>
                    <div className="absolute inset-0 bg-gradient-to-b from-amber-50/40 via-white/80 to-[#F8F9FA]"></div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="text-center max-w-4xl mx-auto">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100/80 border border-amber-200 text-amber-800 text-sm font-semibold mb-8 shadow-sm"
                        >
                            <Gift className="w-4 h-4 text-amber-600" />
                            <span>Tặng 3 NGÀY DÙNG THỬ PRO - Trải nghiệm toàn bộ tính năng cao cấp!</span>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15] mb-6"
                        >
                            Số Hóa Tiệm Vàng Của Bạn <br className="hidden md:block" />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFC107] to-amber-600">
                                Thay Bảng LED Cũ Bằng Tivi Thông Minh
                            </span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed"
                        >
                            Cập nhật giá mua/bán chỉ với 1 chạm từ điện thoại. Hiển thị sang trọng, đồng bộ tức thì, tự động lưu lịch sử kinh doanh.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            className="flex flex-col sm:flex-row items-center justify-center gap-4"
                        >
                            <button
                                onClick={() => setIsLoginOpen(true)}
                                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 text-base font-bold text-white transition-all bg-[#007ACC] rounded-full hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5"
                            >
                                Bắt đầu ngay - Miễn phí 3 ngày Pro
                                <ArrowRight className="w-5 h-5 ml-2" />
                            </button>
                            <a
                                href="#features"
                                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 text-base font-bold text-slate-700 transition-all bg-white/80 backdrop-blur-sm border border-slate-200 rounded-full hover:bg-white hover:shadow-md"
                            >
                                Khám phá tính năng
                            </a>
                        </motion.div>
                    </div>

                    {/* Hero Image Mockup */}
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.4 }}
                        className="mt-20 relative max-w-5xl mx-auto"
                    >
                        <div className="absolute -inset-1 bg-gradient-to-r from-[#FFC107] to-[#007ACC] rounded-2xl blur opacity-20"></div>
                        <div className="relative rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden flex flex-col md:flex-row items-center justify-center p-4 md:p-8 gap-8">
                            {/* TV Mockup */}
                            <div className="w-full md:w-2/3 bg-slate-900 rounded-xl p-2 shadow-inner border-4 border-slate-800 relative aspect-video flex flex-col">
                                <div className="flex-1 bg-gradient-to-br from-red-900 to-red-950 rounded flex flex-col p-4">
                                    <div className="text-center mb-4">
                                        <h2 className="text-amber-400 font-bold text-2xl uppercase tracking-widest">Tiệm Vàng Kim Bảo</h2>
                                        <p className="text-white/70 text-xs">Cập nhật: 10:30 AM - Hôm nay</p>
                                    </div>
                                    <div className="flex-1 grid grid-cols-3 gap-2 text-white">
                                        <div className="col-span-1 font-bold text-amber-200 border-b border-red-800 pb-2">Loại Vàng</div>
                                        <div className="col-span-1 font-bold text-right text-amber-200 border-b border-red-800 pb-2">Mua Vào</div>
                                        <div className="col-span-1 font-bold text-right text-amber-200 border-b border-red-800 pb-2">Bán Ra</div>

                                        <div className="col-span-1 py-1">SJC 9999</div>
                                        <div className="col-span-1 text-right text-[#28A745] font-mono py-1">80.500</div>
                                        <div className="col-span-1 text-right text-[#DC3545] font-mono py-1">82.500</div>

                                        <div className="col-span-1 py-1">Nhẫn Trơn</div>
                                        <div className="col-span-1 text-right text-[#28A745] font-mono py-1">68.200</div>
                                        <div className="col-span-1 text-right text-[#DC3545] font-mono py-1">69.400</div>

                                        <div className="col-span-1 py-1">Vàng 18K</div>
                                        <div className="col-span-1 text-right text-[#28A745] font-mono py-1">50.100</div>
                                        <div className="col-span-1 text-right text-[#DC3545] font-mono py-1">52.100</div>
                                    </div>
                                    <div className="mt-4 bg-black/40 rounded overflow-hidden whitespace-nowrap py-1">
                                        <p className="text-amber-400 text-sm animate-[marquee_10s_linear_infinite] inline-block">Kính chào quý khách! Chúc quý khách một ngày tốt lành. Thu mua vàng giá cao...</p>
                                    </div>
                                </div>
                            </div>

                            {/* Phone Mockup */}
                            <div className="w-48 md:w-1/3 bg-slate-100 rounded-[2rem] p-2 shadow-xl border-4 border-slate-300 relative aspect-[9/19] hidden sm:flex flex-col">
                                <div className="absolute top-0 inset-x-0 h-6 bg-slate-300 rounded-b-xl w-1/2 mx-auto"></div>
                                <div className="flex-1 bg-white rounded-[1.5rem] overflow-hidden flex flex-col">
                                    <div className="bg-[#007ACC] p-4 text-white">
                                        <h3 className="font-bold text-sm">Admin Panel</h3>
                                    </div>
                                    <div className="p-4 flex-1 flex flex-col gap-3">
                                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                            <p className="text-xs font-semibold text-slate-500 mb-1">SJC 9999</p>
                                            <div className="flex justify-between gap-2">
                                                <input type="text" value="80.500" readOnly className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-sm font-mono text-[#28A745]" />
                                                <input type="text" value="82.500" readOnly className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-sm font-mono text-[#DC3545]" />
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                            <p className="text-xs font-semibold text-slate-500 mb-1">Nhẫn Trơn</p>
                                            <div className="flex justify-between gap-2">
                                                <input type="text" value="68.200" readOnly className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-sm font-mono text-[#28A745]" />
                                                <input type="text" value="69.400" readOnly className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-sm font-mono text-[#DC3545]" />
                                            </div>
                                        </div>
                                        <button className="mt-auto w-full bg-[#007ACC] text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2">
                                            <RefreshCw className="w-4 h-4" /> Cập nhật Tivi
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* --- SECTION: THỊ TRƯỜNG QUỐC TẾ (Dán dưới Pricing) --- */}
            <section id="market-data" className="py-24 bg-slate-50 relative overflow-hidden border-t border-slate-200">
                {/* Trang trí nền nhẹ nhàng */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] -z-10"></div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[#007ACC] text-xs font-bold uppercase tracking-wider mb-4 border border-blue-100"
                        >
                            <TrendingUp className="w-4 h-4" />
                            Dữ liệu thời gian thực
                        </motion.div>
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Theo dõi thị trường toàn cầu</h2>
                        <p className="text-lg text-slate-600">SmartGold tích hợp sẵn các nguồn dữ liệu uy tín nhất thế giới, giúp bạn đưa ra quyết định điều chỉnh giá chính xác đến từng phút.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                        {/* CỘT 1 & 2: BIỂU ĐỒ VÀNG (Gộp 2 biểu đồ vào khung lớn) */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden transition-all hover:shadow-2xl hover:shadow-blue-500/10">
                                <div className="bg-slate-900 px-6 py-4 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                        <span className="text-white font-bold text-sm">TRADINGVIEW XAU/USD</span>
                                    </div>
                                    <span className="text-slate-400 text-xs font-mono tracking-widest uppercase">Live Data</span>
                                </div>
                                <div className="p-2 bg-white">
                                    <iframe
                                        style={{ width: '100%', height: '450px', border: 'none', borderRadius: '12px' }}
                                        src="https://s.tradingview.com/widgetembed/?symbol=XAUUSD&interval=1&hidesidetoolbar=1&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=[]&theme=light&style=1&timezone=Etc%2FUTC&studies_overrides={}&overrides={}&enabled_features=[]&disabled_features=[]&locale=vi"
                                    ></iframe>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden group">
                                <div className="px-6 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                    <span className="text-slate-700 font-bold text-sm flex items-center gap-2">
                                        <Globe className="w-4 h-4 text-amber-600" /> KITCO LIVE CHART
                                    </span>
                                    <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold">WORLD STANDARD</span>
                                </div>
                                <div className="p-4 flex items-center justify-center min-h-[300px]">
                                    <img
                                        id="kitcoLiveGold"
                                        src="https://m.taiem.com.vn/images/kitcoChart.png"
                                        className="max-w-full h-auto rounded-lg group-hover:scale-[1.01] transition-transform duration-500"
                                        alt="Kitco"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* CỘT 3: TỶ GIÁ NGOẠI TỆ */}
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 h-full overflow-hidden flex flex-col transition-all hover:shadow-2xl hover:shadow-green-500/10">
                                <div className="bg-[#28A745] px-6 py-4 flex items-center gap-3">
                                    <Coins className="w-5 h-5 text-white" />
                                    <span className="text-white font-bold text-sm tracking-wide uppercase">Tỷ giá ngoại tệ hôm nay</span>
                                </div>
                                <div className="flex-1 bg-white">
                                    <iframe
                                        className="w-full h-full min-h-[600px] border-none"
                                        src="https://chogia.vn/ma-nhung-cho-iframe?ma=ofr"
                                    ></iframe>
                                </div>
                                <div className="p-4 bg-slate-50 border-t border-slate-100">
                                    <p className="text-[10px] text-slate-400 text-center italic">Dữ liệu được cập nhật tự động từ Chợ Giá</p>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Banner kêu gọi hành động nhỏ dưới Market Area */}
                    <div className="mt-12 bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                                <ShieldCheck className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                                <h4 className="text-white font-bold text-lg">Bạn muốn copy giá thị trường nhanh?</h4>
                                <p className="text-slate-400 text-sm">Gói Pro cho phép bạn copy giá từ các nguồn lớn trực tiếp vào Tivi chỉ với 1 chạm.</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsLoginOpen(true)}
                            className="whitespace-nowrap px-6 py-3 bg-white text-slate-900 font-bold rounded-full hover:bg-[#FFC107] transition-colors flex items-center gap-2 group"
                        >
                            Trải nghiệm ngay Pro
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
            </section>

            {/* Benefits Section */}
            <section id="benefits" className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Tại sao nên nâng cấp?</h2>
                        <p className="text-lg text-slate-600">Giải quyết triệt để những bất tiện của bảng LED truyền thống, mang lại trải nghiệm chuyên nghiệp cho tiệm vàng của bạn.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: <Smartphone className="w-8 h-8 text-[#007ACC]" />,
                                title: "Dễ dùng cho mọi lứa tuổi",
                                desc: "Không cần cắm USB hay dùng Remote phức tạp. Gõ số trên điện thoại, Tivi tự nhảy số tức thì."
                            },
                            {
                                icon: <Tv className="w-8 h-8 text-[#FFC107]" />,
                                title: "Sang trọng & Thu hút",
                                desc: "Thay thế bảng LED đỏ lỗi thời bằng màn hình Tivi sắc nét, có dòng chữ chạy (Marquee) lời chào khách hàng."
                            },
                            {
                                icon: <TrendingUp className="w-8 h-8 text-[#28A745]" />,
                                title: "Bám sát thị trường",
                                desc: "Tích hợp trực tiếp biểu đồ vàng Kitco/TradingView thế giới và tỷ giá ngoại tệ theo thời gian thực."
                            }
                        ].map((item, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: i * 0.1 }}
                                className="bg-[#F8F9FA] rounded-2xl p-8 border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all hover:-translate-y-1"
                            >
                                <div className="w-16 h-16 rounded-xl bg-white shadow-sm flex items-center justify-center mb-6 border border-slate-100">
                                    {item.icon}
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
                                <p className="text-slate-600 leading-relaxed">{item.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Section - Expanded */}
            <section id="features" className="py-24 bg-slate-50 overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-20">
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Tính năng nổi bật</h2>
                        <p className="text-lg text-slate-600">Hệ thống được thiết kế chuyên biệt cho ngành vàng bạc đá quý, tối ưu hóa quy trình vận hành hàng ngày.</p>
                    </div>

                    <div className="space-y-24">
                        {/* Feature 1 */}
                        <div className="flex flex-col md:flex-row items-center gap-12">
                            <div className="w-full md:w-1/2">
                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-100 text-[#007ACC] mb-6">
                                    <RefreshCw className="w-6 h-6" />
                                </div>
                                <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">Đồng bộ thời gian thực từ xa</h3>
                                <p className="text-lg text-slate-600 mb-6">Không cần ở tại tiệm, bạn vẫn có thể cập nhật giá vàng ngay lập tức thông qua điện thoại. Kết nối an toàn qua mã 6 số, Tivi nhảy số không độ trễ.</p>
                                <ul className="space-y-3">
                                    <li className="flex items-center gap-3 text-slate-700"><CheckCircle2 className="w-5 h-5 text-[#28A745]" /> Quản lý mọi lúc mọi nơi</li>
                                    <li className="flex items-center gap-3 text-slate-700"><CheckCircle2 className="w-5 h-5 text-[#28A745]" /> Bảo mật tuyệt đối với mã PIN</li>
                                </ul>
                            </div>
                            <div className="w-full md:w-1/2">
                                <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-200">
                                    <img src="https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&q=80&w=800" alt="Mobile sync" className="w-full h-auto" referrerPolicy="no-referrer" />
                                    <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur p-4 rounded-xl shadow-lg border border-white/50 flex items-center gap-4">
                                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600"><Check className="w-5 h-5" /></div>
                                        <div>
                                            <p className="font-bold text-slate-900">Đã cập nhật giá SJC</p>
                                            <p className="text-sm text-slate-500">Vừa xong</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Feature 2 */}
                        <div className="flex flex-col md:flex-row-reverse items-center gap-12">
                            <div className="w-full md:w-1/2">
                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-100 text-amber-600 mb-6">
                                    <Eye className="w-6 h-6" />
                                </div>
                                <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">Theo dõi & Quét giá thị trường</h3>
                                <p className="text-lg text-slate-600 mb-6">Tích hợp trực tiếp biểu đồ vàng thế giới (Kitco, TradingView) và tỷ giá ngoại tệ. Quét giá từ các thương hiệu lớn để điều chỉnh giá bán cạnh tranh nhất.</p>
                                <ul className="space-y-3">
                                    <li className="flex items-center gap-3 text-slate-700"><CheckCircle2 className="w-5 h-5 text-[#28A745]" /> Biểu đồ Kitco Real-time</li>
                                    <li className="flex items-center gap-3 text-slate-700"><CheckCircle2 className="w-5 h-5 text-[#28A745]" /> Copy giá đối thủ với 1 chạm</li>
                                </ul>
                            </div>
                            <div className="w-full md:w-1/2">
                                <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-200">
                                    <img src="https://images.unsplash.com/photo-1642543492481-44e81e3914a7?auto=format&fit=crop&q=80&w=800" alt="Market tracking" className="w-full h-auto" referrerPolicy="no-referrer" />
                                </div>
                            </div>
                        </div>

                        {/* Feature 3 */}
                        <div className="flex flex-col md:flex-row items-center gap-12">
                            <div className="w-full md:w-1/2">
                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 mb-6">
                                    <FileSpreadsheet className="w-6 h-6" />
                                </div>
                                <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">Tự động chốt sổ & Báo cáo</h3>
                                <p className="text-lg text-slate-600 mb-6">Không còn phải ghi chép sổ sách thủ công. Hệ thống tự động lưu lại lịch sử biến động giá hàng ngày và xuất báo cáo file Excel (CSV) dễ dàng.</p>
                                <ul className="space-y-3">
                                    <li className="flex items-center gap-3 text-slate-700"><CheckCircle2 className="w-5 h-5 text-[#28A745]" /> Lưu trữ an toàn trên Cloud</li>
                                    <li className="flex items-center gap-3 text-slate-700"><CheckCircle2 className="w-5 h-5 text-[#28A745]" /> Xuất file Excel nhanh chóng</li>
                                </ul>
                            </div>
                            <div className="w-full md:w-1/2">
                                <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-200">
                                    <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800" alt="Reports and analytics" className="w-full h-auto" referrerPolicy="no-referrer" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Template Gallery Section */}
            <section className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Kho giao diện đa dạng</h2>
                        <p className="text-lg text-slate-600">Nhiều mẫu thiết kế phù hợp mọi phong thủy, đổi màu sắc và bố cục chỉ bằng 1 click. Tôn lên vẻ sang trọng cho tiệm vàng của bạn.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Template 1 */}
                        <div className="group rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-all">
                            <div className="relative aspect-video overflow-hidden bg-slate-900">
                                <img src="https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?auto=format&fit=crop&q=80&w=600" alt="Đỏ Truyền Thống" className="w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                                    <div className="text-amber-400 font-bold text-xl mb-2">Mẫu Đỏ Truyền Thống</div>
                                    <div className="w-3/4 h-2 bg-red-600/50 rounded-full mb-2"></div>
                                    <div className="w-1/2 h-2 bg-red-600/50 rounded-full"></div>
                                </div>
                            </div>
                            <div className="p-4 bg-white">
                                <h4 className="font-bold text-slate-900">Đỏ Truyền Thống (Hỏa)</h4>
                                <p className="text-sm text-slate-500">Phù hợp tiệm vàng phong cách cổ điển, mang lại may mắn.</p>
                            </div>
                        </div>

                        {/* Template 2 */}
                        <div className="group rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-all">
                            <div className="relative aspect-video overflow-hidden bg-slate-900">
                                <img src="https://images.unsplash.com/photo-1587836374828-cb438786dd7e?auto=format&fit=crop&q=80&w=600" alt="Vàng Kim Sang Trọng" className="w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                                    <div className="text-white font-bold text-xl mb-2">Mẫu Vàng Kim</div>
                                    <div className="w-3/4 h-2 bg-amber-500/50 rounded-full mb-2"></div>
                                    <div className="w-1/2 h-2 bg-amber-500/50 rounded-full"></div>
                                </div>
                            </div>
                            <div className="p-4 bg-white">
                                <h4 className="font-bold text-slate-900">Vàng Kim Sang Trọng (Kim)</h4>
                                <p className="text-sm text-slate-500">Tôn lên vẻ đẳng cấp, hiện đại và chuyên nghiệp.</p>
                            </div>
                        </div>

                        {/* Template 3 */}
                        <div className="group rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-all">
                            <div className="relative aspect-video overflow-hidden bg-slate-900">
                                <img src="https://images.unsplash.com/photo-1599643478514-4a4e0f69a509?auto=format&fit=crop&q=80&w=600" alt="Xanh Navy Hiện Đại" className="w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                                    <div className="text-cyan-400 font-bold text-xl mb-2">Mẫu Xanh Navy</div>
                                    <div className="w-3/4 h-2 bg-blue-600/50 rounded-full mb-2"></div>
                                    <div className="w-1/2 h-2 bg-blue-600/50 rounded-full"></div>
                                </div>
                            </div>
                            <div className="p-4 bg-white">
                                <h4 className="font-bold text-slate-900">Xanh Navy Hiện Đại (Thủy)</h4>
                                <p className="text-sm text-slate-500">Tạo cảm giác tin cậy, minh bạch và công nghệ cao.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-24 bg-white relative border-t border-slate-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Bảng giá linh hoạt</h2>
                        <p className="text-lg text-slate-600">Bắt đầu miễn phí, nâng cấp khi bạn cần. Tặng ngay 3 ngày trải nghiệm Pro cho mọi tài khoản mới.</p>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto items-center">
                        {/* Free Plan */}
                        <div className="bg-[#F8F9FA] rounded-3xl p-8 border border-slate-200 relative">
                            <div className="absolute -right-4 top-1/2 -translate-y-1/2 z-20 hidden lg:flex items-center justify-center">
                                <div className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-2 rounded-full shadow-md border border-amber-200 flex items-center gap-1 whitespace-nowrap transform translate-x-1/2">
                                    Tặng 3 ngày Pro <ArrowRight className="w-3 h-3" />
                                </div>
                            </div>

                            <h3 className="text-2xl font-bold text-slate-900 mb-2">Gói Cơ Bản</h3>
                            <p className="text-slate-500 mb-6">Trải nghiệm quản lý giá vàng cơ bản</p>

                            <div className="mb-8">
                                <span className="text-4xl font-extrabold text-slate-900">Miễn phí</span>
                                <span className="text-slate-500 font-medium"> / mãi mãi</span>
                            </div>

                            <ul className="space-y-4 mb-8">
                                {[
                                    "Tối đa 4 loại vàng",
                                    "1 giao diện mặc định",
                                    "Cập nhật giá thủ công",
                                    <span className="text-slate-400 line-through">Không đồng bộ Tivi</span>,
                                    <span className="text-slate-400 line-through">Không có biểu đồ quốc tế</span>
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3">
                                        <CheckCircle2 className={`w-5 h-5 ${typeof item === 'string' ? 'text-[#007ACC]' : 'text-slate-300'}`} />
                                        <span className={typeof item === 'string' ? 'text-slate-700 font-medium' : ''}>{item}</span>
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={() => setIsLoginOpen(true)}
                                className="w-full py-3 px-6 rounded-xl border-2 border-[#007ACC] text-[#007ACC] font-bold hover:bg-blue-50 transition-colors"
                            >
                                Bắt đầu Miễn phí
                            </button>
                        </div>

                        {/* Pro Plan */}
                        <div className="relative">
                            <div className="absolute -inset-1 bg-gradient-to-r from-[#FFC107] to-[#007ACC] rounded-[2rem] blur-md opacity-50 animate-pulse"></div>
                            <div className="bg-white rounded-3xl p-8 border-2 border-[#FFC107] relative shadow-2xl transform lg:scale-105 z-10">
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                    <span className="bg-gradient-to-r from-[#FFC107] to-amber-500 text-white text-sm font-bold uppercase tracking-wider py-1 px-4 rounded-full shadow-md">
                                        Best Seller
                                    </span>
                                </div>

                                <h3 className="text-2xl font-bold text-slate-900 mb-2">Gói Chuyên Nghiệp</h3>
                                <p className="text-slate-500 mb-6">Đầy đủ tính năng cho tiệm vàng hiện đại</p>

                                <div className="mb-8">
                                    <div className="flex items-end gap-2 mb-1">
                                        <span className="text-4xl font-extrabold text-slate-900">490k</span>
                                        <span className="text-slate-500 font-medium pb-1">/ tháng</span>
                                    </div>
                                    <p className="text-sm text-[#28A745] font-semibold bg-green-50 inline-block px-2 py-1 rounded">
                                        Thanh toán 5.880.000đ/năm (Tiết kiệm 2.520.000đ)
                                    </p>
                                </div>

                                <div className="bg-blue-50 rounded-xl p-4 mb-8 border border-blue-100">
                                    <p className="text-sm text-slate-600 font-medium mb-2">Các lựa chọn khác:</p>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-700">Gói Ngày:</span>
                                        <span className="font-bold text-slate-900">50.000đ/ngày</span>
                                    </div>
                                    <div className="flex justify-between text-sm mt-1">
                                        <span className="text-slate-700">Gói Tháng:</span>
                                        <span className="font-bold text-slate-900">700.000đ/tháng</span>
                                    </div>
                                </div>

                                <ul className="space-y-4 mb-8">
                                    {[
                                        "Mở khóa kết nối Tivi không giới hạn",
                                        "Chữ chạy thông báo (Marquee)",
                                        "Toàn bộ kho giao diện cao cấp",
                                        "Xem biểu đồ quốc tế (Kitco/TradingView)",
                                        "Tải lịch sử giá & Quét giá thị trường"
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <CheckCircle2 className="w-5 h-5 text-[#FFC107] shrink-0 mt-0.5" />
                                            <span className="text-slate-800 font-medium">{item}</span>
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    onClick={() => setIsLoginOpen(true)}
                                    className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-[#007ACC] to-blue-600 text-white font-bold hover:shadow-lg hover:shadow-blue-500/40 transition-all hover:-translate-y-0.5 text-lg"
                                >
                                    Đăng ký & Nhận 3 ngày Pro
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Add-on */}
                    <div className="max-w-3xl mx-auto mt-12 bg-slate-900 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 shrink-0">
                                <ShieldCheck className="w-6 h-6 text-[#FFC107]" />
                            </div>
                            <div>
                                <h4 className="text-white font-bold text-lg">VIP Thiết kế riêng (Add-on)</h4>
                                <p className="text-slate-400 text-sm">Giao diện độc quyền, logo riêng, background phong thủy.</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-white font-bold text-xl">1.000.000đ</div>
                            <div className="text-slate-400 text-xs">Thanh toán 1 lần</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Payment Process */}
            <section className="py-24 bg-slate-50 border-y border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">Thanh toán siêu tốc, Kích hoạt tức thời</h2>
                        <p className="text-lg text-slate-600">Quy trình đăng ký và thanh toán được tự động hóa, giúp bạn bắt đầu sử dụng chỉ trong vài phút.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 relative">
                        <div className="hidden md:block absolute top-1/2 left-[15%] right-[15%] h-0.5 bg-slate-200 -translate-y-1/2 z-0"></div>

                        {[
                            {
                                step: "01",
                                title: "Quét mã VietQR",
                                desc: "Thanh toán nhanh chóng qua mã QR tự động với số tiền chính xác."
                            },
                            {
                                step: "02",
                                title: "Tải ảnh Bill",
                                desc: "Chụp màn hình giao dịch và tải lên hệ thống để xác nhận."
                            },
                            {
                                step: "03",
                                title: "Duyệt tự động",
                                desc: "Admin duyệt kích hoạt gói tức thời qua Telegram Bot."
                            }
                        ].map((item, i) => (
                            <div key={i} className="relative z-10 flex flex-col items-center text-center bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                                <div className="w-12 h-12 rounded-full bg-[#007ACC] text-white font-bold flex items-center justify-center text-lg mb-6 shadow-md ring-4 ring-blue-50">
                                    {item.step}
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">{item.title}</h3>
                                <p className="text-slate-600">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA & Footer */}
            <footer className="bg-slate-900 pt-24 pb-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-20">
                        <h2 className="text-3xl md:text-5xl font-bold text-white mb-8 leading-tight">
                            Sẵn sàng đưa tiệm vàng của bạn lên một tầm cao mới?
                        </h2>
                        <button
                            onClick={() => setIsLoginOpen(true)}
                            className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-slate-900 transition-all bg-[#FFC107] rounded-full hover:bg-amber-400 hover:shadow-xl hover:shadow-amber-500/20 hover:-translate-y-1"
                        >
                            Tạo tài khoản & Nhận 3 ngày Pro
                            <Zap className="w-5 h-5 ml-2" />
                        </button>
                    </div>

                    <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-gradient-to-br from-[#FFC107] to-amber-600 flex items-center justify-center">
                                <Tv className="w-3 h-3 text-white" />
                            </div>
                            <span className="font-bold text-lg text-white">SmartGold</span>
                        </div>

                        <div className="flex gap-6 text-slate-400 text-sm">
                            <span>Hotline: 1900 xxxx</span>
                            <span>Zalo Hỗ trợ: 09xx xxx xxx</span>
                        </div>

                        <div className="text-slate-500 text-sm">
                            Hệ thống Bluetechai &copy; 2026. All rights reserved.
                        </div>
                    </div>
                </div>
            </footer>
            <AnimatePresence>
                {isLoginOpen && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative"
                        >
                            <button onClick={() => setIsLoginOpen(false)} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200"><X className="w-5 h-5" /></button>

                            <div className="p-8 md:p-10">
                                <div className="text-center mb-8">
                                    <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                                        <Tv className="w-7 h-7 text-white" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-slate-900">Bảng Điều Khiển</h2>
                                    <p className="text-slate-500 text-sm mt-1">Đăng nhập để quản lý tiệm của bạn</p>
                                </div>

                                <form onSubmit={handleLogin} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase ml-1 mb-1.5">Tên tài khoản / SĐT</label>
                                        <input
                                            type="text"
                                            value={loginInput}
                                            onChange={(e) => setLoginInput(e.target.value)}
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3.5 font-bold outline-none focus:border-[#007ACC] transition-all"
                                            placeholder="VD: tiemvangbaotin"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase ml-1 mb-1.5">Mật khẩu</label>
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3.5 outline-none focus:border-[#007ACC] transition-all"
                                            placeholder="••••••••"
                                            required
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full bg-[#007ACC] text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50"
                                    >
                                        {isLoading ? 'Đang kiểm tra...' : 'VÀO HỆ THỐNG 🚀'}
                                    </button>
                                </form>

                                <div className="relative flex items-center justify-center my-6">
                                    <div className="border-t border-slate-100 w-full absolute"></div>
                                    <span className="bg-white px-4 text-[10px] text-slate-400 font-black uppercase tracking-widest relative">Hoặc</span>
                                </div>

                                <button
                                    onClick={handleGoogleLogin}
                                    className="w-full border-2 border-slate-100 py-3.5 rounded-xl font-bold text-slate-600 flex items-center justify-center gap-3 hover:bg-slate-50 transition-all"
                                >
                                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" />
                                    Đăng nhập Google
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}} />
        </div>
    );
}