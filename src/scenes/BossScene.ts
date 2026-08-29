import Phaser from 'phaser';
import { Player } from '../entities/player/Player';
import { InputManager } from '../managers/InputManager';
import { ProjectileManager } from '../managers/ProjectileManager';
import { EnemyManager } from '../managers/EnemyManager';
import { CombatManager } from '../managers/CombatManager';
import { ExpManager } from '../managers/ExpManager';
import { BossManager } from '../managers/BossManager';
import { HealthComponent } from '../components/HealthComponent';
import { ExperienceComponent } from '../components/ExperienceComponent';
import { Boss } from '../entities/bosses/Boss';
import { AudioManager } from '../managers/AudioManager';
import { AudioKeys } from '../data/AudioData';
import { GoldManager } from '../managers/GoldManager';
import { GameScene } from './GameScene';
import { ActiveSkillManager, ActiveSkillSaveState } from '../managers/ActiveSkillManager';
import { ActiveSkillHUD } from '../ui/ActiveSkillHUD';
import { NecroSanctumArena } from '../arenas/NecroSanctumArena';

interface PlayerStats {
    speed: number;
    maxHP: number;
    currentHP: number;
    level: number;
    currentExp: number;
    expToNextLevel: number;
}

interface CombatStats {
    baseDamage: number;
    attackCooldown: number;
    critChance: number;
    critDamageMult: number;
    knockbackForce: number;
    attackRange: number;
}

/**
 * BossScene — Dedicated Arena Scene for Boss Battles.
 * 
 * Features:
 * - The Necromantic Sanctum: Ancient floating ritual fortress above an endless abyss.
 * - Strict player & boss boundary clamping (cannot escape 800x600 combat arena).
 * - Camera zoom 1.0x for wide battlefield visibility and reaction to boss telegraphs.
 * - Full HUD: Boss Name, Phase, Health Bar with exact numbers, Player HP, Level, EXP.
 * - Robust Player Auto-Attack targeting both Enemies and Boss.
 * - Active Player Ability System with dark-fantasy HUD feedback.
 * - Phase-based visual arena transformation (Ritual -> Corruption -> Collapse -> Frenzy).
 */
export class BossScene extends Phaser.Scene {
    private player!: Player;
    private inputManager!: InputManager;
    private projectileManager!: ProjectileManager;
    private enemyManager!: EnemyManager;
    private combatManager!: CombatManager;
    private expManager!: ExpManager;
    private bossManager!: BossManager;
    public activeSkillManager!: ActiveSkillManager;
    private activeSkillHUD!: ActiveSkillHUD;
    private activeSkillState?: ActiveSkillSaveState;

    // Boss UI Elements
    private bossNameText!: Phaser.GameObjects.Text;
    private bossPhaseText!: Phaser.GameObjects.Text;
    private bossHPText!: Phaser.GameObjects.Text;
    private bossHPBarBg!: Phaser.GameObjects.Graphics;
    private bossHPBarFill!: Phaser.GameObjects.Graphics;

    // Player HUD Elements
    private playerHPText!: Phaser.GameObjects.Text;
    private playerHPBarBg!: Phaser.GameObjects.Graphics;
    private playerHPBarFill!: Phaser.GameObjects.Graphics;
    private playerLevelText!: Phaser.GameObjects.Text;
    private playerExpBarFill!: Phaser.GameObjects.Graphics;

    // Victory / Defeat Announcement Texts
    private announcementText!: Phaser.GameObjects.Text;

    // Necromantic Sanctum Arena Renderer
    private arena!: NecroSanctumArena;

    // Data passed from GameScene
    private playerStats!: PlayerStats;
    private combatStats!: CombatStats;
    private magnetRadiusSq!: number;
    private bossesDefeated!: number;

    private bossId: string = 'necromancer';
    private isVictory: boolean = false;
    private isGameOver: boolean = false;
    private displayedBossHP: number = 1.0;

    // Arena Constants (800x600 presentation size)
    private readonly ARENA_W = 800;
    private readonly ARENA_H = 600;

    private totalKills: number = 0;
    private totalSurvivalTimeSeconds: number = 0;
    public goldManager!: GoldManager;
    private initialRunGold: number = 0;

    constructor() {
        super('BossScene');
    }

    init(data: {
        playerStats: PlayerStats;
        combatStats: CombatStats;
        magnetRadiusSq: number;
        bossesDefeated: number;
        totalKills?: number;
        totalSurvivalTimeSeconds?: number;
        runGoldCollected?: number;
        bossId?: string;
        activeSkillState?: ActiveSkillSaveState;
    }) {
        this.playerStats = data.playerStats;
        this.combatStats = data.combatStats;
        this.magnetRadiusSq = data.magnetRadiusSq;
        this.bossesDefeated = data.bossesDefeated;
        this.totalKills = data.totalKills || 0;
        this.totalSurvivalTimeSeconds = data.totalSurvivalTimeSeconds || 0;
        this.initialRunGold = data.runGoldCollected || 0;
        if (data.bossId) this.bossId = data.bossId;
        if (data.activeSkillState) this.activeSkillState = data.activeSkillState;
        this.isVictory = false;
        this.isGameOver = false;
        this.displayedBossHP = 1.0;
    }

    create() {
        // Play Boss BGM
        AudioManager.getInstance(this.game).playBGM(AudioKeys.BGM_BOSS);

        // ── Physics & Camera Bounds Setup (800x600 Arena, 1.0x Zoom) ──
        this.physics.world.setBounds(80, 60, this.ARENA_W - 160, this.ARENA_H - 120);

        this.cameras.main.setBounds(0, 0, this.ARENA_W, this.ARENA_H);
        this.cameras.main.setZoom(1.0);
        this.cameras.main.centerOn(this.ARENA_W / 2, this.ARENA_H / 2);

        // ── Necromantic Sanctum Arena Background & Atmosphere ──
        this.arena = new NecroSanctumArena(this, this.ARENA_W, this.ARENA_H);

        // ── Player Setup ──
        this.inputManager = new InputManager(this);
        this.player = new Player(this, this.ARENA_W / 2, this.ARENA_H * 0.75, this.inputManager);
        this.applyPlayerStats();
        this.player.sprite.setCollideWorldBounds(true);

        // ── Managers Setup ──
        this.projectileManager = new ProjectileManager(this, this.player);
        this.expManager = new ExpManager(this, this.player);
        this.expManager.magnetRadiusSq = this.magnetRadiusSq;

        this.enemyManager = new EnemyManager(this, this.player, this.projectileManager);
        this.enemyManager.bossesDefeated = this.bossesDefeated;
        this.enemyManager.spawnEnabled = false; // Minions summoned by Boss only

        this.goldManager = new GoldManager(this, this.player);
        this.goldManager.runGoldCollected = this.initialRunGold;

        this.combatManager = new CombatManager(this, this.player, this.enemyManager, this.expManager);
        this.combatManager.setGoldManager(this.goldManager);
        this.applyCombatStats();

        this.bossManager = new BossManager(this, this.player, this.projectileManager, this.enemyManager);

        // Crucial: Connect BossManager to CombatManager so Player Auto-Attacks the Boss!
        this.combatManager.setBossManager(this.bossManager);

        // Connect ProjectileManager to enemy and boss
        this.projectileManager.setEnemyManager(this.enemyManager);
        this.projectileManager.setBossManager(this.bossManager);

        // ── Active Skill System ──
        this.activeSkillManager = new ActiveSkillManager(
            this, this.player, this.enemyManager, this.bossManager,
            this.projectileManager, this.combatManager
        );
        if (this.activeSkillState) {
            this.activeSkillManager.deserialize(this.activeSkillState);
        }
        this.activeSkillHUD = new ActiveSkillHUD(this, this.activeSkillManager);

        // ── HUD Creation ──
        this.createHUD();

        // ── Spawn Boss at Ritual Center ──
        this.bossManager.spawnBoss(this.bossId, this.ARENA_W / 2, this.ARENA_H * 0.35);

        // Update SkillManager references to target active BossScene entities
        const gameScene = this.scene.get('GameScene') as GameScene;
        if (gameScene && gameScene.skillManager) {
            gameScene.skillManager.updateReferences(this.player, this.combatManager, this.expManager);
        }

        // ── Camera Follow Player ──
        this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);

        // ── Event Listeners ──
        this.events.off('boss-defeated');
        this.events.off('level-up');

        this.events.on('boss-defeated', (_boss: Boss) => {
            this.onBossDefeated();
        });

        this.events.on('level-up', (_level: number) => {
            this.scene.pause();
            this.scene.launch('LevelUpScene');
        });

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.events.off('boss-defeated');
            this.events.off('level-up');
            if (this.inputManager) {
                this.inputManager.destroy();
            }
            if (this.activeSkillHUD) {
                this.activeSkillHUD.destroy();
            }
            if (this.arena) {
                this.arena.destroy();
            }
        });

        console.log('BossScene: Necromantic Sanctum Arena, Managers, and Auto-Attack fully initialized');
    }

    update(time: number, delta: number) {
        if (this.isVictory || this.isGameOver) return;

        // Strict Position Clamping (Player cannot escape 800x600 bounds)
        this.clampPlayerPosition();

        // Check Player Death / Defeat
        const playerHP = this.player.getComponent<HealthComponent>('HealthComponent');
        if (playerHP && playerHP.isDead()) {
            this.onPlayerDied();
            return;
        }

        // Managers Update Loop
        this.inputManager.update();
        this.player.update(time, delta);
        this.enemyManager.update(time, delta);
        this.combatManager.update(time, delta);
        this.expManager.update(time, delta);
        this.goldManager.update(time, delta);
        this.projectileManager.update(time, delta);
        this.bossManager.update(time, delta);

        // ── Active Skills Update & Input ──
        this.activeSkillManager.update(time, delta);
        this.activeSkillHUD.update();

        const abilityId = this.inputManager.getAbilityJustPressed();
        if (abilityId) {
            const ok = this.activeSkillManager.tryActivate(abilityId);
            if (ok) {
                this.activeSkillHUD.notifyActivation(abilityId);
            } else {
                this.activeSkillManager.playErrorFeedback();
                this.activeSkillHUD.notifyFailed(abilityId);
            }
        }

        // ── Necromantic Sanctum Dynamic Animations ──
        this.arena.update(time, delta);

        // Update Boss & Player HUD relative to camera worldView
        this.updateHUD(delta);
    }

    // ─── Player Position Clamping ───────────────────────────────

    private clampPlayerPosition() {
        const minX = 80;
        const maxX = this.ARENA_W - 80;
        const minY = 60;
        const maxY = this.ARENA_H - 60;
        this.player.sprite.x = Phaser.Math.Clamp(this.player.sprite.x, minX, maxX);
        this.player.sprite.y = Phaser.Math.Clamp(this.player.sprite.y, minY, maxY);
    }

    // ─── HUD Creation (WorldView Relative Positioning) ───────────

    private createHUD() {
        const hudDepth = 1000;

        // 1. BOSS TITLE & PHASE (Top Center)
        this.bossNameText = this.add.text(0, 0, 'THE NECROMANCER', {
            fontSize: '15px',
            color: '#ff3333',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5, 0).setDepth(hudDepth);

        this.bossPhaseText = this.add.text(0, 0, 'Phase 1 — The Summoner', {
            fontSize: '10px',
            color: '#e0b0ff',
            fontStyle: 'italic',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5, 0).setDepth(hudDepth);

        // 2. BOSS HEALTH BAR GRAPHICS
        this.bossHPBarBg = this.add.graphics().setDepth(hudDepth - 1);
        this.bossHPBarFill = this.add.graphics().setDepth(hudDepth);

        // 3. BOSS HEALTH TEXT (Current / Max HP)
        this.bossHPText = this.add.text(0, 0, '1,200 / 1,200 (100%)', {
            fontSize: '11px',
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5, 0).setDepth(hudDepth + 1);

        // 4. PLAYER HUD (Top Left)
        this.playerLevelText = this.add.text(0, 0, 'WARRIOR  Lv. 1', {
            fontSize: '11px',
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setDepth(hudDepth);

        this.playerHPText = this.add.text(0, 0, 'HP: 100 / 100', {
            fontSize: '10px',
            color: '#2ecc71',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setDepth(hudDepth);

        this.playerHPBarBg = this.add.graphics().setDepth(hudDepth - 1);
        this.playerHPBarFill = this.add.graphics().setDepth(hudDepth);
        this.playerExpBarFill = this.add.graphics().setDepth(hudDepth);

        // 5. VICTORY / DEFEAT ANNOUNCEMENT TEXT
        this.announcementText = this.add.text(0, 0, '', {
            fontSize: '26px',
            color: '#f1c40f',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 5
        }).setOrigin(0.5).setDepth(hudDepth + 10).setAlpha(0);
    }

    // ─── HUD Update Loop (Positions relative to Camera WorldView) ───

    private updateHUD(_delta: number) {
        const wv = this.cameras.main.worldView;
        const topCenterX = wv.x + wv.width / 2;
        const topY = wv.y;

        // ── Boss HP Bar & Text Positioning ──
        this.bossNameText.setPosition(topCenterX, topY + 6);
        this.bossPhaseText.setPosition(topCenterX, topY + 22);

        const boss = this.bossManager.getCurrentBoss();
        if (boss && boss.isActive && !this.isVictory) {
            const rawHP = boss.getCurrentHP();
            const targetPct = rawHP <= 0 ? 0 : boss.getHPPercent();
            const currentHP = Math.max(0, Math.ceil(rawHP));
            const maxHP = boss.getMaxHP();

            // Smooth HP bar fill lerp (or immediate 0 if dead)
            if (currentHP <= 0) {
                this.displayedBossHP = 0;
            } else {
                this.displayedBossHP = Phaser.Math.Linear(this.displayedBossHP, targetPct, 0.2);
            }

            const barW = 260;
            const barH = 13;
            const barX = topCenterX - barW / 2;
            const barY = topY + 36;

            // HP Bar Background & Frame
            this.bossHPBarBg.clear();
            this.bossHPBarBg.fillStyle(0x111111, 0.95);
            this.bossHPBarBg.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);
            this.bossHPBarBg.lineStyle(1.5, 0xffffff, 1);
            this.bossHPBarBg.strokeRect(barX - 2, barY - 2, barW + 4, barH + 4);

            // Fill Bar
            const fillWidth = Math.max(0, barW * this.displayedBossHP);
            const fillColor = targetPct > 0.6 ? 0xe74c3c : (targetPct > 0.25 ? 0xe67e22 : 0x8e44ad);

            this.bossHPBarFill.clear();
            if (fillWidth > 0) {
                this.bossHPBarFill.fillStyle(fillColor, 1);
                this.bossHPBarFill.fillRect(barX, barY, fillWidth, barH);
            }

            // Phase Title String & Arena Phase Sync
            let phaseName = 'Phase 1 — The Summoner';
            if (boss.currentPhase === 'phase2') {
                phaseName = 'Phase 2 — The Warlock';
                this.arena.setPhase('phase2');
            }
            if (boss.currentPhase === 'phase3') {
                phaseName = 'Phase 3 — The Lich (Enraged)';
                this.arena.setPhase('phase3');
                if (targetPct <= 0.15) {
                    this.arena.setFrenzy(true);
                }
            }

            if (this.bossPhaseText.text !== phaseName) {
                this.bossPhaseText.setText(phaseName);
            }
            this.bossHPText.setPosition(topCenterX, barY - 1);
            this.bossHPText.setText(`${currentHP} / ${maxHP} (${Math.ceil(targetPct * 100)}%)`);
        }

        // ── Player HUD Positioning & Update ──
        const pLeftX = wv.x + 10;
        const pTopY = topY + 6;

        this.playerLevelText.setPosition(pLeftX, pTopY);
        this.playerHPText.setPosition(pLeftX, pTopY + 14);

        const hpComp = this.player.getComponent<HealthComponent>('HealthComponent');
        const expComp = this.player.getComponent<ExperienceComponent>('ExperienceComponent');

        if (hpComp && expComp) {
            const playerHP = Math.max(0, Math.ceil(hpComp.currentHP));
            const playerMaxHP = hpComp.maxHP;
            const hpPct = Math.max(0, playerHP / playerMaxHP);

            this.playerLevelText.setText(`WARRIOR  Lv. ${expComp.level}`);
            this.playerHPText.setText(`HP: ${playerHP} / ${playerMaxHP}`);

            const pBarX = pLeftX;
            const pBarY = pTopY + 28;
            const pBarW = 100;
            const pBarH = 7;

            // Player HP Bar
            this.playerHPBarBg.clear();
            this.playerHPBarBg.fillStyle(0x111111, 0.9);
            this.playerHPBarBg.fillRect(pBarX - 1, pBarY - 1, pBarW + 2, pBarH + 2);
            this.playerHPBarBg.lineStyle(1, 0x888888, 1);
            this.playerHPBarBg.strokeRect(pBarX - 1, pBarY - 1, pBarW + 2, pBarH + 2);

            this.playerHPBarFill.clear();
            const pFillWidth = pBarW * hpPct;
            if (pFillWidth > 0) {
                const pFillColor = hpPct > 0.4 ? 0x2ecc71 : 0xe74c3c;
                this.playerHPBarFill.fillStyle(pFillColor, 1);
                this.playerHPBarFill.fillRect(pBarX, pBarY, pFillWidth, pBarH);
            }

            // Player EXP Bar
            const expPct = Math.min(1, expComp.currentExp / expComp.expToNextLevel);
            this.playerExpBarFill.clear();
            if (expPct > 0) {
                this.playerExpBarFill.fillStyle(0x3498db, 1);
                this.playerExpBarFill.fillRect(pBarX, pBarY + pBarH + 2, pBarW * expPct, 3);
            }
        }

        // Announcement position update
        if (this.announcementText) {
            this.announcementText.setPosition(topCenterX, wv.y + wv.height / 2);
        }
    }

    // ─── Player Death / Defeat Flow ─────────────────────────────

    private onPlayerDied() {
        if (this.isGameOver) return;
        this.isGameOver = true;

        this.player.sprite.setVelocity(0, 0);
        this.player.playDeathAnimation();

        this.cameras.main.shake(400, 0.02);

        // Display Defeat Banner
        const wv = this.cameras.main.worldView;
        const topCenterX = wv.x + wv.width / 2;

        this.announcementText.setText('YOU DIED');
        this.announcementText.setColor('#ff3333');
        this.announcementText.setPosition(topCenterX, wv.y + wv.height / 2);

        this.tweens.add({
            targets: this.announcementText,
            alpha: 1,
            scale: { from: 0.5, to: 1.2 },
            duration: 500,
            ease: 'Back.easeOut'
        });

        // Transition to ResultScene (Defeat)
        const expComp = this.player.getComponent<ExperienceComponent>('ExperienceComponent');
        const resultData = {
            isVictory: false,
            survivalTimeSeconds: this.totalSurvivalTimeSeconds,
            killCount: this.enemyManager.totalKills + this.totalKills,
            maxLevel: expComp ? expComp.level : 1,
            bossDefeated: false,
            goldEarned: this.goldManager.runGoldCollected
        };

        this.time.delayedCall(2000, () => {
            this.scene.stop('BossScene');
            this.scene.stop('GameScene');
            this.scene.start('ResultScene', resultData);
        });
    }

    // ─── Victory & Transition ───────────────────────────────────

    private onBossDefeated() {
        this.isVictory = true;
        AudioManager.getInstance(this.game).playSFX(AudioKeys.BOSS_DEFEATED);

        // Despawn remaining minions and projectiles
        this.enemyManager.despawnAll();
        this.projectileManager.despawnAll();

        // Drop Gold Reward from Boss (200 Gold pile)
        this.goldManager.tryEnemyDrop(this.ARENA_W / 2, this.ARENA_H * 0.35, true);

        // Screen Shake & Flash
        this.cameras.main.shake(600, 0.035);
        this.cameras.main.flash(600, 255, 255, 255);

        // Particle Explosion at Boss Location
        const emitter = this.add.particles(this.ARENA_W / 2, this.ARENA_H * 0.35, 'effect_particle', {
            speed: { min: 80, max: 240 },
            angle: { min: 0, max: 360 },
            scale: { start: 2.5, end: 0 },
            alpha: { start: 1, end: 0 },
            tint: [0xf1c40f, 0xe67e22, 0x2ecc71],
            lifespan: 1800,
            emitting: false
        });
        emitter.explode(40);

        // Hide Boss HP Elements
        this.bossHPBarBg.setVisible(false);
        this.bossHPBarFill.setVisible(false);
        this.bossNameText.setVisible(false);
        this.bossPhaseText.setVisible(false);
        this.bossHPText.setVisible(false);

        // Display Victory Announcement
        const wv = this.cameras.main.worldView;
        const topCenterX = wv.x + wv.width / 2;

        this.announcementText.setText('BOSS DEFEATED!');
        this.announcementText.setColor('#f1c40f');
        this.announcementText.setPosition(topCenterX, wv.y + wv.height / 2);

        this.tweens.add({
            targets: this.announcementText,
            alpha: 1,
            scale: { from: 0.5, to: 1.1 },
            duration: 600,
            ease: 'Back.easeOut'
        });

        // Spawn EXP Rewards
        for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 / 12) * i;
            const ox = (this.ARENA_W / 2) + Math.cos(angle) * 50;
            const oy = (this.ARENA_H * 0.35) + Math.sin(angle) * 50;
            this.expManager.spawnOrb(ox, oy, 10);
        }

        // Transition to ResultScene (Victory)
        const expComp = this.player.getComponent<ExperienceComponent>('ExperienceComponent');
        const resultData = {
            isVictory: true,
            survivalTimeSeconds: this.totalSurvivalTimeSeconds,
            killCount: this.enemyManager.totalKills + this.totalKills,
            maxLevel: expComp ? expComp.level : 1,
            bossDefeated: true,
            goldEarned: this.goldManager.runGoldCollected
        };

        this.time.delayedCall(3500, () => {
            this.scene.stop('BossScene');
            this.scene.stop('GameScene');
            this.scene.start('ResultScene', resultData);
        });
    }



    // ─── Stat Synchronization Helpers ───────────────────────────

    private applyPlayerStats() {
        this.player.speed = this.playerStats.speed;
        const hp = this.player.getComponent<HealthComponent>('HealthComponent');
        if (hp) {
            hp.maxHP = this.playerStats.maxHP;
            hp.currentHP = this.playerStats.currentHP;
        }
        const exp = this.player.getComponent<ExperienceComponent>('ExperienceComponent');
        if (exp) {
            exp.level = this.playerStats.level;
            exp.currentExp = this.playerStats.currentExp;
            exp.expToNextLevel = this.playerStats.expToNextLevel;
        }
    }

    private applyCombatStats() {
        this.combatManager.baseDamage = this.combatStats.baseDamage;
        this.combatManager.attackCooldown = this.combatStats.attackCooldown;
        this.combatManager.critChance = this.combatStats.critChance;
        this.combatManager.critDamageMult = this.combatStats.critDamageMult;
        this.combatManager.knockbackForce = this.combatStats.knockbackForce;
        this.combatManager.attackRange = this.combatStats.attackRange;
    }
}
