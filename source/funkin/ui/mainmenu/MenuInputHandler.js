import { MainMenuSelection } from './MainMenuSelection.js';

export class MenuInputHandler {
    /**
     * @param {Phaser.Scene} scene
     */
    constructor(scene) {
        this.scene = scene;
        this.selectionManager = new MainMenuSelection(scene);
        
        // Estado previo del gamepad para evitar repeticiones (Just Pressed)
        this.prevGamepadState = {
            up: false,
            down: false,
            l1: false, // Gatillo Pequeño Izquierdo (Button 4)
            r1: false, // Gatillo Pequeño Derecho (Button 5)
            a: false,
            b: false,
            start: false
        };
        
        // Timer para controlar la velocidad de scroll con el Joystick
        this.stickScrollTimer = 0;
    }

    initControls() {
        this.onKeyUp = () => this.selectionManager.changeSelection(-1);
        this.onKeyDown = () => this.selectionManager.changeSelection(1);
        this.onKeyEnter = () => this.selectionManager.confirmSelection();
        this.onKeyBackspace = () => this.goBack();

        this.onKeySeven = () => {
            if (this.scene.canInteract) {
                this.scene.canInteract = false;
                this.scene.sound.play('confirmSound');

                this.scene.cameras.main.fadeOut(500, 0, 0, 0);
                this.scene.cameras.main.once('camerafadeoutcomplete', () => {
                    this.scene.scene.start('Editor');
                });
            }
        };

        this.onWheel = (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            if (deltaY > 0) {
                this.selectionManager.changeSelection(1);
            } else if (deltaY < 0) {
                this.selectionManager.changeSelection(-1);
            }
        };

        this.scene.input.keyboard.on('keydown-UP', this.onKeyUp);
        this.scene.input.keyboard.on('keydown-DOWN', this.onKeyDown);
        this.scene.input.keyboard.on('keydown-ENTER', this.onKeyEnter);
        this.scene.input.keyboard.on('keydown-BACKSPACE', this.onKeyBackspace);
        this.scene.input.keyboard.on('keydown-SEVEN', this.onKeySeven);

        this.scene.input.on('wheel', this.onWheel);
    }

    /**
     * Procesa la entrada del Gamepad. Debe llamarse desde el update() de la escena.
     */
    handleGamepadInput(time, delta) {
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
            if (currentState.up) {
                if (!this.prevGamepadState.up || (stickUp && time > this.stickScrollTimer)) {
                    this.selectionManager.changeSelection(-1);
                    this.stickScrollTimer = time + 200; // Delay para scroll
                }
            } else if (currentState.down) {
                if (!this.prevGamepadState.down || (stickDown && time > this.stickScrollTimer)) {
                    this.selectionManager.changeSelection(1);
                    this.stickScrollTimer = time + 200;
                }
            }
            
            if (!stickUp && !stickDown) {
                this.stickScrollTimer = 0; // Resetear timer al soltar joystick
            }

            // --- 2. Navegación con Gatillos Pequeños (Pulsación Única) ---
            // L1 -> Arriba / Anterior
            if (currentState.l1 && !this.prevGamepadState.l1) {
                this.selectionManager.changeSelection(-1);
            }
            // R1 -> Abajo / Siguiente
            if (currentState.r1 && !this.prevGamepadState.r1) {
                this.selectionManager.changeSelection(1);
            }

            // --- 3. Confirmar y Atrás ---
            if ((currentState.a && !this.prevGamepadState.a) || (currentState.start && !this.prevGamepadState.start)) {
                this.selectionManager.confirmSelection();
            }

            if (currentState.b && !this.prevGamepadState.b) {
                this.goBack();
            }

            // Guardar estado para el siguiente frame
            this.prevGamepadState = currentState;
            
            // Solo procesamos el primer mando activo
            break; 
        }
    }

    updateSelection() {
        this.selectionManager.updateSelection();
    }

    goBack() {
        if (!this.scene.canInteract) return;

        this.scene.canInteract = false;
        this.scene.cancelSound.play();
        this.scene.startExitState('introDance');
    }

    destroy() {
        this.scene.input.keyboard.off('keydown-UP', this.onKeyUp);
        this.scene.input.keyboard.off('keydown-DOWN', this.onKeyDown);
        this.scene.input.keyboard.off('keydown-ENTER', this.onKeyEnter);
        this.scene.input.keyboard.off('keydown-BACKSPACE', this.onKeyBackspace);
        this.scene.input.keyboard.off('keydown-SEVEN', this.onKeySeven);

        this.scene.input.off('wheel', this.onWheel);
    }
}