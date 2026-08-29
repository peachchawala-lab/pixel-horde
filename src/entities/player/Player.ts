import Phaser from 'phaser';
import { BaseEntity } from '../BaseEntity';
import { HealthComponent } from '../../components/HealthComponent';
import { ExperienceComponent } from '../../components/ExperienceComponent';
import { InputManager } from '../../managers/InputManager';

export class Player extends BaseEntity {
    private inputManager: InputManager;
    public speed: number = 150;
    private isFacingRight: boolean = true;

    private shadowSprite: Phaser.GameObjects.Sprite;

    constructor(scene: Phaser.Scene, x: number, y: number, inputManager: InputManager) {
        super(scene, x, y, 'player_warrior');
        this.inputManager = inputManager;

        // Player must render above all arena environment layers
        this.sprite.setDepth(110);

        // Drop Shadow (below player, above floor)
        this.shadowSprite = scene.add.sprite(x, y + 12, 'drop_shadow');
        this.shadowSprite.setDepth(100);
        
        this.addComponent(new HealthComponent(100));
        this.addComponent(new ExperienceComponent(scene));

        this.sprite.setCollideWorldBounds(true);
        this.sprite.setSize(16, 18);
        this.sprite.setOffset(8, 12);

        this.setupAnimations();
    }

    private setupAnimations() {
        if (!this.scene.anims.exists('player_idle')) {
            this.scene.anims.create({
                key: 'player_idle',
                frames: this.scene.anims.generateFrameNumbers('player_warrior', { start: 0, end: 3 }),
                frameRate: 8,
                repeat: -1
            });
        }
        
        if (!this.scene.anims.exists('player_walk')) {
            this.scene.anims.create({
                key: 'player_walk',
                frames: this.scene.anims.generateFrameNumbers('player_warrior', { start: 4, end: 7 }),
                frameRate: 12,
                repeat: -1
            });
        }

        if (!this.scene.anims.exists('player_attack')) {
            this.scene.anims.create({
                key: 'player_attack',
                frames: this.scene.anims.generateFrameNumbers('player_warrior', { start: 8, end: 11 }),
                frameRate: 15,
                repeat: 0
            });
        }

        if (!this.scene.anims.exists('player_death')) {
            this.scene.anims.create({
                key: 'player_death',
                frames: this.scene.anims.generateFrameNumbers('player_warrior', { start: 12, end: 15 }),
                frameRate: 8,
                repeat: 0
            });
        }

        this.sprite.play('player_idle');
    }

    public playAttackAnimation(angle: number) {
        // Face the attack direction
        if (angle > -Math.PI / 2 && angle < Math.PI / 2) {
            this.sprite.setFlipX(false);
            this.isFacingRight = true;
        } else {
            this.sprite.setFlipX(true);
            this.isFacingRight = false;
        }

        this.sprite.play('player_attack', true);
    }
    
    public playHurtAnimation() {
        this.sprite.setTintFill(0xff0000);
        this.scene.time.delayedCall(100, () => {
            if (this.sprite && this.sprite.active) {
                this.sprite.clearTint();
            }
        });
        
        // slight recoil
        this.scene.tweens.add({
            targets: this.sprite,
            y: this.sprite.y - 4,
            yoyo: true,
            duration: 50
        });
    }

    public playDeathAnimation(onComplete?: () => void) {
        this.sprite.play('player_death', true);
        if (this.shadowSprite) {
            this.scene.tweens.add({
                targets: this.shadowSprite,
                alpha: 0,
                duration: 500
            });
        }
        const emitter = this.scene.add.particles(this.sprite.x, this.sprite.y, 'effect_particle', {
            speed: { min: 10, max: 40 },
            scale: { start: 1.2, end: 0 },
            alpha: { start: 0.8, end: 0 },
            tint: [0x00f5d4, 0x34495e, 0xb01c2e],
            lifespan: 600,
            quantity: 12,
            emitting: false
        });
        emitter.explode(15);
        this.scene.time.delayedCall(600, () => {
            emitter.destroy();
            if (onComplete) onComplete();
        });
    }

    public update(time: number, delta: number) {
        super.update(time, delta);
        
        const currentAnimKey = this.sprite.anims.currentAnim ? this.sprite.anims.currentAnim.key : '';
        const isAttacking = currentAnimKey === 'player_attack' && this.sprite.anims.isPlaying;
        const isDying = currentAnimKey === 'player_death';

        if (isDying) {
            this.sprite.setVelocity(0, 0);
            return;
        }

        const moveVector = this.inputManager.getMovementVector();
        this.sprite.setVelocity(moveVector.x * this.speed, moveVector.y * this.speed);

        // Keep drop shadow aligned under player
        if (this.shadowSprite && this.sprite.active) {
            this.shadowSprite.setPosition(this.sprite.x, this.sprite.y + 12);
            this.shadowSprite.setVisible(this.sprite.visible);
        }

        if (!isAttacking) {
            if (moveVector.lengthSq() > 0) {
                this.sprite.play('player_walk', true);
                
                if (moveVector.x > 0 && !this.isFacingRight) {
                    this.sprite.setFlipX(false);
                    this.isFacingRight = true;
                } else if (moveVector.x < 0 && this.isFacingRight) {
                    this.sprite.setFlipX(true);
                    this.isFacingRight = false;
                }
            } else {
                this.sprite.play('player_idle', true);
            }
        }
    }
}
