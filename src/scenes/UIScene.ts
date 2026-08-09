import Phaser from 'phaser';

export class UIScene extends Phaser.Scene {
    private expBarBg!: Phaser.GameObjects.Graphics;
    private expBarFill!: Phaser.GameObjects.Graphics;
    private levelText!: Phaser.GameObjects.Text;
    private goldText!: Phaser.GameObjects.Text;

    constructor() {
        super('UIScene');
    }

    create() {
        this.expBarBg = this.add.graphics();
        this.expBarFill = this.add.graphics();

        this.levelText = this.add.text(10, 10, 'Level 1', {
            fontSize: '18px',
            color: '#ffffff',
            fontStyle: 'bold'
        });

        this.goldText = this.add.text(this.cameras.main.width - 15, 10, '🪙 0', {
            fontSize: '16px',
            color: '#f1c40f',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(1, 0);

        // Initialize empty bar
        this.updateExpBar(0, 10, 1);

        // Listen for events from GameScene
        const gameScene = this.scene.get('GameScene');
        gameScene.events.on('exp-changed', this.updateExpBar, this);
        gameScene.events.on('gold-changed', this.updateGold, this);
    }

    private updateGold(goldAmount: number) {
        this.goldText.setText(`🪙 ${goldAmount}`);
    }

    private updateExpBar(currentExp: number, maxExp: number, level: number) {
        const barWidth = this.cameras.main.width - 20;
        const barHeight = 10;
        const x = 10;
        const y = 35;

        // Draw background
        this.expBarBg.clear();
        this.expBarBg.fillStyle(0x333333, 1);
        this.expBarBg.fillRect(x, y, barWidth, barHeight);
        
        // Draw fill
        this.expBarFill.clear();
        this.expBarFill.fillStyle(0x00ffff, 1);
        const fillWidth = (currentExp / maxExp) * barWidth;
        this.expBarFill.fillRect(x, y, fillWidth, barHeight);

        this.levelText.setText(`Level ${level}`);
    }
}
