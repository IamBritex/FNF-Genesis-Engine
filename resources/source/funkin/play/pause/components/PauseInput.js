import { PauseGamepadInput } from "./PauseGamepadInput.js";

export class PauseInput extends Phaser.Events.EventEmitter {
    constructor(scene) {
        super();
        this.scene = scene;
        this.blocked = false;

        // --- TECLADO ---
        this.cursors = this.scene.input.keyboard.createCursorKeys();
        this.enterKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        this.backKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.BACKSPACE);
        this.escKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

        // --- GAMEPAD (Modular) ---
        this.gamepadInput = new PauseGamepadInput();
        this.setupGamepadEvents();
    }

    setupGamepadEvents() {
        if (!this.gamepadInput) return;

        // Conectar eventos del gamepad a este InputHandler
        this.gamepadInput.on('navigate', (dir) => {
            if (!this.blocked) {
                this.emit('select', dir);
            }
        });

        this.gamepadInput.on('confirm', () => {
            if (!this.blocked) this.emit('confirm');
        });

        this.gamepadInput.on('back', () => {
            if (!this.blocked) this.emit('back');
        });
    }

    update(time, delta) {
        if (this.blocked) return;

        // Actualizar módulo de Gamepad
        if (this.gamepadInput) {
            this.gamepadInput.update(time);
        }

        // --- Actualizar Teclado ---
        if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
            this.emit('select', -1);
            this.audioManager?.playScroll();
        } 
        else if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
            this.emit('select', 1);
            this.audioManager?.playScroll();
        } 
        else if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
            this.emit('confirm');
        } 
        else if (Phaser.Input.Keyboard.JustDown(this.backKey) || Phaser.Input.Keyboard.JustDown(this.escKey)) {
            this.emit('back');
        }
    }

    block() {
        this.blocked = true;
    }

    destroy() {
        this.removeAllListeners();
        
        // Destruir teclas
        if (this.enterKey) this.enterKey.destroy();
        if (this.backKey) this.backKey.destroy();
        if (this.escKey) this.escKey.destroy();

        // Destruir módulo gamepad
        if (this.gamepadInput) {
            this.gamepadInput.destroy();
            this.gamepadInput = null;
        }
    }
}