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

    // Variables para la sincronización (Conductor)
    this.introEvents = [];
    this.currentEventIndex = 0;
  }

  preload() {
    // --- CARGA DE ASSETS PROPIOS (IntroMenu) ---
    this.load.audio("freakyMenu", "public/assets/audio/sounds/FreakyMenu.mp3");
    this.load.image("newgrounds", "public/assets/images/states/IntroMenu/newgrounds_logo.png");
    this.load.text("introRandomText", "public/data/ui/randomText.txt");
    this.load.json("introData", "public/data/ui/intro.json");
    this.load.atlas("bold", "public/assets/images/UI/bold.png", "public/assets/images/UI/bold.json");

    // --- FORWARD LOADING: Cargar assets de la SIGUIENTE escena (introDance) ---
    // Esto asegura que la transición sea instantánea
    this.load.atlasXML("gfDance", "public/images/menu/intro/gfDanceTitle.png", "public/images/menu/intro/gfDanceTitle.xml");
    this.load.atlasXML("logoBumpin", "public/images/menu/intro/logoBumpin.png", "public/images/menu/intro/logoBumpin.xml");
    this.load.atlasXML("titleEnter", "public/images/menu/intro/titleEnter.png", "public/images/menu/intro/titleEnter.xml");
    
    this.load.audio("confirm", "public/sounds/confirmMenu.ogg");
    this.load.audio("girlfriendsRingtone", "public/music/girlfriendsRingtone.ogg");
    
    // Shader para el Easter Egg
    this.load.text("rainbowShader", "public/shaders/RainbowShader.frag");
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

    // 1. Preparar datos de sincronización
    const bpm = sequence.bpm;
    const steps = sequence.steps;
    const beatTime = (60 / bpm) * 1000; // Duración de un beat en ms

    // 2. Preparar textos aleatorios
    const textFile = this.cache.text.get("introRandomText");
    this.randomTextPairs = textFile
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line) => {
        const parts = line.split("--").map((part) => part.trim().toUpperCase());
        return parts.length >= 2 ? parts : [parts[0], ""];
      });

    // 3. Inicializar variables de escena
    this.texts = [];
    this.imageObj = null;
    this.currentYOffset = 0;
    this.sceneEnded = false;
    this.currentRandomPair = null;

    // 4. CONVERTIR PASOS A EVENTOS DE TIEMPO (CONDUCTOR)
    // En lugar de programarlos, creamos una lista con el tiempo exacto en que deben ocurrir.
    this.introEvents = steps.map(step => ({
        ...step,
        targetTime: step.beat * beatTime // Tiempo exacto en milisegundos
    }));

    // Asegurarnos que estén ordenados cronológicamente
    this.introEvents.sort((a, b) => a.targetTime - b.targetTime);
    this.currentEventIndex = 0;

    // 5. Iniciar música
    this.music = this.sound.add("freakyMenu", { loop: true });
    this.music.play();

    this.input.keyboard.on("keydown-ENTER", this.skipScene, this);
  }

  /**
   * EL CORAZÓN DE LA SINCRONIZACIÓN:
   * Se ejecuta en cada frame del juego.
   */
  update(time, delta) {
    // Si la escena terminó o la música no suena, no hacemos nada
    if (this.sceneEnded || !this.music || !this.music.isPlaying) return;

    // Obtenemos la posición actual de la canción en milisegundos
    // this.music.seek devuelve segundos, multiplicamos por 1000.
    const currentSongTime = this.music.seek * 1000;

    // Revisamos si ya alcanzamos el tiempo del siguiente evento
    // Usamos un while por si el framerate bajó y debemos procesar varios eventos de golpe
    while (this.currentEventIndex < this.introEvents.length) {
        const nextEvent = this.introEvents[this.currentEventIndex];

        // Si el tiempo de la canción es mayor o igual al tiempo objetivo del evento...
        if (currentSongTime >= nextEvent.targetTime) {
            // ...ejecutamos el evento
            this.processJsonStep(nextEvent);
            // ...y avanzamos al siguiente índice
            this.currentEventIndex++;
        } else {
            // Si no hemos llegado al tiempo, salimos del bucle
            break;
        }
    }
  }

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

  displayTextLine(textString) {
    if (!textString) return;

    const text = new Alphabet(this, 0, 0, textString.toUpperCase(), true, 1);
    
    text.x = (this.game.config.width / 2) - (text.width / 2);
    text.y = this.startY + this.currentYOffset;
    
    this.add.existing(text);
    this.texts.push(text);
    this.currentYOffset += this.lineSpacing;
  }

  skipScene() {
    if (this.sceneEnded) return;
    this.sceneEnded = true;

    // Al usar el update loop, no necesitamos cancelar timers, 
    // solo poner la bandera sceneEnded a true detiene el proceso.
    
    this.scene.get("FlashEffect").startTransition("introDance");
  }

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
    this.introEvents = []; // Limpiar eventos
  }
}

game.scene.add("IntroMenu", IntroMenu);