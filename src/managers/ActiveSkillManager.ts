import Phaser from 'phaser';
import { ActiveSkillDefs, ActiveSkillDef } from '../data/ActiveSkillData';
import { ActiveSkillVFX } from './ActiveSkillVFX';
import { Player } from '../entities/player/Player';
import { EnemyManager } from './EnemyManager';
import { BossManager } from './BossManager';
import { ProjectileManager } from './ProjectileManager';
import { CombatManager } from './CombatManager';
import { HealthComponent } from '../components/HealthComponent';
import { AudioManager } from './AudioManager';
import { AudioKeys } from '../data/AudioData';

// ─── Skill State Machine ────────────────────────────────────────
export type ActiveSkillState = 'ready' | 'casting' | 'active' | 'recovery' | 'cooldown';

interface SkillRuntime {
    def: ActiveSkillDef;
    state: ActiveSkillState;
    stateTimer: number;
    cooldownRemaining: number;
    charges: number;         // Only used for charge-based (maxCharges > 0)
}

/**
 * Serializable state for scene transitions.
 */
export interface ActiveSkillSaveState {
    charges: Record<string, number>;
}

/**
 * ActiveSkillManager — Manages 3 player active abilities with clean state machines.
 *
 * Each skill follows: READY → CASTING → ACTIVE → RECOVERY → COOLDOWN → READY
 * Charge-based (Crimson Vital): READY → CASTING → ACTIVE → RECOVERY → READY (no cooldown)
 *
 * Charges persist across scene transitions within the same run.
 * Charges reset only on new run via resetForNewRun().
 */
export class ActiveSkillManager {
    private scene: Phaser.Scene;
    private player: Player;
    private enemyManager: EnemyManager;
    private bossManager: BossManager | null;
    private projectileManager: ProjectileManager;
    private combatManager: CombatManager;
    private vfx: ActiveSkillVFX;

    private skills: Map<string, SkillRuntime> = new Map();

    constructor(
        scene: Phaser.Scene,
        player: Player,
        enemyManager: EnemyManager,
        bossManager: BossManager | null,
        projectileManager: ProjectileManager,
        combatManager: CombatManager
    ) {
        this.scene = scene;
        this.player = player;
        this.enemyManager = enemyManager;
        this.bossManager = bossManager;
        this.projectileManager = projectileManager;
        this.combatManager = combatManager;
        this.vfx = new ActiveSkillVFX(scene, player);

        // Initialize runtime for each skill
        for (const def of ActiveSkillDefs) {
            this.skills.set(def.id, {
                def,
                state: 'ready',
                stateTimer: 0,
                cooldownRemaining: 0,
                charges: def.maxCharges
            });
        }
    }

    // ─── Public API ──────────────────────────────────────────────

    public setBossManager(bossManager: BossManager): void {
        this.bossManager = bossManager;
    }

    /**
     * Attempt to activate a skill by id. Returns true if activation started.
     */
    public tryActivate(skillId: string): boolean {
        const runtime = this.skills.get(skillId);
        if (!runtime) return false;

        // Check if player is alive
        const hp = this.player.getComponent<HealthComponent>('HealthComponent');
        if (!hp || hp.isDead()) return false;

        // Can only activate from ready state
        if (runtime.state !== 'ready') return false;

        // Check charges for charge-based skills
        if (runtime.def.maxCharges > 0 && runtime.charges <= 0) return false;

        // Check cooldown
        if (runtime.cooldownRemaining > 0) return false;

        // Check if any other skill is currently casting/active
        for (const [, otherRuntime] of this.skills) {
            if (otherRuntime.state === 'casting' || otherRuntime.state === 'active') {
                return false;
            }
        }

        // Start casting!
        runtime.state = 'casting';
        runtime.stateTimer = 0;

        // Play Distinct Ability SFX + UI Click
        const audio = AudioManager.getInstance(this.scene.game);
        audio.playSFX(AudioKeys.BUTTON_CLICK, { volume: 0.6 });

        if (skillId === 'arcane_cleave') {
            audio.playSFX(AudioKeys.PLAYER_ATTACK, { volume: 0.9, rate: 1.15 });
        } else if (skillId === 'soul_nova') {
            audio.playSFX(AudioKeys.SKILL_EVOLVE, { volume: 0.85, rate: 1.25 });
        } else if (skillId === 'crimson_vital') {
            audio.playSFX(AudioKeys.LEVEL_UP, { volume: 0.9, rate: 1.35 });
        }

        // Start cast VFX
        this.onCastStart(runtime);

        return true;
    }

    /**
     * Play error audio feedback when a player attempts to press an unavailable skill.
     */
    public playErrorFeedback(): void {
        const audio = AudioManager.getInstance(this.scene.game);
        audio.playSFX(AudioKeys.BUTTON_CLICK, { volume: 0.5, rate: 0.6, detune: -400 });
    }

    /**
     * Update all skill state machines. Call every frame.
     */
    public update(_time: number, delta: number): void {
        for (const [, runtime] of this.skills) {
            this.updateSkillState(runtime, delta);
        }
    }

    /**
     * Get cooldown progress (0 = ready, 1 = full cooldown remaining).
     */
    public getCooldownPercent(skillId: string): number {
        const runtime = this.skills.get(skillId);
        if (!runtime) return 0;
        if (runtime.def.cooldown <= 0) return 0;
        if (runtime.cooldownRemaining <= 0) return 0;
        return runtime.cooldownRemaining / runtime.def.cooldown;
    }

    /**
     * Get remaining cooldown in seconds (e.g. 8.4s).
     */
    public getCooldownSeconds(skillId: string): number {
        const runtime = this.skills.get(skillId);
        if (!runtime || runtime.cooldownRemaining <= 0) return 0;
        return Math.max(0, runtime.cooldownRemaining / 1000);
    }

    /**
     * Get remaining cooldown in milliseconds.
     */
    public getCooldownRemainingMs(skillId: string): number {
        const runtime = this.skills.get(skillId);
        return runtime ? Math.max(0, runtime.cooldownRemaining) : 0;
    }

    /**
     * Get current charges for a skill.
     */
    public getCharges(skillId: string): number {
        const runtime = this.skills.get(skillId);
        return runtime ? runtime.charges : 0;
    }

    /**
     * Get current state for a skill.
     */
    public getState(skillId: string): ActiveSkillState {
        const runtime = this.skills.get(skillId);
        return runtime ? runtime.state : 'ready';
    }

    /**
     * Is a skill usable right now?
     */
    public isReady(skillId: string): boolean {
        const runtime = this.skills.get(skillId);
        if (!runtime) return false;
        if (runtime.state !== 'ready') return false;
        if (runtime.def.maxCharges > 0 && runtime.charges <= 0) return false;
        if (runtime.cooldownRemaining > 0) return false;
        return true;
    }

    /**
     * Reset charges for a new run.
     */
    public resetForNewRun(): void {
        for (const [, runtime] of this.skills) {
            runtime.charges = runtime.def.maxCharges;
            runtime.cooldownRemaining = 0;
            runtime.state = 'ready';
            runtime.stateTimer = 0;
        }
    }

    /**
     * Serialize state for scene transitions (preserves charges).
     */
    public serialize(): ActiveSkillSaveState {
        const charges: Record<string, number> = {};
        for (const [id, runtime] of this.skills) {
            charges[id] = runtime.charges;
        }
        return { charges };
    }

    /**
     * Deserialize state from scene transition data.
     */
    public deserialize(state: ActiveSkillSaveState): void {
        if (!state || !state.charges) return;
        for (const [id, runtime] of this.skills) {
            if (state.charges[id] !== undefined) {
                runtime.charges = state.charges[id];
            }
            // Reset cooldowns on scene transition (fair reset)
            runtime.cooldownRemaining = 0;
            runtime.state = 'ready';
            runtime.stateTimer = 0;
        }
    }

    // ─── State Machine Update ────────────────────────────────────

    private updateSkillState(runtime: SkillRuntime, delta: number): void {
        switch (runtime.state) {
            case 'ready':
                // Tick cooldown if any remains
                if (runtime.cooldownRemaining > 0) {
                    runtime.cooldownRemaining -= delta;
                    if (runtime.cooldownRemaining <= 0) {
                        runtime.cooldownRemaining = 0;
                    }
                }
                break;

            case 'casting':
                runtime.stateTimer += delta;
                if (runtime.stateTimer >= runtime.def.castTime) {
                    // Cast complete → execute effect
                    runtime.state = 'active';
                    runtime.stateTimer = 0;
                    this.onSkillActivate(runtime);
                }
                break;

            case 'active':
                runtime.stateTimer += delta;
                if (runtime.stateTimer >= runtime.def.activeTime) {
                    runtime.state = 'recovery';
                    runtime.stateTimer = 0;
                }
                break;

            case 'recovery':
                runtime.stateTimer += delta;
                if (runtime.stateTimer >= runtime.def.recoveryTime) {
                    // Consume charge for charge-based skills
                    if (runtime.def.maxCharges > 0) {
                        runtime.charges--;
                    }

                    // Enter cooldown or return to ready
                    if (runtime.def.cooldown > 0 && runtime.def.maxCharges === 0) {
                        runtime.state = 'cooldown';
                        runtime.cooldownRemaining = runtime.def.cooldown;
                        runtime.stateTimer = 0;
                    } else {
                        runtime.state = 'ready';
                        runtime.stateTimer = 0;
                    }
                }
                break;

            case 'cooldown':
                runtime.cooldownRemaining -= delta;
                if (runtime.cooldownRemaining <= 0) {
                    runtime.cooldownRemaining = 0;
                    runtime.state = 'ready';
                    runtime.stateTimer = 0;
                }
                break;
        }
    }

    // ─── Cast Start VFX ──────────────────────────────────────────

    private onCastStart(runtime: SkillRuntime): void {
        switch (runtime.def.id) {
            case 'soul_nova':
                this.vfx.playSoulNovaChannel();
                break;
            // Arcane Cleave and Crimson Vital have very short cast times,
            // their VFX play on activate
        }
    }

    // ─── Skill Execution ─────────────────────────────────────────

    private onSkillActivate(runtime: SkillRuntime): void {
        switch (runtime.def.id) {
            case 'arcane_cleave':
                this.executeArcaneCleave(runtime.def);
                break;
            case 'soul_nova':
                this.executeSoulNova(runtime.def);
                break;
            case 'crimson_vital':
                this.executeCrimsonVital(runtime.def);
                break;
        }
    }

    // ─── Arcane Cleave ───────────────────────────────────────────

    private executeArcaneCleave(def: ActiveSkillDef): void {
        const px = this.player.sprite.x;
        const py = this.player.sprite.y;
        const radiusSq = def.radius * def.radius;

        // Calculate damage (scales with baseDamage)
        const dmgMultiplier = def.damageScaleWithBase ? (this.combatManager.baseDamage / 15) : 1;
        const finalDamage = def.damage * dmgMultiplier;

        // Play VFX
        this.vfx.playArcaneCleave();

        // Damage all enemies in radius
        const enemies = this.enemyManager.getActiveEnemies();
        let hitCount = 0;

        for (const enemy of enemies) {
            const distSq = Phaser.Math.Distance.Squared(px, py, enemy.sprite.x, enemy.sprite.y);
            if (distSq <= radiusSq) {
                const hp = enemy.getComponent<HealthComponent>('HealthComponent');
                if (hp) {
                    hp.takeDamage(finalDamage);
                    hitCount++;

                    // Flash enemy
                    enemy.sprite.setTintFill(0xffffff);
                    this.scene.time.delayedCall(100, () => {
                        if (enemy.sprite?.active) enemy.sprite.clearTint();
                    });

                    // Knockback away from player
                    const kbAngle = Phaser.Math.Angle.Between(px, py, enemy.sprite.x, enemy.sprite.y);
                    enemy.sprite.setVelocity(
                        Math.cos(kbAngle) * 200,
                        Math.sin(kbAngle) * 200
                    );

                    // Damage text
                    this.showDamageText(enemy.sprite.x, enemy.sprite.y - 15, finalDamage);

                    // Handle death
                    if (hp.isDead() && 'die' in enemy && typeof (enemy as any).die === 'function') {
                        this.enemyManager.totalKills++;
                        AudioManager.getInstance(this.scene.game).playSFX(AudioKeys.ENEMY_DEATH);
                        (enemy as any).die();
                    }
                }
            }
        }

        // Check boss
        if (this.bossManager) {
            const boss = this.bossManager.getCurrentBoss();
            if (boss && boss.isActive && !boss.isDead()) {
                const distSq = Phaser.Math.Distance.Squared(px, py, boss.sprite.x, boss.sprite.y);
                if (distSq <= radiusSq) {
                    const hp = boss.getComponent<HealthComponent>('HealthComponent');
                    if (hp) {
                        hp.takeDamage(finalDamage);
                        hitCount++;

                        boss.sprite.setTintFill(0xffffff);
                        this.scene.time.delayedCall(100, () => {
                            if (boss.sprite?.active) boss.sprite.clearTint();
                        });

                        this.showDamageText(boss.sprite.x, boss.sprite.y - 15, finalDamage);
                    }
                }
            }
        }

        if (hitCount > 0) {
            AudioManager.getInstance(this.scene.game).playSFX(AudioKeys.ENEMY_HIT);
        }
    }

    // ─── Soul Nova ───────────────────────────────────────────────

    private executeSoulNova(def: ActiveSkillDef): void {
        const px = this.player.sprite.x;
        const py = this.player.sprite.y;

        // Calculate damage
        const dmgMultiplier = def.damageScaleWithBase ? (this.combatManager.baseDamage / 15) : 1;
        const finalDamage = def.damage * dmgMultiplier;

        // Play explosion VFX
        this.vfx.playSoulNovaExplosion();

        // Spawn projectiles in all directions via ProjectileManager
        const count = def.projectileCount;
        const step = (Math.PI * 2) / count;

        for (let i = 0; i < count; i++) {
            const angle = step * i;
            this.projectileManager.spawnProjectile(
                px, py,
                angle,
                def.projectileSpeed,
                finalDamage,
                'projectile_soul_bolt',
                'player',
                2500
            );
        }

        // Also do instant AoE damage in close radius (the explosion itself)
        const innerRadiusSq = 50 * 50;
        const enemies = this.enemyManager.getActiveEnemies();

        for (const enemy of enemies) {
            const distSq = Phaser.Math.Distance.Squared(px, py, enemy.sprite.x, enemy.sprite.y);
            if (distSq <= innerRadiusSq) {
                const hp = enemy.getComponent<HealthComponent>('HealthComponent');
                if (hp) {
                    hp.takeDamage(finalDamage * 0.5); // Half damage for inner blast
                    enemy.sprite.setTintFill(0xffffff);
                    this.scene.time.delayedCall(100, () => {
                        if (enemy.sprite?.active) enemy.sprite.clearTint();
                    });
                    this.showDamageText(enemy.sprite.x, enemy.sprite.y - 15, finalDamage * 0.5);

                    if (hp.isDead() && 'die' in enemy && typeof (enemy as any).die === 'function') {
                        this.enemyManager.totalKills++;
                        AudioManager.getInstance(this.scene.game).playSFX(AudioKeys.ENEMY_DEATH);
                        (enemy as any).die();
                    }
                }
            }
        }

        // Check boss for inner blast
        if (this.bossManager) {
            const boss = this.bossManager.getCurrentBoss();
            if (boss && boss.isActive && !boss.isDead()) {
                const distSq = Phaser.Math.Distance.Squared(px, py, boss.sprite.x, boss.sprite.y);
                if (distSq <= innerRadiusSq) {
                    const hp = boss.getComponent<HealthComponent>('HealthComponent');
                    if (hp) {
                        hp.takeDamage(finalDamage * 0.5);
                        boss.sprite.setTintFill(0xffffff);
                        this.scene.time.delayedCall(100, () => {
                            if (boss.sprite?.active) boss.sprite.clearTint();
                        });
                        this.showDamageText(boss.sprite.x, boss.sprite.y - 15, finalDamage * 0.5);
                    }
                }
            }
        }
    }

    // ─── Crimson Vital ───────────────────────────────────────────

    private executeCrimsonVital(def: ActiveSkillDef): void {
        const hp = this.player.getComponent<HealthComponent>('HealthComponent');
        if (!hp) return;

        const healAmount = hp.maxHP * def.healPercent;
        hp.heal(healAmount);

        // Play healing VFX
        this.vfx.playCrimsonVital();

        // Healing text
        this.showHealText(this.player.sprite.x, this.player.sprite.y - 20, healAmount);
    }

    // ─── UI Helpers ──────────────────────────────────────────────

    private showDamageText(x: number, y: number, damage: number): void {
        const text = this.scene.add.text(x, y, `⚔ ${Math.ceil(damage)}`, {
            fontSize: '13px',
            color: '#00f5d4',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(300);

        text.setScale(1.2);

        this.scene.tweens.add({
            targets: text,
            scale: 1.0,
            y: y - 25,
            alpha: 0,
            duration: 650,
            ease: 'Back.easeOut',
            onComplete: () => text.destroy()
        });
    }

    private showHealText(x: number, y: number, amount: number): void {
        const text = this.scene.add.text(x, y, `+${Math.ceil(amount)} HP`, {
            fontSize: '14px',
            color: '#2ecc71',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(300);

        text.setScale(1.3);

        this.scene.tweens.add({
            targets: text,
            scale: 1.0,
            y: y - 30,
            alpha: 0,
            duration: 800,
            ease: 'Back.easeOut',
            onComplete: () => text.destroy()
        });
    }

    public destroy(): void {
        this.vfx.destroy();
    }
}
