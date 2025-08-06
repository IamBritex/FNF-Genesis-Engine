class AwardsState extends Phaser.Scene {
    constructor() {
        super({ key: "AwardsState" });
        this.keyState = {};
    }

    preload() {
        this.load.image("menuBGBlue", "public/assets/images/menuBGBlue.png");
        this.load.image("bubbleBox", "public/assets/images/states/AwardsState/bubbleBox.png")
        this.load.image("lockedachievement", "public/assets/images/states/AwardsState/lockedachievement.png")
        this.load.atlasXML("menuAwards", "public/assets/images/states/AwardsState/menuAwards.png", "public/assets/images/states/AwardsState/menuAwards.xml")
    }

    create() {
        // Configuración del fondo
        const bg = this.add.image(0, 0, "menuBGBlue");
        bg.setOrigin(0, 0);
        bg.setDisplaySize(this.game.config.width, this.game.config.height);


        // Crear sprite de premios (ajustado a la posición de tu JSON)
        const awardsSprite = this.add.sprite(650, 100, "menuAwards"); // Usando posición del JSON
        awardsSprite.setOrigin(0.5).setScale(1.2);

        this.anims.create({
            key: "awards",
            frames: this.anims.generateFrameNames("menuAwards", {
                prefix: "awards white",
                start: 0,
                end: 2,
                zeroPad: 4,
            }),
            frameRate: 12,
            repeat: -1
        });

        awardsSprite.play("awards");

        // BubbleBox debajo del awards (con mayor separación)
        const bubbleBox = this.add.image(
            awardsSprite.x, // Centrado igual que awards
            awardsSprite.y + awardsSprite.height + 95, // 95px de separación
            "bubbleBox"
        );
        bubbleBox.setOrigin(0.5);


        // Icono de logro bloqueado (lado izquierdo)
        const achievementIcon = this.add.image(
            bubbleBox.x - bubbleBox.width * 0.37, // 35% a la izquierda del centro
            bubbleBox.y, // Misma altura que bubbleBox
            "lockedachievement"
        );
        achievementIcon.setDisplaySize(100, 100); // Tamaño ajustado
        achievementIcon.setOrigin(0.5);
        achievementIcon.setAlpha(0.9); // Ligera transparencia
        achievementIcon.setScale(1.2);

        // Configuración de texto dentro del bubbleBox (ajustado por el icono)
        const textStartX = bubbleBox.x - bubbleBox.width * 0.25; // Comienza más a la derecha por el icono
        const textWidth = bubbleBox.width * 0.6; // Ancho reducido por el icono
        const squareY = bubbleBox.y - bubbleBox.height / 2;

        // Título del logro (primera línea)
        const titleText = this.add.text(
            textStartX,
            squareY + 30,
            "Logro Bloqueado", {
            font: "28px VCR",
            color: "#000000",
            fontWeight: "bold",
            wordWrap: { width: textWidth }
        }
        );

        // Descripción del logro (segunda línea)
        const descText = this.add.text(
            textStartX,
            squareY + 80,
            "Completa 10 canciones en modo difícil para desbloquear este logro.", {
            font: "20px VCR",
            color: "#000000",
            wordWrap: { width: textWidth }
        }
        );

        // Volver atrás  
        this.input.keyboard.on('keydown-BACKSPACE', () => {
            if (this.keyState['BACKSPACE']) return;
            this.keyState['BACKSPACE'] = true;
            this.handleBack();
        });

        this.input.keyboard.on('keyup-BACKSPACE', () => {
            this.keyState['BACKSPACE'] = false;
        });
    }

    handleBack() {
        // Asegúrate de que esta función esté definida
        this.scene.start("MainMenuState"); // Ejemplo: volver al menú principal
    }
}

game.scene.add("AwardsState", AwardsState);