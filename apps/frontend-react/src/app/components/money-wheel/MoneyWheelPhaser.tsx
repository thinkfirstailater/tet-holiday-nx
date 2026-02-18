import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';

export interface WheelConfigItem {
    value: number; // 10, 20, 50, 100, 200, 500
    percent: number;
}
interface MoneyWheelPhaserProps {
    config: WheelConfigItem[];
    onResult: (value: number) => void;
    locked?: boolean;
}

interface WheelSlice {
    id: string;
    value: number;
    startAngle: number;
    endAngle: number;
    color: number;
}

export const MoneyWheelPhaser: React.FC<MoneyWheelPhaserProps> = ({ config, onResult, locked = false }) => {
    const gameRef = useRef<Phaser.Game | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Refs for closure access
    const configRef = useRef(config);
    const onResultRef = useRef(onResult);
    const lockedRef = useRef(locked);
    
    // Store layout for spinning logic
    const layoutRef = useRef<WheelSlice[]>([]);

    useEffect(() => {
        configRef.current = config;
        onResultRef.current = onResult;
        lockedRef.current = locked;
    }, [config, onResult, locked]);

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
            scene: {
                preload: preload,
                create: create,
            },
        };

        const game = new Phaser.Game(phaserConfig);
        gameRef.current = game;

        // --- Game Variables ---
        let wheelContainer: Phaser.GameObjects.Container;
        let isSpinning = false;
        const WHEEL_RADIUS = Math.min(window.innerWidth, window.innerHeight) * 0.4;
        let sliceSprites: Phaser.GameObjects.Image[] = [];

        function preload(this: Phaser.Scene) {
            // Load money assets
            const denominations = [10, 20, 50, 100, 200, 500];
            denominations.forEach(val => {
                this.load.image(`money_${val}`, `/assets/vnd/${val}.png`);
            });
            
            // Load particle texture (flare or simple circle)
            // this.load.image('flare', '/assets/particles/flare.png'); // Assuming this might exist or we use a fallback
        }

        function create(this: Phaser.Scene) {
            // Create a simple flare texture if not loaded (fallback)
            if (!this.textures.exists('flare')) {
                const graphics = this.make.graphics({ x: 0, y: 0 });
                graphics.fillStyle(0xFFFFFF, 1);
                graphics.fillCircle(8, 8, 8);
                graphics.generateTexture('flare', 16, 16);
            }

            const { width, height } = this.scale;
            const centerX = width / 2;
            const centerY = height / 2;

            // 1. Create Wheel Container
            wheelContainer = this.add.container(centerX, centerY);

            // 2. Generate Randomized Layout
            // Increase granularity to avoid clustering of small percentages.
            // 72 slots means 5 degrees per slot.
            // This ensures even a small % gets a few distinct slots that can be shuffled.
            layoutRef.current = generateRandomizedLayout(configRef.current, 72);
            sliceSprites = []; // Reset sprites array

            // 3. Draw Segments based on Layout
            let currentAngle = 0;

            // Draw background circle (border) behind bills
            const border = this.add.circle(0, 0, WHEEL_RADIUS + 10, 0x1a1a1a);
            border.setStrokeStyle(5, 0xFFD700);
            wheelContainer.add(border);

            layoutRef.current.forEach((slice) => {
                const sliceAngle = slice.endAngle - slice.startAngle;
                
                // One bill per slot since slots are now small (5 degrees)
                const angle = currentAngle + (sliceAngle / 2); // Center of the slice
                const angleRad = Phaser.Math.DegToRad(angle);

                const moneySprite = this.add.image(0, 0, `money_${slice.value}`);
                
                // Scale logic
                const billWidth = moneySprite.width;
                const scale = (WHEEL_RADIUS * 0.95) / billWidth; // slightly larger
                moneySprite.setScale(scale);

                // Set Origin (0, 0.5) to radiate outwards
                moneySprite.setOrigin(0, 0.5);

                // Rotation
                moneySprite.setRotation(angleRad);
                
                wheelContainer.add(moneySprite);
                sliceSprites.push(moneySprite);

                currentAngle += sliceAngle;
            });

            // 4. Draw Pointer (REMOVED per user request)
            /* 
            // Top is -90 degrees (270)
            // Triangle pointing DOWN towards center
            const pointer = this.add.triangle(
                centerX, 
                centerY - WHEEL_RADIUS - 30, // Positioned above the wheel
                0, 0,    // Top-left relative
                40, 0,   // Top-right relative
                20, 40,  // Bottom-center (tip)
                0xFF0000
            );
            pointer.setStrokeStyle(3, 0xFFFFFF);
            // No rotation needed as defined above points down
            */

            // 5. Spin Button (Center)
            const spinBtn = this.add.circle(centerX, centerY, 50, 0xD32F2F); // Red button
            spinBtn.setStrokeStyle(4, 0xFFD700); // Gold border
            
            const spinText = this.add.text(centerX, centerY, 'QUAY', {
                fontSize: '24px',
                color: '#FFD700',
                fontStyle: 'bold'
            }).setOrigin(0.5);

            spinBtn.setInteractive({ useHandCursor: true });
            spinBtn.on('pointerdown', () => {
                if (!isSpinning && !lockedRef.current) {
                    spinWheel(this);
                }
            });
        }

        function generateRandomizedLayout(config: WheelConfigItem[], totalSlots = 72): WheelSlice[] {
            // totalSlots default 72 (approx 5 degrees per slot)

            const slots: { value: number }[] = [];
            
            // First pass: fill integer slots
            let filledPercent = 0;
            config.forEach(item => {
                const count = Math.round((item.percent / 100) * totalSlots);
                for(let i=0; i<count; i++) {
                    slots.push({ value: item.value });
                }
                filledPercent += (count / totalSlots) * 100;
            });
            
            // Adjust if rounding errors (too many or too few slots)
            while(slots.length < totalSlots) {
                // Add randomly from config based on weights? 
                // Or just add the first one (usually 10k)
                slots.push({ value: config[0].value });
            }
            while(slots.length > totalSlots) {
                // Remove random or last? 
                // Removing last might bias against last config items.
                // Let's remove random.
                const removeIdx = Math.floor(Math.random() * slots.length);
                slots.splice(removeIdx, 1);
            }

            // Shuffle slots (Fisher-Yates)
            for (let i = slots.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [slots[i], slots[j]] = [slots[j], slots[i]];
            }

            // Build layout
            const slices: WheelSlice[] = [];
            let currentAngle = 0;
            const anglePerSlot = 360 / totalSlots;
            
            slots.forEach((slot, i) => {
                slices.push({
                    id: `${i}`,
                    value: slot.value,
                    startAngle: currentAngle,
                    endAngle: currentAngle + anglePerSlot,
                    color: 0 // not used
                });
                currentAngle += anglePerSlot;
            });

            return slices;
        }

        function spinWheel(scene: Phaser.Scene) {
            isSpinning = true;
            
            // 1. Determine Result based on original config probabilities
            const resultValue = determineRewardValue(configRef.current);
            
            // 2. Find all slices that match this value
            const matchingSlices = layoutRef.current.filter(s => s.value === resultValue);
            
            // 3. Pick one random slice from the matching ones
            if (matchingSlices.length === 0) {
                // Should not happen if logic is correct
                console.error("No matching slice found for value", resultValue);
                isSpinning = false;
                return;
            }
            // Need the index to find the sprite
            const targetSlice = matchingSlices[Math.floor(Math.random() * matchingSlices.length)];
            const targetIndex = layoutRef.current.indexOf(targetSlice);

            // 4. Calculate target angle
            // Center of the target slice
            const centerSlice = (targetSlice.startAngle + targetSlice.endAngle) / 2;
            const targetAngle = centerSlice;

            // The pointer is at -90 (Top).
            const targetWheelAngle = -90 - targetAngle;
            
            // Calculate safe random offset to stay within the slice
            // Slice width is (endAngle - startAngle)
            const sliceWidth = targetSlice.endAngle - targetSlice.startAngle;
            const maxOffset = sliceWidth * 0.4; // Keep 10% margin on each side to be safe
            const randomOffset = Phaser.Math.FloatBetween(-maxOffset, maxOffset);
            
            // FIX: Visual Overlap Compensation (still useful to center the bill roughly at top)
            const visualOverlapOffset = 12;

            const totalAngle = targetWheelAngle + (360 * 10) + randomOffset + visualOverlapOffset; // Spin 10 times 

            scene.tweens.add({
                targets: wheelContainer,
                angle: totalAngle,
                duration: 5000,
                ease: 'Cubic.easeOut',
                onComplete: () => {
                    // Animation: Winning bill flies out
                    const winningSprite = sliceSprites[targetIndex];
                    if (winningSprite) {
                        animateWinningBill(scene, winningSprite, resultValue);
                    } else {
                        // Fallback if something fails
                        isSpinning = false;
                        if (onResultRef.current) onResultRef.current(resultValue);
                    }
                }
            });
        }

        function animateWinningBill(scene: Phaser.Scene, originalSprite: Phaser.GameObjects.Image, value: number) {
            const { width, height } = scene.scale;
            const centerX = width / 2;
            const centerY = height / 2;

            // Calculate start position relative to wheel
            const totalRotation = Phaser.Math.DegToRad(wheelContainer.angle) + originalSprite.rotation;
            const spriteWidth = originalSprite.width * originalSprite.scaleX;
            // The sprite is offset from center, so we need its world position
            const startX = centerX + Math.cos(totalRotation) * (spriteWidth / 2);
            const startY = centerY + Math.sin(totalRotation) * (spriteWidth / 2);

            // Create a container for the flying effect
            // Container handles: Position (Path), Overall Scale
            const container = scene.add.container(startX, startY);
            container.setDepth(1000);
            container.setScale(originalSprite.scale); // Start at same scale
            container.setRotation(totalRotation); // Start at same rotation

            // Create the bill image inside the container
            // Image handles: Local Rotation (Tumble), Local Scale/Skew (Flutter)
            const clone = scene.add.image(0, 0, originalSprite.texture.key);
            clone.setOrigin(0.5, 0.5);
            container.add(clone);

            // Hide original
            originalSprite.setVisible(false);

            // WIND EFFECT: "Paper floating in wind"
            // 1. Random destination (mostly Up/Left/Right - away from wheel)
            const targetX = Phaser.Math.Between(0, width);
            const targetY = -200; // Fly off top screen

            // 2. Control Points for Bezier curve (S-curve drift)
            const drift = Phaser.Math.Between(-300, 300);
            const controlX1 = startX + drift * 0.8; // Wider drift
            const controlY1 = startY - height * 0.4;
            const controlX2 = targetX - drift * 0.8;
            const controlY2 = targetY + height * 0.3;

            const curve = new Phaser.Curves.CubicBezier(
                new Phaser.Math.Vector2(startX, startY),
                new Phaser.Math.Vector2(controlX1, controlY1),
                new Phaser.Math.Vector2(controlX2, controlY2),
                new Phaser.Math.Vector2(targetX, targetY)
            );

            const pathObj = { t: 0, vec: new Phaser.Math.Vector2() };

            // Path Follower (Moves the CONTAINER)
            scene.tweens.add({
                targets: pathObj,
                t: 1,
                duration: 3500, // Slightly slower for more "floaty" feel
                ease: 'Sine.easeInOut',
                onUpdate: () => {
                    curve.getPoint(pathObj.t, pathObj.vec);
                    container.setPosition(pathObj.vec.x, pathObj.vec.y);
                },
                onComplete: () => {
                    container.destroy();
                    isSpinning = false;
                    if (onResultRef.current) {
                        onResultRef.current(value);
                    }
                }
            });

            // Global Scale Up (Zoom towards camera) - on CONTAINER
            scene.tweens.add({
                targets: container,
                scaleX: container.scaleX * 1.5,
                scaleY: container.scaleY * 1.5,
                duration: 3500,
                ease: 'Cubic.easeOut'
            });

            // 3. Tumble Rotation (Spin slowly but chaotically) - on IMAGE
            scene.tweens.add({
                targets: clone,
                rotation: Phaser.Math.FloatBetween(-2, 2), // Spin 1-2 times randomly
                duration: 3500,
                ease: 'Sine.easeInOut'
            });

            // 4. Flutter Effect (Complex Scale + Skew to simulate bending/paper physics) - on IMAGE
            // Phase 1: Scale X oscillation (Flipping)
            // We use a simple flip loop: 1 -> 0.1 -> 1
            scene.tweens.add({
                targets: clone,
                scaleX: 0.2, // Compress horizontally to simulate edge-on view
                duration: Phaser.Math.Between(400, 700),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });

            // Phase 2: Skew X (Distortion/Bending)
            // This makes the rectangular image look like a parallelogram
            scene.tweens.add({
                targets: clone,
                skewX: { from: -0.5, to: 0.5 }, // Distort horizontally
                duration: Phaser.Math.Between(1000, 1500),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });

            // Phase 3: Slight Scale Y variation (Breathing)
            scene.tweens.add({
                targets: clone,
                scaleY: 0.9,
                duration: Phaser.Math.Between(500, 1000),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }

        function determineRewardValue(config: WheelConfigItem[]): number {
            const rnd = Math.random() * 100;
            let currentSum = 0;
            for (const item of config) {
                currentSum += item.percent;
                if (rnd <= currentSum) {
                    return item.value;
                }
            }
            return config[config.length - 1].value;
        }

        return () => {
            game.destroy(true);
        };
    }, []);

    return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
};
