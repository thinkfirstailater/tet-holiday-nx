import React, { useEffect, useState } from 'react';
import { MoneyWheelPhaser, WheelConfigItem } from './MoneyWheelPhaser';

export const MoneyWheelGame: React.FC = () => {
    const [config, setConfig] = useState<WheelConfigItem[]>([
        { value: 10, percent: 30 },
        { value: 20, percent: 30 },
        { value: 50, percent: 20 },
        { value: 100, percent: 10 },
        { value: 200, percent: 5 },
        { value: 500, percent: 5 },
    ]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [result, setResult] = useState<number | null>(null);

    const availableDenominations = [10, 20, 50, 100, 200, 500];

    const handleAddRow = () => {
        setConfig([...config, { value: 10, percent: 0 }]);
    };

    const handleRemoveRow = (index: number) => {
        const newConfig = [...config];
        newConfig.splice(index, 1);
        setConfig(newConfig);
    };

    const handleChange = (index: number, field: keyof WheelConfigItem, val: string | number) => {
        const newConfig = [...config];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (newConfig[index] as any)[field] = Number(val);
        setConfig(newConfig);
    };

    const totalPercent = config.reduce((sum, item) => sum + item.percent, 0);
    const isValid = totalPercent === 100;

    const handleStart = () => {
        if (!isValid) {
            alert('Tổng tỉ lệ phải bằng 100%');
            return;
        }
        setIsPlaying(true);
        setResult(null);
    };

    const handleGameResult = (value: number) => {
        setResult(value);
    };

    const handlePlayAgain = () => {
        setResult(null);
        // We don't need to restart the Phaser scene, just hide the overlay.
        // However, the wheel is now in a rotated state. 
        // The Phaser component should handle resetting or continuing from current rotation.
        // Our current Phaser implementation spins *from* current rotation, so it's fine.
    };

    const handleEditConfig = () => {
        setResult(null);
        setIsPlaying(false);
    };

    useEffect(() => {
        if (result !== null) {
            // Trigger fireworks when result is shown
            const canvas = document.getElementById('fireworks-canvas') as HTMLCanvasElement;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    const particles: any[] = [];
                    const createParticle = (x: number, y: number) => {
                        const count = 30;
                        for (let i = 0; i < count; i++) {
                            const angle = Math.random() * Math.PI * 2;
                            const speed = Math.random() * 5 + 2;
                            particles.push({
                                x, y,
                                vx: Math.cos(angle) * speed,
                                vy: Math.sin(angle) * speed,
                                life: 1,
                                color: `hsl(${Math.random() * 360}, 100%, 50%)`
                            });
                        }
                    };

                    // Initial explosion
                    createParticle(window.innerWidth / 2, window.innerHeight / 2);

                    // Random explosions
                    const interval = setInterval(() => {
                        createParticle(
                            window.innerWidth * 0.2 + Math.random() * window.innerWidth * 0.6,
                            window.innerHeight * 0.2 + Math.random() * window.innerHeight * 0.5
                        );
                    }, 500);

                    const animate = () => {
                        if (!ctx) return;
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        
                        for (let i = particles.length - 1; i >= 0; i--) {
                            const p = particles[i];
                            p.x += p.vx;
                            p.y += p.vy;
                            p.vy += 0.1; // gravity
                            p.life -= 0.02;
                            p.vx *= 0.95; // friction
                            p.vy *= 0.95;

                            if (p.life <= 0) {
                                particles.splice(i, 1);
                            } else {
                                ctx.globalAlpha = p.life;
                                ctx.fillStyle = p.color;
                                ctx.beginPath();
                                ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
                                ctx.fill();
                            }
                        }
                        
                        if (result !== null) {
                            requestAnimationFrame(animate);
                        }
                    };
                    animate();

                    return () => clearInterval(interval);
                }
            }
        }
    }, [result]);

    if (isPlaying) {
        return (
            <div style={{ position: 'relative', width: '100%', height: '100vh', backgroundColor: '#333' }}>
                <MoneyWheelPhaser 
                    config={config} 
                    onResult={handleGameResult} 
                    locked={result !== null} // Lock wheel when result is shown
                />
                
                {/* Result Overlay */}
                {result !== null && (
                    <div style={{
                        position: 'absolute',
                        top: 0, left: 0, width: '100%', height: '100%',
                        backgroundColor: 'rgba(0,0,0,0.85)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 100,
                        color: '#FFD700',
                        textAlign: 'center',
                        animation: 'fadeIn 0.5s ease'
                    }}>
                        <canvas 
                            id="fireworks-canvas" 
                            width={window.innerWidth} 
                            height={window.innerHeight}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                pointerEvents: 'none',
                                zIndex: 1
                            }}
                        />

                        <h2 style={{ 
                            fontSize: 'clamp(24px, 6vw, 48px)', 
                            marginBottom: '40px', 
                            marginTop: '-20px', 
                            textShadow: '0 0 20px #FFD700',
                            zIndex: 2,
                            position: 'relative',
                            whiteSpace: 'nowrap'
                        }}>
                            🎉 TRÚNG THƯỞNG! 🎉
                        </h2>
                        
                        <div style={{ 
                            transform: 'scale(1)',
                            marginBottom: '30px',
                            filter: 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.6))',
                            zIndex: 2,
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center'
                        }}>
                            <img 
                                src={`/assets/vnd/${result}.png`} 
                                alt={`${result}k`} 
                                style={{ maxHeight: '150px', maxWidth: '90%', objectFit: 'contain' }} 
                            />
                            <p style={{ fontSize: 'clamp(20px, 5vw, 30px)', fontWeight: 'bold', marginTop: '15px', color: '#FFF' }}>
                                {result}.000 VNĐ
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: '15px', zIndex: 2, position: 'relative', flexWrap: 'wrap', justifyContent: 'center' }}>
                            <button 
                                onClick={handlePlayAgain}
                                style={{
                                    padding: '12px 30px',
                                    fontSize: '16px',
                                    backgroundColor: '#4CAF50',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '50px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    boxShadow: '0 5px 15px rgba(76, 175, 80, 0.4)',
                                    transition: 'transform 0.2s',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                QUAY TIẾP 🔄
                            </button>

                            <button 
                                onClick={handleEditConfig}
                                style={{
                                    padding: '12px 30px',
                                    fontSize: '16px',
                                    backgroundColor: '#FF9800',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '50px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    boxShadow: '0 5px 15px rgba(255, 152, 0, 0.4)',
                                    transition: 'transform 0.2s',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                CẤU HÌNH ⚙️
                            </button>
                        </div>
                    </div>
                )}

                {/* Back Button (Always visible when playing) */}
                <button 
                    onClick={handleEditConfig}
                    style={{
                        position: 'absolute',
                        top: '20px',
                        left: '20px',
                        padding: '10px 20px',
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        color: 'white',
                        border: '1px solid white',
                        borderRadius: '20px',
                        cursor: 'pointer',
                        zIndex: 50
                    }}
                >
                    ⬅ Quay lại
                </button>
            </div>
        );
    }

    return (
        <div style={{ 
            padding: '20px', 
            maxWidth: '600px', 
            margin: '0 auto', 
            fontFamily: 'Arial, sans-serif',
            color: '#333',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#fffbe6' // Light yellow background
        }}>
            <h1 style={{ textAlign: 'center', color: '#d32f2f', fontSize: '28px', marginBottom: '25px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                💰 Vòng Quay Tài Lộc 💰
            </h1>
            
            <div style={{ 
                flex: 1, 
                backgroundColor: 'white', 
                borderRadius: '15px', 
                padding: '20px',
                boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                marginBottom: '20px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontWeight: 'bold', color: '#555', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
                    <span style={{ flex: 1 }}>Mệnh giá (VNĐ)</span>
                    <span style={{ width: '80px', textAlign: 'center' }}>Tỉ lệ (%)</span>
                    <span style={{ width: '40px' }}></span>
                </div>

                <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                    {config.map((item, index) => (
                        <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '15px', alignItems: 'center' }}>
                            <select
                                value={item.value}
                                onChange={(e) => handleChange(index, 'value', e.target.value)}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: '1px solid #ddd',
                                    fontSize: '16px',
                                    backgroundColor: '#f9f9f9'
                                }}
                            >
                                {availableDenominations.map(val => (
                                    <option key={val} value={val}>{val}.000</option>
                                ))}
                            </select>

                            <input 
                                type="number" 
                                value={item.percent} 
                                onChange={(e) => handleChange(index, 'percent', e.target.value)}
                                placeholder="%"
                                style={{ 
                                    width: '80px', 
                                    padding: '12px', 
                                    borderRadius: '8px', 
                                    border: '1px solid #ddd', 
                                    textAlign: 'center',
                                    fontSize: '16px'
                                }}
                            />
                            
                            <button 
                                onClick={() => handleRemoveRow(index)}
                                style={{ 
                                    width: '40px', 
                                    height: '40px', 
                                    background: '#ff5252', 
                                    border: 'none', 
                                    borderRadius: '50%', 
                                    cursor: 'pointer', 
                                    color: 'white', 
                                    fontWeight: 'bold',
                                    fontSize: '18px',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    boxShadow: '0 2px 5px rgba(255, 82, 82, 0.4)'
                                }}
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>

                <button 
                    onClick={handleAddRow}
                    style={{ 
                        width: '100%', 
                        padding: '12px', 
                        backgroundColor: '#fff', 
                        border: '2px dashed #4CAF50', 
                        borderRadius: '8px',
                        cursor: 'pointer',
                        marginTop: '10px',
                        color: '#4CAF50',
                        fontWeight: 'bold',
                        fontSize: '16px',
                        transition: 'background 0.2s'
                    }}
                >
                    + Thêm ô
                </button>
            </div>

            <div style={{ position: 'sticky', bottom: 0, paddingBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontSize: '18px', fontWeight: 'bold' }}>
                    <span>Tổng tỉ lệ:</span>
                    <span style={{ color: isValid ? 'green' : 'red' }}>{totalPercent}%</span>
                </div>

                <button 
                    onClick={handleStart}
                    disabled={!isValid}
                    style={{
                        width: '100%',
                        padding: '18px',
                        backgroundColor: isValid ? '#d32f2f' : '#ccc',
                        color: 'white',
                        border: 'none',
                        borderRadius: '30px',
                        fontSize: '22px',
                        fontWeight: 'bold',
                        cursor: isValid ? 'pointer' : 'not-allowed',
                        boxShadow: isValid ? '0 5px 20px rgba(211, 47, 47, 0.4)' : 'none',
                        transition: 'all 0.3s ease'
                    }}
                >
                    BẮT ĐẦU QUAY 🎰
                </button>
            </div>
        </div>
    );
};
