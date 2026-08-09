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
 * - Realistic Gothic Graveyard Arena with stone tiles, ritual seal, fog particles, braziers, and vignette.
 * - Strict player & boss boundary clamping (cannot escape arena).
 * - Full HUD: Boss Name, Phase, Health Bar with exact numbers, Player HP, Level, EXP.
 * - Robust Player Auto-Attack targeting both Enemies and Boss.
 * - Player Death & Defeat Screen (no more game freezes on HP 0!).
 * - Smooth health bar updates & level-up pause compatibility.
 * - Seamless victory flow returning stats to GameScene.
 */
export class BossScene extends Phaser.Scene {
    private player!: Player;
    private inputManager!: InputManager;
    private projectileManager!: ProjectileManager;
    private enemyManager!: EnemyManager;
    private combatManager!: CombatManager;
    private expManager!: ExpManager;
    private bossManager!: BossManager;

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

    // Arena Lighting & Fog Particles
    private torchGraphics!: Phaser.GameObjects.Graphics;
    private fogEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

    // Data passed from GameScene
    private playerStats!: PlayerStats;
    private combatStats!: CombatStats;
    private magnetRadiusSq!: number;
    private bossesDefeated!: number;

    private bossId: string = 'necromancer';
    private isVictory: boolean = false;
    private isGameOver: boolean = false;
    private displayedBossHP: number = 1.0;

    // Arena Constants
    private readonly ARENA_W = 640;
    private readonly ARENA_H = 480;

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
    }) {
        this.playerStats = data.playerStats;
        this.combatStats = data.combatStats;
        this.magnetRadiusSq = data.magnetRadiusSq;
        this.bossesDefeated = data.bossesDefeated;
        this.totalKills = data.totalKills || 0;
        this.totalSurvivalTimeSeconds = data.totalSurvivalTimeSeconds || 0;
        this.initialRunGold = data.runGoldCollected || 0;
        if (data.bossId) this.bossId = data.bossId;
        this.isVictory = false;
        this.isGameOver = false;
        this.displayedBossHP = 1.0;
    }

    create() {
        // Play Boss BGM
        AudioManager.getInstance(this.game).playBGM(AudioKeys.BGM_BOSS);

        // ── Physics & Camera Bounds Setup ──
        this.physics.world.setBounds(16, 16, this.ARENA_W - 32, this.ARENA_H - 32);

        this.cameras.main.setBounds(0, 0, this.ARENA_W, this.ARENA_H);
        this.cameras.main.setZoom(1.5);
        this.cameras.main.centerOn(this.ARENA_W / 2, this.ARENA_H / 2);

        // ── Arena Background & Visual Atmosphere ──
        this.drawGraveyardArena();
        this.setupFogAtmosphere();

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

        // ── HUD Creation ──
        this.createHUD();

        // ── Spawn Boss ──
        this.bossManager.spawnBoss(this.bossId, this.ARENA_W / 2, this.ARENA_H * 0.3);

        // ── Camera Follow Player ──
        this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);

        // ── Event Listeners ──
        this.events.on('boss-defeated', (_boss: Boss) => {
            this.onBossDefeated();
        });

        this.events.on('level-up', (_level: number) => {
            this.scene.pause();
            this.scene.launch('LevelUpScene');
        });

        console.log('BossScene: Arena, Managers, and Auto-Attack fully initialized');
    }

    update(time: number, delta: number) {
        if (this.isVictory || this.isGameOver) return;

        // Strict Position Clamping (Player cannot escape 640x480 bounds)
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

        // Animated Arena Features
        this.updateTorchFlicker(time);

        // Update Boss & Player HUD relative to camera worldView
        this.updateHUD(delta);
    }

    // ─── Player Position Clamping ───────────────────────────────

    private clampPlayerPosition() {
        const margin = 20;
        this.player.sprite.x = Phaser.Math.Clamp(this.player.sprite.x, margin, this.ARENA_W - margin);
        this.player.sprite.y = Phaser.Math.Clamp(this.player.sprite.y, margin, this.ARENA_H - margin);
    }

    // ─── Graveyard Arena Visual Structure ────────────────────────

    private drawGraveyardArena() {
        const g = this.add.graphics();
        g.setDepth(0);

        // 1. Dark Gothic Base Floor
        g.fillStyle(0x10101c, 1);
        g.fillRect(0, 0, this.ARENA_W, this.ARENA_H);

        // 2. Realistic Slate Tile Grid with Moss Accents
        const tileSize = 32;
        for (let x = 0; x < this.ARENA_W; x += tileSize) {
            for (let y = 0; y < this.ARENA_H; y += tileSize) {
                const shade = ((x / tileSize + y / tileSize) % 2 === 0) ? 0x161628 : 0x131322;
                g.fillStyle(shade, 1);
                g.fillRect(x + 1, y + 1, tileSize - 2, tileSize - 2);
            }
        }

        // 3. Central Necromantic Altar Seal (Glowing Runic Rings)
        const cx = this.ARENA_W / 2;
        const cy = this.ARENA_H / 2;

        g.lineStyle(3, 0x5b2c6f, 0.8);
        g.strokeCircle(cx, cy, 130);
        g.lineStyle(1.5, 0x8e44ad, 0.9);
        g.strokeCircle(cx, cy, 110);
        g.strokeCircle(cx, cy, 75);

        // Runic Star lines inside ring
        g.lineStyle(1.5, 0xaf7ac5, 0.7);
        for (let i = 0; i < 5; i++) {
            const a1 = (Math.PI * 2 / 5) * i - Math.PI / 2;
            const a2 = (Math.PI * 2 / 5) * ((i + 2) % 5) - Math.PI / 2;
            g.moveTo(cx + Math.cos(a1) * 75, cy + Math.sin(a1) * 75);
            g.lineTo(cx + Math.cos(a2) * 75, cy + Math.sin(a2) * 75);
        }
        g.strokePath();

        // 4. Perimeter Walls & Pillars
        g.fillStyle(0x0a0a14, 1);
        g.fillRect(0, 0, this.ARENA_W, 16);
        g.fillRect(0, this.ARENA_H - 16, this.ARENA_W, 16);
        g.fillRect(0, 0, 16, this.ARENA_H);
        g.fillRect(this.ARENA_W - 16, 0, 16, this.ARENA_H);

        g.lineStyle(3, 0x4a4a68, 1);
        g.strokeRect(16, 16, this.ARENA_W - 32, this.ARENA_H - 32);

        g.lineStyle(1, 0x777799, 0.8);
        g.strokeRect(18, 18, this.ARENA_W - 36, this.ARENA_H - 36);

        // Corner Pillars
        const pillars = [
            { x: 16, y: 16 }, { x: this.ARENA_W - 16, y: 16 },
            { x: 16, y: this.ARENA_H - 16 }, { x: this.ARENA_W - 16, y: this.ARENA_H - 16 }
        ];
        for (const p of pillars) {
            g.fillStyle(0x28283c, 1);
            g.fillRect(p.x - 12, p.y - 12, 24, 24);
            g.lineStyle(2, 0x666688, 1);
            g.strokeRect(p.x - 12, p.y - 12, 24, 24);
        }

        // 5. Tombstone Decorations
        this.drawTombstones();

        // 6. Torch Lights Setup
        this.torchGraphics = this.add.graphics();
        this.torchGraphics.setDepth(10);
    }

    private setupFogAtmosphere() {
        // Soft creeping graveyard fog particles
        this.fogEmitter = this.add.particles(0, 0, 'effect_particle', {
            x: { min: 0, max: this.ARENA_W },
            y: { min: 0, max: this.ARENA_H },
            speedX: { min: -10, max: 10 },
            speedY: { min: -5, max: 5 },
            scale: { start: 2.5, end: 4 },
            alpha: { start: 0.15, end: 0 },
            tint: 0x8e44ad,
            lifespan: 3000,
            quantity: 1,
            frequency: 400
        });
        this.fogEmitter.setDepth(12);
    }

    private drawTombstones() {
        const g = this.add.graphics();
        g.setDepth(5);

        const positions = [
            { x: 50, y: 60 }, { x: 160, y: 45 }, { x: 320, y: 40 }, { x: 480, y: 45 }, { x: 590, y: 60 },
            { x: 50, y: 420 }, { x: 180, y: 435 }, { x: 320, y: 440 }, { x: 460, y: 435 }, { x: 590, y: 420 },
            { x: 40, y: 240 }, { x: 600, y: 240 }
        ];

        for (const pos of positions) {
            // Ground Shadow
            g.fillStyle(0x05050a, 0.7);
            g.fillEllipse(pos.x, pos.y + 6, 18, 8);

            // Tombstone Body
            g.fillStyle(0x4a4a5e, 1);
            g.fillRect(pos.x - 7, pos.y - 12, 14, 16);

            // Curved Top
            g.fillStyle(0x5e5e78, 1);
            g.fillRect(pos.x - 6, pos.y - 16, 12, 5);

            // Inscribed Cross
            g.fillStyle(0x2a2a3a, 1);
            g.fillRect(pos.x - 1, pos.y - 13, 2, 9);
            g.fillRect(pos.x - 3, pos.y - 10, 6, 2);
        }
    }

    private updateTorchFlicker(time: number) {
        this.torchGraphics.clear();

        const torchPositions = [
            { x: 20, y: 20 }, { x: this.ARENA_W - 20, y: 20 },
            { x: 20, y: this.ARENA_H - 20 }, { x: this.ARENA_W - 20, y: this.ARENA_H - 20 }
        ];

        for (const p of torchPositions) {
            const flicker = Math.sin(time / 100 + p.x) * 3;
            this.torchGraphics.fillStyle(0xe67e22, 0.25);
            this.torchGraphics.fillCircle(p.x, p.y, 25 + flicker);
            this.torchGraphics.fillStyle(0xf1c40f, 0.6);
            this.torchGraphics.fillCircle(p.x, p.y, 10 + flicker * 0.5);
            this.torchGraphics.fillStyle(0xffffff, 0.9);
            this.torchGraphics.fillCircle(p.x, p.y, 4);
        }
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
        if (boss && boss.isActive) {
            const targetPct = boss.getHPPercent();
            const currentHP = Math.ceil(boss.getCurrentHP());
            const maxHP = boss.getMaxHP();

            // Smooth HP bar fill lerp
            this.displayedBossHP = Phaser.Math.Linear(this.displayedBossHP, targetPct, 0.2);

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

            // Phase Title String
            let phaseName = 'Phase 1 — The Summoner';
            if (boss.currentPhase === 'phase2') phaseName = 'Phase 2 — The Warlock';
            if (boss.currentPhase === 'phase3') phaseName = 'Phase 3 — The Lich (Enraged)';

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
        this.player.sprite.setTint(0xff0000);

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
        this.goldManager.tryEnemyDrop(this.ARENA_W / 2, this.ARENA_H * 0.3, true);

        // Screen Shake & Flash
        this.cameras.main.shake(600, 0.035);
        this.cameras.main.flash(600, 255, 255, 255);

        // Particle Explosion at Boss Location
        const emitter = this.add.particles(this.ARENA_W / 2, this.ARENA_H * 0.3, 'effect_particle', {
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
            const oy = (this.ARENA_H * 0.3) + Math.sin(angle) * 50;
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
