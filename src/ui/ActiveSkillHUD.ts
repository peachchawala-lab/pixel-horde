import Phaser from 'phaser';
import { ActiveSkillDefs, ActiveSkillDef } from '../data/ActiveSkillData';
import { ActiveSkillManager } from '../managers/ActiveSkillManager';
import { AudioManager } from '../managers/AudioManager';
import { AudioKeys } from '../data/AudioData';

// ─── Slot Runtime State ──────────────────────────────────────────
interface SlotUI {
    def: ActiveSkillDef;
    container: Phaser.GameObjects.Container;
    bgGfx: Phaser.GameObjects.Graphics;
    iconImage: Phaser.GameObjects.Image;
    keycapGfx: Phaser.GameObjects.Graphics;
    keycapText: Phaser.GameObjects.Text;
    nameText: Phaser.GameObjects.Text;
    statusText: Phaser.GameObjects.Text;
    cdOverlayGfx: Phaser.GameObjects.Graphics;
    cdTimerText: Phaser.GameObjects.Text;
    flareGfx: Phaser.GameObjects.Graphics;
    gemImages?: Phaser.GameObjects.Image[];
    chargeLabel?: Phaser.GameObjects.Text;
    wasOnCooldown: boolean;
    lastStateKey?: string;
    lastCdTimerStr?: string;
}

interface MobileSlotUI {
    def: ActiveSkillDef;
    container: Phaser.GameObjects.Container;
    bgGfx: Phaser.GameObjects.Graphics;
    iconImage: Phaser.GameObjects.Image;
    keyText: Phaser.GameObjects.Text;
    cdTimerText: Phaser.GameObjects.Text;
    statusText: Phaser.GameObjects.Text;
    gemImages?: Phaser.GameObjects.Image[];
    wasOnCooldown: boolean;
}

// ─── Skill Color Themes & Sparkle Palettes ────────────────────────
const THEME: Record<string, {
    primary: number;
    glow: number;
    bright: number;
    textColor: string;
    particles: number[];
}> = {
    arcane_cleave: {
        primary: 0x00f5d4,
        glow: 0x00b4d8,
        bright: 0xffffff,
        textColor: '#00f5d4',
        particles: [0x00f5d4, 0x00b4d8, 0xffffff, 0xffd700, 0x80ffea]
    },
    soul_nova: {
        primary: 0xaf7ac5,
        glow: 0x8e44ad,
        bright: 0xd2b4de,
        textColor: '#e8d8f8',
        particles: [0xaf7ac5, 0x8e44ad, 0x00ffff, 0xffffff, 0xdf80ff]
    },
    crimson_vital: {
        primary: 0x2ecc71,
        glow: 0x27ae60,
        bright: 0xabebc6,
        textColor: '#2ecc71',
        particles: [0x2ecc71, 0x27ae60, 0xf1c40f, 0xffffff, 0x82e0aa, 0xff6b81]
    },
};

const THEME_DEPLETED = {
    primary: 0x922b21,
    glow: 0x641e16,
    bright: 0xe74c3c,
    textColor: '#e74c3c',
    particles: [0x922b21, 0x641e16, 0x555555]
};

const FONT_FAMILY = '"Segoe UI", -apple-system, BlinkMacSystemFont, Tahoma, Arial, sans-serif';

/**
 * ActiveSkillHUD — High-definition Dark Fantasy RPG Hotbar.
 *
 * Features:
 * - High-DPI crystal-clear typography (resolution: 2) with crisp outlines
 * - Layered metallic/glass slot frames with top specular gloss
 * - Vibrant 32x32 pixel-art icons with colored ambient back-auras
 * - Glowing 3D embossed keycaps ([Q], [E], [R])
 * - Multi-layered magical energy particle bursts on press (ละอองพลัง)
 * - Smooth vertical/radial cooldown sweep & large glowing countdown
 * - Animated glowing gem charge pips for Crimson Vital
 * - Camera-zoom compensation for 1:1 pixel perfection across all scenes
 */
export class ActiveSkillHUD {
    private scene: Phaser.Scene;
    private manager: ActiveSkillManager;
    private isMobile: boolean;

    private slots: SlotUI[] = [];
    private mobileSlots: MobileSlotUI[] = [];

    private readonly DEPTH = 2000;
    private readonly SLOT_W = 76;
    private readonly SLOT_H = 62;
    private readonly SLOT_GAP = 12;
    private readonly R = 6; // border radius

    constructor(scene: Phaser.Scene, manager: ActiveSkillManager) {
        this.scene = scene;
        this.manager = manager;
        this.isMobile = !scene.sys.game.device.os.desktop;

        this.createDesktopHUD();
        if (this.isMobile) {
            this.createMobileHUD();
        }

        // Apply camera-compensated layout
        this.updateLayout();
    }

    private getUIScale(): number {
        const zoom = this.scene.cameras.main.zoom || 1;
        return 1 / zoom;
    }

    // ═══════════════════════════════════════════════════════════════
    // LAYOUT CALCULATION (Camera Zoom Independent)
    // ═══════════════════════════════════════════════════════════════

    private updateLayout(): void {
        const cam = this.scene.cameras.main;
        const zoom = cam.zoom || 1;
        const uiScale = 1 / zoom;

        // Visible center of screen in camera coordinates
        const centerCamX = cam.width / 2;
        const centerCamY = cam.height / 2;

        // Visible bottom of screen in camera coordinates
        const bottomCamY = centerCamY + (cam.height / 2) / zoom;
        const cy = bottomCamY - (this.SLOT_H / 2 + 10) * uiScale;

        // Desktop layout
        const count = ActiveSkillDefs.length;
        const slotStep = (this.SLOT_W + this.SLOT_GAP) * uiScale;
        const totalW = (count * this.SLOT_W + (count - 1) * this.SLOT_GAP) * uiScale;
        const startX = centerCamX - totalW / 2 + (this.SLOT_W * uiScale) / 2;

        for (let i = 0; i < this.slots.length; i++) {
            const slot = this.slots[i];
            const cx = startX + i * slotStep;
            slot.container.setPosition(cx, cy);
            slot.container.setScale(uiScale);
        }

        // Mobile layout
        if (this.isMobile && this.mobileSlots.length > 0) {
            const btnR = 26;
            const rightCamX = centerCamX + (cam.width / 2) / zoom;
            const x = rightCamX - 45 * uiScale;
            const startY = bottomCamY - 70 * uiScale;
            const step = (btnR * 2 + 12) * uiScale;

            for (let i = 0; i < this.mobileSlots.length; i++) {
                const ms = this.mobileSlots[i];
                const y = startY - i * step;
                ms.container.setPosition(x, y);
                ms.container.setScale(uiScale);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // DESKTOP HUD CREATION
    // ═══════════════════════════════════════════════════════════════

    private createDesktopHUD(): void {
        const count = ActiveSkillDefs.length;

        for (let i = 0; i < count; i++) {
            const def = ActiveSkillDefs[i];
            const theme = THEME[def.id] || THEME.arcane_cleave;

            const container = this.scene.add.container(0, 0);
            container.setScrollFactor(0);
            container.setDepth(this.DEPTH);

            const hW = this.SLOT_W / 2;
            const hH = this.SLOT_H / 2;

            // 1. Background Graphics (layered panel)
            const bgGfx = this.scene.add.graphics();
            container.add(bgGfx);

            // 2. Skill Icon Image (32x32)
            const iconKey = this.iconKey(def.id);
            const iconY = def.maxCharges > 0 ? -7 : -2;
            const iconImage = this.scene.add.image(0, iconY, iconKey);
            iconImage.setDisplaySize(30, 30);
            container.add(iconImage);

            // 3. Cooldown Overlay Graphics
            const cdOverlayGfx = this.scene.add.graphics();
            container.add(cdOverlayGfx);

            // 4. Large High-DPI Cooldown Timer Text
            const cdTimerText = this.scene.add.text(0, iconY, '', {
                fontSize: '18px',
                fontFamily: FONT_FAMILY,
                fontStyle: '900',
                color: '#ffffff',
                stroke: '#c0392b',
                strokeThickness: 4,
                resolution: 2
            }).setOrigin(0.5).setVisible(false);
            container.add(cdTimerText);

            // 5. 3D Embossed Keycap Badge (Top Left)
            const keycapGfx = this.scene.add.graphics();
            container.add(keycapGfx);

            const keycapText = this.scene.add.text(-hW + 11, -hH + 9, def.key, {
                fontSize: '11px',
                fontFamily: FONT_FAMILY,
                fontStyle: '900',
                color: '#ffea00',
                stroke: '#000000',
                strokeThickness: 2.5,
                resolution: 2
            }).setOrigin(0.5);
            container.add(keycapText);

            // 6. Skill Name Text (Bottom) — Crystal Clear
            const nameText = this.scene.add.text(0, hH - 9, this.shortName(def.id), {
                fontSize: '9px',
                fontFamily: FONT_FAMILY,
                fontStyle: '900',
                color: theme.textColor,
                stroke: '#000000',
                strokeThickness: 3,
                resolution: 2
            }).setOrigin(0.5);
            container.add(nameText);

            // 7. Status text (EMPTY)
            const statusText = this.scene.add.text(0, hH - 18, '', {
                fontSize: '8px',
                fontFamily: FONT_FAMILY,
                fontStyle: '900',
                color: '#ff4d4d',
                stroke: '#2c0000',
                strokeThickness: 3,
                resolution: 2
            }).setOrigin(0.5).setVisible(false);
            container.add(statusText);

            // 8. Ready Flare Graphics Layer
            const flareGfx = this.scene.add.graphics();
            container.add(flareGfx);

            // 9. Gem Charge Pips (Only for Crimson Vital)
            let gemImages: Phaser.GameObjects.Image[] | undefined;
            let chargeLabel: Phaser.GameObjects.Text | undefined;

            if (def.maxCharges > 0) {
                gemImages = [];
                const gemY = 12;
                const gemSpacing = 13;
                const gemStartX = -(def.maxCharges - 1) * gemSpacing / 2;

                for (let g = 0; g < def.maxCharges; g++) {
                    const gem = this.scene.add.image(gemStartX + g * gemSpacing, gemY, 'gem_charge_active');
                    gem.setDisplaySize(11, 11);
                    container.add(gem);
                    gemImages.push(gem);
                }

                // Charge counter text (top right)
                chargeLabel = this.scene.add.text(hW - 13, -hH + 9, `${def.maxCharges}/${def.maxCharges}`, {
                    fontSize: '10px',
                    fontFamily: FONT_FAMILY,
                    fontStyle: '900',
                    color: '#2ecc71',
                    stroke: '#000000',
                    strokeThickness: 2.5,
                    resolution: 2
                }).setOrigin(0.5);
                container.add(chargeLabel);
            }

            // 10. Interactive hit zone with click & hover
            const hitZone = this.scene.add.zone(0, 0, this.SLOT_W, this.SLOT_H);
            hitZone.setInteractive({ useHandCursor: true });
            container.add(hitZone);

            hitZone.on('pointerover', () => {
                if (this.manager.isReady(def.id)) {
                    AudioManager.getInstance(this.scene.game).playSFX(AudioKeys.BUTTON_HOVER, { volume: 0.3 });
                    const uiScale = this.getUIScale();
                    this.scene.tweens.add({
                        targets: container,
                        scale: uiScale * 1.07,
                        duration: 90,
                        ease: 'Quad.easeOut'
                    });
                }
            });

            hitZone.on('pointerout', () => {
                const uiScale = this.getUIScale();
                this.scene.tweens.add({
                    targets: container,
                    scale: uiScale,
                    duration: 100,
                    ease: 'Quad.easeOut'
                });
            });

            hitZone.on('pointerdown', () => {
                const ok = this.manager.tryActivate(def.id);
                if (ok) {
                    this.playActivationEffects(container, def.id);
                } else {
                    this.manager.playErrorFeedback();
                    this.playRecoilShake(container);
                }
            });

            this.slots.push({
                def, container, bgGfx, iconImage,
                keycapGfx, keycapText, nameText, statusText,
                cdOverlayGfx, cdTimerText, flareGfx,
                gemImages, chargeLabel,
                wasOnCooldown: false
            });
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // MOBILE HUD CREATION
    // ═══════════════════════════════════════════════════════════════

    private createMobileHUD(): void {
        const btnR = 26;

        for (let i = 0; i < ActiveSkillDefs.length; i++) {
            const def = ActiveSkillDefs[i];

            const container = this.scene.add.container(0, 0);
            container.setScrollFactor(0);
            container.setDepth(this.DEPTH + 10);

            const bgGfx = this.scene.add.graphics();
            container.add(bgGfx);

            const iconKey = this.iconKey(def.id);
            const iconImage = this.scene.add.image(0, def.maxCharges > 0 ? -5 : 0, iconKey);
            iconImage.setDisplaySize(26, 26);
            container.add(iconImage);

            const keyText = this.scene.add.text(0, -btnR + 6, def.key, {
                fontSize: '11px',
                fontFamily: FONT_FAMILY,
                fontStyle: '900',
                color: '#ffd700',
                stroke: '#000000',
                strokeThickness: 2.5,
                resolution: 2
            }).setOrigin(0.5);
            container.add(keyText);

            const cdTimerText = this.scene.add.text(0, 0, '', {
                fontSize: '14px',
                fontFamily: FONT_FAMILY,
                fontStyle: '900',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4,
                resolution: 2
            }).setOrigin(0.5).setVisible(false);
            container.add(cdTimerText);

            const statusText = this.scene.add.text(0, btnR - 8, '', {
                fontSize: '8px',
                fontFamily: FONT_FAMILY,
                fontStyle: '900',
                color: '#ff4d4d',
                stroke: '#000000',
                strokeThickness: 2.5,
                resolution: 2
            }).setOrigin(0.5).setVisible(false);
            container.add(statusText);

            let gemImages: Phaser.GameObjects.Image[] | undefined;
            if (def.maxCharges > 0) {
                gemImages = [];
                for (let g = 0; g < def.maxCharges; g++) {
                    const gem = this.scene.add.image(-9 + g * 9, 14, 'gem_charge_active');
                    gem.setDisplaySize(8, 8);
                    container.add(gem);
                    gemImages.push(gem);
                }
            }

            // Touch interaction
            const touchZone = this.scene.add.circle(0, 0, btnR, 0x000000, 0.01);
            touchZone.setInteractive({ useHandCursor: true });
            container.add(touchZone);

            touchZone.on('pointerdown', () => {
                const ok = this.manager.tryActivate(def.id);
                if (ok) {
                    this.playActivationEffects(container, def.id);
                } else {
                    this.manager.playErrorFeedback();
                    this.playRecoilShake(container);
                }
            });

            this.mobileSlots.push({
                def, container, bgGfx, iconImage, keyText,
                cdTimerText, statusText, gemImages,
                wasOnCooldown: false,
            });
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // UPDATE TICK
    // ═══════════════════════════════════════════════════════════════

    public update(): void {
        const now = this.scene.time.now;

        // Ensure layout is always up-to-date with current camera zoom/size
        this.updateLayout();

        // ── Desktop slots ──
        for (const slot of this.slots) {
            this.updateDesktopSlot(slot, now);
        }

        // ── Mobile slots ──
        if (this.isMobile) {
            for (const ms of this.mobileSlots) {
                this.updateMobileSlot(ms, now);
            }
        }
    }

    private updateDesktopSlot(slot: SlotUI, _now: number): void {
        const { def } = slot;
        const isReady = this.manager.isReady(def.id);
        const state = this.manager.getState(def.id);
        const cdPct = this.manager.getCooldownPercent(def.id);
        const cdSec = this.manager.getCooldownSeconds(def.id);
        const charges = this.manager.getCharges(def.id);
        const hasCharges = def.maxCharges > 0;
        const depleted = hasCharges && charges <= 0;
        const casting = state === 'casting' || state === 'active';
        const theme = depleted ? THEME_DEPLETED : (THEME[def.id] || THEME.arcane_cleave);

        const hW = this.SLOT_W / 2;
        const hH = this.SLOT_H / 2;

        // ── 1. Background Panel with Glass & Bevel Frame (Cached) ──
        const stateKey = `${isReady}_${casting}_${depleted}`;
        if (slot.lastStateKey !== stateKey) {
            slot.lastStateKey = stateKey;
            slot.bgGfx.clear();

            // Outer drop shadow
            slot.bgGfx.fillStyle(0x000000, 0.45);
            slot.bgGfx.fillRoundedRect(-hW + 1, -hH + 2, this.SLOT_W, this.SLOT_H, this.R);

            // Panel fill
            const bgColor = depleted ? 0x180a0a : (casting ? 0x1a1236 : (!isReady ? 0x0c0f16 : 0x111622));
            slot.bgGfx.fillStyle(bgColor, 0.94);
            slot.bgGfx.fillRoundedRect(-hW, -hH, this.SLOT_W, this.SLOT_H, this.R);

            // Top specular glass shine (luxury feel)
            slot.bgGfx.fillStyle(0xffffff, isReady && !depleted ? 0.12 : 0.05);
            slot.bgGfx.fillRoundedRect(-hW + 2, -hH + 2, this.SLOT_W - 4, (this.SLOT_H - 4) / 2, { tl: this.R - 1, tr: this.R - 1, bl: 0, br: 0 });

            // Outer Borders & Glow
            if (isReady && !depleted) {
                slot.bgGfx.lineStyle(2.5, theme.glow, 0.7);
                slot.bgGfx.strokeRoundedRect(-hW - 1, -hH - 1, this.SLOT_W + 2, this.SLOT_H + 2, this.R + 1);

                // Rich Metallic Gold Bevel
                slot.bgGfx.lineStyle(1.8, 0xf1c40f, 0.95);
                slot.bgGfx.strokeRoundedRect(-hW, -hH, this.SLOT_W, this.SLOT_H, this.R);

                // Inner neon accent border
                slot.bgGfx.lineStyle(1, theme.primary, 0.6);
                slot.bgGfx.strokeRoundedRect(-hW + 1.5, -hH + 1.5, this.SLOT_W - 3, this.SLOT_H - 3, this.R - 1);
            } else if (casting) {
                slot.bgGfx.lineStyle(2.5, theme.primary, 1);
                slot.bgGfx.strokeRoundedRect(-hW, -hH, this.SLOT_W, this.SLOT_H, this.R);
            } else if (depleted) {
                slot.bgGfx.lineStyle(1.5, 0x78281f, 0.8);
                slot.bgGfx.strokeRoundedRect(-hW, -hH, this.SLOT_W, this.SLOT_H, this.R);
            } else {
                slot.bgGfx.lineStyle(1.2, 0x2c3e50, 0.7);
                slot.bgGfx.strokeRoundedRect(-hW, -hH, this.SLOT_W, this.SLOT_H, this.R);
            }

            // ── 2. 3D Embossed Keycap Badge (Cached) ──
            slot.keycapGfx.clear();
            const kcW = 16;
            const kcH = 13;
            const kcX = -hW + 3;
            const kcY = -hH + 3;

            // Keycap bottom bevel shadow
            slot.keycapGfx.fillStyle(0x0a0d12, 0.9);
            slot.keycapGfx.fillRoundedRect(kcX, kcY + 1, kcW, kcH, 2);

            // Keycap top face
            slot.keycapGfx.fillStyle(depleted ? 0x2a1010 : 0x1e242d, 0.95);
            slot.keycapGfx.fillRoundedRect(kcX, kcY, kcW, kcH - 1, 2);

            // Keycap border
            slot.keycapGfx.lineStyle(1, depleted ? 0x78281f : 0xd4ac0d, 0.85);
            slot.keycapGfx.strokeRoundedRect(kcX, kcY, kcW, kcH, 2);

            slot.keycapText.setColor(depleted ? '#78281f' : '#ffea00');
        }

        // ── 3. Skill Icon Visibility ──
        if (depleted) {
            slot.iconImage.setAlpha(0.25);
            slot.iconImage.setTint(0x444444);
        } else if (cdPct > 0) {
            slot.iconImage.setAlpha(0.45);
            slot.iconImage.clearTint();
        } else if (isReady) {
            slot.iconImage.setAlpha(1.0);
            slot.iconImage.clearTint();
        } else {
            slot.iconImage.setAlpha(0.7);
            slot.iconImage.clearTint();
        }

        // ── 4. Cooldown Overlay & High-Contrast Timer ──
        if (cdPct > 0 && !depleted) {
            slot.cdOverlayGfx.clear();
            const overlayH = (this.SLOT_H - 4) * cdPct;
            slot.cdOverlayGfx.fillStyle(0x000000, 0.65);
            slot.cdOverlayGfx.fillRect(-hW + 2, -hH + 2, this.SLOT_W - 4, overlayH);

            // Glowing sweep edge line
            slot.cdOverlayGfx.lineStyle(1.5, theme.primary, 0.9);
            const sweepY = -hH + 2 + overlayH;
            slot.cdOverlayGfx.beginPath();
            slot.cdOverlayGfx.moveTo(-hW + 2, sweepY);
            slot.cdOverlayGfx.lineTo(hW - 2, sweepY);
            slot.cdOverlayGfx.strokePath();

            // High-DPI decimal countdown
            const timeStr = `${cdSec.toFixed(1)}s`;
            if (slot.lastCdTimerStr !== timeStr) {
                slot.lastCdTimerStr = timeStr;
                slot.cdTimerText.setText(timeStr);
            }
            slot.cdTimerText.setVisible(true);

            slot.wasOnCooldown = true;
        } else {
            if (slot.wasOnCooldown) {
                slot.cdOverlayGfx.clear();
                slot.cdTimerText.setVisible(false);
                slot.wasOnCooldown = false;
                this.playReadyFlare(slot);
                AudioManager.getInstance(this.scene.game).playSFX(AudioKeys.SKILL_SELECT, { volume: 0.7, rate: 1.4 });
            }
        }

        // ── 5. Name and Status Labels ──
        if (depleted) {
            slot.statusText.setText('EMPTY');
            slot.statusText.setColor('#ff4d4d');
            slot.statusText.setVisible(true);
            slot.nameText.setColor('#78281f');
        } else if (isReady && cdPct <= 0) {
            slot.statusText.setVisible(false);
            slot.nameText.setColor(theme.textColor);
        } else {
            slot.statusText.setVisible(false);
            slot.nameText.setColor('#62727b');
        }

        // ── 6. Charge Gem Pips (Crimson Vital) ──
        if (hasCharges && slot.gemImages) {
            for (let g = 0; g < def.maxCharges; g++) {
                const gem = slot.gemImages[g];
                if (g < charges) {
                    gem.setTexture('gem_charge_active');
                    gem.setAlpha(1.0);
                } else {
                    gem.setTexture('gem_charge_empty');
                    gem.setAlpha(0.45);
                }
            }
            if (slot.chargeLabel) {
                if (depleted) {
                    slot.chargeLabel.setText('0/3');
                    slot.chargeLabel.setColor('#ff4d4d');
                } else {
                    slot.chargeLabel.setText(`${charges}/3`);
                    slot.chargeLabel.setColor(charges === 1 ? '#f39c12' : '#2ecc71');
                }
            }
        }
    }

    private updateMobileSlot(ms: MobileSlotUI, _now: number): void {
        const { def } = ms;
        const isReady = this.manager.isReady(def.id);
        const cdPct = this.manager.getCooldownPercent(def.id);
        const cdSec = this.manager.getCooldownSeconds(def.id);
        const charges = this.manager.getCharges(def.id);
        const hasCharges = def.maxCharges > 0;
        const depleted = hasCharges && charges <= 0;
        const theme = depleted ? THEME_DEPLETED : (THEME[def.id] || THEME.arcane_cleave);
        const btnR = 26;

        ms.bgGfx.clear();

        if (depleted) {
            ms.bgGfx.fillStyle(0x180a0a, 0.88);
            ms.bgGfx.fillCircle(0, 0, btnR);
            ms.bgGfx.lineStyle(1.5, 0x78281f, 0.8);
            ms.bgGfx.strokeCircle(0, 0, btnR);
        } else if (cdPct > 0) {
            ms.bgGfx.fillStyle(0x0c0f16, 0.88);
            ms.bgGfx.fillCircle(0, 0, btnR);
            ms.bgGfx.lineStyle(1.2, 0x2c3e50, 0.7);
            ms.bgGfx.strokeCircle(0, 0, btnR);

            // Radial cooldown arc
            ms.bgGfx.lineStyle(3, theme.primary, 0.8);
            ms.bgGfx.beginPath();
            const startAngle = -Math.PI / 2;
            const endAngle = startAngle + (1 - cdPct) * Math.PI * 2;
            ms.bgGfx.arc(0, 0, btnR - 2, startAngle, endAngle, false);
            ms.bgGfx.strokePath();
        } else if (isReady) {
            ms.bgGfx.fillStyle(0x111622, 0.92);
            ms.bgGfx.fillCircle(0, 0, btnR);
            ms.bgGfx.lineStyle(2.5, theme.glow, 0.85);
            ms.bgGfx.strokeCircle(0, 0, btnR);
            ms.bgGfx.lineStyle(1.2, 0xf1c40f, 0.9);
            ms.bgGfx.strokeCircle(0, 0, btnR - 1);
        } else {
            ms.bgGfx.fillStyle(0x0c0f16, 0.88);
            ms.bgGfx.fillCircle(0, 0, btnR);
            ms.bgGfx.lineStyle(1.2, 0x2c3e50, 0.7);
            ms.bgGfx.strokeCircle(0, 0, btnR);
        }

        if (depleted) {
            ms.iconImage.setAlpha(0.25);
            ms.iconImage.setTint(0x444444);
        } else if (cdPct > 0) {
            ms.iconImage.setAlpha(0.45);
            ms.iconImage.clearTint();
        } else {
            ms.iconImage.setAlpha(1.0);
            ms.iconImage.clearTint();
        }

        if (cdPct > 0 && !depleted) {
            const timeStr = `${cdSec.toFixed(1)}s`;
            ms.cdTimerText.setText(timeStr);
            ms.cdTimerText.setVisible(true);
            ms.wasOnCooldown = true;
        } else {
            ms.cdTimerText.setVisible(false);
            if (ms.wasOnCooldown) {
                ms.wasOnCooldown = false;
                AudioManager.getInstance(this.scene.game).playSFX(AudioKeys.SKILL_SELECT, { volume: 0.5, rate: 1.4 });
                const uiScale = this.getUIScale();
                this.scene.tweens.add({
                    targets: ms.container,
                    scale: uiScale * 1.14,
                    duration: 80,
                    yoyo: true,
                    ease: 'Back.easeOut'
                });
            }
        }

        if (depleted) {
            ms.statusText.setText('EMPTY');
            ms.statusText.setColor('#ff4d4d');
            ms.statusText.setVisible(true);
        } else {
            ms.statusText.setVisible(false);
        }

        if (hasCharges && ms.gemImages) {
            for (let g = 0; g < def.maxCharges; g++) {
                const gem = ms.gemImages[g];
                gem.setTexture(g < charges ? 'gem_charge_active' : 'gem_charge_empty');
                gem.setAlpha(g < charges ? 1.0 : 0.45);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // MAGICAL PARTICLE BURST ON PRESS (ละอองพลัง)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Spawns radiant energy sparkles, shockwaves, and button bounce on activation.
     */
    private playActivationEffects(container: Phaser.GameObjects.Container, skillId: string): void {
        const uiScale = this.getUIScale();
        const theme = THEME[skillId] || THEME.arcane_cleave;

        // 1. Button Press Bounce
        this.scene.tweens.add({
            targets: container,
            scale: uiScale * 0.90,
            duration: 45,
            yoyo: true,
            ease: 'Quad.easeInOut'
        });

        // 2. Inner Glowing Flash
        const flash = this.scene.add.graphics();
        flash.setScrollFactor(0);
        flash.setDepth(this.DEPTH + 15);
        flash.setPosition(container.x, container.y);
        flash.setScale(uiScale);
        flash.fillStyle(theme.primary, 0.5);
        flash.fillRoundedRect(-this.SLOT_W / 2, -this.SLOT_H / 2, this.SLOT_W, this.SLOT_H, this.R);

        this.scene.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 220,
            ease: 'Quad.easeOut',
            onComplete: () => flash.destroy()
        });

        // 3. Expanding Energy Shockwave Ring
        const ring = this.scene.add.graphics();
        ring.setScrollFactor(0);
        ring.setDepth(this.DEPTH + 14);
        ring.setPosition(container.x, container.y);
        ring.setScale(uiScale);

        ring.lineStyle(2.5, theme.primary, 0.95);
        ring.strokeRoundedRect(-this.SLOT_W / 2, -this.SLOT_H / 2, this.SLOT_W, this.SLOT_H, this.R);

        this.scene.tweens.add({
            targets: ring,
            scaleX: uiScale * 1.35,
            scaleY: uiScale * 1.35,
            alpha: 0,
            duration: 280,
            ease: 'Cubic.easeOut',
            onComplete: () => ring.destroy()
        });

        // 4. Radiant Magical Sparkle Particles Burst (ละอองพลัง)
        const particleCount = 18;
        const colors = theme.particles;

        for (let p = 0; p < particleCount; p++) {
            const angle = (Math.PI * 2 / particleCount) * p + (Math.random() - 0.5) * 0.5;
            const speed = (Phaser.Math.Between(45, 110)) * uiScale;
            const size = Phaser.Math.Between(3, 6);
            const color = colors[p % colors.length];

            const spark = this.scene.add.graphics();
            spark.setScrollFactor(0);
            spark.setDepth(this.DEPTH + 16);
            spark.setPosition(container.x, container.y);

            // Diamond/square sparkle
            spark.fillStyle(color, 1);
            spark.fillRect(-size / 2, -size / 2, size, size);

            // Spark core glint
            spark.fillStyle(0xffffff, 0.9);
            spark.fillRect(-size / 4, -size / 4, size / 2, size / 2);

            const destX = container.x + Math.cos(angle) * speed;
            const destY = container.y + Math.sin(angle) * speed;

            this.scene.tweens.add({
                targets: spark,
                x: destX,
                y: destY,
                scaleX: 0,
                scaleY: 0,
                alpha: 0,
                angle: Phaser.Math.Between(-180, 180),
                duration: Phaser.Math.Between(260, 420),
                ease: 'Cubic.easeOut',
                onComplete: () => spark.destroy()
            });
        }
    }

    /** Flash + pulse when cooldown completes */
    private playReadyFlare(slot: SlotUI): void {
        const g = slot.flareGfx;
        g.clear();
        g.setAlpha(1);

        const hW = this.SLOT_W / 2;
        const hH = this.SLOT_H / 2;

        g.lineStyle(2.5, 0xffffff, 1);
        g.strokeRoundedRect(-hW, -hH, this.SLOT_W, this.SLOT_H, this.R);
        g.fillStyle(0xffd700, 0.35);
        g.fillRoundedRect(-hW, -hH, this.SLOT_W, this.SLOT_H, this.R);

        this.scene.tweens.add({
            targets: g,
            alpha: 0,
            duration: 350,
            ease: 'Quad.easeOut',
            onComplete: () => g.clear()
        });

        const uiScale = this.getUIScale();
        this.scene.tweens.add({
            targets: slot.container,
            scale: uiScale * 1.10,
            duration: 100,
            yoyo: true,
            ease: 'Back.easeOut'
        });
    }

    /** Recoil shake for unavailable skill */
    private playRecoilShake(container: Phaser.GameObjects.Container): void {
        const ox = container.x;
        const uiScale = this.getUIScale();
        this.scene.tweens.add({
            targets: container,
            x: ox + 4 * uiScale,
            duration: 35,
            yoyo: true,
            repeat: 2,
            onComplete: () => { container.x = ox; }
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // PUBLIC FEEDBACK API
    // ═══════════════════════════════════════════════════════════════

    public notifyActivation(skillId: string): void {
        const slot = this.slots.find(s => s.def.id === skillId);
        if (slot) {
            this.playActivationEffects(slot.container, skillId);
        }
        if (this.isMobile) {
            const ms = this.mobileSlots.find(s => s.def.id === skillId);
            if (ms) {
                this.playActivationEffects(ms.container, skillId);
            }
        }
    }

    public notifyFailed(skillId: string): void {
        const slot = this.slots.find(s => s.def.id === skillId);
        if (slot) {
            this.playRecoilShake(slot.container);
        }
        if (this.isMobile) {
            const ms = this.mobileSlots.find(s => s.def.id === skillId);
            if (ms) {
                this.playRecoilShake(ms.container);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════════

    private iconKey(id: string): string {
        switch (id) {
            case 'arcane_cleave': return 'icon_skill_cleave';
            case 'soul_nova': return 'icon_skill_nova';
            case 'crimson_vital': return 'icon_skill_vital';
            default: return 'effect_particle';
        }
    }

    private shortName(id: string): string {
        switch (id) {
            case 'arcane_cleave': return 'CLEAVE';
            case 'soul_nova': return 'NOVA';
            case 'crimson_vital': return 'VITAL';
            default: return '';
        }
    }

    public destroy(): void {
        for (const s of this.slots) s.container.destroy();
        for (const m of this.mobileSlots) m.container.destroy();
    }
}
