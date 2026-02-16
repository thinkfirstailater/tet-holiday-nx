import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';

export interface GameConfigItem {
    value: string;
    percent: number;
}

interface ShootGamePhaserProps {
    config: GameConfigItem[];
    onGameOver: (totalScore: number, bestReward: string) => void;
}

export const ShootGamePhaser: React.FC<ShootGamePhaserProps> = ({ config, onGameOver }) => {
    const gameRef = useRef<Phaser.Game | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    // Store refs for Phaser scene access
    const configRef = useRef(config);
    const onGameOverRef = useRef(onGameOver);

    useEffect(() => {
        configRef.current = config;
        onGameOverRef.current = onGameOver;
    }, [config, onGameOver]);

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
                    gravity: { x: 0, y: 100 }, // Light gravity for falling effect
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
        let envelopes: Phaser.Physics.Arcade.Group;
        let score = 0;
        const slashedValues: string[] = []; // Store values of slashed envelopes
        let scoreText: Phaser.GameObjects.Text;
        let timerText: Phaser.GameObjects.Text;
        let timeLeft = 10;
        let spawnEvent: Phaser.Time.TimerEvent;
        let timerEvent: Phaser.Time.TimerEvent;
        let isGameOver = false;
        
        // Swipe/Trail variables
        let graphics: Phaser.GameObjects.Graphics;
        let points: Phaser.Math.Vector2[] = [];
        let isDown = false;
        let slashStartTime = 0; // Track when slash started
        const MAX_SLASH_DURATION = 350; // Max ms for a single slash

        function preload(this: Phaser.Scene) {
            this.load.image('bg_full', '/assets/shake-tree/1.png');
            
            for (let i = 1; i <= 8; i++) {
                this.load.image(`lucky_money_s${i}`, `/assets/red-envelop/Hong Bao S${i}.png`);
            }
        }

        function create(this: Phaser.Scene) {
            const { width, height } = this.scale;

            // 1. Background
            const bg = this.add.image(width / 2, height / 2, 'bg_full');
            const scaleX = width / bg.width;
            const scaleY = height / bg.height;
            const scale = Math.max(scaleX, scaleY);
            bg.setScale(scale);

            // 2. Groups
            envelopes = this.physics.add.group();

            // 3. UI - Score & Timer
            scoreText = this.add.text(20, 20, 'Điểm: 0', {
                fontSize: '24px',
                color: '#FFD700',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 4
            }).setDepth(100);

            timerText = this.add.text(width - 20, 20, '10s', {
                fontSize: '32px',
                color: '#fff',
                fontStyle: 'bold',
                stroke: '#E91E63',
                strokeThickness: 4
            }).setOrigin(1, 0).setDepth(100);

            // 4. Input & Trail
            graphics = this.add.graphics().setDepth(50);
            
            this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
                isDown = true;
                slashStartTime = Date.now();
                points = [new Phaser.Math.Vector2(pointer.x, pointer.y)];
            });

            this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
                if (isDown) {
                    // Check if slash expired
                    if (Date.now() - slashStartTime > MAX_SLASH_DURATION) {
                        isDown = false;
                        points = [];
                        graphics.clear();
                        return;
                    }

                    points.push(new Phaser.Math.Vector2(pointer.x, pointer.y));
                    if (points.length > 5) points.shift(); // Shorten trail (was 10)
                    checkSlashCollision(this, pointer);
                }
            });

            this.input.on('pointerup', () => {
                isDown = false;
                points = [];
                graphics.clear();
            });

            // 5. Spawner
            spawnEvent = this.time.addEvent({
                delay: 600, // Faster spawn (was 1500)
                callback: spawnEnvelopes,
                callbackScope: this,
                loop: true
            });

            // 6. Game Timer
            timerEvent = this.time.addEvent({
                delay: 1000,
                callback: () => {
                    timeLeft--;
                    timerText.setText(`${timeLeft}s`);
                    if (timeLeft <= 0) {
                        endGame();
                    }
                },
                loop: true
            });

            // Create particle texture
            const particleGraphics = this.make.graphics({ x: 0, y: 0 });
            particleGraphics.fillStyle(0xffff00, 1);
            particleGraphics.fillCircle(5, 5, 5);
            particleGraphics.generateTexture('particle_coin', 10, 10);
        }

        function update(this: Phaser.Scene) {
            if (isGameOver) return;

            // Draw Trail
            graphics.clear();
            if (isDown && points.length > 1) {
                graphics.lineStyle(4, 0xffff00, 1);
                graphics.strokePoints(points);
                graphics.lineStyle(2, 0xff0000, 0.5); // Inner red core
                graphics.strokePoints(points);
            }

            // Clean up off-screen envelopes
            envelopes.children.each((child: any) => {
                if (child.y > this.scale.height + 100) {
                    child.destroy();
                }
                return true; // continue
            });
        }

        function spawnEnvelopes(this: Phaser.Scene) {
            if (isGameOver) return;

            // Check total current envelopes to limit to ~5-8
            const currentCount = envelopes.countActive(true);
            if (currentCount >= 8) return;

            const { width } = this.scale;
            // Spawn batch of 1-3 envelopes (increased from 1-2)
            const count = Phaser.Math.Between(1, 3);

            for (let i = 0; i < count; i++) {
                if (envelopes.countActive(true) >= 8) break; // Hard limit check inside loop

                const x = Phaser.Math.Between(50, width - 50);
                const type = Phaser.Math.Between(1, 8);
                
                const envelope = envelopes.create(x, -50, `lucky_money_s${type}`) as Phaser.Physics.Arcade.Sprite;
                // Resize to even smaller (approx 0.12 - 0.16 scale)
                const baseScale = 0.12 + Math.random() * 0.04; 
                envelope.setScale(baseScale);
                
                // Physics properties
                envelope.setVelocityY(Phaser.Math.Between(200, 450)); // Faster fall (was 150-300)
                envelope.setAngularVelocity(Phaser.Math.Between(-100, 100)); // More rotation
                
                // Swaying motion
                this.tweens.add({
                    targets: envelope,
                    x: x + Phaser.Math.Between(-50, 50),
                    duration: 2000,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });

                // Assign a reward value to this envelope based on config
                const reward = determineReward();
                envelope.setData('reward', reward);
            }
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

        function checkSlashCollision(scene: Phaser.Scene, pointer: Phaser.Input.Pointer) {
            // Find all envelopes under pointer
            const hitTest = envelopes.getChildren().filter(child => {
                const sprite = child as Phaser.Physics.Arcade.Sprite;
                return sprite.active && sprite.getBounds().contains(pointer.x, pointer.y);
            });

            if (hitTest.length > 0) {
                // Only slash the top-most envelope (last in the array)
                const topEnvelope = hitTest[hitTest.length - 1] as Phaser.Physics.Arcade.Sprite;
                slashEnvelope(scene, topEnvelope);
            }
        }

        function slashEnvelope(scene: Phaser.Scene, sprite: Phaser.Physics.Arcade.Sprite) {
            if (!sprite.active) return;

            // 1. Get Value
            const reward = sprite.getData('reward') as GameConfigItem;
            
            // 2. Update Score
            score += 1000;
            scoreText.setText(`Điểm: ${score.toLocaleString()}`);
            
            // Store actual value for result
            slashedValues.push(reward.value);

            // 3. Visual Effects
            // Show +1000 floating text
            const floatText = scene.add.text(sprite.x, sprite.y, '+1.000', {
                fontSize: '20px',
                color: '#ffff00',
                fontStyle: 'bold'
            }).setOrigin(0.5);

            scene.tweens.add({
                targets: floatText,
                y: sprite.y - 80,
                alpha: 0,
                duration: 800,
                onComplete: () => floatText.destroy()
            });

            // Particle Explosion (Coins)
            const particles = scene.add.particles(sprite.x, sprite.y, 'particle_coin', {
                speed: { min: 100, max: 300 },
                angle: { min: 0, max: 360 },
                scale: { start: 1, end: 0 },
                blendMode: 'ADD',
                lifespan: 800,
                gravityY: 300,
                quantity: 8,
                emitting: false
            });
            particles.explode(8);

            // Split Effect (Simulate with 2 clones flying apart)
            const textureKey = sprite.texture.key;
            const x = sprite.x;
            const y = sprite.y;
            const scaleX = sprite.scaleX;
            const scaleY = sprite.scaleY;
            const rotation = sprite.rotation;
            const width = sprite.width;
            const height = sprite.height;

            // Clone 1 (Top Half)
            const part1 = scene.physics.add.sprite(x, y, textureKey);
            part1.setScale(scaleX, scaleY).setRotation(rotation).setAlpha(1);
            // Crop to top half
            part1.setCrop(0, 0, width, height / 2);
            // Adjust position slightly to match original
            // Note: Since origin is 0.5, 0.5, and we crop, the visible part shifts. 
            // Actually, setCrop just hides pixels. The sprite origin is still center.
            // But visually the "center" of the visible part is different.
            // For simplicity, just let them fly apart.
            part1.setVelocity(Phaser.Math.Between(-150, 150), -300); // Fly up
            part1.setAngularVelocity(Phaser.Math.Between(-200, 200));

            // Clone 2 (Bottom Half)
            const part2 = scene.physics.add.sprite(x, y, textureKey);
            part2.setScale(scaleX, scaleY).setRotation(rotation).setAlpha(1);
            // Crop to bottom half
            part2.setCrop(0, height / 2, width, height / 2);
            part2.setVelocity(Phaser.Math.Between(-150, 150), 300); // Fly down
            part2.setAngularVelocity(Phaser.Math.Between(-200, 200));

            // Fade out parts
            scene.tweens.add({
                targets: [part1, part2],
                alpha: 0,
                duration: 600,
                onComplete: () => {
                    part1.destroy();
                    part2.destroy();
                }
            });

            // Destroy original
            sprite.destroy();
        }

        function endGame() {
            isGameOver = true;
            if (spawnEvent) spawnEvent.remove();
            if (timerEvent) timerEvent.remove();
            if (gameRef.current?.scene.scenes[0].physics) {
                gameRef.current.scene.scenes[0].physics.pause();
            }
            
            // Determine Best Reward
            let bestReward = "Chúc bạn may mắn lần sau";
            let maxVal = 0;

            slashedValues.forEach(valStr => {
                // Remove non-digit chars
                const numStr = valStr.replace(/[^0-9]/g, '');
                const val = parseInt(numStr, 10);
                if (!isNaN(val) && val > maxVal) {
                    maxVal = val;
                    bestReward = valStr;
                }
            });
            
            // If only text rewards exist and maxVal is still 0
            if (maxVal === 0 && slashedValues.length > 0) {
                 // Try to pick one that is not "Chúc may mắn lần sau" if possible, or just the last one
                 const validRewards = slashedValues.filter(v => !v.toLowerCase().includes('chúc may mắn'));
                 if (validRewards.length > 0) {
                     bestReward = validRewards[validRewards.length - 1];
                 } else {
                     bestReward = slashedValues[slashedValues.length - 1];
                 }
            } else if (maxVal === 0 && slashedValues.length === 0) {
                bestReward = "Không chém được gì!";
            }

            if (onGameOverRef.current) {
                onGameOverRef.current(score, bestReward);
            }
        }

        return () => {
            // Cleanup on unmount
            if (gameRef.current) {
                gameRef.current.destroy(true);
            }
        };
    }, []);

    return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
};
