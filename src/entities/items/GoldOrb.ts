import Phaser from 'phaser';

export class GoldOrb {
    public sprite: Phaser.GameObjects.Sprite;
    public isActive: boolean = false;
    public isMagnetic: boolean = false;
    public goldValue: number = 1;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        this.sprite = scene.add.sprite(x, y, 'gold_coin');
        this.sprite.setDepth(15);
        this.sprite.setVisible(false);
    }

    public spawn(x: number, y: number, value: number = 1) {
        this.goldValue = value;
        this.isMagnetic = false;
        this.sprite.setPosition(x, y);
        this.sprite.setScale(value > 5 ? 1.4 : 1.0);
        this.sprite.setVisible(true);
        this.sprite.setActive(true);
        this.isActive = true;

        // Floating bounce animation
        this.sprite.scene.tweens.add({
            targets: this.sprite,
            y: y - 5,
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    public despawn() {
        this.isActive = false;
        this.sprite.setVisible(false);
        this.sprite.setActive(false);
        this.sprite.scene.tweens.killTweensOf(this.sprite);
    }
}
