import { BaseScene } from './BaseScene';
import { AudioManager } from '../managers/AudioManager';
import { AudioKeys } from '../data/AudioData';
import { SaveManager } from '../managers/SaveManager';

export interface ResultData {
    isVictory: boolean;
    survivalTimeSeconds: number;
    killCount: number;
    maxLevel: number;
    bossDefeated: boolean;
    goldEarned: number;
}

/**
 * ResultScene — Game Over & Victory Summary Scene.
 * Displays run statistics, survival time, total kills, max level, boss status, and Gold earned.
 */
export class ResultScene extends BaseScene {
    private resultData!: ResultData;
    private totalPermanentGold: number = 0;

    constructor() {
        super('ResultScene');
    }

    init(data: ResultData) {
        this.resultData = {
            isVictory: data?.isVictory || false,
            survivalTimeSeconds: data?.survivalTimeSeconds || 0,
            killCount: data?.killCount || 0,
            maxLevel: data?.maxLevel || 1,
            bossDefeated: data?.bossDefeated || false,
            goldEarned: data?.goldEarned || 0
        };

        // Persist Gold reward to permanent save
        if (this.resultData.goldEarned > 0) {
            this.totalPermanentGold = SaveManager.addGold(this.resultData.goldEarned);
        } else {
            this.totalPermanentGold = SaveManager.getGold();
        }
    }

    create() {
        super.create();
        const audio = AudioManager.getInstance(this.game);

        if (this.resultData.isVictory) {
            audio.playBGM(AudioKeys.BGM_VICTORY);
            audio.playSFX(AudioKeys.VICTORY_SFX);
        } else {
            audio.playBGM(AudioKeys.BGM_GAME_OVER);
            audio.playSFX(AudioKeys.GAME_OVER_SFX);
        }

        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // ── Background Overlay ──
        const bg = this.add.graphics();
        const bgColor = this.resultData.isVictory ? 0x121c14 : 0x1a0e14;
        bg.fillStyle(bgColor, 0.95);
        bg.fillRect(0, 0, width, height);

        // Ambient particles
        const particleColor = this.resultData.isVictory ? [0xf1c40f, 0x2ecc71, 0x1abc9c] : [0xe74c3c, 0xc0392b, 0x8e44ad];
        const particles = this.add.particles(width / 2, height / 2, 'effect_particle', {
            speed: { min: 30, max: 120 },
            angle: { min: 0, max: 360 },
            scale: { start: 1.5, end: 0 },
            alpha: { start: 0.6, end: 0 },
            tint: particleColor,
            lifespan: 2000,
            frequency: 250
        });
        particles.setDepth(2);

        // ── Header Title ──
        const headerY = height * 0.16;
        const headerText = this.resultData.isVictory ? 'VICTORY!' : 'GAME OVER';
        const headerColor = this.resultData.isVictory ? '#f1c40f' : '#e74c3c';

        const title = this.add.text(width / 2, headerY, headerText, {
            fontSize: '40px',
            color: headerColor,
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5).setDepth(10);

        // Pulse effect
        this.tweens.add({
            targets: title,
            scale: { from: 1, to: 1.05 },
            duration: 1000,
            yoyo: true,
            repeat: -1
        });

        const subtitleText = this.resultData.isVictory
            ? 'You Have Conquered The Necromancer!'
            : 'The Swarm Has Overwhelmed You...';

        this.add.text(width / 2, headerY + 36, subtitleText, {
            fontSize: '13px',
            color: '#dddddd',
            fontStyle: 'italic',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(10);

        // ── Run Statistics Box ──
        const boxY = height * 0.52;
        const boxW = 440;
        const boxH = 230;

        const boxBorderColor = this.resultData.isVictory ? 0xf1c40f : 0x6c3483;
        // Obsidian Box
        this.add.rectangle(width / 2, boxY, boxW, boxH, 0x0d0814, 0.95)
            .setStrokeStyle(1.5, boxBorderColor)
            .setDepth(5);
        this.add.rectangle(width / 2, boxY, boxW - 6, boxH - 6, 0x1a1025, 0.7)
            .setStrokeStyle(1, 0x34193d)
            .setDepth(5);

        this.add.text(width / 2, boxY - 96, '— RUN SUMMARY —', {
            fontSize: '15px',
            color: '#d2b4de',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(6);

        // Format Survival Time (MM:SS)
        const totalSec = Math.floor(this.resultData.survivalTimeSeconds);
        const mins = Math.floor(totalSec / 60);
        const secs = totalSec % 60;
        const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

        const stats = [
            { icon: '⏱️', label: 'SURVIVAL TIME', value: timeStr },
            { icon: '💀', label: 'ENEMIES DEFEATED', value: `${this.resultData.killCount} Kills` },
            { icon: '⭐', label: 'MAX LEVEL REACHED', value: `Level ${this.resultData.maxLevel}` },
            { icon: '👑', label: 'BOSS STATUS', value: this.resultData.bossDefeated ? 'DEFEATED (Cleared)' : 'NOT DEFEATED' },
            { icon: '🪙', label: 'GOLD EARNED', value: `+${this.resultData.goldEarned} (Total: ${this.totalPermanentGold})` }
        ];

        stats.forEach((stat, index) => {
            const rowY = boxY - 65 + (index * 32);

            // Icon + Label (Left aligned)
            this.add.text(width / 2 - 195, rowY, `${stat.icon}  ${stat.label}`, {
                fontSize: '13px',
                color: '#a569bd',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 2
            }).setOrigin(0, 0.5).setDepth(6);

            // Value (Right aligned)
            const valColor = index === 4 ? '#f1c40f' : (index === 3 ? (this.resultData.bossDefeated ? '#f1c40f' : '#e74c3c') : '#ffffff');
            this.add.text(width / 2 + 195, rowY, stat.value, {
                fontSize: '13px',
                color: valColor,
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 2
            }).setOrigin(1, 0.5).setDepth(6);
        });

        // ── Action Buttons ──
        const btnY = height * 0.84;
        const btnW = 160;
        const btnH = 42;

        // Button 1: PLAY AGAIN
        const playBtnBg = this.add.rectangle(width / 2 - 95, btnY, btnW, btnH, 0x1a1025)
            .setStrokeStyle(2, 0x8e44ad)
            .setInteractive({ useHandCursor: true })
            .setDepth(10);

        const playBtnText = this.add.text(width / 2 - 95, btnY, 'PLAY AGAIN', {
            fontSize: '16px',
            color: '#a569bd',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(11);

        playBtnBg.on('pointerover', () => {
            playBtnBg.setFillStyle(0x34193d);
            playBtnBg.setStrokeStyle(2, 0xf1c40f);
            playBtnText.setColor('#f1c40f');
            audio.playSFX(AudioKeys.BUTTON_HOVER);
        });
        playBtnBg.on('pointerout', () => {
            playBtnBg.setFillStyle(0x1a1025);
            playBtnBg.setStrokeStyle(2, 0x8e44ad);
            playBtnText.setColor('#a569bd');
        });
        playBtnBg.on('pointerdown', () => {
            audio.playSFX(AudioKeys.BUTTON_CLICK);
            this.scene.start('GameScene');
        });

        // Button 2: MAIN MENU
        const menuBtnBg = this.add.rectangle(width / 2 + 95, btnY, btnW, btnH, 0x1a1025)
            .setStrokeStyle(2, 0x6c3483)
            .setInteractive({ useHandCursor: true })
            .setDepth(10);

        const menuBtnText = this.add.text(width / 2 + 95, btnY, 'MAIN MENU', {
            fontSize: '16px',
            color: '#a569bd',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(11);

        menuBtnBg.on('pointerover', () => {
            menuBtnBg.setFillStyle(0x34193d);
            menuBtnBg.setStrokeStyle(2, 0xf1c40f);
            menuBtnText.setColor('#f1c40f');
            audio.playSFX(AudioKeys.BUTTON_HOVER);
        });
        menuBtnBg.on('pointerout', () => {
            menuBtnBg.setFillStyle(0x1a1025);
            menuBtnBg.setStrokeStyle(2, 0x6c3483);
            menuBtnText.setColor('#a569bd');
        });
        menuBtnBg.on('pointerdown', () => {
            audio.playSFX(AudioKeys.BUTTON_CLICK);
            this.scene.start('MainMenuScene');
        });
    }
}
