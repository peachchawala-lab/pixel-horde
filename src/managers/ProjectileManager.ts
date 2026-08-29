import Phaser from 'phaser';
import { Projectile } from '../entities/projectiles/Projectile';
import { Player } from '../entities/player/Player';
import { HealthComponent } from '../components/HealthComponent';
import { EnemyManager } from './EnemyManager';
import { BossManager } from './BossManager';

export class ProjectileManager {
    private scene: Phaser.Scene;
    private projectiles: Projectile[] = [];
    private player: Player;
    private maxPoolSize: number = 120;

    // References for player projectile collision
    private enemyManager: EnemyManager | null = null;
    private bossManager: BossManager | null = null;

    constructor(scene: Phaser.Scene, player: Player) {
        this.scene = scene;
        this.player = player;
    }

    /**
     * Set EnemyManager reference for player projectile → enemy collision.
     */
    public setEnemyManager(enemyManager: EnemyManager): void {
        this.enemyManager = enemyManager;
    }

    /**
     * Set BossManager reference for player projectile → boss collision.
     */
    public setBossManager(bossManager: BossManager): void {
        this.bossManager = bossManager;
    }

    public spawnProjectile(
        x: number,
        y: number,
        angle: number,
        speed: number,
        damage: number,
        texture: string,
        ownerType: 'player' | 'enemy' | 'boss' = 'enemy',
        lifetime: number = 3000
    ): Projectile {
        let proj = this.projectiles.find(p => !p.isActive);

        if (!proj) {
            if (this.projectiles.length < this.maxPoolSize) {
                proj = new Projectile(this.scene);
                this.projectiles.push(proj);
            } else {
                // Recycle the oldest active projectile
                proj = this.projectiles[0];
            }
        }

        proj.spawn(x, y, angle, speed, damage, texture, ownerType, lifetime);
        return proj;
    }

    public update(time: number, delta: number) {
        const px = this.player.sprite.x;
        const py = this.player.sprite.y;
        const playerHitRadiusSq = 10 * 10;
        const enemyHitRadiusSq = 14 * 14;

        for (const proj of this.projectiles) {
            if (!proj.isActive) continue;

            proj.update(time, delta);

            // ── Enemy/Boss projectile → Player collision ──
            if (proj.ownerType !== 'player' && proj.isActive) {
                const distSq = Phaser.Math.Distance.Squared(proj.sprite.x, proj.sprite.y, px, py);
                if (distSq <= playerHitRadiusSq) {
                    const hp = this.player.getComponent<HealthComponent>('HealthComponent');
                    if (hp) {
                        hp.takeDamage(proj.damage);
                    }
                    proj.despawn();
                }
            }

            // ── Player projectile → Enemy/Boss collision ──
            if (proj.ownerType === 'player' && proj.isActive) {
                let hit = false;

                // Check enemies
                if (this.enemyManager && !hit) {
                    const enemies = this.enemyManager.getActiveEnemies();
                    for (const enemy of enemies) {
                        if (!enemy.sprite?.active) continue;
                        const distSq = Phaser.Math.Distance.Squared(
                            proj.sprite.x, proj.sprite.y,
                            enemy.sprite.x, enemy.sprite.y
                        );
                        if (distSq <= enemyHitRadiusSq) {
                            const hp = enemy.getComponent<HealthComponent>('HealthComponent');
                            if (hp) {
                                hp.takeDamage(proj.damage);

                                // Flash
                                enemy.sprite.setTintFill(0xffffff);
                                this.scene.time.delayedCall(80, () => {
                                    if (enemy.sprite?.active) enemy.sprite.clearTint();
                                });

                                // Death check
                                if (hp.isDead() && 'die' in enemy && typeof (enemy as any).die === 'function') {
                                    this.enemyManager!.totalKills++;
                                    (enemy as any).die();
                                }
                            }
                            hit = true;
                            break;
                        }
                    }
                }

                // Check boss
                if (this.bossManager && !hit) {
                    const boss = this.bossManager.getCurrentBoss();
                    if (boss && boss.isActive && !boss.isDead()) {
                        const distSq = Phaser.Math.Distance.Squared(
                            proj.sprite.x, proj.sprite.y,
                            boss.sprite.x, boss.sprite.y
                        );
                        // Boss has larger hitbox
                        if (distSq <= 20 * 20) {
                            const hp = boss.getComponent<HealthComponent>('HealthComponent');
                            if (hp) {
                                hp.takeDamage(proj.damage);

                                boss.sprite.setTintFill(0xffffff);
                                this.scene.time.delayedCall(80, () => {
                                    if (boss.sprite?.active) boss.sprite.clearTint();
                                });
                            }
                            hit = true;
                        }
                    }
                }

                if (hit) {
                    proj.despawn();
                }
            }
        }
    }

    public getActiveProjectiles(): Projectile[] {
        return this.projectiles.filter(p => p.isActive);
    }

    public despawnAll() {
        for (const proj of this.projectiles) {
            if (proj.isActive) {
                proj.despawn();
            }
        }
    }
}
