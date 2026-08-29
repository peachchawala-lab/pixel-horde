import Phaser from 'phaser';

/**
 * NecroSanctumArena — The Necromantic Sanctum Boss Arena Renderer (Optimized)
 *
 * Performance-optimized dark-fantasy ritual fortress above an endless abyss.
 * Static elements are rendered once; dynamic elements are lightweight.
 *
 * Depth Hierarchy:
 *   0       : Abyss void background
 *   1–2     : Distant ruins, eclipse moon, sky rifts
 *   3       : Far mist
 *   8       : Chains
 *   14      : Platform edge
 *   16      : Floor tiles
 *   17      : Floor details
 *   18      : Crystal beams (phase2+)
 *   19–20   : Ritual circle + rune glyphs
 *   21      : Rune particles
 *   22      : Debris chunks (phase3+)
 *   26      : Candles (static bodies + dynamic flame tips)
 *   28      : Altar
 *   30      : Pillars
 *   32      : Crystals
 *   ──────── GAMEPLAY (100–130) ────────
 *   100     : Player shadow
 *   104     : Enemy shadows
 *   105     : Enemies
 *   110     : PLAYER
 *   115–122 : Boss layers
 *   130     : Projectiles
 *   ──────── ATMOSPHERE (145–155) ────────
 *   145     : Ash particles
 *   150     : Foreground fog
 *   155     : Static vignette overlay
 *   ──────── HUD (1000+) ────────
 */
export class NecroSanctumArena {
    private scene: Phaser.Scene;
    private arenaW: number;
    private arenaH: number;
    private cx: number;
    private cy: number;

    // Current state
    private currentPhase: string = 'phase1';
    private isFrenzy: boolean = false;

    // ── Static Graphics Layers ──
    private abyssBg!: Phaser.GameObjects.Graphics;
    private distantRuins!: Phaser.GameObjects.Graphics;
    private moonGraphics!: Phaser.GameObjects.Graphics;
    private platformEdge!: Phaser.GameObjects.Graphics;
    private floorTiles!: Phaser.GameObjects.Graphics;
    private floorDetails!: Phaser.GameObjects.Graphics;
    private altarGraphics!: Phaser.GameObjects.Graphics;
    private candleBodies!: Phaser.GameObjects.Graphics;
    private staticCrystals!: Phaser.GameObjects.Graphics;
    private staticChains!: Phaser.GameObjects.Graphics;
    private vignetteOverlay!: Phaser.GameObjects.Graphics;

    // ── Animated Graphics Layers ──
    private ritualCircle!: Phaser.GameObjects.Graphics;
    private runeGlyphs!: Phaser.GameObjects.Graphics;
    private pillarGraphics!: Phaser.GameObjects.Graphics;
    private activeCrystalGfx!: Phaser.GameObjects.Graphics;
    private candleFlames!: Phaser.GameObjects.Graphics;
    private abyssMist!: Phaser.GameObjects.Graphics;
    private fogNear!: Phaser.GameObjects.Graphics;
    private debrisGraphics!: Phaser.GameObjects.Graphics;
    private crystalBeams!: Phaser.GameObjects.Graphics;
    private skyRifts!: Phaser.GameObjects.Graphics;

    // ── Particle Emitters ──
    private runeParticles!: Phaser.GameObjects.Particles.ParticleEmitter;
    private ashParticles!: Phaser.GameObjects.Particles.ParticleEmitter;

    // ── Layout Data ──
    private pillarPositions: { x: number; y: number; damaged: boolean; destroyed: boolean }[] = [];
    private crystalPositions: { x: number; y: number; active: boolean; overcharged: boolean }[] = [];
    private candlePositions: { x: number; y: number }[] = [];
    private debrisChunks: { x: number; y: number; vy: number; size: number; rot: number; alpha: number }[] = [];

    // Frame throttle timers
    private animTick: number = 0;

    // ── Combat Area Bounds ──
    public readonly COMBAT_LEFT = 80;
    public readonly COMBAT_RIGHT: number;
    public readonly COMBAT_TOP = 60;
    public readonly COMBAT_BOTTOM: number;

    constructor(scene: Phaser.Scene, arenaW: number, arenaH: number) {
        this.scene = scene;
        this.arenaW = arenaW;
        this.arenaH = arenaH;
        this.cx = arenaW / 2;
        this.cy = arenaH / 2;
        this.COMBAT_RIGHT = arenaW - 80;
        this.COMBAT_BOTTOM = arenaH - 60;

        this.setupLayout();
        this.drawAbyssVoid();
        this.drawDistantRuins();
        this.drawEclipseMoon();
        this.drawPlatformEdge();
        this.drawFloorTiles();
        this.drawFloorDetails();
        this.drawAltar();
        this.setupPillars();
        this.setupCrystals();
        this.setupStaticChains();
        this.setupCandles();
        this.setupRitualCircle();
        this.setupFogLayers();
        this.setupParticles();
        this.setupStaticVignette();
        this.setupDebrisLayer();
        this.setupCrystalBeams();
        this.setupSkyRifts();
    }

    // ═══════════════════════════════════════════════════════════════
    // LAYOUT SETUP
    // ═══════════════════════════════════════════════════════════════

    private setupLayout(): void {
        const cx = this.cx;
        const cy = this.cy;

        // 8 Pillars in octagonal arrangement
        const pillarRadius = 250;
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i - Math.PI / 2;
            this.pillarPositions.push({
                x: cx + Math.cos(angle) * pillarRadius,
                y: cy + Math.sin(angle) * pillarRadius,
                damaged: false,
                destroyed: false
            });
        }

        // 6 Crystals in hexagonal arrangement
        const crystalRadius = 190;
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 / 6) * i - Math.PI / 2;
            this.crystalPositions.push({
                x: cx + Math.cos(angle) * crystalRadius,
                y: cy + Math.sin(angle) * crystalRadius,
                active: false,
                overcharged: false
            });
        }

        // 16 Candles
        const candleRadius1 = 100;
        for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 / 12) * i;
            this.candlePositions.push({
                x: cx + Math.cos(angle) * candleRadius1,
                y: cy + Math.sin(angle) * candleRadius1
            });
        }
        this.candlePositions.push({ x: cx - 60, y: 80 });
        this.candlePositions.push({ x: cx + 60, y: 80 });
        this.candlePositions.push({ x: cx - 30, y: 65 });
        this.candlePositions.push({ x: cx + 30, y: 65 });
    }

    // ═══════════════════════════════════════════════════════════════
    // ABYSS VOID BACKGROUND (Static)
    // ═══════════════════════════════════════════════════════════════

    private drawAbyssVoid(): void {
        this.abyssBg = this.scene.add.graphics().setDepth(0);

        const gradientSteps = 12;
        const stepH = this.arenaH / gradientSteps;
        for (let i = 0; i < gradientSteps; i++) {
            const t = i / gradientSteps;
            const r = Math.floor(4 + t * 10);
            const gv = Math.floor(0 + t * 3);
            const b = Math.floor(6 + t * 22);
            const color = (r << 16) | (gv << 8) | b;
            this.abyssBg.fillStyle(color, 1);
            this.abyssBg.fillRect(0, i * stepH, this.arenaW, stepH + 1);
        }

        for (let i = 0; i < 15; i++) {
            const fx = Math.random() * this.arenaW;
            const fy = Math.random() * this.arenaH;
            const fr = 30 + Math.random() * 70;
            this.abyssBg.fillStyle(0x120025, 0.06 + Math.random() * 0.06);
            this.abyssBg.fillCircle(fx, fy, fr);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // DISTANT RUINS (Static)
    // ═══════════════════════════════════════════════════════════════

    private drawDistantRuins(): void {
        this.distantRuins = this.scene.add.graphics().setDepth(1);
        const rc = 0x0c0818;
        const ra = 0.5;

        this.distantRuins.fillStyle(rc, ra);
        this.distantRuins.fillRect(20, 30, 30, 120);
        this.distantRuins.fillRect(15, 30, 40, 15);
        this.distantRuins.fillTriangle(35, 30, 25, 10, 45, 30);

        this.distantRuins.fillRect(this.arenaW - 50, 50, 28, 100);
        this.distantRuins.fillRect(this.arenaW - 55, 50, 38, 12);
        this.distantRuins.fillTriangle(this.arenaW - 36, 50, this.arenaW - 46, 30, this.arenaW - 26, 50);

        this.distantRuins.fillRect(40, this.arenaH - 60, 50, 20);
        this.distantRuins.fillRect(55, this.arenaH - 80, 15, 25);
        this.distantRuins.fillRect(this.arenaW - 90, this.arenaH - 70, 45, 25);
    }

    // ═══════════════════════════════════════════════════════════════
    // ECLIPSE MOON (Static)
    // ═══════════════════════════════════════════════════════════════

    private drawEclipseMoon(): void {
        this.moonGraphics = this.scene.add.graphics().setDepth(1);
        const mx = this.arenaW - 120;
        const my = 60;

        this.moonGraphics.fillStyle(0x2d1b4e, 0.12);
        this.moonGraphics.fillCircle(mx, my, 50);
        this.moonGraphics.fillStyle(0x1a0a2e, 0.75);
        this.moonGraphics.fillCircle(mx, my, 26);
        this.moonGraphics.fillStyle(0x3d1f5c, 0.5);
        this.moonGraphics.fillCircle(mx + 8, my - 4, 24);

        this.moonGraphics.lineStyle(2, 0x8e44ad, 0.4);
        this.moonGraphics.beginPath();
        this.moonGraphics.arc(mx, my, 26, Phaser.Math.DegToRad(-120), Phaser.Math.DegToRad(60), false);
        this.moonGraphics.strokePath();
    }

    // ═══════════════════════════════════════════════════════════════
    // PLATFORM EDGE (Static)
    // ═══════════════════════════════════════════════════════════════

    private drawPlatformEdge(): void {
        this.platformEdge = this.scene.add.graphics().setDepth(14);
        const margin = 65;
        const left = margin;
        const right = this.arenaW - margin;
        const top = margin - 10;
        const bottom = this.arenaH - margin + 10;
        const wallDepth = 18;

        this.platformEdge.fillStyle(0x0a0a14, 1);
        this.platformEdge.fillRect(left, bottom, right - left, wallDepth);
        this.platformEdge.fillStyle(0x060610, 1);
        this.platformEdge.fillRect(left, bottom + 6, right - left, wallDepth - 6);

        this.platformEdge.fillStyle(0x080812, 1);
        this.platformEdge.fillRect(right, top + 10, 12, bottom - top - 10);
        this.platformEdge.fillRect(left - 12, top + 10, 12, bottom - top - 10);
        this.platformEdge.fillStyle(0x0c0c18, 1);
        this.platformEdge.fillRect(left, top - 5, right - left, 8);

        const chamferSize = 35;
        this.platformEdge.fillStyle(0x050008, 1);
        this.platformEdge.fillTriangle(left - 12, top - 5, left - 12 + chamferSize, top - 5, left - 12, top - 5 + chamferSize);
        this.platformEdge.fillTriangle(right + 12, top - 5, right + 12 - chamferSize, top - 5, right + 12, top - 5 + chamferSize);
        this.platformEdge.fillTriangle(left - 12, bottom + wallDepth, left - 12 + chamferSize, bottom + wallDepth, left - 12, bottom + wallDepth - chamferSize);
        this.platformEdge.fillTriangle(right + 12, bottom + wallDepth, right + 12 - chamferSize, bottom + wallDepth, right + 12, bottom + wallDepth - chamferSize);
    }

    // ═══════════════════════════════════════════════════════════════
    // FLOOR TILES (Static)
    // ═══════════════════════════════════════════════════════════════

    private drawFloorTiles(): void {
        this.floorTiles = this.scene.add.graphics().setDepth(16);
        const margin = 65;
        const left = margin;
        const top = margin - 10;
        const floorW = this.arenaW - margin * 2;
        const floorH = this.arenaH - margin * 2 + 20;

        this.floorTiles.fillStyle(0x111120, 1);
        this.floorTiles.fillRect(left, top, floorW, floorH);

        const tileSize = 40;
        const baseColors = [
            0x101020, 0x121224, 0x0f0f1e, 0x131326, 0x111122,
            0x0e0e1c, 0x121228, 0x14142a, 0x101021, 0x0d0d1a
        ];

        let seed = 42;
        const seededRandom = () => {
            seed = (seed * 16807) % 2147483647;
            return (seed - 1) / 2147483646;
        };

        for (let tx = 0; tx < floorW; tx += tileSize) {
            for (let ty = 0; ty < floorH; ty += tileSize) {
                const worldX = left + tx;
                const worldY = top + ty;
                const dx = worldX + tileSize / 2 - this.cx;
                const dy = worldY + tileSize / 2 - this.cy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const centerBright = Math.max(0, 1 - dist / 320) * 0.15;

                const colorIdx = Math.floor(seededRandom() * baseColors.length);
                let tc = baseColors[colorIdx];

                if (centerBright > 0.02) {
                    const r = ((tc >> 16) & 0xff) + Math.floor(centerBright * 30);
                    const g = ((tc >> 8) & 0xff) + Math.floor(centerBright * 15);
                    const b = (tc & 0xff) + Math.floor(centerBright * 50);
                    tc = (Math.min(255, r) << 16) | (Math.min(255, g) << 8) | Math.min(255, b);
                }

                this.floorTiles.fillStyle(tc, 1);
                this.floorTiles.fillRect(worldX, worldY, tileSize, tileSize);

                this.floorTiles.fillStyle(0xffffff, 0.015);
                this.floorTiles.fillRect(worldX, worldY, tileSize, 1);
                this.floorTiles.fillRect(worldX, worldY, 1, tileSize);
            }
        }

        // Center ambient glow
        this.floorTiles.fillStyle(0x1a0a30, 0.08);
        this.floorTiles.fillCircle(this.cx, this.cy, 120);
    }

    // ═══════════════════════════════════════════════════════════════
    // FLOOR DETAILS (Static)
    // ═══════════════════════════════════════════════════════════════

    private drawFloorDetails(): void {
        this.floorDetails = this.scene.add.graphics().setDepth(17);

        const crackData = [
            { x1: this.cx - 30, y1: this.cy - 15, x2: this.cx - 50, y2: this.cy - 35 },
            { x1: this.cx + 20, y1: this.cy + 10, x2: this.cx + 45, y2: this.cy + 30 },
            { x1: this.cx - 10, y1: this.cy + 25, x2: this.cx - 35, y2: this.cy + 50 },
            { x1: this.cx + 15, y1: this.cy - 20, x2: this.cx + 40, y2: this.cy - 45 },
            { x1: this.cx - 60, y1: this.cy - 40, x2: this.cx - 95, y2: this.cy - 65 },
            { x1: this.cx + 70, y1: this.cy + 50, x2: this.cx + 110, y2: this.cy + 75 },
        ];

        for (const crack of crackData) {
            this.floorDetails.lineStyle(1.5, 0x060610, 0.4);
            this.floorDetails.beginPath();
            this.floorDetails.moveTo(crack.x1, crack.y1);
            this.floorDetails.lineTo(crack.x2, crack.y2);
            this.floorDetails.strokePath();
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // ALTAR (Static)
    // ═══════════════════════════════════════════════════════════════

    private drawAltar(): void {
        this.altarGraphics = this.scene.add.graphics().setDepth(28);
        const ax = this.cx;
        const ay = 95;

        this.altarGraphics.fillStyle(0x1a1a2e, 1);
        this.altarGraphics.fillRect(ax - 30, ay + 8, 60, 12);
        this.altarGraphics.fillStyle(0x141428, 1);
        this.altarGraphics.fillRect(ax - 24, ay - 10, 48, 20);
        this.altarGraphics.fillStyle(0x2a2a4a, 1);
        this.altarGraphics.fillRect(ax - 22, ay - 10, 44, 4);

        this.altarGraphics.lineStyle(1.5, 0x5b2c6f, 0.6);
        this.altarGraphics.strokeCircle(ax, ay - 2, 8);

        for (const side of [-1, 1]) {
            const px = ax + side * 28;
            this.altarGraphics.fillStyle(0x18182e, 1);
            this.altarGraphics.fillRect(px - 5, ay - 22, 10, 30);
            this.altarGraphics.fillStyle(0x8e44ad, 0.5);
            this.altarGraphics.fillCircle(px, ay - 26, 3);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // PILLARS (Static until phase transitions)
    // ═══════════════════════════════════════════════════════════════

    private setupPillars(): void {
        this.pillarGraphics = this.scene.add.graphics().setDepth(30);
        this.drawPillars();
    }

    private drawPillars(): void {
        this.pillarGraphics.clear();

        for (const pillar of this.pillarPositions) {
            if (pillar.destroyed) {
                this.pillarGraphics.fillStyle(0x1a1a2e, 0.8);
                this.pillarGraphics.fillRect(pillar.x - 8, pillar.y + 4, 16, 6);
                continue;
            }

            const height = pillar.damaged ? 22 : 36;
            this.pillarGraphics.fillStyle(0x050508, 0.4);
            this.pillarGraphics.fillEllipse(pillar.x, pillar.y + 10, 16, 6);
            this.pillarGraphics.fillStyle(0x141428, 1);
            this.pillarGraphics.fillRect(pillar.x - 8, pillar.y + 2, 16, 8);
            this.pillarGraphics.fillStyle(0x18182e, 1);
            this.pillarGraphics.fillRect(pillar.x - 6, pillar.y - height, 12, height + 4);
            this.pillarGraphics.fillStyle(0x222240, 1);
            this.pillarGraphics.fillRect(pillar.x - 5, pillar.y - height + 2, 10, height);

            if (!pillar.damaged) {
                this.pillarGraphics.fillStyle(0x2a2a48, 1);
                this.pillarGraphics.fillRect(pillar.x - 8, pillar.y - height - 2, 16, 4);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // CRYSTALS (Static base + dynamic glow for active crystals)
    // ═══════════════════════════════════════════════════════════════

    private setupCrystals(): void {
        this.staticCrystals = this.scene.add.graphics().setDepth(32);
        this.activeCrystalGfx = this.scene.add.graphics().setDepth(33);
        this.drawStaticCrystals();
    }

    private drawStaticCrystals(): void {
        this.staticCrystals.clear();
        for (const crystal of this.crystalPositions) {
            this.staticCrystals.fillStyle(0x050508, 0.35);
            this.staticCrystals.fillEllipse(crystal.x, crystal.y + 8, 12, 4);
            this.staticCrystals.fillStyle(0x1a1a2e, 0.8);
            this.staticCrystals.fillRect(crystal.x - 4, crystal.y + 2, 8, 4);
            this.staticCrystals.fillStyle(0x1c1030, 0.9);
            this.staticCrystals.fillTriangle(crystal.x, crystal.y - 14, crystal.x - 6, crystal.y + 2, crystal.x + 6, crystal.y + 2);
        }
    }

    private drawActiveCrystals(time: number): void {
        if (this.currentPhase === 'phase1') {
            this.activeCrystalGfx.clear();
            return;
        }

        this.activeCrystalGfx.clear();
        const pulse = Math.sin(time / 400) * 0.3 + 0.7;

        for (const crystal of this.crystalPositions) {
            if (!crystal.active) continue;
            const glowColor = crystal.overcharged ? 0x00f5d4 : (this.currentPhase === 'phase2' ? 0x2ecc71 : 0x8e44ad);
            const bodyColor = crystal.overcharged ? 0x00d4aa : (this.currentPhase === 'phase2' ? 0x27ae60 : 0x6c3483);

            this.activeCrystalGfx.fillStyle(glowColor, 0.12);
            this.activeCrystalGfx.fillCircle(crystal.x, crystal.y - 4, 12 + pulse * 3);
            this.activeCrystalGfx.fillStyle(bodyColor, 0.95);
            this.activeCrystalGfx.fillTriangle(crystal.x, crystal.y - 16, crystal.x - 7, crystal.y + 2, crystal.x + 7, crystal.y + 2);
            this.activeCrystalGfx.fillStyle(0xffffff, 0.2 * pulse);
            this.activeCrystalGfx.fillCircle(crystal.x, crystal.y - 14, 2);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // CHAINS (Static)
    // ═══════════════════════════════════════════════════════════════

    private setupStaticChains(): void {
        this.staticChains = this.scene.add.graphics().setDepth(8);
        const chainSpots = [
            { x: 60, y: 0, len: 90 }, { x: this.arenaW - 60, y: 0, len: 90 },
            { x: 30, y: 80, len: 70 }, { x: this.arenaW - 30, y: 80, len: 70 }
        ];

        for (const spot of chainSpots) {
            const count = Math.floor(spot.len / 8);
            for (let i = 0; i < count; i++) {
                const isEven = i % 2 === 0;
                this.staticChains.fillStyle(isEven ? 0x3a3a4e : 0x2a2a3e, 0.7);
                this.staticChains.fillRect(spot.x - 2, spot.y + i * 8, 4, 7);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // CANDLES (Static bodies + lightweight animated flames)
    // ═══════════════════════════════════════════════════════════════

    private setupCandles(): void {
        this.candleBodies = this.scene.add.graphics().setDepth(26);
        this.candleFlames = this.scene.add.graphics().setDepth(27);

        // Draw static candle bodies once
        this.candleBodies.fillStyle(0x2a2a3e, 0.9);
        for (const candle of this.candlePositions) {
            this.candleBodies.fillRect(candle.x - 2, candle.y + 2, 4, 6);
        }
    }

    private drawCandleFlames(time: number): void {
        this.candleFlames.clear();
        const baseFlicker = Math.sin(time / 90) * 1.2;

        for (let i = 0; i < this.candlePositions.length; i++) {
            const c = this.candlePositions[i];
            const f = baseFlicker * ((i % 3 === 0) ? 1 : -0.7);

            this.candleFlames.fillStyle(0xd35400, 0.05);
            this.candleFlames.fillCircle(c.x, c.y - 2, 9);
            this.candleFlames.fillStyle(0xf39c12, 0.85);
            this.candleFlames.fillCircle(c.x, c.y - 2 + f * 0.2, 2.5);
            this.candleFlames.fillStyle(0xf1c40f, 1);
            this.candleFlames.fillCircle(c.x, c.y - 3, 1.2);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // RITUAL CIRCLE (Optimized dynamic rotation)
    // ═══════════════════════════════════════════════════════════════

    private setupRitualCircle(): void {
        this.ritualCircle = this.scene.add.graphics().setDepth(19);
        this.runeGlyphs = this.scene.add.graphics().setDepth(20);
    }

    private drawRitualCircle(time: number): void {
        this.ritualCircle.clear();
        this.runeGlyphs.clear();

        const cx = this.cx;
        const cy = this.cy;
        const rotSpeed = this.isFrenzy ? 4000 : (this.currentPhase === 'phase3' ? 6000 : 10000);
        const outerRot = time / rotSpeed;
        const innerPulse = Math.sin(time / 500) * 0.3 + 0.7;

        const runeAlpha = this.currentPhase === 'phase1' ? 0.15 :
            (this.currentPhase === 'phase2' ? 0.3 : (this.isFrenzy ? 0.5 : 0.4));
        const runeColor = this.currentPhase === 'phase2' ? 0x2ecc71 : (this.isFrenzy ? 0x00f5d4 : 0x8e44ad);

        // Outer segmented ring (8 segments for speed)
        const outerR = 130;
        const segments = 8;
        const segGap = 0.12;
        this.ritualCircle.lineStyle(2, runeColor, runeAlpha * 0.5);
        for (let i = 0; i < segments; i++) {
            if (i % 3 === 0) continue;
            const startAngle = outerRot + (Math.PI * 2 / segments) * i + segGap;
            const endAngle = outerRot + (Math.PI * 2 / segments) * (i + 1) - segGap;
            this.ritualCircle.beginPath();
            this.ritualCircle.arc(cx, cy, outerR, startAngle, endAngle, false);
            this.ritualCircle.strokePath();
        }

        // Inner static circle
        this.ritualCircle.lineStyle(1.5, runeColor, runeAlpha * innerPulse * 0.6);
        this.ritualCircle.strokeCircle(cx, cy, 75);

        // Pentagram
        this.runeGlyphs.lineStyle(1, runeColor, runeAlpha * innerPulse * 0.4);
        for (let i = 0; i < 5; i++) {
            const a1 = (Math.PI * 2 / 5) * i - Math.PI / 2 + outerRot * 0.1;
            const a2 = (Math.PI * 2 / 5) * ((i + 2) % 5) - Math.PI / 2 + outerRot * 0.1;
            this.runeGlyphs.beginPath();
            this.runeGlyphs.moveTo(cx + Math.cos(a1) * 45, cy + Math.sin(a1) * 45);
            this.runeGlyphs.lineTo(cx + Math.cos(a2) * 45, cy + Math.sin(a2) * 45);
            this.runeGlyphs.strokePath();
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // FOG LAYERS (Lightweight)
    // ═══════════════════════════════════════════════════════════════

    private setupFogLayers(): void {
        this.abyssMist = this.scene.add.graphics().setDepth(3);
        this.fogNear = this.scene.add.graphics().setDepth(150);
    }

    private drawFogLayers(time: number): void {
        this.abyssMist.clear();
        this.fogNear.clear();

        const margin = 65;
        const fogDensity = this.currentPhase === 'phase1' ? 0.08 : 0.14;
        const mistColor = this.currentPhase === 'phase2' ? 0x145a32 : 0x1a0030;

        // Abyss edge mist (few large circles)
        for (let i = 0; i < 5; i++) {
            const mx = margin + (i / 5) * (this.arenaW - margin * 2);
            const wobble = Math.sin(time / 2000 + i) * 10;
            this.abyssMist.fillStyle(mistColor, fogDensity);
            this.abyssMist.fillCircle(mx + wobble, this.arenaH - margin + 15, 26);
            this.abyssMist.fillCircle(mx - wobble, margin - 15, 20);
        }

        // Drifting near fog (2 wisps only)
        const nearFogAlpha = this.isFrenzy ? 0.025 : 0.015;
        for (let i = 0; i < 2; i++) {
            const fx = (time / 50 + i * 400) % (this.arenaW + 100) - 50;
            const fy = 100 + i * 200;
            this.fogNear.fillStyle(0x1a0030, nearFogAlpha);
            this.fogNear.fillCircle(fx, fy, 35);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // PARTICLES (Lightweight)
    // ═══════════════════════════════════════════════════════════════

    private setupParticles(): void {
        this.runeParticles = this.scene.add.particles(this.cx, this.cy, 'effect_particle', {
            x: { min: -40, max: 40 },
            y: { min: -40, max: 40 },
            speedY: { min: -8, max: -3 },
            speedX: { min: -2, max: 2 },
            scale: { start: 0.7, end: 0 },
            alpha: { start: 0.25, end: 0 },
            tint: [0x8e44ad, 0x5b2c6f],
            lifespan: 2500,
            quantity: 1,
            frequency: 600,
            blendMode: 'ADD'
        });
        this.runeParticles.setDepth(21);

        this.ashParticles = this.scene.add.particles(0, 0, 'effect_particle', {
            x: { min: 0, max: this.arenaW },
            y: { min: 0, max: this.arenaH },
            speedY: { min: -1, max: 1 },
            speedX: { min: -4, max: 4 },
            scale: { start: 0.5, end: 0 },
            alpha: { start: 0.12, end: 0 },
            tint: [0x4a4a5e, 0x3a3a4e],
            lifespan: 5000,
            quantity: 1,
            frequency: 1000,
            blendMode: 'ADD'
        });
        this.ashParticles.setDepth(145);
    }

    // ═══════════════════════════════════════════════════════════════
    // STATIC VIGNETTE (Rendered ONCE in constructor)
    // ═══════════════════════════════════════════════════════════════

    private setupStaticVignette(): void {
        this.vignetteOverlay = this.scene.add.graphics().setDepth(155);
        this.vignetteOverlay.fillStyle(0x000000, 0.08);
        this.vignetteOverlay.fillRect(0, 0, this.arenaW, 25);
        this.vignetteOverlay.fillRect(0, this.arenaH - 25, this.arenaW, 25);
        this.vignetteOverlay.fillRect(0, 0, 18, this.arenaH);
        this.vignetteOverlay.fillRect(this.arenaW - 18, 0, 18, this.arenaH);
    }

    // ═══════════════════════════════════════════════════════════════
    // DEBRIS (Phase 3 only)
    // ═══════════════════════════════════════════════════════════════

    private setupDebrisLayer(): void {
        this.debrisGraphics = this.scene.add.graphics().setDepth(22);
    }

    private updateDebris(_time: number, delta: number): void {
        if (this.currentPhase !== 'phase3' && !this.isFrenzy) {
            if (this.debrisChunks.length > 0) {
                this.debrisChunks = [];
                this.debrisGraphics.clear();
            }
            return;
        }

        this.debrisGraphics.clear();

        if (Math.random() < 0.01 && this.debrisChunks.length < 8) {
            this.debrisChunks.push({
                x: this.cx + (Math.random() - 0.5) * 400,
                y: this.cy + (Math.random() - 0.5) * 300,
                vy: -6 - Math.random() * 8,
                size: 3 + Math.random() * 4,
                rot: 0,
                alpha: 0.6
            });
        }

        for (let i = this.debrisChunks.length - 1; i >= 0; i--) {
            const d = this.debrisChunks[i];
            d.y += d.vy * delta / 1000;
            d.alpha -= 0.0003 * delta;

            if (d.alpha <= 0 || d.y < -10) {
                this.debrisChunks.splice(i, 1);
                continue;
            }

            this.debrisGraphics.fillStyle(0x1a1a2e, d.alpha);
            this.debrisGraphics.fillRect(d.x - d.size / 2, d.y - d.size / 2, d.size, d.size * 0.7);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // CRYSTAL BEAMS (Phase 2+ only)
    // ═══════════════════════════════════════════════════════════════

    private setupCrystalBeams(): void {
        this.crystalBeams = this.scene.add.graphics().setDepth(18);
    }

    private drawCrystalBeams(time: number): void {
        if (this.currentPhase === 'phase1') {
            this.crystalBeams.clear();
            return;
        }

        const activeCrystals = this.crystalPositions.filter(c => c.active);
        if (activeCrystals.length < 2) return;

        this.crystalBeams.clear();
        const beamAlpha = this.isFrenzy ? 0.08 : 0.04;
        const beamColor = this.currentPhase === 'phase2' ? 0x2ecc71 : 0x8e44ad;
        const pulse = Math.sin(time / 600) * 0.5 + 0.5;

        for (let i = 0; i < activeCrystals.length; i++) {
            const next = activeCrystals[(i + 1) % activeCrystals.length];
            const curr = activeCrystals[i];
            this.crystalBeams.lineStyle(1, beamColor, beamAlpha * pulse);
            this.crystalBeams.beginPath();
            this.crystalBeams.moveTo(curr.x, curr.y - 6);
            this.crystalBeams.lineTo(next.x, next.y - 6);
            this.crystalBeams.strokePath();
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // SKY RIFTS (Frenzy only)
    // ═══════════════════════════════════════════════════════════════

    private setupSkyRifts(): void {
        this.skyRifts = this.scene.add.graphics().setDepth(2);
    }

    private drawSkyRifts(time: number): void {
        if (!this.isFrenzy) return;
        this.skyRifts.clear();
        const rp = Math.sin(time / 400) * 0.3 + 0.7;

        this.skyRifts.lineStyle(2, 0x8e44ad, 0.12 * rp);
        this.skyRifts.beginPath();
        this.skyRifts.moveTo(80, 20);
        this.skyRifts.lineTo(120, 35);
        this.skyRifts.lineTo(150, 25);
        this.skyRifts.strokePath();
    }

    // ═══════════════════════════════════════════════════════════════
    // PHASE TRANSITIONS
    // ═══════════════════════════════════════════════════════════════

    public setPhase(phase: string): void {
        if (this.currentPhase === phase) return;
        this.currentPhase = phase;

        if (phase === 'phase2') this.transitionToPhase2();
        else if (phase === 'phase3') this.transitionToPhase3();
    }

    private transitionToPhase2(): void {
        for (const crystal of this.crystalPositions) crystal.active = true;
        this.pillarPositions[1].damaged = true;
        this.pillarPositions[5].damaged = true;
        this.drawPillars();

        this.scene.cameras.main.shake(200, 0.012);

        const flash = this.scene.add.graphics().setDepth(900);
        flash.fillStyle(0x2ecc71, 0.1);
        flash.fillRect(0, 0, this.arenaW, this.arenaH);
        this.scene.tweens.add({ targets: flash, alpha: 0, duration: 400, onComplete: () => flash.destroy() });

        this.runeParticles.setParticleTint(0x2ecc71);
        this.runeParticles.frequency = 400;
    }

    private transitionToPhase3(): void {
        for (const crystal of this.crystalPositions) crystal.overcharged = true;
        this.pillarPositions[0].damaged = true;
        this.pillarPositions[3].destroyed = true;
        this.pillarPositions[6].damaged = true;
        this.drawPillars();

        this.scene.cameras.main.shake(300, 0.018);

        const flash = this.scene.add.graphics().setDepth(900);
        flash.fillStyle(0x8e44ad, 0.12);
        flash.fillRect(0, 0, this.arenaW, this.arenaH);
        this.scene.tweens.add({ targets: flash, alpha: 0, duration: 600, onComplete: () => flash.destroy() });

        this.runeParticles.setParticleTint(0xff00ff);
        this.runeParticles.frequency = 300;
        this.ashParticles.frequency = 600;
    }

    public setFrenzy(enabled: boolean): void {
        if (this.isFrenzy === enabled) return;
        this.isFrenzy = enabled;

        if (enabled) {
            this.runeParticles.setParticleTint(0x00f5d4);
            this.runeParticles.frequency = 200;
            this.ashParticles.frequency = 400;
            this.ashParticles.setParticleTint(0x00f5d4);
            this.scene.cameras.main.shake(1000, 0.004);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // UPDATE LOOP (Highly Optimized)
    // ═══════════════════════════════════════════════════════════════

    public update(time: number, delta: number): void {
        this.animTick++;

        // Draw essential animated layers every frame
        this.drawRitualCircle(time);
        this.drawCandleFlames(time);

        // Update secondary effects every 2nd frame for 50% CPU savings
        if (this.animTick % 2 === 0) {
            this.drawActiveCrystals(time);
            this.drawCrystalBeams(time);
            this.drawFogLayers(time);
            this.updateDebris(time, delta * 2);
            this.drawSkyRifts(time);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // CLEANUP
    // ═══════════════════════════════════════════════════════════════

    public destroy(): void {
        this.abyssBg?.destroy();
        this.distantRuins?.destroy();
        this.moonGraphics?.destroy();
        this.platformEdge?.destroy();
        this.floorTiles?.destroy();
        this.floorDetails?.destroy();
        this.altarGraphics?.destroy();
        this.candleBodies?.destroy();
        this.staticCrystals?.destroy();
        this.staticChains?.destroy();
        this.vignetteOverlay?.destroy();
        this.ritualCircle?.destroy();
        this.runeGlyphs?.destroy();
        this.pillarGraphics?.destroy();
        this.activeCrystalGfx?.destroy();
        this.candleFlames?.destroy();
        this.abyssMist?.destroy();
        this.fogNear?.destroy();
        this.debrisGraphics?.destroy();
        this.crystalBeams?.destroy();
        this.skyRifts?.destroy();
        this.runeParticles?.destroy();
        this.ashParticles?.destroy();
    }
}
