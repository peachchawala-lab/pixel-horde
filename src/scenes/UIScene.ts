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

        this.levelText = this.add.text(12, 8, 'Level 1', {
            fontSize: '17px',
            color: '#f1c40f',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        });

        this.goldText = this.add.text(this.cameras.main.width - 120, 8, '🪙 0', {
            fontSize: '17px',
            color: '#f1c40f',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(1, 0);

        // Fullscreen Toggle Button
        const fsBtn = this.add.text(this.cameras.main.width - 12, 8, '⛶ FULLSCREEN', {
            fontSize: '11px',
            color: '#d2b4de',
            fontStyle: 'bold',
            backgroundColor: '#1a1025',
            padding: { x: 6, y: 4 },
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

        fsBtn.on('pointerover', () => {
            fsBtn.setStyle({ color: '#f1c40f', backgroundColor: '#34193d' });
        });
        fsBtn.on('pointerout', () => {
            fsBtn.setStyle({ color: '#d2b4de', backgroundColor: '#1a1025' });
        });
        fsBtn.on('pointerdown', () => {
            if (this.scale.isFullscreen) {
                this.scale.stopFullscreen();
            } else {
                this.scale.startFullscreen();
            }
        });

        // Initialize empty bar
        this.updateExpBar(0, 10, 1);

        // Listen for events from GameScene (Clean old listeners first)
        const gameScene = this.scene.get('GameScene');
        if (gameScene) {
            gameScene.events.off('exp-changed', this.updateExpBar, this);
            gameScene.events.off('gold-changed', this.updateGold, this);
            gameScene.events.on('exp-changed', this.updateExpBar, this);
            gameScene.events.on('gold-changed', this.updateGold, this);

            this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
                gameScene.events.off('exp-changed', this.updateExpBar, this);
                gameScene.events.off('gold-changed', this.updateGold, this);
            });
        }
    }

    private updateGold(goldAmount: number) {
        this.goldText.setText(`🪙 ${goldAmount}`);
    }

    private updateExpBar(currentExp: number, maxExp: number, level: number) {
        const barWidth = this.cameras.main.width - 24;
        const barHeight = 11;
        const x = 12;
        const y = 32;

        // Draw metallic background frame
        this.expBarBg.clear();
        this.expBarBg.fillStyle(0x0d0814, 0.95);
        this.expBarBg.fillRect(x - 2, y - 2, barWidth + 4, barHeight + 4);
        this.expBarBg.lineStyle(1.5, 0x6c3483, 1);
        this.expBarBg.strokeRect(x - 2, y - 2, barWidth + 4, barHeight + 4);

        // Draw fill gradient
        this.expBarFill.clear();
        const fillWidth = Math.max(0, (currentExp / maxExp) * barWidth);
        if (fillWidth > 0) {
            this.expBarFill.fillStyle(0x8e44ad, 1); // Purple bar
            this.expBarFill.fillRect(x, y, fillWidth, barHeight);
            this.expBarFill.fillStyle(0xd2b4de, 0.7); // Purple highlight
            this.expBarFill.fillRect(x, y, fillWidth, 2);
        }

        this.levelText.setText(`WARRIOR  Lv. ${level}`);
    }
}
