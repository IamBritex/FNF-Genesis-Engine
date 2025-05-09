class IntroMenu extends Phaser.Scene {
    constructor() {
        super({ key: "IntroMenu" });
        this.music = null;
        this.randomTextPairs = [];
    }

    preload() {
        this.load.audio('introMusic', 'public/assets/audio/sounds/FreakyMenu.mp3');
        this.load.image('newgrounds', 'public/assets/images/UI/newgrounds.svg');
        this.load.text('introRandomText', 'public/assets/data/introRandomText.txt');
    }

    create() {
        console.log("IntroMenu cargado correctamente");
        const bpmTime = Math.floor((60 / 102) * 1235);

        // Inicializar soporte Android
        if (this.game.device.os.android) {
            this.input.on('pointerdown', () => {
                if (!sceneEnded) {
                    sceneEnded = true;
                    this.scene.get("FlashEffect").startTransition("GfDanceState");
                }
            });

            if (window.AndroidSupport) {
                window.AndroidSupport.initialize(this);
            }
        }

        // Procesar el archivo de texto y convertir a mayúsculas
        const textFile = this.cache.text.get('introRandomText');
        this.randomTextPairs = textFile.split('\n')
            .filter(line => line.trim() !== '')
            .map(line => {
                const parts = line.split('--').map(part => part.trim().toUpperCase()); // Convertir a mayúsculas
                return parts.length >= 2 ? parts : [parts[0], '']; 
            });

        // Pasos con textos en mayúsculas
        const steps = [
            { text: "FUNKIN' CREW", wait: 1 },
            { text: "PRESENTS", wait: 1.5 },
            { clear: true, wait: 1.6 },
            { text: "NOT ASSOCIATED WITH ", wait: 1.3 },
            { text: "NEWGROUNDS", image: "newgrounds", wait: 1.3 },
            { clear: true, wait: 0.6 },
            { randomPart: 0, wait: 1 },
            { randomPart: 1, wait: 1 },
            { clear: true, wait: 0.1 },
            { text: "FRIDAY", wait: 1 },
            { text: "NIGHT", wait: 1 },
            { text: "FUNKIN", wait: 0.5 },
        ];

        let index = 0;
        this.music = this.sound.add('introMusic', { loop: true });
        this.music.play();

        let texts = [];
        let imageObj = null;
        const startY = 300;
        const lineSpacing = 70;
        let currentYOffset = 0;
        let sceneEnded = false;
        let currentRandomPair = null;

        const processStep = () => {
            if (sceneEnded) return;

            if (index >= steps.length) {
                this.time.delayedCall(190, () => {
                    this.scene.get("FlashEffect").startTransition("GfDanceState");
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
                // Texto normal (ya está en mayúsculas en el array steps)
                const text = this.add.text(640, startY + currentYOffset, step.text, {
                    fontFamily: 'FNF',
                    fontSize: 80,
                    color: '#FFFFFF',
                    align: 'center'
                }).setOrigin(0.5);
                texts.push(text);
                currentYOffset += lineSpacing;
            }
            else if (step.randomPart !== undefined) {
                // Parte de un texto aleatorio (ya convertido a mayúsculas)
                if (step.randomPart === 0 || !currentRandomPair) {
                    currentRandomPair = this.getRandomTextPair();
                }
                
                if (currentRandomPair && currentRandomPair[step.randomPart]) {
                    const text = this.add.text(640, startY + currentYOffset, currentRandomPair[step.randomPart], {
                        fontFamily: 'FNF',
                        fontSize: 48,
                        color: '#FFFFFF',
                        align: 'center'
                    }).setOrigin(0.5);
                    texts.push(text);
                    currentYOffset += lineSpacing;
                }
            }

            if (step.image) {
                if (imageObj) imageObj.destroy();
                imageObj = this.add.image(640, startY + currentYOffset + 80, step.image).setScale(1);
                currentYOffset += 100;
            }

            index++;
            this.time.delayedCall(step.wait * bpmTime, processStep);
        };

        processStep();

        this.input.keyboard.on('keydown-ENTER', () => {
            if (!sceneEnded) {
                sceneEnded = true;
                this.scene.get("FlashEffect").startTransition("GfDanceState");
            }
        });
    }

    getRandomTextPair() {
        if (this.randomTextPairs.length === 0) return ["PART 1", "PART 2"];
        const randomIndex = Math.floor(Math.random() * this.randomTextPairs.length);
        return this.randomTextPairs[randomIndex];
    }
}

game.scene.add("IntroMenu", IntroMenu);