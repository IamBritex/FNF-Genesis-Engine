export class CountdownManager {
    constructor(scene) {
        this.scene = scene;
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

    start(callback) {
        let step = 0;

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
                    );
                    countdownSound.on('complete', () => {
                        countdownImage.destroy();
                    });
                }

                countdownSound.on('complete', () => {
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