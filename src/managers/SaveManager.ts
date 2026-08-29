/**
 * SaveManager — Handles persistent save data in localStorage for Pixel Horde.
 * Manages permanent Gold balance and Meta Upgrades with fallback safety.
 */

export interface SaveData {
    gold: number;
    upgrades: {
        maxHP: number;       // Level 0 to 5
        attackDamage: number;// Level 0 to 5
        moveSpeed: number;   // Level 0 to 5
        expGain: number;     // Level 0 to 5
    };
}

const SAVE_KEY = 'PIXEL_HORDE_SAVE_V1';

export class SaveManager {
    private static currentData: SaveData | null = null;

    /**
     * Load save data safely from localStorage. Falls back to defaults if missing or corrupt.
     */
    public static load(forceReload: boolean = false): SaveData {
        if (this.currentData && !forceReload) return this.currentData;

        try {
            const raw = localStorage.getItem(SAVE_KEY);
            if (!raw) {
                this.currentData = {
                    gold: 0,
                    upgrades: { maxHP: 0, attackDamage: 0, moveSpeed: 0, expGain: 0 }
                };
                // Store initial default save
                try {
                    localStorage.setItem(SAVE_KEY, JSON.stringify(this.currentData));
                } catch (_) {}
                return this.currentData;
            }

            const parsed = JSON.parse(raw);
            this.currentData = {
                gold: typeof parsed?.gold === 'number' && !isNaN(parsed.gold) ? Math.max(0, Math.floor(parsed.gold)) : 0,
                upgrades: {
                    maxHP: this.clampLevel(parsed?.upgrades?.maxHP),
                    attackDamage: this.clampLevel(parsed?.upgrades?.attackDamage),
                    moveSpeed: this.clampLevel(parsed?.upgrades?.moveSpeed),
                    expGain: this.clampLevel(parsed?.upgrades?.expGain)
                }
            };
            console.log(`[SaveManager] Save loaded (${window.location.origin}):`, this.currentData);
        } catch (err) {
            console.warn('[SaveManager] Failed to parse save data from localStorage. Using default fallback.', err);
            this.currentData = {
                gold: 0,
                upgrades: { maxHP: 0, attackDamage: 0, moveSpeed: 0, expGain: 0 }
            };
        }

        return this.currentData;
    }

    /**
     * Save data to localStorage safely. Ensures load() runs first if currentData is null to avoid overwriting existing save with defaults.
     */
    public static save(data?: SaveData): void {
        const toSave = data || this.currentData || this.load();
        this.currentData = toSave;
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify(toSave));
            console.log(`[SaveManager] Save written (${window.location.origin}):`, toSave);
        } catch (err) {
            console.warn('[SaveManager] Failed to write save to localStorage.', err);
        }
    }

    /**
     * Get current permanent Gold balance.
     */
    public static getGold(): number {
        return this.load().gold;
    }

    /**
     * Add Gold to permanent balance and save.
     */
    public static addGold(amount: number): number {
        const data = this.load();
        data.gold = Math.max(0, data.gold + Math.floor(amount));
        this.save(data);
        return data.gold;
    }

    /**
     * Deduct Gold from permanent balance if sufficient.
     */
    public static spendGold(amount: number): boolean {
        const data = this.load();
        if (data.gold >= amount) {
            data.gold -= amount;
            this.save(data);
            return true;
        }
        return false;
    }

    /**
     * Get upgrade level (0 to 5) for a specific upgrade key.
     */
    public static getUpgradeLevel(key: keyof SaveData['upgrades']): number {
        const data = this.load();
        return data.upgrades[key] || 0;
    }

    /**
     * Set upgrade level and save.
     */
    public static setUpgradeLevel(key: keyof SaveData['upgrades'], level: number): void {
        const data = this.load();
        data.upgrades[key] = this.clampLevel(level);
        this.save(data);
    }

    private static clampLevel(val: any): number {
        if (typeof val !== 'number' || isNaN(val)) return 0;
        return Math.max(0, Math.min(5, Math.floor(val)));
    }
}
