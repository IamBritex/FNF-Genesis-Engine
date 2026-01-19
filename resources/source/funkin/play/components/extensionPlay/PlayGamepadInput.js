/**
 * source/funkin/play/components/extensionPlay/PlayGamepadInput.js
 * Módulo independiente para gestionar la entrada del mando en PlayScene.
 */
export class PlayGamepadInput extends Phaser.Events.EventEmitter {
    constructor() {
        super();
        
        // Estado anterior de los botones para detectar "JustPressed" y "JustReleased"
        // Mapeamos acciones lógicas, no botones físicos directamente en el estado
        this.inputState = {
            LEFT: false,
            DOWN: false,
            UP: false,
            RIGHT: false,
            PAUSE: false,
            RESET: false
        };
    }

    update() {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        const gamepad = gamepads[0] || gamepads[1] || gamepads[2] || gamepads[3];

        if (!gamepad) return;

        // --- Lectura de Inputs Físicos ---

        // 1. Joysticks (Umbral 0.5)
        const stickLeft = gamepad.axes[0] < -0.5;
        const stickRight = gamepad.axes[0] > 0.5;
        const stickUp = gamepad.axes[1] < -0.5;
        const stickDown = gamepad.axes[1] > 0.5;

        // 2. D-Pad (Flechas) - Botones 12, 13, 14, 15
        const dpadUp = gamepad.buttons[12]?.pressed;
        const dpadDown = gamepad.buttons[13]?.pressed;
        const dpadLeft = gamepad.buttons[14]?.pressed;
        const dpadRight = gamepad.buttons[15]?.pressed;

        // 3. Botones de Acción (A, B, X, Y)
        // A(0)=Abajo, B(1)=Derecha, X(2)=Izquierda, Y(3)=Arriba
        const btnA = gamepad.buttons[0]?.pressed; // Abajo
        const btnB = gamepad.buttons[1]?.pressed; // Derecha
        const btnX = gamepad.buttons[2]?.pressed; // Izquierda
        const btnY = gamepad.buttons[3]?.pressed; // Arriba

        // 4. Gatillos (L1, R1, L2, R2)
        // L1(4)=Abajo, R1(5)=Arriba, L2(6)=Izquierda, R2(7)=Derecha (Disposición ergonómica spread)
        const l1 = gamepad.buttons[4]?.pressed;
        const r1 = gamepad.buttons[5]?.pressed;
        
        // L2 y R2 pueden ser analógicos, verificamos valor o pressed
        const l2 = gamepad.buttons[6]?.pressed || (gamepad.buttons[6]?.value > 0.1);
        const r2 = gamepad.buttons[7]?.pressed || (gamepad.buttons[7]?.value > 0.1);

        // 5. Botones de Sistema
        const btnStart = gamepad.buttons[9]?.pressed; // Pause
        const btnSelect = gamepad.buttons[8]?.pressed; // Reset (Opcional)

        // --- Agrupación Lógica (OR lógico) ---
        
        const currentInputs = {
            // Izquierda: D-Pad Izq O Stick Izq O Botón X O Gatillo L2
            LEFT: dpadLeft || stickLeft || btnX || l2,
            
            // Abajo: D-Pad Abajo O Stick Abajo O Botón A O Gatillo L1
            DOWN: dpadDown || stickDown || btnA || l1,
            
            // Arriba: D-Pad Arriba O Stick Arriba O Botón Y O Gatillo R1
            UP: dpadUp || stickUp || btnY || r1,
            
            // Derecha: D-Pad Der O Stick Der O Botón B O Gatillo R2
            RIGHT: dpadRight || stickRight || btnB || r2,

            // Pausa: Start
            PAUSE: btnStart,
            
            // Reset: Select
            RESET: btnSelect
        };

        // --- Detección de Cambios y Emisión de Eventos ---

        this.checkInput('LEFT', 0, currentInputs);
        this.checkInput('DOWN', 1, currentInputs);
        this.checkInput('UP', 2, currentInputs);
        this.checkInput('RIGHT', 3, currentInputs);
        
        // Pausa y Reset solo necesitan evento "Down"
        if (currentInputs.PAUSE && !this.inputState.PAUSE) {
            this.emit('pause');
        }
        if (currentInputs.RESET && !this.inputState.RESET) {
            this.emit('reset');
        }

        // Actualizar estado
        this.inputState = currentInputs;
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