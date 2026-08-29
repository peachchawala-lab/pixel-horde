/**
 * Centralized Audio Registry and Keys for Pixel Horde.
 * Prevents hardcoding audio file paths throughout the project.
 */
export const AudioKeys = {
    // BGMs
    BGM_MENU: 'bgm_menu',
    BGM_GAMEPLAY: 'bgm_gameplay',
    BGM_BOSS: 'bgm_boss',
    BGM_VICTORY: 'bgm_victory',
    BGM_GAME_OVER: 'bgm_gameover',

    // Gameplay SFX
    PLAYER_ATTACK: 'sfx_player_attack',
    ENEMY_HIT: 'sfx_enemy_hit',
    ENEMY_DEATH: 'sfx_enemy_death',
    EXP_PICKUP: 'sfx_exp_pickup',

    // UI & Level Up SFX
    LEVEL_UP: 'sfx_level_up',
    SKILL_SELECT: 'sfx_skill_select',
    SKILL_EVOLVE: 'sfx_skill_evolve',
    BUTTON_HOVER: 'sfx_button_hover',
    BUTTON_CLICK: 'sfx_button_click',

    // Boss SFX
    BOSS_ATTACK: 'sfx_boss_attack',
    BOSS_PHASE: 'sfx_boss_phase',
    BOSS_DEFEATED: 'sfx_boss_defeated',

    // Result SFX
    VICTORY_SFX: 'sfx_victory',
    GAME_OVER_SFX: 'sfx_game_over'
} as const;

export type AudioKeyType = typeof AudioKeys[keyof typeof AudioKeys];

export interface AudioAssetDefinition {
    key: string;
    path: string;
    type: 'bgm' | 'sfx';
    defaultVolume?: number;
}

export const AudioRegistry: AudioAssetDefinition[] = [
    // BGMs
    { key: AudioKeys.BGM_MENU, path: 'assets/audio/bgm/bgm_menu.wav', type: 'bgm', defaultVolume: 0.35 },
    { key: AudioKeys.BGM_GAMEPLAY, path: 'assets/audio/bgm/bgm_gameplay.wav', type: 'bgm', defaultVolume: 0.6 },
    { key: AudioKeys.BGM_BOSS, path: 'assets/audio/bgm/bgm_boss.wav', type: 'bgm', defaultVolume: 0.95 },
    { key: AudioKeys.BGM_VICTORY, path: 'assets/audio/bgm/bgm_victory.wav', type: 'bgm', defaultVolume: 0.7 },
    { key: AudioKeys.BGM_GAME_OVER, path: 'assets/audio/bgm/bgm_gameover.wav', type: 'bgm', defaultVolume: 0.7 },

    // Gameplay SFX
    { key: AudioKeys.PLAYER_ATTACK, path: 'assets/audio/sfx/sfx_player_attack.wav', type: 'sfx', defaultVolume: 0.6 },
    { key: AudioKeys.ENEMY_HIT, path: 'assets/audio/sfx/sfx_enemy_hit.wav', type: 'sfx', defaultVolume: 0.5 },
    { key: AudioKeys.ENEMY_DEATH, path: 'assets/audio/sfx/sfx_enemy_death.wav', type: 'sfx', defaultVolume: 0.7 },
    { key: AudioKeys.EXP_PICKUP, path: 'assets/audio/sfx/sfx_exp_pickup.wav', type: 'sfx', defaultVolume: 0.5 },

    // UI & Level Up SFX
    { key: AudioKeys.LEVEL_UP, path: 'assets/audio/sfx/sfx_level_up.wav', type: 'sfx', defaultVolume: 0.8 },
    { key: AudioKeys.SKILL_SELECT, path: 'assets/audio/sfx/sfx_skill_select.wav', type: 'sfx', defaultVolume: 0.8 },
    { key: AudioKeys.SKILL_EVOLVE, path: 'assets/audio/sfx/sfx_skill_evolve.wav', type: 'sfx', defaultVolume: 1.0 },
    { key: AudioKeys.BUTTON_HOVER, path: 'assets/audio/sfx/sfx_button_hover.wav', type: 'sfx', defaultVolume: 0.4 },
    { key: AudioKeys.BUTTON_CLICK, path: 'assets/audio/sfx/sfx_button_click.wav', type: 'sfx', defaultVolume: 0.7 },

    // Boss SFX
    { key: AudioKeys.BOSS_ATTACK, path: 'assets/audio/sfx/sfx_boss_attack.wav', type: 'sfx', defaultVolume: 0.8 },
    { key: AudioKeys.BOSS_PHASE, path: 'assets/audio/sfx/sfx_boss_phase.wav', type: 'sfx', defaultVolume: 0.9 },
    { key: AudioKeys.BOSS_DEFEATED, path: 'assets/audio/sfx/sfx_boss_defeated.wav', type: 'sfx', defaultVolume: 1.0 },

    // Result SFX
    { key: AudioKeys.VICTORY_SFX, path: 'assets/audio/sfx/sfx_victory.wav', type: 'sfx', defaultVolume: 0.9 },
    { key: AudioKeys.GAME_OVER_SFX, path: 'assets/audio/sfx/sfx_game_over.wav', type: 'sfx', defaultVolume: 0.9 }
];
