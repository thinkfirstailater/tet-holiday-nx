import Phaser from 'phaser';

export class RaceBackground {
    private scene: Phaser.Scene;
    private bgImage!: Phaser.GameObjects.Image;

    private centerY: number;

    constructor(scene: Phaser.Scene, centerY: number) {
        this.scene = scene;
        this.centerY = centerY;
        this.create();
    }

    public get width(): number {
        return this.bgImage ? this.bgImage.width : 0;
    }

    public get height(): number {
        return this.bgImage ? this.bgImage.height : 0;
    }

    private create() {
        // Background đặt tại (0,0) và neo tại (0,0)
        // Giữ nguyên kích thước gốc của ảnh (Scale = 1) theo yêu cầu: "Tọa độ thế giới game giữ nguyên = kích thước background"
        this.bgImage = this.scene.add.image(0, 0, 'bg');
        this.bgImage.setOrigin(0, 0);
        this.bgImage.setDepth(0); // Layer 0: Background
    }

    public destroy() {
        if (this.bgImage) {
            this.bgImage.destroy();
        }
    }
}
