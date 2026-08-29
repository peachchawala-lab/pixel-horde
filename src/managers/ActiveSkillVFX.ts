import Phaser from 'phaser';
import { Player } from '../entities/player/Player';

/**
 * ActiveSkillVFX — Dedicated visual effects handler for active player abilities.
 * Uses layered Graphics + particles for cinematic pixel-art presentation.
 * All effects are self-cleaning (destroy themselves after completion).
 */
export class ActiveSkillVFX {
    private scene: Phaser.Scene;
    private player: Player;
    private vfxGraphics: Phaser.GameObjects.Graphics;

    constructor(scene: Phaser.Scene, player: Player) {
        this.scene = scene;
        this.player = player;
        this.vfxGraphics = scene.add.graphics();
        this.vfxGraphics.setDepth(200);
    }

    // ═══════════════════════════════════════════════════════════════
    // ARCANE CLEAVE VFX
    // ═══════════════════════════════════════════════════════════════

    /**
     * Full Arcane Cleave visual sequence:
     * 1. Anticipation tint
     * 2. Layered circular slash arcs (dark → cyan → white)
     * 3. Golden particle burst
     * 4. Expanding shockwave ring
     * 5. Pixel sparks
     * 6. Screen shake + hit-stop
     */
    public playArcaneCleave(): void {
        const px = this.player.sprite.x;
        const py = this.player.sprite.y;

        // Play attack animation
        this.player.playAttackAnimation(0);

        // ── 1. Anticipation flash ──
        this.player.sprite.setTint(0x00f5d4);
        this.scene.time.delayedCall(80, () => {
            if (this.player.sprite?.active) this.player.sprite.clearTint();
        });

        // ── 2. Layered circular slash arcs ──
        this.scene.time.delayedCall(100, () => {
            // Arc layers: outer dark → mid cyan → inner white
            const arcLayers = [
                { radius: 75, lineWidth: 14, color: 0x1a252f, alpha: 0.6 },
                { radius: 70, lineWidth: 10, color: 0x00b4d8, alpha: 0.8 },
                { radius: 65, lineWidth: 6, color: 0x00f5d4, alpha: 0.9 },
                { radius: 60, lineWidth: 3, color: 0xffffff, alpha: 1.0 }
            ];

            const g = this.scene.add.graphics();
            g.setDepth(210);

            // Draw rotating arc sweep
            let startAngle = -Math.PI;
            const sweepDuration = 180;
            const startTime = this.scene.time.now;

            const arcTween = this.scene.time.addEvent({
                delay: 16,
                repeat: Math.floor(sweepDuration / 16),
                callback: () => {
                    g.clear();
                    const elapsed = this.scene.time.now - startTime;
                    const progress = Math.min(1, elapsed / sweepDuration);
                    const sweepAngle = progress * Math.PI * 2;

                    for (const layer of arcLayers) {
                        const fadeAlpha = layer.alpha * (1 - progress * 0.3);
                        g.lineStyle(layer.lineWidth, layer.color, fadeAlpha);
                        g.beginPath();
                        g.arc(px, py, layer.radius, startAngle, startAngle + sweepAngle, false);
                        g.strokePath();
                    }
                }
            });

            // Fade out and destroy
            this.scene.time.delayedCall(sweepDuration + 50, () => {
                arcTween.destroy();
                this.scene.tweens.add({
                    targets: g,
                    alpha: 0,
                    duration: 120,
                    onComplete: () => g.destroy()
                });
            });
        });

        // ── 3. Golden particle burst ──
        this.scene.time.delayedCall(120, () => {
            const emitter = this.scene.add.particles(px, py, 'effect_particle', {
                speed: { min: 60, max: 180 },
                angle: { min: 0, max: 360 },
                scale: { start: 1.8, end: 0 },
                alpha: { start: 1, end: 0 },
                tint: [0xffd700, 0xf1c40f, 0xffffff, 0x00f5d4],
                lifespan: 400,
                emitting: false
            });
            emitter.setDepth(215);
            emitter.explode(20);
            this.scene.time.delayedCall(500, () => emitter.destroy());
        });

        // ── 4. Expanding shockwave ring ──
        this.scene.time.delayedCall(130, () => {
            const ring = this.scene.add.graphics();
            ring.setDepth(205);
            let ringRadius = 20;
            const maxRadius = 90;
            const ringDuration = 250;
            const ringStart = this.scene.time.now;

            const ringEvent = this.scene.time.addEvent({
                delay: 16,
                repeat: Math.floor(ringDuration / 16),
                callback: () => {
                    ring.clear();
                    const elapsed = this.scene.time.now - ringStart;
                    const progress = Math.min(1, elapsed / ringDuration);
                    ringRadius = 20 + progress * (maxRadius - 20);
                    const alpha = 1 - progress;

                    ring.lineStyle(4, 0x00f5d4, alpha * 0.7);
                    ring.strokeCircle(px, py, ringRadius);
                    ring.lineStyle(2, 0xffffff, alpha * 0.5);
                    ring.strokeCircle(px, py, ringRadius - 4);
                }
            });

            this.scene.time.delayedCall(ringDuration + 20, () => {
                ringEvent.destroy();
                ring.destroy();
            });
        });

        // ── 5. Pixel sparks (small scattered particles) ──
        this.scene.time.delayedCall(100, () => {
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI * 2 / 8) * i + Math.random() * 0.3;
                const dist = 50 + Math.random() * 30;
                const sx = px + Math.cos(angle) * dist;
                const sy = py + Math.sin(angle) * dist;

                const spark = this.scene.add.graphics();
                spark.setDepth(220);
                spark.fillStyle(0xffd700, 1);
                spark.fillRect(sx, sy, 3, 3);
                spark.fillStyle(0xffffff, 1);
                spark.fillRect(sx + 1, sy + 1, 1, 1);

                this.scene.tweens.add({
                    targets: spark,
                    alpha: 0,
                    y: sy - 10 - Math.random() * 15,
                    duration: 300 + Math.random() * 200,
                    onComplete: () => spark.destroy()
                });
            }
        });

        // ── 6. Screen shake + hit-stop ──
        this.scene.time.delayedCall(120, () => {
            this.scene.cameras.main.shake(150, 0.015);

            // Brief hit-stop
            this.scene.physics.world.pause();
            this.scene.time.delayedCall(30, () => {
                this.scene.physics.world.resume();
            });
        });

        // ── 7. Impact flash on player ──
        this.scene.time.delayedCall(130, () => {
            this.player.sprite.setTintFill(0xffffff);
            this.scene.time.delayedCall(50, () => {
                if (this.player.sprite?.active) this.player.sprite.clearTint();
            });
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // SOUL NOVA VFX
    // ═══════════════════════════════════════════════════════════════

    /**
     * Soul Nova channeling VFX (plays during cast time).
     * Particles attracted inward + player glow.
     */
    public playSoulNovaChannel(): void {
        const px = this.player.sprite.x;
        const py = this.player.sprite.y;

        // Player glow tint cycle
        this.player.sprite.setTint(0x8e44ad);

        // Channeling particles attracted inward
        const channelEmitter = this.scene.add.particles(px, py, 'effect_particle', {
            speed: { min: -80, max: -30 },
            angle: { min: 0, max: 360 },
            scale: { start: 0, end: 1.5 },
            alpha: { start: 0, end: 0.9 },
            tint: [0x8e44ad, 0x00ffff, 0xd2b4de],
            lifespan: 350,
            frequency: 40,
            emitting: true
        });
        channelEmitter.setDepth(195);

        // Pulsing glow circle under player
        const glowCircle = this.scene.add.graphics();
        glowCircle.setDepth(190);
        const channelStart = this.scene.time.now;

        const glowEvent = this.scene.time.addEvent({
            delay: 16,
            repeat: 24, // ~400ms
            callback: () => {
                glowCircle.clear();
                const elapsed = this.scene.time.now - channelStart;
                const pulse = Math.sin(elapsed / 60) * 5;
                const progress = Math.min(1, elapsed / 400);

                glowCircle.fillStyle(0x8e44ad, 0.15 + progress * 0.15);
                glowCircle.fillCircle(this.player.sprite.x, this.player.sprite.y, 25 + pulse + progress * 15);
                glowCircle.lineStyle(2, 0x00ffff, 0.3 + progress * 0.5);
                glowCircle.strokeCircle(this.player.sprite.x, this.player.sprite.y, 20 + pulse + progress * 10);
            }
        });

        // Cleanup after cast time
        this.scene.time.delayedCall(400, () => {
            channelEmitter.stop();
            glowEvent.destroy();
            this.scene.time.delayedCall(400, () => {
                channelEmitter.destroy();
                glowCircle.destroy();
            });
            if (this.player.sprite?.active) this.player.sprite.clearTint();
        });
    }

    /**
     * Soul Nova explosion VFX (plays when projectiles are fired).
     */
    public playSoulNovaExplosion(): void {
        const px = this.player.sprite.x;
        const py = this.player.sprite.y;

        // ── 1. Core explosion circle ──
        const explosion = this.scene.add.graphics();
        explosion.setDepth(210);
        let expRadius = 10;
        const maxExpRadius = 100;
        const expDuration = 300;
        const expStart = this.scene.time.now;

        const expEvent = this.scene.time.addEvent({
            delay: 16,
            repeat: Math.floor(expDuration / 16),
            callback: () => {
                explosion.clear();
                const elapsed = this.scene.time.now - expStart;
                const progress = Math.min(1, elapsed / expDuration);
                expRadius = 10 + progress * (maxExpRadius - 10);
                const alpha = 1 - progress * 0.8;

                // Layered explosion circles
                explosion.fillStyle(0x8e44ad, alpha * 0.3);
                explosion.fillCircle(px, py, expRadius);
                explosion.fillStyle(0x00ffff, alpha * 0.4);
                explosion.fillCircle(px, py, expRadius * 0.7);
                explosion.fillStyle(0xffffff, alpha * 0.6);
                explosion.fillCircle(px, py, expRadius * 0.3);

                // Edge ring
                explosion.lineStyle(3, 0x00ffff, alpha * 0.8);
                explosion.strokeCircle(px, py, expRadius);
            }
        });

        this.scene.time.delayedCall(expDuration + 50, () => {
            expEvent.destroy();
            explosion.destroy();
        });

        // ── 2. Radial particle burst ──
        const burstEmitter = this.scene.add.particles(px, py, 'effect_particle', {
            speed: { min: 80, max: 250 },
            angle: { min: 0, max: 360 },
            scale: { start: 2, end: 0 },
            alpha: { start: 1, end: 0 },
            tint: [0x8e44ad, 0x00ffff, 0xd2b4de, 0xffffff],
            lifespan: 600,
            emitting: false
        });
        burstEmitter.setDepth(215);
        burstEmitter.explode(30);
        this.scene.time.delayedCall(700, () => burstEmitter.destroy());

        // ── 3. Soul fragment particles (slower, larger) ──
        const soulEmitter = this.scene.add.particles(px, py, 'effect_soul', {
            speed: { min: 40, max: 120 },
            angle: { min: 0, max: 360 },
            scale: { start: 1.5, end: 0 },
            alpha: { start: 0.9, end: 0 },
            lifespan: 800,
            emitting: false
        });
        soulEmitter.setDepth(212);
        soulEmitter.explode(12);
        this.scene.time.delayedCall(900, () => soulEmitter.destroy());

        // ── 4. Screen effects ──
        this.scene.cameras.main.shake(200, 0.012);
        this.scene.cameras.main.flash(150, 80, 0, 200, true); // Brief purple flash

        // ── 5. Player impact flash ──
        this.player.sprite.setTintFill(0xffffff);
        this.scene.time.delayedCall(60, () => {
            if (this.player.sprite?.active) this.player.sprite.clearTint();
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // CRIMSON VITAL VFX
    // ═══════════════════════════════════════════════════════════════

    /**
     * Full Crimson Vital healing visual sequence:
     * 1. Healing rune circle beneath player
     * 2. Rising green/gold particles
     * 3. Light beams converging on player
     * 4. Orbiting soul particles
     * 5. Expanding heal pulse
     * 6. Player glow
     */
    public playCrimsonVital(): void {
        const px = this.player.sprite.x;
        const py = this.player.sprite.y;
        const totalDuration = 800;

        // ── 1. Healing rune circle beneath player ──
        const rune = this.scene.add.graphics();
        rune.setDepth(105);
        const runeStart = this.scene.time.now;

        const runeEvent = this.scene.time.addEvent({
            delay: 16,
            repeat: Math.floor(totalDuration / 16),
            callback: () => {
                rune.clear();
                const elapsed = this.scene.time.now - runeStart;
                const progress = Math.min(1, elapsed / totalDuration);
                const cpx = this.player.sprite.x;
                const cpy = this.player.sprite.y + 10;

                // Fade in then fade out
                const alpha = progress < 0.3 ? progress / 0.3 : (progress > 0.7 ? (1 - progress) / 0.3 : 1);
                const runeRadius = 28 + progress * 8;

                // Outer glow
                rune.fillStyle(0x2ecc71, alpha * 0.15);
                rune.fillCircle(cpx, cpy, runeRadius + 8);

                // Main circle
                rune.lineStyle(2, 0x2ecc71, alpha * 0.8);
                rune.strokeCircle(cpx, cpy, runeRadius);

                // Inner circle
                rune.lineStyle(1, 0x00f5d4, alpha * 0.6);
                rune.strokeCircle(cpx, cpy, runeRadius * 0.6);

                // Rune spokes
                const spokeCount = 6;
                for (let i = 0; i < spokeCount; i++) {
                    const angle = (Math.PI * 2 / spokeCount) * i + elapsed / 800;
                    rune.lineStyle(1, 0xf1c40f, alpha * 0.5);
                    rune.beginPath();
                    rune.moveTo(cpx + Math.cos(angle) * 8, cpy + Math.sin(angle) * 8);
                    rune.lineTo(cpx + Math.cos(angle) * runeRadius, cpy + Math.sin(angle) * runeRadius);
                    rune.strokePath();
                }

                // Cross symbol in center
                rune.lineStyle(2, 0xffd700, alpha * 0.7);
                rune.beginPath();
                rune.moveTo(cpx - 5, cpy);
                rune.lineTo(cpx + 5, cpy);
                rune.moveTo(cpx, cpy - 5);
                rune.lineTo(cpx, cpy + 5);
                rune.strokePath();
            }
        });

        this.scene.time.delayedCall(totalDuration + 50, () => {
            runeEvent.destroy();
            rune.destroy();
        });

        // ── 2. Rising green/gold particles ──
        const riseEmitter = this.scene.add.particles(px, py + 10, 'effect_particle', {
            speedY: { min: -80, max: -30 },
            speedX: { min: -15, max: 15 },
            scale: { start: 1.2, end: 0 },
            alpha: { start: 0.9, end: 0 },
            tint: [0x2ecc71, 0x00f5d4, 0xffd700, 0xffffff],
            lifespan: 600,
            frequency: 50,
            emitting: true
        });
        riseEmitter.setDepth(210);

        this.scene.time.delayedCall(600, () => {
            riseEmitter.stop();
            this.scene.time.delayedCall(700, () => riseEmitter.destroy());
        });

        // ── 3. Light beams converging on player (at heal moment ~300ms) ──
        this.scene.time.delayedCall(250, () => {
            const beamCount = 6;
            for (let i = 0; i < beamCount; i++) {
                const angle = (Math.PI * 2 / beamCount) * i;
                const startX = this.player.sprite.x + Math.cos(angle) * 60;
                const startY = this.player.sprite.y + Math.sin(angle) * 60;

                const beam = this.scene.add.graphics();
                beam.setDepth(208);
                beam.lineStyle(2, 0xffd700, 0.7);
                beam.beginPath();
                beam.moveTo(startX, startY);
                beam.lineTo(this.player.sprite.x, this.player.sprite.y);
                beam.strokePath();

                // Bright core line
                beam.lineStyle(1, 0xffffff, 0.9);
                beam.beginPath();
                beam.moveTo(startX, startY);
                beam.lineTo(this.player.sprite.x, this.player.sprite.y);
                beam.strokePath();

                this.scene.tweens.add({
                    targets: beam,
                    alpha: 0,
                    duration: 350,
                    onComplete: () => beam.destroy()
                });
            }
        });

        // ── 4. Orbiting soul particles ──
        this.scene.time.delayedCall(300, () => {
            const orbitParticles: Phaser.GameObjects.Graphics[] = [];
            const orbitCount = 5;

            for (let i = 0; i < orbitCount; i++) {
                const p = this.scene.add.graphics();
                p.setDepth(215);
                p.fillStyle(0x2ecc71, 0.9);
                p.fillCircle(0, 0, 3);
                p.fillStyle(0xffffff, 0.8);
                p.fillCircle(0, 0, 1.5);
                orbitParticles.push(p);
            }

            const orbitStart = this.scene.time.now;
            const orbitDuration = 500;

            const orbitEvent = this.scene.time.addEvent({
                delay: 16,
                repeat: Math.floor(orbitDuration / 16),
                callback: () => {
                    const elapsed = this.scene.time.now - orbitStart;
                    const progress = Math.min(1, elapsed / orbitDuration);
                    const orbAlpha = progress < 0.7 ? 1 : (1 - progress) / 0.3;
                    const orbRadius = 25 - progress * 15;

                    for (let i = 0; i < orbitCount; i++) {
                        const angle = (elapsed / 150) + (Math.PI * 2 / orbitCount) * i;
                        const floatY = Math.sin(elapsed / 100 + i) * 3;
                        orbitParticles[i].setPosition(
                            this.player.sprite.x + Math.cos(angle) * orbRadius,
                            this.player.sprite.y + Math.sin(angle) * orbRadius * 0.6 + floatY
                        );
                        orbitParticles[i].setAlpha(orbAlpha);
                    }
                }
            });

            this.scene.time.delayedCall(orbitDuration + 50, () => {
                orbitEvent.destroy();
                for (const p of orbitParticles) p.destroy();
            });
        });

        // ── 5. Expanding heal pulse ──
        this.scene.time.delayedCall(350, () => {
            const pulse = this.scene.add.graphics();
            pulse.setDepth(205);
            const pulseStart = this.scene.time.now;
            const pulseDuration = 300;

            const pulseEvent = this.scene.time.addEvent({
                delay: 16,
                repeat: Math.floor(pulseDuration / 16),
                callback: () => {
                    pulse.clear();
                    const elapsed = this.scene.time.now - pulseStart;
                    const progress = Math.min(1, elapsed / pulseDuration);
                    const r = 15 + progress * 50;
                    const alpha = (1 - progress) * 0.6;

                    pulse.lineStyle(3, 0x2ecc71, alpha);
                    pulse.strokeCircle(this.player.sprite.x, this.player.sprite.y, r);
                    pulse.lineStyle(1, 0xffffff, alpha * 0.8);
                    pulse.strokeCircle(this.player.sprite.x, this.player.sprite.y, r - 3);
                }
            });

            this.scene.time.delayedCall(pulseDuration + 50, () => {
                pulseEvent.destroy();
                pulse.destroy();
            });
        });

        // ── 6. Player glow ──
        this.scene.time.delayedCall(300, () => {
            this.player.sprite.setTint(0x2ecc71);
            this.scene.time.delayedCall(400, () => {
                if (this.player.sprite?.active) this.player.sprite.clearTint();
            });
        });
    }

    public destroy(): void {
        if (this.vfxGraphics) {
            this.vfxGraphics.destroy();
        }
    }
}
