/**
 * FunWaiting.js
 * Módulo para manejar la pantalla de carga negra inicial.
 * Bloquea la vista hasta que todos los assets estén cargados
 * y luego hace un fundido de salida.
 */
export class FunWaiting {

    /**
     * @param {Phaser.Scene} scene - La escena (PlayState).
     * @param {import('../camera/Camera.js').CameraManager} cameraManager - El gestor de cámaras.
     */
    constructor(scene, cameraManager) {
        this.scene = scene;
        this.cameraManager = cameraManager;

        /**
         * El rectángulo negro que cubre la pantalla.
         * @type {Phaser.GameObjects.Rectangle | null}
         */
        this.overlay = null;
        this.isFading = false;
    }

    /**
     * Crea la superposición negra inmediatamente.
     * Debe llamarse al inicio de PlayState.create().
     */
    createOverlay() {
        if (!this.cameraManager) {
            console.error("FunWaiting: No se puede crear overlay sin CameraManager.");
            return;
        }

        const { width, height } = this.scene.cameras.main;
        
        // Crear un rectángulo negro
        this.overlay = this.scene.add.rectangle(0, 0, width, height, 0x000000);
        this.overlay.setOrigin(0, 0);

        // Ponerlo en la capa más alta (HUD) y con profundidad alta
        this.cameraManager.assignToHUD(this.overlay);
        this.overlay.setDepth(10000); // Un valor muy alto para estar por encima de todo
    }

    /**
     * Inicia el fundido de salida (fade-out).
     * @param {function} onCompleteCallback - Función a llamar cuando el fundido termine.
     * @param {number} duration - Duración del fundido en ms.
     */
    startFadeOut(onCompleteCallback, duration = 500) {
        if (!this.overlay || this.isFading) {
            // Si no hay overlay o ya está en fundido,
            // llama al callback inmediatamente.
            if (onCompleteCallback) onCompleteCallback();
            return;
        }

        this.isFading = true;

        this.scene.tweens.add({
            targets: this.overlay,
            alpha: 0,
            duration: duration,
            ease: 'Linear',
            onComplete: () => {
                this.isFading = false;
                
                // Destruir el overlay después del fundido
                if (this.overlay) {
                    this.overlay.destroy();
                    this.overlay = null;
                }
                
                // Llamar al callback (que iniciará el juego)
                if (onCompleteCallback) {
                    onCompleteCallback();
                }
            }
        });
    }

    /**
     * Limpia los recursos.
     */
    destroy() {
        if (this.overlay) {
            this.overlay.destroy();
            this.overlay = null;
        }
        this.scene = null;
        this.cameraManager = null;
    }
}