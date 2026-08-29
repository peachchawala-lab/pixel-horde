import Phaser from 'phaser';

/**
 * ActiveSkillIcons — Procedural pixel-art icon and charge gem generator for Active Abilities.
 * Creates clean, layered 32x32 textures for Arcane Cleave, Soul Nova, Crimson Vital,
 * and 12x12 gem textures for healing charges.
 */
export class ActiveSkillIcons {
    public static generateIcons(scene: Phaser.Scene): void {
        const g = scene.add.graphics({ x: 0, y: 0 }).setVisible(false);

        // ═══════════════════════════════════════════════════════════════
        // 1. ARCANE CLEAVE ICON (32x32) — Curved Cyan Arcane Sword & Slash
        // ═══════════════════════════════════════════════════════════════
        g.clear();
        // Dark metallic gradient background
        g.fillStyle(0x0c141f, 1);
        g.fillRoundedRect(0, 0, 32, 32, 4);

        // Subtle inner glow
        g.fillStyle(0x00384d, 0.6);
        g.fillCircle(16, 16, 13);

        // Outer cyan energy slash arc
        g.lineStyle(3, 0x007799, 0.7);
        g.beginPath();
        g.arc(16, 16, 12, -Math.PI * 0.8, Math.PI * 0.3, false);
        g.strokePath();

        g.lineStyle(2, 0x00f5d4, 0.95);
        g.beginPath();
        g.arc(16, 16, 11, -Math.PI * 0.75, Math.PI * 0.25, false);
        g.strokePath();

        // White core slash trail
        g.lineStyle(1, 0xffffff, 1);
        g.beginPath();
        g.arc(16, 16, 11, -Math.PI * 0.6, Math.PI * 0.1, false);
        g.strokePath();

        // Sword blade (diagonal from bottom-left to top-right)
        // Golden pommel & crossguard
        g.fillStyle(0xd4ac0d, 1);
        g.fillRect(7, 23, 4, 4);
        g.fillStyle(0xf1c40f, 1);
        g.fillRect(9, 21, 6, 2);
        g.fillRect(8, 20, 2, 4);

        // Steel Blade with cyan mana channel
        g.fillStyle(0xbdc3c7, 1);
        g.beginPath();
        g.moveTo(11, 19);
        g.lineTo(24, 6);
        g.lineTo(26, 8);
        g.lineTo(13, 21);
        g.closePath();
        g.fillPath();

        // Bright mana edge & tip
        g.fillStyle(0x00f5d4, 1);
        g.fillRect(14, 14, 3, 3);
        g.fillRect(18, 10, 3, 3);
        g.fillStyle(0xffffff, 1);
        g.fillRect(23, 6, 3, 3);

        // Golden spark motes
        g.fillStyle(0xffd700, 1);
        g.fillRect(6, 10, 2, 2);
        g.fillRect(26, 18, 2, 2);
        g.fillRect(19, 25, 2, 2);

        g.generateTexture('icon_skill_cleave', 32, 32);

        // ═══════════════════════════════════════════════════════════════
        // 2. SOUL NOVA ICON (32x32) — Violet Cosmic Nova Core & 8-Point Star
        // ═══════════════════════════════════════════════════════════════
        g.clear();
        // Dark violet nebula background
        g.fillStyle(0x150921, 1);
        g.fillRoundedRect(0, 0, 32, 32, 4);

        // Purple aura disc
        g.fillStyle(0x4a154b, 0.7);
        g.fillCircle(16, 16, 13);
        g.fillStyle(0x8e44ad, 0.5);
        g.fillCircle(16, 16, 10);

        // Radial nova star rays (8 points)
        g.lineStyle(1.5, 0xd2b4de, 0.85);
        // Cardinal spokes
        g.beginPath();
        g.moveTo(16, 4); g.lineTo(16, 28);
        g.moveTo(4, 16); g.lineTo(28, 16);
        // Diagonal spokes
        g.moveTo(7, 7); g.lineTo(25, 25);
        g.moveTo(25, 7); g.lineTo(7, 25);
        g.strokePath();

        // Concentric electric cyan energy ring
        g.lineStyle(2, 0x00ffff, 0.9);
        g.strokeCircle(16, 16, 8);

        // Inner glowing core
        g.fillStyle(0xaf7ac5, 1);
        g.fillCircle(16, 16, 5);
        g.fillStyle(0x00ffff, 1);
        g.fillCircle(16, 16, 3.5);
        g.fillStyle(0xffffff, 1);
        g.fillCircle(16, 16, 2);

        // Orbiting soul sparks
        g.fillStyle(0x00f5d4, 1);
        g.fillRect(10, 8, 2, 2);
        g.fillRect(22, 10, 2, 2);
        g.fillRect(11, 22, 2, 2);
        g.fillRect(23, 21, 2, 2);

        g.generateTexture('icon_skill_nova', 32, 32);

        // ═══════════════════════════════════════════════════════════════
        // 3. CRIMSON VITAL ICON (32x32) — Ruby Flask with Emerald Holy Elixir
        // ═══════════════════════════════════════════════════════════════
        g.clear();
        // Dark gothic background
        g.fillStyle(0x190d0d, 1);
        g.fillRoundedRect(0, 0, 32, 32, 4);

        // Subtle ruby back-glow
        g.fillStyle(0x5c1d1d, 0.6);
        g.fillCircle(16, 17, 12);

        // Flask bottle neck & stopper
        g.fillStyle(0xd4ac0d, 1); // Gold stopper
        g.fillRect(14, 5, 4, 3);
        g.fillStyle(0x7f8c8d, 1); // Glass rim
        g.fillRect(13, 8, 6, 2);
        g.fillRect(14, 10, 4, 3);

        // Glass bottle bulb (spherical potion)
        g.fillStyle(0x1e8449, 1); // Dark emerald liquid base
        g.fillCircle(16, 19, 9);

        g.fillStyle(0x2ecc71, 0.95); // Bright vibrant elixir
        g.fillCircle(16, 20, 7.5);

        // Holy healing golden cross in center of liquid
        g.fillStyle(0xf1c40f, 1);
        g.fillRect(15, 16, 2, 8);
        g.fillRect(12, 19, 8, 2);
        g.fillStyle(0xffffff, 1);
        g.fillRect(15, 19, 2, 2);

        // Glass reflection highlights
        g.fillStyle(0xffffff, 0.7);
        g.beginPath();
        g.arc(16, 19, 8, -Math.PI * 0.75, -Math.PI * 0.4, false);
        g.strokePath();

        // Rising healing sparkle bubbles
        g.fillStyle(0xabebc6, 1);
        g.fillRect(12, 14, 2, 2);
        g.fillRect(19, 13, 1.5, 1.5);
        g.fillRect(17, 10, 1.5, 1.5);

        g.generateTexture('icon_skill_vital', 32, 32);

        // ═══════════════════════════════════════════════════════════════
        // 4. CHARGE GEM ACTIVE (14x14) — Glowing Emerald/Ruby Rune Gem
        // ═══════════════════════════════════════════════════════════════
        g.clear();
        // Outer gold bezel
        g.fillStyle(0xb7950b, 1);
        g.beginPath();
        g.moveTo(7, 0); g.lineTo(14, 7); g.lineTo(7, 14); g.lineTo(0, 7);
        g.closePath();
        g.fillPath();

        // Inner glowing gem body
        g.fillStyle(0x27ae60, 1);
        g.beginPath();
        g.moveTo(7, 2); g.lineTo(12, 7); g.lineTo(7, 12); g.lineTo(2, 7);
        g.closePath();
        g.fillPath();

        // Bright facet highlight
        g.fillStyle(0x2ecc71, 1);
        g.beginPath();
        g.moveTo(7, 3); g.lineTo(10, 7); g.lineTo(7, 9); g.lineTo(4, 7);
        g.closePath();
        g.fillPath();

        // Specular glint
        g.fillStyle(0xffffff, 0.95);
        g.fillRect(6, 4, 2, 2);

        g.generateTexture('gem_charge_active', 14, 14);

        // ═══════════════════════════════════════════════════════════════
        // 5. CHARGE GEM EMPTY (14x14) — Hollow Dark Stone Socket
        // ═══════════════════════════════════════════════════════════════
        g.clear();
        // Dark weathered rim
        g.fillStyle(0x2c3e50, 1);
        g.beginPath();
        g.moveTo(7, 0); g.lineTo(14, 7); g.lineTo(7, 14); g.lineTo(0, 7);
        g.closePath();
        g.fillPath();

        // Hollow empty socket
        g.fillStyle(0x11161d, 1);
        g.beginPath();
        g.moveTo(7, 2); g.lineTo(12, 7); g.lineTo(7, 12); g.lineTo(2, 7);
        g.closePath();
        g.fillPath();

        // Socket inner shadow
        g.fillStyle(0x080b0e, 1);
        g.fillRect(5, 5, 4, 4);

        g.generateTexture('gem_charge_empty', 14, 14);

        g.destroy();
    }
}
