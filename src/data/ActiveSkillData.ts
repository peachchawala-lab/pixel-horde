/**
 * ActiveSkillData — Data-driven definitions for player active abilities.
 * Values are centralized here so they can be balanced independently.
 */

export type ActiveSkillType = 'melee_aoe' | 'burst' | 'heal';

export interface ActiveSkillDef {
    id: string;
    name: string;
    key: string;                // Display key label ('Q','E','R')
    type: ActiveSkillType;
    cooldown: number;           // ms (0 for charge-based)
    damage: number;             // Base damage (0 for heals)
    damageScaleWithBase: boolean; // If true, multiply by combatManager.baseDamage ratio
    healPercent: number;        // % of maxHP to restore (0 for non-heals)
    maxCharges: number;         // 0 = unlimited (cooldown-based), >0 = charge-based
    radius: number;             // AoE radius in px
    castTime: number;           // ms before effect fires
    activeTime: number;         // ms the effect is active (projectiles travel, etc.)
    recoveryTime: number;       // ms after effect before player regains control
    projectileCount: number;    // For burst-type skills
    projectileSpeed: number;    // px/s
    description: string;
}

export const ActiveSkillDefs: ActiveSkillDef[] = [
    {
        id: 'arcane_cleave',
        name: 'Arcane Cleave',
        key: 'Q',
        type: 'melee_aoe',
        cooldown: 10000,
        damage: 60,
        damageScaleWithBase: true,
        healPercent: 0,
        maxCharges: 0,
        radius: 80,
        castTime: 150,
        activeTime: 100,
        recoveryTime: 200,
        projectileCount: 0,
        projectileSpeed: 0,
        description: 'Powerful circular sword slash'
    },
    {
        id: 'soul_nova',
        name: 'Soul Nova',
        key: 'E',
        type: 'burst',
        cooldown: 14000,
        damage: 40,
        damageScaleWithBase: true,
        healPercent: 0,
        maxCharges: 0,
        radius: 120,
        castTime: 400,
        activeTime: 200,
        recoveryTime: 300,
        projectileCount: 8,
        projectileSpeed: 200,
        description: 'Channeled magical explosion'
    },
    {
        id: 'crimson_vital',
        name: 'Crimson Vital',
        key: 'R',
        type: 'heal',
        cooldown: 0,
        damage: 0,
        damageScaleWithBase: false,
        healPercent: 0.35,
        maxCharges: 3,
        radius: 0,
        castTime: 500,
        activeTime: 300,
        recoveryTime: 200,
        projectileCount: 0,
        projectileSpeed: 0,
        description: 'Restore 35% Max HP (3 charges per run)'
    }
];

export function getActiveSkillDef(id: string): ActiveSkillDef | undefined {
    return ActiveSkillDefs.find(s => s.id === id);
}
