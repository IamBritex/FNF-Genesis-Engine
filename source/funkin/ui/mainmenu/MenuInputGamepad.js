export class MenuInputGamepad {
    /**
     * @param {Phaser.Scene} scene
     * @param {MainMenuSelection} selectionManager
     */
    constructor(scene, selectionManager) {
        this.scene = scene;
        this.selectionManager = selectionManager;
        
        // Estado previo del gamepad para evitar repeticiones (Just Pressed)
        this.prevGamepadState = {
            up: false,
            down: false,
            l1: false,
            r1: false,
            a: false,
            b: false,
            start: false
        };
        
        // Timer para controlar la velocidad de scroll con el Joystick
        this.stickScrollTimer = 0;
    }

    /**
     * Procesa la entrada del Gamepad. Debe llamarse desde el update() de la escena.
     */
    handleInput(time, delta) {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        
        for (const gamepad of gamepads) {
            if (!gamepad) continue;

            /**
             * Mapeo Estándar:
             * D-Pad Arriba: Botón 12
             * D-Pad Abajo: Botón 13
             * Gatillo Pequeño Izq (L1/LB): Botón 4
             * Gatillo Pequeño Der (R1/RB): Botón 5
             * A / Start: Botón 0 / 9 (Confirmar)
             * B: Botón 1 (Atrás)
             * Joystick Eje Y: axes[1]
             */

            const stickUp = gamepad.axes[1] < -0.5;
            const stickDown = gamepad.axes[1] > 0.5;

            const currentState = {
                up: gamepad.buttons[12]?.pressed || stickUp,
                down: gamepad.buttons[13]?.pressed || stickDown,
                l1: gamepad.buttons[4]?.pressed,
                r1: gamepad.buttons[5]?.pressed,
                a: gamepad.buttons[0]?.pressed,
                b: gamepad.buttons[1]?.pressed,
                start: gamepad.buttons[9]?.pressed
            };

            // --- 1. Navegación con Joystick / Flechas (con repetición) ---
            this.handleStickNavigation(currentState, stickUp, stickDown, time);
            
            // --- 2. Navegación con Gatillos Pequeños (Pulsación Única) ---
            this.handleTriggerNavigation(currentState);

            // --- 3. Confirmar y Atrás ---
            this.handleConfirmCancel(currentState);

            // Guardar estado para el siguiente frame
            this.prevGamepadState = currentState;
            
            // Solo procesamos el primer mando activo
            break; 
        }
    }

    /**
     * Maneja la navegación con el joystick
     */
    handleStickNavigation(currentState, stickUp, stickDown, time) {
        if (currentState.up) {
            if (!this.prevGamepadState.up || (stickUp && time > this.stickScrollTimer)) {
                this.selectionManager.changeSelection(-1);
                this.stickScrollTimer = time + 200;
            }
        } else if (currentState.down) {
            if (!this.prevGamepadState.down || (stickDown && time > this.stickScrollTimer)) {
                this.selectionManager.changeSelection(1);
                this.stickScrollTimer = time + 200;
            }
        }
        
        if (!stickUp && !stickDown) {
            this.stickScrollTimer = 0;
        }
    }

    /**
     * Maneja la navegación con los gatillos (L1/R1)
     */
    handleTriggerNavigation(currentState) {
        // L1 -> Arriba / Anterior
        if (currentState.l1 && !this.prevGamepadState.l1) {
            this.selectionManager.changeSelection(-1);
        }
        // R1 -> Abajo / Siguiente
        if (currentState.r1 && !this.prevGamepadState.r1) {
            this.selectionManager.changeSelection(1);
        }
    }

    /**
     * Maneja confirmación y cancelación
     */
    handleConfirmCancel(currentState) {
        if ((currentState.a && !this.prevGamepadState.a) || (currentState.start && !this.prevGamepadState.start)) {
            this.selectionManager.confirmSelection();
        }

        if (currentState.b && !this.prevGamepadState.b) {
            this.goBack();
        }
    }

    goBack() {
        if (!this.scene.canInteract) return;

        this.scene.canInteract = false;
        this.scene.cancelSound.play();
        this.scene.startExitState('introDance');
    }

    destroy() {
        this.prevGamepadState = null;
        this.stickScrollTimer = 0;
    }
}