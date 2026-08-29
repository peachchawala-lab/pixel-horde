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
import { ActiveSkillManager, ActiveSkillSaveState } from '../managers/ActiveSkillManager';
import { ActiveSkillHUD } from '../ui/ActiveSkillHUD';
import { HealthComponent } from '../components/HealthComponent';
import { ExperienceComponent } from '../components/ExperienceComponent';
import { AudioManager } from '../managers/AudioManager';
import { AudioKeys } from '../data/AudioData';
import { AmbientEffectsManager } from '../managers/AmbientEffectsManager';

export class GameScene extends BaseScene {
    public player!: Player;
    private inputManager!: InputManager;
    public enemyManager!: EnemyManager;
    public combatManager!: CombatManager;
    public expManager!: ExpManager;
    public skillManager!: SkillManager;
    public projectileManager!: ProjectileManager;
    public goldManager!: GoldManager;
    public activeSkillManager!: ActiveSkillManager;
    private activeSkillHUD!: ActiveSkillHUD;

    // Boss trigger & Run Stats
    private bossTimer: number = 0;
    private readonly BOSS_TRIGGER_TIME: number = 120000; // 2 minutes
    private isBossTransition: boolean = false;
    private warningText: Phaser.GameObjects.Text | null = null;
    public totalSurvivalTimeSeconds: number = 0;

    private ambientEffects!: AmbientEffectsManager;

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

        // Dark Fantasy Graveyard Background (Tiled)
        const bg = this.add.tileSprite(0, 0, 1600, 1200, 'bg_graveyard').setOrigin(0, 0);
        bg.setAlpha(0.65); // Dim slightly for character contrast
        bg.setTint(0x8e44ad); // Deep purple tint for atmosphere

        // Ambient Fog & Particles
        this.ambientEffects = new AmbientEffectsManager(this);
        this.ambientEffects.setIntensity('normal');

        // Scatter Graveyard Environment Props
        for (let i = 0; i < 30; i++) {
            const tx = Phaser.Math.Between(100, 1500);
            const ty = Phaser.Math.Between(100, 1100);
            const propKey = i % 3 === 0 ? 'dead_tree' : (i % 2 === 0 ? 'tombstone' : 'candle_brazier');
            const prop = this.add.image(tx, ty, propKey);
            prop.setDepth(propKey === 'dead_tree' ? 15 : 2);
            prop.setAlpha(0.85);
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

        // Connect ProjectileManager to enemy/boss collision
        this.projectileManager.setEnemyManager(this.enemyManager);

        // ── Active Skill System ──
        this.activeSkillManager = new ActiveSkillManager(
            this, this.player, this.enemyManager, null,
            this.projectileManager, this.combatManager
        );
        this.activeSkillManager.resetForNewRun();
        this.activeSkillHUD = new ActiveSkillHUD(this, this.activeSkillManager);

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

        // Setup Level Up & Boss Return Listeners (Clean old listeners first)
        this.events.off('level-up');
        this.events.off('boss-return');

        this.events.on('level-up', (_level: number) => {
            this.scene.pause();
            this.scene.launch('LevelUpScene');
        });

        this.events.on('boss-return', (data: any) => {
            this.onBossReturn(data);
        });

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.events.off('level-up');
            this.events.off('boss-return');
            if (this.inputManager) {
                this.inputManager.destroy();
            }
            if (this.activeSkillHUD) {
                this.activeSkillHUD.destroy();
            }
        });

        console.log('GameScene: Initialized Systems');
    }

    update(_time: number, delta: number) {
        if (this.isBossTransition) return;

        this.ambientEffects.update(_time, delta);

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

        // ── Active Skills ──
        this.activeSkillManager.update(_time, delta);
        this.activeSkillHUD.update();

        // Check ability input
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

        // Boss trigger timer & Debug Shortcut ('B' to trigger boss)
        const bKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.B);
        if (bKey && Phaser.Input.Keyboard.JustDown(bKey) && !this.isBossTransition) {
            this.startBossTransition();
        }

        this.bossTimer += delta;
        if (this.bossTimer >= this.BOSS_TRIGGER_TIME) {
            this.bossTimer = 0;
            this.startBossTransition();
        }
    }

    private onPlayerDied() {
        this.player.sprite.setVelocity(0, 0);
        this.player.playDeathAnimation();
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
            bossId: 'necromancer',
            activeSkillState: this.activeSkillManager.serialize()
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
        activeSkillState?: ActiveSkillSaveState;
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

        // Restore active skill charges from boss scene
        if (data.activeSkillState) {
            this.activeSkillManager.deserialize(data.activeSkillState);
        }

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
