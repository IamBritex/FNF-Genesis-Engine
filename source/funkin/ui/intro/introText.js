import Alphabet from "../../../utils/Alphabet.js";

class IntroMenu extends Phaser.Scene {
  constructor() {
    super({ key: "IntroMenu" });
    this.music = null;
    this.randomTextPairs = [];
    this.texts = [];
    this.imageObj = null;
    this.currentYOffset = 0;
    this.sceneEnded = false;
    this.currentRandomPair = null;
    
    this.startY = 300;
    this.lineSpacing = 55;
  }

  preload() {
    this.load.audio("freakyMenu", "public/assets/audio/sounds/FreakyMenu.mp3");
    this.load.image("newgrounds", "public/assets/images/states/IntroMenu/newgrounds_logo.png");
    
    this.load.text("introRandomText", "public/data/ui/randomText.txt");
    this.load.json("introData", "public/data/ui/intro.json");

    this.load.atlas("bold", "public/assets/images/UI/bold.png", "public/assets/images/UI/bold.json");
  }

  create() {
    if (window.Genesis && window.Genesis.discord) {
        console.log("Actualizando estado de Discord...");
        Genesis.discord.setActivity({
            details: "Menu in Friday Night Funkin'", 
            state: "Intro"
        });
    }

    const introData = this.cache.json.get("introData");
    const sequence = introData.introSequences.find(s => s.id === 'default');
    
    if (!sequence) {
      console.error("No se encontró la secuencia 'default' en intro.json");
      return;
    }

    const bpm = sequence.bpm;
    const steps = sequence.steps;
    const beatTime = (60 / bpm) * 1000;

    const textFile = this.cache.text.get("introRandomText");
    this.randomTextPairs = textFile
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line) => {
        const parts = line.split("--").map((part) => part.trim().toUpperCase());
        return parts.length >= 2 ? parts : [parts[0], ""];
      });

    this.music = this.sound.add("freakyMenu", { loop: true });
    this.music.play();

    this.texts = [];
    this.imageObj = null;
    this.currentYOffset = 0;
    this.sceneEnded = false;
    this.currentRandomPair = null;

    steps.forEach(step => {
      const delay = step.beat * beatTime; 
      
      this.time.delayedCall(delay, () => {
        if (this.sceneEnded) return;
        
        this.processJsonStep(step);
      }, this);
    });

    this.input.keyboard.on("keydown-ENTER", this.skipScene, this);
  }

  /**
   * Procesa un paso individual del JSON de la intro.
   * @param {object} step - El objeto de paso del JSON.
   */
  processJsonStep(step) {
    if (step.clear) {
      this.texts.forEach((t) => t.destroy());
      this.texts = [];
      if (this.imageObj) {
        this.imageObj.destroy();
        this.imageObj = null;
      }
      this.currentYOffset = 0;
    }

    if (step.text && step.text.length > 0) {
      step.text.forEach(line => {
        this.displayTextLine(line);
      });
    }

    if (step.img) {
      if (this.imageObj) this.imageObj.destroy();
      
      this.imageObj = this.add.image(
        this.game.config.width / 2,
        this.startY + this.currentYOffset + 80,
        step.img.id
      )
      .setOrigin(0.5, 0.5)
      .setScale(step.img.scale || 1);
      
      this.currentYOffset += 100;
    }

    // 4. Ejecutar acciones
    if (step.action) {
      switch (step.action) {
        case "random-text-1":
          this.currentRandomPair = this.getRandomTextPair();
          this.displayTextLine(this.currentRandomPair[0]);
          break;
        case "random-text-2":
          if (!this.currentRandomPair) {
            this.currentRandomPair = this.getRandomTextPair();
          }
          this.displayTextLine(this.currentRandomPair[1]);
          break;
        case "skipIntro":
          this.skipScene();
          break;
      }
    }
  }

  /**
   * Crea y muestra una línea de texto con la fuente Alphabet.
   * @param {string} textString - El texto a mostrar.
   */
  displayTextLine(textString) {
    if (!textString) return;

    const text = new Alphabet(this, 0, 0, textString.toUpperCase(), true, 1);
    
    text.x = (this.game.config.width / 2) - (text.width / 2);
    text.y = this.startY + this.currentYOffset;
    
    this.add.existing(text);
    this.texts.push(text);
    this.currentYOffset += this.lineSpacing;
  }

  /**
   * Salta la intro y transiciona a la siguiente escena.
   */
  skipScene() {
    if (this.sceneEnded) return;
    this.sceneEnded = true;

    // ¡Importante! Cancela todos los 'delayedCall' pendientes
    this.time.removeAllEvents(); 
    
    this.scene.get("FlashEffect").startTransition("introDance");
  }

  /**
   * Obtiene un par de textos aleatorios del array.
   */
  getRandomTextPair() {
    if (this.randomTextPairs.length === 0) return ["PART 1", "PART 2"];
    const randomIndex = Math.floor(Math.random() * this.randomTextPairs.length);
    return this.randomTextPairs[randomIndex];
  }

  shutdown() {
    if (this.music) {
      this.music.stop();
      this.music.destroy();
      this.music = null;
    }
    
    this.texts.forEach((t) => t.destroy());
    this.texts = [];
    
    if (this.imageObj) {
      this.imageObj.destroy();
      this.imageObj = null;
    }
    
    this.input.keyboard.off("keydown-ENTER", this.skipScene, this);    
    this.time.removeAllEvents();
  }
}

game.scene.add("IntroMenu", IntroMenu);