import Phaser from 'phaser';
import { Player } from '../entities/player/Player';
import { EnemyManager } from './EnemyManager';
import { ExpManager } from './ExpManager';
import { BossManager } from './BossManager';
import { BaseEntity } from '../entities/BaseEntity';
import { HealthComponent } from '../components/HealthComponent';
import { AudioManager } from './AudioManager';
import { AudioKeys } from '../data/AudioData';
import { GoldManager } from './GoldManager';

/**
 * CombatManager — Handles Player auto-attacks on Enemies and Bosses.
 */
export class CombatManager {
    private scene: Phaser.Scene;
    private player: Player;
    private enemyManager: EnemyManager;
    private expManager: ExpManager;
    private bossManager: BossManager | null = null;
    private goldManager: GoldManager | null = null;

    private attackTimer: number = 0;
    public attackCooldown: number = 800; // Faster auto attack (800ms)
    public attackRange: number = 90;     // Increased range to hit large bosses easily (90px)
    public baseDamage: number = 25;      // Base damage per hit
    public critChance: number = 0.25;    // 25% crit chance
    public critDamageMult: number = 2.0;
    public knockbackForce: number = 150;
    private particleEmitter: Phaser.GameObjects.Particles.ParticleEmitter;

    constructor(scene: Phaser.Scene, player: Player, enemyManager: EnemyManager, expManager: ExpManager) {
        this.scene = scene;
        this.player = player;
        this.enemyManager = enemyManager;
        this.expManager = expManager;

        // Particle emitter for hit visual feedback
        this.particleEmitter = this.scene.add.particles(0, 0, 'effect_particle', {
            speed: { min: 40, max: 120 },
            scale: { start: 1, end: 0 },
            lifespan: 200,
            blendMode: 'ADD',
            emitting: false
        });
        this.particleEmitter.setDepth(250);
    }

    public setBossManager(bossManager: BossManager) {
        this.bossManager = bossManager;
    }

    public setGoldManager(goldManager: GoldManager) {
        this.goldManager = goldManager;
    }

    public update(_time: number, delta: number) {
        this.attackTimer -= delta;

        if (this.attackTimer <= 0) {
            this.tryAutoAttack();
        }
    }

    private tryAutoAttack() {
        // Collect all potential attack targets (Enemies + Active Boss)
        let nearestTarget: BaseEntity | null = null;
        let minDistanceSq = this.attackRange * this.attackRange;

        // 1. Check Active Enemies
        const activeEnemies = this.enemyManager.getActiveEnemies();
        for (const enemy of activeEnemies) {
            const distSq = Phaser.Math.Distance.Squared(
                this.player.sprite.x, this.player.sprite.y,
                enemy.sprite.x, enemy.sprite.y
            );
            if (distSq < minDistanceSq) {
                minDistanceSq = distSq;
                nearestTarget = enemy;
            }
        }

        // 2. Check Active Boss
        if (this.bossManager) {
            const boss = this.bossManager.getCurrentBoss();
            if (boss && boss.isActive && !boss.isDead()) {
                const distSq = Phaser.Math.Distance.Squared(
                    this.player.sprite.x, this.player.sprite.y,
                    boss.sprite.x, boss.sprite.y
                );
                if (distSq < minDistanceSq) {
                    minDistanceSq = distSq;
                    nearestTarget = boss;
                }
            }
        }

        // Execute Attack on nearest target
        if (nearestTarget) {
            this.executeAttack(nearestTarget);
            this.attackTimer = this.attackCooldown;
        }
    }

    private executeAttack(target: BaseEntity) {
        const audio = AudioManager.getInstance(this.scene.game);
        audio.playSFX(AudioKeys.PLAYER_ATTACK);

        const isCrit = Math.random() < this.critChance;
        const damage = isCrit ? this.baseDamage * this.critDamageMult : this.baseDamage;

        const health = target.getComponent<HealthComponent>('HealthComponent');
        if (health) {
            health.takeDamage(damage);
            audio.playSFX(AudioKeys.ENEMY_HIT);
        }

        const angle = Phaser.Math.Angle.Between(
            this.player.sprite.x, this.player.sprite.y,
            target.sprite.x, target.sprite.y
        );

        // Flash white hit tint on target sprite
        target.sprite.setTintFill(0xffffff);
        this.scene.time.delayedCall(100, () => {
            if (target.sprite && target.sprite.active) {
                target.sprite.clearTint();
            }
        });

        // Slash effect at target location
        const slash = this.scene.add.sprite(
            target.sprite.x,
            target.sprite.y,
            'effect_slash'
        );
        slash.setRotation(angle);
        slash.setScale(1.4);
        slash.setDepth(200);

        this.scene.tweens.add({
            targets: slash,
            alpha: 0,
            scale: 2.0,
            duration: 150,
            onComplete: () => slash.destroy()
        });

        // Particles
        this.particleEmitter.explode(8, target.sprite.x, target.sprite.y);

        // Camera Shake on Crit
        if (isCrit) {
            this.scene.cameras.main.shake(120, 0.015);
        }

        // Floating Damage Text
        this.showDamageText(target.sprite.x, target.sprite.y - 15, damage, isCrit);

        // Despawn non-boss enemies when dead
        if (health && health.isDead()) {
            if ('despawn' in target && typeof (target as any).despawn === 'function') {
                // If it's a regular enemy, drop EXP and despawn
                if (target !== this.bossManager?.getCurrentBoss()) {
                    this.enemyManager.totalKills++;
                    audio.playSFX(AudioKeys.ENEMY_DEATH);
                    this.expManager.spawnOrb(target.sprite.x, target.sprite.y, 2);
                    this.goldManager?.tryEnemyDrop(target.sprite.x, target.sprite.y, false);
                    (target as any).despawn();
                }
            }
        }
    }

    private showDamageText(x: number, y: number, damage: number, isCrit: boolean) {
        const text = this.scene.add.text(
            x, y,
            Math.ceil(damage).toString(),
            {
                fontSize: isCrit ? '14px' : '11px',
                color: isCrit ? '#ff0000' : '#ffffff',
                fontStyle: isCrit ? 'bold' : 'normal',
                stroke: '#000000',
                strokeThickness: 2
            }
        ).setOrigin(0.5).setDepth(300);

        this.scene.tweens.add({
            targets: text,
            y: y - 25,
            alpha: 0,
            duration: 600,
            ease: 'Power1',
            onComplete: () => text.destroy()
        });
    }
}
