/**
 * Fondo estático para el menú Freeplay.
 */
export class FreeplayBackground extends Phaser.GameObjects.Sprite {
    constructor(scene) {
        super(scene, scene.cameras.main.width / 2, scene.cameras.main.height / 2, 'menuBGMagenta');
        scene.add.existing(this);
        this.setScrollFactor(0);
    }
}