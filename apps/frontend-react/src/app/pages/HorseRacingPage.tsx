import React from 'react';
import { Link } from 'react-router-dom';

export const HorseRacingPage: React.FC = () => {
    return (
        <div style={{ textAlign: 'center', padding: '50px', fontFamily: 'Arial, sans-serif' }}>
            <h1>Đua ngựa lụm lì xì</h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', marginTop: '40px' }}>
                <Link to="/dua-ngua/offline">
                    <button style={{ padding: '20px 40px', fontSize: '20px', cursor: 'pointer', borderRadius: '10px' }}>
                        🐎 Chơi Offline
                    </button>
                </Link>
                <Link to="/dua-ngua/host">
                    <button style={{ padding: '20px 40px', fontSize: '20px', cursor: 'pointer', borderRadius: '10px', backgroundColor: '#4CAF50', color: 'white' }}>
                        📺 Tạo Phòng (Online)
                    </button>
                </Link>
                <Link to="/dua-ngua/join">
                    <button style={{ padding: '20px 40px', fontSize: '20px', cursor: 'pointer', borderRadius: '10px', backgroundColor: '#2196F3', color: 'white' }}>
                        📱 Tham Gia (Online)
                    </button>
                </Link>
            </div>
        </div>
    );
};
