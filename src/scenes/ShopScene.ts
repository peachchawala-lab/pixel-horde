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
        const bg = this.add.tileSprite(0, 0, width, height, 'bg_graveyard').setOrigin(0, 0);
        bg.setAlpha(0.4);
        bg.setTint(0x4a235a);

        // Header Title
        this.add.text(width / 2, 40, 'DARK ARTS UPGRADES', {
            fontSize: '36px',
            color: '#f1c40f',
            fontStyle: 'bold',
            stroke: '#1b0d26',
            strokeThickness: 6,
            shadow: { offsetX: 0, offsetY: 4, color: '#000', blur: 0, fill: true }
        }).setOrigin(0.5);

        // Current Gold Balance Display
        const goldBadge = this.add.graphics().setDepth(9);
        goldBadge.fillStyle(0x1a1025, 0.9);
        goldBadge.fillRoundedRect(width / 2 - 100, 70, 200, 30, 8);
        goldBadge.lineStyle(2, 0xf1c40f, 0.8);
        goldBadge.strokeRoundedRect(width / 2 - 100, 70, 200, 30, 8);

        this.goldText = this.add.text(width / 2, 85, '', {
            fontSize: '18px',
            color: '#f1c40f',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(10);

        this.cardsContainer = this.add.container(0, 0);
        this.refreshShopUI();

        // Back to Menu Button
        const backBtnY = height - 40;
        const backBtn = this.add.rectangle(width / 2, backBtnY, 200, 44, 0x1a1025)
            .setStrokeStyle(2, 0x6c3483)
            .setInteractive({ useHandCursor: true });

        const backText = this.add.text(width / 2, backBtnY, 'BACK TO MENU', {
            fontSize: '16px',
            color: '#a569bd',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);

        backBtn.on('pointerover', () => {
            backBtn.setFillStyle(0x34193d);
            backBtn.setStrokeStyle(2, 0xf1c40f);
            backText.setColor('#f1c40f');
            audio.playSFX(AudioKeys.BUTTON_HOVER);
        });

        backBtn.on('pointerout', () => {
            backBtn.setFillStyle(0x1a1025);
            backBtn.setStrokeStyle(2, 0x6c3483);
            backText.setColor('#a569bd');
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
            const cardBg = this.add.rectangle(width / 2, cardY + cardH / 2, cardW, cardH, 0x0d0814, 0.95)
                .setStrokeStyle(1.5, isMax ? 0xf1c40f : (canAfford ? 0x6c3483 : 0x34193d));

            // Icon + Title
            const titleText = this.add.text(width / 2 - cardW / 2 + 20, cardY + 15, `${config.icon}  ${config.name}`, {
                fontSize: '18px',
                color: '#d2b4de',
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
            const btnColor = isMax ? 0x1a1025 : (canAfford ? 0x34193d : 0x1a1025);

            const buyBtn = this.add.rectangle(btnX, btnY, 120, 42, btnColor)
                .setStrokeStyle(2, isMax ? 0xf1c40f : (canAfford ? 0x8e44ad : 0x34193d));

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
                    buyBtn.setFillStyle(0x4a235a);
                    buyBtn.setStrokeStyle(2, 0xf1c40f);
                    buyText.setColor('#f1c40f');
                    audio.playSFX(AudioKeys.BUTTON_HOVER);
                });

                buyBtn.on('pointerout', () => {
                    buyBtn.setFillStyle(0x34193d);
                    buyBtn.setStrokeStyle(2, 0x8e44ad);
                    buyText.setColor('#ffffff');
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
