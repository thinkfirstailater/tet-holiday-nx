import React, { useState } from 'react';
import { ShootGamePhaser, GameConfigItem } from './ShootGamePhaser';

export const ShootGame: React.FC = () => {
    const [config, setConfig] = useState<GameConfigItem[]>([
        { value: '1.000 VNĐ', percent: 10 },
        { value: '2.000 VNĐ', percent: 15 },
        { value: '5.000 VNĐ', percent: 20 },
        { value: '10.000 VNĐ', percent: 20 },
        { value: '20.000 VNĐ', percent: 20 },
        { value: '50.000 VNĐ', percent: 10 },
        { value: '100.000 VNĐ', percent: 5 },
    ]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [result, setResult] = useState<{ totalScore: number; bestReward: string } | null>(null);

    const handleAddRow = () => {
        setConfig([...config, { value: '', percent: 0 }]);
    };

    const handleRemoveRow = (index: number) => {
        const newConfig = [...config];
        newConfig.splice(index, 1);
        setConfig(newConfig);
    };

    const handleChange = (index: number, field: keyof GameConfigItem, val: string | number) => {
        const newConfig = [...config];
        if (field === 'percent') {
            newConfig[index] = { ...newConfig[index], percent: Number(val) };
        } else {
            newConfig[index] = { ...newConfig[index], value: String(val) };
        }
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

    const handleGameOver = (totalScore: number, bestReward: string) => {
        setResult({ totalScore, bestReward });
    };

    const handlePlayAgain = () => {
        setResult(null);
        // We need to unmount and remount ShootGamePhaser to reset it completely, 
        // or ShootGamePhaser needs to handle reset. 
        // Since we conditional render ShootGamePhaser when isPlaying is true,
        // toggling isPlaying off and on would work, but here we are ALREADY isPlaying=true.
        // We should set isPlaying false then true? Or rely on key?
        // Let's use a key for ShootGamePhaser to force remount.
        setIsPlaying(false);
        setTimeout(() => setIsPlaying(true), 0);
    };

    const handleEditConfig = () => {
        setResult(null);
        setIsPlaying(false);
    };

    if (isPlaying) {
        return (
            <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
                <ShootGamePhaser config={config} onGameOver={handleGameOver} />
                
                {result && (
                    <div style={{
                        position: 'absolute',
                        top: 0, left: 0, width: '100%', height: '100%',
                        backgroundColor: 'rgba(0,0,0,0.9)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 100,
                        color: '#FFD700',
                        textAlign: 'center',
                        padding: '20px'
                    }}>
                        <h2 style={{ fontSize: '28px', marginBottom: '15px' }}>🧧 KẾT QUẢ 🧧</h2>
                        
                        <div style={{ 
                            fontSize: '20px', 
                            color: 'white', 
                            marginBottom: '25px',
                            padding: '15px',
                            border: '2px solid #FFD700',
                            borderRadius: '15px',
                            backgroundColor: 'rgba(255,0,0,0.3)',
                            width: '100%',
                            maxWidth: '400px'
                        }}>
                            <p style={{ margin: '10px 0', fontSize: '18px' }}>Tổng điểm chém:</p>
                            <p style={{ margin: '5px 0 20px 0', fontSize: '32px', fontWeight: 'bold', color: '#ffff00' }}>
                                {result.totalScore.toLocaleString()}
                            </p>
                            
                            <p style={{ margin: '10px 0', fontSize: '18px' }}>Phần thưởng lớn nhất:</p>
                            <p style={{ margin: '5px 0', fontSize: '28px', fontWeight: 'bold', color: '#E91E63' }}>
                                {result.bestReward}
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'center' }}>
                            <button 
                                onClick={handlePlayAgain}
                                style={{
                                    padding: '12px 30px',
                                    fontSize: '18px',
                                    backgroundColor: '#4CAF50',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '50px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    boxShadow: '0 4px 15px rgba(76, 175, 80, 0.4)'
                                }}
                            >
                                CHƠI TIẾP ⚔️
                            </button>

                            <button 
                                onClick={handleEditConfig}
                                style={{
                                    padding: '12px 30px',
                                    fontSize: '18px',
                                    backgroundColor: '#FF9800',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '50px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    boxShadow: '0 4px 15px rgba(255, 152, 0, 0.4)'
                                }}
                            >
                                CẤU HÌNH ⚙️
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div style={{ 
            padding: '15px', 
            maxWidth: '100%', 
            margin: '0 auto', 
            fontFamily: 'Arial',
            color: '#333',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#fff5f8'
        }}>
            <h1 style={{ textAlign: 'center', color: '#E91E63', fontSize: '24px', marginBottom: '15px' }}>Cấu Hình Chém Xì 🧧</h1>
            
            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontWeight: 'bold', fontSize: '14px', padding: '0 5px' }}>
                    <span style={{ flex: 1 }}>Mệnh giá / Quà</span>
                    <span style={{ width: '80px', textAlign: 'center' }}>Tỉ lệ (%)</span>
                    <span style={{ width: '35px' }}></span>
                </div>

                {config.map((item, index) => (
                    <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'center' }}>
                        <input 
                            type="text" 
                            value={item.value} 
                            onChange={(e) => handleChange(index, 'value', e.target.value)}
                            placeholder="VD: 10k"
                            style={{ 
                                flex: 1, 
                                padding: '12px', 
                                borderRadius: '8px', 
                                border: '1px solid #ddd',
                                fontSize: '16px',
                                minWidth: 0 
                            }}
                        />
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
                                width: '35px', 
                                height: '35px', 
                                background: '#ff5252', 
                                border: 'none', 
                                borderRadius: '50%', 
                                cursor: 'pointer', 
                                color: 'white', 
                                fontWeight: 'bold',
                                fontSize: '14px',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                flexShrink: 0
                            }}
                        >
                            X
                        </button>
                    </div>
                ))}

                <button 
                    onClick={handleAddRow}
                    style={{ 
                        width: '100%', 
                        padding: '12px', 
                        backgroundColor: '#fff', 
                        border: '2px dashed #E91E63', 
                        borderRadius: '8px',
                        cursor: 'pointer',
                        marginTop: '10px',
                        color: '#E91E63',
                        fontWeight: 'bold',
                        fontSize: '16px'
                    }}
                >
                    + Thêm dòng
                </button>
            </div>

            <div style={{ borderTop: '1px solid #eee', paddingTop: '15px', backgroundColor: 'white', position: 'sticky', bottom: 0, paddingBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontSize: '18px', fontWeight: 'bold' }}>
                    <span>Tổng tỉ lệ:</span>
                    <span style={{ color: isValid ? 'green' : 'red' }}>{totalPercent}%</span>
                </div>

                <button 
                    onClick={handleStart}
                    disabled={!isValid}
                    style={{
                        width: '100%',
                        padding: '15px',
                        backgroundColor: isValid ? '#E91E63' : '#ccc',
                        color: 'white',
                        border: 'none',
                        borderRadius: '30px',
                        fontSize: '20px',
                        fontWeight: 'bold',
                        cursor: isValid ? 'pointer' : 'not-allowed',
                        boxShadow: isValid ? '0 4px 15px rgba(233, 30, 99, 0.4)' : 'none'
                    }}
                >
                    BẮT ĐẦU CHÉM XÌ ⚔️
                </button>
            </div>
        </div>
    );
};
