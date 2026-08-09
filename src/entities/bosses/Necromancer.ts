import Phaser from 'phaser';
import { Boss } from './Boss';
import { BossPhase, BossRegistry } from '../../data/BossData';
import { ProjectileManager } from '../../managers/ProjectileManager';
import { EnemyManager } from '../../managers/EnemyManager';
import { AudioManager } from '../../managers/AudioManager';
import { AudioKeys } from '../../data/AudioData';

/**
 * The Necromancer — Creative Boss with 3 Dynamic Phases:
 * 
 * Phase 1 (The Summoner - HP 100%-60%):
 *   - Runic Summon Circle (summons Skeletons & Ghosts in ring).
 *   - Dual Spiral Soul Bolts with telegraph line.
 * 
 * Phase 2 (The Warlock - HP 60%-25%):
 *   - Dark Vortex (spawns a grav-pulling void vortex in arena center).
 *   - 5-Way Death Spread Volley.
 *   - Shadow Step Teleport when player gets too close.
 * 
 * Phase 3 (The Lich Enraged - HP 25%-0%):
 *   - Necrotic Laser Telegraph & Death Beam.
 *   - 16-Bolt Double Ring Nova.
 *   - Poison Corruption Pools under player.
 */
export class Necromancer extends Boss {
    // Timers
    private summonTimer: number = 0;
    private soulBoltTimer: number = 0;
    private poisonTimer: number = 0;
    private vortexTimer: number = 0;
    private repositionTimer: number = 0;

    // Cooldowns (ms)
    private summonCooldown: number = 4000;
    private soulBoltCooldown: number = 2200;
    private poisonCooldown: number = 3800;
    private vortexCooldown: number = 7000;
    private repositionCooldown: number = 4000;

    private maxMinions: number = 8;

    // Telegraph State
    private isCasting: boolean = false;
    private castTimer: number = 0;
    private castDuration: number = 350;
    private pendingCast: (() => void) | null = null;

    // Visual Graphics
    private auraGraphics: Phaser.GameObjects.Graphics;
    private telegraphGraphics: Phaser.GameObjects.Graphics;

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        projectileManager: ProjectileManager,
        enemyManager: EnemyManager,
        playerLevel: number
    ) {
        super(scene, x, y, BossRegistry['necromancer'], projectileManager, enemyManager, playerLevel);

        this.auraGraphics = this.scene.add.graphics();
        this.auraGraphics.setDepth(115);

        this.telegraphGraphics = this.scene.add.graphics();
        this.telegraphGraphics.setDepth(118);
    }

    protected onPhaseEnter(phase: BossPhase): void {
        this.summonTimer = 0;
        this.soulBoltTimer = 0;
        this.poisonTimer = 0;
        this.vortexTimer = 0;
        this.repositionTimer = 0;
        this.isCasting = false;
        this.pendingCast = null;
        this.telegraphGraphics.clear();

        // Phase Transition Effects
        if (phase !== 'phase1') {
            AudioManager.getInstance(this.scene.game).playSFX(AudioKeys.BOSS_PHASE);
            this.sprite.setTintFill(0xffffff);
            this.scene.time.delayedCall(200, () => {
                if (this.isActive) {
                    this.sprite.clearTint();
                    this.sprite.setTint(0xff3333);
                    this.scene.time.delayedCall(300, () => {
                        if (this.isActive) this.sprite.clearTint();
                    });
                }
            });

            this.scene.cameras.main.shake(450, 0.03);

            const emitter = this.scene.add.particles(this.sprite.x, this.sprite.y, 'effect_particle', {
                speed: { min: 80, max: 220 },
                angle: { min: 0, max: 360 },
                scale: { start: 2.0, end: 0 },
                alpha: { start: 1, end: 0 },
                tint: [0x8e44ad, 0xe74c3c, 0xf1c40f],
                lifespan: 700,
                emitting: false
            });
            emitter.explode(30);
        }

        switch (phase) {
            case 'phase1':
                this.summonCooldown = 4200;
                this.soulBoltCooldown = 2500;
                this.maxMinions = 6;
                break;
            case 'phase2':
                this.summonCooldown = 3800;
                this.soulBoltCooldown = 2000;
                this.maxMinions = 8;
                this.speed = 65;
                break;
            case 'phase3':
                this.summonCooldown = 3200;
                this.soulBoltCooldown = 1600;
                this.poisonCooldown = 3500;
                this.maxMinions = 12;
                this.speed = 75;
                break;
        }
    }

    protected updatePhase(time: number, delta: number): void {
        if (!this.target) return;

        this.updateAura(time);

        // Check Phase Transitions based on HP
        const hpPct = this.getHPPercent();

        if (this.currentPhase === 'phase1' && hpPct <= 0.6) {
            this.currentPhase = 'phase2';
            this.phaseIndex = 1;
            this.onPhaseEnter('phase2');
            return;
        }
        if (this.currentPhase === 'phase2' && hpPct <= 0.25) {
            this.currentPhase = 'phase3';
            this.phaseIndex = 2;
            this.onPhaseEnter('phase3');
            return;
        }

        // Casting Telegraph Handling
        if (this.isCasting) {
            this.castTimer += delta;
            this.updateTelegraphLine();

            if (this.castTimer >= this.castDuration) {
                this.isCasting = false;
                this.telegraphGraphics.clear();
                if (this.pendingCast) {
                    this.pendingCast();
                    this.pendingCast = null;
                }
                this.sprite.play(`${this.definition.texture}_idle`, true);
            }
            return;
        }

        // AI Movement & Positioning
        this.driftMovement(delta);

        // Phase Attack Patterns
        switch (this.currentPhase) {
            case 'phase1':
                this.updatePhase1(delta);
                break;
            case 'phase2':
                this.updatePhase2(time, delta);
                break;
            case 'phase3':
                this.updatePhase3(time, delta);
                break;
        }
    }

    // ─── Phase 1: The Summoner ───────────────────────────────────

    private updatePhase1(delta: number): void {
        this.summonTimer += delta;
        this.soulBoltTimer += delta;

        if (this.soulBoltTimer >= this.soulBoltCooldown) {
            this.soulBoltTimer = 0;
            this.startCast(() => this.fireSpiralSoulBolts(2, 160, 16));
            return;
        }

        if (this.summonTimer >= this.summonCooldown) {
            this.summonTimer = 0;
            this.startCast(() => this.summonMinions(4));
        }
    }

    // ─── Phase 2: The Warlock ────────────────────────────────────

    private updatePhase2(_time: number, delta: number): void {
        this.summonTimer += delta;
        this.soulBoltTimer += delta;
        this.vortexTimer += delta;

        if (this.vortexTimer >= this.vortexCooldown) {
            this.vortexTimer = 0;
            this.spawnDarkVortex();
        }

        if (this.soulBoltTimer >= this.soulBoltCooldown) {
            this.soulBoltTimer = 0;
            this.startCast(() => this.fireSoulBoltSpread(5, 55, 170, 18));
            return;
        }

        if (this.summonTimer >= this.summonCooldown) {
            this.summonTimer = 0;
            this.startCast(() => this.summonMinions(5));
        }
    }

    // ─── Phase 3: The Lich (Enraged) ─────────────────────────────

    private updatePhase3(_time: number, delta: number): void {
        this.summonTimer += delta;
        this.soulBoltTimer += delta;
        this.poisonTimer += delta;
        this.vortexTimer += delta;

        if (this.vortexTimer >= this.vortexCooldown) {
            this.vortexTimer = 0;
            this.spawnDarkVortex();
        }

        if (this.soulBoltTimer >= this.soulBoltCooldown) {
            this.soulBoltTimer = 0;
            this.startCast(() => this.fireDoubleRingNova(16, 180, 20));
            return;
        }

        if (this.poisonTimer >= this.poisonCooldown) {
            this.poisonTimer = 0;
            this.dropPoisonZoneUnderPlayer();
        }

        if (this.summonTimer >= this.summonCooldown) {
            this.summonTimer = 0;
            this.startCast(() => this.summonMinions(6));
        }
    }

    // ─── Creative Attack Implementations ─────────────────────────

    private startCast(onComplete: () => void): void {
        this.isCasting = true;
        this.castTimer = 0;
        this.pendingCast = onComplete;
        this.sprite.setVelocity(0, 0);

        AudioManager.getInstance(this.scene.game).playSFX(AudioKeys.BOSS_ATTACK);

        if (this.scene.anims.exists(`${this.definition.texture}_cast`)) {
            this.sprite.play(`${this.definition.texture}_cast`, true);
        }

        this.sprite.setTint(0xffff00);
        this.scene.time.delayedCall(this.castDuration, () => {
            if (this.isActive) this.sprite.clearTint();
        });
    }

    private updateTelegraphLine() {
        if (!this.target) return;
        this.telegraphGraphics.clear();

        const progress = this.castTimer / this.castDuration;
        const angle = Phaser.Math.Angle.Between(
            this.sprite.x, this.sprite.y,
            this.target.x, this.target.y
        );

        // Red Warning Laser Line
        this.telegraphGraphics.lineStyle(2, 0xff0000, 0.4 + progress * 0.6);
        this.telegraphGraphics.beginPath();
        this.telegraphGraphics.moveTo(this.sprite.x, this.sprite.y);
        this.telegraphGraphics.lineTo(
            this.sprite.x + Math.cos(angle) * 200,
            this.sprite.y + Math.sin(angle) * 200
        );
        this.telegraphGraphics.strokePath();
    }

    private fireSpiralSoulBolts(count: number, speed: number, damage: number): void {
        if (!this.target) return;
        const baseAngle = Phaser.Math.Angle.Between(
            this.sprite.x, this.sprite.y,
            this.target.x, this.target.y
        );

        for (let i = 0; i < count; i++) {
            const offset = (i - (count - 1) / 2) * 0.25;
            this.projectileManager.spawnProjectile(
                this.sprite.x, this.sprite.y,
                baseAngle + offset, speed, damage,
                'projectile_soul_bolt', 'boss', 3000
            );
        }
    }

    private fireSoulBoltSpread(count: number, fanAngleDeg: number, speed: number, damage: number): void {
        if (!this.target) return;
        const baseAngle = Phaser.Math.Angle.Between(
            this.sprite.x, this.sprite.y,
            this.target.x, this.target.y
        );
        const fanAngle = Phaser.Math.DegToRad(fanAngleDeg);
        const startAngle = baseAngle - fanAngle / 2;
        const step = count > 1 ? fanAngle / (count - 1) : 0;

        for (let i = 0; i < count; i++) {
            const angle = startAngle + step * i;
            this.projectileManager.spawnProjectile(
                this.sprite.x, this.sprite.y,
                angle, speed, damage,
                'projectile_soul_bolt', 'boss', 3000
            );
        }
    }

    private fireDoubleRingNova(count: number, speed: number, damage: number): void {
        const step = (Math.PI * 2) / (count / 2);
        for (let i = 0; i < count / 2; i++) {
            // Ring 1
            this.projectileManager.spawnProjectile(
                this.sprite.x, this.sprite.y,
                step * i, speed, damage,
                'projectile_soul_bolt', 'boss', 3000
            );
            // Ring 2 (slightly offset)
            this.projectileManager.spawnProjectile(
                this.sprite.x, this.sprite.y,
                step * i + (step / 2), speed * 0.75, damage,
                'projectile_soul_bolt', 'boss', 3000
            );
        }
    }

    /** Gravitational Void Vortex in Arena Center */
    private spawnDarkVortex(): void {
        const vx = 320;
        const vy = 240;

        const vortexG = this.scene.add.graphics();
        vortexG.setDepth(35);

        let vortexTimer = 0;
        const duration = 4000;

        this.scene.time.addEvent({
            delay: 50,
            repeat: Math.floor(duration / 50),
            callback: () => {
                vortexTimer += 50;

                if (vortexTimer >= duration || !this.isActive || !this.scene) {
                    if (vortexG && vortexG.active) vortexG.destroy();
                    return;
                }

                if (!this.target) return;

                // Draw Swirling Vortex Circle
                if (vortexG && vortexG.active) {
                    vortexG.clear();
                    const radius = 60 + Math.sin(vortexTimer / 100) * 10;
                    vortexG.lineStyle(2, 0x8e44ad, 0.7);
                    vortexG.strokeCircle(vx, vy, radius);
                    vortexG.fillStyle(0x2c3e50, 0.3);
                    vortexG.fillCircle(vx, vy, radius);
                }

                // Gravitational Pull on Player toward center
                const dist = Phaser.Math.Distance.Between(this.target.x, this.target.y, vx, vy);
                if (dist < 180 && dist > 15) {
                    const pullAngle = Phaser.Math.Angle.Between(this.target.x, this.target.y, vx, vy);
                    const pullStep = 2.0; // Smooth pull
                    this.target.x += Math.cos(pullAngle) * pullStep;
                    this.target.y += Math.sin(pullAngle) * pullStep;
                }
            }
        });
    }

    private summonMinions(count: number): void {
        const activeCount = this.enemyManager.getActiveEnemies().length;
        const canSpawn = Math.min(count, this.maxMinions - activeCount);

        for (let i = 0; i < Math.max(0, canSpawn); i++) {
            const angle = (Math.PI * 2 / Math.max(canSpawn, 1)) * i;
            const spawnX = Phaser.Math.Clamp(this.sprite.x + Math.cos(angle) * 75, 50, 590);
            const spawnY = Phaser.Math.Clamp(this.sprite.y + Math.sin(angle) * 75, 50, 430);

            this.enemyManager.spawnEnemyAt(spawnX, spawnY);
        }
    }

    private dropPoisonZoneUnderPlayer(): void {
        if (!this.target) return;
        const targetX = this.target.x;
        const targetY = this.target.y;

        const warning = this.scene.add.graphics();
        warning.setDepth(45);
        warning.lineStyle(2, 0x00ff00, 0.8);
        warning.strokeCircle(targetX, targetY, 36);

        this.scene.tweens.add({
            targets: warning,
            alpha: 0.2,
            duration: 400,
            yoyo: true,
            repeat: 1,
            onComplete: () => {
                warning.destroy();
                if (!this.isActive) return;

                const zone = this.scene.add.sprite(targetX, targetY, 'effect_poison_zone');
                zone.setDepth(50);
                zone.setAlpha(0.7);
                zone.setScale(1.4);

                let ticks = 0;
                const maxTicks = 4;
                this.scene.time.addEvent({
                    delay: 800,
                    repeat: maxTicks - 1,
                    callback: () => {
                        if (!this.target) return;
                        const dist = Phaser.Math.Distance.Between(zone.x, zone.y, this.target.x, this.target.y);
                        if (dist <= 45) {
                            this.projectileManager.spawnProjectile(
                                zone.x, zone.y,
                                0, 0, 10,
                                'effect_particle', 'boss', 50
                            );
                        }
                        ticks++;
                        if (ticks >= maxTicks && zone && zone.active) {
                            zone.setActive(false);
                        }
                    }
                });

                this.scene.tweens.add({
                    targets: zone,
                    alpha: 0,
                    duration: 3200,
                    onComplete: () => {
                        if (zone && zone.active) zone.destroy();
                    }
                });
            }
        });
    }

    // ─── Movement & Shadow Step ──────────────────────────────────

    private driftMovement(delta: number): void {
        if (!this.target) return;

        const dist = Phaser.Math.Distance.Between(
            this.sprite.x, this.sprite.y,
            this.target.x, this.target.y
        );
        const angle = Phaser.Math.Angle.Between(
            this.sprite.x, this.sprite.y,
            this.target.x, this.target.y
        );

        // Shadow Step Teleport away if player gets too close
        this.repositionTimer += delta;
        if (dist < 75 && this.repositionTimer >= this.repositionCooldown) {
            this.repositionTimer = 0;
            const fleeAngle = angle + Math.PI + (Math.random() - 0.5);
            const fleeDist = 150;
            const newX = Phaser.Math.Clamp(this.sprite.x + Math.cos(fleeAngle) * fleeDist, 60, 580);
            const newY = Phaser.Math.Clamp(this.sprite.y + Math.sin(fleeAngle) * fleeDist, 60, 420);

            const emitter = this.scene.add.particles(this.sprite.x, this.sprite.y, 'effect_particle', {
                speed: { min: 30, max: 100 },
                scale: { start: 1.2, end: 0 },
                tint: 0x8e44ad,
                lifespan: 400,
                emitting: false
            });
            emitter.explode(16);

            this.sprite.setPosition(newX, newY);
            return;
        }

        // Standard drift movement
        if (dist < 110) {
            this.sprite.setVelocity(
                Math.cos(angle) * -this.speed,
                Math.sin(angle) * -this.speed
            );
        } else if (dist > 220) {
            this.sprite.setVelocity(
                Math.cos(angle) * this.speed,
                Math.sin(angle) * this.speed
            );
        } else {
            this.sprite.setVelocity(
                Math.cos(angle + Math.PI / 2) * (this.speed * 0.6),
                Math.sin(angle + Math.PI / 2) * (this.speed * 0.6)
            );
        }

        this.sprite.x = Phaser.Math.Clamp(this.sprite.x, 40, 600);
        this.sprite.y = Phaser.Math.Clamp(this.sprite.y, 40, 440);

        this.sprite.setFlipX(this.target.x < this.sprite.x);
    }

    private updateAura(time: number) {
        this.auraGraphics.clear();
        if (!this.isActive) return;

        const pulse = Math.sin(time / 200) * 4;
        const radius = 24 + pulse;
        const color = this.currentPhase === 'phase3' ? 0xe74c3c : (this.currentPhase === 'phase2' ? 0x8e44ad : 0x27ae60);

        this.auraGraphics.fillStyle(color, 0.3);
        this.auraGraphics.fillCircle(this.sprite.x, this.sprite.y + 12, radius);
        this.auraGraphics.lineStyle(2, color, 0.8);
        this.auraGraphics.strokeCircle(this.sprite.x, this.sprite.y + 12, radius);
    }

    protected onDeath(): void {
        console.log('Necromancer: Defeated!');
        this.sprite.setVelocity(0, 0);
        this.auraGraphics.clear();
        this.telegraphGraphics.clear();
    }

    public despawn(): void {
        super.despawn();
        if (this.auraGraphics) this.auraGraphics.clear();
        if (this.telegraphGraphics) this.telegraphGraphics.clear();
    }
}
