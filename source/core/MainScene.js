export class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
    }

    preload() {
        this.load.image('startImage', 'public/assets/images/UI/touchHereToPlay.png');
        this.load.image('funkay', 'public/assets/images/funkay.png');
        this.load.atlasXML('gfDance', 'public/assets/images/states/GFDanceState/gfDanceTitle.png', 'public/assets/images/states/GFDanceState/gfDanceTitle.xml');
        this.load.atlasXML('titleEnter', 'public/assets/images/states/GFDanceState/titleEnter.png', 'public/assets/images/states/GFDanceState/titleEnter.xml');
        this.load.atlasXML('logoBumpin', 'public/assets/images/states/GFDanceState/logoBumpin.png', 'public/assets/images/states/GFDanceState/logoBumpin.xml');
        this.load.atlasXML('backButton', 'public/assets/images/UI/mobile/backButton.png', 'public/assets/images/UI/mobile/backButton.xml');
        this.load.audio("cancelMenu", "public/assets/audio/sounds/cancelMenu.ogg");
    }

    create() {
        let startButton = this.add.image(640, 360, 'startImage').setScale(0.5).setInteractive();

        startButton.on('pointerdown', () => {
            startButton.destroy();
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

    shutdown() {
        this.input.keyboard.shutdown();
        this.input.mouse.shutdown();
        this.events.shutdown();
        super.shutdown();
    }
}