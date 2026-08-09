import { BaseScene } from './BaseScene';
import { SaveManager } from '../managers/SaveManager';
import { META_UPGRADES, UpgradeConfig } from '../data/ShopData';
import { AudioManager } from '../managers/AudioManager';
import { AudioKeys } from '../data/AudioData';

export class ShopScene extends BaseScene {
    private goldText!: Phaser.GameObjects.Text;
    private cardsContainer!: Phaser.GameObjects.Container;

    constructor() {
        super('ShopScene');
    }

    create() {
        super.create();
        const audio = AudioManager.getInstance(this.game);

        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Background
        const bg = this.add.graphics();
        bg.fillStyle(0x0e111a, 1);
        bg.fillRect(0, 0, width, height);

        // Header Title
        this.add.text(width / 2, 40, 'META UPGRADES SHOP', {
            fontSize: '32px',
            color: '#f1c40f',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 5
        }).setOrigin(0.5);

        // Current Gold Balance Display
        this.goldText = this.add.text(width / 2, 78, '', {
            fontSize: '20px',
            color: '#2ecc71',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);

        this.cardsContainer = this.add.container(0, 0);
        this.refreshShopUI();

        // Back to Menu Button
        const backBtnY = height - 40;
        const backBtn = this.add.rectangle(width / 2, backBtnY, 180, 44, 0x2c3e50)
            .setStrokeStyle(2, 0x34495e)
            .setInteractive({ useHandCursor: true });

        const backText = this.add.text(width / 2, backBtnY, 'BACK TO MENU', {
            fontSize: '15px',
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);

        backBtn.on('pointerover', () => {
            backBtn.setFillStyle(0x34495e);
            backText.setScale(1.05);
            audio.playSFX(AudioKeys.BUTTON_HOVER);
        });

        backBtn.on('pointerout', () => {
            backBtn.setFillStyle(0x2c3e50);
            backText.setScale(1.0);
        });

        backBtn.on('pointerdown', () => {
            audio.playSFX(AudioKeys.BUTTON_CLICK);
            this.scene.start('MainMenuScene');
        });
    }

    private refreshShopUI() {
        const audio = AudioManager.getInstance(this.game);
        const currentGold = SaveManager.getGold();
        this.goldText.setText(`🪙 PERMANENT GOLD: ${currentGold}`);

        this.cardsContainer.removeAll(true);

        const width = this.cameras.main.width;
        const startY = 120;
        const cardW = 600;
        const cardH = 80;
        const gap = 16;

        META_UPGRADES.forEach((config: UpgradeConfig, index: number) => {
            const currentLevel = SaveManager.getUpgradeLevel(config.id);
            const isMax = currentLevel >= config.maxLevel;
            const cost = isMax ? 0 : config.costs[currentLevel];
            const canAfford = !isMax && currentGold >= cost;

            const cardY = startY + index * (cardH + gap);

            // Card Panel Background
            const cardBg = this.add.rectangle(width / 2, cardY + cardH / 2, cardW, cardH, 0x181e2b, 0.9)
                .setStrokeStyle(2, isMax ? 0xf1c40f : (canAfford ? 0x2ecc71 : 0x34495e));

            // Icon + Title
            const titleText = this.add.text(width / 2 - cardW / 2 + 20, cardY + 15, `${config.icon}  ${config.name}`, {
                fontSize: '18px',
                color: '#ffffff',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 3
            });

            // Effect / Description
            const bonusVal = currentLevel * config.bonusPerLevel;
            const effectStr = `${config.description} (+${bonusVal}${config.unit})`;
            const descText = this.add.text(width / 2 - cardW / 2 + 20, cardY + 45, effectStr, {
                fontSize: '13px',
                color: '#aaaaaa'
            });

            // Level Pips (e.g. [■][■][ ][ ][ ])
            let pipsStr = 'Lv ';
            for (let i = 1; i <= config.maxLevel; i++) {
                pipsStr += i <= currentLevel ? '★' : '☆';
            }
            const pipsText = this.add.text(width / 2 + 60, cardY + 28, `${pipsStr} (${currentLevel}/${config.maxLevel})`, {
                fontSize: '14px',
                color: currentLevel > 0 ? '#f1c40f' : '#777777',
                fontStyle: 'bold'
            }).setOrigin(0, 0.5);

            // Upgrade Button
            const btnX = width / 2 + cardW / 2 - 80;
            const btnY = cardY + cardH / 2;
            const btnColor = isMax ? 0x7f8c8d : (canAfford ? 0x27ae60 : 0x34495e);

            const buyBtn = this.add.rectangle(btnX, btnY, 120, 42, btnColor)
                .setStrokeStyle(2, isMax ? 0x95a5a6 : (canAfford ? 0x2ecc71 : 0x7f8c8d));

            const btnLabel = isMax ? 'MAX' : `🪙 ${cost}`;
            const buyText = this.add.text(btnX, btnY, btnLabel, {
                fontSize: '14px',
                color: '#ffffff',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 3
            }).setOrigin(0.5);

            if (canAfford) {
                buyBtn.setInteractive({ useHandCursor: true });

                buyBtn.on('pointerover', () => {
                    buyBtn.setFillStyle(0x2ecc71);
                    buyText.setScale(1.08);
                    audio.playSFX(AudioKeys.BUTTON_HOVER);
                });

                buyBtn.on('pointerout', () => {
                    buyBtn.setFillStyle(0x27ae60);
                    buyText.setScale(1.0);
                });

                buyBtn.on('pointerdown', () => {
                    if (SaveManager.spendGold(cost)) {
                        SaveManager.setUpgradeLevel(config.id, currentLevel + 1);
                        audio.playSFX(AudioKeys.SKILL_SELECT);
                        this.refreshShopUI();
                    }
                });
            }

            this.cardsContainer.add([cardBg, titleText, descText, pipsText, buyBtn, buyText]);
        });
    }
}
