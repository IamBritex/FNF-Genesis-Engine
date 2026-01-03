/**
 * source/funkin/ui/editors/inputs/keyboard.js
 * Maneja la interacción del teclado para el Editor:
 * - Movimiento de cámara (WASD).
 * - Zoom con teclas (Q/E).
 * - Gestión de preferencias de teclas.
 */
export class EditorKeyboardHandler {

    /**
     * @param {Phaser.Scene} scene La escena principal del editor.
     */
    constructor(scene) {
        this.scene = scene;

        // Configuración de velocidad
        this.moveSpeed = 70; // Píxeles por segundo (ajustado a tu gusto)
        this.turboMultiplier = 2.5;
        this.zoomSpeed = 1.0;

        this.keys = {
            UP: null, DOWN: null, LEFT: null, RIGHT: null,
            TURBO: null, ZOOM_IN: null, ZOOM_OUT: null
        };

        // Inicializar teclas y escuchar cambios en preferencias
        this.initKeys();
        if (this.scene.events) {
            this.scene.events.on('keybindingsUpdated', this.initKeys, this);
        }
    }

    initKeys() {
        // Limpiar teclas anteriores
        Object.values(this.keys).forEach(key => {
            if (key) this.scene.input.keyboard.removeKey(key);
        });

        const keymap = this.scene.preferencesManager ? this.scene.preferencesManager.getKeymap() : null;

        const getKeyCode = (actionName, defaultCode) => {
            if (!keymap) return defaultCode;
            const binding = keymap[actionName];
            if (!binding || !binding.key) return defaultCode;
            return Phaser.Input.Keyboard.KeyCodes[binding.key.toUpperCase()] || defaultCode;
        };

        const Codes = Phaser.Input.Keyboard.KeyCodes;

        this.keys.UP = this.scene.input.keyboard.addKey(getKeyCode('CAM_UP', Codes.W));
        this.keys.DOWN = this.scene.input.keyboard.addKey(getKeyCode('CAM_DOWN', Codes.S));
        this.keys.LEFT = this.scene.input.keyboard.addKey(getKeyCode('CAM_LEFT', Codes.A));
        this.keys.RIGHT = this.scene.input.keyboard.addKey(getKeyCode('CAM_RIGHT', Codes.D));
        this.keys.TURBO = this.scene.input.keyboard.addKey(getKeyCode('CAM_TURBO', Codes.SHIFT));

        this.keys.ZOOM_IN = this.scene.input.keyboard.addKey(getKeyCode('ZOOM_IN', Codes.E));
        this.keys.ZOOM_OUT = this.scene.input.keyboard.addKey(getKeyCode('ZOOM_OUT', Codes.Q));
    }

    /**
     * Se llama en el update de la escena para procesar el movimiento continuo.
     */
    update(delta) {
        // Bloquear si hay un input de texto activo
        if (document.activeElement &&
            (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
            return;
        }

        // Calcular velocidad basada en delta y zoom
        let speed = this.moveSpeed * (delta / 1000);
        const zoomFactor = Math.max(0.1, this.scene.baseZoom);
        speed /= zoomFactor; // Compensar zoom para velocidad constante visualmente

        if (this.keys.TURBO.isDown) speed *= this.turboMultiplier;

        // --- Movimiento ---
        if (this.keys.UP.isDown) this.scene.baseScrollY -= speed;
        if (this.keys.DOWN.isDown) this.scene.baseScrollY += speed;
        if (this.keys.LEFT.isDown) this.scene.baseScrollX -= speed;
        if (this.keys.RIGHT.isDown) this.scene.baseScrollX += speed;

        // --- Zoom con Teclas ---
        const zoomDelta = this.zoomSpeed * (delta / 1000);
        if (this.keys.ZOOM_IN.isDown) this.scene.baseZoom += zoomDelta;
        if (this.keys.ZOOM_OUT.isDown) this.scene.baseZoom -= zoomDelta;

        // Clamping
        this.scene.baseZoom = Phaser.Math.Clamp(this.scene.baseZoom, 0.1, 5.0);
    }

    /**
     * Utilidad para centrar la cámara en un elemento.
     */
    panToElement(element) {
        if (!element || !this.scene.gameCam) return;
        const scene = this.scene;
        const centerX = scene.gameCam.width / 2 / scene.gameCam.zoom;
        const centerY = scene.gameCam.height / 2 / scene.gameCam.zoom;
        scene.baseScrollX = element.x - centerX;
        scene.baseScrollY = element.y - centerY;
    }
}