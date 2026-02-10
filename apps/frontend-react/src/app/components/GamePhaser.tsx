import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import styles from './Game.module.css';
import { Horse, HorseData } from './Horse';
import { RaceBackground } from './RaceBackground';
import { RacePath } from './RacePath';
import { GameConstants } from './GameConstants';

const HORSE_START_X = RacePath.SVG_START_X; // Sync with SVG Path
const MIDDLE_HORSE_START_RUNNING_X = HORSE_START_X; // Sync with SVG Path

const DEBUG_BACKGROUND_MODE = false; // Chế độ debug background

const HORSES_DATA: HorseData[] = [
    { id: 1, positionIndex: -2, name: 'Xích Thố', image: '/assets/horses/Horse_fullcolor_black_barebackriding.png', color: '#FF5722', baseLaneY: 0, startX: MIDDLE_HORSE_START_RUNNING_X + GameConstants.BASE_GAP_HORSE_X * 2, speed: 0, targetSpeed: 0, money: 0, finished: false, rank: 0, currentPos: 0, hasLuckyMoney: false },
    { id: 2, positionIndex: -1, name: 'Đích Lư', image: '/assets/horses/Horse_fullcolor_brown_barebackriding.png', color: '#FFC107', baseLaneY: 0, startX: MIDDLE_HORSE_START_RUNNING_X + GameConstants.BASE_GAP_HORSE_X, speed: 0, targetSpeed: 0, money: 0, finished: false, rank: 0, currentPos: 0, hasLuckyMoney: false },
    { id: 3, positionIndex: 0, name: 'Tuyệt Ảnh', image: '/assets/horses/Horse_fullcolor_white_barebackriding.png', color: '#2196F3', baseLaneY: 0, startX: MIDDLE_HORSE_START_RUNNING_X, speed: 0, targetSpeed: 0, money: 0, finished: false, rank: 0, currentPos: 0, hasLuckyMoney: false },
    { id: 4, positionIndex: 1, name: 'Bạch Long', image: '/assets/horses/Horse_fullcolor_paint_brown_barebackriding.png', color: '#EEEEEE', baseLaneY: 0, startX: MIDDLE_HORSE_START_RUNNING_X - GameConstants.BASE_GAP_HORSE_X, speed: 0, targetSpeed: 0, money: 0, finished: false, rank: 0, currentPos: 0, hasLuckyMoney: false },
    { id: 5, positionIndex: 2, name: 'Ô Vân', image: '/assets/horses/Horse_fullcolor_paint_beige_barebackriding.png', color: '#212121', baseLaneY: 0, startX: MIDDLE_HORSE_START_RUNNING_X - GameConstants.BASE_GAP_HORSE_X * 2, speed: 0, targetSpeed: 0, money: 0, finished: false, rank: 0, currentPos: 0, hasLuckyMoney: false },
];



export const GamePhaser: React.FC = () => {
    const gameRef = useRef<Phaser.Game | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [isRacing, setIsRacing] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [results, setResults] = useState<any[]>([]);

    useEffect(() => {
        if (!containerRef.current) return;

        class MainScene extends Phaser.Scene {
            private horses: Horse[] = [];
            private raceBackground!: RaceBackground;
            private luckyMoneyGroup!: Phaser.GameObjects.Group;
            private luckyMoneyPickedCounts: number[] = [0, 0, 0]; // Theo dõi số lượng đã lượm cho [10, 20, 50]
            private raceStarted = false;
            private raceFinished = false;
            private rankCounter = 1;
            private spawnTimer?: Phaser.Time.TimerEvent;
            private debugGraphics?: Phaser.GameObjects.Graphics;
            private pendingLuckyMoneys: { laneIndex: number, value: number }[] = [];
            private soundRunning?: Phaser.Sound.BaseSound;
            private soundEnd?: Phaser.Sound.BaseSound;
            private soundCollect?: Phaser.Sound.BaseSound;
            private lastCollectTime = 0; // Debounce collect sound
            private focusedHorse?: Horse; // Ngựa được chọn để focus camera
            private currentFollowTarget?: Phaser.GameObjects.GameObject; // Target hiện tại của Camera


            constructor() {
                super('MainScene');
            }

            preload() {
                this.load.image('bg', '/assets/race-background/race.png');
                
                // Load 8 mẫu bao lì xì
                for (let i = 1; i <= 8; i++) {
                    this.load.image(`lucky_money_s${i}`, `/assets/red-envelop/Hong Bao S${i}.png`);
                }

                HORSES_DATA.forEach(horse => {
                    this.load.spritesheet(`horse_running_${horse.id}`, horse.image!, {
                        frameWidth: 80,
                        frameHeight: 64
                    });
                });

                // Load Music
                this.load.audio('running', '/assets/music/running.mp3');
                this.load.audio('end', '/assets/music/end.mp3');
                this.load.audio('collect', '/assets/music/collect.mp3');
            }

            create() {
                // Tạo texture particle cho hiệu ứng
                if (!this.textures.exists('particle')) {
                    const graphics = this.make.graphics({ x: 0, y: 0 });
                    graphics.fillStyle(0xfff700, 1); // Màu vàng
                    graphics.fillCircle(4, 4, 4);
                    graphics.generateTexture('particle', 8, 8);
                }
                if (!this.textures.exists('flare')) {
                    const graphics = this.make.graphics({ x: 0, y: 0 });
                    graphics.fillStyle(0xffffff, 1);
                    graphics.fillCircle(10, 10, 10);
                    graphics.generateTexture('flare', 20, 20);
                }

                // Khởi tạo background thông qua component riêng
                // Truyền tạm 0 vào constructor vì centerY sẽ được tính sau
                this.raceBackground = new RaceBackground(this, 0);

                // Cập nhật World Bounds theo kích thước thật của Background
                const bgWidth = this.raceBackground.width;
                const bgHeight = this.raceBackground.height;
                
                // --- LOGIC ĐỘNG: Cập nhật thông số đường đua theo ảnh nền ---
                const trackLength = bgWidth;
                // WinX should match the end of the SVG Path to ensure horses stop at the finish line
                const winX = RacePath.SVG_END_X; 
                
                // Tính toán Center Y động dựa trên chiều cao background (Khoảng 65% từ trên xuống)
                // Lưu ý: RacePath có tọa độ Y riêng (khoảng 400-500). 
                // Nếu dynamicCenterY khác xa so với Path Y, laneOffset sẽ lớn.
                const dynamicCenterY = bgHeight * 0.65;
                
                // Cập nhật RacePath config
                RacePath.setConfig(winX, dynamicCenterY);
                
                // Tính lại tốc độ cơ bản (Base Speed)
                // Quãng đường = Đích - Xuất phát (lấy trung bình khoảng 800)
                const runDistance = winX - MIDDLE_HORSE_START_RUNNING_X;
                
                if (runDistance <= 0) {
                    console.error(`[CRITICAL] Background width (${bgWidth}px) is too small! Must be > ${MIDDLE_HORSE_START_RUNNING_X + 200}px`);
                }

                const baseSpeed = Math.max(0, runDistance / GameConstants.RACE_DURATION);
                
                console.log(`Dynamic Track Config: Width=${bgWidth}, Height=${bgHeight}, WinX=${winX}, CenterY=${dynamicCenterY}, Speed=${baseSpeed}`);
                
                if (bgWidth > RacePath.SVG_END_X + 100) {
                     console.warn(`[WARNING] Background width (${bgWidth}) is much larger than SVG Path End (${RacePath.SVG_END_X}). The path might be too short or scaled incorrectly.`);
                }

                // Set Physics World Bounds khớp với Background Size
                this.physics.world.setBounds(0, 0, bgWidth, bgHeight);

                if (DEBUG_BACKGROUND_MODE) {
                    // Chế độ debug: Zoom out để nhìn toàn cảnh, không khởi tạo game logic
                    // Zoom để vừa chiều ngang background
                    const zoomLevel = GameConstants.VIEWPORT_WIDTH / bgWidth; 
                    this.cameras.main.setZoom(zoomLevel); 
                    this.cameras.main.centerOn(bgWidth / 2, bgHeight / 2);
                    
                    console.log('DEBUG MODE: Background View Only. Size:', bgWidth, bgHeight);
                    return; // Dừng tại đây, không init ngựa hay logic game
                }

                this.luckyMoneyGroup = this.add.group();

                this.initHorses(baseSpeed, dynamicCenterY);

                // Set default Zoom
                this.cameras.main.setZoom(GameConstants.CAMERA_ZOOM_LEVEL);

                // Auto Zoom for Mobile: Nếu màn hình nhỏ, có thể giảm bớt zoom nếu cần
                // Nhưng user yêu cầu zoom to, nên ưu tiên giữ zoom to
                const isMobile = window.innerWidth < 768;
                if (isMobile) {
                    this.cameras.main.setZoom(GameConstants.CAMERA_ZOOM_LEVEL * 0.8); // Giảm nhẹ cho mobile
                }

                // QUAN TRỌNG: Mở rộng giới hạn camera (Bounds) để cho phép camera di chuyển thoải mái
                // Set bounds rộng hơn background một chút để có thể center vào các cạnh
                const padding = 1000;
                this.cameras.main.setBounds(-padding, -padding, bgWidth + padding * 2, bgHeight + padding * 2);

                // Set camera position immediately to the middle horse to ensure visibility on load
                const middleHorse = this.horses.find(h => h.horseData.positionIndex === 0);
                if (middleHorse) {
                    // Sử dụng centerOn để Phaser tự động tính toán scrollX/scrollY dựa trên Zoom hiện tại
                    this.cameras.main.centerOn(middleHorse.x, middleHorse.y);
                }
                
                this.game.events.on('START_RACE', this.startRace, this);
                this.game.events.on('RESET_RACE', this.resetRace, this);

                // Vẽ debug path nếu cần (Mặc định ẩn, bật lên nếu user muốn kiểm tra)
                this.drawDebugPath();

                // Init Sounds
                // Lưu tham chiếu sound vào biến class để tránh bị GC
                this.soundRunning = this.sound.add('running', { loop: true, volume: 0.5 });
                this.soundEnd = this.sound.add('end', { loop: false, volume: 0.8 });
                this.soundCollect = this.sound.add('collect', { loop: false, volume: 1.0 });

                // Unlock audio context ngay khi user click (nếu trình duyệt block)
                if (this.sound.locked) {
                    this.sound.once('unlocked', () => {
                        console.log('Audio unlocked');
                    });
                }

                // Interaction: Click vào ngựa để focus camera
                this.input.on('gameobjectdown', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
                    if (gameObject instanceof Horse) {
                        this.focusedHorse = gameObject as Horse;
                    }
                });

                // Click vùng trống để reset về Auto Focus (Leader)
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
                
                // Draw all 5 lanes to verify alignment
                const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0x00ffff];
                
                console.log('--- LANE LENGTHS DEBUG ---');
                for (let i = 0; i < 5; i++) {
                    this.debugGraphics.lineStyle(4, colors[i], 0.5);
                    const path = RacePath.getPathForLane(i);
                    path.draw(this.debugGraphics);
                    console.log(`Lane ${i} (ID ${i-2}): ${path.getLength().toFixed(2)} px`);
                }
                console.log('--------------------------');
            }

            private initHorses(baseSpeed: number, centerY: number) {
                this.horses.forEach(h => h.destroy());
                this.horses = [];
                
                HORSES_DATA.forEach((h, index) => {
                    // Tính toán baseLaneY dựa trên centerY động
                    const laneY = centerY + (h.positionIndex * GameConstants.BASE_GAP_HORSE_Y);
                    
                    const hData: HorseData = {
                        ...h,
                        baseLaneY: laneY, // Override baseLaneY
                        // startX giữ nguyên logic cũ hoặc cũng cần scale?
                        // Tạm thời giữ nguyên logic startX quanh MIDDLE_HORSE_START_RUNNING_X
                        // Nếu muốn dynamic startX thì cần logic thêm.
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
                // Watchdog: Đảm bảo Audio Context luôn chạy
                const soundManager = this.sound as Phaser.Sound.WebAudioSoundManager;
                if (soundManager.context && soundManager.context.state === 'suspended') {
                    soundManager.context.resume();
                }

                // Watchdog: Đảm bảo nhạc nền không bị tắt giữa chừng
                if (this.raceStarted && !this.raceFinished && this.soundRunning && !this.soundRunning.isPlaying) {
                     this.soundRunning.play();
                }

                // Game Logic Update
                if (this.raceStarted && !this.raceFinished) {
                    let allFinished = true;
                    const dt = delta / 1000;

                    this.horses.forEach((horse) => {
                        if (horse.horseData.finished) return;

                        allFinished = false;

                        // Gọi logic cập nhật của riêng chú ngựa
                        horse.updateHorse(time, dt);

                        // Check về đích (Chỉ gọi một lần khi rank chưa được set)
                        if (horse.horseData.finished && horse.horseData.rank === 0) {
                            const rank = this.rankCounter++;
                            const isWinner = rank === 1;
                            
                            // Rule: con nào về đích trước sẽ đc nhân đôi số tiền lụm đc
                            if (isWinner && horse.horseData.money > 0) {
                                const originalMoney = horse.horseData.money;
                                horse.horseData.money *= 2;
                                console.log(`Winner ${horse.horseData.name} doubled money: ${originalMoney} -> ${horse.horseData.money}`);
                                
                                // Cập nhật text hiển thị tiền (nếu cần)
                                horse.updateMoneyText();
                            }

                            horse.setFinished(rank, isWinner);
                        }

                        // Va chạm với lì xì - Tối ưu hóa: Dùng Magnet Logic + Distance Check
                        // Logic mới: Nếu ngựa chạy qua lì xì được assign cho lane của mình -> Auto Magnet
                        if (!horse.horseData.hasLuckyMoney) {
                            const hX = horse.x;
                            const hY = horse.y - 40; 
                            
                            this.luckyMoneyGroup.getChildren().forEach((lm: any) => {
                                if (lm.getData('beingCollected')) return; // Đang được ai đó nhặt rồi

                                // 1. Kiểm tra Magnet (Hút về phía ngựa cùng lane)
                                const lmLane = lm.getData('laneIndex');
                                const isSameLane = lmLane === horse.horseData.positionIndex;
                                
                                // Nếu cùng lane và khoảng cách X đủ gần (tầm nhìn xa)
                                const distSq = (hX - lm.x) ** 2 + (hY - lm.y) ** 2;
                                
                                // Magnet Range: 300px (tầm xa) nếu cùng lane, 60px (gần) nếu khác lane
                                const magnetRangeSq = isSameLane ? 90000 : 3600; 

                                if (distSq < magnetRangeSq) {
                                    // Nếu chưa kích hoạt magnet, kích hoạt ngay
                                    if (!lm.getData('isMagneting')) {
                                        lm.setData('isMagneting', true);
                                        lm.setData('targetHorse', horse); // Khóa mục tiêu
                                    }
                                }

                                // 2. Logic Bay về phía ngựa (Homing Missile)
                                if (lm.getData('isMagneting') && lm.getData('targetHorse') === horse) {
                                    // Di chuyển LM về phía ngựa
                                    const speed = 15; // Tốc độ bay
                                    const angle = Phaser.Math.Angle.Between(lm.x, lm.y, hX, hY);
                                    lm.x += Math.cos(angle) * speed;
                                    lm.y += Math.sin(angle) * speed;
                                    
                                    // Nếu đã rất gần -> Collect
                                    if (distSq < 1600) { // 40px
                                        lm.setData('beingCollected', true);
                                        this.collectLuckyMoney(horse, lm);
                                    }
                                }
                            });
                        }
                    });

                    if (allFinished) {
                        this.raceFinished = true;
                        this.raceStarted = false;
                        
                        // Stop running sound and play end sound
                        if (this.soundRunning && this.soundRunning.isPlaying) {
                            this.soundRunning.stop();
                        }
                        if (this.soundEnd) {
                            this.soundEnd.play();
                        }

                        if (this.spawnTimer) this.spawnTimer.remove();
                        window.dispatchEvent(new CustomEvent('RACE_FINISHED', { detail: this.horses.map(h => h.horseData) }));
                    }
                }

                // Camera Logic: Follow Focus or Leader
                // Chạy mọi lúc, kể cả khi chưa đua hoặc đã đua xong
                let targetHorse = this.focusedHorse;
                
                // Nếu không có ngựa được chọn, follow ngựa dẫn đầu (Leader)
                if (!targetHorse && this.horses.length > 0) {
                    targetHorse = this.getLeadingHorse();
                }

                if (targetHorse) {
                    // Nếu target thay đổi, cập nhật camera follow
                    if (this.currentFollowTarget !== targetHorse) {
                        this.currentFollowTarget = targetHorse;
                        
                        // Sử dụng startFollow của Phaser để tự động center vào target
                        // Lerp 0.1 để camera di chuyển mượt mà
                        this.cameras.main.startFollow(targetHorse, true, 0.1, 0.1);
                    }
                }
            }

            private collectLuckyMoney(horse: Horse, lm: Phaser.GameObjects.Image) {
                // Play collect sound with debounce
                const now = this.time.now;
                if (this.soundCollect && (now - this.lastCollectTime > 100)) {
                    this.soundCollect.play();
                    this.lastCollectTime = now;
                }

                // Lấy giá trị tiền đã được gán sẵn
                const value = lm.getData('value') || 10;
                
                // Cập nhật thống kê (để debug hoặc hiển thị nếu cần)
                const valueIndex = GameConstants.LUCKY_MONEY_VALUES.indexOf(value);
                if (valueIndex !== -1) {
                    this.luckyMoneyPickedCounts[valueIndex]++;
                }

                horse.collectMoney(value);

                // Hủy hiệu ứng glow nếu có
                const glow = lm.getData('glow');
                if (glow) glow.destroy();

                // Hiệu ứng nổ khi ăn
                const particles = this.add.particles(lm.x, lm.y, 'particle', {
                    speed: { min: 50, max: 150 },
                    angle: { min: 0, max: 360 },
                    scale: { start: 1, end: 0 },
                    lifespan: 500,
                    gravityY: 200,
                    quantity: 20,
                    blendMode: 'ADD'
                });
                
                // Tự hủy particles sau khi chạy xong
                this.time.delayedCall(600, () => {
                    particles.destroy();
                });

                // Hiệu ứng chữ bay lên
                const text = this.add.text(lm.x, lm.y - 20, `+${value}k`, {
                    fontSize: '24px',
                    color: '#FFD700',
                    stroke: '#000000',
                    strokeThickness: 3,
                    fontStyle: 'bold'
                }).setOrigin(0.5).setDepth(20); // Layer 20: Text Effect

                this.tweens.add({
                    targets: text,
                    y: text.y - 100,
                    alpha: 0,
                    duration: 1000,
                    ease: 'Power2',
                    onComplete: () => text.destroy()
                });

                lm.destroy();
            }

            private startRace() {
                this.raceStarted = true;
                this.raceFinished = false;
                this.rankCounter = 1;

                // Play running sound
                if (this.soundRunning) {
                    this.soundRunning.play();
                }

                // Kích hoạt animation chạy cho tất cả ngựa
                this.horses.forEach(h => h.playRun());
                
                // Chuẩn bị danh sách lì xì sẽ rớt
                this.prepareLuckyMoneyQueue();

                // Timer rơi lì xì: Rải rác quanh 50% thời gian đua
                // Tổng thời gian đua là RACE_DURATION (25s).
                // 50% là 12.5s. Rải từ 40% đến 60% (10s -> 15s).
                const totalItems = this.pendingLuckyMoneys.length;
                
                const startRatio = 0.4; // 40%
                const endRatio = 0.6;   // 60%
                
                const startTime = GameConstants.RACE_DURATION * startRatio * 1000;
                const endTime = GameConstants.RACE_DURATION * endRatio * 1000;
                const availableTime = endTime - startTime;
                
                const interval = availableTime / Math.max(1, totalItems);

                this.spawnTimer = this.time.addEvent({
                    delay: interval,
                    callback: () => {
                        if (!this.raceStarted || this.raceFinished) return;
                        this.spawnLuckyMoneyBatch(1);
                    },
                    repeat: totalItems - 1,
                    startAt: -startTime // Delay start
                });
            }

            private prepareLuckyMoneyQueue() {
                // 1. Tạo danh sách mệnh giá
                const values: number[] = [];
                // Quotas: [6, 8, 1] tương ứng với [10, 20, 50]
                const quotas = GameConstants.GET_LUCKY_MONEY_QUOTAS(5); 
                
                const baseValues = GameConstants.LUCKY_MONEY_VALUES; // Loại bỏ 100k
                
                baseValues.forEach((val, idx) => {
                    const count = quotas[idx] || 0;
                    for (let i = 0; i < count; i++) {
                        values.push(val);
                    }
                });

                // Shuffle values
                Phaser.Utils.Array.Shuffle(values);

                // 2. Tạo danh sách làn đảm bảo phân phối đều
                // 5 lanes: [-2, -1, 0, 1, 2]
                const baseLanes = [-2, -1, 0, 1, 2];
                let lanes: number[] = [];
                
                // Lặp lại baseLanes cho đến khi đủ số lượng values
                while (lanes.length < values.length) {
                    lanes = lanes.concat(baseLanes);
                }
                
                // Cắt cho vừa đủ length
                lanes = lanes.slice(0, values.length);
                
                // Shuffle lanes
                Phaser.Utils.Array.Shuffle(lanes);

                // 3. Ghép làn và giá trị vào queue
                this.pendingLuckyMoneys = lanes.map((laneIdx, i) => ({
                    laneIndex: laneIdx,
                    value: values[i]
                }));
                
                console.log('Prepared Lucky Moneys:', this.pendingLuckyMoneys.length);
            }

            private spawnLuckyMoneyBatch(count: number) {
                for (let i = 0; i < count; i++) {
                    if (this.pendingLuckyMoneys.length === 0) break;
                    const item = this.pendingLuckyMoneys.pop();
                    if (item) {
                        this.spawnSingleLuckyMoney(item.laneIndex, item.value);
                    }
                }
            }

            private spawnSingleLuckyMoney(laneIndex: number, value: number) {
                // 1. Tính toán vị trí rớt
                // Start X (trên trời) - Phải nằm phía trước Camera một chút
                const startX = this.cameras.main.scrollX + GameConstants.VIEWPORT_WIDTH * 0.8 + Phaser.Math.Between(0, 100);
                
                // Final X (tiếp đất): Bay lùi lại 250px so với startX
                const finalX = startX - 250;

                // 2. Lấy path của lane tương ứng để tính toán chính xác
                // LaneIndex: -2..2 -> 0..4
                const path = RacePath.getPathForLane(laneIndex + 2);
                
                // 3. Lấy tọa độ Y tại vị trí tiếp đất (finalX)
                // Vì đã lấy path cụ thể của lane, nên centerY chính là Y của lane đó
                const targetY = RacePath.getCenterYAtX(path, finalX);

                // 4. Không cần tính offset thủ công nữa vì đã dùng custom path
                // Target X giữ nguyên là finalX (hoặc điều chỉnh nhẹ nếu cần vuông góc, nhưng không đáng kể)
                const targetX = finalX;
                
                const startY = targetY - 600; // Rớt từ trên cao hơn chút

                // Chọn ngẫu nhiên 1 trong 8 mẫu bao lì xì
                const skinIndex = Phaser.Math.Between(1, 8);
                const lm = this.add.image(startX, startY, `lucky_money_s${skinIndex}`).setScale(0); // Start scale 0
                lm.setDepth(5); // Layer 5: Lucky Money
                
                // Gán giá trị tiền và laneIndex để xử lý magnet
                lm.setData('value', value);
                lm.setData('laneIndex', laneIndex);
                lm.setData('isMagneting', false);
                
                this.luckyMoneyGroup.add(lm);

                // Hiệu ứng Particle Trail (đuôi sao chổi)
                const particles = this.add.particles(0, 0, 'flare', {
                    speed: 100,
                    scale: { start: 0.5, end: 0 },
                    blendMode: 'ADD',
                    lifespan: 300,
                    follow: lm
                });

                // Tween Rớt xuống - Tăng tốc độ rơi (1.5s) để kịp đón ngựa
                this.tweens.add({
                    targets: lm,
                    y: targetY,
                    x: targetX, // Bay tới đích đã tính toán chuẩn
                    scale: 0.03, // Giảm còn 30% so với 0.1 cũ (0.1 * 0.3 = 0.03)
                    duration: 1500, // Giảm từ 2500 xuống 1500
                    ease: 'Bounce.easeOut',
                    rotation: 720 * (Math.PI / 180), // Xoay 2 vòng
                    onComplete: () => {
                        particles.destroy(); // Tắt particle khi rớt xong
                        lm.setData('landed', true); // Đánh dấu đã tiếp đất
                        
                        // Hiệu ứng "thở" (Idle animation)
                        this.tweens.add({
                            targets: lm,
                            scale: { from: 0.03, to: 0.036 },
                            yoyo: true,
                            repeat: -1,
                            duration: 800,
                            ease: 'Sine.easeInOut'
                        });

                        // Hiệu ứng hào quang dưới đất (Ground glow)
                        // Giảm scale glow theo tỉ lệ lì xì (chia 3)
                        const glow = this.add.image(lm.x, lm.y, 'flare').setScale(0.6).setAlpha(0.5).setDepth(4); // Layer 4: Glow (Below LM)
                        this.tweens.add({
                            targets: glow,
                            alpha: 0.1,
                            scale: 0.9,
                            yoyo: true,
                            repeat: -1,
                            duration: 1000
                        });
                        // Gắn glow vào lm để khi lm bị destroy thì glow cũng mất? 
                        // Không, lm là Image, không phải Container.
                        // Ta cần quản lý glow riêng hoặc đưa vào Container.
                        // Đơn giản nhất: Gán glow vào data của lm để destroy trong collectLuckyMoney
                        lm.setData('glow', glow);
                    }
                });
            }

            private resetRace() {
                // Stop all sounds before restart
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
            width: GameConstants.VIEWPORT_WIDTH,
                height: GameConstants.VIEWPORT_HEIGHT,
            backgroundColor: '#87CEEB', // Sky blue fallback
            physics: {
                default: 'arcade',
                arcade: {
                    gravity: { x: 0, y: 0 },
                    debug: false
                }
            },
            scene: MainScene,
            audio: {
                disableWebAudio: false,
                noAudio: false
            },
            scale: {
                mode: Phaser.Scale.FIT,
                autoCenter: Phaser.Scale.CENTER_BOTH
            }
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
            <div ref={containerRef} style={{ width: GameConstants.VIEWPORT_WIDTH, height: GameConstants.VIEWPORT_HEIGHT, margin: '0 auto', borderRadius: '12px', overflow: 'hidden' }} />

            {isFinished && ( 
                <div className={styles.results}>
                    <h2>Kết quả chung cuộc 🏆</h2>
                    {results.sort((a, b) => (a.rank || 99) - (b.rank || 99)).map(horse => (
                        <div key={horse.id} className={styles.rankItem}>
                            <span className={horse.rank === 1 ? styles.rank1 : horse.rank === 2 ? styles.rank2 : styles.rank3}>
                                #{horse.rank} {horse.name}
                            </span>
                            <span>🧧 {horse.money.toLocaleString()}k {horse.rank === 1 && horse.money > 0 && <span style={{ color: '#FFD700', fontWeight: 'bold', marginLeft: '5px', animation: 'pulse 1s infinite' }}>(x2 🏆)</span>}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
