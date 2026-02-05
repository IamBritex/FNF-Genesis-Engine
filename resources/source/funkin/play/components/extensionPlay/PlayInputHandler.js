import { PlayGamepadInput } from "./PlayGamepadInput.js";
import { PlayEvents } from "../../PlayEvents.js";

/**
 * PlayInputHandler.js
 * Centraliza la entrada del usuario (Teclado y Gamepad).
 * Emite eventos abstractos (INPUT_NOTE_DOWN, INPUT_NOTE_UP) para que el juego reaccione.
 */
export class PlayInputHandler {

    constructor(scene) {
        this.scene = scene;
        this.gamepadHandler = null;
        this.keys = {};
    }

    create() {
        // Inicializar Gamepad
        this.gamepadHandler = new PlayGamepadInput();
        this.setupGamepadEvents();

        // Inicializar Teclado (Debug y Control Global)
        this.setupKeyboardDebug();
    }

    setupGamepadEvents() {
        if (!this.gamepadHandler) return;

        // Mapear eventos del gamepad a eventos del bus de la escena
        this.gamepadHandler.on('noteDown', (index) => {
            this.scene.events.emit(PlayEvents.INPUT_NOTE_DOWN, index);
        });

        this.gamepadHandler.on('noteUp', (index) => {
            this.scene.events.emit(PlayEvents.INPUT_NOTE_UP, index);
        });

        this.gamepadHandler.on('pause', () => {
            this.scene.events.emit(PlayEvents.PAUSE_CALL);
        });

        this.gamepadHandler.on('reset', () => {
            this.scene.events.emit(PlayEvents.RESET_CALL);
        });
    }

    setupKeyboardDebug() {
        // Tecla 7: Editor (Debug)
        this.scene.input.keyboard.on('keydown-SEVEN', () => {
            this.scene.sound.stopAll();
            this.scene.scene.start('ChartEditor', {
                songId: this.scene.initData.targetSongId,
                difficulty: this.scene.initData.DifficultyID
            });
        });

        // Tecla R: Reinicio Rápido
        this.scene.input.keyboard.on('keydown-R', () => {
            this.scene.events.emit(PlayEvents.RESET_CALL);
        });

        // Tecla ESC/ENTER: Pausa
        const pauseHandler = () => this.scene.events.emit(PlayEvents.PAUSE_CALL);
        this.scene.input.keyboard.on('keydown-ESC', pauseHandler);
        this.scene.input.keyboard.on('keydown-ENTER', pauseHandler);
    }

    update(delta) {
        // Polling del estado del gamepad
        if (this.gamepadHandler) {
            this.gamepadHandler.update();
        }
    }

    destroy() {
        if (this.gamepadHandler) {
            this.gamepadHandler.destroy();
            this.gamepadHandler = null;
        }
        
        // Limpiar eventos de teclado
        if (this.scene && this.scene.input && this.scene.input.keyboard) {
            this.scene.input.keyboard.off('keydown-SEVEN');
            this.scene.input.keyboard.off('keydown-R');
            this.scene.input.keyboard.off('keydown-ESC');
            this.scene.input.keyboard.off('keydown-ENTER');
        }
    }
}