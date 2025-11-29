/**
 * editors/animationEditor/camera/CameraAnimationEditor.js
 * [MODIFICADO] Ahora usa teclas dinámicas.
 */
export class CameraAnimationEditor {

    constructor(scene) {
        this.scene = scene;
        
        this.moveSpeed = 600;
        this.zoomSpeed = 2.0;
        this.lerpSpeed = 10;
        
        this.panStart = new Phaser.Math.Vector2();
        this.isPanning = false;

        // Guardaremos las referencias a las teclas Phaser aquí
        this.keys = {};
    }

    create() {
        // Inicializar teclas basadas en preferencias
        this.updateKeys();

        // Escuchar cambios en tiempo real
        this.scene.events.on('keybindingsUpdated', this.updateKeys, this);

        // ... (Lógica de Mouse se mantiene igual) ...
        this.scene.input.on('pointerdown', (pointer) => {
            if (pointer.middleButtonDown()) {
                this.isPanning = true;
                this.panStart.set(pointer.x, pointer.y);
            }
        });
        this.scene.input.on('pointerup', (pointer) => {
            if (pointer.middleButtonReleased()) this.isPanning = false;
        });
        this.scene.input.on('pointermove', (pointer) => {
            if (this.isPanning && pointer.middleButtonDown()) {
                const dx = pointer.x - this.panStart.x;
                const dy = pointer.y - this.panStart.y;
                this.scene.baseScrollX -= dx / this.scene.gameCam.zoom;
                this.scene.baseScrollY -= dy / this.scene.gameCam.zoom;
                this.panStart.set(pointer.x, pointer.y);
            }
        });
        this.scene.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
            pointer.event.preventDefault();
            const zoomAmount = deltaY < 0 ? 0.1 : -0.1;
            this.scene.baseZoom = Phaser.Math.Clamp(this.scene.baseZoom + zoomAmount, 0.1, 5.0);
        });
    }

    updateKeys() {
        // Eliminar teclas viejas si existen
        if (this.keys) {
            for (let k in this.keys) {
                this.scene.input.keyboard.removeKey(this.keys[k]);
            }
        }

        const prefs = this.scene.preferencesManager.getKeymap();
        const getCode = (action) => Phaser.Input.Keyboard.KeyCodes[prefs[action].key.toUpperCase()];

        // Reasignar teclas
        this.keys = {
            UP: this.scene.input.keyboard.addKey(getCode('CAM_UP')),
            DOWN: this.scene.input.keyboard.addKey(getCode('CAM_DOWN')),
            LEFT: this.scene.input.keyboard.addKey(getCode('CAM_LEFT')),
            RIGHT: this.scene.input.keyboard.addKey(getCode('CAM_RIGHT')),
            ZOOM_IN: this.scene.input.keyboard.addKey(getCode('ZOOM_IN')),
            ZOOM_OUT: this.scene.input.keyboard.addKey(getCode('ZOOM_OUT'))
        };
        console.log("[CameraAnimationEditor] Teclas actualizadas.");
    }

    update(delta) {
        if (!this.scene.gameCam || this.scene.isTyping) return;

        const elapsedSeconds = delta / 1000;
        const adjustedSpeed = this.moveSpeed * elapsedSeconds / Math.max(0.1, this.scene.baseZoom);
        const adjustedZoomSpeed = this.zoomSpeed * elapsedSeconds;

        // Usar las teclas dinámicas
        if (this.keys.UP.isDown) this.scene.baseScrollY -= adjustedSpeed;
        if (this.keys.DOWN.isDown) this.scene.baseScrollY += adjustedSpeed;
        if (this.keys.LEFT.isDown) this.scene.baseScrollX -= adjustedSpeed;
        if (this.keys.RIGHT.isDown) this.scene.baseScrollX += adjustedSpeed;

        if (this.keys.ZOOM_IN.isDown) this.scene.baseZoom += adjustedZoomSpeed;
        if (this.keys.ZOOM_OUT.isDown) this.scene.baseZoom -= adjustedZoomSpeed;
        
        this.scene.baseZoom = Phaser.Math.Clamp(this.scene.baseZoom, 0.1, 5.0);

        // Lerp
        const t = Math.min(1, this.lerpSpeed * elapsedSeconds);
        this.scene.gameCam.scrollX = Phaser.Math.Linear(this.scene.gameCam.scrollX, this.scene.baseScrollX, t);
        this.scene.gameCam.scrollY = Phaser.Math.Linear(this.scene.gameCam.scrollY, this.scene.baseScrollY, t);
        this.scene.gameCam.zoom = Phaser.Math.Linear(this.scene.gameCam.zoom, this.scene.baseZoom, t);
    }
}