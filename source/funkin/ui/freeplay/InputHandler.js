export class InputHandler {
    constructor(scene, ui) {
        this.scene = scene;
        this.ui = ui;
        
        this.cursors = null;
        this.enterKey = null;
        this.backKey = null;
        
        // Sonido de navegación (Back)
        this.cancelSnd = this.scene.sound.add('cancelSound');
    }

    setupInput() {
        this.cursors = this.scene.input.keyboard.createCursorKeys();
        this.enterKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        this.backKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.BACKSPACE);

        // --- Soporte para Mouse Wheel (Scroll) ---
        this.scene.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            // Bloquear si la UI no está lista o ya se seleccionó una canción
            if (!this.ui || !this.ui.grpSongs || this.ui.selectingSong) return;

            if (deltaY > 0) {
                // Scroll hacia abajo -> Siguiente canción
                this.ui.changeSelection(1);
            } else if (deltaY < 0) {
                // Scroll hacia arriba -> Canción anterior
                this.ui.changeSelection(-1);
            }
        });
    }

    update() {
        // Bloquear input si la UI no está lista o se está transicionando
        if (!this.ui || !this.ui.grpSongs || this.ui.selectingSong) return;

        if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
            this.ui.changeSelection(-1);
        } else if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
            this.ui.changeSelection(1);
        } else if (Phaser.Input.Keyboard.JustDown(this.cursors.left)) {
            this.ui.changeDiff(-1);
        } else if (Phaser.Input.Keyboard.JustDown(this.cursors.right)) {
            this.ui.changeDiff(1);
        } else if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
            this.ui.selectSong();
        } else if (Phaser.Input.Keyboard.JustDown(this.backKey)) {
            this.goToMenu();
        }
    }

    goToMenu() {
        if (this.ui.selectingSong) return;

        if (this.cancelSnd) {
            this.cancelSnd.play();
        }

        // --- CORRECCIÓN AQUÍ ---
        this.scene.scene.start('MainMenuScene');
    }
}