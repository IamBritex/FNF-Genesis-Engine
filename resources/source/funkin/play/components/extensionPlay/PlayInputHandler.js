import { PlayGamepadInput } from "./PlayGamepadInput.js";
import { PlayEvents } from "../../PlayEvents.js";

/**
 * PlayInputHandler.js
 * Captura entradas crudas y las convierte en eventos del sistema.
 * No tiene lógica de juego, solo de despacho.
 */
export class PlayInputHandler {
    constructor(scene) {
        this.scene = scene;
        this.blocked = false;

        this.pauseKeys = null;
        this.resetKey = null;
        this.debugKeys = null;
        
        this.gamepadInput = null; 
    }

    create() {
        // 1. Teclas de Pausa
        this.pauseKeys = this.scene.input.keyboard.addKeys({
            enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
            esc: Phaser.Input.Keyboard.KeyCodes.ESC
        });

        // 2. Teclas de Debug
        this.debugKeys = this.scene.input.keyboard.addKeys({
            I: Phaser.Input.Keyboard.KeyCodes.I,
            K: Phaser.Input.Keyboard.KeyCodes.K,
            J: Phaser.Input.Keyboard.KeyCodes.J,
            L: Phaser.Input.Keyboard.KeyCodes.L
        });

        // 3. Configurar Reset (Leyendo preferencias si existen)
        this.setupResetControl();

        // 4. Inicializar Gamepad
        this.gamepadInput = new PlayGamepadInput();
        this.setupGamepadEvents();

        // Escuchar si alguien quiere bloquear inputs (ej. cinemáticas)
        this.scene.events.on('block_input', () => this.block());
        this.scene.events.on('unblock_input', () => this.unblock());
    }

    setupGamepadEvents() {
        if (!this.gamepadInput) return;

        // Convertir eventos locales del GamepadInput a eventos globales de la Scene
        this.gamepadInput.on('pause', () => {
            if (!this.blocked) this.scene.events.emit(PlayEvents.PAUSE_CALL);
        });

        this.gamepadInput.on('reset', () => {
            if (!this.blocked) this.scene.events.emit(PlayEvents.RESET_CALL);
        });

        this.gamepadInput.on('noteDown', (direction) => {
            if (!this.blocked) this.scene.events.emit(PlayEvents.INPUT_NOTE_DOWN, direction);
        });

        this.gamepadInput.on('noteUp', (direction) => {
            if (!this.blocked) this.scene.events.emit(PlayEvents.INPUT_NOTE_UP, direction);
        });
    }

    setupResetControl() {
        let canReset = true;
        let resetBind = "R";

        // Intento simple de leer localStorage sin try-catch bloqueante
        const stored = localStorage.getItem('genesis_preferences');
        if (stored) {
            const prefs = JSON.parse(stored);
            if (prefs?.['opt-reset'] !== undefined) canReset = prefs['opt-reset'];
            if (prefs?.['keybind_reset_0']) resetBind = prefs['keybind_reset_0'];
        }

        if (canReset) {
            let finalKey = resetBind.replace("Key", "").toUpperCase();
            // Fallback a 'R' si falla
            this.resetKey = this.scene.input.keyboard.addKey(finalKey) || this.scene.input.keyboard.addKey('R');
        }
    }

    update(delta) {
        if (this.blocked) return;

        // Actualizar Gamepad
        if (this.gamepadInput) this.gamepadInput.update();

        // Detectar Pausa
        if (Phaser.Input.Keyboard.JustDown(this.pauseKeys.enter) || Phaser.Input.Keyboard.JustDown(this.pauseKeys.esc)) {
            this.scene.events.emit(PlayEvents.PAUSE_CALL);
            return;
        }

        // Detectar Reset
        if (this.resetKey && Phaser.Input.Keyboard.JustDown(this.resetKey)) {
            this.scene.events.emit(PlayEvents.RESET_CALL);
            return;
        }

        // Detectar Debug de Cámara
        this.handleCameraDebug(delta);
    }

    handleCameraDebug(delta) {
        if (!this.debugKeys) return;
        
        const moveSpeed = 1000 * (delta / 1000);
        let x = 0, y = 0;

        if (this.debugKeys.I.isDown) y -= moveSpeed;
        if (this.debugKeys.K.isDown) y += moveSpeed;
        if (this.debugKeys.J.isDown) x -= moveSpeed;
        if (this.debugKeys.L.isDown) x += moveSpeed;

        if (x !== 0 || y !== 0) {
            // Emitimos evento de movimiento debug
            this.scene.events.emit(PlayEvents.DEBUG_CAMERA_MOVE, { x, y });
        }
    }

    block() { this.blocked = true; }
    unblock() { this.blocked = false; }
    
    destroy() {
        this.scene.events.off('block_input');
        this.scene.events.off('unblock_input');
        
        this.pauseKeys = null;
        this.resetKey = null;
        this.debugKeys = null;
        if (this.gamepadInput) {
            this.gamepadInput.destroy();
            this.gamepadInput = null;
        }
    }
}