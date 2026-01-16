/**
 * source/funkin/play/pause/components/PauseGamepadInput.js
 * Módulo independiente para gestionar el mando en el menú de pausa.
 */
export class PauseGamepadInput extends Phaser.Events.EventEmitter {
    constructor() {
        super();
        
        // Estado previo para detectar pulsaciones únicas
        this.prevGamepadState = {
            up: false,
            down: false,
            a: false,
            b: false,
            start: false
        };
        
        this.stickScrollTimer = 0;
        this.inputLockoutTimer = 0; // Prevenir input al abrir pausa
    }

    setInputLockout(duration) {
        this.inputLockoutTimer = Date.now() + duration;
    }

    update(time) {
        // Si estamos en el período de bloqueo, ignorar input
        if (Date.now() < this.inputLockoutTimer) {
            return;
        }

        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        // Intentamos obtener el primer mando activo
        const gamepad = gamepads[0] || gamepads[1] || gamepads[2] || gamepads[3];

        if (!gamepad) return;

        /**
         * Mapeo:
         * Joystick Eje 1: Arriba < -0.5 / Abajo > 0.5
         * D-Pad: 12 (Arr) / 13 (Abj)
         * Confirmar: 0 (A)
         * Atrás: 1 (B)
         * Start: 9 (NO se usa para confirm, solo para pausa al abrir)
         */

        const stickUp = gamepad.axes[1] < -0.5;
        const stickDown = gamepad.axes[1] > 0.5;

        const currentState = {
            up: gamepad.buttons[12]?.pressed || stickUp,
            down: gamepad.buttons[13]?.pressed || stickDown,
            a: gamepad.buttons[0]?.pressed,
            b: gamepad.buttons[1]?.pressed,
            start: gamepad.buttons[9]?.pressed
        };

        // --- Navegación (Arriba) ---
        if (currentState.up) {
            // Si es pulsación nueva O es joystick mantenido y pasó el tiempo
            if (!this.prevGamepadState.up || (stickUp && time > this.stickScrollTimer)) {
                this.emit('navigate', -1);
                this.stickScrollTimer = time + 200; // Delay para scroll
            }
        } 
        // --- Navegación (Abajo) ---
        else if (currentState.down) {
            if (!this.prevGamepadState.down || (stickDown && time > this.stickScrollTimer)) {
                this.emit('navigate', 1);
                this.stickScrollTimer = time + 200;
            }
        }

        // Resetear timer si soltamos el stick
        if (!stickUp && !stickDown) {
            this.stickScrollTimer = 0;
        }

        // --- Confirmar (SOLO A, no Start) ---
        if (currentState.a && !this.prevGamepadState.a) {
            this.emit('confirm');
        }

        // --- Volver / Reanudar (B) ---
        if (currentState.b && !this.prevGamepadState.b) {
            this.emit('back');
        }

        this.prevGamepadState = currentState;
    }

    destroy() {
        this.removeAllListeners();
    }
}