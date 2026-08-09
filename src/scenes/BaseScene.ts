import Phaser from 'phaser';

export class BaseScene extends Phaser.Scene {
    constructor(key: string) {
        super({ key });
    }

    create() {
        // Base create logic can go here
    }
}
