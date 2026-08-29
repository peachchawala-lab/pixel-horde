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

    public shadowSprite: Phaser.GameObjects.Sprite;

    constructor(scene: Phaser.Scene, x: number, y: number, texture: string, health: number) {
        super(scene, x, y, texture);
        // Enemies render above floor but below player (110)
        this.sprite.setDepth(105);

        this.shadowSprite = scene.add.sprite(x, y + 12, 'drop_shadow');
        this.shadowSprite.setDepth(104);
        this.shadowSprite.setVisible(false);

        this.addComponent(new HealthComponent(health));
        
        this.sprite.setSize(16, 18);
        this.sprite.setOffset(8, 12);
        
        this.setupAnimations(texture);
        this.despawn(); // Start inactive in pool
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
        
        if (!this.scene.anims.exists(`${texture}_walk`)) {
            this.scene.anims.create({
                key: `${texture}_walk`,
                frames: this.scene.anims.generateFrameNumbers(texture, { start: 4, end: 7 }),
                frameRate: 10,
                repeat: -1
            });
        }

        if (!this.scene.anims.exists(`${texture}_attack`)) {
            this.scene.anims.create({
                key: `${texture}_attack`,
                frames: this.scene.anims.generateFrameNumbers(texture, { start: 8, end: 11 }),
                frameRate: 12,
                repeat: 0
            });
        }

        if (!this.scene.anims.exists(`${texture}_death`)) {
            this.scene.anims.create({
                key: `${texture}_death`,
                frames: this.scene.anims.generateFrameNumbers(texture, { start: 12, end: 15 }),
                frameRate: 10,
                repeat: 0
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

        const texKey = this.sprite.texture.key;
        if (texKey.includes('ghost')) {
            this.shadowSprite.setPosition(x, y + 14);
            this.shadowSprite.setAlpha(0.25);
        } else if (texKey.includes('bat')) {
            this.shadowSprite.setPosition(x, y + 18);
            this.shadowSprite.setAlpha(0.4);
        } else {
            this.shadowSprite.setPosition(x, y + 12);
            this.shadowSprite.setAlpha(0.6);
        }
        this.shadowSprite.setVisible(true);

        this.sprite.play(`${texKey}_walk`, true);
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
        this.sprite.clearTint();
        this.sprite.setAlpha(1);
        if (this.shadowSprite) {
            this.shadowSprite.setVisible(false);
        }
    }

    public die() {
        this.isActive = false; // Stop updating
        if (this.shadowSprite) this.shadowSprite.setVisible(false);
        
        const texKey = this.sprite.texture.key;

        // Play Death Collapse Animation if registered
        if (this.scene.anims.exists(`${texKey}_death`)) {
            this.sprite.play(`${texKey}_death`, true);
        }

        // Death Visuals: flash white, shrink, and emit particles
        this.sprite.setTintFill(0xffffff);
        
        // Material-specific particle color
        let tint: number | number[] = 0xffffff;
        if (texKey.includes('slime')) tint = [0x2ecc71, 0x58d68d, 0x0e6251];
        if (texKey.includes('ghost')) tint = [0x9b59b6, 0x00f5d4, 0xd2b4de];
        if (texKey.includes('zombie')) tint = [0x27ae60, 0x900c3f, 0x4a235a];
        if (texKey.includes('bat')) tint = [0x34193d, 0x900c3f, 0xff0000];
        if (texKey.includes('skeleton')) tint = [0xbdc3c7, 0xecf0f1, 0x9b59b6];

        const emitter = this.scene.add.particles(this.sprite.x, this.sprite.y, 'effect_particle', {
            speed: { min: 30, max: 80 },
            scale: { start: 1.2, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: 400,
            tint: tint
        });
        emitter.explode(12);
        this.scene.time.delayedCall(400, () => emitter.destroy());

        this.scene.tweens.add({
            targets: this.sprite,
            alpha: 0,
            duration: 300,
            ease: 'Quad.easeOut',
            onComplete: () => {
                this.sprite.setScale(1); // reset for pool
                this.despawn();
            }
        });
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

        const texKey = this.sprite.texture.key;
        if (this.shadowSprite && this.sprite.active) {
            if (texKey.includes('bat')) {
                this.shadowSprite.setPosition(this.sprite.x, this.sprite.y + 18);
            } else if (texKey.includes('ghost')) {
                this.shadowSprite.setPosition(this.sprite.x, this.sprite.y + 14);
            } else {
                this.shadowSprite.setPosition(this.sprite.x, this.sprite.y + 12);
            }
        }

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
