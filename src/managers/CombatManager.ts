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
            if (boss && boss.isActive && !boss.isDead() && boss.getCurrentHP() > 0) {
                const bossAttackRange = Math.max(this.attackRange, 220);
                const bossDistSq = Phaser.Math.Distance.Squared(
                    this.player.sprite.x, this.player.sprite.y,
                    boss.sprite.x, boss.sprite.y
                );
                if (bossDistSq < bossAttackRange * bossAttackRange) {
                    if (bossDistSq < minDistanceSq || !nearestTarget) {
                        minDistanceSq = bossDistSq;
                        nearestTarget = boss;
                    }
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

        const angle = Phaser.Math.Angle.Between(
            this.player.sprite.x, this.player.sprite.y,
            target.sprite.x, target.sprite.y
        );

        // Play the newly added attack animation
        this.player.playAttackAnimation(angle);

        // Delay the actual impact to sync with the 'Swing' animation frame (~66ms at 15fps)
        this.scene.time.delayedCall(66, () => {
            if (!target || !target.sprite || !target.sprite.active) return;
            
            const health = target.getComponent<HealthComponent>('HealthComponent');
            if (health) {
                health.takeDamage(damage);
                audio.playSFX(AudioKeys.ENEMY_HIT);
            }

            // Flash white hit tint on target sprite
            target.sprite.setTintFill(0xffffff);
            this.scene.time.delayedCall(100, () => {
                if (target.sprite && target.sprite.active) {
                    target.sprite.clearTint();
                }
            });

            // Slash effect at target location
            const slashTex = isCrit ? 'effect_crit_slash' : 'effect_slash';
            const slash = this.scene.add.sprite(
                target.sprite.x,
                target.sprite.y,
                slashTex
            );
            slash.setRotation(angle);
            slash.setScale(isCrit ? 1.6 : 1.2);
            slash.setDepth(200);

            this.scene.tweens.add({
                targets: slash,
                alpha: 0,
                scale: isCrit ? 2.2 : 1.7,
                duration: isCrit ? 180 : 130,
                onComplete: () => slash.destroy()
            });

            // Particle explode count
            this.particleEmitter.setPosition(target.sprite.x, target.sprite.y);
            this.particleEmitter.setParticleTint(isCrit ? 0xf1c40f : 0xffffff);
            this.particleEmitter.explode(isCrit ? 12 : 5);
            
            // Visual feedback for Crits (camera shake without freezing physics engine)
            if (isCrit) {
                this.scene.cameras.main.shake(80, 0.003); // Subtle camera shake
            }

            // Knockback
            const kbAngle = angle;
            const knockback = isCrit ? this.knockbackForce * 1.5 : this.knockbackForce;
            target.sprite.setVelocity(
                Math.cos(kbAngle) * knockback,
                Math.sin(kbAngle) * knockback
            );

            // Floating Damage Text
            this.showDamageText(target.sprite.x, target.sprite.y - 15, damage, isCrit);
            
            // Despawn non-boss enemies when dead
            if (health && health.isDead()) {
                if ('die' in target && typeof (target as any).die === 'function') {
                    // If it's a regular enemy, drop EXP and despawn
                    if ((target as any) !== this.bossManager?.getCurrentBoss()) {
                        this.enemyManager.totalKills++;
                        audio.playSFX(AudioKeys.ENEMY_DEATH);
                        this.expManager.spawnOrb(target.sprite.x, target.sprite.y, 2);
                        this.goldManager?.tryEnemyDrop(target.sprite.x, target.sprite.y, false);
                        (target as any).die();
                    }
                } else if ('despawn' in target && typeof (target as any).despawn === 'function') {
                    (target as any).despawn();
                }
            }
        });
    }

    private showDamageText(x: number, y: number, damage: number, isCrit: boolean) {
        const textStr = isCrit ? `⚡ ${Math.ceil(damage)}` : Math.ceil(damage).toString();
        const text = this.scene.add.text(
            x, y,
            textStr,
            {
                fontSize: isCrit ? '16px' : '12px',
                color: isCrit ? '#ff4500' : '#ffffff',
                fontStyle: isCrit ? 'bold' : 'bold',
                stroke: '#000000',
                strokeThickness: isCrit ? 4 : 3
            }
        ).setOrigin(0.5).setDepth(300);

        text.setScale(isCrit ? 1.4 : 0.8);

        this.scene.tweens.add({
            targets: text,
            scale: isCrit ? 1.0 : 1.0,
            y: y - 30,
            alpha: 0,
            duration: isCrit ? 750 : 550,
            ease: 'Back.easeOut',
            onComplete: () => text.destroy()
        });
    }
}
