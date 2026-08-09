import { BaseScene } from './BaseScene';

export class BootScene extends BaseScene {
    constructor() {
        super('BootScene');
    }

    preload() {
        // Load minimal assets needed for PreloadScene (e.g., loading bar graphics)
    }

    create() {
        super.create();
        console.log('BootScene: Starting PreloadScene');
        this.scene.start('PreloadScene');
    }
}
