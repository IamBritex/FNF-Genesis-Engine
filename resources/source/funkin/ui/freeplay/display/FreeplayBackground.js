/**
 * Fondo estático para el menú Freeplay.
 */
export class FreeplayBackground extends Phaser.GameObjects.Sprite {
    constructor(scene) {
        // Inicializamos el sprite en el centro de la cámara
        super(scene, scene.cameras.main.width / 2, scene.cameras.main.height / 2, 'menuBGMagenta');
        scene.add.existing(this);
        this.setScrollFactor(0);

        // ==========================================
        // LÓGICA DE ZOOM (COVER)
        // ==========================================
        // Calculamos la escala necesaria para que el fondo cubra 
        // todo el ancho y alto de la pantalla sin dejar bordes negros.
        const { width, height } = scene.scale;
        const scale = Math.max(width / this.width, height / this.height);
        
        this.setScale(scale);
    }
}