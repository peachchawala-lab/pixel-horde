import Phaser from 'phaser';

export class Projectile {
    public sprite: Phaser.GameObjects.Sprite;
    public isActive: boolean = false;
    public damage: number = 0;
    public speed: number = 0;
    public lifetime: number = 3000;
    public lifetimeTimer: number = 0;
    public ownerType: 'player' | 'enemy' | 'boss' = 'enemy';

    private velocityX: number = 0;
    private velocityY: number = 0;

    constructor(scene: Phaser.Scene) {
        this.sprite = scene.add.sprite(0, 0, 'projectile_soul_bolt');
        this.sprite.setDepth(100);
        this.despawn();
    }

    public spawn(
        x: number,
        y: number,
        angle: number,
        speed: number,
        damage: number,
        texture: string,
        ownerType: 'player' | 'enemy' | 'boss' = 'enemy',
        lifetime: number = 3000
    ) {
        this.isActive = true;
        this.speed = speed;
        this.damage = damage;
        this.ownerType = ownerType;
        this.lifetime = lifetime;
        this.lifetimeTimer = 0;

        this.velocityX = Math.cos(angle) * speed;
        this.velocityY = Math.sin(angle) * speed;

        this.sprite.setTexture(texture);
        this.sprite.setPosition(x, y);
        this.sprite.setRotation(angle);
        this.sprite.setActive(true);
        this.sprite.setVisible(true);
    }

    public despawn() {
        this.isActive = false;
        this.sprite.setActive(false);
        this.sprite.setVisible(false);
    }

    public update(_time: number, delta: number) {
        if (!this.isActive) return;

        this.lifetimeTimer += delta;
        if (this.lifetimeTimer >= this.lifetime) {
            this.despawn();
            return;
        }

        this.sprite.x += this.velocityX * (delta / 1000);
        this.sprite.y += this.velocityY * (delta / 1000);
    }
}
