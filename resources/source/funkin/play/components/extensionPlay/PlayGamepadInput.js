/**
 * PlayGamepadInput.js
 * Módulo independiente para gestionar la entrada del mando (Gamepad).
 * Emite eventos estándar que PlayInputHandler consume.
 */
export class PlayGamepadInput extends Phaser.Events.EventEmitter {
    constructor() {
        super();

        this.inputState = {
            LEFT: false, DOWN: false, UP: false, RIGHT: false,
            PAUSE: false, RESET: false
        };
    }

    update() {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        const pad = gamepads[0] || gamepads[1] || gamepads[2] || gamepads[3];

        if (!pad) return;

        // Umbral para Sticks
        const threshold = 0.5;

        // --- Lectura de Inputs ---
        const inputs = {
            LEFT: (pad.axes[0] < -threshold) || pad.buttons[14]?.pressed || pad.buttons[2]?.pressed || pad.buttons[6]?.pressed,
            DOWN: (pad.axes[1] > threshold) || pad.buttons[13]?.pressed || pad.buttons[0]?.pressed || pad.buttons[4]?.pressed,
            UP: (pad.axes[1] < -threshold) || pad.buttons[12]?.pressed || pad.buttons[3]?.pressed || pad.buttons[5]?.pressed,
            RIGHT: (pad.axes[0] > threshold) || pad.buttons[15]?.pressed || pad.buttons[1]?.pressed || pad.buttons[7]?.pressed,

            PAUSE: pad.buttons[9]?.pressed, // Start
            RESET: pad.buttons[8]?.pressed  // Select
        };

        // --- Detección de Cambios ---
        this.checkInput('LEFT', 0, inputs);
        this.checkInput('DOWN', 1, inputs);
        this.checkInput('UP', 2, inputs);
        this.checkInput('RIGHT', 3, inputs);

        if (inputs.PAUSE && !this.inputState.PAUSE) this.emit('pause');
        if (inputs.RESET && !this.inputState.RESET) this.emit('reset');

        this.inputState = inputs;
    }

    checkInput(name, noteIndex, currentInputs) {
        if (currentInputs[name] && !this.inputState[name]) {
            this.emit('noteDown', noteIndex);
        } else if (!currentInputs[name] && this.inputState[name]) {
            this.emit('noteUp', noteIndex);
        }
    }

    destroy() {
        this.removeAllListeners();
    }
}