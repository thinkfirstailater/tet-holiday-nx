import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import styles from './Game.module.css';
import { Horse, HorseData } from './Horse';
import { RaceBackground } from './RaceBackground';
import { RacePath } from './RacePath';
import { GameConstants } from './GameConstants';

const HORSE_START_X = RacePath.SVG_START_X; 
const MIDDLE_HORSE_START_RUNNING_X = HORSE_START_X; 

const DEBUG_BACKGROUND_MODE = false;

const HORSES_DATA: HorseData[] = [
    { id: 1, positionIndex: -2, name: 'Xám Lông Đen', image: '/assets/horses/Horse_fullcolor_black_barebackriding.png', color: '#FF5722', baseLaneY: 0, startX: MIDDLE_HORSE_START_RUNNING_X + GameConstants.BASE_GAP_HORSE_X * 2, speed: 0, targetSpeed: 0, money: 0, finished: false, rank: 0, currentPos: 0, hasLuckyMoney: false },
    { id: 2, positionIndex: -1, name: 'Nâu Lông Đỏ', image: '/assets/horses/Horse_fullcolor_brown_barebackriding.png', color: '#FFC107', baseLaneY: 0, startX: MIDDLE_HORSE_START_RUNNING_X + GameConstants.BASE_GAP_HORSE_X, speed: 0, targetSpeed: 0, money: 0, finished: false, rank: 0, currentPos: 0, hasLuckyMoney: false },
    { id: 3, positionIndex: 0, name: 'Trắng Lông Zàng', image: '/assets/horses/Horse_fullcolor_white_barebackriding.png', color: '#2196F3', baseLaneY: 0, startX: MIDDLE_HORSE_START_RUNNING_X, speed: 0, targetSpeed: 0, money: 0, finished: false, rank: 0, currentPos: 0, hasLuckyMoney: false },
    { id: 4, positionIndex: 1, name: 'Long Lông Xanh', image: '/assets/horses/Horse_fullcolor_paint_brown_barebackriding.png', color: '#EEEEEE', baseLaneY: 0, startX: MIDDLE_HORSE_START_RUNNING_X - GameConstants.BASE_GAP_HORSE_X, speed: 0, targetSpeed: 0, money: 0, finished: false, rank: 0, currentPos: 0, hasLuckyMoney: false },
    { id: 5, positionIndex: 2, name: 'Vàng Lông Trắng', image: '/assets/horses/Horse_fullcolor_paint_beige_barebackriding.png', color: '#212121', baseLaneY: 0, startX: MIDDLE_HORSE_START_RUNNING_X - GameConstants.BASE_GAP_HORSE_X * 2, speed: 0, targetSpeed: 0, money: 0, finished: false, rank: 0, currentPos: 0, hasLuckyMoney: false },
];

export const GamePhaser: React.FC = () => {
    const gameRef = useRef<Phaser.Game | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [isRacing, setIsRacing] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [results, setResults] = useState<any[]>([]);
    
    // Detect Mobile/Portrait
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);
    const [raceStats, setRaceStats] = useState<any[]>([]);
    const lastUpdateRef = useRef(0);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
            setIsPortrait(window.innerHeight > window.innerWidth);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (!containerRef.current) return;

        class MainScene extends Phaser.Scene {
            private horses: Horse[] = [];
            private raceBackground!: RaceBackground;
            private luckyMoneyGroup!: Phaser.GameObjects.Group;
            private luckyMoneyPickedCounts: number[] = [0, 0, 0];
            private raceStarted = false;
            private raceFinished = false;
            private rankCounter = 1;
            private spawnTimer?: Phaser.Time.TimerEvent;
            private debugGraphics?: Phaser.GameObjects.Graphics;
            private pendingLuckyMoneys: { laneIndex: number, value: number }[] = [];
            private soundRunning?: Phaser.Sound.BaseSound;
            private soundEnd?: Phaser.Sound.BaseSound;
            private soundCollect?: Phaser.Sound.BaseSound;
            private lastCollectTime = 0;
            private focusedHorse?: Horse;
            private currentFollowTarget?: Phaser.GameObjects.GameObject;

            constructor() {
                super('MainScene');
            }

            preload() {
                this.load.image('bg', '/assets/race-background/race.png');
                for (let i = 1; i <= 8; i++) {
                    this.load.image(`lucky_money_s${i}`, `/assets/red-envelop/Hong Bao S${i}.png`);
                }
                HORSES_DATA.forEach(horse => {
                    this.load.spritesheet(`horse_running_${horse.id}`, horse.image!, {
                        frameWidth: 80,
                        frameHeight: 64
                    });
                });
                this.load.audio('running', '/assets/music/running.mp3');
                this.load.audio('end', '/assets/music/end.mp3');
                this.load.audio('collect', '/assets/music/collect.mp3');
            }

            create() {
                if (!this.textures.exists('particle')) {
                    const graphics = this.make.graphics({ x: 0, y: 0 });
                    graphics.fillStyle(0xfff700, 1);
                    graphics.fillCircle(4, 4, 4);
                    graphics.generateTexture('particle', 8, 8);
                }
                if (!this.textures.exists('flare')) {
                    const graphics = this.make.graphics({ x: 0, y: 0 });
                    graphics.fillStyle(0xffffff, 1);
                    graphics.fillCircle(10, 10, 10);
                    graphics.generateTexture('flare', 20, 20);
                }

                this.raceBackground = new RaceBackground(this, 0);
                const bgWidth = this.raceBackground.width;
                const bgHeight = this.raceBackground.height;
                const winX = RacePath.SVG_END_X; 
                const dynamicCenterY = bgHeight * 0.65;
                
                RacePath.setConfig(winX, dynamicCenterY);
                const runDistance = winX - MIDDLE_HORSE_START_RUNNING_X;
                const baseSpeed = Math.max(0, runDistance / GameConstants.RACE_DURATION);
                
                this.physics.world.setBounds(0, 0, bgWidth, bgHeight);

                if (DEBUG_BACKGROUND_MODE) {
                    const zoomLevel = GameConstants.VIEWPORT_WIDTH / bgWidth; 
                    this.cameras.main.setZoom(zoomLevel); 
                    this.cameras.main.centerOn(bgWidth / 2, bgHeight / 2);
                    return;
                }

                this.luckyMoneyGroup = this.add.group();
                this.initHorses(baseSpeed, dynamicCenterY);

                // Updated Camera Logic to match Online
                this.physics.world.setBounds(0, 0, bgWidth, bgHeight);
                this.cameras.main.setBounds(0, 0, bgWidth, bgHeight);

                if (isMobile && isPortrait) {
                    this.cameras.main.setZoom(0.8); // Zoom out for portrait
                } else {
                    this.cameras.main.setZoom(GameConstants.CAMERA_ZOOM_LEVEL);
                }

                const middleHorse = this.horses.find(h => h.horseData.positionIndex === 0);
                if (middleHorse) {
                    this.cameras.main.centerOn(middleHorse.x, middleHorse.y);
                }
                
                this.game.events.on('START_RACE', this.startRace, this);
                this.game.events.on('RESET_RACE', this.resetRace, this);

                this.drawDebugPath();

                this.soundRunning = this.sound.add('running', { loop: true, volume: 0.5 });
                this.soundEnd = this.sound.add('end', { loop: false, volume: 0.8 });
                this.soundCollect = this.sound.add('collect', { loop: false, volume: 1.0 });

                if (this.sound.locked) {
                    this.sound.once('unlocked', () => console.log('Audio unlocked'));
                }

                this.input.on('gameobjectdown', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
                    if (gameObject instanceof Horse) {
                        this.focusedHorse = gameObject as Horse;
                    }
                });

                this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[]) => {
                    const clickedHorse = currentlyOver.some(obj => obj instanceof Horse);
                    if (!clickedHorse) {
                        this.focusedHorse = undefined;
                    }
                });
            }

            private drawDebugPath() {
                if (!GameConstants.DEBUG_PATH) return;
                if (this.debugGraphics) this.debugGraphics.clear();
                this.debugGraphics = this.add.graphics();
                const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0x00ffff];
                for (let i = 0; i < 5; i++) {
                    this.debugGraphics.lineStyle(4, colors[i], 0.5);
                    const path = RacePath.getPathForLane(i);
                    path.draw(this.debugGraphics);
                }
            }

            private initHorses(baseSpeed: number, centerY: number) {
                this.horses.forEach(h => h.destroy());
                this.horses = [];
                HORSES_DATA.forEach((h, index) => {
                    const laneY = centerY + (h.positionIndex * GameConstants.BASE_GAP_HORSE_Y);
                    const hData: HorseData = {
                        ...h,
                        baseLaneY: laneY,
                        speed: baseSpeed + Phaser.Math.Between(-20, 20),
                        targetSpeed: baseSpeed,
                    };
                    const horse = new Horse(this, hData.startX, laneY, hData, baseSpeed);
                    this.horses.push(horse);
                });
            }

            private getLeadingHorse() {
                return this.horses.reduce((prev, curr) => (curr.x > prev.x ? curr : prev), this.horses[0]);
            }

            update(time: number, delta: number) {
                const soundManager = this.sound as Phaser.Sound.WebAudioSoundManager;
                if (soundManager.context && soundManager.context.state === 'suspended') {
                    soundManager.context.resume();
                }

                if (this.raceStarted && !this.raceFinished && this.soundRunning && !this.soundRunning.isPlaying) {
                     this.soundRunning.play();
                }

                if (this.raceStarted && !this.raceFinished) {
                    let allFinished = true;
                    const dt = delta / 1000;

                    this.horses.forEach((horse) => {
                        if (horse.horseData.finished) return;
                        allFinished = false;
                        horse.updateHorse(time, dt);

                        if (horse.horseData.finished && horse.horseData.rank === 0) {
                            const rank = this.rankCounter++;
                            const isWinner = rank === 1;
                            if (isWinner && horse.horseData.money > 0) {
                                horse.horseData.money *= 2;
                                horse.updateMoneyText();
                            }
                            horse.setFinished(rank, isWinner);
                        }

                        if (!horse.horseData.hasLuckyMoney) {
                            const hX = horse.x;
                            const hY = horse.y - 40; 
                            this.luckyMoneyGroup.getChildren().forEach((lm: any) => {
                                if (lm.getData('beingCollected')) return;
                                const lmLane = lm.getData('laneIndex');
                                const isSameLane = lmLane === horse.horseData.positionIndex;
                                const distSq = (hX - lm.x) ** 2 + (hY - lm.y) ** 2;
                                const magnetRangeSq = isSameLane ? 90000 : 3600; 
                                if (distSq < magnetRangeSq) {
                                    if (!lm.getData('isMagneting')) {
                                        lm.setData('isMagneting', true);
                                        lm.setData('targetHorse', horse);
                                    }
                                }
                                if (lm.getData('isMagneting') && lm.getData('targetHorse') === horse) {
                                    const speed = 15;
                                    const angle = Phaser.Math.Angle.Between(lm.x, lm.y, hX, hY);
                                    lm.x += Math.cos(angle) * speed;
                                    lm.y += Math.sin(angle) * speed;
                                    if (distSq < 1600) {
                                        lm.setData('beingCollected', true);
                                        this.collectLuckyMoney(horse, lm);
                                    }
                                }
                            });
                        }
                    });

                    // Emit HUD stats
                    const stats = this.horses.map(h => ({
                         name: h.horseData.name,
                         rank: h.horseData.rank,
                         speed: h.horseData.speed,
                         x: h.x
                    }));
                    this.game.events.emit('UPDATE_HUD', stats);

                    if (allFinished) {
                        this.raceFinished = true;
                        this.raceStarted = false;
                        if (this.soundRunning && this.soundRunning.isPlaying) this.soundRunning.stop();
                        if (this.soundEnd) this.soundEnd.play();
                        if (this.spawnTimer) this.spawnTimer.remove();
                        window.dispatchEvent(new CustomEvent('RACE_FINISHED', { detail: this.horses.map(h => h.horseData) }));
                    }
                }

                let targetHorse = this.focusedHorse;
                if (!targetHorse && this.horses.length > 0) {
                    targetHorse = this.getLeadingHorse();
                }

                if (targetHorse) {
                    if (this.currentFollowTarget !== targetHorse) {
                        this.currentFollowTarget = targetHorse;
                        this.cameras.main.startFollow(targetHorse, true, 0.1, 0.1);
                    }
                }
            }

            private collectLuckyMoney(horse: Horse, lm: Phaser.GameObjects.Image) {
                const now = this.time.now;
                if (this.soundCollect && (now - this.lastCollectTime > 100)) {
                    this.soundCollect.play();
                    this.lastCollectTime = now;
                }
                const value = lm.getData('value') || 10;
                horse.collectMoney(value);
                const glow = lm.getData('glow');
                if (glow) glow.destroy();
                const particles = this.add.particles(lm.x, lm.y, 'particle', {
                    speed: { min: 50, max: 150 },
                    angle: { min: 0, max: 360 },
                    scale: { start: 1, end: 0 },
                    lifespan: 500,
                    gravityY: 200,
                    quantity: 20,
                    blendMode: 'ADD'
                });
                this.time.delayedCall(600, () => particles.destroy());
                const text = this.add.text(lm.x, lm.y - 20, `+${value}k`, {
                    fontSize: '24px', color: '#FFD700', stroke: '#000000', strokeThickness: 3, fontStyle: 'bold'
                }).setOrigin(0.5).setDepth(20);
                this.tweens.add({
                    targets: text, y: text.y - 100, alpha: 0, duration: 1000, ease: 'Power2', onComplete: () => text.destroy()
                });
                lm.destroy();
            }

            private startRace() {
                this.raceStarted = true;
                this.raceFinished = false;
                this.rankCounter = 1;
                if (this.soundRunning) this.soundRunning.play();
                this.horses.forEach(h => h.playRun());
                this.prepareLuckyMoneyQueue();
                const totalItems = this.pendingLuckyMoneys.length;
                const startRatio = 0.4;
                const endRatio = 0.6;
                const startTime = GameConstants.RACE_DURATION * startRatio * 1000;
                const endTime = GameConstants.RACE_DURATION * endRatio * 1000;
                const interval = (endTime - startTime) / Math.max(1, totalItems);
                this.spawnTimer = this.time.addEvent({
                    delay: interval,
                    callback: () => {
                        if (!this.raceStarted || this.raceFinished) return;
                        this.spawnLuckyMoneyBatch(1);
                    },
                    repeat: totalItems - 1,
                    startAt: -startTime
                });
            }

            private prepareLuckyMoneyQueue() {
                const values: number[] = [];
                const quotas = GameConstants.GET_LUCKY_MONEY_QUOTAS(5); 
                GameConstants.LUCKY_MONEY_VALUES.forEach((val, idx) => {
                    const count = quotas[idx] || 0;
                    for (let i = 0; i < count; i++) values.push(val);
                });
                Phaser.Utils.Array.Shuffle(values);
                const baseLanes = [-2, -1, 0, 1, 2];
                let lanes: number[] = [];
                while (lanes.length < values.length) lanes = lanes.concat(baseLanes);
                lanes = lanes.slice(0, values.length);
                Phaser.Utils.Array.Shuffle(lanes);
                this.pendingLuckyMoneys = lanes.map((laneIdx, i) => ({
                    laneIndex: laneIdx,
                    value: values[i]
                }));
            }

            private spawnLuckyMoneyBatch(count: number) {
                for (let i = 0; i < count; i++) {
                    if (this.pendingLuckyMoneys.length === 0) break;
                    const item = this.pendingLuckyMoneys.pop();
                    if (item) this.spawnSingleLuckyMoney(item.laneIndex, item.value);
                }
            }

            private spawnSingleLuckyMoney(laneIndex: number, value: number) {
                // Calculate position based on Track Progress (matching Online Mode)
                // instead of Camera Scroll (which caused issues with short tracks/zoom)
                const totalLength = RacePath.SVG_END_X - RacePath.SVG_START_X;
                const leader = this.getLeadingHorse();
                const currentX = leader ? leader.x : RacePath.SVG_START_X;
                
                // Estimate leader progress (t: 0..1)
                const leaderT = Phaser.Math.Clamp((currentX - RacePath.SVG_START_X) / totalLength, 0, 1);
                
                // Spawn slightly ahead of the leader (15% to 30% ahead)
                const targetT = Phaser.Math.Clamp(leaderT + Phaser.Math.FloatBetween(0.15, 0.3), 0.1, 0.95);
                
                const path = RacePath.getPathForLane(laneIndex + 2);
                const point = path.getPoint(targetT);
                
                if (!point) return;

                const targetX = point.x;
                const targetY = point.y;
                
                // Mimic Online Mode Drop Offsets
                const startX = targetX + 250;
                const startY = targetY - 600;

                const skinIndex = Phaser.Math.Between(1, 8);
                const lm = this.add.image(startX, startY, `lucky_money_s${skinIndex}`).setScale(0);
                lm.setDepth(5);
                lm.setData('value', value);
                lm.setData('laneIndex', laneIndex);
                lm.setData('isMagneting', false);
                this.luckyMoneyGroup.add(lm);
                
                const particles = this.add.particles(0, 0, 'flare', {
                    speed: 100, scale: { start: 0.5, end: 0 }, blendMode: 'ADD', lifespan: 300, follow: lm
                });
                
                this.tweens.add({
                    targets: lm, y: targetY, x: targetX, scale: 0.03, duration: 1500, ease: 'Bounce.easeOut', rotation: 720 * (Math.PI / 180),
                    onComplete: () => {
                        particles.destroy();
                        lm.setData('landed', true);
                        this.tweens.add({
                            targets: lm, scale: { from: 0.03, to: 0.036 }, yoyo: true, repeat: -1, duration: 800, ease: 'Sine.easeInOut'
                        });
                        const glow = this.add.image(lm.x, lm.y, 'flare').setScale(0.6).setAlpha(0.5).setDepth(4);
                        this.tweens.add({
                            targets: glow, alpha: 0.1, scale: 0.9, yoyo: true, repeat: -1, duration: 1000
                        });
                        lm.setData('glow', glow);
                    }
                });
            }

            private resetRace() {
                if (this.soundRunning) this.soundRunning.stop();
                if (this.soundEnd) this.soundEnd.stop();
                if (this.soundCollect) this.soundCollect.stop();
                this.scene.restart();
                this.raceStarted = false;
                this.raceFinished = false;
            }
        }

        const config: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            parent: containerRef.current,
            width: isMobile && isPortrait ? window.innerWidth : GameConstants.VIEWPORT_WIDTH,
            height: isMobile && isPortrait ? window.innerHeight : GameConstants.VIEWPORT_HEIGHT,
            transparent: true,
            physics: {
                default: 'arcade',
                arcade: { gravity: { x: 0, y: 0 }, debug: false }
            },
            scene: [MainScene],
            audio: { disableWebAudio: false, noAudio: false },
            scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }
        };

        const game = new Phaser.Game(config);
        gameRef.current = game;

        // Bridge Phaser events to React
        game.events.on('UPDATE_HUD', (stats: any[]) => {
             const now = Date.now();
             if (now - lastUpdateRef.current > 100) {
                 setRaceStats(stats);
                 lastUpdateRef.current = now;
             }
        });

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
    }, [isMobile, isPortrait]);

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
        <div className={styles.gameContainer} style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
            {/* Phaser Container */}
            <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

            {/* In-Game HUD Overlay (Only when racing) */}
            {isRacing && !isFinished && (
                <div style={{
                    position: 'absolute',
                    top: isMobile ? '10px' : '20px',
                    left: isMobile ? '10px' : '20px',
                    zIndex: 100,
                    pointerEvents: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                }}>
                    {/* Badge */}
                    <div style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        padding: isMobile ? '6px 12px' : '10px 20px',
                        borderRadius: '20px',
                        border: '2px solid #FFD700',
                        color: '#FFD700',
                        fontWeight: 'bold',
                        fontSize: isMobile ? '14px' : '18px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                        alignSelf: 'flex-start',
                        pointerEvents: 'auto'
                    }}>
                        OFFLINE MODE
                    </div>

                    {/* Leaderboard */}
                    <div style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        padding: isMobile ? '10px' : '15px',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        minWidth: isMobile ? '160px' : '220px',
                        pointerEvents: 'auto',
                        backdropFilter: 'blur(4px)'
                    }}>
                        <div style={{
                            color: '#aaa',
                            fontSize: isMobile ? '10px' : '12px',
                            marginBottom: '8px',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            display: 'flex',
                            justifyContent: 'space-between'
                        }}>
                            <span>Leaderboard</span>
                            <span>{raceStats.length} Horses</span>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {raceStats
                                .sort((a, b) => b.x - a.x) // Sort by position (X)
                                .map((h, idx) => (
                                <div key={idx} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    fontSize: isMobile ? '12px' : '14px',
                                    color: 'white'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ 
                                            color: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : idx === 2 ? '#CD7F32' : '#888',
                                            fontWeight: 'bold',
                                            width: '20px'
                                        }}>#{idx + 1}</span>
                                        <span style={{ fontWeight: idx === 0 ? 'bold' : 'normal', color: idx === 0 ? '#fff' : '#ccc' }}>
                                            {h.name}
                                        </span>
                                    </div>
                                    <div style={{ 
                                        color: h.speed > 80 ? '#00FF00' : '#aaa',
                                        fontFamily: 'monospace',
                                        fontWeight: 'bold'
                                    }}>
                                        {Math.floor(h.speed * 1.5)} km/h
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Start Screen Overlay */}
            {!isRacing && !isFinished && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column',
                    justifyContent: 'center', alignItems: 'center', zIndex: 50
                }}>
                    <h1 style={{ color: '#FFD700', fontSize: isMobile ? '32px' : '50px', marginBottom: '10px', textShadow: '2px 2px 4px #000', textAlign: 'center' }}>
                        Đua ngựa lụm lì xì
                    </h1>
                    
                    {/* Horse List */}
                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                        gap: isMobile ? '10px' : '20px',
                        marginBottom: '30px',
                        maxWidth: '90%'
                    }}>
                        {HORSES_DATA.map((horse) => (
                            <div key={horse.id} style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                backgroundColor: 'rgba(255,255,255,0.1)',
                                padding: isMobile ? '10px' : '15px',
                                borderRadius: '10px',
                                width: isMobile ? '80px' : '120px',
                                border: `2px solid ${horse.color}`,
                                boxShadow: `0 0 10px ${horse.color}40`
                            }}>
                                <div style={{
                                    width: isMobile ? '50px' : '60px',
                                    height: isMobile ? '50px' : '60px',
                                    borderRadius: '50%',
                                    backgroundColor: '#fff',
                                    overflow: 'hidden',
                                    marginBottom: '5px',
                                    border: '2px solid white',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center'
                                }}>
                                    <div style={{
                                        width: '80px', // Frame Width from spritesheet
                                        height: '64px', // Frame Height from spritesheet
                                        backgroundImage: `url(${horse.image})`,
                                        backgroundPosition: '0 0',
                                        backgroundSize: 'auto', // Use original size to ensure pixel-perfect frame crop
                                        backgroundRepeat: 'no-repeat',
                                        // transform: `scale(${isMobile ? 50/64 : 60/64}) translate(${isMobile ? '-10px' : '0px'}, 0)`,
                                        transformOrigin: 'center center'
                                    }} />
                                </div>
                                <span style={{
                                    color: 'white',
                                    fontSize: isMobile ? '10px' : '14px',
                                    fontWeight: 'bold',
                                    textAlign: 'center',
                                    lineHeight: 1.2
                                }}>{horse.name}</span>
                            </div>
                        ))}
                    </div>

                    <button 
                        onClick={handleStart}
                        style={{
                            padding: '15px 40px', fontSize: '24px', fontWeight: 'bold',
                            backgroundColor: '#4CAF50', color: 'white', border: 'none',
                            borderRadius: '50px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,255,0,0.4)',
                            transform: 'scale(1)', transition: 'transform 0.2s'
                        }}
                    >
                        BẮT ĐẦU ĐUA 🏁
                    </button>
                </div>
            )}

            {/* Result Overlay */}
            {isFinished && (
                <div style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    padding: isMobile ? '15px' : '30px',
                    borderRadius: '15px',
                    border: '2px solid #FFD700',
                    color: 'white',
                    zIndex: 200,
                    minWidth: isMobile ? '90%' : '400px',
                    maxWidth: isMobile ? '95%' : '600px',
                    maxHeight: isMobile ? '80vh' : 'auto',
                    overflowY: isMobile ? 'auto' : 'visible',
                    textAlign: 'center',
                    boxShadow: '0 0 30px rgba(255, 215, 0, 0.5)'
                }}>
                    <h2 style={{ color: '#FFD700', marginBottom: isMobile ? '10px' : '20px', fontSize: isMobile ? '24px' : '32px' }}>🏆 KẾT QUẢ CHUNG CUỘC 🏆</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '8px' : '15px' }}>
                        {results
                            .sort((a, b) => (a.rank || 99) - (b.rank || 99))
                            .map((p) => (
                                <div key={p.id} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: isMobile ? '10px' : '15px',
                                    backgroundColor: p.rank === 1 ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                                    borderRadius: '10px',
                                    border: p.rank === 1 ? '1px solid #FFD700' : 'none'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '5px' : '10px' }}>
                                        <span style={{ 
                                            fontSize: isMobile ? '18px' : '24px', 
                                            fontWeight: 'bold',
                                            color: p.rank === 1 ? '#FFD700' : p.rank === 2 ? '#C0C0C0' : p.rank === 3 ? '#CD7F32' : 'white',
                                            width: isMobile ? '25px' : '40px'
                                        }}>
                                            #{p.rank}
                                        </span>
                                        <span style={{ fontSize: isMobile ? '16px' : '20px', fontWeight: 'bold' }}>{p.name}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '5px' : '10px' }}>
                                        <span style={{ fontSize: isMobile ? '16px' : '20px', color: '#FFD700' }}>
                                            🧧 {p.money ? p.money.toLocaleString() : 0}k
                                        </span>
                                        {p.rank === 1 && p.money > 0 && (
                                            <span style={{ 
                                                color: '#FFD700', 
                                                fontWeight: 'bold', 
                                                fontSize: isMobile ? '12px' : '14px',
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
                        onClick={handleReset} 
                        style={{
                            marginTop: isMobile ? '20px' : '30px',
                            padding: isMobile ? '10px 20px' : '12px 30px',
                            fontSize: isMobile ? '16px' : '18px',
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