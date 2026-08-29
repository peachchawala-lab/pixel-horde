import { Player } from '../entities/player/Player';
import { CombatManager } from '../managers/CombatManager';
import { ExpManager } from '../managers/ExpManager';
import { HealthComponent } from '../components/HealthComponent';

/**
 * EvolutionDefinition — Data-driven definition for a Skill Evolution.
 * Evolutions are powerful combined effects unlocked when two base skills reach Lv 5.
 */
export interface EvolutionDefinition {
    id: string;
    name: string;
    icon: string;
    prereqs: {
        skillA: { id: string; level: number };
        skillB: { id: string; level: number };
    };
    description: string;
    apply: (player: Player, combatManager: CombatManager, expManager: ExpManager) => void;
}

/**
 * All Skill Evolution recipes.
 * Each evolution requires two specific base skills at the specified level.
 * Prerequisites are NOT consumed — they remain at Lv 5 after evolution.
 * Evolutions are run-scoped and reset every run.
 */
export const EvolutionData: EvolutionDefinition[] = [
    {
        id: 'evo_executioner',
        name: '⚡ Executioner',
        icon: '🗡️',
        prereqs: {
            skillA: { id: 'damage_up', level: 5 },      // Sharp Blade Lv 5
            skillB: { id: 'knockback_up', level: 5 }     // Heavy Blow Lv 5
        },
        description: '+40 Damage\n+300 Knockback\nDevastating strikes',
        apply: (_player, combatManager, _expManager) => {
            combatManager.baseDamage += 40;
            combatManager.knockbackForce += 300;
        }
    },
    {
        id: 'evo_lightning_speed',
        name: '⚡ Lightning Speed',
        icon: '⚡',
        prereqs: {
            skillA: { id: 'attack_speed_up', level: 5 }, // Haste Lv 5
            skillB: { id: 'move_speed_up', level: 5 }    // Swift Boots Lv 5
        },
        description: '-50% Attack Cooldown\n+50% Move Speed\nBlinding velocity',
        apply: (player, combatManager, _expManager) => {
            combatManager.attackCooldown = Math.max(100, combatManager.attackCooldown * 0.5);
            player.speed *= 1.5;
        }
    },
    {
        id: 'evo_deadly_precision',
        name: '⚡ Deadly Precision',
        icon: '🎯',
        prereqs: {
            skillA: { id: 'crit_chance_up', level: 5 },  // Eagle Eye Lv 5
            skillB: { id: 'crit_damage_up', level: 5 }   // Assassin Lv 5
        },
        description: '+25% Crit Chance\n+2.0x Crit Damage\nLethal accuracy',
        apply: (_player, combatManager, _expManager) => {
            combatManager.critChance += 0.25;
            combatManager.critDamageMult += 2.0;
        }
    },
    {
        id: 'evo_soul_collector',
        name: '⚡ Soul Collector',
        icon: '💀',
        prereqs: {
            skillA: { id: 'xp_magnet', level: 5 },       // Magnetic Field Lv 5
            skillB: { id: 'hp_up', level: 5 }             // Vitality Lv 5
        },
        description: '+120px Magnet Range\n+80 Max HP & Heal\nDrain the battlefield',
        apply: (player, _combatManager, expManager) => {
            // Increase magnet radius by 120px
            const currentRadius = Math.sqrt(expManager.magnetRadiusSq);
            const newRadius = currentRadius + 120;
            expManager.magnetRadiusSq = newRadius * newRadius;

            // +80 Max HP and full heal
            const hp = player.getComponent<HealthComponent>('HealthComponent');
            if (hp) {
                hp.maxHP += 80;
                hp.heal(80);
            }
        }
    },
    {
        id: 'evo_blood_edge',
        name: '⚡ Blood Edge',
        icon: '🩸',
        prereqs: {
            skillA: { id: 'damage_up', level: 5 },       // Sharp Blade Lv 5
            skillB: { id: 'crit_damage_up', level: 5 }   // Assassin Lv 5
        },
        description: '+35 Damage\n+1.5x Crit Damage\nBlades dripping crimson',
        apply: (_player, combatManager, _expManager) => {
            combatManager.baseDamage += 35;
            combatManager.critDamageMult += 1.5;
        }
    }
];
