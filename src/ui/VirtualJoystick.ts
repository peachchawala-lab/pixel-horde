import Phaser from 'phaser';

export class VirtualJoystick {
    private base: Phaser.GameObjects.Arc;
    private thumb: Phaser.GameObjects.Arc;
    private pointer: Phaser.Input.Pointer | null = null;
    private maxRadius: number = 40;
    public vector: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);
    private baseX: number;
    private baseY: number;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        this.baseX = x;
        this.baseY = y;
        
        this.base = scene.add.circle(x, y, 50, 0x888888, 0.5).setScrollFactor(0).setDepth(100);
        this.thumb = scene.add.circle(x, y, 25, 0xcccccc, 0.8).setScrollFactor(0).setDepth(101);
        
        this.base.setInteractive();
        
        this.base.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (this.pointer === null) {
                this.pointer = pointer;
                this.updateJoystick(pointer);
            }
        });
        
        scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (this.pointer === pointer) {
                this.updateJoystick(pointer);
            }
        });
        
        const resetJoystick = (pointer: Phaser.Input.Pointer) => {
            if (this.pointer === pointer) {
                this.pointer = null;
                this.thumb.setPosition(this.baseX, this.baseY);
                this.vector.set(0, 0);
            }
        };
        
        scene.input.on('pointerup', resetJoystick);
        scene.input.on('pointerupoutside', resetJoystick);
    }

    private updateJoystick(pointer: Phaser.Input.Pointer) {
        const angle = Phaser.Math.Angle.Between(this.baseX, this.baseY, pointer.x, pointer.y);
        let dist = Phaser.Math.Distance.Between(this.baseX, this.baseY, pointer.x, pointer.y);
        
        if (dist > this.maxRadius) {
            dist = this.maxRadius;
        }
        
        this.thumb.x = this.baseX + Math.cos(angle) * dist;
        this.thumb.y = this.baseY + Math.sin(angle) * dist;
        
        this.vector.set(Math.cos(angle) * (dist / this.maxRadius), Math.sin(angle) * (dist / this.maxRadius));
    }

    public destroy() {
        this.base.destroy();
        this.thumb.destroy();
    }
}
