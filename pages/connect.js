import { useState, useEffect } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, remove } from 'firebase/database';

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

export default function TVConnect() {
    const [pairingCode, setPairingCode] = useState('');
    const [status, setStatus] = useState('Đang khởi tạo...');

    useEffect(() => {
        const savedUid = localStorage.getItem('paired_uid');
        if (savedUid && savedUid !== 'undefined') { // Kiểm tra kỹ tránh lưu giá trị lỗi
            window.location.href = `/${savedUid}`;
            return;
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        setPairingCode(code);

        const codeRef = ref(db, `pairing_codes/${code}`);
        set(codeRef, { status: 'waiting', createdAt: Date.now() });

        const unsub = onValue(codeRef, (snapshot) => {
            const data = snapshot.val();

            // FIX LỖI: Kiểm tra đúng tên biến 'admin_uid' mà Admin gửi lên
            if (data && data.admin_uid) {
                console.log("Kết nối thành công với UID:", data.admin_uid);

                localStorage.setItem('paired_uid', data.admin_uid);
                setStatus('Kết nối thành công! Đang chuyển hướng...');

                // Đợi 1.5s để người dùng kịp thấy thông báo rồi mới chuyển trang
                setTimeout(() => {
                    // Xóa mã tạm xong mới redirect
                    remove(codeRef).then(() => {
                        window.location.href = `/${data.admin_uid}`;
                    });
                }, 1500);
            }
        });

        return () => {
            unsub();
            // Chỉ xóa mã nếu tivi chưa được kết nối (tránh xóa nhầm lúc đang chuyển hướng)
            if (!localStorage.getItem('paired_uid')) {
                remove(codeRef);
            }
        };
    }, []);

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#1a1a1a', color: '#fff', fontFamily: 'sans-serif' }}>
            <h1 style={{ fontSize: '3rem', marginBottom: '10px' }}>KẾT NỐI BẢNG GIÁ</h1>
            <p style={{ fontSize: '1.2rem', color: '#888' }}>Mở trang Quản lý trên điện thoại và nhập mã:</p>

            <div style={{ fontSize: '6rem', fontWeight: 'bold', letterSpacing: '15px', color: '#007acc', background: '#333', padding: '20px 40px', borderRadius: '20px', margin: '30px 0', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                {pairingCode || '------'}
            </div>

            <div style={{ fontSize: '1rem', fontStyle: 'italic', color: '#555' }}>{status}</div>

            <div style={{ marginTop: '50px', fontSize: '0.9rem', color: '#444' }}>
                Bluetechai Smart Connect © 2026
            </div>
        </div>
    );
}