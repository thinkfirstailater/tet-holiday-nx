import Phaser from 'phaser';

export class RacePath {
    public static readonly CENTER_START_X = 800;
    public static CENTER_BASE_Y = 1250; // Remove readonly
    public static WIN_X = 2800; 

    public static setConfig(winX: number, centerY: number) {
        RacePath.WIN_X = winX;
        RacePath.CENTER_BASE_Y = centerY;
    }

    // SVG Data
    public static readonly SVG_START_X = 260.661;
    public static readonly SVG_START_Y = 404.967;
    public static readonly SVG_END_X = 1106.363;
    public static readonly SVG_WIDTH = RacePath.SVG_END_X - RacePath.SVG_START_X;
    public static readonly Y_SCALE = 1; // Scale 1:1

    // Control Points from SVG (Lane 3 - Center)
    public static readonly PATH_POINTS_LANE_3 = [
        [302.946, 437.001], [358.045, 460.066], [402.893, 480.567], 
        [463.117, 497.225], [524.623, 513.883], [610.474, 517.727], 
        [697.607, 520.29], [782.177, 512.602], [874.436, 504.913], 
        [943.629, 494.663], [1006.416, 474.161], [1066.641, 444.689], 
        [1106.363, 389.59]
    ];

    // Placeholder cho các Lane khác (User sẽ cung cấp: [StartPoint, Point1, Point2...])
    // Lane 1: M317.575 396.154 C597.59 534.748 986.971 434.81 1050.139 374.47
    public static readonly PATH_DATA_LANE_1: number[][] = [
        [317.575, 396.154], // Start
        [597.59, 534.748],  // Control 1
        [986.971, 434.81],  // Control 2
        [1050.139, 374.47]  // End
    ];
    // Lane 2: M301.547 408.411 C637.188 581.888 1031.283 448.009 1093.509 375.412
    // Adjusted to match Lane 1 length (758.66px)
    public static readonly PATH_DATA_LANE_2: number[][] = [
        [301.547, 408.411], // Start
        [580.614, 552.648], // Control 1 (Adjusted)
        [900.091, 484.409], // Control 2 (Adjusted)
        [1035.627, 415.580] // End (Adjusted)
    ];
    // Lane 3: M264.777 413.125 C689.042 616.772 1013.37 450.837 1121.793 376.355
    // Adjusted to match Lane 1 length (758.66px)
    public static readonly PATH_DATA_LANE_3: number[][] = [
        [264.777, 413.125], // Start
        [581.136, 564.977], // Control 1 (Adjusted)
        [841.928, 511.337], // Control 2 (Adjusted)
        [999.074, 443.348]  // End (Adjusted)
    ];
    // Lane 4: M253.463 421.61 C641.902 633.743 1075.595 457.437 1136.878 389.555
    // Adjusted to match Lane 1 length (758.66px)
    public static readonly PATH_DATA_LANE_4: number[][] = [
        [253.463, 421.61],   // Start
        [523.637, 569.156],  // Control 1 (Adjusted)
        [815.703, 528.787],  // Control 2 (Adjusted)
        [989.126, 467.687]   // End (Adjusted)
    ];
    // Lane 5: M229.893 434.81 C700.356 678.055 1171.762 444.238 1177.419 381.069
    // Adjusted to match Lane 1 length (758.66px)
    public static readonly PATH_DATA_LANE_5: number[][] = [
        [229.893, 434.81],   // Start
        [507.100, 578.135],  // Control 1 (Adjusted)
        [784.635, 555.833],  // Control 2 (Adjusted)
        [967.027, 500.403]   // End (Adjusted)
    ];

    public static createPath(startX: number, startY: number, pointsData: number[][]): Phaser.Curves.Path {
        const path = new Phaser.Curves.Path(startX, startY);

        // Chuyển đổi points sang Vector2 để dùng Spline
        const points = pointsData.map(p => new Phaser.Math.Vector2(p[0], p[1]));

        // Sử dụng splineTo thay vì lineTo để tạo đường cong mềm mại (C1 continuity)
        path.splineTo(points);

        return path;
    }

    public static getPathForLane(laneId: number): Phaser.Curves.Path {
        let fullData: number[][] = [];
        
        switch (laneId) {
            case 0: 
                // Lane 1: Cubic Bezier Custom
                if (RacePath.PATH_DATA_LANE_1.length === 4) {
                    const d = RacePath.PATH_DATA_LANE_1;
                    const p = new Phaser.Curves.Path(d[0][0], d[0][1]);
                    p.cubicBezierTo(
                        new Phaser.Math.Vector2(d[1][0], d[1][1]),
                        new Phaser.Math.Vector2(d[2][0], d[2][1]),
                        new Phaser.Math.Vector2(d[3][0], d[3][1])
                    );
                    return p;
                }
                fullData = RacePath.PATH_DATA_LANE_1; 
                break;
            case 1: 
                // Lane 2: Cubic Bezier Custom
                if (RacePath.PATH_DATA_LANE_2.length === 4) {
                    const d = RacePath.PATH_DATA_LANE_2;
                    const p = new Phaser.Curves.Path(d[0][0], d[0][1]);
                    p.cubicBezierTo(
                        new Phaser.Math.Vector2(d[1][0], d[1][1]),
                        new Phaser.Math.Vector2(d[2][0], d[2][1]),
                        new Phaser.Math.Vector2(d[3][0], d[3][1])
                    );
                    return p;
                }
                fullData = RacePath.PATH_DATA_LANE_2; 
                break;
            case 2: 
                // Lane 3: Cubic Bezier Custom
                if (RacePath.PATH_DATA_LANE_3.length === 4) {
                    const d = RacePath.PATH_DATA_LANE_3;
                    const p = new Phaser.Curves.Path(d[0][0], d[0][1]);
                    p.cubicBezierTo(
                        new Phaser.Math.Vector2(d[1][0], d[1][1]),
                        new Phaser.Math.Vector2(d[2][0], d[2][1]),
                        new Phaser.Math.Vector2(d[3][0], d[3][1])
                    );
                    return p;
                }
                // Fallback cũ nếu cần
                return RacePath.createPath(RacePath.SVG_START_X, RacePath.SVG_START_Y, RacePath.PATH_POINTS_LANE_3);
            case 3: 
                // Lane 4: Cubic Bezier Custom
                if (RacePath.PATH_DATA_LANE_4.length === 4) {
                    const d = RacePath.PATH_DATA_LANE_4;
                    const p = new Phaser.Curves.Path(d[0][0], d[0][1]);
                    p.cubicBezierTo(
                        new Phaser.Math.Vector2(d[1][0], d[1][1]),
                        new Phaser.Math.Vector2(d[2][0], d[2][1]),
                        new Phaser.Math.Vector2(d[3][0], d[3][1])
                    );
                    return p;
                }
                fullData = RacePath.PATH_DATA_LANE_4; 
                break;
            case 4: 
                // Lane 5: Cubic Bezier Custom
                if (RacePath.PATH_DATA_LANE_5.length === 4) {
                    const d = RacePath.PATH_DATA_LANE_5;
                    const p = new Phaser.Curves.Path(d[0][0], d[0][1]);
                    p.cubicBezierTo(
                        new Phaser.Math.Vector2(d[1][0], d[1][1]),
                        new Phaser.Math.Vector2(d[2][0], d[2][1]),
                        new Phaser.Math.Vector2(d[3][0], d[3][1])
                    );
                    return p;
                }
                fullData = RacePath.PATH_DATA_LANE_5; 
                break;
            default: 
                return RacePath.createPath(RacePath.SVG_START_X, RacePath.SVG_START_Y, RacePath.PATH_POINTS_LANE_3);
        }

        // Nếu có data đầy đủ (bao gồm điểm start ở index 0)
        if (fullData.length > 0) {
            const startX = fullData[0][0];
            const startY = fullData[0][1];
            // Các điểm còn lại là control points
            const points = fullData.slice(1);
            return RacePath.createPath(startX, startY, points);
        }

        // Fallback về Lane 3 nếu lane đó chưa có data
        return RacePath.createPath(RacePath.SVG_START_X, RacePath.SVG_START_Y, RacePath.PATH_POINTS_LANE_3);
    }

    public static hasCustomPath(laneId: number): boolean {
        switch (laneId) {
            case 0: return RacePath.PATH_DATA_LANE_1.length > 0;
            case 1: return RacePath.PATH_DATA_LANE_2.length > 0;
            case 2: return RacePath.PATH_DATA_LANE_3.length > 0;
            case 3: return RacePath.PATH_DATA_LANE_4.length > 0;
            case 4: return RacePath.PATH_DATA_LANE_5.length > 0;
            default: return false;
        }
    }

    // Các hàm helper giữ lại nhưng trả về giá trị gốc hoặc tính toán đơn giản hơn
    public static toGameX(svgX: number): number {
        return svgX;
    }

    public static toGameY(svgY: number): number {
        return svgY;
    }

    /**
     * Lấy điểm Y trung tâm tại vị trí X bất kỳ (ước lượng)
     * Vì Path là tham số hóa theo t (0->1) chứ không phải x, ta cần tìm t tương ứng với x.
     * Tuy nhiên, vì đường đua chủ yếu đi ngang (tăng dần x), ta có thể ước lượng t = (x - startX) / length
     */
    public static getCenterYAtX(path: Phaser.Curves.Path, x: number): number {
        // Tìm điểm trên path có x gần nhất (Phương pháp tìm kiếm đơn giản)
        // SVG_START_X = 260, SVG_END_X = 1106
        // t ~ (x - 260) / (1106 - 260)
        const totalLength = RacePath.SVG_END_X - RacePath.SVG_START_X;
        const t = Phaser.Math.Clamp((x - RacePath.SVG_START_X) / totalLength, 0, 1);
        const point = path.getPoint(t);
        return point.y;
    }
}
