import Phaser from 'phaser';
import { Enemy } from './Enemy';

export class Slime extends Enemy {
    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'enemy_slime', 50);
        this.speed = 30;
        this.damage = 20;
    }
}
