export class SMInputGamepad {
    constructor(handler) {
        this.handler = handler;
        this.prevGamepadState = {
            up: false, down: false, left: false, right: false,
            l1: false, r1: false,
            l2: false, r2: false,
            a: false, b: false, x: false, y: false, start: false
        };
        this.stickScrollTimer = 0;
    }

    update(time, delta) {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        
        for (const gamepad of gamepads) {
            if (!gamepad) continue;

            const stickUp = gamepad.axes[1] < -0.5;
            const stickDown = gamepad.axes[1] > 0.5;
            const stickLeft = gamepad.axes[0] < -0.5;
            const stickRight = gamepad.axes[0] > 0.5;

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

            if (currentState.up) {
                if (!this.prevGamepadState.up || (stickUp && time > this.stickScrollTimer)) {
                    this.handler.navigateWeek(-1);
                    this.stickScrollTimer = time + 200;
                }
            } 
            else if (currentState.down) {
                if (!this.prevGamepadState.down || (stickDown && time > this.stickScrollTimer)) {
                    this.handler.navigateWeek(1);
                    this.stickScrollTimer = time + 200;
                }
            }
            
            if (currentState.l1 && !this.prevGamepadState.l1) {
                this.handler.navigateWeek(-1);
            }
            if (currentState.r1 && !this.prevGamepadState.r1) {
                this.handler.navigateWeek(1);
            }

            if (currentState.left) {
                if (!this.prevGamepadState.left || (stickLeft && time > this.stickScrollTimer)) {
                    this.handler.navigateDifficulty(-1);
                    this.stickScrollTimer = time + 200;
                }
            } 
            else if (currentState.right) {
                if (!this.prevGamepadState.right || (stickRight && time > this.stickScrollTimer)) {
                    this.handler.navigateDifficulty(1);
                    this.stickScrollTimer = time + 200;
                }
            }

            if (!currentState.left && this.prevGamepadState.left) this.handler.releaseDifficulty(-1);
            if (!currentState.right && this.prevGamepadState.right) this.handler.releaseDifficulty(1);

            if (currentState.l2 && !this.prevGamepadState.l2) {
                this.handler.navigateDifficulty(-1);
            }
            if (currentState.r2 && !this.prevGamepadState.r2) {
                this.handler.navigateDifficulty(1);
            }

            if (currentState.x && !this.prevGamepadState.x) {
                this.handler.navigateDifficulty(-1);
            }
            if (currentState.y && !this.prevGamepadState.y) {
                this.handler.navigateDifficulty(1);
            }

            if (!stickUp && !stickDown && !stickLeft && !stickRight) {
                this.stickScrollTimer = 0;
            }

            if ((currentState.a && !this.prevGamepadState.a) || (currentState.start && !this.prevGamepadState.start)) {
                this.handler.confirm();
            }

            if (currentState.b && !this.prevGamepadState.b) {
                this.handler.back();
            }

            this.prevGamepadState = currentState;
            break;
        }
    }
}