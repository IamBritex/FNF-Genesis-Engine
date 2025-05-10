export class CountdownManager {
    constructor(scene) {
        this.scene = scene;
        this.depth = 100; // Ajustado para estar por encima de personajes (50-70) pero debajo de UI (100+)
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
        const crochet = (60 / bpm) * 1000; // Tiempo entre beats en milisegundos
        const fadeDuration = crochet * 0.5; // Duración del fade out

        // Limpiar imágenes previas si las hay
        this.clearActiveImages();

        // Crear un evento que se ejecute en cada beat
        const beatEvent = this.scene.time.addEvent({
            delay: crochet,
            callback: () => {
                if (step < this.countdownData.length) {
                    const { sound, image } = this.countdownData[step];
                    
                    // Reproducir el sonido del countdown
                    const countdownSound = this.scene.sound.add(sound);
                    countdownSound.play();

                    // Mostrar la imagen si existe
                    if (image) {
                        const countdownImage = this.scene.add.image(
                            this.scene.scale.width / 2,
                            this.scene.scale.height / 2,
                            image
                        )
                        .setDepth(this.depth)
                        .setAlpha(1); // Asegurar que empieza visible

                        // Añadir a la lista de imágenes activas
                        this.activeImages.push(countdownImage);

                        // Efecto de fade out
                        this.scene.tweens.add({
                            targets: countdownImage,
                            alpha: 0,
                            duration: fadeDuration,
                            ease: 'Power1',
                            delay: crochet * 0.5, // Comenzar fade out a la mitad del tiempo
                            onComplete: () => {
                                countdownImage.destroy();
                                // Remover de la lista de activas
                                this.activeImages = this.activeImages.filter(img => img !== countdownImage);
                            }
                        });
                    }

                    step++;
                } else {
                    beatEvent.destroy(); // Detener el evento cuando termine el countdown
                    callback(); // Llamar al callback cuando termine
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