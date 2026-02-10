import Phaser from 'phaser';

export class RacePath {
    public static readonly CENTER_START_X = 800;
    public static readonly CENTER_BASE_Y = 1250;
    public static readonly WIN_X = 2800;

    // SVG Data
    private static readonly SVG_START_X = 3.125;
    private static readonly SVG_START_Y = 5.537;
    private static readonly SVG_END_X = 15.197;
    private static readonly SVG_WIDTH = RacePath.SVG_END_X - RacePath.SVG_START_X;
    private static readonly Y_SCALE = 100; // Restore Y_SCALE to 100

    // Control Points from SVG
    private static readonly PATH_POINTS = [
        [3.566, 5.85], [4.08, 6.125], [4.632, 6.309], [5.293, 6.566], 
        [5.844, 7.4], [6.69, 7.6], [7.59, 7.8], 
        [8.564, 7.9], [9.5, 7.9], [10.585, 7.8], 
        [11.614, 7.65], [12.349, 7.6], [13.028, 7.55], 
        [13.837, 7.5], [14.296, 7.45], [14.756, 7.4], 
        [15.197, 7.4]
    ];

    public static createPath(): Phaser.Curves.Path {
        const startX = RacePath.toGameX(RacePath.SVG_START_X);
        const startY = RacePath.toGameY(RacePath.SVG_START_Y);
        
        const path = new Phaser.Curves.Path(startX, startY);

        RacePath.PATH_POINTS.forEach(p => {
            path.lineTo(RacePath.toGameX(p[0]), RacePath.toGameY(p[1]));
        });

        return path;
    }

    public static toGameX(svgX: number): number {
        const progressX = (svgX - RacePath.SVG_START_X) / RacePath.SVG_WIDTH;
        const travelDistance = RacePath.WIN_X - RacePath.CENTER_START_X;
        return RacePath.CENTER_START_X + progressX * travelDistance;
    }

    public static toGameY(svgY: number): number {
        return RacePath.CENTER_BASE_Y + (svgY - RacePath.SVG_START_Y) * RacePath.Y_SCALE;
    }

    /**
     * Lấy điểm Y trung tâm tại vị trí X bất kỳ (ước lượng)
     * Vì Path là tham số hóa theo t (0->1) chứ không phải x, ta cần tìm t tương ứng với x.
     * Tuy nhiên, vì đường đua chủ yếu đi ngang (tăng dần x), ta có thể ước lượng t = (x - startX) / length
     */
    public static getCenterYAtX(path: Phaser.Curves.Path, x: number): number {
        // Tìm điểm trên path có x gần nhất (Phương pháp tìm kiếm đơn giản)
        // Vì path cong, ta không thể tính trực tiếp t từ x một cách chính xác tuyệt đối mà không giải phương trình.
        // Nhưng ta có thể xấp xỉ: t ~ (x - startX) / (endX - startX)
        const t = Phaser.Math.Clamp((x - RacePath.CENTER_START_X) / (RacePath.WIN_X - RacePath.CENTER_START_X), 0, 1);
        const point = path.getPoint(t);
        return point.y;
    }
}
