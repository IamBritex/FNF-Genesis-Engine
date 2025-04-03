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
        const bpm = songData?.bpm || 100; // Default to 100 if no BPM specified
        const crochet = (60 / bpm) * 1000; // Convert BPM to milliseconds

        const showStep = () => {
            if (step < this.countdownData.length) {
                const { sound, image } = this.countdownData[step];
                const countdownSound = this.scene.sound.add(sound);
                countdownSound.play();

                if (image) {
                    const countdownImage = this.scene.add.image(
                        this.scene.scale.width / 2, 
                        this.scene.scale.height / 2, 
                        image
                    ).setDepth(this.depth); // Set depth when creating image
                    
                    // Destroy image after one beat
                    this.scene.time.delayedCall(crochet, () => {
                        countdownImage.destroy();
                    });
                }

                // Wait one beat before next step
                this.scene.time.delayedCall(crochet, () => {
                    step++;
                    showStep();
                });
            } else {
                callback();
            }
        };

        showStep();
    }
}