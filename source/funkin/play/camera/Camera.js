/**
 * Camera.js
 * Módulo para gestionar las 4 cámaras principales de PlayState.
 */
export class CameraManager {

    constructor(scene) {
        const { width, height } = scene.cameras.main;

        /**
         * 1. gameCamera: Muestra personajes y escenario.
         * (Usamos la cámara principal para esta).
         */
        this.gameCamera = scene.cameras.main;
        this.gameCamera.setName('gameCamera');
        this.gameCamera.setZoom(1);

        /**
         * 2. UICamera: Muestra flechas, barra de vida, score, etc.
         * Esta cámara no se mueve.
         */
        this.UICamera = scene.cameras.add(0, 0, width, height);
        this.UICamera.setName('UICamera');
        this.UICamera.setScroll(0, 0); // Fija en la pantalla

        /**
         * 3. FXCamera: Muestra efectos especiales (ej. viñetas, scanlines).
         * Esta cámara no se mueve.
         */
        this.FXCamera = scene.cameras.add(0, 0, width, height);
        this.FXCamera.setName('FXCamera');
        this.FXCamera.setScroll(0, 0); // Fija en la pantalla

        /**
         * 4. HUDCamera: Muestra el HUD del menú (ej. menú de pausa).
         * Esta cámara no se mueve y está por encima de todo.
         */
        this.HUDCamera = scene.cameras.add(0, 0, width, height);
        this.HUDCamera.setName('HUDCamera');
        this.HUDCamera.setScroll(0, 0); // Fija en la pantalla
    }

    /**
     * Asigna un objeto o grupo para que SÓLO sea visible por la gameCamera.
     * @param {Phaser.GameObjects.GameObject | Phaser.GameObjects.Group} gameObject
     */
    assignToGame(gameObject) {
        this.UICamera.ignore(gameObject);
        this.FXCamera.ignore(gameObject);
        this.HUDCamera.ignore(gameObject);
    }

    /**
     * Asigna un objeto o grupo para que SÓLO sea visible por la UICamera.
     * @param {Phaser.GameObjects.GameObject | Phaser.GameObjects.Group} gameObject
     */
    assignToUI(gameObject) {
        this.gameCamera.ignore(gameObject);
        this.FXCamera.ignore(gameObject);
        this.HUDCamera.ignore(gameObject);
    }

    /**
     * Asigna un objeto o grupo para que SÓLO sea visible por la FXCamera.
     * @param {Phaser.GameObjects.GameObject | Phaser.GameObjects.Group} gameObject
     */
    assignToFX(gameObject) {
        this.gameCamera.ignore(gameObject);
        this.UICamera.ignore(gameObject);
        this.HUDCamera.ignore(gameObject);
    }

    /**
     * Asigna un objeto o grupo para que SÓLO sea visible por la HUDCamera.
     * @param {Phaser.GameObjects.GameObject | Phaser.GameObjects.Group} gameObject
     */
    assignToHUD(gameObject) {
        this.gameCamera.ignore(gameObject);
        this.UICamera.ignore(gameObject);
        this.FXCamera.ignore(gameObject);
    }

    /**
     * Limpia las cámaras que se añadieron manualmente.
     */
    shutdown(scene) {
        if (this.UICamera) scene.cameras.remove(this.UICamera);
        if (this.FXCamera) scene.cameras.remove(this.FXCamera);
        if (this.HUDCamera) scene.cameras.remove(this.HUDCamera);

        this.gameCamera = null;
        this.UICamera = null;
        this.FXCamera = null;
        this.HUDCamera = null;
    }
}