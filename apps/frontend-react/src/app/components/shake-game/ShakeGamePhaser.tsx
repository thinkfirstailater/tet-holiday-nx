import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';

export interface GameConfigItem {
    value: string;
    percent: number;
}

interface ShakeGamePhaserProps {
    config: GameConfigItem[];
    onResult: (value: string, wish: string) => void;
}

export const ShakeGamePhaser: React.FC<ShakeGamePhaserProps> = ({ config, onResult }) => {
    const gameRef = useRef<Phaser.Game | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [shakeProgress, setShakeProgress] = useState(0);

    // Store config in ref to access inside Phaser closures without dependency issues
    const configRef = useRef(config);
    const onResultRef = useRef(onResult);

    useEffect(() => {
        configRef.current = config;
        onResultRef.current = onResult;
    }, [config, onResult]);

    useEffect(() => {
        if (!containerRef.current) return;

        const phaserConfig: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            parent: containerRef.current,
            width: window.innerWidth,
            height: window.innerHeight,
            transparent: true,
            scale: {
                mode: Phaser.Scale.RESIZE,
                autoCenter: Phaser.Scale.CENTER_BOTH
            },
            physics: {
                default: 'arcade',
                arcade: {
                    gravity: { x: 0, y: 300 },
                    debug: false,
                },
            },
            scene: {
                preload: preload,
                create: create,
                update: update,
            },
        };

        const game = new Phaser.Game(phaserConfig);
        gameRef.current = game;

        // --- Game Variables ---
        let treeSprite: Phaser.GameObjects.Sprite;
        let luckyMoneyGroup: Phaser.Physics.Arcade.Group;
        
        // Shake Logic
        let lastShakeTime = 0;
        const shakeThreshold = 10; 
        let lastX = 0, lastY = 0, lastZ = 0;
        
        let accumulatedShakeTime = 0;
        let targetShakeTime = Phaser.Math.Between(3000, 6000); // 3-6 seconds
        let isDropping = false;
        let wishes: string[] = [];

        function preload(this: Phaser.Scene) {
            this.load.image('bg_full', '/assets/shake-tree/1.png');
            this.load.image('tree', '/assets/shake-tree/2.png');
            
            for (let i = 1; i <= 8; i++) {
                this.load.image(`lucky_money_s${i}`, `/assets/red-envelop/Hong Bao S${i}.png`);
            }
            
            this.load.json('wishes', '/assets/shake-tree/chuc-tet.json');
            this.load.audio('collect', '/assets/music/collect.mp3');
        }

        function create(this: Phaser.Scene) {
            const { width, height } = this.scale;

            // 1. Background (Full)
            const bg = this.add.image(width / 2, height / 2, 'bg_full');
            // Scale background to cover screen while maintaining aspect ratio (cover)
            const scaleX = width / bg.width;
            const scaleY = height / bg.height;
            const scale = Math.max(scaleX, scaleY);
            bg.setScale(scale);

            // 2. Tree Sprite (Overlay)
            // Assuming tree (2.png) needs to be placed. 
            // Since we don't know exact coordinates relative to 1.png, we'll center it roughly or rely on user feedback.
            // For now, center horizontally, and align bottom? Or center?
            // Let's assume it's the main subject.
            treeSprite = this.add.sprite(width / 2, height / 2, 'tree');
            // Scale tree to be reasonable (e.g. 80% of height?)
            // Or match background scale if they are 1:1 layers?
            // "Hình 2 là ảnh PNG của cái cây thôi (2.png) trong cùng folder hình 1.png"
            // Usually this means they share dimensions or coordinate system.
            // Let's try matching the background scale first.
            treeSprite.setScale(scale); 
            
            // Set origin to bottom center for better shaking (pivot at roots)
            treeSprite.setOrigin(0.5, 1);
            treeSprite.setPosition(width / 2, height); // Anchor at bottom center of screen? 
            // If the tree in 1.png is in the middle, this might be wrong.
            // Let's try centering it for now, as that's safer if it's a "cutout".
            treeSprite.setOrigin(0.5, 0.5);
            treeSprite.setPosition(width / 2, height / 2);

            // Interactive Tree (Tap to shake)
            treeSprite.setInteractive({ useHandCursor: true });
            treeSprite.on('pointerdown', () => {
                triggerShake(this, 200); // Tap adds 200ms of shake
            });

            // Lucky Money Group
            luckyMoneyGroup = this.physics.add.group({
                defaultKey: 'lucky_money_s1',
                collideWorldBounds: true,
                bounceX: 0.5,
                bounceY: 0.3,
            });

            this.physics.world.setBounds(0, 0, width, height);

            // Load Wishes
            const wishData = this.cache.json.get('wishes');
            if (wishData && wishData.loi_chuc_tet) {
                wishes = wishData.loi_chuc_tet;
            } else {
                wishes = ["Chúc Mừng Năm Mới!"];
            }

            // Device Motion
            if (window.DeviceMotionEvent) {
                window.addEventListener('devicemotion', handleDeviceMotion, false);
            }
        }

        function update(this: Phaser.Scene, time: number, delta: number) {
            // Decay shake progress slightly if inactive? 
            // Or just keep it. Let's keep it simple.

            if (accumulatedShakeTime >= targetShakeTime && !isDropping) {
                isDropping = true;
                spawnResult(this);
            }
        }

        const handleDeviceMotion = (event: DeviceMotionEvent) => {
            if (isDropping) return;

            const current = event.accelerationIncludingGravity;
            if (!current) return;

            const curTime = new Date().getTime();
            if ((curTime - lastShakeTime) > 100) {
                const diffTime = curTime - lastShakeTime;
                lastShakeTime = curTime;

                const x = current.x || 0;
                const y = current.y || 0;
                const z = current.z || 0;

                const speed = Math.abs(x + y + z - lastX - lastY - lastZ) / diffTime * 10000;

                if (speed > shakeThreshold * 100) {
                    if (gameRef.current?.scene.scenes[0]) {
                        triggerShake(gameRef.current.scene.scenes[0], diffTime);
                    }
                }

                lastX = x;
                lastY = y;
                lastZ = z;
            }
        };

        function triggerShake(scene: Phaser.Scene, amountMs: number) {
            if (isDropping) return;

            // 1. Accumulate Time
            accumulatedShakeTime += amountMs;
            
            // 2. Update React State for UI (throttled/optional)
            const pct = Math.min((accumulatedShakeTime / targetShakeTime) * 100, 100);
            // We can't easily setReactState from here frequently without performance hit.
            // But we can update a visual bar in Phaser if needed.
            
            // 3. Visual Shake Tween
            if (!scene.tweens.isTweening(treeSprite)) {
                scene.tweens.add({
                    targets: treeSprite,
                    angle: { from: -2, to: 2 },
                    duration: 100,
                    yoyo: true,
                    repeat: 1,
                    onComplete: () => {
                        treeSprite.setAngle(0);
                    }
                });
            }

            // 4. Particle/Leaf effect (Optional - maybe later)
        }

        function spawnResult(scene: Phaser.Scene) {
            // Block further shaking until resolved
            isDropping = true; 
            
            // Reset accumulation for next time (will be effective after we reset isDropping)
            accumulatedShakeTime = 0;
            targetShakeTime = Phaser.Math.Between(3000, 6000);

            const { width, height } = scene.scale;
            const startX = Phaser.Math.Between(width * 0.2, width * 0.8);
            const type = Phaser.Math.Between(1, 8); // We have 8 types of lucky money
            
            // Create Sprite (No physics for smoother control)
            const money = scene.add.sprite(startX, -100, `lucky_money_s${type}`);
            money.setScale(0.8);
            money.setInteractive();
            
            // 1. Falling Tween
            scene.tweens.add({
                targets: money,
                y: height * 0.6, // Fall to 60% of screen height
                duration: 2000,
                ease: 'Bounce.easeOut', // Bounce at the end
                onComplete: () => {
                    // Floating animation after landing
                    scene.tweens.add({
                        targets: money,
                        y: money.y + 20,
                        duration: 1500,
                        yoyo: true,
                        repeat: -1,
                        ease: 'Sine.easeInOut'
                    });
                }
            });

            // 2. Swaying Tween (Simulate falling leaf)
            scene.tweens.add({
                targets: money,
                x: startX + Phaser.Math.Between(-50, 50),
                angle: Phaser.Math.Between(-15, 15),
                duration: 2000,
                ease: 'Sine.easeInOut'
            });

            // On Click -> Open Result
            money.once('pointerdown', () => {
                money.disableInteractive();
                
                // Scale up effect before opening
                scene.tweens.add({
                    targets: money,
                    scale: 1.2,
                    alpha: 0,
                    duration: 300,
                    onComplete: () => {
                        const reward = determineReward();
                        const wish = Phaser.Math.RND.pick(wishes);
                        
                        if (onResultRef.current) {
                            onResultRef.current(reward.value, wish);
                        }
                        
                        money.destroy();
                        
                        // Allow playing again after result is shown? 
                        // Actually, the parent component handles the overlay.
                        // When parent calls for "Play Again", we might need to reset.
                        // But since we reset accumulatedShakeTime above, we just need to unlock isDropping.
                        // HOWEVER, if we unlock here, the user can shake BEHIND the overlay?
                        // Ideally, we unlock when the user clicks "Play Again".
                        // For now, let's unlock immediately so the game loop is ready, 
                        // but the overlay will block input anyway.
                        isDropping = false;
                    }
                });
            });
        }

        function determineReward(): GameConfigItem {
            const currentConfig = configRef.current;
            const rnd = Math.random() * 100;
            let currentSum = 0;
            
            for (const item of currentConfig) {
                currentSum += item.percent;
                if (rnd <= currentSum) {
                    return item;
                }
            }
            return currentConfig[currentConfig.length - 1];
        }

        return () => {
            window.removeEventListener('devicemotion', handleDeviceMotion);
            game.destroy(true);
        };
    }, []);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
            
            {/* Simple Instruction Overlay */}
            <div style={{
                position: 'absolute',
                bottom: '20px',
                width: '100%',
                textAlign: 'center',
                color: 'white',
                fontSize: '18px',
                fontWeight: 'bold',
                textShadow: '2px 2px 4px black',
                pointerEvents: 'none'
            }}>
                Lắc điện thoại hoặc chạm vào cây liên tục! 🌳
            </div>
        </div>
    );
};
