import Phaser from 'phaser';
import { Player } from '../entities/player/Player';
import { ExpOrb } from '../entities/items/ExpOrb';
import { ExperienceComponent } from '../components/ExperienceComponent';
import { AudioManager } from './AudioManager';
import { AudioKeys } from '../data/AudioData';

export class ExpManager {
    private scene: Phaser.Scene;
    private player: Player;
    private orbs: ExpOrb[] = [];
    
    // Config
    public pickupRadiusSq: number = 20 * 20; // 20 pixels radius to collect
    public magnetRadiusSq: number = 60 * 60; // 60 pixels radius to start flying to player
    private magnetSpeed: number = 150; // pixels per second

    constructor(scene: Phaser.Scene, player: Player) {
        this.scene = scene;
        this.player = player;
    }

    public spawnOrb(x: number, y: number, value: number = 2) {
        let orb = this.orbs.find(o => !o.isActive);
        
        if (!orb) {
            orb = new ExpOrb(this.scene, x, y);
            this.orbs.push(orb);
        }
        
        orb.spawn(x, y, value);
    }

    public update(_time: number, delta: number) {
        const px = this.player.sprite.x;
        const py = this.player.sprite.y;

        for (const orb of this.orbs) {
            if (!orb.isActive) continue;

            const distSq = Phaser.Math.Distance.Squared(orb.sprite.x, orb.sprite.y, px, py);

            // 1. Pickup Check
            if (distSq <= this.pickupRadiusSq) {
                this.collectOrb(orb);
                continue;
            }

            // 2. Magnet Check
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

    private collectOrb(orb: ExpOrb) {
        orb.despawn();
        AudioManager.getInstance(this.scene.game).playSFX(AudioKeys.EXP_PICKUP);
        
        const expComp = this.player.getComponent<ExperienceComponent>('ExperienceComponent');
        if (expComp) {
            expComp.addExp(orb.expValue);
        }
    }
}
