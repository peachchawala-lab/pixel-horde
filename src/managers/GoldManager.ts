import Phaser from 'phaser';
import { Player } from '../entities/player/Player';
import { GoldOrb } from '../entities/items/GoldOrb';
import { AudioManager } from './AudioManager';
import { AudioKeys } from '../data/AudioData';

export class GoldManager {
    private scene: Phaser.Scene;
    private player: Player;
    private orbs: GoldOrb[] = [];

    public pickupRadiusSq: number = 22 * 22;
    public magnetRadiusSq: number = 70 * 70;
    private magnetSpeed: number = 180;

    public runGoldCollected: number = 0;

    constructor(scene: Phaser.Scene, player: Player) {
        this.scene = scene;
        this.player = player;
    }

    public spawnGold(x: number, y: number, value: number = 1) {
        let orb = this.orbs.find(o => !o.isActive);
        if (!orb) {
            orb = new GoldOrb(this.scene, x, y);
            this.orbs.push(orb);
        }
        orb.spawn(x, y, value);
    }

    /**
     * Helper to roll enemy loot drop (25% chance for regular enemy).
     */
    public tryEnemyDrop(x: number, y: number, isBoss: boolean = false) {
        if (isBoss) {
            // Boss drops 10 gold stacks totaling ~200 Gold
            for (let i = 0; i < 10; i++) {
                const ox = x + (Math.random() * 60 - 30);
                const oy = y + (Math.random() * 60 - 30);
                this.spawnGold(ox, oy, 20);
            }
        } else if (Math.random() < 0.25) {
            const amount = Math.floor(Math.random() * 3) + 1;
            this.spawnGold(x, y, amount);
        }
    }

    public update(_time: number, delta: number) {
        const px = this.player.sprite.x;
        const py = this.player.sprite.y;

        for (const orb of this.orbs) {
            if (!orb.isActive) continue;

            const distSq = Phaser.Math.Distance.Squared(orb.sprite.x, orb.sprite.y, px, py);

            if (distSq <= this.pickupRadiusSq) {
                this.collectOrb(orb);
                continue;
            }

            if (distSq <= this.magnetRadiusSq) {
                if (!orb.isMagnetic) {
                    orb.isMagnetic = true;
                    this.scene.tweens.killTweensOf(orb.sprite);
                }
                const angle = Phaser.Math.Angle.Between(orb.sprite.x, orb.sprite.y, px, py);
                const step = this.magnetSpeed * (delta / 1000);
                orb.sprite.x += Math.cos(angle) * step;
                orb.sprite.y += Math.sin(angle) * step;
            }
        }
    }

    private collectOrb(orb: GoldOrb) {
        orb.despawn();
        this.runGoldCollected += orb.goldValue;

        AudioManager.getInstance(this.scene.game).playSFX(AudioKeys.EXP_PICKUP, { volume: 0.4, rate: 1.4 });

        this.scene.events.emit('gold-changed', this.runGoldCollected);
    }

    public despawnAll() {
        for (const orb of this.orbs) {
            if (orb.isActive) {
                orb.despawn();
            }
        }
    }
}
