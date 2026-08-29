import Phaser from 'phaser';
import { SkillData, SkillDefinition } from '../data/SkillData';
import { EvolutionData, EvolutionDefinition } from '../data/EvolutionData';
import { Player } from '../entities/player/Player';
import { CombatManager } from './CombatManager';
import { ExpManager } from './ExpManager';

/**
 * A level-up choice is either a normal skill upgrade or a skill evolution.
 * Discriminated union via the `type` field.
 */
export type SkillChoice = {
    type: 'skill';
    skill: SkillDefinition;
    nextLevel: number;
};

export type EvolutionChoice = {
    type: 'evolution';
    evolution: EvolutionDefinition;
};

export type LevelUpChoice = SkillChoice | EvolutionChoice;

/**
 * SkillManager — Manages run-scoped skill acquisition and evolution tracking.
 *
 * Base skills are leveled 1–5 via the Level Up screen.
 * When two specific base skills are both at their required level,
 * the corresponding Evolution becomes eligible and appears as a special choice.
 * Evolutions are acquired once per run, and prerequisites are kept at Lv 5.
 */
export class SkillManager {
    public acquiredSkills: Map<string, number> = new Map();
    public acquiredEvolutions: Set<string> = new Set();

    private player: Player;
    private combatManager: CombatManager;
    private expManager: ExpManager;

    constructor(player: Player, combatManager: CombatManager, expManager: ExpManager) {
        this.player = player;
        this.combatManager = combatManager;
        this.expManager = expManager;
    }

    /**
     * Update target references when switching active scene (e.g. entering BossScene).
     */
    public updateReferences(player: Player, combatManager: CombatManager, expManager: ExpManager) {
        this.player = player;
        this.combatManager = combatManager;
        this.expManager = expManager;
    }

    // ─── Evolution Eligibility ───────────────────────────────────

    /**
     * Returns all evolutions whose prerequisites are met and that
     * have not already been acquired this run.
     */
    public getAvailableEvolutions(): EvolutionDefinition[] {
        return EvolutionData.filter(evo => {
            // Already acquired this run?
            if (this.acquiredEvolutions.has(evo.id)) return false;

            // Check both prerequisites
            const levelA = this.acquiredSkills.get(evo.prereqs.skillA.id) || 0;
            const levelB = this.acquiredSkills.get(evo.prereqs.skillB.id) || 0;

            return levelA >= evo.prereqs.skillA.level &&
                   levelB >= evo.prereqs.skillB.level;
        });
    }

    // ─── Level Up Choices ────────────────────────────────────────

    /**
     * Build an array of up to `count` level-up choices.
     *
     * Rules:
     * - Eligible evolutions have higher priority (appear first).
     * - At most ONE evolution per level-up to avoid overwhelming the player.
     * - Remaining slots filled with normal base skill upgrades.
     * - Never shows duplicates.
     * - Never shows evolutions whose prerequisites are not met.
     * - Never shows already-acquired evolutions.
     */
    public getChoices(count: number = 3): LevelUpChoice[] {
        const choices: LevelUpChoice[] = [];

        // 1. Check for eligible evolutions (add at most 1)
        const availableEvos = this.getAvailableEvolutions();
        if (availableEvos.length > 0) {
            // Pick one random eligible evolution
            const randomEvo = Phaser.Utils.Array.GetRandom(availableEvos);
            choices.push({
                type: 'evolution',
                evolution: randomEvo
            });
        }

        // 2. Fill remaining slots with normal base skills
        const slotsRemaining = count - choices.length;
        if (slotsRemaining > 0) {
            const availableSkills = SkillData.filter(skill => {
                const currentLevel = this.acquiredSkills.get(skill.id) || 0;
                return currentLevel < skill.maxLevel;
            });

            const shuffled = Phaser.Utils.Array.Shuffle([...availableSkills]);
            const skillChoices = shuffled.slice(0, slotsRemaining);

            for (const skill of skillChoices) {
                const currentLevel = this.acquiredSkills.get(skill.id) || 0;
                choices.push({
                    type: 'skill',
                    skill: skill,
                    nextLevel: currentLevel + 1
                });
            }
        }

        return choices;
    }

    // ─── Skill Selection ─────────────────────────────────────────

    /**
     * Select and apply a base skill upgrade.
     */
    public selectSkill(skillId: string) {
        const skill = SkillData.find(s => s.id === skillId);
        if (!skill) return;

        const currentLevel = this.acquiredSkills.get(skillId) || 0;
        const nextLevel = currentLevel + 1;
        
        if (nextLevel > skill.maxLevel) return;

        this.acquiredSkills.set(skillId, nextLevel);
        skill.apply(this.player, this.combatManager, this.expManager, nextLevel);
        
        console.log(`Skill Selected: ${skill.name} Lv ${nextLevel}`);
    }

    // ─── Evolution Selection ─────────────────────────────────────

    /**
     * Select and apply a skill evolution.
     * Prerequisites are NOT consumed — they stay at Lv 5.
     * The evolution is marked as acquired and cannot be obtained again this run.
     */
    public selectEvolution(evolutionId: string): boolean {
        const evo = EvolutionData.find(e => e.id === evolutionId);
        if (!evo) return false;

        // Prevent duplicate acquisition
        if (this.acquiredEvolutions.has(evolutionId)) return false;

        // Verify prerequisites are still met
        const levelA = this.acquiredSkills.get(evo.prereqs.skillA.id) || 0;
        const levelB = this.acquiredSkills.get(evo.prereqs.skillB.id) || 0;
        if (levelA < evo.prereqs.skillA.level || levelB < evo.prereqs.skillB.level) {
            return false;
        }

        // Apply evolution effect
        evo.apply(this.player, this.combatManager, this.expManager);
        this.acquiredEvolutions.add(evolutionId);

        console.log(`⚡ EVOLUTION ACQUIRED: ${evo.name}`);
        return true;
    }
}
