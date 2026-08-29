import Phaser from 'phaser';
import { IComponent } from './IComponent';

export class ExperienceComponent implements IComponent {
    public name = 'ExperienceComponent';
    
    public level: number = 1;
    public currentExp: number = 0;
    public expToNextLevel: number = 10;
    public expMultiplier: number = 1.0;
    
    private scene: Phaser.Scene;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    public update(_time: number, _delta: number) {}

    public addExp(amount: number) {
        const actualExp = Math.round(amount * this.expMultiplier);
        this.currentExp += actualExp;
        
        // Check for level up
        if (this.currentExp >= this.expToNextLevel) {
            this.levelUp();
        }
        
        // Emit event for UI to update
        this.scene.events.emit('exp-changed', this.currentExp, this.expToNextLevel, this.level);
    }

    private levelUp() {
        this.currentExp -= this.expToNextLevel;
        this.level++;
        
        // Simple linear/exponential scaling for next level
        this.expToNextLevel = Math.floor(this.expToNextLevel * 1.5);
        
        // Emit level up event (GameScene will listen to this to pause and show UI)
        this.scene.events.emit('level-up', this.level);
        
        // Recursively check if we gained enough exp to level up multiple times
        if (this.currentExp >= this.expToNextLevel) {
            this.levelUp();
        }
    }

    public destroy() {}
}
