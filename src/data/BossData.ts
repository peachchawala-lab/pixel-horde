export type BossPhase = 'idle' | 'phase1' | 'phase2' | 'phase3' | 'transition' | 'dead';

export interface BossPatternConfig {
    name: string;
    cooldown: number;
    execute: () => void;
}

export interface BossPhaseConfig {
    hpThreshold: number;       // e.g. 1.0 = 100%, 0.6 = 60%
    patterns: BossPatternConfig[];
}

export interface BossDefinition {
    id: string;
    name: string;
    texture: string;
    baseHP: number;
    hpScalePerLevel: number;   // extra HP per player level
    speed: number;
    expReward: number;
    phases: BossPhaseConfig[];
}

// Boss data registry — add new bosses here
export const BossRegistry: Record<string, BossDefinition> = {
    necromancer: {
        id: 'necromancer',
        name: 'The Necromancer',
        texture: 'boss_necromancer',
        baseHP: 1200,
        hpScalePerLevel: 100,
        speed: 55,
        expReward: 50,
        phases: [
            {
                hpThreshold: 1.0,
                patterns: []   // patterns injected by the concrete boss class
            },
            {
                hpThreshold: 0.6,
                patterns: []
            },
            {
                hpThreshold: 0.25,
                patterns: []
            }
        ]
    }
};
