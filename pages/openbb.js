import { useState, useEffect, useRef } from 'react';

export default function OpenBBChat({ userId, plan }) {
    const [messages, setMessages] = useState([
        { role: 'bot', text: 'Chào chủ tiệm! Tôi là AI phân tích thị trường, tôi có thể giúp gì cho bạn về thị trường Market? **Lưu ý, thông tin chỉ mang tính chất tham khảo.' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef(null);

    // Cuộn xuống tin nhắn mới nhất
    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    // TRONG FILE openbb.js
    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setLoading(true);

        try {
            // 1. URL bây giờ có thể để trơn, không cần ?userId=... nữa (cho sạch)
            const response = await fetch(`https://macmini.tail5d608a.ts.net/webhook/14254dbf-f546-4e53-ac08-8a5b18ed8280/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // 2. Đưa tất cả vào Body
                body: JSON.stringify({
                    chatInput: userMsg,
                    userId: userId, // ID từ Firebase
                    plan: plan      // Gói Pro/Free
                }),
            });

            const data = await response.json();
            const botText = Array.isArray(data) ? data[0]?.output : data?.output;
            setMessages(prev => [...prev, { role: 'bot', text: botText || "AI chưa trả lời..." }]);
        } catch (err) {
            setMessages(prev => [...prev, { role: 'bot', text: "Lỗi kết nối!" }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ background: '#fff', borderRadius: '12px', border: '2px solid #007acc', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '400px', marginBottom: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
            <div style={{ background: '#007acc', color: '#fff', padding: '12px 15px', fontWeight: 'bold', fontSize: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>🤖 TRỢ LÝ PHÂN TÍCH THỊ TRƯỜNG BẰNG TRÍ TUỆ NHÂN TẠO</span>
                <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '4px' }}>
                    {plan === 'pro' ? 'PREMIUM' : 'FREE'}
                </span>
            </div>

            <div ref={scrollRef} style={{ flex: 1, padding: '15px', overflowY: 'auto', background: '#fcfcfc', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {messages.map((m, i) => (
                    <div key={i} style={{
                        alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        fontSize: '14px',
                        lineHeight: '1.5',
                        background: m.role === 'user' ? '#007acc' : '#fff',
                        color: m.role === 'user' ? '#fff' : '#333',
                        border: m.role === 'user' ? 'none' : '1px solid #eee',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
                    }}>
                        {m.text}
                    </div>
                ))}
                {loading && <div style={{ fontSize: '12px', color: '#888', paddingLeft: '5px' }}>AI đang xử lý...</div>}
            </div>

            <div style={{ padding: '10px', background: '#fff', borderTop: '1px solid #eee', display: 'flex', gap: '10px' }}>
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Nhập nội dung cần tư vấn..."
                    style={{ flex: 1, padding: '12px', border: '1px solid #ddd', borderRadius: '8px', outline: 'none', fontSize: '14px' }}
                />
                <button onClick={handleSend} style={{ background: '#007acc', color: '#fff', border: 'none', padding: '0 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Gửi</button>
            </div>
        </div>
    );
}