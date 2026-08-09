import Phaser from 'phaser';
import { AudioRegistry } from '../data/AudioData';

export class AssetLoader {
    static generatePlaceholders(scene: Phaser.Scene) {
        const g = scene.add.graphics({ x: 0, y: 0 }).setVisible(false);
        
        for (let i = 0; i < 8; i++) {
            const x = i * 16;
            const bounce = (i >= 4 && i % 2 === 0) ? 1 : 0;
            
            g.fillStyle(0xf1c40f);
            g.fillRect(x + 4, 2 + bounce, 8, 8);
            
            g.fillStyle(0x3498db);
            g.fillRect(x + 4, 10 + bounce, 8, 6);
            
            g.fillStyle(0x000000);
            g.fillRect(x + 8, 4 + bounce, 2, 2);
        }
        
        g.generateTexture('player_warrior_tex', 128, 16);
        const tex = scene.textures.get('player_warrior_tex');
        const img = tex.getSourceImage() as HTMLImageElement;
        scene.textures.addSpriteSheet('player_warrior', img, { frameWidth: 16, frameHeight: 16 });
        
        g.clear();

        // Colors for enemies: Zombie (Green), Ghost (White/Gray), Bat (Brown/Black), Slime (Lime)
        const enemies = [
            { key: 'enemy_zombie', color: 0x2ecc71 },
            { key: 'enemy_ghost', color: 0xecf0f1 },
            { key: 'enemy_bat', color: 0x8e44ad },
            { key: 'enemy_slime', color: 0x1abc9c }
        ];

        enemies.forEach(enemy => {
            g.clear();
            for (let i = 0; i < 8; i++) {
                const x = i * 16;
                const bounce = (i >= 4 && i % 2 === 0) ? 1 : 0;
                
                g.fillStyle(enemy.color);
                g.fillRect(x + 4, 4 + bounce, 8, 10);
                
                g.fillStyle(0x000000);
                g.fillRect(x + 6, 6 + bounce, 2, 2);
            }
            g.generateTexture(`${enemy.key}_tex`, 128, 16);
            const eTex = scene.textures.get(`${enemy.key}_tex`);
            scene.textures.addSpriteSheet(enemy.key, eTex.getSourceImage() as HTMLImageElement, { frameWidth: 16, frameHeight: 16 });
        });

        // Combat Effects
        g.clear();
        
        // Slash effect (a simple white arc/crescent)
        g.lineStyle(4, 0xffffff, 1);
        g.beginPath();
        g.arc(16, 16, 12, Phaser.Math.DegToRad(-45), Phaser.Math.DegToRad(45), false);
        g.strokePath();
        g.generateTexture('effect_slash', 32, 32);

        // Simple white particle (2x2 square)
        g.clear();
        g.fillStyle(0xffffff, 1);
        g.fillRect(0, 0, 4, 4);
        g.generateTexture('effect_particle', 4, 4);

        // EXP Orb (small blue/cyan circle)
        g.clear();
        g.fillStyle(0x00ffff, 1);
        g.fillCircle(4, 4, 4);
        g.lineStyle(1, 0xffffff, 1);
        g.strokeCircle(4, 4, 4);
        g.generateTexture('exp_orb', 8, 8);

        // ---- Phase 7: Boss System Textures ----

        // Skeleton Archer enemy (bone white)
        g.clear();
        for (let i = 0; i < 8; i++) {
            const x = i * 16;
            const bounce = (i >= 4 && i % 2 === 0) ? 1 : 0;
            g.fillStyle(0xbdc3c7);
            g.fillRect(x + 4, 4 + bounce, 8, 10);
            g.fillStyle(0xecf0f1);
            g.fillRect(x + 5, 5 + bounce, 6, 4);
            g.fillStyle(0x000000);
            g.fillRect(x + 6, 6 + bounce, 2, 2);
            // Bow
            g.lineStyle(1, 0x8B4513);
            g.beginPath();
            g.arc(x + 12, 8 + bounce, 4, Phaser.Math.DegToRad(-60), Phaser.Math.DegToRad(60), false);
            g.strokePath();
        }
        g.generateTexture('enemy_skeleton_tex', 128, 16);
        const skelTex = scene.textures.get('enemy_skeleton_tex');
        scene.textures.addSpriteSheet('enemy_skeleton', skelTex.getSourceImage() as HTMLImageElement, { frameWidth: 16, frameHeight: 16 });

        // Boss Necromancer (32x32 dark purple robed figure)
        g.clear();
        for (let i = 0; i < 8; i++) {
            const x = i * 32;
            const bounce = (i >= 4 && i % 2 === 0) ? 1 : 0;
            // Robe body
            g.fillStyle(0x6c3483);
            g.fillRect(x + 8, 8 + bounce, 16, 20);
            // Hood
            g.fillStyle(0x4a235a);
            g.fillRect(x + 10, 4 + bounce, 12, 10);
            // Eyes
            g.fillStyle(0xe74c3c);
            g.fillRect(x + 12, 8 + bounce, 3, 2);
            g.fillRect(x + 18, 8 + bounce, 3, 2);
            // Staff
            g.fillStyle(0x7f8c8d);
            g.fillRect(x + 24, 4 + bounce, 2, 24);
            // Staff glow
            g.fillStyle(0x2ecc71);
            g.fillCircle(x + 25, 4 + bounce, 3);
        }
        g.generateTexture('boss_necromancer_tex', 256, 32);
        const bossTex = scene.textures.get('boss_necromancer_tex');
        scene.textures.addSpriteSheet('boss_necromancer', bossTex.getSourceImage() as HTMLImageElement, { frameWidth: 32, frameHeight: 32 });

        // Soul Bolt projectile (green glowing circle)
        g.clear();
        g.fillStyle(0x2ecc71, 1);
        g.fillCircle(4, 4, 4);
        g.lineStyle(1, 0x82e0aa, 1);
        g.strokeCircle(4, 4, 4);
        g.generateTexture('projectile_soul_bolt', 8, 8);

        // Arrow projectile (small brown rectangle)
        g.clear();
        g.fillStyle(0x8B4513, 1);
        g.fillRect(0, 2, 8, 2);
        g.fillStyle(0xcccccc, 1);
        g.fillTriangle(8, 0, 12, 3, 8, 6);
        g.generateTexture('projectile_arrow', 12, 6);

        // Poison Zone (green translucent circle)
        g.clear();
        g.fillStyle(0x27ae60, 0.4);
        g.fillCircle(20, 20, 20);
        g.lineStyle(2, 0x2ecc71, 0.6);
        g.strokeCircle(20, 20, 20);
        g.generateTexture('effect_poison_zone', 40, 40);

        // Gold Coin (shiny yellow circle)
        g.clear();
        g.fillStyle(0xf1c40f, 1);
        g.fillCircle(5, 5, 5);
        g.lineStyle(1, 0xf39c12, 1);
        g.strokeCircle(5, 5, 5);
        g.fillStyle(0xffffff, 0.8);
        g.fillCircle(3, 3, 1.5);
        g.generateTexture('gold_coin', 10, 10);

        g.destroy();
    }

    static loadAssets(scene: Phaser.Scene) {
        this.generatePlaceholders(scene);

        // Load Audio Assets safely from AudioRegistry
        AudioRegistry.forEach(asset => {
            scene.load.audio(asset.key, asset.path);
        });

        console.log('AssetLoader: Assets & Audio loaded for scene', scene.scene.key);
    }
}
