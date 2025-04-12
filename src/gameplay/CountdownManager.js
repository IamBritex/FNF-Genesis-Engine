export class CountdownManager {
    constructor(scene) {
        this.scene = scene;
        this.depth = 12; // Store depth value
        this.countdownData = [
            { sound: 'intro3', image: null },
            { sound: 'intro2', image: 'ready' },
            { sound: 'intro1', image: 'set' },
            { sound: 'introGo', image: 'go' }
        ];
    }

    preload() {
        this.scene.load.audio('intro3', 'public/assets/sounds/countdown/funkin/intro3.ogg');
        this.scene.load.audio('intro2', 'public/assets/sounds/countdown/funkin/intro2.ogg');
        this.scene.load.audio('intro1', 'public/assets/sounds/countdown/funkin/intro1.ogg');
        this.scene.load.audio('introGo', 'public/assets/sounds/countdown/funkin/introGo.ogg');

        this.scene.load.image('ready', 'public/assets/images/states/PlayState/countdown/funkin/ready.png');
        this.scene.load.image('set', 'public/assets/images/states/PlayState/countdown/funkin/set.png');
        this.scene.load.image('go', 'public/assets/images/states/PlayState/countdown/funkin/go.png');
    }

    create() {
        this.countdownSprites.forEach(sprite => {
            sprite.setDepth(12); // Above characters, below notes
        });
    }

    start(callback) {
        let step = 0;
        const songData = this.scene.songData;
        const bpm = songData?.song?.bpm || 100;
        const crochet = (60 / bpm) * 1000; // Tiempo entre beats en milisegundos
        let lastBeat = 0;

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
                        ).setDepth(this.depth);

                        // Destruir la imagen justo antes del siguiente beat
                        this.scene.time.delayedCall(crochet * 0.9, () => {
                            countdownImage.destroy();
                        });
                    }

                    step++;
                } else {
                    beatEvent.destroy(); // Detener el evento cuando termine el countdown
                    callback(); // Llamar al callback cuando termine
                }
            },
            loop: true
        });
    }
}