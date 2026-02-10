export class GameConstants {
    // --- Viewport & Camera ---
    public static readonly VIEWPORT_WIDTH = 900;
    public static readonly VIEWPORT_HEIGHT = 600;
    public static readonly CAMERA_ZOOM_LEVEL = 1.5;

    // --- Race Logic ---
    public static readonly RACE_DURATION = 25; // Seconds
    public static readonly BASE_GAP_HORSE_X = 30;
    public static readonly BASE_GAP_HORSE_Y = 12;

    // --- Lucky Money ---
    public static readonly LUCKY_MONEY_VALUES = [10, 20, 50];
    public static readonly GET_LUCKY_MONEY_QUOTAS = (N: number) => [6, 8, 1]; // [10k, 20k, 50k]

    // --- Audio ---
    public static readonly AUDIO_VOLUME_RUNNING = 0.5;
    public static readonly AUDIO_VOLUME_END = 0.8;
    public static readonly AUDIO_VOLUME_COLLECT = 1.0;

    // --- Debug ---
    public static readonly DEBUG_PATH = true;
}
