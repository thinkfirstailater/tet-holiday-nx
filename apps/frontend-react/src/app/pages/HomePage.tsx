import React from 'react';

export const HomePage: React.FC = () => {
    return (
        <div style={{ 
            textAlign: 'center', 
            padding: '50px', 
            fontFamily: 'Arial, sans-serif',
            color: '#0a0101ff',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '80vh'
        }}>
            <h2>Chào mừng đến với Tet Holiday App! <br/> Vui lòng chọn menu bên trái để tiếp tục.</h2>
        </div>
    );
};
