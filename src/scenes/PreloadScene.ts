import { BaseScene } from './BaseScene';
import { AssetLoader } from '../utils/AssetLoader';

export class PreloadScene extends BaseScene {
    private loadingText?: Phaser.GameObjects.Text;

    constructor() {
        super('PreloadScene');
    }

    preload() {
        const { width, height } = this.scale;
        
        this.loadingText = this.add.text(width / 2, height / 2, 'Loading...', {
            fontSize: '24px',
            color: '#ffffff'
        }).setOrigin(0.5);

        this.load.on('progress', (value: number) => {
            if (this.loadingText) {
                this.loadingText.setText(`Loading... ${Math.floor(value * 100)}%`);
            }
        });

        AssetLoader.loadAssets(this);
    }

    create() {
        super.create();
        console.log('PreloadScene: Starting MainMenuScene');
        this.scene.start('MainMenuScene');
    }
}
