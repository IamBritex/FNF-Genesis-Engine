/**
 * source/funkin/ui/editors/camera/CameraEditor.js
 * Sistema de cámara reutilizable (basado en StageEditor).
 * Gestiona movimiento WASD, Zoom con teclas y suavizado de desplazamiento.
 */
export class CameraEditor {

    /**
     * @param {Phaser.Scene} scene La escena principal del editor.
     */
    constructor(scene) {
        this.scene = scene;

        // Configuración de velocidad estándar
        this.moveSpeed = 600; // Píxeles por segundo
        this.turboMultiplier = 2.5; // Multiplicador con Shift
        this.zoomSpeed = 1.0; // Velocidad de zoom con teclas

        // Referencias a las teclas de Phaser
        this.keys = {
            UP: null,
            DOWN: null,
            LEFT: null,
            RIGHT: null,
            TURBO: null,
            ZOOM_IN: null,  // E
            ZOOM_OUT: null  // Q
        };

        // Escuchar cambios en los atajos para recargar las teclas al vuelo
        // (Asegúrate de que tu PreferencesManager emita este evento)
        this.scene.events.on('keybindingsUpdated', this.initKeys, this);
    }

    /**
     * Inicializa o reinicializa las teclas basándose en las preferencias.
     */
    initKeys() {
        // Limpiar teclas anteriores
        Object.values(this.keys).forEach(key => {
            if (key) this.scene.input.keyboard.removeKey(key);
        });

        // Obtener mapa de teclas (si existe el manager, sino usar defaults)
        const keymap = this.scene.preferencesManager ? this.scene.preferencesManager.getKeymap() : null;

        const getKeyCode = (actionName, defaultCode) => {
            if (!keymap) return defaultCode;
            const binding = keymap[actionName];
            if (!binding || !binding.key) return defaultCode;
            const keyStr = binding.key.toUpperCase();
            return Phaser.Input.Keyboard.KeyCodes[keyStr] || defaultCode;
        };

        // Asignar teclas (usando códigos por defecto si falla la config)
        this.keys.UP = this.scene.input.keyboard.addKey(getKeyCode('CAM_UP', Phaser.Input.Keyboard.KeyCodes.W));
        this.keys.DOWN = this.scene.input.keyboard.addKey(getKeyCode('CAM_DOWN', Phaser.Input.Keyboard.KeyCodes.S));
        this.keys.LEFT = this.scene.input.keyboard.addKey(getKeyCode('CAM_LEFT', Phaser.Input.Keyboard.KeyCodes.A));
        this.keys.RIGHT = this.scene.input.keyboard.addKey(getKeyCode('CAM_RIGHT', Phaser.Input.Keyboard.KeyCodes.D));
        this.keys.TURBO = this.scene.input.keyboard.addKey(getKeyCode('CAM_TURBO', Phaser.Input.Keyboard.KeyCodes.SHIFT));

        this.keys.ZOOM_IN = this.scene.input.keyboard.addKey(getKeyCode('ZOOM_IN', Phaser.Input.Keyboard.KeyCodes.E));
        this.keys.ZOOM_OUT = this.scene.input.keyboard.addKey(getKeyCode('ZOOM_OUT', Phaser.Input.Keyboard.KeyCodes.Q));

        console.log("[CameraEditor] Teclas inicializadas.");
    }

    /**
     * Actualiza la posición OBJETIVO de la cámara (baseScroll) basada en inputs.
     * El movimiento visual real (Lerp) se aplica en applySmoothMovement.
     */
    update(delta) {
        // Si tienes un modo de prueba, puedes bloquear la cámara aquí
        if (this.scene.isTestMode) return;

        this.processInput(delta);
        this.applySmoothMovement(delta);
    }

    processInput(delta) {
        // Ignorar si el usuario escribe en un input HTML
        if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
            return;
        }

        // Calcular velocidad ajustada al tiempo
        let speed = this.moveSpeed * (delta / 1000);

        // Ajustar velocidad según el zoom para mantener consistencia visual
        // (Más lento si estás cerca, más rápido si estás lejos)
        const zoomFactor = Math.max(0.1, this.scene.baseZoom);
        speed /= zoomFactor;

        // Verificar Turbo
        if (this.keys.TURBO && this.keys.TURBO.isDown) {
            speed *= this.turboMultiplier;
        }

        // Movimiento (Actualizamos las variables base de la escena)
        if (this.keys.UP && this.keys.UP.isDown) this.scene.baseScrollY -= speed;
        if (this.keys.DOWN && this.keys.DOWN.isDown) this.scene.baseScrollY += speed;
        if (this.keys.LEFT && this.keys.LEFT.isDown) this.scene.baseScrollX -= speed;
        if (this.keys.RIGHT && this.keys.RIGHT.isDown) this.scene.baseScrollX += speed;

        // Zoom con Teclas (Q/E)
        if (this.keys.ZOOM_IN && this.keys.ZOOM_IN.isDown) {
            this.scene.baseZoom += this.zoomSpeed * (delta / 1000);
        }
        if (this.keys.ZOOM_OUT && this.keys.ZOOM_OUT.isDown) {
            this.scene.baseZoom -= this.zoomSpeed * (delta / 1000);
        }

        // Limitar Zoom
        this.scene.baseZoom = Phaser.Math.Clamp(this.scene.baseZoom, 0.1, 5.0);
    }

    /**
     * Aplica interpolación lineal (Lerp) a la posición de la cámara para suavidad.
     */
    applySmoothMovement(delta) {
        const cam = this.scene.gameCam;
        if (!cam) return;

        const elapsedSeconds = delta / 1000;
        const panLerpSpeed = elapsedSeconds * 10; // Factor de suavizado de posición

        cam.scrollX = Phaser.Math.Linear(cam.scrollX, this.scene.baseScrollX, panLerpSpeed);
        cam.scrollY = Phaser.Math.Linear(cam.scrollY, this.scene.baseScrollY, panLerpSpeed);
    }

    /**
     * Centra la cámara instantáneamente en un elemento.
     */
    panToElement(element) {
        if (!element || !this.scene.gameCam) return;

        const scene = this.scene;
        // Calcular el centro de la vista
        const centerX = scene.gameCam.width / 2 / scene.gameCam.zoom;
        const centerY = scene.gameCam.height / 2 / scene.gameCam.zoom;

        scene.baseScrollX = element.x - centerX;
        scene.baseScrollY = element.y - centerY;
    }
}