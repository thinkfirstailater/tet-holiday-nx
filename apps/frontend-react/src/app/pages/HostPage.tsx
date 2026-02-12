import React, { useEffect, useState } from 'react';
import { SocketService } from '../services/socket.service';
import { OnlineGamePhaser } from '../components/online/OnlineGamePhaser';

export const HostPage: React.FC = () => {
    const [room, setRoom] = useState<any>(null);
    const [socket, setSocket] = useState<any>(null);

    useEffect(() => {
        const s = SocketService.getInstance().connect();
        setSocket(s);

        const onConnect = () => {
            console.log('Connected, creating room...');
            s.emit('create-room', { username: 'Host' });
        };

        const onRoomCreated = (newRoom: any) => {
            console.log('Room created:', newRoom);
            setRoom(newRoom);
        };

        const onRoomState = (updatedRoom: any) => {
             console.log('Room update:', updatedRoom);
             setRoom(updatedRoom);
        };
        
        const onGameStarted = (startedRoom: any) => {
            setRoom(startedRoom);
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
            console.error('Socket error:', err);
            alert(`Error: ${err.message || 'Unknown error'}`);
        };

        s.on('connect', onConnect);
        s.on('room-created', onRoomCreated);
        s.on('room-state', onRoomState);
        s.on('game-started', onGameStarted);
        s.on('race-update', onRaceUpdate);
        s.on('game-over', onGameOver);
        s.on('error', onError);
        
        // If already connected
        if (s.connected) {
            onConnect();
        }

        return () => {
            s.off('connect', onConnect);
            s.off('room-created', onRoomCreated);
            s.off('room-state', onRoomState);
            s.off('game-started', onGameStarted);
            s.off('race-update', onRaceUpdate);
            s.off('game-over', onGameOver);
            s.off('error', onError);
            SocketService.getInstance().disconnect();
        };
    }, []);

    const startGame = () => {
        if (socket && room) {
            socket.emit('start-game', { roomId: room.roomId });
        }
    };

    const sendBoost = () => {
        if (socket && room) {
            socket.emit('boost', { roomId: room.roomId });
        }
    };

    // Keyboard listener for Space
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' && room?.state === 'RACING') {
                e.preventDefault(); // Prevent scrolling
                sendBoost();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [room, socket]);

    if (!room) return <div style={{ color: 'white', padding: '20px' }}>Creating room...</div>;

    return (
        <div style={{ width: '100%', height: '100vh', position: 'relative', overflow: 'hidden' }}>
             <OnlineGamePhaser 
                socket={socket} 
                roomId={room.roomId} 
                isHost={true} 
                players={room.state === 'RACING' || room.state === 'FINISHED' ? Object.values(room.raceState || {}) : Object.values(room.players)}
                isRacing={room.state === 'RACING'}
                luckyMoneys={room.luckyMoneys ? (Array.isArray(room.luckyMoneys) ? room.luckyMoneys : Object.values(room.luckyMoneys)) : []}
                onStartGame={startGame}
             />
             
             {/* UI Overlay - Removed (Integrated into HUD) */}
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
                                            <span style={{ fontSize: '20px', fontWeight: 'bold' }}>{p.username}</span>
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


             {/* Host TAP Button (Moved to Phaser HUD) */}
        </div>
    );
};
