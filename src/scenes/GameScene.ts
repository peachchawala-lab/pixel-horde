import { BaseScene } from './BaseScene';
import { Player } from '../entities/player/Player';
import { InputManager } from '../managers/InputManager';
import { EnemyManager } from '../managers/EnemyManager';
import { CombatManager } from '../managers/CombatManager';
import { ExpManager } from '../managers/ExpManager';
import { SkillManager } from '../managers/SkillManager';
import { ProjectileManager } from '../managers/ProjectileManager';
import { GoldManager } from '../managers/GoldManager';
import { SaveManager } from '../managers/SaveManager';
import { HealthComponent } from '../components/HealthComponent';
import { ExperienceComponent } from '../components/ExperienceComponent';
import { AudioManager } from '../managers/AudioManager';
import { AudioKeys } from '../data/AudioData';

export class GameScene extends BaseScene {
    public player!: Player;
    private inputManager!: InputManager;
    public enemyManager!: EnemyManager;
    public combatManager!: CombatManager;
    public expManager!: ExpManager;
    public skillManager!: SkillManager;
    public projectileManager!: ProjectileManager;
    public goldManager!: GoldManager;

    // Boss trigger & Run Stats
    private bossTimer: number = 0;
    private readonly BOSS_TRIGGER_TIME: number = 120000; // 2 minutes
    private isBossTransition: boolean = false;
    private warningText: Phaser.GameObjects.Text | null = null;
    public totalSurvivalTimeSeconds: number = 0;

    constructor() {
        super('GameScene');
    }

    create() {
        super.create();
        
        // Start Gameplay BGM
        AudioManager.getInstance(this.game).playBGM(AudioKeys.BGM_GAMEPLAY);

        // Reset run stats
        this.totalSurvivalTimeSeconds = 0;
        this.bossTimer = 0;
        this.isBossTransition = false;

        // Setup world bounds
        this.physics.world.setBounds(0, 0, 1600, 1200);

        // Draw simple grid background
        const bgGraphics = this.add.graphics();
        bgGraphics.lineStyle(1, 0x333333, 1);
        for(let i = 0; i <= 1600; i += 64) {
            bgGraphics.moveTo(i, 0);
            bgGraphics.lineTo(i, 1200);
        }
        for(let j = 0; j <= 1200; j += 64) {
            bgGraphics.moveTo(0, j);
            bgGraphics.lineTo(1600, j);
        }

        this.inputManager = new InputManager(this);
        this.player = new Player(this, 800, 600, this.inputManager);
        this.projectileManager = new ProjectileManager(this, this.player);
        this.expManager = new ExpManager(this, this.player);
        this.goldManager = new GoldManager(this, this.player);
        this.enemyManager = new EnemyManager(this, this.player, this.projectileManager);
        this.combatManager = new CombatManager(this, this.player, this.enemyManager, this.expManager);
        this.combatManager.setGoldManager(this.goldManager);
        this.skillManager = new SkillManager(this.player, this.combatManager, this.expManager);

        // ── Apply Meta Upgrades ──
        const maxHPLvl = SaveManager.getUpgradeLevel('maxHP');
        const dmgLvl = SaveManager.getUpgradeLevel('attackDamage');
        const speedLvl = SaveManager.getUpgradeLevel('moveSpeed');
        const expLvl = SaveManager.getUpgradeLevel('expGain');

        const hp = this.player.getComponent<HealthComponent>('HealthComponent');
        if (hp) {
            hp.maxHP = 100 + maxHPLvl * 10;
            hp.currentHP = hp.maxHP;
        }
        this.combatManager.baseDamage = 15 * (1 + dmgLvl * 0.10);
        this.player.speed = 100 * (1 + speedLvl * 0.05);

        const expComp = this.player.getComponent<ExperienceComponent>('ExperienceComponent');
        if (expComp) {
            expComp.expMultiplier = 1 + expLvl * 0.10;
        }

        this.cameras.main.setBounds(0, 0, 1600, 1200);
        this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);
        this.cameras.main.setZoom(2);

        // Launch UI Scene
        this.scene.launch('UIScene');

        // Setup Level Up Listener
        this.events.on('level-up', (_level: number) => {
            this.scene.pause();
            this.scene.launch('LevelUpScene');
        });

        // Listen for return from BossScene
        this.events.on('boss-return', (data: {
            currentHP: number;
            maxHP: number;
            level: number;
            currentExp: number;
            expToNextLevel: number;
            bossesDefeated: number;
            totalKills: number;
            totalSurvivalTimeSeconds: number;
            combatStats: {
                baseDamage: number;
                attackCooldown: number;
                critChance: number;
                critDamageMult: number;
                knockbackForce: number;
                attackRange: number;
            };
            playerSpeed: number;
            magnetRadiusSq: number;
        }) => {
            this.onBossReturn(data);
        });

        console.log('GameScene: Initialized Systems');
    }

    update(_time: number, delta: number) {
        if (this.isBossTransition) return;

        // Check Player Death
        const hp = this.player.getComponent<HealthComponent>('HealthComponent');
        if (hp && hp.isDead()) {
            this.onPlayerDied();
            return;
        }

        // Track Survival Time
        this.totalSurvivalTimeSeconds += delta / 1000;

        this.inputManager.update();
        this.player.update(_time, delta);
        this.enemyManager.update(_time, delta);
        this.combatManager.update(_time, delta);
        this.expManager.update(_time, delta);
        this.goldManager.update(_time, delta);
        this.projectileManager.update(_time, delta);

        // Boss trigger timer
        this.bossTimer += delta;
        if (this.bossTimer >= this.BOSS_TRIGGER_TIME) {
            this.bossTimer = 0;
            this.startBossTransition();
        }
    }

    private onPlayerDied() {
        this.player.sprite.setVelocity(0, 0);
        this.player.sprite.setTint(0xff0000);
        this.cameras.main.shake(400, 0.02);

        this.scene.stop('UIScene');

        const exp = this.player.getComponent<ExperienceComponent>('ExperienceComponent');

        const resultData = {
            isVictory: false,
            survivalTimeSeconds: this.totalSurvivalTimeSeconds,
            killCount: this.enemyManager.totalKills,
            maxLevel: exp ? exp.level : 1,
            bossDefeated: this.enemyManager.bossesDefeated > 0,
            goldEarned: this.goldManager.runGoldCollected
        };

        this.time.delayedCall(1500, () => {
            this.scene.start('ResultScene', resultData);
        });
    }

    // ─── Boss Transition ─────────────────────────────────────────

    private startBossTransition() {
        this.isBossTransition = true;

        // Warning text
        this.warningText = this.add.text(
            this.cameras.main.midPoint.x,
            this.cameras.main.midPoint.y - 30,
            'Something dark approaches...',
            { fontSize: '16px', color: '#ff0000', fontStyle: 'bold' }
        ).setOrigin(0.5).setDepth(500);

        // Pulse the text
        this.tweens.add({
            targets: this.warningText,
            alpha: { from: 1, to: 0.3 },
            duration: 500,
            yoyo: true,
            repeat: 4
        });

        // After warning, transition
        this.time.delayedCall(3000, () => {
            this.enemyManager.despawnAll();
            this.projectileManager.despawnAll();

            if (this.warningText) {
                this.warningText.destroy();
                this.warningText = null;
            }

            this.cameras.main.fadeOut(1000, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.launchBossScene();
            });
        });
    }

    private launchBossScene() {
        const hp = this.player.getComponent<HealthComponent>('HealthComponent');
        const exp = this.player.getComponent<ExperienceComponent>('ExperienceComponent');

        const data = {
            playerStats: {
                speed: this.player.speed,
                maxHP: hp ? hp.maxHP : 100,
                currentHP: hp ? hp.currentHP : 100,
                level: exp ? exp.level : 1,
                currentExp: exp ? exp.currentExp : 0,
                expToNextLevel: exp ? exp.expToNextLevel : 10
            },
            combatStats: {
                baseDamage: this.combatManager.baseDamage,
                attackCooldown: this.combatManager.attackCooldown,
                critChance: this.combatManager.critChance,
                critDamageMult: this.combatManager.critDamageMult,
                knockbackForce: this.combatManager.knockbackForce,
                attackRange: this.combatManager.attackRange
            },
            magnetRadiusSq: this.expManager.magnetRadiusSq,
            bossesDefeated: this.enemyManager.bossesDefeated,
            totalKills: this.enemyManager.totalKills,
            totalSurvivalTimeSeconds: this.totalSurvivalTimeSeconds,
            runGoldCollected: this.goldManager.runGoldCollected,
            bossId: 'necromancer'
        };

        this.scene.pause();
        this.scene.sleep('UIScene');
        this.scene.launch('BossScene', data);
    }

    // ─── Return from Boss ────────────────────────────────────────

    private onBossReturn(data: {
        currentHP: number;
        maxHP: number;
        level: number;
        currentExp: number;
        expToNextLevel: number;
        bossesDefeated: number;
        totalKills: number;
        totalSurvivalTimeSeconds: number;
        combatStats: {
            baseDamage: number;
            attackCooldown: number;
            critChance: number;
            critDamageMult: number;
            knockbackForce: number;
            attackRange: number;
        };
        playerSpeed: number;
        magnetRadiusSq: number;
    }) {
        // Apply returned stats
        this.player.speed = data.playerSpeed;
        
        const hp = this.player.getComponent<HealthComponent>('HealthComponent');
        if (hp) {
            hp.maxHP = data.maxHP;
            hp.currentHP = data.currentHP;
        }
        
        const exp = this.player.getComponent<ExperienceComponent>('ExperienceComponent');
        if (exp) {
            exp.level = data.level;
            exp.currentExp = data.currentExp;
            exp.expToNextLevel = data.expToNextLevel;
        }

        this.combatManager.baseDamage = data.combatStats.baseDamage;
        this.combatManager.attackCooldown = data.combatStats.attackCooldown;
        this.combatManager.critChance = data.combatStats.critChance;
        this.combatManager.critDamageMult = data.combatStats.critDamageMult;
        this.combatManager.knockbackForce = data.combatStats.knockbackForce;
        this.combatManager.attackRange = data.combatStats.attackRange;
        this.expManager.magnetRadiusSq = data.magnetRadiusSq;
        this.enemyManager.bossesDefeated = data.bossesDefeated;
        this.enemyManager.totalKills = data.totalKills;
        this.totalSurvivalTimeSeconds = data.totalSurvivalTimeSeconds;

        this.bossTimer = 0;
        this.isBossTransition = false;

        this.cameras.main.fadeIn(1000, 0, 0, 0);
        this.scene.wake('UIScene');

        if (exp) {
            this.events.emit('exp-changed', exp.currentExp, exp.expToNextLevel, exp.level);
        }

        console.log('GameScene: Returned from boss. Bosses defeated:', data.bossesDefeated);
    }
}
