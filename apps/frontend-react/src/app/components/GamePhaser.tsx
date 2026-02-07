import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import styles from './Game.module.css';

// --- Constants & Config ---
const TRACK_LENGTH = 15000;
const VIEWPORT_WIDTH = 1200;
const VIEWPORT_HEIGHT = 600; // Adjust based on your design

interface HorseData {
    id: number;
    name: string;
    image: string; // Sprite sheet path
    color: string;
}

const HORSES_DATA: HorseData[] = [
    { id: 1, name: 'Xích Thố', image: '/assets/Horses/1.png', color: '#FF5722' },
    { id: 2, name: 'Đích Lư', image: '/assets/Horses/2.png', color: '#FFC107' },
    { id: 3, name: 'Tuyệt Ảnh', image: '/assets/Horses/3.png', color: '#2196F3' },
    { id: 4, name: 'Bạch Long', image: '/assets/Horses/4.png', color: '#EEEEEE' },
    { id: 5, name: 'Ô Vân', image: '/assets/Horses/5.png', color: '#212121' },
];

export const GamePhaser: React.FC = () => {
    const gameRef = useRef<Phaser.Game | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    // UI State for overlay (Results, Buttons)
    const [isRacing, setIsRacing] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [results, setResults] = useState<any[]>([]);

    useEffect(() => {
        if (!containerRef.current) return;

        // Define the Main Scene
        class MainScene extends Phaser.Scene {
            private horses: Phaser.GameObjects.Sprite[] = [];
            private horseContainers: Phaser.GameObjects.Container[] = [];
            private horseDataList: any[] = [];
            private background!: Phaser.GameObjects.TileSprite;
            private terrainGraphics!: Phaser.GameObjects.Graphics;
            private luckyMoneys: Phaser.GameObjects.Text[] = []; // Using Text/Emoji for money
            
            // Game State
            private raceStarted = false;
            private raceFinished = false;
            private moneyLocations: number[] = [];
            private rankCounter = 1;

            constructor() {
                super('MainScene');
            }

            preload() {
                // Load Background
                this.load.image('bg', '/assets/race-background/race.png');
                
                // Load Horse Spritesheets
                HORSES_DATA.forEach(h => {
                    this.load.spritesheet(`horse_${h.id}`, h.image, {
                        frameWidth: 128,
                        frameHeight: 128
                    });
                });
            }

            create() {
                // 1. Create Background
                // We want a long track. TileSprite is good for repeating, but here we might want a fixed long world.
                // Let's make the world bounds huge.
                this.physics.world.setBounds(0, 0, TRACK_LENGTH + 2000, 600);
                
                // Background Image (Repeated)
                // Since asset is likely small, we tile it.
                this.background = this.add.tileSprite(0, 300, TRACK_LENGTH + 2000, 600, 'bg');
                this.background.setOrigin(0, 0.5);
                this.background.setScrollFactor(1); // Scrolls with camera? No, it IS the world.
                
                // 2. Create Animations
                // We assume Row 3 (Index 2) is "Run Right". 
                // Frames in row 2: 2*4=8 to 11. (4 cols).
                // Let's try 8,9,10,11.
                HORSES_DATA.forEach(h => {
                    this.anims.create({
                        key: `run_${h.id}`,
                        frames: this.anims.generateFrameNumbers(`horse_${h.id}`, { start: 8, end: 11 }), // Row 3
                        frameRate: 12,
                        repeat: -1
                    });
                });

                // 3. Setup Horses
                this.horseContainers = [];
                this.horseDataList = HORSES_DATA.map(h => ({
                    ...h,
                    speed: 0,
                    money: 0,
                    finished: false,
                    rank: 0,
                    currentPos: 0
                }));

                this.horseDataList.forEach((hData, index) => {
                    const container = this.add.container(0, 0);
                    
                    // Sprite
                    const sprite = this.add.sprite(0, 0, `horse_${hData.id}`);
                    sprite.play(`run_${hData.id}`);
                    sprite.setScale(0.8); // Scale as requested
                    
                    // Name Tag
                    const nameText = this.add.text(0, -50, hData.name, {
                        fontSize: '14px',
                        color: '#ffffff',
                        backgroundColor: '#00000088',
                        padding: { x: 4, y: 2 }
                    }).setOrigin(0.5);

                    // Money Tag (Hidden initially)
                    const moneyText = this.add.text(0, -70, '', {
                        fontSize: '14px',
                        color: '#FFD700',
                        fontStyle: 'bold'
                    }).setOrigin(0.5);
                    moneyText.setVisible(false);
                    moneyText.setName('moneyText'); // to find it later

                    container.add([sprite, nameText, moneyText]);
                    
                    // Initial Position
                    // Vertical spread centered around Y=350
                    const yOffset = (index - 2) * 50;
                    container.setPosition(50, 350 + yOffset);
                    
                    // Store ref
                    container.setData('data', hData); // Link data
                    this.horseContainers.push(container);
                });

                // 4. Lucky Money Spots
                this.generateMoneySpots();

                // 5. Camera
                this.cameras.main.setBounds(0, 0, TRACK_LENGTH + 1000, 600);
                this.cameras.main.startFollow(this.horseContainers[0], true, 0.1, 0.1, -400, 0); // Offset X to keep horses on left
                
                // Listen to React events (if any) - simplified via global or method calls
                // For now, we control start via props or external call, but let's just wait for a start signal.
                // We'll expose a start function on the game instance registry.
                this.game.events.on('START_RACE', this.startRace, this);
                this.game.events.on('RESET_RACE', this.resetRace, this);
            }

            update(time: number, delta: number) {
                if (!this.raceStarted || this.raceFinished) return;

                // Normalize delta
                const dtFactor = Math.min(delta, 64) / 16.66;
                let allFinished = true;
                let leaderX = 0;

                this.horseContainers.forEach((container) => {
                    const data = container.getData('data');
                    if (data.finished) {
                        if (data.currentPos > leaderX) leaderX = data.currentPos;
                        return;
                    }
                    
                    allFinished = false;

                    // Physics Logic
                    const speedVar = (Math.random() - 0.5) * 0.5;
                    let newSpeed = Math.max(3, Math.min(8, data.speed + speedVar));
                    if (Math.random() < 0.005) newSpeed += 2; // Boost
                    
                    data.speed = newSpeed;
                    const moveStep = newSpeed * dtFactor;
                    data.currentPos += moveStep;

                    // Terrain Y Calculation
                    const m = data.currentPos / 100;
                    const hill = Math.sin(m * 0.1) * 60;
                    const bump = Math.sin(m * 0.5) * 10;
                    let ramp = 0;
                    if (data.currentPos > 12000) ramp = -(data.currentPos - 12000) * 0.05;
                    const terrainY = hill + bump + ramp;

                    // Base Y is 350 + offset
                    // We simply add terrainY to the container's Y
                    const index = this.horseDataList.findIndex(h => h.id === data.id);
                    const baseLaneY = 350 + (index - 2) * 50;
                    
                    container.setPosition(data.currentPos, baseLaneY + terrainY);

                    // Lucky Money Logic
                    if (data.money === 0) {
                        for (const loc of this.moneyLocations) {
                            if (data.currentPos >= loc && (data.currentPos - moveStep) < loc) {
                                // Collected!
                                const amount = this.getRandomLuckyMoney();
                                data.money = amount;
                                
                                // Show UI
                                const moneyText = container.getByName('moneyText') as Phaser.GameObjects.Text;
                                if (moneyText) {
                                    moneyText.setText(`+${amount/1000}k`);
                                    moneyText.setVisible(true);
                                    
                                    // Pop animation
                                    this.tweens.add({
                                        targets: moneyText,
                                        y: -90,
                                        alpha: 0,
                                        duration: 1000,
                                        yoyo: false,
                                        onComplete: () => {
                                             moneyText.setVisible(true); // Keep it visible but reset alpha? 
                                             // Actually, user wants to see it collected. Let's just keep it above head.
                                             moneyText.setAlpha(1);
                                             moneyText.y = -70;
                                        }
                                    });
                                }
                                break; // Take one
                            }
                        }
                    }

                    // Finish Logic
                    if (data.currentPos >= TRACK_LENGTH) {
                        data.finished = true;
                        data.rank = this.rankCounter++;
                        
                        // Bonus x2 for 1st
                        if (data.rank === 1) {
                            data.money = data.money === 0 ? 0 : data.money * 2; // 0 money * 2 = 0. Should we give pity money? Logic says x2 bonus.
                            // If user didn't get lucky money, x2 is 0. That's life.
                            // Update text if needed
                             const moneyText = container.getByName('moneyText') as Phaser.GameObjects.Text;
                             if (data.money > 0 && moneyText) {
                                 moneyText.setText(`x2! +${data.money/1000}k`);
                                 moneyText.setColor('#ff0000');
                             }
                        }
                    }

                    if (data.currentPos > leaderX) leaderX = data.currentPos;
                });

                // Camera Follow Leader
                // We find the leader container
                const leader = this.horseContainers.reduce((prev, curr) => {
                    return (curr.getData('data').currentPos > prev.getData('data').currentPos) ? curr : prev;
                });
                
                // Smooth follow is handled by startFollow, but we can clamp X
                // Actually startFollow works well.
                this.cameras.main.startFollow(leader, true, 0.1, 0.1, -VIEWPORT_WIDTH * 0.3, 0);

                if (allFinished) {
                    this.raceFinished = true;
                    this.raceStarted = false;
                    // Emit event to React
                    // We need a way to pass data back. 
                    // Since we are inside useEffect, we can't easily call setResults directly without closure issues?
                    // Actually, we can dispatch a custom event on the canvas or use a callback ref.
                    window.dispatchEvent(new CustomEvent('RACE_FINISHED', { detail: this.horseDataList }));
                }
            }

            startRace() {
                this.raceStarted = true;
                this.raceFinished = false;
                this.rankCounter = 1;
                // Init speeds
                this.horseContainers.forEach(c => {
                    const d = c.getData('data');
                    d.speed = Math.random() * 2 + 4;
                    d.finished = false;
                    d.rank = 0;
                    d.money = 0;
                    d.currentPos = 0;
                    c.setPosition(0, c.y); // Reset X, keep Y
                    
                    const mt = c.getByName('moneyText') as Phaser.GameObjects.Text;
                    if(mt) mt.setVisible(false);
                });
                
                this.generateMoneySpots();
            }

            resetRace() {
                this.raceStarted = false;
                this.raceFinished = false;
                this.rankCounter = 1;
                this.horseContainers.forEach((c, index) => {
                    const d = c.getData('data');
                    d.currentPos = 0;
                    d.money = 0;
                    d.rank = 0;
                    d.finished = false;
                    
                    // Reset position
                    const baseLaneY = 350 + (index - 2) * 50;
                    c.setPosition(50, baseLaneY);
                    
                    const mt = c.getByName('moneyText') as Phaser.GameObjects.Text;
                    if(mt) mt.setVisible(false);
                });
                this.cameras.main.scrollX = 0;
            }

            generateMoneySpots() {
                this.moneyLocations = [];
                const num = 3 + Math.floor(Math.random() * 3);
                for(let i=0; i<num; i++) {
                    this.moneyLocations.push(2000 + Math.random() * (TRACK_LENGTH - 4000));
                }
                
                // Visualize Money Spots (Optional)
                // Clear old
                this.luckyMoneys.forEach(t => t.destroy());
                this.luckyMoneys = [];
                
                this.moneyLocations.forEach(loc => {
                    // Place them at random Y or track Y?
                    // Terrain Y changes dynamically, so we compute static Y?
                    // Let's place them "floating" at terrain height.
                    // We can't easily pre-calc terrain Y for text unless we duplicate logic.
                    // Simplified: Place at fixed Y or compute once.
                    
                    const m = loc / 100;
                    const hill = Math.sin(m * 0.1) * 60;
                    const bump = Math.sin(m * 0.5) * 10;
                    const terrainY = hill + bump; // No ramp usually here
                    
                    const text = this.add.text(loc, 350 + terrainY - 50, '🧧', { fontSize: '32px' }).setOrigin(0.5);
                    this.luckyMoneys.push(text);
                });
            }

            getRandomLuckyMoney() {
                const rand = Math.random();
                if (rand < 0.30) return 10000;
                if (rand < 0.60) return 20000;
                if (rand < 0.90) return 50000;
                return 100000;
            }
        }

        const config: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            parent: containerRef.current,
            width: VIEWPORT_WIDTH,
            height: VIEWPORT_HEIGHT,
            backgroundColor: '#87CEEB', // Sky blue fallback
            physics: {
                default: 'arcade',
                arcade: {
                    gravity: { x: 0, y: 0 },
                    debug: false
                }
            },
            scene: MainScene
        };

        const game = new Phaser.Game(config);
        gameRef.current = game;

        // Event Listener for Results
        const handleRaceFinished = (e: any) => {
            setResults(e.detail);
            setIsFinished(true);
            setIsRacing(false);
        };
        window.addEventListener('RACE_FINISHED', handleRaceFinished);

        return () => {
            window.removeEventListener('RACE_FINISHED', handleRaceFinished);
            game.destroy(true);
        };
    }, []);

    const handleStart = () => {
        if (gameRef.current) {
            gameRef.current.events.emit('START_RACE');
            setIsRacing(true);
            setIsFinished(false);
        }
    };

    const handleReset = () => {
        if (gameRef.current) {
            gameRef.current.events.emit('RESET_RACE');
            setIsRacing(false);
            setIsFinished(false);
        }
    };

    return (
        <div className={styles.gameContainer}>
             <div className={styles.controls}>
                {!isRacing && !isFinished && (
                    <button className={styles.button} onClick={handleStart}>Bắt đầu Đua! (Phaser)</button>
                )}
                {(isFinished || isRacing) && (
                    <button className={styles.button} onClick={handleReset} disabled={isRacing}>Làm mới</button>
                )}
            </div>

            {/* Phaser Container */}
            <div ref={containerRef} style={{ width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT, margin: '0 auto', borderRadius: '12px', overflow: 'hidden' }} />

            {isFinished && (
                <div className={styles.results}>
                    <h2>Kết quả chung cuộc 🏆</h2>
                    {results.sort((a, b) => (a.rank || 99) - (b.rank || 99)).map(horse => (
                        <div key={horse.id} className={styles.rankItem}>
                            <span className={horse.rank === 1 ? styles.rank1 : horse.rank === 2 ? styles.rank2 : styles.rank3}>
                                #{horse.rank} {horse.name}
                            </span>
                            <span>🧧 {horse.money.toLocaleString()}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
