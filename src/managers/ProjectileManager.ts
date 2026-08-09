import Phaser from 'phaser';
import { Projectile } from '../entities/projectiles/Projectile';
import { Player } from '../entities/player/Player';
import { HealthComponent } from '../components/HealthComponent';

export class ProjectileManager {
    private scene: Phaser.Scene;
    private projectiles: Projectile[] = [];
    private player: Player;
    private maxPoolSize: number = 120;

    constructor(scene: Phaser.Scene, player: Player) {
        this.scene = scene;
        this.player = player;
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

        for (const proj of this.projectiles) {
            if (!proj.isActive) continue;

            proj.update(time, delta);

            // Check if enemy/boss projectile hits the player
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
