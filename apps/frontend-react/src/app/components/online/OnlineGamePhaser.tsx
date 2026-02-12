import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { Socket } from 'socket.io-client';
import { GAME_CONSTANTS as CORE_CONSTANTS } from '@tet-holiday/game-core';
import { Horse, HorseData } from '../Horse';
import { RaceBackground } from '../RaceBackground';
import { RacePath } from '../RacePath';
import { GameConstants } from '../GameConstants';
import styles from '../Game.module.css';

// Reusing HORSES_DATA from GamePhaser (ideally should be shared)
const MIDDLE_HORSE_START_RUNNING_X = 260.661; // Sync with SVG Path

const HORSES_DATA: HorseData[] = [
    { id: 1, positionIndex: -2, name: 'Xích Thố', image: '/assets/horses/Horse_fullcolor_black_barebackriding.png', color: '#FF5722', baseLaneY: 0, startX: MIDDLE_HORSE_START_RUNNING_X + GameConstants.BASE_GAP_HORSE_X * 2, speed: 0, targetSpeed: 0, money: 0, finished: false, rank: 0, currentPos: 0, hasLuckyMoney: false },
    { id: 2, positionIndex: -1, name: 'Đích Lư', image: '/assets/horses/Horse_fullcolor_brown_barebackriding.png', color: '#FFC107', baseLaneY: 0, startX: MIDDLE_HORSE_START_RUNNING_X + GameConstants.BASE_GAP_HORSE_X, speed: 0, targetSpeed: 0, money: 0, finished: false, rank: 0, currentPos: 0, hasLuckyMoney: false },
    { id: 3, positionIndex: 0, name: 'Tuyệt Ảnh', image: '/assets/horses/Horse_fullcolor_white_barebackriding.png', color: '#2196F3', baseLaneY: 0, startX: MIDDLE_HORSE_START_RUNNING_X, speed: 0, targetSpeed: 0, money: 0, finished: false, rank: 0, currentPos: 0, hasLuckyMoney: false },
    { id: 4, positionIndex: 1, name: 'Bạch Long', image: '/assets/horses/Horse_fullcolor_paint_brown_barebackriding.png', color: '#EEEEEE', baseLaneY: 0, startX: MIDDLE_HORSE_START_RUNNING_X - GameConstants.BASE_GAP_HORSE_X, speed: 0, targetSpeed: 0, money: 0, finished: false, rank: 0, currentPos: 0, hasLuckyMoney: false },
    { id: 5, positionIndex: 2, name: 'Ô Vân', image: '/assets/horses/Horse_fullcolor_paint_beige_barebackriding.png', color: '#212121', baseLaneY: 0, startX: MIDDLE_HORSE_START_RUNNING_X - GameConstants.BASE_GAP_HORSE_X * 2, speed: 0, targetSpeed: 0, money: 0, finished: false, rank: 0, currentPos: 0, hasLuckyMoney: false },
];

interface OnlineGamePhaserProps {
    socket: Socket | null;
    roomId: string;
    isHost: boolean;
    myPlayerId?: string;
    players: any[]; // List of players from room state
    isRacing?: boolean;
    luckyMoneys?: any[]; // List of active lucky moneys
    onStartGame?: () => void;
}

export const OnlineGamePhaser: React.FC<OnlineGamePhaserProps> = ({ socket, roomId, isHost, myPlayerId, players, isRacing, luckyMoneys = [], onStartGame }) => {
    const gameRef = useRef<Phaser.Game | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<Phaser.Scene | null>(null);
    const horsesRef = useRef<Map<string, Horse>>(new Map()); // socketId -> Horse instance
    const luckyMoneysRef = useRef<Map<string, Phaser.GameObjects.Image>>(new Map());
    const [raceStats, setRaceStats] = useState<Record<string, { speed: number, rank: number, money: number }>>({});
    const lastUpdateRef = useRef(0);
    const isRacingRef = useRef(isRacing);
    const [, forceUpdate] = useState({});

    // Detect Mobile/Portrait
    const isMobile = window.innerWidth < 768;
    const isPortrait = window.innerHeight > window.innerWidth;

    useEffect(() => {
        const handleResize = () => forceUpdate({});
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        isRacingRef.current = isRacing;
    }, [isRacing]);

    // Map players to horses based on join order or index
    const playerToHorseDataMap = useRef<Map<string, HorseData>>(new Map());

    useEffect(() => {
        // Sort players by ID to ensure consistent horse assignment across all clients
        const sortedPlayers = [...players].sort((a, b) => a.id.localeCompare(b.id));

        // Map players to horse data slots
        sortedPlayers.forEach((p, index) => {
            if (index < HORSES_DATA.length) {
                playerToHorseDataMap.current.set(p.id, HORSES_DATA[index]);
            }
        });
        
        // Dynamic update if game is running
        if (sceneRef.current) {
            const scene = sceneRef.current as any;
            if (scene.updatePlayers) {
                scene.updatePlayers(sortedPlayers);
            }
        }
    }, [players]);

    // Sound Control Effect
    useEffect(() => {
        if (!sceneRef.current) return;
        
        const scene = sceneRef.current as any;
        if (isRacing) {
            if (scene.startRace) scene.startRace();
        } else {
            if (scene.stopRace) scene.stopRace();
        }
    }, [isRacing]);

    // Lucky Money Update Effect
    useEffect(() => {
        if (!sceneRef.current) return;
        const scene = sceneRef.current as any;
        if (scene.updateLuckyMoneys) {
            scene.updateLuckyMoneys(luckyMoneys || []);
        }
    }, [luckyMoneys]);

    useEffect(() => {
        if (!containerRef.current || !socket) return;

        class HUDScene extends Phaser.Scene {
            private btnContainer?: Phaser.GameObjects.Container;

            constructor() {
                super({ key: 'HUDScene', active: false });
            }

            create() {
                this.createButton();
                // Check initial state
                this.toggleButton(isRacingRef.current || false);
                
                // Listen to Global Game Events
                this.game.events.on('START_RACE_HUD', () => this.toggleButton(true));
                this.game.events.on('STOP_RACE_HUD', () => this.toggleButton(false));
                this.game.events.on('UPDATE_SPEED_HUD', (speed: number) => this.updateSpeed(speed));
            }

            updateSpeed(speed: number) {
                if (!this.btnContainer) return;
                const maxSpeed = CORE_CONSTANTS.MAX_SPEED || 50;
                const maxSpeedText = (this.btnContainer as any).maxSpeedText;
                
                if (speed >= maxSpeed) {
                    if (maxSpeedText && !maxSpeedText.visible) {
                        maxSpeedText.setVisible(true);
                        // Add pulse animation
                        this.tweens.add({
                            targets: maxSpeedText,
                            scale: { from: 1, to: 1.2 },
                            duration: 500,
                            yoyo: true,
                            repeat: -1
                        });
                    }
                } else {
                    if (maxSpeedText && maxSpeedText.visible) {
                        maxSpeedText.setVisible(false);
                        this.tweens.killTweensOf(maxSpeedText);
                        maxSpeedText.setScale(1);
                    }
                }
            }

            createButton() {
                const { width, height } = this.scale;
                let hudX, hudY;
                
                if (isMobile && isPortrait) {
                    // Mobile Portrait: Bottom Center
                    hudX = width / 2;
                    hudY = height - 120; // Lift up a bit
                } else {
                    // Desktop/Landscape: Bottom Right
                    hudX = width - 80;
                    hudY = height - 80;
                }
                
                const btnContainer = this.add.container(hudX, hudY);
                this.btnContainer = btnContainer;
                btnContainer.setDepth(1000); 

                // Scale up button for mobile touch
                if (isMobile) {
                    btnContainer.setScale(1.3);
                }

                // Add "MAX SPEED" indicator (hidden by default)
                const maxSpeedText = this.add.text(0, -70, 'MAX SPEED!', {
                    fontSize: '20px',
                    color: '#FFD700',
                    fontStyle: 'bold',
                    stroke: '#000000',
                    strokeThickness: 4
                }).setOrigin(0.5).setVisible(false);
                this.btnContainer.add(maxSpeedText);
                (this.btnContainer as any).maxSpeedText = maxSpeedText;

                // Circle
                const circle = this.add.circle(0, 0, 50, 0xFF5722);
                circle.setStrokeStyle(4, 0xffffff);
                
                // Text
                const text = this.add.text(0, 0, 'TAP!', {
                    fontSize: '24px',
                    color: '#ffffff',
                    fontStyle: 'bold'
                }).setOrigin(0.5);

                btnContainer.add([circle, text]);
                
                // Hint
                const hintText = this.add.text(0, 60, '(Space)', {
                    fontSize: '14px',
                    color: '#ffffff',
                    stroke: '#000000',
                    strokeThickness: 2
                }).setOrigin(0.5);
                btnContainer.add(hintText);

                // Interaction
                circle.setInteractive({ useHandCursor: true });
                circle.on('pointerdown', () => {
                    this.onTap();
                });
                
                // Keyboard
                this.input?.keyboard?.on('keydown-SPACE', () => {
                     if (this.btnContainer?.visible) {
                        this.onTap();
                     }
                });
            }
            
            onTap() {
                if (!this.btnContainer) return;
                
                // Visual Feedback (Button Scale)
                this.tweens.add({
                    targets: this.btnContainer,
                    scale: 0.9,
                    duration: 50,
                    yoyo: true
                });

                // Visual Feedback (Text Float Up)
                const floatText = this.add.text(this.btnContainer.x, this.btnContainer.y - 50, 'BOOST!', {
                    fontSize: '24px',
                    color: '#00FF00',
                    fontStyle: 'bold',
                    stroke: '#000000',
                    strokeThickness: 3
                }).setOrigin(0.5).setDepth(1001);

                this.tweens.add({
                    targets: floatText,
                    y: floatText.y - 50,
                    alpha: 0,
                    duration: 500,
                    onComplete: () => floatText.destroy()
                });

                // Action
                if (socket && roomId) {
                    socket.emit('boost', { roomId });
                } else {
                    console.warn('Boost failed: socket or roomId missing', { socket: !!socket, roomId });
                }
            }

            toggleButton(visible: boolean) {
                if (this.btnContainer) {
                    this.btnContainer.setVisible(visible);
                }
            }
        }

        class MainScene extends Phaser.Scene {
            private raceBackground!: RaceBackground;
            private horses: Horse[] = [];
            private luckyMoneyGroup!: Phaser.GameObjects.Group;
            private soundRunning?: Phaser.Sound.BaseSound;
            private soundEnd?: Phaser.Sound.BaseSound;
            private soundCollect?: Phaser.Sound.BaseSound;

            constructor() {
                super('MainScene');
            }

            preload() {
                this.load.image('bg', '/assets/race-background/race.png');
                
                HORSES_DATA.forEach(horse => {
                    this.load.spritesheet(`horse_running_${horse.id}`, horse.image!, {
                        frameWidth: 80,
                        frameHeight: 64
                    });
                });

                // Load Lucky Money
                for (let i = 1; i <= 8; i++) {
                    // Use key matching offline mode
                    const fileName = `Hong Bao S${i}.png`;
                    this.load.image(`lucky_money_s${i}`, `/assets/red-envelop/${fileName}`);
                }
                
                // Load Particles
                if (!this.textures.exists('particle')) {
                    const graphics = this.make.graphics({ x: 0, y: 0 });
                    graphics.fillStyle(0xfff700, 1);
                    graphics.fillCircle(4, 4, 4);
                    graphics.generateTexture('particle', 8, 8);
                    graphics.destroy(); // cleanup
                }
                if (!this.textures.exists('flare')) {
                    const graphics = this.make.graphics({ x: 0, y: 0 });
                    graphics.fillStyle(0xffffff, 1);
                    graphics.fillCircle(10, 10, 10);
                    graphics.generateTexture('flare', 20, 20);
                    graphics.destroy(); // cleanup
                }

                // Load Music
                this.load.audio('running', '/assets/music/running.mp3');
                this.load.audio('end', '/assets/music/end.mp3');
                this.load.audio('collect', '/assets/music/collect.mp3');
            }

            create() {
                sceneRef.current = this;
                
                // Clear Refs to avoid using destroyed objects from previous scene instance
                horsesRef.current.clear();
                if (luckyMoneysRef.current) luckyMoneysRef.current.clear();

                // Add Sounds
                if (this.cache.audio.exists('running')) {
                    this.soundRunning = this.sound.add('running', { loop: true, volume: 0.5 });
                }
                if (this.cache.audio.exists('end')) {
                    this.soundEnd = this.sound.add('end', { loop: false, volume: 1.0 });
                }
                if (this.cache.audio.exists('collect')) {
                    this.soundCollect = this.sound.add('collect', { loop: false, volume: 1.0 });
                }

                // Check initial state
                if (isRacing && this.soundRunning && !this.soundRunning.isPlaying) {
                    this.soundRunning.play();
                }

                // Background
                this.raceBackground = new RaceBackground(this, 0);
                const bgWidth = this.raceBackground.width;
                const bgHeight = this.raceBackground.height;
                
                // Setup RacePath config similar to Offline
                const winX = RacePath.SVG_END_X;
                const dynamicCenterY = bgHeight * 0.65;
                RacePath.setConfig(winX, dynamicCenterY);

                this.physics.world.setBounds(0, 0, bgWidth, bgHeight);
                this.cameras.main.setBounds(0, 0, bgWidth, bgHeight);
                
                // Dynamic Zoom
                if (isMobile && isPortrait) {
                    this.cameras.main.setZoom(0.8); // Zoom out for portrait
                } else {
                    this.cameras.main.setZoom(GameConstants.CAMERA_ZOOM_LEVEL);
                }

                this.luckyMoneyGroup = this.add.group();

                // Initial Players
                this.updatePlayers(players);

                // Camera Logic
                this.setupCamera();

                // Launch HUD
                if (!this.scene.get('HUDScene')) {
                    this.scene.launch('HUDScene');
                } else {
                    this.scene.launch('HUDScene'); // Ensure it starts
                }
            }

            updatePlayers(currentPlayers: any[]) {
                const isRacingCurrent = isRacingRef.current;
                console.log('updatePlayers called with:', currentPlayers.length, 'players. isRacing:', isRacingCurrent, 'horses:', this.horses.length);

                // If racing and already initialized, do not change horses to maintain consistency
                // This prevents late joiners from shifting horse colors/lanes for existing players
                if (isRacingCurrent && this.horses.length > 0) {
                    console.log('Skipping updatePlayers because race is in progress and horses exist');
                    return;
                }

                // Clear existing horses if re-assigning to ensure correct order/colors
                // Only if not racing to avoid glitching during race
                if (!isRacingCurrent) {
                    this.horses.forEach(h => h.destroy());
                    this.horses = [];
                    horsesRef.current.clear();
                }

                currentPlayers.forEach((p, index) => {
                    if (index >= HORSES_DATA.length) return;
                    
                        // Check if horse already exists for this player
                if (horsesRef.current.has(p.id)) {
                    const horse = horsesRef.current.get(p.id);
                    if (horse && p.position !== undefined) {
                            const trackLen = CORE_CONSTANTS.TRACK_LENGTH || 1000;
                            const progress = p.position / trackLen;
                            if (horse.updateToProgress) {
                                horse.updateToProgress(progress);
                            }
                    }
                    return;
                }

                // Defensive: Ensure HORSES_DATA has this index
                if (!HORSES_DATA[index]) {
                    console.warn(`No horse data for index ${index}`);
                    return;
                }

                const data = { ...HORSES_DATA[index] }; // Clone to avoid mutation issues
                // Update name
                data.name = p.username;
                
                // Calculate Y based on dynamicCenterY (logic reused from GamePhaser)
                // Ensure RacePath is initialized, if not fallback
                const laneY = RacePath.CENTER_BASE_Y + (data.positionIndex * GameConstants.BASE_GAP_HORSE_Y);
                
                // Ensure scene is ready
                if (!this.add) return;

                const horse = new Horse(this, 0, 0, data, 0);
                this.horses.push(horse);
                horsesRef.current.set(p.id, horse);
            });
            
            // Refresh camera if needed
            this.setupCamera();
        }

            setupCamera() {
                if (isHost) {
                    // Host follows leader (initially the first horse or any)
                    if (this.horses.length > 0) {
                        this.cameras.main.startFollow(this.horses[0] as any);
                    }
                } else if (myPlayerId) {
                    const myHorse = horsesRef.current.get(myPlayerId);
                    if (myHorse) {
                        this.cameras.main.startFollow(myHorse as any);
                    }
                }
            }

            updateLuckyMoneys(activeLuckyMoneys: any[]) {
            if (!this.luckyMoneyGroup) return; // Ensure group exists
            if (!Array.isArray(activeLuckyMoneys)) {
                console.warn('activeLuckyMoneys is not an array:', activeLuckyMoneys);
                return;
            }
                const currentIds = new Set<string>();

                activeLuckyMoneys.forEach(lm => {
                    currentIds.add(lm.id);
                    if (!luckyMoneysRef.current.has(lm.id)) {
                        // Create visual
                        
                        // Calculate Position based on Lane and Track Progress?
                        // Server sends 'position' (distance) and 'laneIndex'.
                        // We need to map (position, laneIndex) to (x, y).
                        // Reuse RacePath logic.
                        const trackLen = CORE_CONSTANTS.TRACK_LENGTH || 1000;
                        // Fix: Clamp progress to valid range [0, 1] to prevent getPoint null crash
                        // Backend might spawn lucky money slightly ahead of leader, potentially exceeding track length.
                        const rawProgress = lm.position / trackLen;
                        const progress = Math.min(Math.max(rawProgress, 0), 1);
                        const laneIndex = lm.laneIndex; // -2 to 2
                        
                        // Need RacePath instance or static helper? 
                        // Horse uses RacePath.getPathForLane(laneIndex).
                        try {
                            const path = RacePath.getPathForLane(laneIndex + 2); // 0-4
                            const point = path.getPoint(progress);

                            if (!point) {
                                console.warn('Point is null for lucky money:', { id: lm.id, progress, laneIndex });
                                return;
                            }
                            
                            const targetX = point.x;
                            const targetY = point.y;
    
                            // Mimic Offline Mode: Falls from top-right
                        const startX = targetX + 250;
                        const startY = targetY - 600;

                        // Defensive: Ensure luckyMoneysRef exists
                        if (!luckyMoneysRef.current) luckyMoneysRef.current = new Map();

                        // Random 1-8 to match loaded assets lucky_money_s1..8
                            const randomImg = 'lucky_money_s' + (Math.floor(Math.random() * 8) + 1);
    
                            // Defensive check
                        if (this.textures.exists(randomImg)) {
                            const lmImg = this.add.image(startX, startY, randomImg);
                            lmImg.setScale(0); // Start scale 0
                            lmImg.setDepth(5); // Layer 5
    
                            // Particle Trail (flare)
                            if (this.textures.exists('flare')) {
                                const particles = this.add.particles(0, 0, 'flare', {
                                    speed: 100,
                                    scale: { start: 0.5, end: 0 },
                                    blendMode: 'ADD',
                                    lifespan: 300,
                                    follow: lmImg
                                });
                                // Cleanup particles when done
                                this.time.delayedCall(2000, () => particles.destroy());
                            }
    
                            // Tween Falling
                            this.tweens.add({
                                targets: lmImg,
                                x: targetX,
                                y: targetY,
                                scale: 0.03, // Match offline scale
                                duration: 1500,
                                ease: 'Bounce.easeOut',
                                rotation: 720 * (Math.PI / 180),
                                onComplete: () => {
                                    // Breathing Effect
                                    this.tweens.add({
                                        targets: lmImg,
                                        scale: { from: 0.03, to: 0.036 },
                                        yoyo: true,
                                        repeat: -1,
                                        duration: 800,
                                        ease: 'Sine.easeInOut'
                                    });
    
                                    // Glow Effect
                                    if (this.textures.exists('flare')) {
                                        const glow = this.add.image(lmImg.x, lmImg.y, 'flare')
                                            .setScale(0.6)
                                            .setAlpha(0.5)
                                            .setDepth(4);
                                        
                                        this.tweens.add({
                                            targets: glow,
                                            alpha: 0.1,
                                            scale: 0.9,
                                            yoyo: true,
                                            repeat: -1,
                                            duration: 1000
                                        });
        
                                        lmImg.setData('glow', glow);
                                    }
                                }
                            });
    
                            if (luckyMoneysRef.current) {
                                luckyMoneysRef.current.set(lm.id, lmImg);
                            }
                            if (this.luckyMoneyGroup) {
                                this.luckyMoneyGroup.add(lmImg);
                            }
                        } else {
                            console.warn('Texture missing:', randomImg);
                        }
                        } catch (err) {
                            console.error('Error calculating lucky money position:', err);
                        }
                    }
                });

                // Remove collected/expired
                if (luckyMoneysRef.current) {
                    for (const [id, img] of luckyMoneysRef.current) {
                        if (!currentIds.has(id)) {
                            // Collected!
                            // Play particle effect at image location
                            if (this.textures.exists('particle')) {
                                const particles = this.add.particles(img.x, img.y, 'particle', {
                                    speed: { min: 50, max: 150 },
                                    angle: { min: 0, max: 360 },
                                    scale: { start: 1, end: 0 },
                                    lifespan: 500,
                                    gravityY: 200,
                                    quantity: 20,
                                    blendMode: 'ADD'
                                });
                                this.time.delayedCall(600, () => particles.destroy());
                            }

                            // Play Sound
                            if (this.soundCollect) {
                                this.soundCollect.play();
                            }

                            // Destroy Glow if exists
                            const glow = img.getData('glow');
                            if (glow) glow.destroy();

                            img.destroy();
                            luckyMoneysRef.current.delete(id);
                        }
                    }
                }
            }

            playEndSound() {
                if (this.soundRunning) this.soundRunning.stop();
                if (this.soundEnd) this.soundEnd.play();
            }

            startRace() {
                console.log('startRace called');
                if (this.soundRunning && !this.soundRunning.isPlaying) {
                    this.soundRunning.play();
                }
                this.game.events.emit('START_RACE_HUD');
            }

            stopRace() {
                console.log('stopRace called');
                if (this.soundRunning && this.soundRunning.isPlaying) {
                    this.soundRunning.stop();
                }
                this.game.events.emit('STOP_RACE_HUD');
            }

            update() {
                // Update Camera for Host to follow leader
                if (isHost) {
                    let maxPos = -1;
                    let leader: Horse | null = null;
                    this.horses.forEach(h => {
                        if (h.horseData.currentPos > maxPos) {
                            maxPos = h.horseData.currentPos;
                            leader = h;
                        }
                    });
                    if (leader) {
                        this.cameras.main.startFollow(leader as any);
                    }
                }
            }
        }

        const config: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            parent: containerRef.current,
            width: isMobile && isPortrait ? window.innerWidth : GameConstants.VIEWPORT_WIDTH,
            height: isMobile && isPortrait ? window.innerHeight : GameConstants.VIEWPORT_HEIGHT,
            scale: {
                mode: Phaser.Scale.FIT,
                autoCenter: Phaser.Scale.CENTER_BOTH
            },
            scene: [MainScene, HUDScene],
            physics: {
                default: 'arcade',
                arcade: {
                    debug: false
                }
            },
            transparent: true
        };

        const game = new Phaser.Game(config);
        gameRef.current = game;

        return () => {
            game.destroy(true);
            gameRef.current = null;
            sceneRef.current = null;
            horsesRef.current.clear();
            luckyMoneysRef.current.clear();
        };
    }, [isHost, myPlayerId, socket, roomId, isMobile, isPortrait]);

    // Socket Event Listeners
    useEffect(() => {
        if (!socket) return;

        const onRaceUpdate = (data: { raceState: Record<string, any>; luckyMoneys: any[]; serverTime: number }) => {
            const { raceState, luckyMoneys } = data;
            
            // Debug log every 60 frames (approx 2 sec)
            if (Math.random() < 0.02) {
                console.log('onRaceUpdate:', { 
                    playerCount: Object.keys(raceState).length, 
                    horseCount: horsesRef.current.size,
                    firstPlayerPos: Object.values(raceState)[0]?.position
                });
            }

            // Update Horses
            Object.entries(raceState).forEach(([socketId, playerState]) => {
                const horse = horsesRef.current.get(socketId);
                if (horse) {
                    const trackLen = CORE_CONSTANTS.TRACK_LENGTH || 1000;
                    const progress = playerState.position / trackLen;
                    horse.updateToProgress(progress);
                    
                    // Update Speed for HUD
                    if (myPlayerId && socketId === myPlayerId) {
                        gameRef.current?.events.emit('UPDATE_SPEED_HUD', playerState.speed);
                    }

                    // Update Money
                    if (playerState.money > horse.horseData.money) {
                        const diff = playerState.money - horse.horseData.money;
                        horse.collectMoney(diff);
                    }
                }
            });

            // Update React HUD State (Throttled)
            const now = Date.now();
            if (now - lastUpdateRef.current > 100) {
                const newStats: Record<string, any> = {};
                Object.entries(raceState).forEach(([id, p]: [string, any]) => {
                    newStats[id] = { 
                        speed: p.speed, 
                        rank: p.rank,
                        money: p.money
                    };
                });
                setRaceStats(newStats);
                lastUpdateRef.current = now;
            }

            // Update Lucky Moneys
            if (sceneRef.current && (sceneRef.current as any).updateLuckyMoneys) {
                (sceneRef.current as any).updateLuckyMoneys(luckyMoneys || []);
            }
        };

        const onGameOver = (data: any) => {
            console.log('Game Over', data);
            // Handle game over UI
            if (sceneRef.current) {
                (sceneRef.current as any).playEndSound();
            }
        };

        socket.on('race-update', onRaceUpdate);
        socket.on('game-over', onGameOver);

        return () => {
            socket.off('race-update', onRaceUpdate);
            socket.off('game-over', onGameOver);
        };
    }, [socket]);

    const sortedPlayers = [...players].sort((a, b) => {
        const rankA = raceStats[a.id]?.rank || 99;
        const rankB = raceStats[b.id]?.rank || 99;
        return rankA - rankB;
    });

    return (
        <div className={styles.gameContainer} style={{ position: 'relative' }}>
            {/* HUD Overlay */}
            <div style={{
                position: 'absolute',
                top: isMobile ? '10px' : '20px',
                left: isMobile ? '10px' : '20px',
                zIndex: 1000,
                pointerEvents: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
            }}>
                {/* Room ID Badge */}
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
                    ROOM: {roomId}
                </div>

                {/* Player Leaderboard */}
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
                        justifyContent: 'space-between',
                        borderBottom: '1px solid rgba(255,255,255,0.1)',
                        paddingBottom: '4px'
                    }}>
                        <span>Leaderboard</span>
                        <span>{sortedPlayers.length} Players</span>
                    </div>
                    {/* List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {sortedPlayers.map((p, index) => {
                         const stats = raceStats[p.id] || { speed: 0, rank: 0 };
                         return (
                            <div key={p.id} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: isMobile ? '12px' : '14px',
                                fontWeight: p.id === myPlayerId ? 'bold' : 'normal',
                                color: p.id === myPlayerId ? '#FFD700' : 'white',
                                padding: '2px 0'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ 
                                        width: '20px', 
                                        textAlign: 'center',
                                        color: stats.rank === 1 ? '#FFD700' : stats.rank === 2 ? '#C0C0C0' : stats.rank === 3 ? '#CD7F32' : '#fff',
                                        fontWeight: 'bold'
                                    }}>
                                        #{stats.rank || '-'}
                                    </span>
                                    <span style={{ 
                                        maxWidth: isMobile ? '80px' : '120px', 
                                        overflow: 'hidden', 
                                        textOverflow: 'ellipsis', 
                                        whiteSpace: 'nowrap' 
                                    }}>
                                        {p.username}
                                    </span>
                                </div>
                                <div style={{ color: '#00FF00', fontFamily: 'monospace' }}>
                                    {Math.round(stats.speed || 0)} <span style={{fontSize: '0.8em', color: '#888'}}>km/h</span>
                                </div>
                            </div>
                         );
                    })}
                    </div>
                </div>

                {/* Start Game / Waiting Status */}
                {!isRacing && (
                    <div style={{ marginTop: '5px', pointerEvents: 'auto' }}>
                        {isHost ? (
                            <button
                                onClick={onStartGame}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    backgroundColor: '#4CAF50',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: isMobile ? '16px' : '20px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                                    animation: 'pulse 2s infinite',
                                    textTransform: 'uppercase'
                                }}
                            >
                                Start Game
                            </button>
                        ) : (
                            <div style={{
                                color: '#4CAF50',
                                fontWeight: 'bold',
                                textAlign: 'center',
                                padding: '10px',
                                backgroundColor: 'rgba(0,0,0,0.7)',
                                borderRadius: '8px',
                                fontSize: isMobile ? '14px' : '16px',
                                backdropFilter: 'blur(4px)',
                                border: '1px solid #4CAF50'
                            }}>
                                WAITING FOR HOST...
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div ref={containerRef} className={styles.phaserContainer} />
        </div>
    );
};
