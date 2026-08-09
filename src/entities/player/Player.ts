import Phaser from 'phaser';
import { BaseEntity } from '../BaseEntity';
import { HealthComponent } from '../../components/HealthComponent';
import { ExperienceComponent } from '../../components/ExperienceComponent';
import { InputManager } from '../../managers/InputManager';

export class Player extends BaseEntity {
    private inputManager: InputManager;
    public speed: number = 150;
    private isFacingRight: boolean = true;

    constructor(scene: Phaser.Scene, x: number, y: number, inputManager: InputManager) {
        super(scene, x, y, 'player_warrior');
        this.inputManager = inputManager;
        
        this.addComponent(new HealthComponent(100));
        this.addComponent(new ExperienceComponent(scene));

        this.sprite.setCollideWorldBounds(true);
        this.sprite.setSize(12, 16);
        this.sprite.setOffset(2, 0);

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

        this.sprite.play('player_idle');
    }

    public update(time: number, delta: number) {
        super.update(time, delta);
        
        const moveVector = this.inputManager.getMovementVector();
        
        this.sprite.setVelocity(moveVector.x * this.speed, moveVector.y * this.speed);

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
