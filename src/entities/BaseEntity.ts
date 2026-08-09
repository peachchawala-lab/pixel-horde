import Phaser from 'phaser';
import { IComponent } from '../components/IComponent';

export class BaseEntity {
    public id: string;
    public scene: Phaser.Scene;
    public sprite: Phaser.Physics.Arcade.Sprite;
    protected components: Map<string, IComponent>;

    constructor(scene: Phaser.Scene, x: number, y: number, texture: string, id: string = Phaser.Math.RND.uuid()) {
        this.scene = scene;
        this.id = id;
        this.components = new Map();
        
        this.sprite = scene.physics.add.sprite(x, y, texture);
    }

    public addComponent(component: IComponent) {
        this.components.set(component.name, component);
    }

    public getComponent<T extends IComponent>(name: string): T | undefined {
        return this.components.get(name) as T;
    }

    public update(time: number, delta: number) {
        for (const component of this.components.values()) {
            component.update(time, delta);
        }
    }

    public destroy() {
        for (const component of this.components.values()) {
            component.destroy();
        }
        this.sprite.destroy();
    }
}
