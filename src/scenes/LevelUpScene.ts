import Phaser from 'phaser';
import { GameScene } from './GameScene';
import { AudioManager } from '../managers/AudioManager';
import { AudioKeys } from '../data/AudioData';
import { LevelUpChoice } from '../managers/SkillManager';
import { SkillData } from '../data/SkillData';

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

        // Background
        const bg = this.add.tileSprite(0, 0, width, height, 'bg_graveyard').setOrigin(0, 0);
        bg.setAlpha(0.6);
        bg.setTint(0x4a235a);

        // Dark overlay
        this.add.rectangle(0, 0, width, height, 0x000000, 0.7).setOrigin(0);

        this.add.text(width / 2, height * 0.15, 'DARK POWER ABSORBED', {
            fontSize: '32px',
            color: '#f1c40f',
            fontStyle: 'bold',
            stroke: '#1b0d26',
            strokeThickness: 6,
            shadow: { offsetX: 0, offsetY: 4, color: '#000', blur: 0, fill: true }
        }).setOrigin(0.5);

        const gameScene = this.scene.get('GameScene') as GameScene;
        const choices = gameScene.skillManager.getChoices(3);

        const cardWidth = 210;
        const cardHeight = 170;
        const spacing = 20;
        const totalWidth = (cardWidth * choices.length) + (spacing * (choices.length - 1));
        const startX = (width - totalWidth) / 2 + (cardWidth / 2);
        const y = height / 2 + 10;

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

            if (choice.type === 'evolution') {
                this.createEvolutionCard(x, y, cardWidth, cardHeight, choice, gameScene, audio);
            } else {
                this.createSkillCard(x, y, cardWidth, cardHeight, choice, gameScene, audio);
            }
        });
    }

    // ─── Normal Skill Card ───────────────────────────────────────

    private createSkillCard(
        x: number, y: number, w: number, h: number,
        choice: LevelUpChoice & { type: 'skill' },
        gameScene: GameScene,
        audio: AudioManager
    ) {
        const cardBg = this.add.rectangle(x, y, w, h, 0x0d0814, 0.95)
            .setStrokeStyle(1.5, 0x6c3483)
            .setInteractive({ useHandCursor: true });

        this.add.text(x, y - 40, `${choice.skill.name}`, {
            fontSize: '18px',
            color: '#d2b4de',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);

        this.add.text(x, y - 18, `Lv ${choice.nextLevel}`, {
            fontSize: '14px',
            color: '#a569bd',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(x, y + 20, choice.skill.description(choice.nextLevel), {
            fontSize: '13px',
            color: '#cccccc',
            align: 'center',
            wordWrap: { width: w - 20 }
        }).setOrigin(0.5);

        // Hover effects
        cardBg.on('pointerover', () => {
            cardBg.setFillStyle(0x34193d);
            cardBg.setStrokeStyle(2, 0xf1c40f);
            audio.playSFX(AudioKeys.BUTTON_HOVER);
        });
        cardBg.on('pointerout', () => {
            cardBg.setFillStyle(0x0d0814);
            cardBg.setStrokeStyle(1.5, 0x6c3483);
        });

        // Select Skill
        cardBg.on('pointerdown', () => {
            audio.playSFX(AudioKeys.SKILL_SELECT);
            gameScene.skillManager.selectSkill(choice.skill.id);
            this.scene.resume(this.parentSceneKey);
            this.scene.stop();
        });
    }

    // ─── Evolution Card (Golden / Special) ───────────────────────

    private createEvolutionCard(
        x: number, y: number, w: number, h: number,
        choice: LevelUpChoice & { type: 'evolution' },
        gameScene: GameScene,
        audio: AudioManager
    ) {
        const evo = choice.evolution;

        // Golden glowing background
        const glow = this.add.rectangle(x, y, w + 6, h + 6, 0xf1c40f, 0.3);
        glow.setStrokeStyle(3, 0xf1c40f);

        // Subtle pulse animation on the glow
        this.tweens.add({
            targets: glow,
            alpha: { from: 0.3, to: 0.6 },
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        const cardBg = this.add.rectangle(x, y, w, h, 0x1a1025)
            .setStrokeStyle(2, 0xf1c40f)
            .setInteractive({ useHandCursor: true });

        // "EVOLUTION" label at top
        this.add.text(x, y - 65, 'EVOLUTION', {
            fontSize: '11px',
            color: '#f1c40f',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);

        // Evolution name with icon
        this.add.text(x, y - 45, `${evo.icon} ${evo.name}`, {
            fontSize: '16px',
            color: '#f1c40f',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);

        // Prerequisites display
        const skillNameA = this.getSkillName(evo.prereqs.skillA.id);
        const skillNameB = this.getSkillName(evo.prereqs.skillB.id);
        this.add.text(x, y - 22, `${skillNameA} + ${skillNameB}`, {
            fontSize: '10px',
            color: '#e0b0ff',
            fontStyle: 'italic',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);

        // Effect description
        this.add.text(x, y + 15, evo.description, {
            fontSize: '12px',
            color: '#ffffff',
            align: 'center',
            lineSpacing: 3,
            wordWrap: { width: w - 20 },
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);

        // Hover effects
        cardBg.on('pointerover', () => {
            cardBg.setFillStyle(0x4a235a);
            audio.playSFX(AudioKeys.BUTTON_HOVER);
        });
        cardBg.on('pointerout', () => {
            cardBg.setFillStyle(0x1a1025);
        });
        // Select Evolution
        cardBg.on('pointerdown', () => {
            audio.playSFX(AudioKeys.SKILL_EVOLVE);
            const success = gameScene.skillManager.selectEvolution(evo.id);
            if (success) {
                // Brief flash to celebrate
                this.cameras.main.flash(400, 241, 196, 15);
            }
            this.scene.resume(this.parentSceneKey);
            this.scene.stop();
        });
    }

    // ─── Helper ──────────────────────────────────────────────────

    /**
     * Look up a base skill's display name from its ID.
     */
    private getSkillName(skillId: string): string {
        const skill = SkillData.find(s => s.id === skillId);
        return skill ? skill.name : skillId;
    }
}
