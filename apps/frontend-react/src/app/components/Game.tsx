import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './Game.module.css';

interface Horse {
    id: number;
    name: string;
    color: string;
    icon: string; // Keep for fallback or remove if unused. Let's keep for now or replace with image.
    image: string;
    position: number; // 0 to TRACK_LENGTH
    speed: number;
    money: number;
    finished: boolean;
    rank: number | null;
}

const TRACK_LENGTH = 15000;
const VIEWPORT_WIDTH = 1200;

// Helper for random lucky money
const getRandomLuckyMoney = () => {
    const rand = Math.random();
    if (rand < 0.30) return 10000; // 30% - 10k
    if (rand < 0.60) return 20000; // 30% - 20k
    if (rand < 0.90) return 50000; // 30% - 50k
    return 100000;                 // 10% - 100k
};

const INITIAL_HORSES: Horse[] = [
    { id: 1, name: 'Xích Thố', color: '#FF5722', icon: '🐎', image: '/assets/horses/1.png', position: 0, speed: 0, money: 0, finished: false, rank: null },
    { id: 2, name: 'Đích Lư', color: '#FFC107', icon: '🦄', image: '/assets/horses/2.png', position: 0, speed: 0, money: 0, finished: false, rank: null },
    { id: 3, name: 'Tuyệt Ảnh', color: '#2196F3', icon: '🦓', image: '/assets/horses/3.png', position: 0, speed: 0, money: 0, finished: false, rank: null },
    { id: 4, name: 'Bạch Long', color: '#EEEEEE', icon: '🐐', image: '/assets/horses/4.png', position: 0, speed: 0, money: 0, finished: false, rank: null },
    { id: 5, name: 'Ô Vân', color: '#212121', icon: '🐈', image: '/assets/horses/5.png', position: 0, speed: 0, money: 0, finished: false, rank: null },
];

export const Game: React.FC = () => {
    // Consolidate state to avoid "tearing" and double renders
    // We use a Ref for high-frequency physics state to decouple it from React render cycles if needed,
    // but to keep it simple and smooth, we will use a single State object for the render.
    const [gameState, setGameState] = useState<{
        horses: Horse[];
        cameraX: number;
        isRacing: boolean;
        isFinished: boolean;
    }>({
        horses: INITIAL_HORSES,
        cameraX: 0,
        isRacing: false,
        isFinished: false
    });

    // Store lucky money locations (simple version: multiple fixed random spots or just one area)
    // For now, let's keep it simple: Random spots generated at start
    const [moneyLocations, setMoneyLocations] = useState<number[]>([]);
    // Use Ref for Physics Logic to avoid Stale Closures in Game Loop
    const moneyLocationsRef = useRef<number[]>([]);
    // Use Ref for Horses Physics State to avoid Strict Mode double-invocation issues with Side Effects (Rank)
    const horsesRef = useRef<Horse[]>(INITIAL_HORSES);

    const requestRef = useRef<number>(0);
    const rankRef = useRef(1);
    const lastTimeRef = useRef<number>(0);
    const isRacingRef = useRef(false);

    // Improved Terrain Logic (More intense like KRACE)
    const getTerrainY = (x: number): number => {
        // x is 0 to TRACK_LENGTH
        // Create more complex hills
        // Base Sin wave + Noise-like variation

        // Convert to "meters" roughly
        const m = x / 100;

        // Big Hills every 20m (2000px)
        const hill = Math.sin(m * 0.1) * 60;

        // Small bumps
        const bump = Math.sin(m * 0.5) * 10;

        // A big ramp at the end
        let ramp = 0;
        if (x > 12000) {
            ramp = -(x - 12000) * 0.05; // Go up towards finish
        }

        return hill + bump + ramp;
    };

    function gameLoop(timestamp: number) {
        if (!isRacingRef.current) return;

        if (!lastTimeRef.current) lastTimeRef.current = timestamp;
        const deltaTime = timestamp - lastTimeRef.current;
        lastTimeRef.current = timestamp;

        // Cap deltaTime to avoid huge jumps (e.g. if tab was inactive)
        const dt = Math.min(deltaTime, 64); // Cap at ~15fps equivalent to prevent huge leaps

        // Speed normalization factor: 60fps = 16.66ms.
        // If dt = 16.66, factor = 1. If dt = 33.33 (30fps), factor = 2.
        const dtFactor = dt / 16.66;

        // Calculate physics OUTSIDE of setGameState to avoid Strict Mode double-invocation side effects
        const currentHorses = horsesRef.current;

        let allFinished = true;
        const nextHorses = currentHorses.map(horse => {
            if (horse.finished) return horse;
            allFinished = false;

            // Move
            // Reduce speed variation and max speed for longer race
            const speedVar = (Math.random() - 0.5) * 0.5; // Less erratic
            let newSpeed = Math.max(3, Math.min(8, horse.speed + speedVar)); // Cap speed at 8px/frame
            // Random boost (less frequent)
            if (Math.random() < 0.005) newSpeed += 2; // Smaller boost

            // Apply delta time
            const moveStep = newSpeed * dtFactor;
            const newPos = horse.position + moveStep;

            // Lucky Money Logic (Check against all locations)
            let money = horse.money;

            // Only check if horse hasn't collected money yet
            if (money === 0) {
                // Check intersection with money spots
                for (const loc of moneyLocationsRef.current) {
                        // Check if we crossed the location
                        // Previous pos < loc <= new pos
                        if (horse.position < loc && newPos >= loc) {
                            money = getRandomLuckyMoney();
                            break; // Collect only one and stop checking
                        }
                }
            }

            // Finish Logic
            let finished = false;
            let rank = null;
            if (newPos >= TRACK_LENGTH) {
                finished = true;
                rank = rankRef.current;
                rankRef.current += 1;
                
                // Bonus x2 for 1st place
                if (rank === 1) {
                    money *= 2;
                }
            }

            return {
                ...horse,
                position: newPos,
                speed: newSpeed,
                money,
                finished,
                rank: rank || horse.rank
            };
        });
        
        // Update Ref
        horsesRef.current = nextHorses;

        // Update Camera
        const nextLeaderPos = Math.max(...nextHorses.map(h => h.position));
        const targetCamX = nextLeaderPos - VIEWPORT_WIDTH * 0.4; 
        const boundedCamX = Math.max(0, Math.min(targetCamX, TRACK_LENGTH - VIEWPORT_WIDTH * 0.5));
        
        let nextIsFinished = false;
        let nextIsRacing = true;

        if (allFinished) {
            nextIsFinished = true;
            nextIsRacing = false;
            isRacingRef.current = false; // Stop the loop ref
        }

        setGameState({
            horses: nextHorses,
            cameraX: boundedCamX,
            isFinished: nextIsFinished,
            isRacing: nextIsRacing
        });

        if (isRacingRef.current) {
            requestRef.current = requestAnimationFrame(gameLoop);
        }
    }

    const startRace = () => {
        if (gameState.isRacing) return;

        // Randomize lucky money locations
        const numMoney = 8;
        const locations = [];
        for (let i = 0; i < numMoney; i++) {
            locations.push(2000 + Math.random() * (TRACK_LENGTH - 4000));
        }
        setMoneyLocations(locations);
        moneyLocationsRef.current = locations;

        // Reset horses ref
        const initialHorsesWithSpeed = INITIAL_HORSES.map(h => ({ ...h, speed: Math.random() * 2 + 4 }));
        horsesRef.current = initialHorsesWithSpeed;

        setGameState({
            horses: initialHorsesWithSpeed,
            cameraX: 0,
            isRacing: true,
            isFinished: false
        });

        isRacingRef.current = true;
        rankRef.current = 1;
        lastTimeRef.current = 0;
        requestRef.current = requestAnimationFrame(gameLoop);
    };

    const resetRace = () => {
        isRacingRef.current = false;
        setMoneyLocations([]);
        moneyLocationsRef.current = [];
        horsesRef.current = JSON.parse(JSON.stringify(INITIAL_HORSES));
        setGameState({
            horses: JSON.parse(JSON.stringify(INITIAL_HORSES)),
            cameraX: 0,
            isRacing: false,
            isFinished: false
        });
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };

    // Clean up on unmount
    useEffect(() => {
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        }
    }, []);

    return (
        <div className={styles.gameContainer}>

            <div className={styles.controls}>
                {!gameState.isRacing && !gameState.isFinished && (
                    <button className={styles.button} onClick={startRace}>Bắt đầu Đua!</button>
                )}
                {(gameState.isFinished || gameState.isRacing) && (
                    <button className={styles.button} onClick={resetRace} disabled={gameState.isRacing}>Làm mới</button>
                )}
            </div>

            {/* The Viewport */}
            <div className={styles.trackViewport}>
                {/* The World - Moves opposite to Camera */}
                <div
                    className={styles.trackWorld}
                    style={{
                        width: `${TRACK_LENGTH + 1000}px`, // Extra space
                        transform: `translate3d(${-gameState.cameraX}px, 0, 0)` // Use 3D for GPU
                    }}
                >

                    {/* Finish Line */}
                    <div
                        className={styles.finishLine}
                        style={{
                            left: `${TRACK_LENGTH}px`,
                            transform: `translateY(${getTerrainY(TRACK_LENGTH)}px)`
                        }}
                    ></div>

                    {/* Lucky Money Spots */}
                    {moneyLocations.map((loc, idx) => (
                        <div
                            key={idx}
                            className={styles.luckyMoney}
                            style={{
                                left: `${loc}px`,
                                transform: `translate3d(-50%, calc(-50% + ${getTerrainY(loc)}px), 0)`
                            }}
                        >
                            🧧
                        </div>
                    ))}

                    {/* Lanes and Horses */}
                    <div className={styles.laneContainer}>
                        {gameState.horses.map((horse, index) => {
                            // Spread vertically centered, reduced spacing to 50px to fit on road
                            const laneOffsetY = (index - 2) * 50;
                            return (
                                <div key={horse.id} className={styles.lane} style={{ top: laneOffsetY, zIndex: index }}>
                                    {/* Simple visual ground line for this lane (static or dynamic) */}
                                    {/* For better terrain viz, we might need SVG path, but for now simple dots or CSS trick */}

                                    <div
                                        className={styles.horse}
                                        style={{
                                            left: 0,
                                            transform: `translate3d(${horse.position}px, ${getTerrainY(horse.position)}px, 0) scale(0.8)`
                                        }}
                                    >
                                        <span className={styles.horseName}>{horse.name}</span>
                                        {/* Sprite Animation Div - Inline Style Override to ensure correct sizing */}
                                        <div
                                            className={styles.horseSprite}
                                            style={{
                                                width: '128px',
                                                height: '128px',
                                                backgroundImage: `url(${horse.image})`,
                                                backgroundRepeat: 'no-repeat',
                                                // Set EXACT size of sprite sheet to ensure 1:1 pixel mapping
                                                backgroundSize: '512px 1152px',
                                                // Trying Row 3 (Index 3 - Usually Right): 3 * 128 = 384px
                                                backgroundPositionY: '-384px'
                                            }}
                                        />
                                        {horse.money > 0 && <span className={styles.money}>+{horse.money / 1000}k</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {gameState.isFinished && (
                <div className={styles.results}>
                    <h2>Kết quả chung cuộc 🏆</h2>
                    {gameState.horses.sort((a, b) => (a.rank || 99) - (b.rank || 99)).map(horse => (
                        <div key={horse.id} className={styles.rankItem}>
                            <span className={horse.rank === 1 ? styles.rank1 : horse.rank === 2 ? styles.rank2 : styles.rank3}>
                                #{horse.rank} {horse.icon} {horse.name}
                            </span>
                            <span>🧧 {horse.money.toLocaleString()}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
