import React, { useEffect, useState } from 'react';
import { SocketService } from '../services/socket.service';
import { OnlineGamePhaser } from '../components/online/OnlineGamePhaser';

export const JoinPage: React.FC = () => {
    const [step, setStep] = useState<'LOGIN' | 'LOBBY' | 'GAME'>('LOGIN');
    const [username, setUsername] = useState('');
    const [roomId, setRoomId] = useState('');
    const [room, setRoom] = useState<any>(null);
    const [socket, setSocket] = useState<any>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const s = SocketService.getInstance().connect();
        setSocket(s);

        const onJoinedRoom = (r: any) => {
            console.log('Joined room:', r);
            setRoom(r);
            setStep('LOBBY');
        };

        const onRoomState = (r: any) => {
            console.log('Room state:', r);
            setRoom(r);
            if (r.state === 'RACING') {
                setStep('GAME');
            }
        };
        
        const onGameStarted = (r: any) => {
            setRoom(r);
            setStep('GAME');
        };

        const onRaceUpdate = (data: any) => {
            if (!data) return;
            setRoom((prev: any) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    raceState: data.raceState,
                    luckyMoneys: data.luckyMoneys
                };
            });
        };
        
        const onGameOver = (finishedRoom: any) => {
             console.log('Game Over:', finishedRoom);
             setRoom(finishedRoom);
        };

        const onError = (err: any) => {
            setError(err.message || 'Unknown error');
        };

        s.on('joined-room', onJoinedRoom);
        s.on('room-state', onRoomState);
        s.on('game-started', onGameStarted);
        s.on('race-update', onRaceUpdate);
        s.on('game-over', onGameOver);
        s.on('exception', onError); // NestJS gateway usually emits 'exception' on error

        return () => {
            s.off('joined-room', onJoinedRoom);
            s.off('room-state', onRoomState);
            s.off('game-started', onGameStarted);
            s.off('race-update', onRaceUpdate);
            s.off('game-over', onGameOver);
            s.off('exception', onError);
            SocketService.getInstance().disconnect();
        };
    }, []);

    const joinRoom = () => {
        if (!username || !roomId) {
            setError('Please enter both name and room ID');
            return;
        }
        if (socket) {
            socket.emit('join-room', { username, roomId });
        }
    };

    const sendBoost = () => {
        if (socket && room) {
            socket.emit('boost', { roomId: room.roomId });
        }
    };

    if (step === 'LOGIN') {
        return (
            <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'Arial' }}>
                <h1>Join Race</h1>
                {error && <p style={{ color: 'red' }}>{error}</p>}
                <div style={{ margin: '20px 0' }}>
                    <input 
                        placeholder="Tên của bạn" 
                        value={username} 
                        onChange={e => setUsername(e.target.value)}
                        style={{ padding: '15px', fontSize: '18px', width: '80%', borderRadius: '8px', border: '1px solid #ccc' }}
                    />
                </div>
                <div style={{ margin: '20px 0' }}>
                    <input 
                        placeholder="Mã Phòng (VD: ABCD)" 
                        value={roomId} 
                        onChange={e => setRoomId(e.target.value.toUpperCase())}
                        style={{ padding: '15px', fontSize: '18px', width: '80%', borderRadius: '8px', border: '1px solid #ccc' }}
                    />
                </div>
                <button 
                    onClick={joinRoom} 
                    style={{ padding: '15px 40px', fontSize: '20px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                >
                    Vào Phòng
                </button>
            </div>
        );
    }

    if (!room) return <div>Loading...</div>;

    return (
        <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Top: Game View */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                 <OnlineGamePhaser 
                    socket={socket} 
                    roomId={room.roomId} 
                    isHost={false} 
                    myPlayerId={socket?.id}
                    players={room.state === 'RACING' || room.state === 'FINISHED' ? Object.values(room.raceState || {}) : Object.values(room.players)}
                isRacing={room.state === 'RACING'}
                luckyMoneys={room.luckyMoneys ? (Array.isArray(room.luckyMoneys) ? room.luckyMoneys : Object.values(room.luckyMoneys)) : []}
                 />
            </div>
            
            {/* Info Overlay - Removed (Integrated into HUD) */}


            {room.state === 'FINISHED' && (
                <div style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    padding: '30px',
                    borderRadius: '15px',
                    border: '2px solid #FFD700',
                    color: 'white',
                    zIndex: 200,
                    minWidth: '400px',
                    textAlign: 'center',
                    boxShadow: '0 0 30px rgba(255, 215, 0, 0.5)'
                }}>
                    <h2 style={{ color: '#FFD700', marginBottom: '20px', fontSize: '32px' }}>🏆 KẾT QUẢ CHUNG CUỘC 🏆</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {Object.values(room.raceState || {})
                            .sort((a: any, b: any) => (a.rank || 99) - (b.rank || 99))
                            .map((p: any) => (
                                <div key={p.id} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '15px',
                                    backgroundColor: p.rank === 1 ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                                    borderRadius: '10px',
                                    border: p.rank === 1 ? '1px solid #FFD700' : 'none'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ 
                                            fontSize: '24px', 
                                            fontWeight: 'bold',
                                            color: p.rank === 1 ? '#FFD700' : p.rank === 2 ? '#C0C0C0' : p.rank === 3 ? '#CD7F32' : 'white',
                                            width: '40px'
                                        }}>
                                            #{p.rank}
                                        </span>
                                        <span style={{ fontSize: '20px', fontWeight: 'bold' }}>{p.username} {p.id === socket?.id ? '(Bạn)' : ''}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '20px', color: '#FFD700' }}>
                                            🧧 {p.money ? p.money.toLocaleString() : 0}k
                                        </span>
                                        {p.rank === 1 && p.money > 0 && (
                                            <span style={{ 
                                                color: '#FFD700', 
                                                fontWeight: 'bold', 
                                                fontSize: '14px',
                                                animation: 'pulse 1s infinite' 
                                            }}>
                                                (x2)
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                    </div>
                    <button 
                        onClick={() => window.location.reload()} 
                        style={{
                            marginTop: '30px',
                            padding: '12px 30px',
                            fontSize: '18px',
                            backgroundColor: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        CHƠI LẠI
                    </button>
                </div>
            )}
        </div>
    );
};
