export default class FunScript {
    constructor(scene, sprites, boopController) {
        this.scene = scene;
        this.sprites = sprites;
        this.boopController = boopController;

        this.active = false;
        this.secretMusic = null;
        
        this.inputBuffer = []; 
        this.beatCounter = 0;
        this.hueOffset = 0;

        // Nueva Secuencia: Izq, Der, Izq, Der, Arriba, Abajo, Arriba, Abajo
        this.sequence = [
            Phaser.Input.Keyboard.KeyCodes.LEFT,
            Phaser.Input.Keyboard.KeyCodes.RIGHT,
            Phaser.Input.Keyboard.KeyCodes.LEFT,
            Phaser.Input.Keyboard.KeyCodes.RIGHT,
            Phaser.Input.Keyboard.KeyCodes.UP,
            Phaser.Input.Keyboard.KeyCodes.DOWN,
            Phaser.Input.Keyboard.KeyCodes.UP,
            Phaser.Input.Keyboard.KeyCodes.DOWN
        ];

        this._listener = null;

        this.touchStartX = 0;
        this.touchStartY = 0;
        this.minSwipeDistance = 30;

        // Estado previo del gamepad para "JustPressed"
        this.prevGamepadState = {
            up: false, down: false, left: false, right: false
        };
    }

    start() {
        if (this._listener) return;
        
        this._listener = (event) => this.checkInput(event.keyCode);
        this.scene.input.keyboard.on('keydown', this._listener);

        if (!this.scene.sys.game.device.os.desktop) {
            this.scene.input.on('pointerdown', this.handleTouchStart, this);
            this.scene.input.on('pointerup', this.handleTouchEnd, this);
        }
    }

    // Método llamado desde introDance.js
    update(time, delta) {
        if (this.active) return;
        this.handleGamepadInput();
    }

    handleGamepadInput() {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        
        for (const gamepad of gamepads) {
            if (!gamepad) continue;

            /**
             * Mapeo de controles:
             * D-Pad (Flechitas): Botones 12 (Arr), 13 (Abj), 14 (Izq), 15 (Der)
             * Joystick (Palanca): Axes 0 (Horiz), 1 (Vert)
             */
            const currentState = {
                // Arriba: Flechita Arriba (12) O Palanca hacia arriba (-1 en eje 1)
                up: gamepad.buttons[12]?.pressed || (gamepad.axes[1] < -0.5),
                
                // Abajo: Flechita Abajo (13) O Palanca hacia abajo (+1 en eje 1)
                down: gamepad.buttons[13]?.pressed || (gamepad.axes[1] > 0.5),
                
                // Izquierda: Flechita Izq (14) O Palanca hacia izq (-1 en eje 0)
                left: gamepad.buttons[14]?.pressed || (gamepad.axes[0] < -0.5),
                
                // Derecha: Flechita Der (15) O Palanca hacia der (+1 en eje 0)
                right: gamepad.buttons[15]?.pressed || (gamepad.axes[0] > 0.5)
            };

            // Detectar pulsaciones únicas ("Just Pressed")
            if (currentState.up && !this.prevGamepadState.up) this.checkInput(Phaser.Input.Keyboard.KeyCodes.UP);
            if (currentState.down && !this.prevGamepadState.down) this.checkInput(Phaser.Input.Keyboard.KeyCodes.DOWN);
            if (currentState.left && !this.prevGamepadState.left) this.checkInput(Phaser.Input.Keyboard.KeyCodes.LEFT);
            if (currentState.right && !this.prevGamepadState.right) this.checkInput(Phaser.Input.Keyboard.KeyCodes.RIGHT);
            
            this.prevGamepadState = currentState;
            break; // Solo procesamos el primer mando
        }
    }

    handleTouchStart(pointer) {
        this.touchStartX = pointer.x;
        this.touchStartY = pointer.y;
    }

    handleTouchEnd(pointer) {
        if (this.active) return;

        const dist = Phaser.Math.Distance.Between(this.touchStartX, this.touchStartY, pointer.x, pointer.y);
        
        if (dist < this.minSwipeDistance) return;

        const dx = pointer.x - this.touchStartX;
        const dy = pointer.y - this.touchStartY;
        
        let simulatedKey = null;

        if (Math.abs(dx) > Math.abs(dy)) {
            if (dx > 0) simulatedKey = Phaser.Input.Keyboard.KeyCodes.RIGHT;
            else simulatedKey = Phaser.Input.Keyboard.KeyCodes.LEFT;
        } else {
            if (dy > 0) simulatedKey = Phaser.Input.Keyboard.KeyCodes.DOWN;
            else simulatedKey = Phaser.Input.Keyboard.KeyCodes.UP;
        }

        if (simulatedKey) {
            this.checkInput(simulatedKey);
        }
    }

    checkInput(keyCode) {
        if (this.active) return;

        this.inputBuffer.push(keyCode);

        if (this.inputBuffer.length > this.sequence.length) {
            this.inputBuffer.shift();
        }

        if (this.checkBufferMatch()) {
            this.activateSecretMode();
            this.inputBuffer = [];
        }
    }

    checkBufferMatch() {
        if (this.inputBuffer.length !== this.sequence.length) return false;
        
        for (let i = 0; i < this.sequence.length; i++) {
            if (this.inputBuffer[i] !== this.sequence[i]) {
                return false;
            }
        }
        return true;
    }

    activateSecretMode() {
        console.log("[FunScript] ¡Código Secreto Activado!");
        this.active = true;

        if (navigator.vibrate) navigator.vibrate(70);

        this.scene.sound.stopAll();

        this.scene.sound.play("confirm", { volume: 1.0 });
        this.scene.cameras.main.flash(1000, 255, 255, 255);

        this.hueOffset = 0.125;
        this.scene.registry.set('hueOffset', this.hueOffset);
        this.applyShader();

        this.secretMusic = this.scene.sound.add("girlfriendsRingtone", { loop: true, volume: 0 });
        this.secretMusic.play();
        this.scene.tweens.add({ targets: this.secretMusic, volume: 1.0, duration: 4000 });

        if (this.boopController) this.boopController.setBPM(160);
        this.beatCounter = 0;
    }

    applyShader() {
        if (this.scene.game.renderer.type !== Phaser.WEBGL) return;

        const pipelineName = 'RainbowShader';
        
        if (!this.scene.renderer.pipelines.has(pipelineName)) {
            const fragShader = this.scene.cache.text.get('rainbowShader');
            
            if (!fragShader) {
                console.error("[FunScript] No se encontró el shader en cache.");
                return;
            }

            class RainbowPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
                constructor(game) {
                    super({
                        game: game,
                        renderTarget: true,
                        fragShader: fragShader
                    });
                }
                onPreRender() {
                    this.set1f('uTime', this.game.registry.get('hueOffset') || 0);
                }
            }

            this.scene.renderer.pipelines.addPostPipeline(pipelineName, RainbowPipeline);
        }

        if (this.sprites.gf) this.sprites.gf.setPostPipeline(pipelineName);
        if (this.sprites.logo) this.sprites.logo.setPostPipeline(pipelineName);
    }

    beatHit() {
        if (!this.active) return;

        this.beatCounter++;

        if (this.beatCounter % 4 === 0) {
            this.hueOffset += 0.125;
            this.scene.registry.set('hueOffset', this.hueOffset);
        }
    }

    shutdown() {
        if (this._listener) {
            this.scene.input.keyboard.off('keydown', this._listener);
            this._listener = null;
        }

        this.scene.input.off('pointerdown', this.handleTouchStart, this);
        this.scene.input.off('pointerup', this.handleTouchEnd, this);

        if (this.secretMusic) {
            this.secretMusic.stop();
            this.secretMusic = null;
        }

        if (this.active && this.scene.renderer.type === Phaser.WEBGL) {
             const pipelineName = 'RainbowShader';
             if (this.sprites.gf) this.sprites.gf.removePostPipeline(pipelineName);
             if (this.sprites.logo) this.sprites.logo.removePostPipeline(pipelineName);
        }

        this.active = false;
        this.inputBuffer = [];
        this.beatCounter = 0;
        this.hueOffset = 0;
    }
}