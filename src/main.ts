import { Game } from './Game';
import { AudioManager } from './managers/AudioManager';

window.addEventListener('load', () => {
    const game = new Game();
    (window as any).game = game;
    AudioManager.getInstance(game);
});
