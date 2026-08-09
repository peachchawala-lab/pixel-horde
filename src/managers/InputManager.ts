import Phaser from 'phaser';
import { VirtualJoystick } from '../ui/VirtualJoystick';

export class InputManager {
    private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    private wasdKeys: any;
    private joystick?: VirtualJoystick;
    private movementVector: Phaser.Math.Vector2;

    constructor(scene: Phaser.Scene) {
        this.movementVector = new Phaser.Math.Vector2();

        if (scene.input.keyboard) {
            this.cursors = scene.input.keyboard.createCursorKeys();
            this.wasdKeys = scene.input.keyboard.addKeys('W,A,S,D');
        } else {
            this.cursors = {} as Phaser.Types.Input.Keyboard.CursorKeys;
            this.wasdKeys = {};
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

    public getMovementVector(): Phaser.Math.Vector2 {
        return this.movementVector;
    }

    public destroy() {
        if (this.joystick) {
            this.joystick.destroy();
        }
    }
}
