import Phaser from 'phaser';
import { Player } from '../entities/player/Player';
import { Enemy } from '../entities/enemies/Enemy';
import { Zombie } from '../entities/enemies/Zombie';
import { Ghost } from '../entities/enemies/Ghost';
import { Bat } from '../entities/enemies/Bat';
import { Slime } from '../entities/enemies/Slime';
import { SkeletonArcher } from '../entities/enemies/SkeletonArcher';
import { ProjectileManager } from './ProjectileManager';

export class EnemyManager {
    private scene: Phaser.Scene;
    private player: Player;
    private enemies: Enemy[] = [];
    private projectileManager: ProjectileManager;
    
    private spawnTimer: number = 0;
    private currentSpawnDelay: number = 2000;
    private minSpawnDelay: number = 500;
    private timeElapsed: number = 0;
    public bossesDefeated: number = 0;
    public totalKills: number = 0;
    public spawnEnabled: boolean = true;
    
    constructor(scene: Phaser.Scene, player: Player, projectileManager: ProjectileManager) {
        this.scene = scene;
        this.player = player;
        this.projectileManager = projectileManager;
    }
    
    public getActiveEnemies(): Enemy[] {
        return this.enemies.filter(e => e.isActive);
    }

    public despawnAll() {
        for (const enemy of this.enemies) {
            if (enemy.isActive) {
                enemy.despawn();
            }
        }
    }

    /** Spawn a random enemy at a specific position (used by boss summoning) */
    public spawnEnemyAt(x: number, y: number) {
        const EnemyTypes: (typeof Zombie | typeof Ghost | typeof Bat | typeof Slime)[] = 
            [Zombie, Ghost, Bat, Slime];
        const RandomEnemyClass = Phaser.Utils.Array.GetRandom(EnemyTypes);

        let enemyToSpawn = this.enemies.find(e => !e.isActive && e instanceof RandomEnemyClass);

        if (!enemyToSpawn) {
            enemyToSpawn = new RandomEnemyClass(this.scene, x, y);
            this.enemies.push(enemyToSpawn);
        }

        enemyToSpawn.spawn(x, y);
    }
    
    public update(time: number, delta: number) {
        this.timeElapsed += delta;
        
        if (this.currentSpawnDelay > this.minSpawnDelay) {
            this.currentSpawnDelay -= (10 * (delta / 1000));
        }
        
        // Only auto-spawn when spawning is enabled
        if (this.spawnEnabled) {
            this.spawnTimer += delta;
            if (this.spawnTimer >= this.currentSpawnDelay) {
                this.spawnTimer = 0;
                this.spawnEnemy();
            }
        }
        
        for (const enemy of this.enemies) {
            if (enemy.isActive) {
                enemy.update(time, delta, this.player.sprite);
            }
        }
    }
    
    private spawnEnemy() {
        const spawnPos = this.getRandomSpawnPosition();
        if (!spawnPos) return;
        
        // Build enemy type pool — include SkeletonArcher after first boss kill
        const EnemyTypes: (typeof Zombie | typeof Ghost | typeof Bat | typeof Slime | typeof SkeletonArcher)[] = 
            [Zombie, Ghost, Bat, Slime];

        if (this.bossesDefeated >= 1) {
            EnemyTypes.push(SkeletonArcher);
        }

        const RandomEnemyClass = Phaser.Utils.Array.GetRandom(EnemyTypes);
        
        let enemyToSpawn = this.enemies.find(e => !e.isActive && e instanceof RandomEnemyClass);
        
        if (!enemyToSpawn) {
            enemyToSpawn = new RandomEnemyClass(this.scene, spawnPos.x, spawnPos.y);
            // Inject ProjectileManager into SkeletonArcher instances
            if (enemyToSpawn instanceof SkeletonArcher) {
                enemyToSpawn.setProjectileManager(this.projectileManager);
            }
            this.enemies.push(enemyToSpawn);
        }
        
        enemyToSpawn.spawn(spawnPos.x, spawnPos.y);
    }
    
    private getRandomSpawnPosition(): Phaser.Math.Vector2 | null {
        const cam = this.scene.cameras.main;
        const worldView = cam.worldView;
        const margin = 50;
        
        const outerBounds = {
            left: worldView.left - margin,
            right: worldView.right + margin,
            top: worldView.top - margin,
            bottom: worldView.bottom + margin
        };
        
        let x = 0;
        let y = 0;
        
        const edge = Phaser.Math.Between(0, 3);
        if (edge === 0) {
            x = Phaser.Math.Between(outerBounds.left, outerBounds.right);
            y = outerBounds.top;
        } else if (edge === 1) {
            x = Phaser.Math.Between(outerBounds.left, outerBounds.right);
            y = outerBounds.bottom;
        } else if (edge === 2) {
            x = outerBounds.left;
            y = Phaser.Math.Between(outerBounds.top, outerBounds.bottom);
        } else {
            x = outerBounds.right;
            y = Phaser.Math.Between(outerBounds.top, outerBounds.bottom);
        }
        
        const bounds = this.scene.physics.world.bounds;
        x = Phaser.Math.Clamp(x, bounds.x, bounds.right);
        y = Phaser.Math.Clamp(y, bounds.y, bounds.bottom);
        
        if (worldView.contains(x, y)) {
            return null;
        }
        
        return new Phaser.Math.Vector2(x, y);
    }
}

