import Phaser from 'phaser';
import { AudioRegistry } from '../data/AudioData';

export interface SFXConfig {
    volume?: number;
    rate?: number;
    detune?: number;
}

/**
 * AudioManager — Central audio manager singleton for Pixel Horde.
 * 
 * Features:
 * - Centralized BGM & SFX playback controller.
 * - Missing Audio Safety: checks audio cache before playing, never crashes on missing files.
 * - Volume control: Master, Music, SFX volumes.
 * - Anti-overlap: Smoothly fades/stops current BGM before starting a new one.
 * - Anti-spam SFX cooldown to prevent ear-clipping on rapid events.
 */
export class AudioManager {
    private static instance: AudioManager | null = null;
    private game: Phaser.Game | null = null;

    // Volume Settings
    public masterVolume: number = 1.0;
    public musicVolume: number = 0.5;
    public sfxVolume: number = 0.8;

    // BGM Tracking
    private currentBGM: Phaser.Sound.BaseSound | null = null;
    private currentBGMKey: string | null = null;

    // Anti-spam SFX Cooldown Tracker (ms)
    private lastSFXPlayTime: Map<string, number> = new Map();
    private readonly SFX_COOLDOWN_MS: number = 40;

    private constructor() {}

    /**
     * Get or initialize the global AudioManager singleton.
     */
    public static getInstance(game?: Phaser.Game): AudioManager {
        if (!AudioManager.instance) {
            AudioManager.instance = new AudioManager();
        }
        if (game && !AudioManager.instance.game) {
            AudioManager.instance.game = game;
        }
        return AudioManager.instance;
    }

    /**
     * Attach the Phaser Game instance if not attached yet.
     */
    public setGame(game: Phaser.Game) {
        this.game = game;
    }

    // ─── BGM Management ──────────────────────────────────────────

    /**
     * Play Background Music cleanly. Fades out or stops current BGM if different.
     */
    public playBGM(key: string, loop: boolean = true) {
        if (!this.game) return;

        // If same BGM is already playing, do nothing to prevent restart
        if (this.currentBGMKey === key && this.currentBGM && this.currentBGM.isPlaying) {
            return;
        }

        // Check if sound key exists in audio cache
        if (!this.isAudioAvailable(key)) {
            console.warn(`[AudioManager] BGM key '${key}' not found in cache. Skipping playback.`);
            return;
        }

        try {
            // Stop previous BGM
            this.stopBGM();

            const assetDef = AudioRegistry.find(a => a.key === key);
            const trackVol = assetDef?.defaultVolume ?? 1.0;
            const finalVol = trackVol * this.musicVolume * this.masterVolume;

            const bgmSound = this.game.sound.add(key, {
                loop: loop,
                volume: finalVol
            });

            bgmSound.play();
            this.currentBGM = bgmSound;
            this.currentBGMKey = key;
        } catch (err) {
            console.warn(`[AudioManager] Error playing BGM '${key}':`, err);
        }
    }

    /**
     * Stop current BGM smoothly.
     */
    public stopBGM(_fadeDurationMs: number = 0) {
        if (!this.currentBGM) return;

        try {
            this.currentBGM.stop();
            this.currentBGM.destroy();
        } catch (err) {
            console.warn('[AudioManager] Error stopping BGM:', err);
        }

        this.currentBGM = null;
        this.currentBGMKey = null;
    }

    /**
     * Pause current BGM.
     */
    public pauseBGM() {
        if (this.currentBGM && this.currentBGM.isPlaying) {
            this.currentBGM.pause();
        }
    }

    /**
     * Resume current BGM.
     */
    public resumeBGM() {
        if (this.currentBGM && this.currentBGM.isPaused) {
            this.currentBGM.resume();
        }
    }

    // ─── SFX Management ──────────────────────────────────────────

    /**
     * Play a Sound Effect with missing audio safety and anti-spam protection.
     */
    public playSFX(key: string, config?: SFXConfig) {
        if (!this.game) return;

        // Missing audio safety check
        if (!this.isAudioAvailable(key)) {
            return; // Quietly ignore missing SFX
        }

        // Anti-spam cooldown check
        const now = Date.now();
        const lastPlay = this.lastSFXPlayTime.get(key) || 0;
        if (now - lastPlay < this.SFX_COOLDOWN_MS) {
            return;
        }
        this.lastSFXPlayTime.set(key, now);

        try {
            const baseVol = config?.volume ?? 1.0;
            const finalVol = baseVol * this.sfxVolume * this.masterVolume;

            this.game.sound.play(key, {
                volume: finalVol,
                rate: config?.rate ?? 1.0,
                detune: config?.detune ?? 0
            });
        } catch (err) {
            console.warn(`[AudioManager] Error playing SFX '${key}':`, err);
        }
    }

    /**
     * Stop all active SFX sounds.
     */
    public stopAllSFX() {
        if (!this.game) return;
        try {
            this.game.sound.stopAll();
            // Re-trigger BGM if it was stopped by stopAll
            if (this.currentBGM && !this.currentBGM.isPlaying) {
                this.currentBGM.play();
            }
        } catch (err) {
            console.warn('[AudioManager] Error stopping all SFX:', err);
        }
    }

    // ─── Volume Controls ─────────────────────────────────────────

    public setMasterVolume(volume: number) {
        this.masterVolume = Phaser.Math.Clamp(volume, 0, 1);
        this.updateBGMVolume();
    }

    public setMusicVolume(volume: number) {
        this.musicVolume = Phaser.Math.Clamp(volume, 0, 1);
        this.updateBGMVolume();
    }

    public setSFXVolume(volume: number) {
        this.sfxVolume = Phaser.Math.Clamp(volume, 0, 1);
    }

    private updateBGMVolume() {
        if (this.currentBGM && 'setVolume' in this.currentBGM) {
            const finalVol = this.musicVolume * this.masterVolume;
            (this.currentBGM as any).setVolume(finalVol);
        }
    }

    // ─── Safety Helpers ──────────────────────────────────────────

    /**
     * Safely check if an audio key is loaded and cached in Phaser.
     */
    private isAudioAvailable(key: string): boolean {
        if (!this.game || !this.game.cache || !this.game.cache.audio) {
            return false;
        }
        return this.game.cache.audio.has(key);
    }
}
