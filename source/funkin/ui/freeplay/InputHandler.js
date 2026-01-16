export class InputHandler extends Phaser.Events.EventEmitter {
    constructor(scene) {
        super();
        this.scene = scene;
        this.blocked = false;

        this.cursors = this.scene.input.keyboard.createCursorKeys();
        this.enterKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        this.backKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.BACKSPACE);
        
        this.scrollSnd = this.scene.sound.add('scrollSound');
        this.cancelSnd = this.scene.sound.add('cancelSound');

        this.setupMouse();
        
        // Estado previo del gamepad para "Just Pressed"
        this.prevGamepadState = {
            up: false, down: false, left: false, right: false,
            l1: false, r1: false, // Semanas (o Scroll Rápido en Freeplay)
            l2: false, r2: false, // Dificultad
            a: false, b: false, x: false, y: false, start: false
        };
        
        this.stickScrollTimer = 0;
    }

    setupMouse() {
        this.scene.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            if (this.blocked) return;
            
            if (deltaY > 0) {
                this.emit('select', 1);
                this.scrollSnd.play();
            }
            else if (deltaY < 0) {
                this.emit('select', -1);
                this.scrollSnd.play();
            }
        });
    }

    update(time = 0, delta = 0) {
        if (this.blocked) return;

        // --- TECLADO ---
        if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
            this.emit('select', -1);
            this.scrollSnd.play();
        } 
        else if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
            this.emit('select', 1);
            this.scrollSnd.play();
        } 
        else if (Phaser.Input.Keyboard.JustDown(this.cursors.left)) {
            this.emit('diff', -1);
        } 
        else if (Phaser.Input.Keyboard.JustDown(this.cursors.right)) {
            this.emit('diff', 1);
        } 
        else if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
            this.emit('confirm');
        } 
        else if (Phaser.Input.Keyboard.JustDown(this.backKey)) {
            this.cancelSnd.play();
            this.emit('back');
        }
        
        // --- GAMEPAD ---
        this.handleGamepad(time);
    }

    handleGamepad(time) {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        
        for (const gamepad of gamepads) {
            if (!gamepad) continue;

            /**
             * Mapeo:
             * D-Pad: 12(Arr), 13(Abj), 14(Izq), 15(Der)
             * Joystick: Ejes 0 (Horiz), 1 (Vert)
             * L1(4)/R1(5): Scroll Rápido (Similar a Up/Down)
             * L2(6)/R2(7): Dificultad
             * A(0)/Start(9): Confirmar
             * B(1): Atrás
             * X(2)/Y(3): Dificultad
             */

            const stickUp = gamepad.axes[1] < -0.5;
            const stickDown = gamepad.axes[1] > 0.5;
            const stickLeft = gamepad.axes[0] < -0.5;
            const stickRight = gamepad.axes[0] > 0.5;

            // Manejo de gatillos analógicos o digitales
            const l2Pressed = (gamepad.buttons[6]?.value > 0.1) || gamepad.buttons[6]?.pressed;
            const r2Pressed = (gamepad.buttons[7]?.value > 0.1) || gamepad.buttons[7]?.pressed;

            const currentState = {
                up: gamepad.buttons[12]?.pressed || stickUp,
                down: gamepad.buttons[13]?.pressed || stickDown,
                left: gamepad.buttons[14]?.pressed || stickLeft,
                right: gamepad.buttons[15]?.pressed || stickRight,
                l1: gamepad.buttons[4]?.pressed,
                r1: gamepad.buttons[5]?.pressed,
                l2: l2Pressed,
                r2: r2Pressed,
                a: gamepad.buttons[0]?.pressed,
                b: gamepad.buttons[1]?.pressed,
                x: gamepad.buttons[2]?.pressed,
                y: gamepad.buttons[3]?.pressed,
                start: gamepad.buttons[9]?.pressed
            };

            // --- Scroll de Lista (Arriba/Abajo/L1/R1) ---
            
            // Arriba (Joystick/D-Pad)
            if (currentState.up) {
                if (!this.prevGamepadState.up || (stickUp && time > this.stickScrollTimer)) {
                    this.emit('select', -1);
                    this.scrollSnd.play();
                    this.stickScrollTimer = time + 150; // Un poco más rápido en freeplay
                }
            } 
            // Abajo (Joystick/D-Pad)
            else if (currentState.down) {
                if (!this.prevGamepadState.down || (stickDown && time > this.stickScrollTimer)) {
                    this.emit('select', 1);
                    this.scrollSnd.play();
                    this.stickScrollTimer = time + 150;
                }
            }

            // L1 -> Arriba (Just Pressed)
            if (currentState.l1 && !this.prevGamepadState.l1) {
                this.emit('select', -1);
                this.scrollSnd.play();
            }
            // R1 -> Abajo (Just Pressed)
            if (currentState.r1 && !this.prevGamepadState.r1) {
                this.emit('select', 1);
                this.scrollSnd.play();
            }
            
            // Si soltamos joystick vertical
            if (!stickUp && !stickDown) {
                if (!stickLeft && !stickRight) { // Si soltamos todo el stick
                    this.stickScrollTimer = 0;
                }
            }

            // --- Dificultad (Izq/Der/L2/R2/X/Y) ---

            // Izquierda
            if (currentState.left) {
                if (!this.prevGamepadState.left || (stickLeft && time > this.stickScrollTimer)) {
                    this.emit('diff', -1);
                    this.stickScrollTimer = time + 200;
                }
            }
            // Derecha
            else if (currentState.right) {
                if (!this.prevGamepadState.right || (stickRight && time > this.stickScrollTimer)) {
                    this.emit('diff', 1);
                    this.stickScrollTimer = time + 200;
                }
            }

            // L2 / X -> Dificultad Anterior
            if ((currentState.l2 && !this.prevGamepadState.l2) || (currentState.x && !this.prevGamepadState.x)) {
                this.emit('diff', -1);
            }
            // R2 / Y -> Dificultad Siguiente
            if ((currentState.r2 && !this.prevGamepadState.r2) || (currentState.y && !this.prevGamepadState.y)) {
                this.emit('diff', 1);
            }

            // --- Confirmar y Atrás ---
            if ((currentState.a && !this.prevGamepadState.a) || (currentState.start && !this.prevGamepadState.start)) {
                this.emit('confirm');
            }

            if (currentState.b && !this.prevGamepadState.b) {
                this.cancelSnd.play();
                this.emit('back');
            }

            this.prevGamepadState = currentState;
            break; // Solo primer mando
        }
    }
}