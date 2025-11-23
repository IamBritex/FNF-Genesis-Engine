class introDance extends Phaser.Scene {
  constructor() {
    super({ key: "introDance" });
    this.isTransitioning = false;
  }

  preload() {
    this.load.atlasXML(
      "gfDance",
      "public/images/menu/intro/gfDanceTitle.png",
      "public/images/menu/intro/gfDanceTitle.xml"
    );
    this.load.atlasXML(
      "logoBumpin",
      "public/images/menu/intro/logoBumpin.png",
      "public/images/menu/intro/logoBumpin.xml"
    );
    this.load.atlasXML(
      "titleEnter",
      "public/images/menu/intro/titleEnter.png",
      "public/images/menu/intro/titleEnter.xml"
    );
    this.load.audio("confirm", "public/sounds/confirmMenu.ogg");
  }

  async create() {
    this.isTransitioning = false;
    AssetsDriver.setScene(this);

    const gfData = {
      x: 560,
      y: 50,
      origin: { x: 0, y: 0 },
      scale: 1,
      initialAnimation: "gf_dance",
      animations: [
        {
          name: "gfDance",
          anim: "gf_dance",
          fps: 23,
          loop: true,
        },
      ],
    };

    const logoData = {
      x: -165,
      y: -140,
      origin: { x: 0, y: 0 },
      scale: 1.07,
      initialAnimation: "logo_bumpin",
      animations: [
        {
          name: "logo bumpin",
          anim: "logo_bumpin",
          fps: 12,
          loop: true,
        },
      ],
    };

    const enterData = {
      x: 600,
      y: 620,
      origin: { x: 0.5, y: 0.5 },
      scale: 1,
      initialAnimation: "enter_idle",
      animations: [
        {
          name: "Press Enter to Begin",
          anim: "enter_idle",
          fps: 12,
          loop: true,
        },
        {
          name: "ENTER PRESSED",
          anim: "enter_pressed",
          fps: 14,
          loop: false,
        },
      ],
    };

    if (!this.scene.isActive("TransitionScene")) {
      this.scene.launch("TransitionScene");
    }

    // Animar los sprites usando el AssetsDriver estático
    try {
      await Promise.all([
        AssetsDriver.createSpriteFromData("gf", gfData, "gfDance"),
        AssetsDriver.createSpriteFromData("logo", logoData, "logoBumpin"),
        AssetsDriver.createSpriteFromData(
          "titleEnter",
          enterData,
          "titleEnter"
        ),
      ]);

      // Obtener referencias a los sprites creados
      this.gf = AssetsDriver.getSprite("gf");
      this.logo = AssetsDriver.getSprite("logo");
      this.enterLogo = AssetsDriver.getSprite("titleEnter");
      this.setupControls();
    } catch (error) {
      console.error("Error al crear los sprites de introducción:", error);
    }
  }

  setupControls() {
    this.input.keyboard.removeAllListeners("keydown-ENTER");
    this.input.keyboard.on("keydown-ENTER", () => this.handleTransition());
  }

  handleTransition() {
    if (this.isTransitioning || !this.enterLogo) return;

    this.isTransitioning = true;

    // Usamos el driver estático
    AssetsDriver.playAnimation("titleEnter", "enter_pressed");
    this.sound.play("confirm");
    this.time.delayedCall(800, () => {
      this.scene.get("TransitionScene").startTransition("MainMenuState");
    });
  }

  shutdown() {
    this.isTransitioning = false;
    this.input.keyboard.removeAllListeners("keydown-ENTER");
  }
}

game.scene.add("introDance", introDance);
