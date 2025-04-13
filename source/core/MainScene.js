export class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
    }

    preload() {
        this.load.image('newgrounds', 'public/assets/images/UI/newgrounds.svg');
        this.load.image('startImage', 'public/assets/images/UI/touchHereToPlay.png');
        this.load.image('funkay', 'public/assets/images/funkay.png');
        this.load.atlasXML('gfDance', 'public/assets/images/states/IntroMenu/gfDanceTitle.png', 'public/assets/images/states/IntroMenu/gfDanceTitle.xml');
        this.load.atlasXML('titleEnter', 'public/assets/images/states/IntroMenu/titleEnter.png', 'public/assets/images/states/IntroMenu/titleEnter.xml');
        this.load.atlasXML('logoBumpin', 'public/assets/images/states/IntroMenu/logoBumpin.png', 'public/assets/images/states/IntroMenu/logoBumpin.xml');
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