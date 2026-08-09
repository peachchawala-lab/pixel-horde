import Phaser from 'phaser';
import { BaseEntity } from '../BaseEntity';
import { HealthComponent } from '../../components/HealthComponent';
import { BossDefinition, BossPhase } from '../../data/BossData';
import { ProjectileManager } from '../../managers/ProjectileManager';
import { EnemyManager } from '../../managers/EnemyManager';

/**
 * Base class for all bosses.
 * Not a subclass of Enemy — bosses have phases, patterns, and unique behavior.
 * Subclasses override `onPhaseEnter()` and `updatePhase()` to define behavior.
 */
export abstract class Boss extends BaseEntity {
    public isActive: boolean = false;
    public currentPhase: BossPhase = 'idle';
    public definition: BossDefinition;

    protected speed: number;
    protected projectileManager: ProjectileManager;
    protected enemyManager: EnemyManager;
    protected target: Phaser.Physics.Arcade.Sprite | null = null;

    // Phase tracking
    protected phaseIndex: number = 0;
    protected isInvulnerable: boolean = false;

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        definition: BossDefinition,
        projectileManager: ProjectileManager,
        enemyManager: EnemyManager,
        playerLevel: number
    ) {
        super(scene, x, y, definition.texture);

        this.definition = definition;
        this.speed = definition.speed;
        this.projectileManager = projectileManager;
        this.enemyManager = enemyManager;

        // Scale HP with player level
        const totalHP = definition.baseHP + (definition.hpScalePerLevel * playerLevel);
        this.addComponent(new HealthComponent(totalHP));

        this.sprite.setScale(1.5);
        this.sprite.setSize(16, 20);
        this.sprite.setDepth(120);
        this.setupAnimations(definition.texture);

        this.despawn(); // start inactive
    }

    protected setupAnimations(texture: string) {
        if (!this.scene.anims.exists(`${texture}_idle`)) {
            this.scene.anims.create({
                key: `${texture}_idle`,
                frames: this.scene.anims.generateFrameNumbers(texture, { start: 0, end: 3 }),
                frameRate: 6,
                repeat: -1
            });
        }

        if (!this.scene.anims.exists(`${texture}_cast`)) {
            this.scene.anims.create({
                key: `${texture}_cast`,
                frames: this.scene.anims.generateFrameNumbers(texture, { start: 4, end: 7 }),
                frameRate: 8,
                repeat: 0
            });
        }
    }

    public spawn(x: number, y: number) {
        this.isActive = true;
        this.currentPhase = 'phase1';
        this.phaseIndex = 0;
        this.isInvulnerable = false;

        this.sprite.setActive(true);
        this.sprite.setVisible(true);
        this.sprite.setPosition(x, y);
        this.sprite.play(`${this.definition.texture}_idle`, true);
        this.sprite.clearTint();

        // Reset HP
        const health = this.getComponent<HealthComponent>('HealthComponent');
        if (health) {
            health.currentHP = health.maxHP;
        }

        this.onPhaseEnter(this.currentPhase);
    }

    public despawn() {
        this.isActive = false;
        this.currentPhase = 'idle';
        this.sprite.setActive(false);
        this.sprite.setVisible(false);
        this.sprite.setVelocity(0, 0);
    }

    public setTarget(target: Phaser.Physics.Arcade.Sprite) {
        this.target = target;
    }

    public getCurrentHP(): number {
        const health = this.getComponent<HealthComponent>('HealthComponent');
        return health ? health.currentHP : 0;
    }

    public getMaxHP(): number {
        const health = this.getComponent<HealthComponent>('HealthComponent');
        return health ? health.maxHP : 1;
    }

    public getHPPercent(): number {
        const health = this.getComponent<HealthComponent>('HealthComponent');
        if (!health) return 0;
        return Math.max(0, health.currentHP / health.maxHP);
    }

    public isDead(): boolean {
        const health = this.getComponent<HealthComponent>('HealthComponent');
        return health ? health.isDead() : true;
    }

    public update(time: number, delta: number) {
        if (!this.isActive) return;
        super.update(time, delta);

        if (this.currentPhase === 'dead') return;

        // Check death
        if (this.isDead()) {
            this.currentPhase = 'dead';
            this.onDeath();
            return;
        }

        // Subclass handles phase-specific logic
        this.updatePhase(time, delta);
    }

    /**
     * Called when a new phase begins. Override to set up timers, animations, etc.
     */
    protected abstract onPhaseEnter(phase: BossPhase): void;

    /**
     * Called every frame. Override to run pattern cooldowns and AI logic.
     */
    protected abstract updatePhase(time: number, delta: number): void;

    /**
     * Called when boss HP reaches 0. Override to play death animation and trigger rewards.
     */
    protected abstract onDeath(): void;
}
