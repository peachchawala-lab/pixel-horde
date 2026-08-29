import Phaser from 'phaser';

export class ExpOrb {
    public sprite: Phaser.GameObjects.Sprite;
    public isActive: boolean = false;
    public isMagnetic: boolean = false;
    public expValue: number = 2;
    private scene: Phaser.Scene;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        this.scene = scene;
        this.sprite = scene.add.sprite(x, y, 'exp_orb');
        this.sprite.setDepth(50);
        this.despawn();
    }

    public spawn(x: number, y: number, value: number = 2) {
        this.isActive = true;
        this.isMagnetic = false;
        this.expValue = value;
        this.sprite.setActive(true);
        this.sprite.setVisible(true);
        this.sprite.setPosition(x, y);

        // Simple floating animation
        this.scene.tweens.add({
            targets: this.sprite,
            y: y - 5,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    public despawn() {
        this.isActive = false;
        this.sprite.setActive(false);
        this.sprite.setVisible(false);
        this.scene.tweens.killTweensOf(this.sprite);
    }
}
