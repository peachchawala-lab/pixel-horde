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
    private trailEmitter: Phaser.GameObjects.Particles.ParticleEmitter;

    constructor(scene: Phaser.Scene) {
        this.sprite = scene.add.sprite(0, 0, 'projectile_soul_bolt');
        this.sprite.setDepth(100);
        
        this.trailEmitter = scene.add.particles(0, 0, 'effect_particle', {
            speed: { min: 5, max: 20 },
            scale: { start: 1, end: 0 },
            alpha: { start: 0.6, end: 0 },
            blendMode: 'ADD',
            lifespan: 300,
            quantity: 1,
            frequency: 50 // emit frequently
        });
        this.trailEmitter.setDepth(99);
        this.trailEmitter.stop();
        
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

        // Customize trail based on texture
        if (texture.includes('poison')) {
            this.trailEmitter.setParticleTint(0x2ecc71);
        } else if (texture.includes('blood') || texture.includes('orb')) {
            this.trailEmitter.setParticleTint(0xe74c3c);
        } else if (texture.includes('soul') || texture.includes('skull')) {
            this.trailEmitter.setParticleTint(0x9b59b6);
        } else {
            this.trailEmitter.setParticleTint(0xffffff);
        }

        this.trailEmitter.setPosition(x, y);
        this.trailEmitter.start();
    }

    public despawn() {
        this.isActive = false;
        this.sprite.setActive(false);
        this.sprite.setVisible(false);
        if (this.trailEmitter) {
            this.trailEmitter.stop();
        }
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
        this.trailEmitter.setPosition(this.sprite.x, this.sprite.y);
    }
}
