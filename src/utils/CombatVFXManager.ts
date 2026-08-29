import Phaser from 'phaser';

/**
 * CombatVFXManager — Handles spectacular combat visual effects,
 * evolved skill visual flourishes, and dynamic hit feedback.
 */
export class CombatVFXManager {
    /**
     * Executioner Skill — Huge golden shockwave burst & heavy ground strike
     */
    public static playExecutionerEffect(scene: Phaser.Scene, x: number, y: number) {
        const shockwave = scene.add.sprite(x, y, 'effect_shockwave');
        shockwave.setScale(0.5);
        shockwave.setDepth(210);

        scene.tweens.add({
            targets: shockwave,
            scale: 2.2,
            alpha: 0,
            duration: 350,
            ease: 'Quad.easeOut',
            onComplete: () => shockwave.destroy()
        });

        scene.cameras.main.shake(200, 0.03);
    }

    /**
     * Lightning Speed Skill — Lightning speed trail afterimages
     */
    public static spawnSpeedAfterimage(scene: Phaser.Scene, x: number, y: number, flipX: boolean) {
        const afterimage = scene.add.sprite(x, y, 'player_warrior', 4);
        afterimage.setFlipX(flipX);
        afterimage.setTint(0x3498db);
        afterimage.setAlpha(0.6);
        afterimage.setDepth(100);

        scene.tweens.add({
            targets: afterimage,
            alpha: 0,
            scale: 1.2,
            duration: 250,
            onComplete: () => afterimage.destroy()
        });
    }

    /**
     * Soul Collector Skill — Purple/cyan soul flying particles toward player
     */
    public static spawnSoulParticle(scene: Phaser.Scene, startX: number, startY: number, targetX: number, targetY: number) {
        const soul = scene.add.sprite(startX, startY, 'effect_soul');
        soul.setDepth(205);

        scene.tweens.add({
            targets: soul,
            x: targetX,
            y: targetY,
            scale: { from: 1.2, to: 0.5 },
            alpha: { from: 1, to: 0.2 },
            duration: 450,
            ease: 'Sine.easeIn',
            onComplete: () => soul.destroy()
        });
    }

    /**
     * Blood Edge Skill — Red sword aura burst
     */
    public static playBloodEdgeBurst(scene: Phaser.Scene, x: number, y: number) {
        const emitter = scene.add.particles(x, y, 'effect_particle', {
            speed: { min: 60, max: 180 },
            angle: { min: 0, max: 360 },
            scale: { start: 2.0, end: 0 },
            alpha: { start: 1, end: 0 },
            tint: [0xe74c3c, 0x900c3f, 0xc0392b],
            lifespan: 400,
            emitting: false
        });
        emitter.explode(20);
        scene.time.delayedCall(450, () => emitter.destroy());
    }
}
