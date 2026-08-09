import { IComponent } from './IComponent';

export class HealthComponent implements IComponent {
    public name = 'HealthComponent';
    public maxHP: number;
    public currentHP: number;

    constructor(maxHP: number) {
        this.maxHP = maxHP;
        this.currentHP = maxHP;
    }

    public update(_time: number, _delta: number) {}

    public takeDamage(amount: number) {
        this.currentHP -= amount;
        if (this.currentHP < 0) this.currentHP = 0;
    }

    public heal(amount: number) {
        this.currentHP += amount;
        if (this.currentHP > this.maxHP) this.currentHP = this.maxHP;
    }

    public isDead(): boolean {
        return this.currentHP <= 0;
    }

    public getHPPercentage(): number {
        return this.currentHP / this.maxHP;
    }

    public destroy() {}
}
