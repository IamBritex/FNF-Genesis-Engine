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
    }

    setupMouse() {
        this.scene.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            if (this.blocked) return;
            
            // CORRECCIÓN: Reproducir sonido al usar la rueda
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

    update() {
        if (this.blocked) return;

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
    }
}