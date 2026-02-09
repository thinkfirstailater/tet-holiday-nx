import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import styles from './Game.module.css';
import { Horse, HorseData } from './Horse';
import { RaceBackground } from './RaceBackground';
import { RacePath } from './RacePath';
const TRACK_LENGTH = 3000; // Phóng lớn chiều dài đường đua để đạt ~15s
const VIEWPORT_WIDTH = 900;
const VIEWPORT_HEIGHT = 600;
const HORSE_START_X = 100;
const WIN_X = 2800;
const RACE_DURATION = 25; // Giây
const BASE_SPEED = (WIN_X - HORSE_START_X) / RACE_DURATION;
const BASE_GAP_HORSE_X = 50
const BASE_GAP_HORSE_Y = 20
const MIDDLE_HORSE_START_RUNNING_X = 800;
const MIDDLE_HORSE_START_RUNNING_Y = 1250; // Điều chỉnh lại Y để khớp với hệ tọa độ (0,0) của ảnh đã zoom (Dịch xuống 50px)

const DEBUG_BACKGROUND_MODE = false; // Chế độ debug background

const LUCKY_MONEY_VALUES = [10, 20, 50]; // Chỉ giữ 3 mệnh giá
// Hàm tính hạn ngạch (quota) cho 15 bao
// 10k: 6 bao (~40%)
// 20k: 8 bao (~53%)
// 50k: 1 bao (Unique - 6.6%)
const GET_LUCKY_MONEY_QUOTAS = (N: number) => [6, 8, 1]; 

const HORSES_DATA: HorseData[] = [
    { id: 1, positionIndex: -2, name: 'Xích Thố', image: '/assets/horses/Horse_fullcolor_black_barebackriding.png', color: '#FF5722', baseLaneY: MIDDLE_HORSE_START_RUNNING_Y - BASE_GAP_HORSE_Y * 2, startX: MIDDLE_HORSE_START_RUNNING_X + BASE_GAP_HORSE_X * 2, speed: 0, targetSpeed: 0, money: 0, finished: false, rank: 0, currentPos: 0, hasLuckyMoney: false },
    { id: 2, positionIndex: -1, name: 'Đích Lư', image: '/assets/horses/Horse_fullcolor_brown_barebackriding.png', color: '#FFC107', baseLaneY: MIDDLE_HORSE_START_RUNNING_Y - BASE_GAP_HORSE_Y, startX: MIDDLE_HORSE_START_RUNNING_X + BASE_GAP_HORSE_X, speed: 0, targetSpeed: 0, money: 0, finished: false, rank: 0, currentPos: 0, hasLuckyMoney: false },
    { id: 3, positionIndex: 0, name: 'Tuyệt Ảnh', image: '/assets/horses/Horse_fullcolor_white_barebackriding.png', color: '#2196F3', baseLaneY: MIDDLE_HORSE_START_RUNNING_Y, startX: MIDDLE_HORSE_START_RUNNING_X, speed: 0, targetSpeed: 0, money: 0, finished: false, rank: 0, currentPos: 0, hasLuckyMoney: false },
    { id: 4, positionIndex: 1, name: 'Bạch Long', image: '/assets/horses/Horse_fullcolor_paint_brown_barebackriding.png', color: '#EEEEEE', baseLaneY: MIDDLE_HORSE_START_RUNNING_Y + BASE_GAP_HORSE_Y, startX: MIDDLE_HORSE_START_RUNNING_X - BASE_GAP_HORSE_X, speed: 0, targetSpeed: 0, money: 0, finished: false, rank: 0, currentPos: 0, hasLuckyMoney: false },
    { id: 5, positionIndex: 2, name: 'Ô Vân', image: '/assets/horses/Horse_fullcolor_paint_beige_barebackriding.png', color: '#212121', baseLaneY: MIDDLE_HORSE_START_RUNNING_Y + BASE_GAP_HORSE_Y * 2, startX: MIDDLE_HORSE_START_RUNNING_X - BASE_GAP_HORSE_X * 2, speed: 0, targetSpeed: 0, money: 0, finished: false, rank: 0, currentPos: 0, hasLuckyMoney: false },
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

            constructor() {
                super('MainScene');
            }

            preload() {
                this.load.image('bg', '/assets/race-background/race.png');
                this.load.image('bg-lane', '/assets/race-background/race-lane.png');
                
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

                // Thế giới rộng hơn để đua
                this.physics.world.setBounds(0, 0, TRACK_LENGTH, VIEWPORT_HEIGHT);

                // Khởi tạo background thông qua component riêng, căn giữa theo làn ngựa chính
                this.raceBackground = new RaceBackground(this, TRACK_LENGTH, VIEWPORT_HEIGHT, MIDDLE_HORSE_START_RUNNING_Y);

                if (DEBUG_BACKGROUND_MODE) {
                    // Chế độ debug: Zoom out để nhìn toàn cảnh, không khởi tạo game logic
                    const zoomLevel = VIEWPORT_WIDTH / (TRACK_LENGTH * 1.5); // Ước lượng zoom để vừa chiều ngang
                    this.cameras.main.setZoom(zoomLevel); // Zoom nhỏ lại
                    this.cameras.main.scrollX = 1500; // Ra giữa map
                    this.cameras.main.scrollY = 1000;
                    
                    console.log('DEBUG MODE: Background View Only');
                    return; // Dừng tại đây, không init ngựa hay logic game
                }

                this.luckyMoneyGroup = this.add.group();

                this.initHorses();

                // Mở rộng giới hạn camera (Bounds) để cho phép scrollY có thể xích xuống (giá trị dương)
                this.cameras.main.setBounds(0, -1000, TRACK_LENGTH, VIEWPORT_HEIGHT + 2000);
                
                this.game.events.on('START_RACE', this.startRace, this);
                this.game.events.on('RESET_RACE', this.resetRace, this);

                // Vẽ debug path nếu cần (Mặc định ẩn, bật lên nếu user muốn kiểm tra)
                // this.drawDebugPath();

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
            }

            private drawDebugPath() {
                if (this.debugGraphics) this.debugGraphics.clear();
                this.debugGraphics = this.add.graphics();
                this.debugGraphics.lineStyle(4, 0xff0000, 0.5);
                
                const path = RacePath.createPath();
                path.draw(this.debugGraphics);
            }

            private initHorses() {
                this.horses.forEach(h => h.destroy());
                this.horses = [];
                
                HORSES_DATA.forEach((h, index) => {
                    const hData: HorseData = {
                        ...h,
                        speed: BASE_SPEED + Phaser.Math.Between(-20, 20),
                        targetSpeed: BASE_SPEED,
                    };

                    const horse = new Horse(this, hData.startX, hData.baseLaneY, hData, BASE_SPEED);
                    this.horses.push(horse);
                });
        }

            private getLeadingHorse() {
                return this.horses.reduce((prev, curr) => (curr.x > prev.x ? curr : prev), this.horses[0]);
            }

            update(time: number, delta: number) {
                if (!this.raceStarted || this.raceFinished) {
                    // Khi chưa bắt đầu hoặc đã kết thúc, vẫn giữ camera ở vị trí ngựa chính giữa
                    const middleHorse = this.horses.find(h => h.horseData.positionIndex === 0);
                    if (middleHorse) {
                        this.cameras.main.scrollX = middleHorse.x - VIEWPORT_WIDTH / 2;
                        this.cameras.main.scrollY = middleHorse.y - VIEWPORT_HEIGHT / 2;
                    }
                    return;
                }

                let allFinished = true;
                const dt = delta / 1000;

                // Watchdog: Đảm bảo Audio Context luôn chạy
                const soundManager = this.sound as Phaser.Sound.WebAudioSoundManager;
                if (soundManager.context && soundManager.context.state === 'suspended') {
                    soundManager.context.resume();
                }

                // Watchdog: Đảm bảo nhạc nền không bị tắt giữa chừng
                if (this.raceStarted && !this.raceFinished && this.soundRunning && !this.soundRunning.isPlaying) {
                     this.soundRunning.play();
                }

                this.horses.forEach((horse) => {
                    if (horse.horseData.finished) return;

                    allFinished = false;

                    // Gọi logic cập nhật của riêng chú ngựa
                    horse.updateHorse(time, dt);

                    // Check về đích (Chỉ gọi một lần khi rank chưa được set)
                    if (horse.horseData.finished && horse.horseData.rank === 0) {
                        const rank = this.rankCounter++;
                        const isWinner = rank === 1;
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

                // Camera follow mượt mà theo con ngựa chính giữa (positionIndex = 0) theo cả 2 trục
                const middleHorse = this.horses.find(h => h.horseData.positionIndex === 0);
                if (middleHorse) {
                    const targetX = middleHorse.x - VIEWPORT_WIDTH / 2;
                    const targetY = middleHorse.y - VIEWPORT_HEIGHT / 2;
                    
                    this.cameras.main.scrollX = Math.round(Phaser.Math.Linear(this.cameras.main.scrollX, targetX, 0.1));
                    this.cameras.main.scrollY = Math.round(Phaser.Math.Linear(this.cameras.main.scrollY, targetY, 0.1));
                }

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
                const valueIndex = LUCKY_MONEY_VALUES.indexOf(value);
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
                }).setOrigin(0.5);

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

                // Timer rơi lì xì: Rải rác từ giây thứ 2 đến giây thứ (End - 3)
                // Tổng thời gian đua là RACE_DURATION (25s).
                // Thời gian spawn khả dụng: 20s (từ s thứ 3 đến s thứ 23)
                const totalItems = this.pendingLuckyMoneys.length;
                const availableTime = (RACE_DURATION - 5) * 1000; 
                const interval = availableTime / totalItems;

                this.spawnTimer = this.time.addEvent({
                    delay: interval,
                    callback: () => {
                        if (!this.raceStarted || this.raceFinished) return;
                        this.spawnLuckyMoneyBatch(1);
                    },
                    repeat: totalItems - 1,
                    startAt: -3000 // Start after 3s delay
                });
            }

            private prepareLuckyMoneyQueue() {
                // 1. Tạo danh sách mệnh giá
                const values: number[] = [];
                // Quotas: [6, 8, 1] tương ứng với [10, 20, 50]
                const quotas = GET_LUCKY_MONEY_QUOTAS(5); 
                
                const baseValues = [10, 20, 50]; // Loại bỏ 100k
                
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
                // Start X (trên trời)
                const startX = this.cameras.main.scrollX + VIEWPORT_WIDTH + 100 + Phaser.Math.Between(0, 100);
                
                // Final X (tiếp đất): Bay lùi lại 250px so với startX
                const finalX = startX - 250;

                // 2. Tạo path tạm để tính toán
                const path = RacePath.createPath();
                
                // 3. Lấy tọa độ Y trung tâm tại vị trí tiếp đất (finalX)
                // Quan trọng: Phải tính Y tại finalX chứ không phải startX vì đường chạy cong
                const centerY = RacePath.getCenterYAtX(path, finalX);

                // 4. Tính toán Normal Vector tại finalX để offset vuông góc với đường chạy
                // Lấy mẫu 2 điểm nhỏ quanh finalX để tính tangent
                const y1 = RacePath.getCenterYAtX(path, finalX - 5);
                const y2 = RacePath.getCenterYAtX(path, finalX + 5);
                const dx = 10;
                const dy = y2 - y1;
                const angle = Math.atan2(dy, dx); // Góc của đường chạy
                
                // Vector pháp tuyến (Normal) vuông góc với tangent (-dy, dx) hoặc xoay 90 độ
                // Trong hệ tọa độ màn hình (Y xuống), nếu tangent là (1, 0) -> 0 độ. Normal là (0, 1) -> 90 độ.
                // Lane index: -2 (Top) -> 2 (Bottom).
                // Offset theo trục Y local của lane sẽ chiếu lên trục Y world bằng cos(angle)?
                // Đơn giản hơn: Xoay vector (0, offset) đi một góc 'angle'
                // normalY xấp xỉ 1 khi đường ít cong. Nhưng nếu cong, ta dùng công thức xoay:
                // newY = x*sin(a) + y*cos(a). Với x=0, y=offset -> newY = offset * cos(angle)
                // newX = x*cos(a) - y*sin(a) -> newX = -offset * sin(angle)
                // Vì góc nhỏ, cos(angle) ~ 1.
                // Tuy nhiên để chính xác:
                const laneMultiplier = 2.5; 
                const baseOffset = (laneIndex * BASE_GAP_HORSE_Y) * laneMultiplier;
                
                const offsetX = -baseOffset * Math.sin(angle);
                const offsetY = baseOffset * Math.cos(angle);

                // 5. Tính toán tọa độ đích
                const targetY = centerY + offsetY;
                const targetX = finalX + offsetX; // Điều chỉnh cả X để vuông góc
                
                const startY = targetY - 600; // Rớt từ trên cao hơn chút

                // Chọn ngẫu nhiên 1 trong 8 mẫu bao lì xì
                const skinIndex = Phaser.Math.Between(1, 8);
                const lm = this.add.image(startX, startY, `lucky_money_s${skinIndex}`).setScale(0); // Start scale 0
                
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
                    scale: 0.15, // Scale về kích thước chuẩn
                    duration: 1500, // Giảm từ 2500 xuống 1500
                    ease: 'Bounce.easeOut',
                    rotation: 720 * (Math.PI / 180), // Xoay 2 vòng
                    onComplete: () => {
                        particles.destroy(); // Tắt particle khi rớt xong
                        lm.setData('landed', true); // Đánh dấu đã tiếp đất
                        
                        // Hiệu ứng "thở" (Idle animation)
                        this.tweens.add({
                            targets: lm,
                            scale: { from: 0.15, to: 0.18 },
                            yoyo: true,
                            repeat: -1,
                            duration: 800,
                            ease: 'Sine.easeInOut'
                        });

                        // Hiệu ứng hào quang dưới đất (Ground glow)
                        const glow = this.add.image(lm.x, lm.y, 'flare').setScale(2).setAlpha(0.5);
                        this.tweens.add({
                            targets: glow,
                            alpha: 0.1,
                            scale: 3,
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
            scene: MainScene,
            audio: {
                disableWebAudio: false,
                noAudio: false
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
            <div ref={containerRef} style={{ width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT, margin: '0 auto', borderRadius: '12px', overflow: 'hidden' }} />

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
