import Phaser from 'phaser';

/**
 * AmbientEffectsManager — Handles the rich dark-fantasy atmosphere
 * including parallax scrolling fog layers and drifting particles.
 */
export class AmbientEffectsManager {
    private scene: Phaser.Scene;
    
    // Layers
    private bgFog: Phaser.GameObjects.TileSprite;
    private midMist: Phaser.GameObjects.TileSprite;
    private groundMist: Phaser.GameObjects.TileSprite;
    private particleMist: Phaser.GameObjects.Particles.ParticleEmitter;

    // Camera tracking
    private lastCamX: number;
    private lastCamY: number;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.lastCamX = scene.cameras.main.scrollX;
        this.lastCamY = scene.cameras.main.scrollY;

        // Layer 1: Background Fog
        this.bgFog = scene.add.tileSprite(0, 0, 1600, 1200, 'effect_fog').setOrigin(0, 0);
        this.bgFog.setAlpha(0.2);
        this.bgFog.setDepth(10); // Above background but below most objects
        this.bgFog.setTint(0x34495e); // Dark blue/grey

        // Layer 2: Midground Mist
        this.midMist = scene.add.tileSprite(0, 0, 1600, 1200, 'effect_fog').setOrigin(0, 0);
        this.midMist.setAlpha(0.25);
        this.midMist.setDepth(50);
        this.midMist.setTint(0x8e44ad); // Purple tint
        this.midMist.setScale(1.5); // Larger, softer shapes

        // Layer 3: Ground Mist (Anchored to bottom)
        this.groundMist = scene.add.tileSprite(0, 800, 1600, 400, 'effect_fog').setOrigin(0, 0);
        this.groundMist.setAlpha(0.35);
        this.groundMist.setDepth(190); // Just below effects, above characters feet conceptually
        this.groundMist.setTint(0x2c3e50);

        // Layer 4: Floating Particles
        this.particleMist = scene.add.particles(0, 0, 'effect_particle', {
            x: { min: 0, max: 1600 },
            y: { min: 0, max: 1200 },
            speedY: { min: -5, max: -20 },
            speedX: { min: -15, max: 15 },
            scale: { start: 1.5, end: 0 },
            alpha: { start: 0.5, end: 0 },
            tint: [0x8e44ad, 0x9b59b6, 0xffffff, 0x3498db],
            lifespan: 5000,
            quantity: 1,
            frequency: 150,
            blendMode: 'ADD'
        });
        this.particleMist.setDepth(210); // Above most things
    }

    public update(_time: number, delta: number) {
        // Continuous slow drift
        this.bgFog.tilePositionX -= 0.01 * delta;
        this.midMist.tilePositionX += 0.015 * delta;
        this.groundMist.tilePositionX -= 0.02 * delta;
        
        // Parallax effect based on camera movement delta
        const camX = this.scene.cameras.main.scrollX;
        const camY = this.scene.cameras.main.scrollY;
        const dx = camX - this.lastCamX;
        const dy = camY - this.lastCamY;

        this.bgFog.tilePositionX += dx * 0.1;
        this.bgFog.tilePositionY += dy * 0.1;
        
        this.midMist.tilePositionX += dx * 0.2;
        this.midMist.tilePositionY += dy * 0.2;
        
        this.groundMist.tilePositionX += dx * 0.3;

        this.lastCamX = camX;
        this.lastCamY = camY;
    }

    public setIntensity(mode: 'normal' | 'boss') {
        if (mode === 'boss') {
            // Darker, denser, more purple for boss
            this.scene.tweens.add({
                targets: this.bgFog,
                alpha: 0.3,
                duration: 2000
            });
            this.scene.tweens.add({
                targets: this.midMist,
                alpha: 0.4,
                duration: 2000
            });
            this.midMist.setTint(0x4a235a);
            
            // Intensify particles
            this.particleMist.frequency = 80;
            this.particleMist.setParticleTint(0x9b59b6);
        } else {
            this.bgFog.setAlpha(0.2);
            this.midMist.setAlpha(0.25);
            this.midMist.setTint(0x8e44ad);
            this.particleMist.frequency = 150;
        }
    }
}
