import Phaser from 'phaser';
import { Enemy } from './Enemy';

export class Bat extends Enemy {
    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'enemy_bat', 10);
        this.speed = 100;
        this.damage = 5;
    }
}
