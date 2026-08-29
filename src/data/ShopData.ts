import { SaveData } from '../managers/SaveManager';

export interface UpgradeConfig {
    id: keyof SaveData['upgrades'];
    name: string;
    icon: string;
    description: string;
    maxLevel: number;
    costs: number[]; // Index 0 = cost for Lv 1, index 4 = cost for Lv 5
    bonusPerLevel: number;
    unit: string;
}

export const META_UPGRADES: UpgradeConfig[] = [
    {
        id: 'maxHP',
        name: 'MAX VITALITY',
        icon: '❤️',
        description: 'Increases permanent Max HP',
        maxLevel: 5,
        costs: [100, 250, 500, 1000, 2000],
        bonusPerLevel: 10,
        unit: 'HP'
    },
    {
        id: 'attackDamage',
        name: 'MIGHT & POWER',
        icon: '⚔️',
        description: 'Increases permanent Attack Damage',
        maxLevel: 5,
        costs: [100, 250, 500, 1000, 2000],
        bonusPerLevel: 10,
        unit: '%'
    },
    {
        id: 'moveSpeed',
        name: 'SWIFT AGILITY',
        icon: '👟',
        description: 'Increases permanent Move Speed',
        maxLevel: 5,
        costs: [100, 250, 500, 1000, 2000],
        bonusPerLevel: 5,
        unit: '%'
    },
    {
        id: 'expGain',
        name: 'WISDOM SCHOLAR',
        icon: '📜',
        description: 'Increases permanent EXP gained',
        maxLevel: 5,
        costs: [100, 250, 500, 1000, 2000],
        bonusPerLevel: 10,
        unit: '%'
    }
];
