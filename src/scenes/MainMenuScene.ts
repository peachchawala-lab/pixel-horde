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

        // ── Game Title ──
        const titleY = height * 0.2;

        const titleText = this.add.text(width / 2, titleY, 'PIXEL HORDE', {
            fontSize: '44px',
            color: '#e74c3c',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5).setDepth(10);

        // Subtle pulsing animation on title
        this.tweens.add({
            targets: titleText,
            scale: { from: 1, to: 1.05 },
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this.add.text(width / 2, titleY + 36, 'SURVIVE THE UNDEAD SWARM', {
            fontSize: '14px',
            color: '#c8a2c8',
            fontStyle: 'italic',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(10);

        // ── Gold Display & Buttons ──
        const currentGold = SaveManager.getGold();
        this.add.text(width / 2, titleY + 60, `🪙 PERMANENT GOLD: ${currentGold}`, {
            fontSize: '15px',
            color: '#f1c40f',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(10);

        // ── Start Game Button ──
        const btnY = height * 0.44;
        const btnW = 200;
        const btnH = 44;

        const btnBg = this.add.rectangle(width / 2, btnY, btnW, btnH, 0x27ae60)
            .setStrokeStyle(3, 0x2ecc71)
            .setInteractive({ useHandCursor: true })
            .setDepth(10);

        const btnText = this.add.text(width / 2, btnY, 'START GAME', {
            fontSize: '18px',
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(11);

        btnBg.on('pointerover', () => {
            btnBg.setFillStyle(0x2ecc71);
            btnBg.setStrokeStyle(3, 0xffffff);
            btnText.setScale(1.08);
            audio.playSFX(AudioKeys.BUTTON_HOVER);
        });

        btnBg.on('pointerout', () => {
            btnBg.setFillStyle(0x27ae60);
            btnBg.setStrokeStyle(3, 0x2ecc71);
            btnText.setScale(1.0);
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
        const shopBtnBg = this.add.rectangle(width / 2, shopBtnY, btnW, btnH, 0xd35400)
            .setStrokeStyle(3, 0xe67e22)
            .setInteractive({ useHandCursor: true })
            .setDepth(10);

        const shopBtnText = this.add.text(width / 2, shopBtnY, 'UPGRADES SHOP', {
            fontSize: '17px',
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(11);

        shopBtnBg.on('pointerover', () => {
            shopBtnBg.setFillStyle(0xe67e22);
            shopBtnBg.setStrokeStyle(3, 0xffffff);
            shopBtnText.setScale(1.08);
            audio.playSFX(AudioKeys.BUTTON_HOVER);
        });

        shopBtnBg.on('pointerout', () => {
            shopBtnBg.setFillStyle(0xd35400);
            shopBtnBg.setStrokeStyle(3, 0xe67e22);
            shopBtnText.setScale(1.0);
        });

        shopBtnBg.on('pointerdown', () => {
            audio.playSFX(AudioKeys.BUTTON_CLICK);
            this.scene.start('ShopScene');
        });

        // ── How To Play / Info Panel ──
        const panelY = height * 0.72;
        const panelW = 480;
        const panelH = 150;

        this.add.rectangle(width / 2, panelY, panelW, panelH, 0x161624, 0.9)
            .setStrokeStyle(2, 0x4a4a68)
            .setDepth(5);

        this.add.text(width / 2, panelY - 58, 'HOW TO PLAY', {
            fontSize: '14px',
            color: '#f1c40f',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(6);

        const instructions = [
            '🎮  MOVE: WASD or Arrow Keys (Auto-Attacks nearest enemy)',
            '💎  EXP & SKILLS: Defeat enemies, collect gems & level up',
            '☠️  BOSS EVENT: Survive 2 minutes to face The Necromancer!'
        ];

        instructions.forEach((line, index) => {
            this.add.text(width / 2, panelY - 26 + (index * 32), line, {
                fontSize: '12px',
                color: '#dddddd',
                stroke: '#000000',
                strokeThickness: 2
            }).setOrigin(0.5).setDepth(6);
        });

        // ── Footer ──
        this.add.text(width / 2, height - 15, 'Pixel Horde v1.0 • Built with Phaser 3', {
            fontSize: '10px',
            color: '#777799'
        }).setOrigin(0.5).setDepth(5);
    }
}
