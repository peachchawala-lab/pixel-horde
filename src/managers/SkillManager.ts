import Phaser from 'phaser';
import { SkillData, SkillDefinition } from '../data/SkillData';
import { Player } from '../entities/player/Player';
import { CombatManager } from './CombatManager';
import { ExpManager } from './ExpManager';

export class SkillManager {
    public acquiredSkills: Map<string, number> = new Map();

    private player: Player;
    private combatManager: CombatManager;
    private expManager: ExpManager;

    constructor(player: Player, combatManager: CombatManager, expManager: ExpManager) {
        this.player = player;
        this.combatManager = combatManager;
        this.expManager = expManager;
    }

    public getChoices(count: number = 3): { skill: SkillDefinition, nextLevel: number }[] {
        // Filter out skills that are already at max level
        const availableSkills = SkillData.filter(skill => {
            const currentLevel = this.acquiredSkills.get(skill.id) || 0;
            return currentLevel < skill.maxLevel;
        });

        const shuffled = Phaser.Utils.Array.Shuffle([...availableSkills]);
        const choices = shuffled.slice(0, count);

        return choices.map(skill => {
            const currentLevel = this.acquiredSkills.get(skill.id) || 0;
            return {
                skill: skill,
                nextLevel: currentLevel + 1
            };
        });
    }

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
}
