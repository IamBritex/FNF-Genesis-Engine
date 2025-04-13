class IntroMenu extends Phaser.Scene {
    constructor() {
        super({ key: "IntroMenu" });
        this.music = null;
        this.randomTexts = []; // Almacenará las líneas del archivo de texto
    }

    preload() {
        this.load.audio('introMusic', 'public/assets/audio/sounds/FreakyMenu.mp3');
        this.load.image('newgrounds', 'public/assets/images/UI/newgrounds.svg');
        this.load.text('introRandomText', 'public/assets/data/introRandomText.txt'); // Cargar el archivo de texto
    }

    create() {
        console.log("IntroMenu cargado correctamente");
        const bpmTime = Math.floor((60 / 102) * 1235);

        // Inicializar soporte Android si es necesario y está disponible
        if (this.game.device.os.android) {
            // Añadir soporte táctil directo además del AndroidSupport
            this.input.on('pointerdown', () => {
                if (!sceneEnded) {
                    sceneEnded = true;
                    this.scene.get("FlashEffect").startTransition("GfDanceState");
                }
            });

            // Inicializar AndroidSupport si está disponible
            if (window.AndroidSupport) {
                window.AndroidSupport.initialize(this);
            }
        }

        // Obtener las líneas del archivo de texto
        const textFile = this.cache.text.get('introRandomText');
        this.randomTexts = textFile.split('\n').filter(line => line.trim() !== ''); // Dividir por líneas y eliminar vacías

        const steps = [
            { text: "Funkin' Crew", wait: 1 },
            { text: "Presents", wait: 1.5 },
            { clear: true, wait: 1.6 },
            { text: "Not associated with", wait: 1.3 },
            { text: "Newgrounds", image: "newgrounds", wait: 1.3 },
            { clear: true, wait: 0.6 },
            { text: this.getRandomText(), wait: 1 }, // Obtener texto aleatorio
            { text: this.getRandomText(), wait: 1 }, // Obtener texto aleatorio
            { clear: true, wait: 0.1 },
            { text: "Friday", wait: 1 },
            { text: "Night", wait: 1 },
            { text: "Funkin", wait: 0.5 },
        ];

        let index = 0;
        this.music = this.sound.add('introMusic', { loop: true });
        this.music.play();

        let texts = []; // Almacena los objetos de texto para poder eliminarlos después
        let imageObj = null; // Almacena la imagen para poder eliminarla después
        const startY = 300; // Posición inicial en Y para el texto
        const lineSpacing = 55; // Espaciado entre líneas de texto
        let currentYOffset = 0; // Desplazamiento actual en Y
        let sceneEnded = false; // Controla si la escena ah terminado o no

        const processStep = () => {
            if (sceneEnded) return;

            if (index >= steps.length) {
                this.time.delayedCall(190, () => {
                    // Usar la transición antes de cambiar de escena
                    this.scene.get("FlashEffect").startTransition("GfDanceState");
                });
                return;
            }

            let step = steps[index];

            if (step.clear) {
                // Eliminar todos los textos y la imagen si existen
                texts.forEach(t => t.destroy());
                texts = [];
                if (imageObj) {
                    imageObj.destroy();
                    imageObj = null;
                }
                currentYOffset = 0; // Reiniciar el desplazamiento en Y
            }

            if (step.text) {
                // Crear texto usando el sistema de texto de Phaser
                const text = this.add.text(640, startY + currentYOffset, step.text, {
                    fontFamily: 'Arial',
                    fontSize: 48,
                    color: '#ffffff',
                    align: 'center'
                }).setOrigin(0.5); // Centrar el texto
                texts.push(text); // Almacenar el texto para poder eliminarlo después
                currentYOffset += lineSpacing; // Aumentar el desplazamiento en Y
            }

            if (step.image) {
                // Eliminar la imagen anterior si existe
                if (imageObj) imageObj.destroy();
                // Crear la nueva imagen
                imageObj = this.add.image(640, startY + currentYOffset + 80, step.image).setScale(1);
                currentYOffset += 100; // Aumentar el desplazamiento en Y
            }

            index++; // Pasar al siguiente paso
            this.time.delayedCall(step.wait * bpmTime, processStep); // Llamar a processStep después del tiempo de espera
        };

        processStep(); // Iniciar el proceso

        // Manejar la tecla ENTER para saltar la escena
        this.input.keyboard.on('keydown-ENTER', () => {
            if (!sceneEnded) {
                sceneEnded = true;
                // Usar la transición antes de cambiar de escena
                this.scene.get("FlashEffect").startTransition("GfDanceState");
            }
        });
    }

    getRandomText() {
        if (this.randomTexts.length === 0) return "Random Text"; // Por si no hay textos
        const randomIndex = Math.floor(Math.random() * this.randomTexts.length);
        return this.randomTexts[randomIndex];
    }
}

// Añadir la escena al juego
game.scene.add("IntroMenu", IntroMenu);