class IntroMenu extends Phaser.Scene {
    constructor() {
        super({ key: "IntroMenu" });
        this.music = null; 
    }

    preload() {
        this.load.audio('introMusic', 'assets/music/FreakyMenu.mp3');
        this.load.image('newgrounds', 'assets/images/newgrounds.svg');
    }

    create() {
        console.log("IntroMenu cargado correctamente");
        const bpmTime = Math.floor((60 / 102) * 1235);

        const steps = [
            { text: "The Funkin Crew Inc", wait: 1 },
            { text: "Presents", wait: 1.5 },
            { clear: true, wait: 1.6 },
            { text: "Not associated with", wait: 1.3 },
            { text: "Newgrounds", image: "newgrounds", wait: 1.3 },
            { clear: true, wait: 0.6 },
            { text: "texto random 1", wait: 1 },
            { text: "texto random 2", wait: 1 },
            { clear: true, wait: 0.1 },
            { text: "Friday", wait: 1 },
            { text: "Night", wait: 1 },
            { text: "Funkin", wait: 0.5 },  
        ];

        let index = 0;
        this.music = this.sound.add('introMusic', { loop: true });
        this.music.play();

        let texts = [];
        let imageObj = null;
        const startY = 300;
        const lineSpacing = 40;
        let currentYOffset = 0;
        let sceneEnded = false;

        const processStep = () => {
            if (sceneEnded) return;

            if (index >= steps.length) {
                this.time.delayedCall(190, () => { 
                    this.scene.start("GfDanceState");
                });
                return;
            }

            let step = steps[index];

            if (step.clear) {
                texts.forEach(t => t.destroy());
                texts = [];
                if (imageObj) {
                    imageObj.destroy();
                    imageObj = null;
                }
                currentYOffset = 0;
            }

            if (step.text) {
                let textObj = this.add.text(
                    640,
                    startY + currentYOffset,
                    step.text,
                    { font: "40px Arial", fill: "#fff" }
                ).setOrigin(0.5);
                texts.push(textObj);
                currentYOffset += lineSpacing;
            }

            if (step.image) {
                if (imageObj) imageObj.destroy();
                imageObj = this.add.image(
                    640,
                    startY + currentYOffset + 80,
                    step.image
                ).setScale(1);
                currentYOffset += 100;
            }

            index++;
            this.time.delayedCall(step.wait * bpmTime, processStep);
        };

        processStep();

        this.input.keyboard.on('keydown-ENTER', () => {
            if (!sceneEnded) {
                sceneEnded = true; 
                this.scene.start("GfDanceState");
            }
        });
    }
}

game.scene.add("IntroMenu", IntroMenu);