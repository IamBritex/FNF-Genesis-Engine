export class CountdownManager {
    constructor(scene) {
        this.scene = scene;
        this.depth = 100; // Mantener el depth alto para la UI
        this.countdownData = [
            { sound: 'intro3', image: null },
            { sound: 'intro2', image: 'ready' },
            { sound: 'intro1', image: 'set' },
            { sound: 'introGo', image: 'go' }
        ];
        this.activeImages = []; // Para rastrear imágenes activas
    }

    preload() {
        this.scene.load.audio('intro3', 'public/assets/audio/sounds/countdown/funkin/intro3.ogg');
        this.scene.load.audio('intro2', 'public/assets/audio/sounds/countdown/funkin/intro2.ogg');
        this.scene.load.audio('intro1', 'public/assets/audio/sounds/countdown/funkin/intro1.ogg');
        this.scene.load.audio('introGo', 'public/assets/audio/sounds/countdown/funkin/introGo.ogg');

        this.scene.load.image('ready', 'public/assets/images/UI/countdown/funkin/ready.png');
        this.scene.load.image('set', 'public/assets/images/UI/countdown/funkin/set.png');
        this.scene.load.image('go', 'public/assets/images/UI/countdown/funkin/go.png');
    }

    start(callback) {
        let step = 0;
        const songData = this.scene.songData;
        const bpm = songData?.song?.bpm || 100;
        const crochet = (60 / bpm) * 1000;
        const fadeDuration = crochet * 0.5;

        this.clearActiveImages();

        // Establecer posición inicial de la cámara antes del countdown
        if (this.scene.cameraController) {
            this.scene.cameraController.gameCamera.setScroll(
                0,
                0
            );
        }

        const beatEvent = this.scene.time.addEvent({
            delay: crochet,
            callback: () => {
                if (step < this.countdownData.length) {
                    const { sound, image } = this.countdownData[step];
                    
                    const countdownSound = this.scene.sound.add(sound);
                    countdownSound.play();

                    if (image) {
                        const countdownImage = this.scene.add.image(
                            this.scene.scale.width / 2,
                            this.scene.scale.height / 2,
                            image
                        )
                        .setDepth(this.depth);

                        // Añadir la imagen del countdown a la capa UI
                        if (this.scene.cameraController) {
                            this.scene.cameraController.addToUILayer(countdownImage);
                        }

                        this.activeImages.push(countdownImage);

                        this.scene.tweens.add({
                            targets: countdownImage,
                            alpha: 0,
                            duration: fadeDuration,
                            ease: 'Power1',
                            delay: crochet * 0.5,
                            onComplete: () => {
                                countdownImage.destroy();
                                this.activeImages = this.activeImages.filter(img => img !== countdownImage);
                            }
                        });
                    }

                    step++;
                } else {
                    beatEvent.destroy();
                    callback();
                }
            },
            loop: true,
            callbackScope: this
        });
    }

    clearActiveImages() {
        // Destruir todas las imágenes activas y limpiar el array
        this.activeImages.forEach(image => {
            if (image && typeof image.destroy === 'function') {
                image.destroy();
            }
        });
        this.activeImages = [];
    }
}