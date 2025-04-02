export class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
    }

    preload() {
        this.load.image('startImage', 'public/assets/images/touchHereToPlay.png');
        this.load.image('funkay', 'public/assets/images/funkay.png');
    }

    create() {
        let startButton = this.add.image(640, 360, 'startImage').setScale(0.5).setInteractive();

        startButton.on('pointerdown', () => {
            startButton.destroy();
            // Mantener la escena del volumen al cambiar
            this.scene.start('IntroMenu');
            this.scene.get('VolumeUIScene').scene.bringToTop();
        });

        startButton.on('pointerover', () => {
            startButton.setScale(0.55);
            this.input.manager.canvas.style.cursor = 'pointer';
        });

        startButton.on('pointerout', () => {
            startButton.setScale(0.5);
            this.input.manager.canvas.style.cursor = 'default';
        });
    }

    // Método para limpiar la escena
    shutdown() {
        // Limpiar todos los eventos y objetos
        this.input.keyboard.shutdown();
        this.input.mouse.shutdown();
        this.events.shutdown();
        super.shutdown();
    }
}