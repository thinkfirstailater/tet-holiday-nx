import Phaser from 'phaser';
import { RacePath } from './RacePath';

export interface HorseData {
    id: number;
    name: string;
    image: string;
    color: string;
    speed: number;
    targetSpeed: number;
    money: number;
    finished: boolean;
    rank: number;
    currentPos: number; // Đây sẽ là progress (0 đến 1) trên path thay vì X
    hasLuckyMoney: boolean;
    baseLaneY: number;
    startX: number;
    positionIndex: number;
}

export class Horse extends Phaser.GameObjects.Container {
    private sprite: Phaser.GameObjects.Sprite;
    private nameText: Phaser.GameObjects.Text;
    private moneyText: Phaser.GameObjects.Text;
    public horseData: HorseData;
    private baseSpeed: number;
    private racePath?: Phaser.Curves.Path;
    public pathLength: number = 0;
    

    constructor(scene: Phaser.Scene, x: number, y: number, data: HorseData, baseSpeed: number) {
        super(scene, x, y);
        this.horseData = data;
        this.baseSpeed = baseSpeed;

        // 0. Khởi tạo path cho ngựa (theo SVG user cung cấp)
        this.initRacePath();
        this.ensureAnimations(scene);

        // 1. Khởi tạo Sprite
        this.sprite = scene.add.sprite(0, 0, `horse_running_${data.id}`);
        this.sprite.setScale(1.2); // Giảm scale từ 1.8 xuống 1.2
        this.sprite.setOrigin(0.5, 1); // Đặt tâm ở giữa dưới để chân ngựa chạm đường
        this.playIdle(); // Mặc định là trạng thái chờ

        // 2. Khởi tạo Text tên ngựa (Điều chỉnh lại vị trí cho scale nhỏ hơn)
        this.nameText = scene.add.text(0, -80, data.name, {
            fontSize: '14px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);

        // 3. Khởi tạo Text tiền lì xì
        this.moneyText = scene.add.text(0, -100, '', {
            fontSize: '12px',
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);

        // Thêm các thành phần vào Container
        this.add([this.sprite, this.nameText, this.moneyText]);
        
        // Kích hoạt vật lý cho Container
        scene.physics.add.existing(this);
        scene.add.existing(this);
    }

    /**
     * Khởi tạo quỹ đạo chạy trung tâm dựa trên dữ liệu SVG
     */
    private initRacePath() {
        this.racePath = RacePath.createPath();
        this.pathLength = this.racePath.getLength();
    }

    /**
     * Đảm bảo animation chạy cho ngựa đã được khởi tạo trong Global Animation Manager
     */
    private ensureAnimations(scene: Phaser.Scene) {
        const id = this.horseData.id;
        const spriteKey = `horse_running_${id}`;

        // 1. Animation RUN (Row 4: index 33-40, 8 frames)
        const runKey = `horse-run-${id}`;
        if (!scene.anims.exists(runKey)) {
            scene.anims.create({
                key: runKey,
                frames: scene.anims.generateFrameNumbers(spriteKey, { start: 33, end: 40 }),
                frameRate: 12,
                repeat: -1
            });
        }

        // 2. Animation IDLE (Row 2: index 11-18, 8 frames) 
        // Lưu ý: Row 1 (0-10), Row 2 (11-21). Nếu mỗi row có 11 frames thì Row 2 bắt đầu từ 11.
        // Giả sử 1 row có 11 frames (tổng 880px / 80px = 11), Row 2 index sẽ là 11-18.
        const idleKey = `horse-idle-${id}`;
        if (!scene.anims.exists(idleKey)) {
            scene.anims.create({
                key: idleKey,
                frames: scene.anims.generateFrameNumbers(spriteKey, { start: 11, end: 18 }),
                frameRate: 8,
                repeat: -1
            });
        }

        // 3. Animation WIN (Row 11: index 110-113, 4 frames)
        // Row 11 bắt đầu từ index 110 (11 frames * 10 rows trước đó)
        const winKey = `horse-win-${id}`;
        if (!scene.anims.exists(winKey)) {
            scene.anims.create({
                key: winKey,
                frames: scene.anims.generateFrameNumbers(spriteKey, { start: 110, end: 113 }),
                frameRate: 8,
                repeat: -1
            });
        }
    }

    public playRun() {
        this.sprite.play(`horse-run-${this.horseData.id}`, true);
    }

    public playIdle() {
        this.sprite.play(`horse-idle-${this.horseData.id}`, true);
        // Random tốc độ idle một chút để không con nào giống con nào (từ 0.8 đến 1.2)
        this.sprite.anims.timeScale = Phaser.Math.FloatBetween(0.1, 1);
    }

    public playWin() {
        this.sprite.play(`horse-win-${this.horseData.id}`, true);
    }

    /**
     * Cập nhật vị trí ngựa dựa trên progress (0 -> 1)
     * Sử dụng Normal Vector để offset làn đường và Tangent Vector để xoay ngựa
     */
    public updateHorse(time: number, delta: number) {
        if (this.horseData.finished || !this.racePath) return;

        // 1. Thay đổi targetSpeed ngẫu nhiên
        if (Phaser.Math.Between(0, 100) < 2) {
            this.horseData.targetSpeed = this.baseSpeed + Phaser.Math.Between(-80, 100);
        }

        // 2. Tiến tới tốc độ mục tiêu (Lerp)
        this.horseData.speed = Phaser.Math.Linear(this.horseData.speed, this.horseData.targetSpeed, 0.05);

        // 3. Cập nhật progress dựa trên tốc độ
        const distancePerFrame = this.horseData.speed * delta;
        const progressDelta = distancePerFrame / this.pathLength;
        this.horseData.currentPos += progressDelta;

        if (this.horseData.currentPos >= 1) {
            this.horseData.currentPos = 1;
            this.horseData.finished = true;
            this.playIdle();
        } else {
            this.playRun();
            // Đồng bộ tốc độ animation với tốc độ chạy
            const animSpeedScale = this.horseData.speed / this.baseSpeed;
            this.sprite.anims.timeScale = animSpeedScale;
        }

        // 4. Lấy điểm trên đường trung tâm
        const progress = Phaser.Math.Clamp(this.horseData.currentPos, 0, 1);
        const centerPoint = this.racePath.getPoint(progress);
        
        // 5. Lấy Tangent Vector (hướng tiếp tuyến)
        const tangent = this.racePath.getTangent(progress);
        
        // 6. Tính Normal Vector (vuông góc với Tangent)
        const normalX = -tangent.y;
        const normalY = tangent.x;

        // 7. Tính toán Lane Offset (Tăng khoảng cách để ngựa không sát nhau)
         // centerBaseY = 1250 (Mốc mới của bạn).
         const laneMultiplier = 2.5; 
         const laneOffset = (this.horseData.baseLaneY - RacePath.CENTER_BASE_Y) * laneMultiplier;
 
         // 8. Vị trí thực tế = Vị trí trung tâm + (Normal Vector * Offset)
        const bobbing = Math.sin(time / 100 + this.horseData.id) * 2;
        // Giảm tác động của việc bẻ cua lên trục X (nhân 0.5) để tránh hiện tượng "giật lùi" cho các lane xa tâm
        const finalX = centerPoint.x + (normalX * laneOffset * 0.5);
        const finalY = centerPoint.y + normalY * laneOffset + bobbing;

        // 9. Cập nhật vị trí Container (Làm tròn để tránh rung hình)
        this.setPosition(Math.round(finalX), Math.round(finalY));
 
         // 10. Cập nhật góc xoay (Rotation) dựa trên Tangent
         // Khi về đích (finished), reset góc xoay về 0 để ngựa đứng thẳng
         if (this.horseData.finished) {
             this.sprite.setRotation(0);
             this.nameText.setRotation(0);
             this.moneyText.setRotation(0);
         } else {
             const angle = Math.atan2(tangent.y, tangent.x);
             this.sprite.setRotation(angle);
             
             // Cập nhật text luôn đứng thẳng
             this.nameText.setRotation(-angle);
             this.moneyText.setRotation(-angle);
         }
    }

    /**
     * Xử lý khi lượm được lì xì
     */
    collectMoney(value: number) {
        this.horseData.hasLuckyMoney = true;
        this.horseData.money = value;
        this.moneyText.setText(`🧧 ${value}k`);
        
        // Hiệu ứng lượm tiền
        this.scene.tweens.add({
            targets: this.moneyText,
            scale: 1.5,
            duration: 200,
            yoyo: true
        });
    }

    /**
     * Cập nhật hiển thị khi về đích (ví dụ: nhân đôi tiền)
     */
    setFinished(rank: number, winnerBonus: boolean = false) {
        this.horseData.finished = true;
        this.horseData.rank = rank;
        
        if (winnerBonus && this.horseData.money > 0) {
            this.horseData.money *= 2; // Nhân đôi tiền thưởng
            this.moneyText.setText(`🧧 x2: ${this.horseData.money}k`);
        }

        // Chuyển sang animation thắng cuộc
        this.playWin();
    }

    /**
     * Reset trạng thái ngựa cho cuộc đua mới
     */
    reset(startX: number, baseY: number, initialSpeed: number) {
        this.horseData.currentPos = 0; // Reset về đầu path
        this.horseData.baseLaneY = baseY;
        this.horseData.speed = initialSpeed;
        this.horseData.targetSpeed = initialSpeed;
        this.horseData.money = 0;
        this.horseData.finished = false;
        this.horseData.hasLuckyMoney = false;
        this.horseData.rank = 0;
        
        this.x = startX;
        this.y = baseY;
        this.moneyText.setText('');
        this.playIdle();
    }
}
