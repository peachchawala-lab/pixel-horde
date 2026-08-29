import Phaser from 'phaser';
import { Boss } from '../entities/bosses/Boss';
import { Necromancer } from '../entities/bosses/Necromancer';
import { Player } from '../entities/player/Player';
import { ProjectileManager } from './ProjectileManager';
import { EnemyManager } from './EnemyManager';
import { ExperienceComponent } from '../components/ExperienceComponent';

/**
 * Manages boss lifecycle: creation, spawning, update, death handling.
 * Designed to support multiple boss types via BossRegistry.
 */
export class BossManager {
    private scene: Phaser.Scene;
    private player: Player;
    private projectileManager: ProjectileManager;
    private enemyManager: EnemyManager;
    
    private currentBoss: Boss | null = null;
    public isBossActive: boolean = false;

    constructor(
        scene: Phaser.Scene,
        player: Player,
        projectileManager: ProjectileManager,
        enemyManager: EnemyManager
    ) {
        this.scene = scene;
        this.player = player;
        this.projectileManager = projectileManager;
        this.enemyManager = enemyManager;
    }

    /**
     * Spawn a boss by id. Currently only 'necromancer' is available.
     */
    public spawnBoss(bossId: string, x: number, y: number): Boss | null {
        if (this.isBossActive) return null;

        const playerLevel = this.getPlayerLevel();

        let boss: Boss;
        switch (bossId) {
            case 'necromancer':
                boss = new Necromancer(
                    this.scene, x, y,
                    this.projectileManager,
                    this.enemyManager,
                    playerLevel
                );
                break;
            default:
                console.warn(`BossManager: Unknown boss id "${bossId}"`);
                return null;
        }

        boss.spawn(x, y);
        boss.setTarget(this.player.sprite);
        this.currentBoss = boss;
        this.isBossActive = true;

        this.scene.events.emit('boss-spawned', boss);
        console.log(`BossManager: Spawned ${boss.definition.name}`);

        return boss;
    }

    public update(time: number, delta: number) {
        if (!this.currentBoss || !this.isBossActive) return;

        this.currentBoss.update(time, delta);

        // Check if boss died
        if (this.currentBoss.currentPhase === 'dead' || this.currentBoss.isDead() || this.currentBoss.getCurrentHP() <= 0) {
            this.handleBossDeath();
        }
    }

    private handleBossDeath() {
        if (!this.currentBoss) return;

        this.isBossActive = false;
        this.enemyManager.bossesDefeated++;

        this.scene.events.emit('boss-defeated', this.currentBoss);
        console.log(`BossManager: Boss defeated! Total: ${this.enemyManager.bossesDefeated}`);

        this.currentBoss.despawn();
        this.currentBoss = null;
    }

    public getCurrentBoss(): Boss | null {
        return this.currentBoss;
    }

    private getPlayerLevel(): number {
        const exp = this.player.getComponent<ExperienceComponent>('ExperienceComponent');
        return exp ? exp.level : 1;
    }
}
