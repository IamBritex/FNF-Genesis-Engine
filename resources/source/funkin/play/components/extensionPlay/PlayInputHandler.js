import { PlayGamepadInput } from "./PlayGamepadInput.js";

/**
 * source/funkin/play/components/extensionPlay/PlayInputHandler.js
 * Maneja todas las entradas: Teclado y ahora Gamepad.
 */
export class PlayInputHandler extends Phaser.Events.EventEmitter {
    constructor(scene) {
        super();
        this.scene = scene;
        this.blocked = false;

        this.pauseKeys = null;
        this.resetKey = null;
        this.debugKeys = null;
        
        this.gamepadInput = null; // Instancia del gamepad
    }

    create() {
        // 1. Teclas de Pausa (Enter / ESC)
        this.pauseKeys = this.scene.input.keyboard.addKeys({
            enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
            esc: Phaser.Input.Keyboard.KeyCodes.ESC
        });

        // 2. Teclas de Debug (I, J, K, L)
        this.debugKeys = this.scene.input.keyboard.addKeys({
            I: Phaser.Input.Keyboard.KeyCodes.I,
            K: Phaser.Input.Keyboard.KeyCodes.K,
            J: Phaser.Input.Keyboard.KeyCodes.J,
            L: Phaser.Input.Keyboard.KeyCodes.L
        });

        // 3. Configurar Reset
        this.setupResetControl();

        // 4. [NUEVO] Inicializar Gamepad
        this.gamepadInput = new PlayGamepadInput();
        this.setupGamepadEvents();
    }

    setupGamepadEvents() {
        if (!this.gamepadInput) return;

        // Conectar eventos del gamepad a los eventos de este Handler
        this.gamepadInput.on('pause', () => {
            if (!this.blocked) this.emit('pause');
        });

        this.gamepadInput.on('reset', () => {
            if (!this.blocked) this.emit('reset');
        });

        // Reenviar eventos de notas al PlayerNotesHandler
        this.gamepadInput.on('noteDown', (direction) => {
            if (!this.blocked) this.emit('noteDown', direction);
        });

        this.gamepadInput.on('noteUp', (direction) => {
            if (!this.blocked) this.emit('noteUp', direction);
        });
    }

    setupResetControl() {
        let canReset = true;
        let resetBind = "R";

        try {
            const stored = localStorage.getItem('genesis_preferences');
            if (stored) {
                const prefs = JSON.parse(stored);
                if (prefs && typeof prefs['opt-reset'] !== 'undefined') {
                    canReset = prefs['opt-reset'];
                }
                if (prefs && prefs['keybind_reset_0']) {
                    resetBind = prefs['keybind_reset_0'];
                }
            }
        } catch (e) {
            console.warn("[PlayInputHandler] Error leyendo preferencias:", e);
        }

        if (canReset) {
            let finalKey = resetBind.replace("Key", "").toUpperCase();
            try {
                this.resetKey = this.scene.input.keyboard.addKey(finalKey);
                console.log(`[PlayInputHandler] Reset activado con tecla: ${finalKey}`);
            } catch (err) {
                this.resetKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
            }
        }
    }

    update(delta) {
        if (this.blocked) return;

        // Actualizar lógica del Gamepad
        if (this.gamepadInput) {
            this.gamepadInput.update();
        }

        // Detectar Pausa (Teclado)
        if (Phaser.Input.Keyboard.JustDown(this.pauseKeys.enter) || Phaser.Input.Keyboard.JustDown(this.pauseKeys.esc)) {
            this.emit('pause');
            return;
        }

        // Detectar Reset (Teclado)
        if (this.resetKey && Phaser.Input.Keyboard.JustDown(this.resetKey)) {
            this.emit('reset');
            return;
        }

        // Detectar Debug de Cámara
        this.handleCameraDebug(delta);
    }

    handleCameraDebug(delta) {
        if (!this.debugKeys) return;
        
        const moveSpeed = 1000 * (delta / 1000);
        let x = 0;
        let y = 0;

        if (this.debugKeys.I.isDown) y -= moveSpeed;
        if (this.debugKeys.K.isDown) y += moveSpeed;
        if (this.debugKeys.J.isDown) x -= moveSpeed;
        if (this.debugKeys.L.isDown) x += moveSpeed;

        if (x !== 0 || y !== 0) {
            this.emit('debugCamera', x, y);
        }
    }

    block() { this.blocked = true; }
    unblock() { this.blocked = false; }
    
    destroy() {
        this.removeAllListeners();
        this.pauseKeys = null;
        this.resetKey = null;
        this.debugKeys = null;
        if (this.gamepadInput) {
            this.gamepadInput.destroy();
            this.gamepadInput = null;
        }
    }
}