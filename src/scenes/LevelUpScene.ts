import Phaser from 'phaser';
import { GameScene } from './GameScene';
import { AudioManager } from '../managers/AudioManager';
import { AudioKeys } from '../data/AudioData';

export class LevelUpScene extends Phaser.Scene {
    private parentSceneKey: string = 'GameScene';

    constructor() {
        super('LevelUpScene');
    }

    create() {
        const audio = AudioManager.getInstance(this.game);
        audio.playSFX(AudioKeys.LEVEL_UP);

        // Detect which scene launched us
        const bossScene = this.scene.get('BossScene');
        this.parentSceneKey = (bossScene && bossScene.scene.isPaused()) ? 'BossScene' : 'GameScene';

        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Dark overlay
        this.add.rectangle(0, 0, width, height, 0x000000, 0.7).setOrigin(0);

        this.add.text(width / 2, height * 0.2, 'LEVEL UP!', {
            fontSize: '32px',
            color: '#ffff00',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const gameScene = this.scene.get('GameScene') as GameScene;
        const choices = gameScene.skillManager.getChoices(3);

        const cardWidth = 200;
        const cardHeight = 150;
        const spacing = 20;
        const totalWidth = (cardWidth * choices.length) + (spacing * (choices.length - 1));
        const startX = (width - totalWidth) / 2 + (cardWidth / 2);
        const y = height / 2;

        if (choices.length === 0) {
            this.add.text(width / 2, y, 'All Skills Maxed!', {
                fontSize: '24px',
                color: '#ffffff'
            }).setOrigin(0.5);
            
            this.time.delayedCall(2000, () => {
                this.scene.resume(this.parentSceneKey);
                this.scene.stop();
            });
            return;
        }

        choices.forEach((choice, index) => {
            const x = startX + (index * (cardWidth + spacing));
            
            // Skill Card Background
            const cardBg = this.add.rectangle(x, y, cardWidth, cardHeight, 0x222222)
                .setStrokeStyle(2, 0xaaaaaa)
                .setInteractive({ useHandCursor: true });

            this.add.text(x, y - 30, `${choice.skill.name} Lv ${choice.nextLevel}`, {
                fontSize: '18px',
                color: '#ffffff',
                fontStyle: 'bold'
            }).setOrigin(0.5);

            this.add.text(x, y + 20, choice.skill.description(choice.nextLevel), {
                fontSize: '14px',
                color: '#aaaaaa',
                align: 'center',
                wordWrap: { width: cardWidth - 20 }
            }).setOrigin(0.5);

            // Hover effects
            cardBg.on('pointerover', () => {
                cardBg.setFillStyle(0x444444);
                audio.playSFX(AudioKeys.BUTTON_HOVER);
            });
            cardBg.on('pointerout', () => cardBg.setFillStyle(0x222222));

            // Select Skill
            cardBg.on('pointerdown', () => {
                audio.playSFX(AudioKeys.SKILL_SELECT);
                gameScene.skillManager.selectSkill(choice.skill.id);
                this.scene.resume(this.parentSceneKey);
                this.scene.stop();
            });
        });
    }
}
