import { Player } from '../entities/player/Player';
import { CombatManager } from '../managers/CombatManager';
import { ExpManager } from '../managers/ExpManager';
import { HealthComponent } from '../components/HealthComponent';

export interface SkillDefinition {
    id: string;
    name: string;
    maxLevel: number;
    description: (level: number) => string;
    apply: (player: Player, combatManager: CombatManager, expManager: ExpManager, level: number) => void;
}

export const SkillData: SkillDefinition[] = [
    {
        id: 'damage_up',
        name: 'Sharp Blade',
        maxLevel: 5,
        description: (level) => `+5 Base Damage\n(Lv ${level})`,
        apply: (_player, combatManager, _expManager, _level) => {
            combatManager.baseDamage += 5;
        }
    },
    {
        id: 'attack_speed_up',
        name: 'Haste',
        maxLevel: 5,
        description: (level) => `-10% Attack Cooldown\n(Lv ${level})`,
        apply: (_player, combatManager, _expManager, _level) => {
            combatManager.attackCooldown = Math.max(200, combatManager.attackCooldown * 0.9);
        }
    },
    {
        id: 'move_speed_up',
        name: 'Swift Boots',
        maxLevel: 5,
        description: (level) => `+10% Movement Speed\n(Lv ${level})`,
        apply: (player, _combatManager, _expManager, _level) => {
            player.speed *= 1.1;
        }
    },
    {
        id: 'crit_chance_up',
        name: 'Eagle Eye',
        maxLevel: 5,
        description: (level) => `+10% Crit Chance\n(Lv ${level})`,
        apply: (_player, combatManager, _expManager, _level) => {
            combatManager.critChance += 0.1;
        }
    },
    {
        id: 'crit_damage_up',
        name: 'Assassin',
        maxLevel: 5,
        description: (level) => `+0.5x Crit Damage\n(Lv ${level})`,
        apply: (_player, combatManager, _expManager, _level) => {
            combatManager.critDamageMult += 0.5;
        }
    },
    {
        id: 'xp_magnet',
        name: 'Magnetic Field',
        maxLevel: 5,
        description: (level) => `+20px Magnet Radius\n(Lv ${level})`,
        apply: (_player, _combatManager, expManager, _level) => {
            const currentRadius = Math.sqrt(expManager.magnetRadiusSq);
            const newRadius = currentRadius + 20;
            expManager.magnetRadiusSq = newRadius * newRadius;
        }
    },
    {
        id: 'hp_up',
        name: 'Vitality',
        maxLevel: 5,
        description: (level) => `+20 Max HP and Heal\n(Lv ${level})`,
        apply: (player, _combatManager, _expManager, _level) => {
            const hp = player.getComponent<HealthComponent>('HealthComponent');
            if (hp) {
                hp.maxHP += 20;
                hp.heal(20);
            }
        }
    },
    {
        id: 'knockback_up',
        name: 'Heavy Blow',
        maxLevel: 5,
        description: (level) => `+50 Knockback Force\n(Lv ${level})`,
        apply: (_player, combatManager, _expManager, _level) => {
            combatManager.knockbackForce += 50;
        }
    }
];
