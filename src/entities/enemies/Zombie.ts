import Phaser from 'phaser';
import { Enemy } from './Enemy';

export class Zombie extends Enemy {
    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'enemy_zombie', 30);
        this.speed = 50;
        this.damage = 10;
    }
}
