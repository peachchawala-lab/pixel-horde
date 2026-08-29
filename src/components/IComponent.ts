export interface IComponent {
    name: string;
    update(time: number, delta: number): void;
    destroy(): void;
}
