export class touchHere extends Phaser.Scene {
    constructor() {
        super({ key: 'touchHere' });
    }

    preload() {
        this.load.image('startImage', 'public/assets/images/UI/touchHereToPlay.png');
    }

    create() {
        let startButton = this.add.image(640, 360, 'startImage')
            .setScale(0.5)
            .setInteractive({ useHandCursor: true });

        startButton.on('pointerdown', () => {
            this.tweens.add({
                targets: startButton,
                scale: 0,
                alpha: 0,
                duration: 200,
                ease: 'Power2',
                onComplete: () => {
                    startButton.destroy();
                    this.scene.start('IntroMenu');
                    this.scene.get('VolumeUIScene').scene.bringToTop();
                }
            });
        });

        // --- Animations ---

        startButton.on('pointerover', () => {
            this.tweens.add({
                targets: startButton,
                scale: 0.55,
                duration: 100,
                ease: 'Sine.easeInOut'
            });
        });

        startButton.on('pointerout', () => {
            this.tweens.add({
                targets: startButton,
                scale: 0.5,
                duration: 100,
                ease: 'Sine.easeInOut'
            });
        });
    }

    shutdown() {
        this.input.keyboard.shutdown();
        this.input.mouse.shutdown();
        this.events.shutdown();
        super.shutdown();
    }
}