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
    private shadow: Phaser.GameObjects.Ellipse;
    private nameText: Phaser.GameObjects.Text;
    private moneyText: Phaser.GameObjects.Text;
    public horseData: HorseData;
    private baseSpeed: number;
    private racePath?: Phaser.Curves.Path;
    public pathLength = 0;
    

    constructor(scene: Phaser.Scene, x: number, y: number, data: HorseData, baseSpeed: number) {
        super(scene, x, y);
        this.horseData = data;
        this.baseSpeed = baseSpeed;

        // 0. Khởi tạo path cho ngựa (theo SVG user cung cấp)
        this.initRacePath();
        this.ensureAnimations(scene);

        // 0.5. Khởi tạo Shadow (Bóng đổ)
        // Giảm kích thước shadow cho phù hợp với ngựa (36x10)
        this.shadow = scene.add.ellipse(0, 0, 36, 10, 0x000000, 0.4);
        this.shadow.setOrigin(0.5);

        // 1. Khởi tạo Sprite
        const spriteKey = `horse_running_${data.id}`;
        if (!scene.textures.exists(spriteKey)) {
            console.error(`Texture missing: ${spriteKey}`);
        }
        this.sprite = scene.add.sprite(0, 0, spriteKey);
        this.sprite.setScale(0.5); // Giảm scale xuống 0.5
        this.sprite.setOrigin(0.5, 1); // Đặt tâm ở giữa dưới để chân ngựa chạm đường
        this.playIdle(); // Mặc định là trạng thái chờ

        // 2. Khởi tạo Text tên ngựa (Điều chỉnh lại vị trí cho scale nhỏ hơn)
        this.nameText = scene.add.text(0, -40, data.name, {
            fontSize: '10px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);

        // 3. Khởi tạo Text tiền lì xì
        this.moneyText = scene.add.text(0, -52, '', {
            fontSize: '10px',
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);

        // Thêm các thành phần vào Container (Shadow nằm dưới cùng)
        this.add([this.shadow, this.sprite, this.nameText, this.moneyText]);
        
        // Kích hoạt vật lý cho Container
        scene.physics.add.existing(this);
        scene.add.existing(this);
        
        // Layer 10: Horse (Cao hơn BG và Lane)
        this.setDepth(10);

        // Make interactive for camera focus
        this.setSize(100, 100);
        this.setInteractive({ cursor: 'pointer' });

        // Snap to start position immediately to fix visual mismatch
        this.setStartPostion();
    }

    /**
     * Đặt vị trí ban đầu cho ngựa dựa trên Path (thay vì tọa độ truyền vào constructor)
     */
    public setStartPostion() {
        if (!this.racePath) return;
        
        const progress = 0;
        const centerPoint = this.racePath.getPoint(progress);
        const tangent = this.racePath.getTangent(progress);
        const normalX = -tangent.y;
        const normalY = tangent.x;
        
        const laneId = this.horseData.positionIndex + 2;
        const hasCustomPath = RacePath.hasCustomPath(laneId);
        
        let laneOffset = 0;
        if (!hasCustomPath) {
             const laneMultiplier = 2.5; 
             laneOffset = (this.horseData.baseLaneY - RacePath.CENTER_BASE_Y) * laneMultiplier;
        }
        
        // Logic giống updateHorse nhưng không có bobbing và time
        const finalX = centerPoint.x + (normalX * laneOffset);
        const finalY = centerPoint.y + normalY * laneOffset;

        this.setPosition(finalX, finalY);
        
        // Set initial rotation
        const angle = Math.atan2(tangent.y, tangent.x);
        this.sprite.setRotation(angle);
        this.shadow.setRotation(angle);
        this.nameText.setRotation(-angle);
        this.moneyText.setRotation(-angle);
    }

    /**
     * Khởi tạo quỹ đạo chạy dựa trên dữ liệu SVG và Lane ID
     */
    private initRacePath() {
        const laneId = this.horseData.positionIndex + 2;
        this.racePath = RacePath.getPathForLane(laneId);
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
        // Logic mới: Tăng tính ngẫu nhiên và kịch tính
        // 5% cơ hội thay đổi tốc độ mỗi frame
        if (Phaser.Math.Between(0, 100) < 5) {
            // Hệ số ngẫu nhiên lớn hơn: từ -40% đến +60%
            const randomFactor = Phaser.Math.FloatBetween(-0.4, 0.6);
            
            // Thêm yếu tố "bứt phá" (Boost) hiếm gặp (2% cơ hội)
            let boost = 0;
            if (Phaser.Math.Between(0, 100) < 2) {
                boost = this.baseSpeed * 0.5; // Tăng thêm 50% tốc độ
            }

            // Tính targetSpeed mới
            this.horseData.targetSpeed = this.baseSpeed + (this.baseSpeed * randomFactor) + boost;
            
            // Safety check: Không bao giờ để speed dưới 60% baseSpeed để tránh quá chậm
            const minSpeed = this.baseSpeed * 0.6;
            if (this.horseData.targetSpeed < minSpeed) {
                this.horseData.targetSpeed = minSpeed;
            }
        }

        // 2. Tiến tới tốc độ mục tiêu (Lerp)
        // Giảm lerp factor để thay đổi tốc độ mượt mà hơn nhưng vẫn đủ nhanh để thấy khác biệt
        this.horseData.speed = Phaser.Math.Linear(this.horseData.speed, this.horseData.targetSpeed, 0.02);

        // 3. Cập nhật progress dựa trên tốc độ
        // delta là giây. speed là px/giây (đã tính ở GamePhaser).
        // Không nhân 60 nữa vì speed đã là px/sec.
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
        const laneId = this.horseData.positionIndex + 2;
        const hasCustomPath = RacePath.hasCustomPath(laneId);
        
        let laneOffset = 0;
        if (!hasCustomPath) {
             const laneMultiplier = 2.5; 
             laneOffset = (this.horseData.baseLaneY - RacePath.CENTER_BASE_Y) * laneMultiplier;
        }

        // 8. Vị trí thực tế = Vị trí trung tâm + (Normal Vector * Offset)
        // Tạo hiệu ứng nhún nhảy cho Sprite thay vì toàn bộ Container
        const bobbing = Math.sin(time / 80 + this.horseData.id) * 4; 
        const jumpHeight = Math.min(0, bobbing); // Chỉ lấy phần âm (nhảy lên), phần dương coi như chạm đất

        this.sprite.y = jumpHeight;
        
        // Hiệu ứng bóng đổ: Khi ngựa nhảy cao thì bóng nhỏ lại và mờ đi
        const shadowScale = Phaser.Math.Clamp(1 + (jumpHeight / 20), 0.6, 1);
        this.shadow.setScale(shadowScale);
        this.shadow.setAlpha(0.4 * shadowScale);

        // Giảm tác động của việc bẻ cua lên trục X (nhân 0.5) để tránh hiện tượng "giật lùi" cho các lane xa tâm
        // FIX: Bỏ nhân 0.5 vì nó làm sai lệch vector pháp tuyến, gây méo hình học. 
        // Nếu muốn khoảng cách các làn nhỏ hơn, hãy giảm laneMultiplier.
        const finalX = centerPoint.x + (normalX * laneOffset);
        const finalY = centerPoint.y + normalY * laneOffset;

        // 9. Cập nhật vị trí Container (Không làm tròn để di chuyển mượt mà)
        this.setPosition(finalX, finalY);
 
         // 10. Cập nhật góc xoay (Rotation) dựa trên Tangent
        // Khi về đích (finished), reset góc xoay về 0 để ngựa đứng thẳng
        if (this.horseData.finished) {
            this.sprite.setRotation(0);
            this.shadow.setRotation(0);
            this.nameText.setRotation(0);
            this.moneyText.setRotation(0);
        } else {
             const targetAngle = Math.atan2(tangent.y, tangent.x);
             
             // Smooth rotation (Lerp angle) để tránh giật khi path không trơn
             const currentRotation = this.sprite.rotation;
            const smoothRotation = Phaser.Math.Angle.RotateTo(currentRotation, targetAngle, 0.1);
            
            this.sprite.setRotation(smoothRotation);
            this.shadow.setRotation(smoothRotation);
            
            // Cập nhật text luôn đứng thẳng
            this.nameText.setRotation(-smoothRotation);
            this.moneyText.setRotation(-smoothRotation);
         }
    }

    /**
     * Xử lý khi lượm được lì xì
     */
    collectMoney(value: number) {
        this.horseData.hasLuckyMoney = true;
        this.horseData.money = value;
        this.updateMoneyText();
        
        // Hiệu ứng lượm tiền
        this.scene.tweens.add({
            targets: this.moneyText,
            scale: 1.5,
            duration: 200,
            yoyo: true
        });
    }

    public updateMoneyText() {
        if (this.horseData.money > 0) {
            this.moneyText.setText(`🧧 ${this.horseData.money}k`);
        } else {
            this.moneyText.setText('');
        }
    }

    /**
     * Cập nhật hiển thị khi về đích (ví dụ: nhân đôi tiền)
     */
    setFinished(rank: number, winnerBonus = false) {
        this.horseData.finished = true;
        this.horseData.rank = rank;
        
        // Logic nhân đôi tiền đã được xử lý ở GamePhaser trước khi gọi hàm này
        // Nhưng nếu muốn chắc chắn hiển thị đúng:
        this.updateMoneyText();

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
        
        // Snap to start position instead of using raw startX/baseY
        this.setStartPostion();

        this.moneyText.setText('');
        this.playIdle();
    }
}
