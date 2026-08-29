import Phaser from 'phaser';
import { AudioRegistry } from '../data/AudioData';
import { ActiveSkillIcons } from './ActiveSkillIcons';

/**
 * AssetLoader — Master procedural pixel art generator for Pixel Horde.
 * Generates high-detail 32x32 character spritesheets, 64x64 Necromancer boss,
 * environmental graveyard props, combat VFX, drop shadows, and active skill icons.
 */
export class AssetLoader {
    static generatePlaceholders(scene: Phaser.Scene) {
        // Generate Active Ability Icons & Gem Pips
        ActiveSkillIcons.generateIcons(scene);

        const g = scene.add.graphics({ x: 0, y: 0 }).setVisible(false);

        // โ”€โ”€ 1. Drop Shadow Texture (24x12) โ”€โ”€
        g.clear();
        g.fillStyle(0x000000, 0.45);
        g.fillEllipse(12, 6, 11, 5);
        g.generateTexture('drop_shadow', 24, 12);

        // โ”€โ”€ 2. Player Warrior (32x32 frame, 16 frames: 512x32 sheet) โ”€โ”€
        g.clear();
        for (let i = 0; i < 16; i++) {
            const x = i * 32;
            const isIdle = i < 4;
            const isWalk = i >= 4 && i < 8;
            const isAttack = i >= 8 && i < 12;
            const isDeath = i >= 12;
            
            const walkFrame = isWalk ? i - 4 : -1;
            const atkFrame = isAttack ? i - 8 : -1;
            const deathFrame = isDeath ? i - 12 : -1;

            let breathY = 0;
            let legOffset = 0;
            let capeSway = 0;
            let bodyX = 0;
            let swordRot = 15;
            let swordX = 0;
            let swordY = 0;
            let isImpactFrame = false;

            if (isIdle) {
                breathY = [0, -1, -1, 0][i];
                capeSway = [0, -1, -2, -1][i];
                swordRot = 15;
                swordX = 0;
                swordY = breathY;
            } else if (isWalk) {
                breathY = [0, 1, 0, 1][walkFrame];
                legOffset = [2, 0, -2, 0][walkFrame];
                capeSway = [-2, -3, 2, 3][walkFrame];
                swordX = [1, 2, 0, -1][walkFrame];
                swordY = breathY;
                swordRot = [10, 22, 15, 5][walkFrame];
            } else if (isAttack) {
                if (atkFrame === 0) { // Anticipation: crouch & pull back over shoulder
                    breathY = 1;
                    bodyX = -2;
                    legOffset = -1;
                    capeSway = -4;
                    swordRot = -65;
                    swordX = -6;
                    swordY = -4;
                } else if (atkFrame === 1) { // Swing: rotate forward & sweep down
                    breathY = -1;
                    bodyX = 3;
                    legOffset = 2;
                    capeSway = 4;
                    swordRot = 35;
                    swordX = 4;
                    swordY = 2;
                } else if (atkFrame === 2) { // Impact: full extension & flash
                    breathY = 1;
                    bodyX = 5;
                    legOffset = 3;
                    capeSway = 6;
                    swordRot = 85;
                    swordX = 8;
                    swordY = 6;
                    isImpactFrame = true;
                } else if (atkFrame === 3) { // Recovery: returning stance
                    breathY = 0;
                    bodyX = 2;
                    legOffset = 1;
                    capeSway = 2;
                    swordRot = 25;
                    swordX = 3;
                    swordY = 2;
                }
            } else if (isDeath) {
                if (deathFrame === 0) { // Stagger
                    breathY = -2;
                    bodyX = -3;
                    legOffset = -1;
                    capeSway = -5;
                    swordRot = -110;
                    swordX = -8;
                    swordY = 10;
                } else if (deathFrame === 1) { // Knee Drop
                    breathY = 4;
                    bodyX = -2;
                    capeSway = -3;
                    swordRot = -140;
                    swordX = -10;
                    swordY = 14;
                } else if (deathFrame === 2) { // Collapse
                    breathY = 8;
                    bodyX = 1;
                    capeSway = 2;
                    swordRot = -170;
                    swordX = -6;
                    swordY = 16;
                } else if (deathFrame === 3) { // Fallen
                    breathY = 10;
                    bodyX = 3;
                    capeSway = 4;
                    swordRot = -180;
                    swordX = -2;
                    swordY = 18;
                }
            }

            const bx = x + 16 + bodyX;
            const by = 16 + breathY;

            // โ”€โ”€ A. Deep Burgundy Flowing Cape (Back Layer) โ”€โ”€
            if (!isDeath || deathFrame < 2) {
                g.fillStyle(0x3b0b12); // Cape shadow
                g.fillTriangle(bx - 6, by - 4, bx - 11 + capeSway, by + 15, bx + 2, by + 13);
                g.fillStyle(0x7b1113); // Cape midtone
                g.fillTriangle(bx - 4, by - 5, bx - 9 + capeSway, by + 14, bx + 4, by + 12);
                g.fillStyle(0xb01c2e); // Crimson cloth
                g.fillTriangle(bx - 2, by - 5, bx - 7 + capeSway, by + 12, bx + 6, by + 10);
                g.fillStyle(0xe63946); // Highlight fold
                g.fillRect(bx - 3, by - 3, 2, 8);
            } else {
                // Collapsed cape draped on floor
                g.fillStyle(0x3b0b12);
                g.fillEllipse(bx - 2, by + 10, 16, 6);
                g.fillStyle(0x7b1113);
                g.fillEllipse(bx - 2, by + 9, 14, 4);
                g.fillStyle(0xb01c2e);
                g.fillRect(bx - 6, by + 8, 10, 3);
            }

            // โ”€โ”€ B. Dark Steel Leg Armor & Boots โ”€โ”€
            g.fillStyle(0x141c24); // Inner thigh shadow
            g.fillRect(bx - 4 + legOffset, by + 6, 3, 8);
            g.fillRect(bx + 1 - legOffset, by + 6, 3, 8);

            g.fillStyle(0x2c3e50); // Steel Cuisses & Greaves
            g.fillRoundedRect(bx - 6 + legOffset, by + 7, 5, 8, 1);
            g.fillRoundedRect(bx + 1 - legOffset, by + 7, 5, 8, 1);

            g.fillStyle(0x7f8c8d); // Greave highlights
            g.fillRect(bx - 5 + legOffset, by + 8, 2, 6);
            g.fillRect(bx + 2 - legOffset, by + 8, 2, 6);

            g.fillStyle(0xbdc3c7); // Steel Boot rims
            g.fillRect(bx - 6 + legOffset, by + 13, 6, 2);
            g.fillRect(bx + 1 - legOffset, by + 13, 6, 2);

            // โ”€โ”€ C. Torso & Articulated Breastplate โ”€โ”€
            g.fillStyle(0x1c2833); // Under-armor mail shadow
            g.fillRoundedRect(bx - 7, by - 5, 14, 13, 3);

            g.fillStyle(0x2c3e50); // Main Cuirass (Dark Steel)
            g.fillRoundedRect(bx - 6, by - 4, 12, 11, 2);

            g.fillStyle(0x34495e); // Beveled chest plate
            g.fillRoundedRect(bx - 5, by - 3, 10, 6, 2);

            g.fillStyle(0x7f8c8d); // Specular chest highlight
            g.fillRect(bx - 3, by - 2, 4, 4);
            g.fillStyle(0xbdc3c7);
            g.fillRect(bx - 2, by - 2, 2, 2);

            // Abdominal Plating & Leather Belt with Gold Buckle
            g.fillStyle(0x1f2c38);
            g.fillRect(bx - 5, by + 3, 10, 2);
            g.fillStyle(0x4a2e1b); // Belt strap
            g.fillRect(bx - 6, by + 5, 12, 2);
            g.fillStyle(0xd4ac0d); // Brass buckle
            g.fillRect(bx - 2, by + 4, 4, 3);
            g.fillStyle(0xf1c40f);
            g.fillRect(bx - 1, by + 5, 2, 1);

            // โ”€โ”€ D. Layered Pauldrons (Shoulders) & Gauntlets โ”€โ”€
            g.fillStyle(0x141c24); // Pauldron base shadow
            g.fillCircle(bx - 7, by - 3, 4);
            g.fillCircle(bx + 7, by - 3, 4);

            g.fillStyle(0x2c3e50); // Steel Pauldrons
            g.fillCircle(bx - 7, by - 4, 3);
            g.fillCircle(bx + 7, by - 4, 3);

            g.fillStyle(0xd4ac0d); // Gold trim
            g.fillRect(bx - 9, by - 3, 3, 1);
            g.fillRect(bx + 6, by - 3, 3, 1);
            g.fillStyle(0x7f8c8d);
            g.fillCircle(bx - 7, by - 4, 1);
            g.fillCircle(bx + 7, by - 4, 1);

            // โ”€โ”€ E. Full Knight Helmet (T-Visor & Cyan Eyes) โ”€โ”€
            if (!isDeath || deathFrame < 3) {
                g.fillStyle(0x1c2833); // Helmet cowl
                g.fillRoundedRect(bx - 6, by - 14, 12, 11, 4);

                g.fillStyle(0x2c3e50); // Helmet steel base
                g.fillRoundedRect(bx - 5, by - 13, 10, 9, 3);

                g.fillStyle(0x7f8c8d); // Helmet crown crest
                g.fillRoundedRect(bx - 4, by - 13, 8, 3, 1);
                g.fillStyle(0xbdc3c7);
                g.fillRect(bx - 2, by - 13, 4, 2);

                // T-Visor Slot
                g.fillStyle(0x0a0a10);
                g.fillRect(bx - 4, by - 9, 8, 3);
                g.fillRect(bx - 1, by - 10, 2, 5);

                // Piercing Cyan Eye Glow
                if (!isDeath) {
                    g.fillStyle(0x00f5d4);
                    g.fillRect(bx, by - 9, 3, 2);
                    g.fillStyle(0xffffff);
                    g.fillRect(bx + 1, by - 9, 1, 1);
                } else {
                    // Dim/fading eye slot on death
                    g.fillStyle(0x005544);
                    g.fillRect(bx, by - 9, 2, 1);
                }
            }

            // โ”€โ”€ F. Forged Fantasy Longsword โ”€โ”€
            const cx = bx + 9 + swordX;
            const cy = by + 2 + swordY;
            const rad = Phaser.Math.DegToRad(swordRot);
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);

            const rotatePoint = (px: number, py: number) => {
                const rx = px - (bx + 9);
                const ry = py - (by + 2);
                return {
                    x: cx + (rx * cos - ry * sin),
                    y: cy + (rx * sin + ry * cos)
                };
            };

            const drawPoly = (points: { x: number; y: number }[], fill: number) => {
                g.fillStyle(fill);
                g.beginPath();
                const p0 = rotatePoint(points[0].x, points[0].y);
                g.moveTo(p0.x, p0.y);
                for (let k = 1; k < points.length; k++) {
                    const rp = rotatePoint(points[k].x, points[k].y);
                    g.lineTo(rp.x, rp.y);
                }
                g.closePath();
                g.fillPath();
            };

            // Leather Hilt Grip
            drawPoly([
                { x: bx + 8, y: by + 2 }, { x: bx + 10, y: by + 2 },
                { x: bx + 10, y: by + 8 }, { x: bx + 8, y: by + 8 }
            ], 0x4a2e1b);

            // Octagonal Gold Pommel
            drawPoly([
                { x: bx + 7, y: by + 8 }, { x: bx + 11, y: by + 8 },
                { x: bx + 11, y: by + 11 }, { x: bx + 7, y: by + 11 }
            ], 0xf1c40f);

            // Sculpted Gold Crossguard
            drawPoly([
                { x: bx + 4, y: by + 0 }, { x: bx + 14, y: by + 0 },
                { x: bx + 14, y: by + 3 }, { x: bx + 4, y: by + 3 }
            ], 0xd4ac0d);

            // Tapered Dark Steel Blade (Core & Shadow)
            drawPoly([
                { x: bx + 7, y: by + 0 }, { x: bx + 11, y: by + 0 },
                { x: bx + 9, y: by - 18 }
            ], 0x2c3e50);

            // Main Blade Bevel
            drawPoly([
                { x: bx + 8, y: by + 0 }, { x: bx + 11, y: by + 0 },
                { x: bx + 9, y: by - 18 }
            ], 0x7f8c8d);

            // Central Fuller Groove
            drawPoly([
                { x: bx + 9, y: by + 0 }, { x: bx + 10, y: by + 0 },
                { x: bx + 9, y: by - 14 }
            ], 0x1a252f);

            // Razor-Sharp Silver Edge Highlight
            drawPoly([
                { x: bx + 10, y: by + 0 }, { x: bx + 11, y: by + 0 },
                { x: bx + 9, y: by - 18 }
            ], isImpactFrame ? 0xffffff : 0xecf0f1);
        }
        g.generateTexture('player_warrior_tex', 512, 32);
        const playerTex = scene.textures.get('player_warrior_tex');
        scene.textures.addSpriteSheet('player_warrior', playerTex.getSourceImage() as HTMLImageElement, { frameWidth: 32, frameHeight: 32 });

        // โ”€โ”€ 3. Enemy: Zombie (32x32 frame, 16 frames: 512x32 sheet) โ”€โ”€
        g.clear();
        for (let i = 0; i < 16; i++) {
            const x = i * 32;
            const isIdle = i < 4;
            const isWalk = i >= 4 && i < 8;
            const isAttack = i >= 8 && i < 12;
            const isDeath = i >= 12;

            const walkFrame = isWalk ? i - 4 : 0;
            const atkFrame = isAttack ? i - 8 : 0;
            const deathFrame = isDeath ? i - 12 : 0;

            const breathY = isIdle ? (i % 2 === 1 ? -1 : 0) : 0;
            const legOff = isWalk ? (walkFrame % 2 === 0 ? 2 : -2) : (isAttack ? 1 : 0);
            const armOut = isWalk ? (walkFrame % 2 === 0 ? 2 : 0) : (isAttack ? [ -2, 2, 6, 2 ][atkFrame] : 0);

            let bodyY = breathY;
            let bodyX = 0;
            if (isDeath) {
                bodyY = [ 2, 6, 12, 16 ][deathFrame];
                bodyX = [ -2, -1, 2, 4 ][deathFrame];
            }

            const bx = x + 16 + bodyX;
            const by = 16 + bodyY;

            // Decaying Body & Torn Clothing
            g.fillStyle(0x1c2833); // Pants shadow
            g.fillRect(bx - 6 + legOff, by + 4, 4, 10);
            g.fillRect(bx + 2 - legOff, by + 4, 4, 10);
            g.fillStyle(0x34495e); // Torn grey-blue pants
            g.fillRect(bx - 5 + legOff, by + 5, 3, 8);
            g.fillRect(bx + 3 - legOff, by + 5, 3, 8);

            // Torso & Exposed Rotting Flesh
            g.fillStyle(0x145a32); // Deep rot shadow
            g.fillRoundedRect(bx - 8, by - 5, 16, 11, 3);
            g.fillStyle(0x1e8449); // Decaying green skin
            g.fillRoundedRect(bx - 7, by - 4, 14, 9, 2);

            // Torn Purple Shirt
            g.fillStyle(0x4a235a);
            g.fillRect(bx - 7, by - 4, 14, 4);
            g.fillRect(bx - 5, by, 3, 4);

            // Exposed Gore Ribs
            g.fillStyle(0x0a0a0a);
            g.fillRect(bx - 4, by - 1, 6, 5);
            g.fillStyle(0xecf0f1); // Bone ribs
            g.fillRect(bx - 4, by, 5, 1);
            g.fillRect(bx - 4, by + 2, 5, 1);
            g.fillStyle(0x900c3f); // Blood accent
            g.fillRect(bx + 1, by + 1, 2, 3);

            // Zombie Head
            if (!isDeath || deathFrame < 3) {
                g.fillStyle(0x145a32); // Skull shadow
                g.fillRoundedRect(bx - 6, by - 14, 12, 10, 4);
                g.fillStyle(0x229954); // Green skin
                g.fillRoundedRect(bx - 5, by - 13, 10, 8, 3);
                g.fillStyle(0x581845); // Brain exposed
                g.fillCircle(bx - 2, by - 12, 2);

                // Face & Glowing Crimson Eye
                g.fillStyle(0x0a0a0a);
                g.fillRect(bx, by - 10, 4, 3); // Eye socket
                g.fillRect(bx - 4, by - 10, 2, 2); // Missing eye
                g.fillStyle(0xff0000);
                g.fillRect(bx + 1, by - 9, 2, 2);
                g.fillStyle(0xffffff);
                g.fillRect(bx + 2, by - 9, 1, 1);
            }

            // Outstretched Rotting Claws
            if (!isDeath || deathFrame < 2) {
                g.fillStyle(0x145a32);
                g.fillRect(bx + 2, by - 2 + armOut, 10, 4);
                g.fillStyle(0x27ae60);
                g.fillRect(bx + 3, by - 1 + armOut, 8, 2);
                g.fillStyle(0x900c3f); // Blood claws
                g.fillRect(bx + 11, by - 1 + armOut, 3, 2);
            }
        }
        g.generateTexture('enemy_zombie_tex', 512, 32);
        scene.textures.addSpriteSheet('enemy_zombie', scene.textures.get('enemy_zombie_tex').getSourceImage() as HTMLImageElement, { frameWidth: 32, frameHeight: 32 });

        // โ”€โ”€ 4. Enemy: Ghost (32x32 frame, 16 frames: 512x32 sheet) โ”€โ”€
        g.clear();
        for (let i = 0; i < 16; i++) {
            const x = i * 32;
            const isIdle = i < 4;
            const isWalk = i >= 4 && i < 8;
            const isAttack = i >= 8 && i < 12;
            const isDeath = i >= 12;

            const idleFrame = isIdle ? i : 0;
            const walkFrame = isWalk ? i - 4 : 0;
            const atkFrame = isAttack ? i - 8 : 0;
            const deathFrame = isDeath ? i - 12 : 0;

            let floatY = (idleFrame % 4 < 2) ? 0 : -3;
            let bodyX = 0;
            let lungeX = 0;

            if (isWalk) {
                floatY = (walkFrame % 2 === 0) ? -1 : -3;
                bodyX = 1;
            } else if (isAttack) {
                lungeX = [ -2, 2, 6, 3 ][atkFrame];
                floatY = -2;
            } else if (isDeath) {
                floatY = [ 2, 6, 12, 18 ][deathFrame];
            }

            const bx = x + 16 + bodyX + lungeX;
            const by = 16 + floatY;

            // Spectral Tail / Wisp
            if (!isDeath || deathFrame < 3) {
                g.fillStyle(0x34193d, 0.5); // Dark purple shadow core
                g.fillTriangle(bx, by - 2, bx - 8, by + 14, bx + 8, by + 14);
                g.fillStyle(0x8e44ad, 0.65); // Main ethereal tail
                g.fillTriangle(bx, by - 2, bx - 6, by + 12, bx + 6, by + 12);
                g.fillStyle(0xd2b4de, 0.8); // Tail highlight
                g.fillTriangle(bx, by - 2, bx - 4, by + 8, bx + 4, by + 8);
            }

            // Phantom Hood & Cloak
            if (!isDeath || deathFrame < 2) {
                g.fillStyle(0x4a235a, 0.85); // Back hood shadow
                g.fillRoundedRect(bx - 10, by - 14, 20, 18, 7);
                g.fillStyle(0x7d3c98, 0.9); // Main cloak
                g.fillRoundedRect(bx - 9, by - 13, 18, 16, 6);
                g.fillStyle(0xbb8fce, 0.95); // Cloak highlight
                g.fillRoundedRect(bx - 7, by - 12, 14, 8, 3);

                // Dark Hollow Eye Sockets & Piercing Magenta Glow
                g.fillStyle(0x0a0a0a);
                g.fillCircle(bx - 4, by - 6, 3);
                g.fillCircle(bx + 4, by - 6, 3);
                g.fillStyle(0xff00ff);
                g.fillCircle(bx - 4, by - 6, 1);
                g.fillCircle(bx + 4, by - 6, 1);
                g.fillStyle(0xffffff);
                g.fillRect(bx - 4, by - 6, 1, 1);
                g.fillRect(bx + 4, by - 6, 1, 1);
            }
        }
        g.generateTexture('enemy_ghost_tex', 512, 32);
        scene.textures.addSpriteSheet('enemy_ghost', scene.textures.get('enemy_ghost_tex').getSourceImage() as HTMLImageElement, { frameWidth: 32, frameHeight: 32 });

        // โ”€โ”€ 5. Enemy: Bat (32x32 frame, 16 frames: 512x32 sheet) โ”€โ”€
        g.clear();
        for (let i = 0; i < 16; i++) {
            const x = i * 32;
            const isIdle = i < 4;
            const isWalk = i >= 4 && i < 8;
            const isAttack = i >= 8 && i < 12;
            const isDeath = i >= 12;

            const walkFrame = isWalk ? i - 4 : 0;
            const atkFrame = isAttack ? i - 8 : 0;
            const deathFrame = isDeath ? i - 12 : 0;

            const wingState = isIdle ? (i % 2 === 0) : (isWalk ? (walkFrame % 2 === 0) : (isAttack ? (atkFrame < 2) : false));

            let batY = 0;
            let batX = 0;
            if (isWalk) batY = (walkFrame % 2 === 0) ? -2 : 0;
            if (isAttack) { batX = [ -2, 2, 6, 2 ][atkFrame]; batY = [ -2, 0, 4, 1 ][atkFrame]; }
            if (isDeath) { batY = [ 2, 8, 14, 20 ][deathFrame]; batX = [ -2, -4, -6, -8 ][deathFrame]; }

            const bx = x + 16 + batX;
            const by = 16 + batY;

            // Bat Fur Body & Head
            if (!isDeath || deathFrame < 3) {
                g.fillStyle(0x111111); // Dark core shadow
                g.fillRoundedRect(bx - 5, by - 4, 10, 12, 4);
                g.fillStyle(0x34193d); // Burgundy/purple fur
                g.fillRoundedRect(bx - 4, by - 3, 8, 10, 3);

                // Ears & Red Inner Detail
                g.fillStyle(0x111111);
                g.fillTriangle(bx - 5, by - 4, bx - 8, by - 12, bx - 2, by - 4);
                g.fillTriangle(bx + 5, by - 4, bx + 8, by - 12, bx + 2, by - 4);
                g.fillStyle(0x900c3f);
                g.fillTriangle(bx - 4, by - 4, bx - 7, by - 10, bx - 3, by - 4);
                g.fillTriangle(bx + 4, by - 4, bx + 7, by - 10, bx + 3, by - 4);

                // Glowing Blood Eyes & Fangs
                g.fillStyle(0xff0000);
                g.fillRect(bx - 4, by - 3, 2, 2);
                g.fillRect(bx + 2, by - 3, 2, 2);
                g.fillStyle(0xffffff);
                g.fillRect(bx - 3, by - 3, 1, 1);
                g.fillRect(bx + 2, by - 3, 1, 1);
                g.fillRect(bx - 2, by + 1, 1, 2); // Left fang
                g.fillRect(bx + 1, by + 1, 1, 2); // Right fang

                // Articulated Leathery Wings
                g.fillStyle(0x111111);
                if (wingState) { // Wings Up
                    g.fillTriangle(bx - 4, by - 2, bx - 16, by - 14, bx - 8, by + 6);
                    g.fillTriangle(bx + 4, by - 2, bx + 16, by - 14, bx + 8, by + 6);
                    g.lineStyle(1.5, 0x4a235a);
                    g.lineBetween(bx - 4, by - 2, bx - 14, by - 12);
                    g.lineBetween(bx + 4, by - 2, bx + 14, by - 12);
                } else { // Wings Down
                    g.fillTriangle(bx - 4, by - 2, bx - 16, by + 10, bx - 8, by + 4);
                    g.fillTriangle(bx + 4, by - 2, bx + 16, by + 10, bx + 8, by + 4);
                    g.lineStyle(1.5, 0x4a235a);
                    g.lineBetween(bx - 4, by - 2, bx - 14, by + 8);
                    g.lineBetween(bx + 4, by - 2, bx + 14, by + 8);
                }
            }
        }
        g.generateTexture('enemy_bat_tex', 512, 32);
        scene.textures.addSpriteSheet('enemy_bat', scene.textures.get('enemy_bat_tex').getSourceImage() as HTMLImageElement, { frameWidth: 32, frameHeight: 32 });

        // โ”€โ”€ 6. Enemy: Slime (32x32 frame, 16 frames: 512x32 sheet) โ”€โ”€
        g.clear();
        for (let i = 0; i < 16; i++) {
            const x = i * 32;
            const isIdle = i < 4;
            const isWalk = i >= 4 && i < 8;
            const isAttack = i >= 8 && i < 12;
            const isDeath = i >= 12;

            const walkFrame = isWalk ? i - 4 : 0;
            const atkFrame = isAttack ? i - 8 : 0;
            const deathFrame = isDeath ? i - 12 : 0;

            let squishW = 0;
            let squishH = 0;
            let bodyY = 0;

            if (isIdle) {
                squishW = (i % 2 === 0) ? 0 : 2;
                squishH = (i % 2 === 0) ? 0 : -1;
            } else if (isWalk) {
                if (walkFrame === 0) { squishW = 4; squishH = -3; bodyY = 2; } // Squash flat
                if (walkFrame === 1) { squishW = -3; squishH = 4; bodyY = -4; } // Stretch up
                if (walkFrame === 2) { squishW = -1; squishH = 2; bodyY = -2; } // Air peak
                if (walkFrame === 3) { squishW = 2; squishH = -2; bodyY = 1; } // Land bounce
            } else if (isAttack) {
                if (atkFrame === 0) { squishW = 5; squishH = -4; bodyY = 3; }
                if (atkFrame === 1) { squishW = -4; squishH = 6; bodyY = -5; }
                if (atkFrame === 2) { squishW = 3; squishH = -2; bodyY = 0; }
                if (atkFrame === 3) { squishW = 0; squishH = 0; bodyY = 0; }
            } else if (isDeath) {
                squishW = [ 3, 8, 14, 18 ][deathFrame];
                squishH = [ -2, -5, -8, -10 ][deathFrame];
                bodyY = [ 1, 3, 5, 7 ][deathFrame];
            }

            const bx = x + 16;
            const by = 16 + bodyY;

            if (!isDeath || deathFrame < 3) {
                // Outer Shadow Gel
                g.fillStyle(0x0e6251, 0.9);
                g.fillRoundedRect(bx - 12 - squishW / 2, by - 2 + squishH, 24 + squishW, 16 - squishH, 6);

                // Emerald Translucent Gel
                g.fillStyle(0x2ecc71, 0.85);
                g.fillRoundedRect(bx - 10 - squishW / 2, by - 4 + squishH, 20 + squishW, 16 - squishH, 7);

                // Bright Acid Highlight
                g.fillStyle(0x58d68d, 0.9);
                g.fillRoundedRect(bx - 7 - squishW / 3, by - 3 + squishH, 14 + squishW / 2, 6, 3);

                // Inner Skull Nucleus Core
                if (!isDeath || deathFrame < 2) {
                    g.fillStyle(0x145a32, 0.8);
                    g.fillCircle(bx, by + 3 + squishH / 2, 5);
                    g.fillStyle(0x0e6251);
                    g.fillRect(bx - 2, by + 2 + squishH / 2, 4, 3);
                }

                // Specular Highlights
                g.fillStyle(0xffffff, 0.95);
                g.fillCircle(bx - 6 - squishW / 4, by - 1 + squishH, 2);
                g.fillCircle(bx + 5 + squishW / 4, by + 1, 1);
            }
        }
        g.generateTexture('enemy_slime_tex', 512, 32);
        scene.textures.addSpriteSheet('enemy_slime', scene.textures.get('enemy_slime_tex').getSourceImage() as HTMLImageElement, { frameWidth: 32, frameHeight: 32 });

        // โ”€โ”€ 7. Enemy: Skeleton Archer (32x32 frame, 16 frames: 512x32 sheet) โ”€โ”€
        g.clear();
        for (let i = 0; i < 16; i++) {
            const x = i * 32;
            const isIdle = i < 4;
            const isWalk = i >= 4 && i < 8;
            const isAttack = i >= 8 && i < 12;
            const isDeath = i >= 12;

            const walkFrame = isWalk ? i - 4 : 0;
            const atkFrame = isAttack ? i - 8 : 0;
            const deathFrame = isDeath ? i - 12 : 0;

            const legOff = isWalk ? (walkFrame % 2 === 0 ? 2 : -2) : 0;
            const breathY = isIdle ? (i % 2 === 1 ? -1 : 0) : 0;

            let bodyY = breathY;
            let bodyX = 0;
            let bowDraw = 0;
            let bowRot = 0;

            if (isAttack) {
                if (atkFrame === 0) { bodyX = -1; bowDraw = 2; } // Reach quiver
                if (atkFrame === 1) { bodyX = 1; bowDraw = 5; bowRot = -5; } // Nock arrow
                if (atkFrame === 2) { bodyX = 2; bowDraw = 9; bowRot = -10; } // Pull string tension
                if (atkFrame === 3) { bodyX = 3; bowDraw = 0; bowRot = 5; } // Release recoil
            } else if (isDeath) {
                bodyY = [ 2, 6, 12, 18 ][deathFrame];
                bodyX = [ -2, -4, -6, -8 ][deathFrame];
            }

            const bx = x + 16 + bodyX;
            const by = 16 + bodyY;

            // Bone Legs & Joints
            if (!isDeath || deathFrame < 3) {
                g.fillStyle(0x7f8c8d);
                g.fillRect(bx - 5 + legOff, by + 4, 3, 10);
                g.fillStyle(0xbdc3c7);
                g.fillRect(bx + 2 - legOff, by + 4, 3, 10);
                g.fillStyle(0xecf0f1);
                g.fillRect(bx - 6 + legOff, by + 8, 5, 2);
                g.fillRect(bx + 1 - legOff, by + 8, 5, 2);

                // Spine & Articulated Ribcage
                g.fillStyle(0xbdc3c7);
                g.fillRect(bx - 2, by - 5, 4, 10);
                g.fillStyle(0xecf0f1);
                g.fillRoundedRect(bx - 6, by - 4, 12, 3, 1);
                g.fillRoundedRect(bx - 5, by - 1, 10, 2, 1);
                g.fillRoundedRect(bx - 4, by + 2, 8, 2, 1);

                // Leather Pauldrons & Quiver Strap
                g.fillStyle(0x1c2833);
                g.fillRect(bx - 7, by - 5, 4, 4);
                g.fillRect(bx + 3, by - 5, 4, 4);
                g.fillStyle(0x4a2e1b); // Quiver strap
                g.lineStyle(1.5, 0x4a2e1b);
                g.lineBetween(bx - 5, by - 4, bx + 4, by + 3);

                // Skull & Eye Socket Purple Glow
                g.fillStyle(0xbdc3c7);
                g.fillRoundedRect(bx - 6, by - 15, 12, 10, 4);
                g.fillStyle(0xecf0f1);
                g.fillRoundedRect(bx - 5, by - 14, 10, 8, 3);
                g.fillStyle(0x0a0a0a);
                g.fillRect(bx - 4, by - 11, 3, 3);
                g.fillRect(bx + 1, by - 11, 3, 3);
                g.fillStyle(0x9b59b6); // Purple magic eye
                g.fillRect(bx - 3, by - 10, 2, 2);
                g.fillRect(bx + 2, by - 10, 2, 2);

                // Wooden Longbow & Drawn Arrow
                const bowX = bx + 7 - bowDraw * 0.3;
                g.lineStyle(2, 0xa04000);
                g.beginPath();
                g.arc(bowX, by - 2, 10, Phaser.Math.DegToRad(-60 + bowRot), Phaser.Math.DegToRad(60 + bowRot), false);
                g.strokePath();

                // Bowstring
                g.lineStyle(1, 0xaaaaaa, 0.85);
                g.lineBetween(bowX, by - 10, bowX - bowDraw, by - 2);
                g.lineBetween(bowX - bowDraw, by - 2, bowX, by + 6);

                // Arrow
                if (isAttack && atkFrame >= 1 && atkFrame <= 2) {
                    g.lineStyle(1.5, 0xd35400);
                    g.lineBetween(bowX - bowDraw - 2, by - 2, bowX + 6, by - 2);
                    g.fillStyle(0xecf0f1);
                    g.fillTriangle(bowX + 6, by - 4, bowX + 9, by - 2, bowX + 6, by + 0);
                }
            }
        }
        g.generateTexture('enemy_skeleton_tex', 512, 32);
        scene.textures.addSpriteSheet('enemy_skeleton', scene.textures.get('enemy_skeleton_tex').getSourceImage() as HTMLImageElement, { frameWidth: 32, frameHeight: 32 });

        // ── Floating Skull Textures for Orbiting Skulls (16x16) ──
        g.clear();
        g.fillStyle(0x000000, 0.5);
        g.fillCircle(8, 8, 7);
        g.fillStyle(0xbdc3c7);
        g.fillCircle(8, 7, 6);
        g.fillStyle(0xecf0f1);
        g.fillCircle(8, 6, 5);
        g.fillStyle(0x0a0a0a);
        g.fillRect(5, 6, 2, 3);
        g.fillRect(9, 6, 2, 3);
        g.fillStyle(0xff00ff);
        g.fillRect(5, 7, 1, 1);
        g.fillRect(9, 7, 1, 1);
        g.generateTexture('floating_skull_purple', 16, 16);

        g.clear();
        g.fillStyle(0x000000, 0.5);
        g.fillCircle(8, 8, 7);
        g.fillStyle(0xabebc6);
        g.fillCircle(8, 7, 6);
        g.fillStyle(0x2ecc71);
        g.fillCircle(8, 6, 5);
        g.fillStyle(0x0a0a0a);
        g.fillRect(5, 6, 2, 3);
        g.fillRect(9, 6, 2, 3);
        g.fillStyle(0x00ff66);
        g.fillRect(5, 7, 1, 1);
        g.fillRect(9, 7, 1, 1);
        g.generateTexture('floating_skull_green', 16, 16);

        // โ”€โ”€ 9. Graveyard Environment Props (High Fidelity) โ”€โ”€
        // Broken Tombstone (32x32)
        g.clear();
        g.fillStyle(0x1a1a1a); // Drop shadow
        g.fillEllipse(16, 28, 12, 4);
        g.fillStyle(0x34495e); // Stone base shadow
        g.fillRoundedRect(6, 12, 20, 18, 4);
        g.fillStyle(0x7f8c8d); // Stone face
        g.fillRoundedRect(8, 14, 16, 16, 3);
        g.fillStyle(0x95a5a6); // Stone top highlight
        g.fillRoundedRect(9, 15, 14, 6, 2);
        // Cracks & Engravings
        g.fillStyle(0x2c3e50);
        g.fillRect(14, 20, 4, 2); // Cross H
        g.fillRect(15, 18, 2, 6); // Cross V
        g.fillRect(10, 14, 2, 6); // Crack 1
        g.fillRect(11, 16, 2, 2);
        g.generateTexture('tombstone', 32, 32);

        // Creepy Dead Tree (64x64)
        g.clear();
        g.fillStyle(0x111111); // Tree drop shadow
        g.fillEllipse(32, 60, 24, 8);
        g.fillStyle(0x171210); // Bark shadow
        g.fillRect(26, 24, 12, 38);
        g.fillStyle(0x2e1c14); // Brown bark
        g.fillRect(28, 24, 8, 38);
        // Roots
        g.fillTriangle(28, 62, 20, 64, 28, 54);
        g.fillTriangle(36, 62, 44, 64, 36, 54);
        // Twisted Branches
        g.lineStyle(6, 0x171210);
        g.beginPath(); g.moveTo(32, 30); g.lineTo(12, 10); g.strokePath();
        g.beginPath(); g.moveTo(32, 40); g.lineTo(52, 16); g.strokePath();
        g.lineStyle(4, 0x2e1c14);
        g.beginPath(); g.moveTo(32, 30); g.lineTo(14, 12); g.strokePath();
        g.beginPath(); g.moveTo(32, 40); g.lineTo(50, 18); g.strokePath();
        // Spooky hanging moss
        g.fillStyle(0x145a32, 0.7);
        g.fillRoundedRect(12, 10, 4, 12, 2);
        g.fillRoundedRect(48, 16, 4, 16, 2);
        g.generateTexture('dead_tree', 64, 64);

        // Candle Brazier (32x32)
        g.clear();
        g.fillStyle(0x111111);
        g.fillEllipse(16, 28, 10, 4); // shadow
        g.fillStyle(0x34495e); // Iron basin
        g.fillTriangle(16, 28, 8, 18, 24, 18);
        g.fillStyle(0x7f8c8d);
        g.fillTriangle(16, 26, 12, 18, 20, 18);
        g.fillStyle(0xd35400, 0.6); // Fire glow
        g.fillCircle(16, 14, 10);
        g.fillStyle(0xf39c12, 0.8);
        g.fillCircle(16, 14, 6);
        g.fillStyle(0xf1c40f);
        g.fillCircle(16, 14, 3);
        g.generateTexture('candle_brazier', 32, 32);

        // โ”€โ”€ 10. Combat VFX & Projectiles โ”€โ”€
        // Slash Arc (Handcrafted Pixel Crescent Arc)
        g.clear();
        g.lineStyle(8, 0x00f5d4, 0.35);
        g.beginPath();
        g.arc(24, 24, 16, Phaser.Math.DegToRad(-85), Phaser.Math.DegToRad(85), false);
        g.strokePath();

        g.lineStyle(4, 0x3498db, 0.8);
        g.beginPath();
        g.arc(24, 24, 18, Phaser.Math.DegToRad(-75), Phaser.Math.DegToRad(75), false);
        g.strokePath();

        g.lineStyle(2, 0xffffff, 1.0);
        g.beginPath();
        g.arc(24, 24, 20, Phaser.Math.DegToRad(-65), Phaser.Math.DegToRad(65), false);
        g.strokePath();

        // Trailing pixel sparks
        g.fillStyle(0x00f5d4, 0.9);
        g.fillRect(38, 12, 3, 3);
        g.fillRect(40, 26, 2, 2);
        g.fillRect(36, 38, 3, 3);
        g.fillStyle(0xffffff);
        g.fillRect(39, 13, 1, 1);
        g.fillRect(37, 39, 1, 1);
        g.generateTexture('effect_slash', 48, 48);

        // Critical Hit Slash (Golden/Crimson Flame Arc)
        g.clear();
        g.lineStyle(10, 0xe63946, 0.5);
        g.beginPath();
        g.arc(28, 28, 20, Phaser.Math.DegToRad(-90), Phaser.Math.DegToRad(90), false);
        g.strokePath();

        g.lineStyle(6, 0xffa500, 0.85);
        g.beginPath();
        g.arc(28, 28, 23, Phaser.Math.DegToRad(-80), Phaser.Math.DegToRad(80), false);
        g.strokePath();

        g.lineStyle(3, 0xfff700, 1.0);
        g.beginPath();
        g.arc(28, 28, 25, Phaser.Math.DegToRad(-70), Phaser.Math.DegToRad(70), false);
        g.strokePath();

        g.lineStyle(1.5, 0xffffff, 1.0);
        g.beginPath();
        g.arc(28, 28, 26, Phaser.Math.DegToRad(-60), Phaser.Math.DegToRad(60), false);
        g.strokePath();

        // Spark Burst Dots
        g.fillStyle(0xffd700);
        g.fillRect(46, 12, 3, 3);
        g.fillRect(50, 28, 4, 4);
        g.fillRect(44, 44, 3, 3);
        g.fillStyle(0xffffff);
        g.fillRect(47, 13, 2, 2);
        g.fillRect(51, 29, 2, 2);
        g.fillRect(45, 45, 2, 2);
        g.generateTexture('effect_crit_slash', 56, 56);

        // โ”€โ”€ 16.5. Fog Texture (256x256 tileable noise base) โ”€โ”€
        g.clear();
        // Generate random wisps
        for (let i = 0; i < 200; i++) {
            const fx = Phaser.Math.Between(0, 256);
            const fy = Phaser.Math.Between(0, 256);
            const r = Phaser.Math.Between(4, 24);
            const a = Phaser.Math.FloatBetween(0.05, 0.25);
            g.fillStyle(0xffffff, a);
            g.fillCircle(fx, fy, r);
            
            // To make it tileable-ish, mirror to edges
            g.fillCircle(fx - 256, fy, r);
            g.fillCircle(fx + 256, fy, r);
            g.fillCircle(fx, fy - 256, r);
            g.fillCircle(fx, fy + 256, r);
        }
        g.generateTexture('effect_fog', 256, 256);

        // Shockwave Ring (Executioner Skill)
        g.clear();
        g.lineStyle(4, 0xffd700, 0.9);
        g.strokeCircle(32, 32, 28);
        g.lineStyle(2, 0xffffff, 1);
        g.strokeCircle(32, 32, 24);
        g.generateTexture('effect_shockwave', 64, 64);

        // Soul Particle (Soul Collector Skill)
        g.clear();
        g.fillStyle(0x8e44ad, 0.9);
        g.fillCircle(6, 6, 5);
        g.fillStyle(0xa3e4d7, 0.95);
        g.fillCircle(6, 6, 2);
        g.generateTexture('effect_soul', 12, 12);

        // Particle Spark
        g.clear();
        g.fillStyle(0xffffff, 1);
        g.fillRect(0, 0, 4, 4);
        g.generateTexture('effect_particle', 4, 4);

        // EXP Orb
        g.clear();
        g.fillStyle(0x00ffff, 1);
        g.fillCircle(6, 6, 5);
        g.lineStyle(1.5, 0xffffff, 1);
        g.strokeCircle(6, 6, 5);
        g.fillStyle(0xffffff, 0.95);
        g.fillCircle(4, 4, 2);
        g.generateTexture('exp_orb', 12, 12);

        // Soul Bolt Projectile
        g.clear();
        g.fillStyle(0x2ecc71, 1);
        g.fillCircle(7, 7, 6);
        g.lineStyle(1.5, 0xabebc6, 1);
        g.strokeCircle(7, 7, 6);
        g.fillStyle(0xffffff, 0.9);
        g.fillCircle(5, 5, 2.5);
        g.generateTexture('projectile_soul_bolt', 14, 14);

        // Arrow Projectile
        g.clear();
        g.fillStyle(0x7e5109, 1);
        g.fillRect(0, 4, 12, 2);
        g.fillStyle(0xd5f5e3, 1);
        g.fillTriangle(12, 1, 18, 5, 12, 9);
        g.generateTexture('projectile_arrow', 18, 10);

        // Poison Zone
        g.clear();
        g.fillStyle(0x27ae60, 0.45);
        g.fillCircle(28, 28, 28);
        g.lineStyle(2, 0x2ecc71, 0.7);
        g.strokeCircle(28, 28, 28);
        g.generateTexture('effect_poison_zone', 56, 56);

        // Gold Coin
        g.clear();
        g.fillStyle(0xf1c40f, 1);
        g.fillCircle(7, 7, 6);
        g.lineStyle(1.5, 0xd4ac0d, 1);
        g.strokeCircle(7, 7, 6);
        g.fillStyle(0xffffff, 0.95);
        g.fillCircle(4, 4, 2);
        g.generateTexture('gold_coin', 14, 14);

        g.destroy();
    }

    static loadAssets(scene: Phaser.Scene) {
        this.generatePlaceholders(scene);

        scene.load.image('bg_graveyard', 'assets/images/bg_graveyard.png');

        // Load Necromancer Boss transparent PNG sprite sheets (Derived from Concept Art)
        scene.load.spritesheet('boss_necromancer_phase1', 'assets/bosses/necromancer/phase1.png', { frameWidth: 128, frameHeight: 128 });
        scene.load.spritesheet('boss_necromancer_phase2', 'assets/bosses/necromancer/phase2.png', { frameWidth: 128, frameHeight: 128 });
        scene.load.spritesheet('boss_necromancer_phase3', 'assets/bosses/necromancer/phase3.png', { frameWidth: 160, frameHeight: 160 });
        scene.load.spritesheet('boss_necromancer', 'assets/bosses/necromancer/phase1.png', { frameWidth: 128, frameHeight: 128 });

        // Load Audio Assets safely from AudioRegistry
        AudioRegistry.forEach(asset => {
            scene.load.audio(asset.key, asset.path);
        });

        console.log('AssetLoader: High-detail pixel art & audio loaded for scene', scene.scene.key);
    }
}
