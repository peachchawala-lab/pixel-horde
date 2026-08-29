import Phaser from 'phaser';
import { Boss } from './Boss';
import { BossPhase, BossRegistry } from '../../data/BossData';
import { ProjectileManager } from '../../managers/ProjectileManager';
import { EnemyManager } from '../../managers/EnemyManager';
import { AudioManager } from '../../managers/AudioManager';
import { AudioKeys } from '../../data/AudioData';

// ─── State Machine ──────────────────────────────────────────────
enum NecroState {
    Idle,
    Drifting,
    Teleporting,
    Summoning,
    CastingSoulBolt,
    Dashing,
    CurseWall,
    CrossBeam,
    RadialBurst,
    RingExplosion,
    Recovery,
    PhaseTransition
}

/**
 * The Necromancer — Redesigned Boss with State-Machine Attack Choreography.
 *
 * Phase 1 (Summoner, 100%–60%):
 *   Drift → Teleport → Summon → Soul Bolt (3-way) → Recovery → loop
 *
 * Phase 2 (Warlock, 60%–25%):
 *   Dash (double) → Bolt Spread (staggered fan) → Curse Wall → Recovery → loop
 *
 * Phase 3 (Enraged Lich, 25%–15%):
 *   Teleport → Cross Beam → Radial (8) → Dash (×3) → Ring Explosion → Recovery → loop
 *
 * Final Frenzy (below 15%):
 *   Same as Phase 3 but faster telegraphs, more projectiles, shorter recovery.
 *
 * Every attack is telegraphed. Every cycle has a recovery window.
 */
export class Necromancer extends Boss {
    // ─── State Machine ──────────────────────────────────────────
    private state: NecroState = NecroState.Idle;
    private stateTimer: number = 0;
    private stateDuration: number = 0;

    // Attack cycle index within a phase
    private cycleIndex: number = 0;
    private isFrenzy: boolean = false;

    // ─── Dash Tracking ──────────────────────────────────────────
    private dashTarget: Phaser.Math.Vector2 = new Phaser.Math.Vector2();
    private dashCount: number = 0;
    private dashMaxCount: number = 2;
    private dashSpeed: number = 350;
    private dashSubState: 'telegraph' | 'moving' | 'turning' | 'done' = 'telegraph';
    private dashSubTimer: number = 0;

    // ─── Beam Tracking ──────────────────────────────────────────
    private beamAngle: number = 0;
    private beamSubState: 'telegraph' | 'active' | 'done' = 'telegraph';
    private beamSubTimer: number = 0;

    // ─── Ring Tracking ────────────────────────────────────────
    private ringRadius: number = 0;
    private ringSubState: 'telegraph' | 'expanding' | 'done' = 'telegraph';
    private ringSubTimer: number = 0;
    private ringDamageDealt: boolean = false;

    // ─── Curse Wall Tracking ────────────────────────────────────
    private wallSubState: 'telegraph' | 'active' | 'done' = 'telegraph';
    private wallSubTimer: number = 0;
    private wallPositions: { x: number; y: number; horizontal: boolean }[] = [];
    private wallGapOffset: number = 0;

    // ─── Summon Tracking ────────────────────────────────────────
    private summonSubState: 'telegraph' | 'spawning' | 'done' = 'telegraph';
    private summonSubTimer: number = 0;
    private summonPositions: { x: number; y: number }[] = [];

    // ─── Teleport Tracking ──────────────────────────────────────
    private teleportTarget: Phaser.Math.Vector2 = new Phaser.Math.Vector2();
    private teleportSubState: 'telegraph' | 'vanish' | 'appear' | 'done' = 'telegraph';
    private teleportSubTimer: number = 0;

    // ─── Soul Bolt Tracking ─────────────────────────────────────
    private boltSubState: 'telegraph' | 'fire1' | 'fire2' | 'done' = 'telegraph';
    private boltSubTimer: number = 0;

    // ─── Radial Tracking ────────────────────────────────────────
    private radialRotation: number = 0;

    // ─── Timing Multiplier ──────────────────────────────────────
    private telegraphMult: number = 1.0; // Shortened during frenzy

    // ─── Minion Cap ─────────────────────────────────────────────
    private maxMinions: number = 6;

    // ─── Graphics ───────────────────────────────────────────────
    private auraGraphics: Phaser.GameObjects.Graphics;
    private telegraphGraphics: Phaser.GameObjects.Graphics;
    private floatingSkullsGraphics: Phaser.GameObjects.Graphics;
    private vfxGraphics: Phaser.GameObjects.Graphics;

    // ─── Arena Bounds (for 800x600 Arena) ───────────────────────
    private readonly ARENA_LEFT = 80;
    private readonly ARENA_RIGHT = 720;
    private readonly ARENA_TOP = 60;
    private readonly ARENA_BOTTOM = 540;

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

        this.floatingSkullsGraphics = this.scene.add.graphics();
        this.floatingSkullsGraphics.setDepth(122);

        this.vfxGraphics = this.scene.add.graphics();
        this.vfxGraphics.setDepth(116);
    }

    // ─── Phase Texture Helpers ───────────────────────────────────

    private getPhaseAnimKey(animType: 'idle' | 'cast' | 'death'): string {
        let prefix = 'boss_necromancer_phase1';
        if (this.currentPhase === 'phase2') prefix = 'boss_necromancer_phase2';
        if (this.currentPhase === 'phase3') prefix = 'boss_necromancer_phase3';
        return `${prefix}_${animType}`;
    }

    private getPhaseTextureKey(): string {
        if (this.currentPhase === 'phase2') return 'boss_necromancer_phase2';
        if (this.currentPhase === 'phase3') return 'boss_necromancer_phase3';
        return 'boss_necromancer_phase1';
    }

    // ─── Phase Enter ─────────────────────────────────────────────

    protected onPhaseEnter(phase: BossPhase): void {
        this.state = NecroState.Idle;
        this.stateTimer = 0;
        this.cycleIndex = 0;
        this.isFrenzy = false;
        this.telegraphMult = 1.0;
        this.telegraphGraphics.clear();
        this.vfxGraphics.clear();

        // Swap texture
        const phaseTex = this.getPhaseTextureKey();
        if (this.scene.textures.exists(phaseTex)) {
            this.sprite.setTexture(phaseTex);
            this.sprite.play(this.getPhaseAnimKey('idle'), true);
        }

        // Phase transition VFX (not on initial spawn)
        if (phase !== 'phase1') {
            this.enterTransitionState(phase);
        }

        // Phase-specific config
        switch (phase) {
            case 'phase1':
                this.maxMinions = 6;
                this.speed = 55;
                this.sprite.setScale(1.0);
                this.sprite.setSize(64, 80);
                this.sprite.setOffset(32, 40);
                break;
            case 'phase2':
                this.maxMinions = 8;
                this.speed = 75;
                this.sprite.setScale(1.0);
                this.sprite.setSize(64, 80);
                this.sprite.setOffset(32, 40);
                break;
            case 'phase3':
                this.maxMinions = 10;
                this.speed = 85;
                this.sprite.setScale(1.0);
                this.sprite.setSize(85, 110);
                this.sprite.setOffset(37, 35);
                break;
        }
    }

    private enterTransitionState(phase: BossPhase): void {
        this.state = NecroState.PhaseTransition;
        this.stateTimer = 0;
        this.stateDuration = 800;
        this.isInvulnerable = true;
        this.sprite.setVelocity(0, 0);

        AudioManager.getInstance(this.scene.game).playSFX(AudioKeys.BOSS_PHASE);
        this.sprite.setTintFill(0xffffff);
        this.scene.cameras.main.shake(450, 0.03);

        let colors = [0x8e44ad, 0xe74c3c, 0xf1c40f];
        if (phase === 'phase2') colors = [0x2ecc71, 0x00ff66, 0x145a32];
        if (phase === 'phase3') colors = [0xff0000, 0x880000, 0x220000];

        const emitter = this.scene.add.particles(this.sprite.x, this.sprite.y, 'effect_particle', {
            speed: { min: 90, max: 250 },
            angle: { min: 0, max: 360 },
            scale: { start: 2.2, end: 0 },
            alpha: { start: 1, end: 0 },
            tint: colors,
            lifespan: 800,
            emitting: false
        });
        emitter.explode(40);

        this.scene.time.delayedCall(800, () => {
            emitter.destroy();
            if (this.isActive) {
                this.sprite.clearTint();
                this.isInvulnerable = false;
                this.state = NecroState.Idle;
                this.stateTimer = 0;
            }
        });
    }

    // ─── Main Update Loop ────────────────────────────────────────

    protected updatePhase(time: number, delta: number): void {
        if (!this.target) return;

        if (this.isDead() || this.getCurrentHP() <= 0) {
            this.currentPhase = 'dead';
            this.onDeath();
            return;
        }

        this.updateAura(time);

        // Phase transitions by HP
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

        // Frenzy check
        if (this.currentPhase === 'phase3' && hpPct <= 0.15 && !this.isFrenzy) {
            this.isFrenzy = true;
            this.telegraphMult = 0.65;
            this.dashMaxCount = 4;

            // Frenzy pulse VFX
            this.scene.cameras.main.shake(300, 0.02);
            const emitter = this.scene.add.particles(this.sprite.x, this.sprite.y, 'effect_particle', {
                speed: { min: 60, max: 180 },
                angle: { min: 0, max: 360 },
                scale: { start: 2, end: 0 },
                alpha: { start: 1, end: 0 },
                tint: [0xff0000, 0xff00ff, 0x000000],
                lifespan: 600,
                emitting: false
            });
            emitter.explode(30);
            this.scene.time.delayedCall(600, () => emitter.destroy());
        }

        // State machine
        this.updateStateMachine(time, delta);
    }

    // ─── State Machine Router ────────────────────────────────────

    private updateStateMachine(_time: number, delta: number): void {
        this.stateTimer += delta;

        // Face player
        if (this.target && this.state !== NecroState.Dashing) {
            this.sprite.setFlipX(this.target.x < this.sprite.x);
        }

        switch (this.state) {
            case NecroState.Idle:
                this.handleIdle();
                break;
            case NecroState.Drifting:
                this.handleDrifting(delta);
                break;
            case NecroState.Teleporting:
                this.handleTeleporting(delta);
                break;
            case NecroState.Summoning:
                this.handleSummoning(delta);
                break;
            case NecroState.CastingSoulBolt:
                this.handleSoulBolt(delta);
                break;
            case NecroState.Dashing:
                this.handleDashing(delta);
                break;
            case NecroState.CurseWall:
                this.handleCurseWall(delta);
                break;
            case NecroState.CrossBeam:
                this.handleCrossBeam(delta);
                break;
            case NecroState.RadialBurst:
                this.handleRadialBurst(delta);
                break;
            case NecroState.RingExplosion:
                this.handleRingExplosion(delta);
                break;
            case NecroState.Recovery:
                this.handleRecovery(delta);
                break;
            case NecroState.PhaseTransition:
                // Handled by delayed call — just wait
                break;
        }
    }

    // ─── State: Idle ─────────────────────────────────────────────

    private handleIdle(): void {
        // Pick next action from phase cycle
        this.telegraphGraphics.clear();
        this.vfxGraphics.clear();
        this.sprite.setVelocity(0, 0);

        const cycle = this.getAttackCycle();
        const nextState = cycle[this.cycleIndex % cycle.length];
        this.cycleIndex++;

        this.transitionTo(nextState);
    }

    private getAttackCycle(): NecroState[] {
        switch (this.currentPhase) {
            case 'phase1':
                return [
                    NecroState.Drifting,
                    NecroState.Teleporting,
                    NecroState.Summoning,
                    NecroState.CastingSoulBolt,
                    NecroState.Recovery
                ];
            case 'phase2':
                return [
                    NecroState.Dashing,
                    NecroState.CastingSoulBolt,
                    NecroState.CurseWall,
                    NecroState.Recovery
                ];
            case 'phase3':
                return [
                    NecroState.Teleporting,
                    NecroState.CrossBeam,
                    NecroState.RadialBurst,
                    NecroState.Dashing,
                    NecroState.RingExplosion,
                    NecroState.Recovery
                ];
            default:
                return [NecroState.Drifting, NecroState.Recovery];
        }
    }

    private transitionTo(nextState: NecroState): void {
        this.state = nextState;
        this.stateTimer = 0;
        this.telegraphGraphics.clear();
        this.vfxGraphics.clear();

        // Initialize sub-states for complex attacks
        switch (nextState) {
            case NecroState.Drifting:
                this.stateDuration = 1500;
                break;
            case NecroState.Teleporting:
                this.initTeleport();
                break;
            case NecroState.Summoning:
                this.initSummon();
                break;
            case NecroState.CastingSoulBolt:
                this.initSoulBolt();
                break;
            case NecroState.Dashing:
                this.initDash();
                break;
            case NecroState.CurseWall:
                this.initCurseWall();
                break;
            case NecroState.CrossBeam:
                this.initCrossBeam();
                break;
            case NecroState.RadialBurst:
                this.initRadialBurst();
                break;
            case NecroState.RingExplosion:
                this.initRingExplosion();
                break;
            case NecroState.Recovery:
                this.stateDuration = this.isFrenzy ? 800 : (this.currentPhase === 'phase2' ? 800 : (this.currentPhase === 'phase3' ? 1200 : 1000));
                this.sprite.setVelocity(0, 0);
                this.sprite.play(this.getPhaseAnimKey('idle'), true);
                break;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // STATE HANDLERS
    // ═══════════════════════════════════════════════════════════════

    // ─── Drifting ────────────────────────────────────────────────

    private handleDrifting(_delta: number): void {
        if (!this.target) return;

        const dist = Phaser.Math.Distance.Between(
            this.sprite.x, this.sprite.y,
            this.target.x, this.target.y
        );
        const angle = Phaser.Math.Angle.Between(
            this.sprite.x, this.sprite.y,
            this.target.x, this.target.y
        );

        // Keep distance 130-220px from player
        if (dist < 130) {
            // Retreat
            this.sprite.setVelocity(
                Math.cos(angle) * -this.speed,
                Math.sin(angle) * -this.speed
            );
        } else if (dist > 220) {
            // Approach
            this.sprite.setVelocity(
                Math.cos(angle) * this.speed,
                Math.sin(angle) * this.speed
            );
        } else {
            // Orbit
            this.sprite.setVelocity(
                Math.cos(angle + Math.PI / 2) * (this.speed * 0.6),
                Math.sin(angle + Math.PI / 2) * (this.speed * 0.6)
            );
        }

        this.clampPosition();

        if (this.stateTimer >= this.stateDuration) {
            this.sprite.setVelocity(0, 0);
            this.transitionTo(NecroState.Idle);
        }
    }

    // ─── Teleport ────────────────────────────────────────────────

    private initTeleport(): void {
        if (!this.target) return;
        this.teleportSubState = 'telegraph';
        this.teleportSubTimer = 0;
        this.sprite.setVelocity(0, 0);

        // Pick destination ~180px from player in a random direction
        const angle = Math.random() * Math.PI * 2;
        const dist = 150 + Math.random() * 60;
        this.teleportTarget.set(
            Phaser.Math.Clamp(this.target.x + Math.cos(angle) * dist, this.ARENA_LEFT, this.ARENA_RIGHT),
            Phaser.Math.Clamp(this.target.y + Math.sin(angle) * dist, this.ARENA_TOP, this.ARENA_BOTTOM)
        );
    }

    private handleTeleporting(delta: number): void {
        this.teleportSubTimer += delta;
        const telegraphDur = 700 * this.telegraphMult;

        switch (this.teleportSubState) {
            case 'telegraph': {
                // Draw portal at destination
                this.telegraphGraphics.clear();
                const progress = Math.min(1, this.teleportSubTimer / telegraphDur);
                const portalRadius = 20 * progress;

                this.telegraphGraphics.lineStyle(2, 0x8e44ad, 0.5 + progress * 0.5);
                this.telegraphGraphics.strokeCircle(this.teleportTarget.x, this.teleportTarget.y, portalRadius);
                this.telegraphGraphics.lineStyle(1, 0xff00ff, 0.3 + progress * 0.4);
                this.telegraphGraphics.strokeCircle(this.teleportTarget.x, this.teleportTarget.y, portalRadius * 0.6);

                // Particles swirling toward portal
                if (this.teleportSubTimer > telegraphDur * 0.5 && Math.random() < 0.3) {
                    const pAngle = Math.random() * Math.PI * 2;
                    const emitter = this.scene.add.particles(
                        this.teleportTarget.x + Math.cos(pAngle) * 30,
                        this.teleportTarget.y + Math.sin(pAngle) * 30,
                        'effect_particle', {
                            speed: { min: 20, max: 60 },
                            scale: { start: 1.2, end: 0 },
                            tint: [0x8e44ad, 0xff00ff],
                            lifespan: 300,
                            emitting: false
                        }
                    );
                    emitter.explode(3);
                    this.scene.time.delayedCall(400, () => emitter.destroy());
                }

                if (this.teleportSubTimer >= telegraphDur) {
                    this.teleportSubState = 'vanish';
                    this.teleportSubTimer = 0;

                    // Vanish particles at old position
                    const vanishEmitter = this.scene.add.particles(this.sprite.x, this.sprite.y, 'effect_particle', {
                        speed: { min: 30, max: 100 },
                        scale: { start: 1.5, end: 0 },
                        tint: [0x8e44ad, 0x4a235a],
                        lifespan: 400,
                        emitting: false
                    });
                    vanishEmitter.explode(18);
                    this.scene.time.delayedCall(500, () => vanishEmitter.destroy());

                    // Move instantly
                    this.sprite.setPosition(this.teleportTarget.x, this.teleportTarget.y);
                    this.sprite.setAlpha(0);

                    AudioManager.getInstance(this.scene.game).playSFX(AudioKeys.BOSS_ATTACK);
                }
                break;
            }
            case 'vanish': {
                // Fade in at new position
                const fadeProgress = Math.min(1, this.teleportSubTimer / 250);
                this.sprite.setAlpha(fadeProgress);
                this.telegraphGraphics.clear();

                if (this.teleportSubTimer >= 250) {
                    this.teleportSubState = 'done';
                    this.sprite.setAlpha(1);

                    // Appear particles
                    const appearEmitter = this.scene.add.particles(this.sprite.x, this.sprite.y, 'effect_particle', {
                        speed: { min: 40, max: 120 },
                        angle: { min: 0, max: 360 },
                        scale: { start: 1.5, end: 0 },
                        tint: [0x8e44ad, 0xff00ff, 0x000000],
                        lifespan: 350,
                        emitting: false
                    });
                    appearEmitter.explode(14);
                    this.scene.time.delayedCall(400, () => appearEmitter.destroy());

                    this.scene.cameras.main.shake(100, 0.008);
                }
                break;
            }
            case 'done':
                this.transitionTo(NecroState.Idle);
                break;
        }
    }

    // ─── Summoning ───────────────────────────────────────────────

    private initSummon(): void {
        this.summonSubState = 'telegraph';
        this.summonSubTimer = 0;
        this.sprite.setVelocity(0, 0);

        // Play cast anim
        const castKey = this.getPhaseAnimKey('cast');
        if (this.scene.anims.exists(castKey)) {
            this.sprite.play(castKey, true);
        }

        AudioManager.getInstance(this.scene.game).playSFX(AudioKeys.BOSS_ATTACK);

        // Determine spawn positions in a ring around boss
        const count = this.isFrenzy ? 5 : (this.currentPhase === 'phase3' ? 4 : 3);
        this.summonPositions = [];
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i;
            this.summonPositions.push({
                x: Phaser.Math.Clamp(this.sprite.x + Math.cos(angle) * 85, this.ARENA_LEFT + 10, this.ARENA_RIGHT - 10),
                y: Phaser.Math.Clamp(this.sprite.y + Math.sin(angle) * 85, this.ARENA_TOP + 10, this.ARENA_BOTTOM - 10)
            });
        }
    }

    private handleSummoning(delta: number): void {
        this.summonSubTimer += delta;
        const telegraphDur = 600 * this.telegraphMult;

        switch (this.summonSubState) {
            case 'telegraph': {
                // Draw ritual circles at each spawn position
                this.telegraphGraphics.clear();
                const progress = Math.min(1, this.summonSubTimer / telegraphDur);

                for (const pos of this.summonPositions) {
                    const radius = 18 * progress;
                    this.telegraphGraphics.fillStyle(0x8e44ad, 0.2 + progress * 0.2);
                    this.telegraphGraphics.fillCircle(pos.x, pos.y, radius);
                    this.telegraphGraphics.lineStyle(2, 0xff00ff, 0.5 + progress * 0.5);
                    this.telegraphGraphics.strokeCircle(pos.x, pos.y, radius);
                }

                // Cast tint
                this.sprite.setTint(0x9b59b6);

                if (this.summonSubTimer >= telegraphDur) {
                    this.summonSubState = 'spawning';
                    this.summonSubTimer = 0;
                    this.telegraphGraphics.clear();
                    this.sprite.clearTint();

                    // Spawn enemies
                    const activeCount = this.enemyManager.getActiveEnemies().length;
                    let spawned = 0;
                    for (const pos of this.summonPositions) {
                        if (activeCount + spawned >= this.maxMinions) break;
                        this.enemyManager.spawnEnemyAt(pos.x, pos.y);
                        spawned++;

                        // Rising soul particles
                        const emitter = this.scene.add.particles(pos.x, pos.y, 'effect_particle', {
                            speedY: { min: -60, max: -20 },
                            scale: { start: 1.2, end: 0 },
                            alpha: { start: 1, end: 0 },
                            tint: [0x8e44ad, 0xff00ff, 0x00f5d4],
                            lifespan: 500,
                            emitting: false
                        });
                        emitter.explode(10);
                        this.scene.time.delayedCall(600, () => emitter.destroy());
                    }
                }
                break;
            }
            case 'spawning': {
                if (this.summonSubTimer >= 300) {
                    this.summonSubState = 'done';
                    this.sprite.play(this.getPhaseAnimKey('idle'), true);
                }
                break;
            }
            case 'done':
                this.transitionTo(NecroState.Idle);
                break;
        }
    }

    // ─── Soul Bolt ───────────────────────────────────────────────

    private initSoulBolt(): void {
        this.boltSubState = 'telegraph';
        this.boltSubTimer = 0;
        this.sprite.setVelocity(0, 0);

        const castKey = this.getPhaseAnimKey('cast');
        if (this.scene.anims.exists(castKey)) {
            this.sprite.play(castKey, true);
        }
        this.sprite.setTint(0x9b59b6);
    }

    private handleSoulBolt(_delta: number): void {
        if (!this.target) return;
        this.boltSubTimer += _delta;
        const telegraphDur = 500 * this.telegraphMult;

        switch (this.boltSubState) {
            case 'telegraph': {
                // Draw aiming line
                this.telegraphGraphics.clear();
                const progress = Math.min(1, this.boltSubTimer / telegraphDur);
                const angle = Phaser.Math.Angle.Between(
                    this.sprite.x, this.sprite.y,
                    this.target.x, this.target.y
                );

                this.telegraphGraphics.lineStyle(2, 0xff0000, 0.3 + progress * 0.5);
                this.telegraphGraphics.beginPath();
                this.telegraphGraphics.moveTo(this.sprite.x, this.sprite.y);
                this.telegraphGraphics.lineTo(
                    this.sprite.x + Math.cos(angle) * 250,
                    this.sprite.y + Math.sin(angle) * 250
                );
                this.telegraphGraphics.strokePath();

                // Charge particles
                if (progress > 0.5 && Math.random() < 0.4) {
                    const pAngle = Math.random() * Math.PI * 2;
                    const emitter = this.scene.add.particles(
                        this.sprite.x + Math.cos(pAngle) * 25,
                        this.sprite.y + Math.sin(pAngle) * 25,
                        'effect_particle', {
                            speed: { min: -40, max: -10 },
                            scale: { start: 0, end: 1.3 },
                            tint: [0x4a235a, 0x8e44ad],
                            lifespan: 200,
                            emitting: false
                        }
                    );
                    emitter.explode(2);
                    this.scene.time.delayedCall(300, () => emitter.destroy());
                }

                if (this.boltSubTimer >= telegraphDur) {
                    this.boltSubState = 'fire1';
                    this.boltSubTimer = 0;
                    this.telegraphGraphics.clear();
                    this.sprite.clearTint();

                    AudioManager.getInstance(this.scene.game).playSFX(AudioKeys.BOSS_ATTACK);

                    // Fire first volley: 3 bolts at 30° spread
                    this.fireFanBolts(3, 30, 170, 15);
                }
                break;
            }
            case 'fire1': {
                // In Phase 2+, fire a second staggered volley after a short delay
                if (this.currentPhase !== 'phase1' && this.boltSubTimer >= 300) {
                    this.boltSubState = 'fire2';
                    this.boltSubTimer = 0;

                    // Fire second volley at offset angle
                    this.fireFanBolts(3, 30, 160, 15, 15); // 15° offset
                } else if (this.currentPhase === 'phase1' && this.boltSubTimer >= 200) {
                    this.boltSubState = 'done';
                }
                break;
            }
            case 'fire2': {
                if (this.boltSubTimer >= 200) {
                    this.boltSubState = 'done';
                }
                break;
            }
            case 'done':
                this.sprite.play(this.getPhaseAnimKey('idle'), true);
                this.transitionTo(NecroState.Idle);
                break;
        }
    }

    private fireFanBolts(count: number, fanDeg: number, speed: number, damage: number, offsetDeg: number = 0): void {
        if (!this.target) return;
        const baseAngle = Phaser.Math.Angle.Between(
            this.sprite.x, this.sprite.y,
            this.target.x, this.target.y
        ) + Phaser.Math.DegToRad(offsetDeg);

        const fanAngle = Phaser.Math.DegToRad(fanDeg);
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

    // ─── Dashing ─────────────────────────────────────────────────

    private initDash(): void {
        if (!this.target) return;
        this.dashCount = 0;
        this.dashMaxCount = this.isFrenzy ? 4 : (this.currentPhase === 'phase3' ? 3 : 2);
        this.dashSubState = 'telegraph';
        this.dashSubTimer = 0;
        this.dashSpeed = 350;
        this.sprite.setVelocity(0, 0);

        // Lock onto player's current position
        this.dashTarget.set(this.target.x, this.target.y);
    }

    private handleDashing(delta: number): void {
        if (!this.target) return;
        this.dashSubTimer += delta;
        const telegraphDur = 500 * this.telegraphMult;

        switch (this.dashSubState) {
            case 'telegraph': {
                this.sprite.setVelocity(0, 0);
                this.telegraphGraphics.clear();

                const progress = Math.min(1, this.dashSubTimer / telegraphDur);
                const angle = Phaser.Math.Angle.Between(
                    this.sprite.x, this.sprite.y,
                    this.dashTarget.x, this.dashTarget.y
                );

                // Draw dash line
                this.telegraphGraphics.lineStyle(3, 0x8e44ad, 0.3 + progress * 0.6);
                this.telegraphGraphics.beginPath();
                this.telegraphGraphics.moveTo(this.sprite.x, this.sprite.y);
                this.telegraphGraphics.lineTo(
                    this.sprite.x + Math.cos(angle) * 300,
                    this.sprite.y + Math.sin(angle) * 300
                );
                this.telegraphGraphics.strokePath();

                // Warning pulse at boss
                this.sprite.setTint(progress > 0.7 ? 0xff0000 : 0x9b59b6);

                if (this.dashSubTimer >= telegraphDur) {
                    this.dashSubState = 'moving';
                    this.dashSubTimer = 0;
                    this.telegraphGraphics.clear();
                    this.sprite.clearTint();

                    AudioManager.getInstance(this.scene.game).playSFX(AudioKeys.BOSS_ATTACK);

                    // Set velocity toward target + overshoot
                    const dashAngle = Phaser.Math.Angle.Between(
                        this.sprite.x, this.sprite.y,
                        this.dashTarget.x, this.dashTarget.y
                    );
                    this.sprite.setVelocity(
                        Math.cos(dashAngle) * this.dashSpeed,
                        Math.sin(dashAngle) * this.dashSpeed
                    );

                    // Spawn afterimage at start
                    this.spawnAfterimage();
                }
                break;
            }
            case 'moving': {
                this.clampPosition();

                // Afterimage trail
                if (this.dashSubTimer % 60 < delta) {
                    this.spawnAfterimage();
                }

                // Check if reached target area or dash duration exceeded
                const distToTarget = Phaser.Math.Distance.Between(
                    this.sprite.x, this.sprite.y,
                    this.dashTarget.x, this.dashTarget.y
                );

                // Dash contact damage — spawn a short-lived projectile at boss position
                if (this.target) {
                    const distToPlayer = Phaser.Math.Distance.Between(
                        this.sprite.x, this.sprite.y,
                        this.target.x, this.target.y
                    );
                    if (distToPlayer < 25) {
                        this.projectileManager.spawnProjectile(
                            this.sprite.x, this.sprite.y,
                            0, 0, 20,
                            'effect_particle', 'boss', 50
                        );
                    }
                }

                if (distToTarget < 30 || this.dashSubTimer >= 600) {
                    this.sprite.setVelocity(0, 0);
                    this.dashCount++;
                    this.scene.cameras.main.shake(150, 0.01);

                    if (this.dashCount < this.dashMaxCount) {
                        // Turn for next dash
                        this.dashSubState = 'turning';
                        this.dashSubTimer = 0;

                        // Re-target player's current position
                        this.dashTarget.set(this.target.x, this.target.y);
                    } else {
                        this.dashSubState = 'done';
                        this.dashSubTimer = 0;
                    }
                }
                break;
            }
            case 'turning': {
                // Brief pause before next dash
                if (this.dashSubTimer >= 250) {
                    this.dashSubState = 'telegraph';
                    this.dashSubTimer = 0;
                }
                break;
            }
            case 'done': {
                this.sprite.setVelocity(0, 0);
                this.sprite.play(this.getPhaseAnimKey('idle'), true);
                this.transitionTo(NecroState.Idle);
                break;
            }
        }
    }

    private spawnAfterimage(): void {
        // Semi-transparent tinted copy that fades out
        const ghost = this.scene.add.sprite(this.sprite.x, this.sprite.y, this.sprite.texture.key, this.sprite.frame.name);
        ghost.setScale(this.sprite.scaleX, this.sprite.scaleY);
        ghost.setFlipX(this.sprite.flipX);
        ghost.setAlpha(0.5);
        ghost.setTint(0x8e44ad);
        ghost.setDepth(119);

        this.scene.tweens.add({
            targets: ghost,
            alpha: 0,
            duration: 300,
            onComplete: () => ghost.destroy()
        });
    }

    // ─── Curse Wall ──────────────────────────────────────────────

    private initCurseWall(): void {
        this.wallSubState = 'telegraph';
        this.wallSubTimer = 0;
        this.sprite.setVelocity(0, 0);

        // Determine wall orientation and positions
        const horizontal = Math.random() > 0.5;
        this.wallGapOffset = Phaser.Math.Between(80, 300);

        if (horizontal) {
            // Two horizontal walls on top and bottom third
            this.wallPositions = [
                { x: this.ARENA_LEFT, y: this.ARENA_TOP + 100, horizontal: true },
                { x: this.ARENA_LEFT, y: this.ARENA_BOTTOM - 100, horizontal: true }
            ];
        } else {
            // Two vertical walls on left and right third
            this.wallPositions = [
                { x: this.ARENA_LEFT + 150, y: this.ARENA_TOP, horizontal: false },
                { x: this.ARENA_RIGHT - 150, y: this.ARENA_TOP, horizontal: false }
            ];
        }

        // In frenzy, add a third staggered wall
        if (this.isFrenzy) {
            if (horizontal) {
                this.wallPositions.push({ x: this.ARENA_LEFT, y: (this.ARENA_TOP + this.ARENA_BOTTOM) / 2, horizontal: true });
            } else {
                this.wallPositions.push({ x: (this.ARENA_LEFT + this.ARENA_RIGHT) / 2, y: this.ARENA_TOP, horizontal: false });
            }
        }

        const castKey = this.getPhaseAnimKey('cast');
        if (this.scene.anims.exists(castKey)) {
            this.sprite.play(castKey, true);
        }
        AudioManager.getInstance(this.scene.game).playSFX(AudioKeys.BOSS_ATTACK);
    }

    private handleCurseWall(delta: number): void {
        this.wallSubTimer += delta;
        const telegraphDur = 800 * this.telegraphMult;

        switch (this.wallSubState) {
            case 'telegraph': {
                this.telegraphGraphics.clear();
                const progress = Math.min(1, this.wallSubTimer / telegraphDur);

                for (const wall of this.wallPositions) {
                    if (wall.horizontal) {
                        // Horizontal wall telegraph line
                        this.telegraphGraphics.lineStyle(4, 0x8e44ad, 0.2 + progress * 0.4);
                        this.telegraphGraphics.beginPath();
                        this.telegraphGraphics.moveTo(this.ARENA_LEFT, wall.y);
                        this.telegraphGraphics.lineTo(this.ARENA_RIGHT, wall.y);
                        this.telegraphGraphics.strokePath();

                        // Gap indicator
                        this.telegraphGraphics.lineStyle(4, 0x2ecc71, 0.3 + progress * 0.4);
                        this.telegraphGraphics.beginPath();
                        this.telegraphGraphics.moveTo(this.wallGapOffset, wall.y);
                        this.telegraphGraphics.lineTo(this.wallGapOffset + 80, wall.y);
                        this.telegraphGraphics.strokePath();
                    } else {
                        // Vertical wall telegraph line
                        this.telegraphGraphics.lineStyle(4, 0x8e44ad, 0.2 + progress * 0.4);
                        this.telegraphGraphics.beginPath();
                        this.telegraphGraphics.moveTo(wall.x, this.ARENA_TOP);
                        this.telegraphGraphics.lineTo(wall.x, this.ARENA_BOTTOM);
                        this.telegraphGraphics.strokePath();

                        // Gap indicator
                        this.telegraphGraphics.lineStyle(4, 0x2ecc71, 0.3 + progress * 0.4);
                        this.telegraphGraphics.beginPath();
                        this.telegraphGraphics.moveTo(wall.x, this.wallGapOffset);
                        this.telegraphGraphics.lineTo(wall.x, this.wallGapOffset + 80);
                        this.telegraphGraphics.strokePath();
                    }
                }

                this.sprite.setTint(0x2ecc71);

                if (this.wallSubTimer >= telegraphDur) {
                    this.wallSubState = 'active';
                    this.wallSubTimer = 0;
                    this.telegraphGraphics.clear();
                    this.sprite.clearTint();
                    this.sprite.play(this.getPhaseAnimKey('idle'), true);
                    this.scene.cameras.main.shake(200, 0.015);
                }
                break;
            }
            case 'active': {
                // Draw walls and check player collision
                const wallDuration = 2000;
                const wallWidth = 12;
                this.vfxGraphics.clear();

                const progress = Math.min(1, this.wallSubTimer / wallDuration);
                const alpha = progress < 0.8 ? 0.7 : 0.7 * (1 - (progress - 0.8) / 0.2);

                for (const wall of this.wallPositions) {
                    if (wall.horizontal) {
                        // Draw wall with gap
                        this.vfxGraphics.fillStyle(0x8e44ad, alpha);
                        // Left segment
                        this.vfxGraphics.fillRect(this.ARENA_LEFT, wall.y - wallWidth / 2, this.wallGapOffset - this.ARENA_LEFT, wallWidth);
                        // Right segment
                        this.vfxGraphics.fillRect(this.wallGapOffset + 80, wall.y - wallWidth / 2, this.ARENA_RIGHT - (this.wallGapOffset + 80), wallWidth);

                        // Edge glow
                        this.vfxGraphics.lineStyle(1, 0xff00ff, alpha * 0.8);
                        this.vfxGraphics.strokeRect(this.ARENA_LEFT, wall.y - wallWidth / 2, this.wallGapOffset - this.ARENA_LEFT, wallWidth);
                        this.vfxGraphics.strokeRect(this.wallGapOffset + 80, wall.y - wallWidth / 2, this.ARENA_RIGHT - (this.wallGapOffset + 80), wallWidth);

                        // Damage check
                        if (this.target && Math.abs(this.target.y - wall.y) < wallWidth &&
                            (this.target.x < this.wallGapOffset || this.target.x > this.wallGapOffset + 80)) {
                            this.projectileManager.spawnProjectile(
                                this.target.x, this.target.y,
                                0, 0, 12, 'effect_particle', 'boss', 50
                            );
                        }
                    } else {
                        // Vertical wall with gap
                        this.vfxGraphics.fillStyle(0x8e44ad, alpha);
                        this.vfxGraphics.fillRect(wall.x - wallWidth / 2, this.ARENA_TOP, wallWidth, this.wallGapOffset - this.ARENA_TOP);
                        this.vfxGraphics.fillRect(wall.x - wallWidth / 2, this.wallGapOffset + 80, wallWidth, this.ARENA_BOTTOM - (this.wallGapOffset + 80));

                        this.vfxGraphics.lineStyle(1, 0xff00ff, alpha * 0.8);
                        this.vfxGraphics.strokeRect(wall.x - wallWidth / 2, this.ARENA_TOP, wallWidth, this.wallGapOffset - this.ARENA_TOP);
                        this.vfxGraphics.strokeRect(wall.x - wallWidth / 2, this.wallGapOffset + 80, wallWidth, this.ARENA_BOTTOM - (this.wallGapOffset + 80));

                        if (this.target && Math.abs(this.target.x - wall.x) < wallWidth &&
                            (this.target.y < this.wallGapOffset || this.target.y > this.wallGapOffset + 80)) {
                            this.projectileManager.spawnProjectile(
                                this.target.x, this.target.y,
                                0, 0, 12, 'effect_particle', 'boss', 50
                            );
                        }
                    }
                }

                if (this.wallSubTimer >= wallDuration) {
                    this.wallSubState = 'done';
                    this.vfxGraphics.clear();
                }
                break;
            }
            case 'done':
                this.vfxGraphics.clear();
                this.transitionTo(NecroState.Idle);
                break;
        }
    }

    // ─── Cross Beam ──────────────────────────────────────────────

    private initCrossBeam(): void {
        this.beamSubState = 'telegraph';
        this.beamSubTimer = 0;
        this.beamAngle = Math.random() * Math.PI / 4; // Slight rotation offset
        this.sprite.setVelocity(0, 0);

        const castKey = this.getPhaseAnimKey('cast');
        if (this.scene.anims.exists(castKey)) {
            this.sprite.play(castKey, true);
        }
        AudioManager.getInstance(this.scene.game).playSFX(AudioKeys.BOSS_ATTACK);
        this.sprite.setTint(0xff0000);
    }

    private handleCrossBeam(delta: number): void {
        this.beamSubTimer += delta;
        const telegraphDur = 800 * this.telegraphMult;
        const beamDuration = 1500;
        const beamWidth = 20;
        const bx = this.sprite.x;
        const by = this.sprite.y;

        switch (this.beamSubState) {
            case 'telegraph': {
                this.telegraphGraphics.clear();
                const progress = Math.min(1, this.beamSubTimer / telegraphDur);

                // Draw cross telegraph lines
                const len = 350;
                const cos0 = Math.cos(this.beamAngle);
                const sin0 = Math.sin(this.beamAngle);
                const cos90 = Math.cos(this.beamAngle + Math.PI / 2);
                const sin90 = Math.sin(this.beamAngle + Math.PI / 2);

                this.telegraphGraphics.lineStyle(2, 0xff0000, 0.2 + progress * 0.4);
                // Horizontal beam line
                this.telegraphGraphics.beginPath();
                this.telegraphGraphics.moveTo(bx - cos0 * len, by - sin0 * len);
                this.telegraphGraphics.lineTo(bx + cos0 * len, by + sin0 * len);
                this.telegraphGraphics.strokePath();
                // Vertical beam line
                this.telegraphGraphics.beginPath();
                this.telegraphGraphics.moveTo(bx - cos90 * len, by - sin90 * len);
                this.telegraphGraphics.lineTo(bx + cos90 * len, by + sin90 * len);
                this.telegraphGraphics.strokePath();

                // Pulsing width indicator
                if (progress > 0.6) {
                    const pulseWidth = beamWidth * (progress - 0.6) / 0.4;
                    this.telegraphGraphics.fillStyle(0xff0000, 0.1);
                    // Horizontal beam area
                    this.telegraphGraphics.fillRect(bx - len, by - pulseWidth / 2, len * 2, pulseWidth);
                    // Vertical beam area
                    this.telegraphGraphics.fillRect(bx - pulseWidth / 2, by - len, pulseWidth, len * 2);
                }

                if (this.beamSubTimer >= telegraphDur) {
                    this.beamSubState = 'active';
                    this.beamSubTimer = 0;
                    this.telegraphGraphics.clear();
                    this.sprite.clearTint();
                    this.scene.cameras.main.shake(300, 0.02);
                }
                break;
            }
            case 'active': {
                this.vfxGraphics.clear();
                const progress = Math.min(1, this.beamSubTimer / beamDuration);
                const alpha = progress < 0.7 ? 0.75 : 0.75 * (1 - (progress - 0.7) / 0.3);

                const len = 350;
                const cos0 = Math.cos(this.beamAngle);
                const sin0 = Math.sin(this.beamAngle);
                const cos90 = Math.cos(this.beamAngle + Math.PI / 2);
                const sin90 = Math.sin(this.beamAngle + Math.PI / 2);

                // Draw beams as thick lines
                this.vfxGraphics.lineStyle(beamWidth, 0xff0000, alpha * 0.5);
                this.vfxGraphics.beginPath();
                this.vfxGraphics.moveTo(bx - cos0 * len, by - sin0 * len);
                this.vfxGraphics.lineTo(bx + cos0 * len, by + sin0 * len);
                this.vfxGraphics.strokePath();
                this.vfxGraphics.beginPath();
                this.vfxGraphics.moveTo(bx - cos90 * len, by - sin90 * len);
                this.vfxGraphics.lineTo(bx + cos90 * len, by + sin90 * len);
                this.vfxGraphics.strokePath();

                // Core bright line
                this.vfxGraphics.lineStyle(4, 0xff4444, alpha);
                this.vfxGraphics.beginPath();
                this.vfxGraphics.moveTo(bx - cos0 * len, by - sin0 * len);
                this.vfxGraphics.lineTo(bx + cos0 * len, by + sin0 * len);
                this.vfxGraphics.strokePath();
                this.vfxGraphics.beginPath();
                this.vfxGraphics.moveTo(bx - cos90 * len, by - sin90 * len);
                this.vfxGraphics.lineTo(bx + cos90 * len, by + sin90 * len);
                this.vfxGraphics.strokePath();

                // Damage check: is player inside either beam?
                if (this.target) {
                    const dx = this.target.x - bx;
                    const dy = this.target.y - by;
                    // Project onto beam normal to get distance to beam center line
                    const distH = Math.abs(dx * sin0 - dy * cos0);
                    const distV = Math.abs(dx * sin90 - dy * cos90);

                    if (distH < beamWidth / 2 || distV < beamWidth / 2) {
                        // Only damage every ~400ms to avoid instant death
                        if (this.beamSubTimer % 400 < delta) {
                            this.projectileManager.spawnProjectile(
                                this.target.x, this.target.y,
                                0, 0, 18, 'effect_particle', 'boss', 50
                            );
                        }
                    }
                }

                if (this.beamSubTimer >= beamDuration) {
                    this.beamSubState = 'done';
                    this.vfxGraphics.clear();
                }
                break;
            }
            case 'done':
                this.vfxGraphics.clear();
                this.sprite.play(this.getPhaseAnimKey('idle'), true);
                this.transitionTo(NecroState.Idle);
                break;
        }
    }

    // ─── Radial Burst ────────────────────────────────────────────

    private initRadialBurst(): void {
        this.stateTimer = 0;
        this.sprite.setVelocity(0, 0);

        const castKey = this.getPhaseAnimKey('cast');
        if (this.scene.anims.exists(castKey)) {
            this.sprite.play(castKey, true);
        }
        this.sprite.setTint(0xff00ff);
    }

    private handleRadialBurst(delta: number): void {
        const telegraphDur = 500 * this.telegraphMult;

        if (this.stateTimer < telegraphDur) {
            // Telegraph: pulsing circle
            this.telegraphGraphics.clear();
            const progress = Math.min(1, this.stateTimer / telegraphDur);
            const pulseR = 30 + progress * 40;

            this.telegraphGraphics.lineStyle(2, 0xff00ff, 0.3 + progress * 0.5);
            this.telegraphGraphics.strokeCircle(this.sprite.x, this.sprite.y, pulseR);
            this.telegraphGraphics.lineStyle(1, 0x8e44ad, 0.2 + progress * 0.3);
            this.telegraphGraphics.strokeCircle(this.sprite.x, this.sprite.y, pulseR * 0.6);
        } else if (this.stateTimer >= telegraphDur && this.stateTimer < telegraphDur + delta + 1) {
            // Fire!
            this.telegraphGraphics.clear();
            this.sprite.clearTint();

            const boltCount = this.isFrenzy ? 10 : 8;
            const speed = 150;
            const damage = 15;
            const step = (Math.PI * 2) / boltCount;

            for (let i = 0; i < boltCount; i++) {
                const angle = step * i + this.radialRotation;
                this.projectileManager.spawnProjectile(
                    this.sprite.x, this.sprite.y,
                    angle, speed, damage,
                    'projectile_soul_bolt', 'boss', 3000
                );
            }

            // Subtle rotation for next radial
            this.radialRotation += Phaser.Math.DegToRad(15);

            AudioManager.getInstance(this.scene.game).playSFX(AudioKeys.BOSS_ATTACK);
            this.scene.cameras.main.shake(100, 0.008);

            // Burst particles
            const emitter = this.scene.add.particles(this.sprite.x, this.sprite.y, 'effect_particle', {
                speed: { min: 60, max: 140 },
                angle: { min: 0, max: 360 },
                scale: { start: 1.5, end: 0 },
                tint: [0x8e44ad, 0xff00ff],
                lifespan: 400,
                emitting: false
            });
            emitter.explode(16);
            this.scene.time.delayedCall(500, () => emitter.destroy());
        } else if (this.stateTimer >= telegraphDur + 300) {
            this.sprite.play(this.getPhaseAnimKey('idle'), true);
            this.transitionTo(NecroState.Idle);
        }
    }

    // ─── Ring Explosion ──────────────────────────────────────────

    private initRingExplosion(): void {
        this.ringSubState = 'telegraph';
        this.ringSubTimer = 0;
        this.ringRadius = 0;
        this.ringDamageDealt = false;
        this.sprite.setVelocity(0, 0);

        const castKey = this.getPhaseAnimKey('cast');
        if (this.scene.anims.exists(castKey)) {
            this.sprite.play(castKey, true);
        }
        this.sprite.setTint(0x8e44ad);
        AudioManager.getInstance(this.scene.game).playSFX(AudioKeys.BOSS_ATTACK);
    }

    private handleRingExplosion(delta: number): void {
        this.ringSubTimer += delta;
        const telegraphDur = 800 * this.telegraphMult;
        const expandDuration = 1200;
        const maxRadius = 180;
        const ringThickness = 18;
        const bx = this.sprite.x;
        const by = this.sprite.y;

        switch (this.ringSubState) {
            case 'telegraph': {
                this.telegraphGraphics.clear();
                const progress = Math.min(1, this.ringSubTimer / telegraphDur);

                // Expanding rune circle outline
                const previewR = 30 + progress * (maxRadius - 30);
                this.telegraphGraphics.lineStyle(2, 0x8e44ad, 0.2 + progress * 0.4);
                this.telegraphGraphics.strokeCircle(bx, by, previewR);

                // Inner rune marks
                const spokes = 8;
                for (let i = 0; i < spokes; i++) {
                    const a = (Math.PI * 2 / spokes) * i + this.ringSubTimer / 500;
                    this.telegraphGraphics.lineStyle(1, 0xff00ff, 0.15 + progress * 0.25);
                    this.telegraphGraphics.beginPath();
                    this.telegraphGraphics.moveTo(bx + Math.cos(a) * 20, by + Math.sin(a) * 20);
                    this.telegraphGraphics.lineTo(bx + Math.cos(a) * previewR, by + Math.sin(a) * previewR);
                    this.telegraphGraphics.strokePath();
                }

                if (this.ringSubTimer >= telegraphDur) {
                    this.ringSubState = 'expanding';
                    this.ringSubTimer = 0;
                    this.ringRadius = 0;
                    this.telegraphGraphics.clear();
                    this.sprite.clearTint();
                    this.scene.cameras.main.shake(200, 0.015);
                }
                break;
            }
            case 'expanding': {
                this.vfxGraphics.clear();
                const progress = Math.min(1, this.ringSubTimer / expandDuration);
                this.ringRadius = progress * maxRadius;
                const alpha = progress < 0.7 ? 0.8 : 0.8 * (1 - (progress - 0.7) / 0.3);

                // Draw expanding ring
                if (this.ringRadius > ringThickness) {
                    this.vfxGraphics.lineStyle(ringThickness, 0x8e44ad, alpha * 0.6);
                    this.vfxGraphics.strokeCircle(bx, by, this.ringRadius);

                    // Bright inner edge
                    this.vfxGraphics.lineStyle(3, 0xff00ff, alpha);
                    this.vfxGraphics.strokeCircle(bx, by, this.ringRadius - ringThickness / 2);

                    // Bright outer edge
                    this.vfxGraphics.lineStyle(2, 0xff00ff, alpha * 0.7);
                    this.vfxGraphics.strokeCircle(bx, by, this.ringRadius + ringThickness / 2);
                }

                // Damage check: is player inside the ring band?
                if (this.target && !this.ringDamageDealt) {
                    const distToPlayer = Phaser.Math.Distance.Between(bx, by, this.target.x, this.target.y);
                    const innerR = this.ringRadius - ringThickness / 2;
                    const outerR = this.ringRadius + ringThickness / 2;

                    if (distToPlayer >= innerR && distToPlayer <= outerR) {
                        this.projectileManager.spawnProjectile(
                            this.target.x, this.target.y,
                            0, 0, 25, 'effect_particle', 'boss', 50
                        );
                        this.ringDamageDealt = true;
                    }
                }

                if (this.ringSubTimer >= expandDuration) {
                    this.ringSubState = 'done';
                    this.vfxGraphics.clear();
                }
                break;
            }
            case 'done':
                this.vfxGraphics.clear();
                this.sprite.play(this.getPhaseAnimKey('idle'), true);
                this.transitionTo(NecroState.Idle);
                break;
        }
    }

    // ─── Recovery ────────────────────────────────────────────────

    private handleRecovery(_delta: number): void {
        // Boss pauses — player's damage window
        this.sprite.setVelocity(0, 0);

        if (this.stateTimer >= this.stateDuration) {
            this.transitionTo(NecroState.Idle);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // UTILITY METHODS
    // ═══════════════════════════════════════════════════════════════

    private clampPosition(): void {
        this.sprite.x = Phaser.Math.Clamp(this.sprite.x, this.ARENA_LEFT, this.ARENA_RIGHT);
        this.sprite.y = Phaser.Math.Clamp(this.sprite.y, this.ARENA_TOP, this.ARENA_BOTTOM);
    }

    // ─── Aura & Skulls (Preserved) ───────────────────────────────

    private updateAura(time: number) {
        this.auraGraphics.clear();
        this.floatingSkullsGraphics.clear();
        if (!this.isActive) return;

        const pulse = Math.sin(time / 180) * 4;
        const spinAngle = time / 600;
        const feetX = this.sprite.x;
        const feetY = this.sprite.y + 20;

        // Frenzy aura boost
        const frenzyBoost = this.isFrenzy ? 8 : 0;
        const frenzyAlpha = this.isFrenzy ? 0.15 : 0;

        if (this.currentPhase === 'phase1') {
            const r = 36 + pulse;
            this.auraGraphics.fillStyle(0x4a235a, 0.3);
            this.auraGraphics.fillCircle(feetX, feetY, r);
            this.auraGraphics.lineStyle(2, 0x8e44ad, 0.85);
            this.auraGraphics.strokeCircle(feetX, feetY, r);
            this.auraGraphics.lineStyle(1, 0xff00ff, 0.6);
            this.auraGraphics.strokeCircle(feetX, feetY, r - 6);

            for (let k = 0; k < 6; k++) {
                const a = spinAngle + (k * Math.PI / 3);
                this.auraGraphics.lineBetween(
                    feetX + Math.cos(a) * (r - 6), feetY + Math.sin(a) * (r - 6),
                    feetX + Math.cos(a) * r, feetY + Math.sin(a) * r
                );
            }
            this.drawOrbitingSkulls(time, 2, 42, 0xff00ff, 0xbdc3c7);

        } else if (this.currentPhase === 'phase2') {
            const r = 40 + pulse;
            this.auraGraphics.fillStyle(0x145a32, 0.35);
            this.auraGraphics.fillCircle(feetX, feetY, r);
            this.auraGraphics.lineStyle(2, 0x2ecc71, 0.9);
            this.auraGraphics.strokeCircle(feetX, feetY, r);
            this.auraGraphics.lineStyle(1, 0x00ff66, 0.7);
            this.auraGraphics.strokeCircle(feetX, feetY, r - 8);

            for (let k = 0; k < 8; k++) {
                const a = -spinAngle * 1.2 + (k * Math.PI / 4);
                this.auraGraphics.lineBetween(
                    feetX + Math.cos(a) * (r - 8), feetY + Math.sin(a) * (r - 8),
                    feetX + Math.cos(a) * r, feetY + Math.sin(a) * r
                );
            }
            this.drawOrbitingSkulls(time, 3, 46, 0x00ff66, 0x2ecc71);

        } else {
            const r1 = 44 + pulse + frenzyBoost;
            const r2 = 30 - pulse * 0.5;

            this.auraGraphics.fillStyle(0x220000, 0.6 + frenzyAlpha);
            this.auraGraphics.fillCircle(feetX, feetY, r1);
            this.auraGraphics.lineStyle(3, 0xff0000, 0.95);
            this.auraGraphics.strokeCircle(feetX, feetY, r1);
            this.auraGraphics.lineStyle(2, 0x880000, 0.85);
            this.auraGraphics.strokeCircle(feetX, feetY, r2);

            for (let k = 0; k < 12; k++) {
                const a = spinAngle * 1.5 + (k * Math.PI / 6);
                this.auraGraphics.lineBetween(
                    feetX + Math.cos(a) * (r1 - 10), feetY + Math.sin(a) * (r1 - 10),
                    feetX + Math.cos(a) * r1, feetY + Math.sin(a) * r1
                );
            }
            this.drawOrbitingSkulls(time, 4, 52 + frenzyBoost / 2, 0xff0000, 0xecf0f1);
        }
    }

    private drawOrbitingSkulls(time: number, count: number, radius: number, eyeColor: number, skullColor: number) {
        for (let i = 0; i < count; i++) {
            const angle = (time / 450) + (i * Math.PI * 2 / count);
            const floatOffset = Math.sin(time / 200 + i) * 3;
            const sx = this.sprite.x + Math.cos(angle) * radius;
            const sy = (this.sprite.y - 10) + Math.sin(angle) * (radius * 0.5) + floatOffset;

            this.floatingSkullsGraphics.fillStyle(0x000000, 0.4);
            this.floatingSkullsGraphics.fillCircle(sx, sy + 1, 7);
            this.floatingSkullsGraphics.fillStyle(skullColor);
            this.floatingSkullsGraphics.fillCircle(sx, sy, 6);

            this.floatingSkullsGraphics.fillStyle(0x0a0a0a);
            this.floatingSkullsGraphics.fillRect(sx - 3, sy - 1, 2, 3);
            this.floatingSkullsGraphics.fillRect(sx + 1, sy - 1, 2, 3);
            this.floatingSkullsGraphics.fillStyle(eyeColor);
            this.floatingSkullsGraphics.fillRect(sx - 3, sy, 1, 1);
            this.floatingSkullsGraphics.fillRect(sx + 1, sy, 1, 1);
        }
    }

    // ─── Death ───────────────────────────────────────────────────

    protected onDeath(): void {
        console.log('Necromancer: Defeated!');
        this.sprite.setVelocity(0, 0);
        this.sprite.setAlpha(1);
        this.sprite.setVisible(true);
        this.sprite.clearTint();
        this.auraGraphics.clear();
        this.telegraphGraphics.clear();
        this.floatingSkullsGraphics.clear();
        this.vfxGraphics.clear();

        this.sprite.play(this.getPhaseAnimKey('death'), true);

        const emitter = this.scene.add.particles(this.sprite.x, this.sprite.y, 'effect_particle', {
            speed: { min: 40, max: 200 },
            angle: { min: 0, max: 360 },
            scale: { start: 2.5, end: 0 },
            alpha: { start: 1, end: 0 },
            tint: [0xff0000, 0x880000, 0x000000, 0xffffff],
            lifespan: 1200,
            emitting: false
        });
        emitter.explode(50);

        this.scene.tweens.add({
            targets: this.sprite,
            alpha: 0,
            duration: 1200,
            onComplete: () => {
                emitter.destroy();
            }
        });
    }

    public despawn(): void {
        super.despawn();
        if (this.auraGraphics) this.auraGraphics.clear();
        if (this.telegraphGraphics) this.telegraphGraphics.clear();
        if (this.floatingSkullsGraphics) this.floatingSkullsGraphics.clear();
        if (this.vfxGraphics) this.vfxGraphics.clear();
    }
}
