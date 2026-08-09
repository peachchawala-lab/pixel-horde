import Phaser from 'phaser';
import { BaseEntity } from '../BaseEntity';
import { HealthComponent } from '../../components/HealthComponent';

export abstract class Enemy extends BaseEntity {
    protected speed: number = 50;
    protected damage: number = 10;
    public isActive: boolean = false;
    protected isFacingRight: boolean = true;
    
    // Knockback properties
    protected knockbackTimer: number = 0;
    protected isKnockedBack: boolean = false;

    constructor(scene: Phaser.Scene, x: number, y: number, texture: string, health: number) {
        super(scene, x, y, texture);
        
        this.addComponent(new HealthComponent(health));
        
        this.sprite.setSize(12, 16);
        this.sprite.setOffset(2, 0);
        
        this.setupAnimations(texture);
        this.despawn(); // Start inactive in pool
    }

    protected setupAnimations(texture: string) {
        if (!this.scene.anims.exists(`${texture}_idle`)) {
            this.scene.anims.create({
                key: `${texture}_idle`,
                frames: this.scene.anims.generateFrameNumbers(texture, { start: 0, end: 3 }),
                frameRate: 8,
                repeat: -1
            });
        }
        
        if (!this.scene.anims.exists(`${texture}_walk`)) {
            this.scene.anims.create({
                key: `${texture}_walk`,
                frames: this.scene.anims.generateFrameNumbers(texture, { start: 4, end: 7 }),
                frameRate: 12,
                repeat: -1
            });
        }
    }

    public spawn(x: number, y: number) {
        this.isActive = true;
        this.isKnockedBack = false;
        this.knockbackTimer = 0;
        this.sprite.setActive(true);
        this.sprite.setVisible(true);
        this.sprite.setPosition(x, y);
        this.sprite.play(`${this.sprite.texture.key}_walk`, true);
        this.sprite.clearTint();
        
        const healthComponent = this.getComponent<HealthComponent>('HealthComponent');
        if (healthComponent) {
            healthComponent.currentHP = healthComponent.maxHP;
        }
    }

    public despawn() {
        this.isActive = false;
        this.sprite.setActive(false);
        this.sprite.setVisible(false);
        this.sprite.setVelocity(0, 0);
    }

    public applyKnockback(angle: number, force: number, duration: number = 150) {
        this.isKnockedBack = true;
        this.knockbackTimer = duration;
        
        this.sprite.setVelocity(
            Math.cos(angle) * force,
            Math.sin(angle) * force
        );
    }

    public update(_time: number, _delta: number, target?: Phaser.Physics.Arcade.Sprite) {
        if (!this.isActive || !target) return;
        
        super.update(_time, _delta);

        // Handle knockback state
        if (this.isKnockedBack) {
            this.knockbackTimer -= _delta;
            if (this.knockbackTimer <= 0) {
                this.isKnockedBack = false;
            } else {
                // If currently knocked back, skip chase logic so velocity is maintained
                return;
            }
        }

        // Basic chase logic
        const angle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, target.x, target.y);
        
        this.sprite.setVelocity(
            Math.cos(angle) * this.speed,
            Math.sin(angle) * this.speed
        );
        
        // Flip sprite based on movement
        const body = this.sprite.body as Phaser.Physics.Arcade.Body;
        if (body && body.velocity.x > 0 && !this.isFacingRight) {
            this.sprite.setFlipX(false);
            this.isFacingRight = true;
        } else if (body && body.velocity.x < 0 && this.isFacingRight) {
            this.sprite.setFlipX(true);
            this.isFacingRight = false;
        }
    }
}
