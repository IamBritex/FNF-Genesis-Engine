export class PauseInput extends Phaser.Events.EventEmitter {
    constructor(scene) {
        super();
        this.scene = scene;
        this.blocked = false;

        // Definir teclas
        this.keys = this.scene.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.UP,
            down: Phaser.Input.Keyboard.KeyCodes.DOWN,
            w: Phaser.Input.Keyboard.KeyCodes.W,
            s: Phaser.Input.Keyboard.KeyCodes.S,
            enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
            esc: Phaser.Input.Keyboard.KeyCodes.ESC
        });
    }

    update() {
        if (this.blocked) return;

        if (Phaser.Input.Keyboard.JustDown(this.keys.up) || Phaser.Input.Keyboard.JustDown(this.keys.w)) {
            this.emit('select', -1);
        }
        else if (Phaser.Input.Keyboard.JustDown(this.keys.down) || Phaser.Input.Keyboard.JustDown(this.keys.s)) {
            this.emit('select', 1);
        }
        else if (Phaser.Input.Keyboard.JustDown(this.keys.enter)) {
            this.emit('confirm');
        }
    }

    block() { this.blocked = true; }
    unblock() { this.blocked = false; }
}