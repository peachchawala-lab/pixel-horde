import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';
import { LevelUpScene } from './scenes/LevelUpScene';
import { BossScene } from './scenes/BossScene';
import { ResultScene } from './scenes/ResultScene';
import { ShopScene } from './scenes/ShopScene';
import { GameConfig } from './config/game.config';

export class Game extends Phaser.Game {
    constructor() {
        const config: Phaser.Types.Core.GameConfig = {
            ...GameConfig,
            scene: [
                BootScene,
                PreloadScene,
                MainMenuScene,
                GameScene,
                UIScene,
                LevelUpScene,
                BossScene,
                ResultScene,
                ShopScene
            ]
        };
        super(config);
    }
}
