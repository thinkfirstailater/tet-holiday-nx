import Phaser from 'phaser';

export class RaceBackground {
    private scene: Phaser.Scene;
    private bgImage!: Phaser.GameObjects.Image;
    private laneImage!: Phaser.GameObjects.Image;
    private trackLength: number;
    private viewportHeight: number;

    private centerY: number;

    constructor(scene: Phaser.Scene, trackLength: number, viewportHeight: number, centerY: number) {
        this.scene = scene;
        this.trackLength = trackLength;
        this.viewportHeight = viewportHeight;
        this.centerY = centerY;
        this.create();
    }

    private create() {
        // Background đặt tại (0,0) và neo tại (0,0)
        // Điều này giúp tọa độ trong Game khớp 1:1 với tọa độ trên file ảnh khi bạn đo bằng tool
        this.bgImage = this.scene.add.image(0, 0, 'bg');
        this.bgImage.setOrigin(0, 0);
        
        // Tính toán scale để ảnh phủ kín TRACK_LENGTH
        const scaleX = this.trackLength / this.bgImage.width;
        const scaleY = (this.viewportHeight * 1.5) / this.bgImage.height; // Giữ tỉ lệ phóng đại
        
        const zoomFactor = 1.5;
        const finalScale = Math.max(scaleX, scaleY) * zoomFactor;
        
        this.bgImage.setScale(finalScale);

        // Add Race Lane overlay
        this.laneImage = this.scene.add.image(450, 990, 'bg-lane');
        this.laneImage.setOrigin(0,0);
        this.laneImage.setScale(finalScale); // Scale giống hệt background nền
    }

    public destroy() {
        if (this.bgImage) {
            this.bgImage.destroy();
        }
        if (this.laneImage) {
            this.laneImage.destroy();
        }
    }
}
