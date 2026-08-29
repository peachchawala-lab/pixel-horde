import Phaser from 'phaser';
import { VirtualJoystick } from '../ui/VirtualJoystick';

export class InputManager {
    private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    private wasdKeys: any;
    private abilityKeys: any;
    private joystick?: VirtualJoystick;
    private movementVector: Phaser.Math.Vector2;

    constructor(scene: Phaser.Scene) {
        this.movementVector = new Phaser.Math.Vector2();

        if (scene.input.keyboard) {
            this.cursors = scene.input.keyboard.createCursorKeys();
            this.wasdKeys = scene.input.keyboard.addKeys('W,A,S,D');
            this.abilityKeys = scene.input.keyboard.addKeys('Q,E,R');
        } else {
            this.cursors = {} as Phaser.Types.Input.Keyboard.CursorKeys;
            this.wasdKeys = {};
            this.abilityKeys = {};
        }

        const { height } = scene.scale;
        this.joystick = new VirtualJoystick(scene, 100, height - 100);
    }

    public update() {
        this.movementVector.set(0, 0);

        if (this.cursors.left?.isDown || this.wasdKeys.A?.isDown) {
            this.movementVector.x = -1;
        } else if (this.cursors.right?.isDown || this.wasdKeys.D?.isDown) {
            this.movementVector.x = 1;
        }

        if (this.cursors.up?.isDown || this.wasdKeys.W?.isDown) {
            this.movementVector.y = -1;
        } else if (this.cursors.down?.isDown || this.wasdKeys.S?.isDown) {
            this.movementVector.y = 1;
        }

        if (this.movementVector.lengthSq() > 0) {
            this.movementVector.normalize();
        }

        if (this.joystick && this.joystick.vector.lengthSq() > 0) {
            this.movementVector.copy(this.joystick.vector);
        }
    }

    /**
     * Returns the skill id if an ability key was just pressed this frame.
     * Uses JustDown to prevent repeated activation from held keys.
     */
    public getAbilityJustPressed(): string | null {
        if (this.abilityKeys.Q && Phaser.Input.Keyboard.JustDown(this.abilityKeys.Q)) return 'arcane_cleave';
        if (this.abilityKeys.E && Phaser.Input.Keyboard.JustDown(this.abilityKeys.E)) return 'soul_nova';
        if (this.abilityKeys.R && Phaser.Input.Keyboard.JustDown(this.abilityKeys.R)) return 'crimson_vital';
        return null;
    }

    public getMovementVector(): Phaser.Math.Vector2 {
        return this.movementVector;
    }

    public destroy() {
        if (this.joystick) {
            this.joystick.destroy();
        }
    }
}
