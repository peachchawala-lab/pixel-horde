import Phaser from 'phaser';
import { Enemy } from './Enemy';

export class Ghost extends Enemy {
    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'enemy_ghost', 20);
        this.speed = 70;
        this.damage = 15;
    }
}
