import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { ProjectileManager } from '../../managers/ProjectileManager';

export class SkeletonArcher extends Enemy {
    private projectileManager: ProjectileManager | null = null;
    private shootTimer: number = 0;
    private shootCooldown: number = 2000;
    private preferredDistance: number = 80;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'enemy_skeleton', 20);
        this.speed = 40;
        this.damage = 8;
    }

    public setProjectileManager(pm: ProjectileManager) {
        this.projectileManager = pm;
    }

    public update(_time: number, _delta: number, target?: Phaser.Physics.Arcade.Sprite) {
        if (!this.isActive || !target) return;

        // Update components
        for (const component of this.components.values()) {
            component.update(_time, _delta);
        }


        // Handle knockback state
        if (this.isKnockedBack) {
            this.knockbackTimer -= _delta;
            if (this.knockbackTimer <= 0) {
                this.isKnockedBack = false;
            } else {
                return;
            }
        }

        const dist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, target.x, target.y);
        const angle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, target.x, target.y);

        // Maintain preferred distance
        if (dist > this.preferredDistance + 20) {
            // Move closer
            this.sprite.setVelocity(
                Math.cos(angle) * this.speed,
                Math.sin(angle) * this.speed
            );
        } else if (dist < this.preferredDistance - 20) {
            // Move away
            this.sprite.setVelocity(
                Math.cos(angle) * -this.speed,
                Math.sin(angle) * -this.speed
            );
        } else {
            // In range — stop and shoot
            this.sprite.setVelocity(0, 0);
        }

        // Shoot logic
        this.shootTimer += _delta;
        if (this.shootTimer >= this.shootCooldown && this.projectileManager) {
            this.shootTimer = 0;
            this.sprite.play('enemy_skeleton_attack', true);
            this.projectileManager.spawnProjectile(
                this.sprite.x,
                this.sprite.y,
                angle,
                120,    // arrow speed
                this.damage,
                'projectile_arrow',
                'enemy',
                3000
            );
        }

        // Flip sprite based on target direction
        const body = this.sprite.body as Phaser.Physics.Arcade.Body;
        if (body && target.x > this.sprite.x && !this.isFacingRight) {
            this.sprite.setFlipX(false);
            this.isFacingRight = true;
        } else if (body && target.x < this.sprite.x && this.isFacingRight) {
            this.sprite.setFlipX(true);
            this.isFacingRight = false;
        }
    }
}
