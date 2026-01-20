import Alphabet from "../../../utils/Alphabet.js";

export class IntroMenu extends Phaser.Scene {
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

    this.introEvents = [];
    this.currentEventIndex = 0;
    
    // Estado del gamepad para evitar múltiples pulsaciones
    this.lastGamepadState = false;
  }

  preload() {
    this.load.audio("freakyMenu", "public/music/FreakyMenu.mp3");
    this.load.image("newgrounds", "public/images/menu/intro/newgrounds_logo.png");
    this.load.text("introRandomText", "public/data/ui/randomText.txt");
    this.load.json("introData", "public/data/ui/intro.json");

    this.load.atlasXML("gfDance", "public/images/menu/intro/gfDanceTitle.png", "public/images/menu/intro/gfDanceTitle.xml");
    this.load.atlasXML("logoBumpin", "public/images/menu/intro/logoBumpin.png", "public/images/menu/intro/logoBumpin.xml");

    if (!this.sys.game.device.os.desktop) {
      this.load.atlasXML("titleEnter", "public/images/menu/intro/titleEnter_mobile.png", "public/images/menu/intro/titleEnter_mobile.xml");
    } else {
      this.load.atlasXML("titleEnter", "public/images/menu/intro/titleEnter.png", "public/images/menu/intro/titleEnter.xml");
    }

    this.load.audio("confirm", "public/sounds/confirmMenu.ogg");
    this.load.audio("girlfriendsRingtone", "public/music/girlfriendsRingtone.ogg");

    this.load.text("rainbowShader", "public/shaders/RainbowShader.frag");

    Alphabet.load(this);
  }

  create() {
    if (window.Genesis && window.Genesis.discord) {
      console.log("Actualizando estado de Discord...");
      Genesis.discord.setActivity({
        details: "Menu in Friday Night Funkin'",
        state: "Intro"
      });
    }

    Alphabet.createAtlas(this);

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

    this.texts = [];
    this.imageObj = null;
    this.currentYOffset = 0;
    this.sceneEnded = false;
    this.currentRandomPair = null;

    this.introEvents = steps.map(step => ({
      ...step,
      targetTime: step.beat * beatTime
    }));

    this.introEvents.sort((a, b) => a.targetTime - b.targetTime);
    this.currentEventIndex = 0;

    this.music = this.sound.add("freakyMenu", { loop: true });
    this.music.play();

    this.input.keyboard.on("keydown-ENTER", this.skipScene, this);

    if (!this.sys.game.device.os.desktop) {
      this.input.on('pointerdown', () => {
        this.skipScene();
      });
    }
  }

  update(time, delta) {
    // --- Lógica Gamepad ---
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gamepadPressed = false;
    for (const gamepad of gamepads) {
      if (!gamepad) continue;
      // Botones: 0(A), 1(B), 2(X), 9(Start)
      if (gamepad.buttons[0]?.pressed || 
          gamepad.buttons[1]?.pressed || 
          gamepad.buttons[2]?.pressed || 
          gamepad.buttons[9]?.pressed) {
          gamepadPressed = true;
          break;
      }
    }
    const gamepadJustPressed = gamepadPressed && !this.lastGamepadState;
    this.lastGamepadState = gamepadPressed;

    if (gamepadJustPressed) {
      this.skipScene();
    }
    // ----------------------

    if (this.sceneEnded || !this.music || !this.music.isPlaying) return;

    const currentSongTime = this.music.seek * 1000;

    while (this.currentEventIndex < this.introEvents.length) {
      const nextEvent = this.introEvents[this.currentEventIndex];

      if (currentSongTime >= nextEvent.targetTime) {
        this.processJsonStep(nextEvent);
        this.currentEventIndex++;
      } else {
        break;
      }
    }
  }

  processJsonStep(step) {
    if (step.clear) {
      if (navigator.vibrate) navigator.vibrate(70);
      this.texts.forEach((t) => t.destroy());
      this.texts = [];
      if (this.imageObj) {
        this.imageObj.destroy();
        this.imageObj = null;
      }
      this.currentYOffset = 0;
    }

    if (step.text && step.text.length > 0) {
      if (navigator.vibrate) navigator.vibrate(70);
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

    const bounds = text.getBounds();
    text.x = (this.game.config.width / 2) - (bounds.width / 2);
    text.y = this.startY + this.currentYOffset;

    this.add.existing(text);
    this.texts.push(text);
    this.currentYOffset += this.lineSpacing;
  }

  skipScene() {
    if (this.sceneEnded) return;
    this.sceneEnded = true;

    if (navigator.vibrate) navigator.vibrate(70);

    if (this.scene.get("FlashEffect")) {
      this.scene.get("FlashEffect").startTransition("introDance");
      
      this.time.delayedCall(200, () => {
        this.scene.stop("IntroMenu");
      });
    } else {
      this.scene.start("introDance");
    }
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
    this.input.off('pointerdown');
    this.introEvents = [];
  }
}

game.scene.add("IntroMenu", IntroMenu);