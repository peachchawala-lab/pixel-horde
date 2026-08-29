import { BaseScene } from './BaseScene';
import { AudioManager } from '../managers/AudioManager';
import { AudioKeys } from '../data/AudioData';
import { SaveManager } from '../managers/SaveManager';

/**
 * MainMenuScene — Primary entry point for Pixel Horde.
 * Features title artwork, start button, controls overview, and ambient pixel animation.
 */
export class MainMenuScene extends BaseScene {
    constructor() {
        super('MainMenuScene');
    }

    create() {
        super.create();
        const audio = AudioManager.getInstance(this.game);
        audio.playBGM(AudioKeys.BGM_MENU);

        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // ── Background & Ambient Grid ──
        const bg = this.add.graphics();
        bg.fillStyle(0x0e0e18, 1);
        bg.fillRect(0, 0, width, height);

        // Animated grid lines
        bg.lineStyle(1, 0x1f1f33, 0.6);
        for (let x = 0; x <= width; x += 40) {
            bg.moveTo(x, 0);
            bg.lineTo(x, height);
        }
        for (let y = 0; y <= height; y += 40) {
            bg.moveTo(0, y);
            bg.lineTo(width, y);
        }
        bg.strokePath();

        // Ambient Floating Ember Particles
        const particles = this.add.particles(0, 0, 'effect_particle', {
            x: { min: 0, max: width },
            y: { min: 0, max: height },
            speedY: { min: -20, max: -60 },
            speedX: { min: -10, max: 10 },
            scale: { start: 1, end: 0 },
            alpha: { start: 0.6, end: 0 },
            tint: [0xe74c3c, 0x8e44ad, 0x3498db],
            lifespan: 3000,
            quantity: 1,
            frequency: 300
        });
        particles.setDepth(2);

        // Fullscreen Toggle Button at Top-Right
        const fsBtn = this.add.text(width - 15, 15, '⛶ FULLSCREEN', {
            fontSize: '12px',
            color: '#ffffff',
            fontStyle: 'bold',
            backgroundColor: '#1c2833',
            padding: { x: 8, y: 5 }
        }).setOrigin(1, 0).setDepth(20).setInteractive({ useHandCursor: true });

        fsBtn.on('pointerover', () => fsBtn.setStyle({ color: '#f1c40f' }));
        fsBtn.on('pointerout', () => fsBtn.setStyle({ color: '#ffffff' }));
        fsBtn.on('pointerdown', () => {
            if (this.scale.isFullscreen) {
                this.scale.stopFullscreen();
            } else {
                this.scale.startFullscreen();
            }
        });

        // ── Game Title ──
        const titleY = height * 0.2;

        const titleText = this.add.text(width / 2, titleY, 'PIXEL HORDE', {
            fontSize: '56px',
            color: '#9b59b6', // Deep purple
            fontStyle: 'bold',
            stroke: '#1b0d26',
            strokeThickness: 8,
            shadow: { offsetX: 0, offsetY: 4, color: '#000', blur: 0, fill: true }
        }).setOrigin(0.5).setDepth(10);

        // Subtle pulsing animation on title
        this.tweens.add({
            targets: titleText,
            scale: { from: 1, to: 1.05 },
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this.add.text(width / 2, titleY + 44, 'SURVIVE THE UNDEAD SWARM', {
            fontSize: '16px',
            color: '#a569bd',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(10);

        // ── Gold Display & Buttons ──
        const currentGold = SaveManager.getGold();
        const goldBadge = this.add.graphics().setDepth(9);
        goldBadge.fillStyle(0x1a1025, 0.9);
        goldBadge.fillRoundedRect(width / 2 - 100, titleY + 70, 200, 30, 8);
        goldBadge.lineStyle(2, 0xf1c40f, 0.8);
        goldBadge.strokeRoundedRect(width / 2 - 100, titleY + 70, 200, 30, 8);

        this.add.text(width / 2, titleY + 85, `🪙 ${currentGold}`, {
            fontSize: '18px',
            color: '#f1c40f',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(10);

        // ── Start Game Button ──
        const btnY = height * 0.44;
        const btnW = 240;
        const btnH = 50;

        const btnBg = this.add.rectangle(width / 2, btnY, btnW, btnH, 0x34193d)
            .setStrokeStyle(3, 0x8e44ad)
            .setInteractive({ useHandCursor: true })
            .setDepth(10);

        const btnText = this.add.text(width / 2, btnY, 'START GAME', {
            fontSize: '20px',
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(11);

        btnBg.on('pointerover', () => {
            btnBg.setFillStyle(0x4a235a);
            btnBg.setStrokeStyle(3, 0xf1c40f);
            btnText.setColor('#f1c40f');
        });
        btnBg.on('pointerout', () => {
            btnBg.setFillStyle(0x34193d);
            btnBg.setStrokeStyle(3, 0x8e44ad);
            btnText.setColor('#ffffff');
        });

        btnBg.on('pointerdown', () => {
            audio.playSFX(AudioKeys.BUTTON_CLICK);
            this.tweens.add({
                targets: [btnBg, btnText],
                scale: 0.95,
                duration: 80,
                yoyo: true,
                onComplete: () => {
                    this.scene.start('GameScene');
                }
            });
        });

        // ── Upgrades Shop Button ──
        const shopBtnY = height * 0.54;
        const shopBtnBg = this.add.rectangle(width / 2, shopBtnY, btnW, btnH, 0x1a1025)
            .setStrokeStyle(2, 0x6c3483)
            .setInteractive({ useHandCursor: true })
            .setDepth(10);

        const shopBtnText = this.add.text(width / 2, shopBtnY, 'UPGRADES SHOP', {
            fontSize: '18px',
            color: '#a569bd',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(11);

        shopBtnBg.on('pointerover', () => {
            shopBtnBg.setFillStyle(0x34193d);
            shopBtnBg.setStrokeStyle(2, 0xf1c40f);
            shopBtnText.setColor('#f1c40f');
            audio.playSFX(AudioKeys.BUTTON_HOVER);
        });

        shopBtnBg.on('pointerout', () => {
            shopBtnBg.setFillStyle(0x1a1025);
            shopBtnBg.setStrokeStyle(2, 0x6c3483);
            shopBtnText.setColor('#a569bd');
        });

        shopBtnBg.on('pointerdown', () => {
            audio.playSFX(AudioKeys.BUTTON_CLICK);
            this.scene.start('ShopScene');
        });

        // ── How To Play / Info Panel ──
        const panelY = height * 0.72;
        const panelW = 480;
        const panelH = 150;

        // Dark obsidian panel with thin gold border
        this.add.rectangle(width / 2, panelY, panelW, panelH, 0x0d0814, 0.95)
            .setStrokeStyle(1.5, 0x6c3483)
            .setDepth(10);
        this.add.rectangle(width / 2, panelY, panelW - 6, panelH - 6, 0x1a1025, 0.6)
            .setStrokeStyle(1, 0x34193d)
            .setDepth(10);

        this.add.text(width / 2, panelY - 58, 'HOW TO PLAY', {
            fontSize: '14px',
            color: '#f1c40f',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(11);

        const instructions = [
            '🎮  MOVE: WASD or Arrow Keys (Auto-Attacks nearest enemy)',
            '💎  EXP & SKILLS: Defeat enemies, collect gems & level up',
            '☠️  BOSS EVENT: Survive 2 minutes to face The Necromancer!'
        ];

        instructions.forEach((line, index) => {
            this.add.text(width / 2, panelY - 26 + (index * 32), line, {
                fontSize: '13px',
                color: '#d2b4de',
                stroke: '#000000',
                strokeThickness: 2
            }).setOrigin(0.5).setDepth(11);
        });

        // ── Footer ──
        this.add.text(width / 2, height - 15, 'Pixel Horde v1.0 • Built with Phaser 3', {
            fontSize: '10px',
            color: '#777799'
        }).setOrigin(0.5).setDepth(5);
    }
}
