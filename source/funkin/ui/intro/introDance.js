import IntroDanceBoop from "./introDanceBoop.js";
import FunScript from "./FunScript.js";

/**
 * Escena introDance
 * Coordina la intro visual y delega la lógica secreta a FunScript.
 */
class introDance extends Phaser.Scene {
  constructor() {
    super({ key: "introDance" });
    this.isTransitioning = false;
    this.boopController = null;
    this.funScript = null;
  }

  // preload() eliminado intencionalmente.
  // Los assets se cargan en introText.js para evitar lag al iniciar esta escena.

  create() {
    this.isTransitioning = false;
    
    // Iniciar transición de fade-in si es necesario
    if (!this.scene.isActive("TransitionScene")) {
      this.scene.launch("TransitionScene");
    }

    // --- 1. Configuración de Sprites y Animaciones ---
    const leftIndices = [30, ...Array.from({length: 15}, (_, i) => i)]; 
    const rightIndices = Array.from({length: 15}, (_, i) => i + 15);

    this.createAnimByIndices("gfDanceLeft", "gfDance", "gfDance", leftIndices, 24, false);
    this.createAnimByIndices("gfDanceRight", "gfDance", "gfDance", rightIndices, 24, false);
    this.createAnim("logoBumpin", "logo bumpin", "logoBumpin", 24, false);
    this.createAnim("enterIdle", "Press Enter to Begin", "titleEnter", 24, true);
    this.createAnim("enterPressed", "ENTER PRESSED", "titleEnter", 24, false);

    this.gf = this.add.sprite(560, 50, "gfDance").setOrigin(0, 0);
    this.logo = this.add.sprite(-165, -140, "logoBumpin").setOrigin(0, 0).setScale(1.07);
    this.enterLogo = this.add.sprite(600, 620, "titleEnter").setOrigin(0.5, 0.5);
    
    if (this.anims.exists("enterIdle")) this.enterLogo.play("enterIdle");

    // --- 2. Inicializar Controlador de Ritmo (102 BPM) ---
    this.boopController = new IntroDanceBoop(this, 102);
    
    // --- 3. Inicializar Script Secreto (FunScript) ---
    this.funScript = new FunScript(
        this, 
        { gf: this.gf, logo: this.logo }, 
        this.boopController
    );
    this.funScript.start();

    // --- 4. Iniciar el ciclo de Beats ---
    this.boopController.start((isLeft) => {
        this.updateVisualsOnBeat(isLeft);
    });

    this.setupControls();
  }

  updateVisualsOnBeat(danceLeft) {
    // 1. Notificar a FunScript para que actualice shaders si es necesario
    if (this.funScript) {
        this.funScript.beatHit();
    }

    // 2. Actualizar Animaciones
    if (this.gf && this.anims.exists("gfDanceLeft") && this.anims.exists("gfDanceRight")) {
        this.gf.play(danceLeft ? "gfDanceRight" : "gfDanceLeft", true);
    }
    if (this.logo && this.anims.exists("logoBumpin")) {
        this.logo.play("logoBumpin", true);
    }
  }

  setupControls() {
    this.input.keyboard.removeAllListeners("keydown-ENTER");
    this.input.keyboard.on("keydown-ENTER", () => this.handleTransition());
  }

  handleTransition() {
    if (this.isTransitioning || !this.enterLogo) return;
    this.isTransitioning = true;

    if (this.funScript) {
        this.funScript.shutdown();
    }

    if (this.anims.exists("enterPressed")) this.enterLogo.play("enterPressed");
    this.sound.play("confirm");

    this.time.delayedCall(800, () => {
      const transition = this.scene.get("TransitionScene");
      transition ? transition.startTransition("MainMenuScene") : this.scene.start("MainMenuScene");
    });
  }

  shutdown() {
    this.isTransitioning = false;
    this.input.keyboard.removeAllListeners("keydown-ENTER");
    
    if (this.boopController) {
        this.boopController.stop();
        this.boopController = null;
    }

    if (this.funScript) {
        this.funScript.shutdown();
        this.funScript = null;
    }
  }

  createAnim(key, prefix, textureKey, fps, loop) {
    if (this.anims.exists(key)) return;
    const texture = this.textures.get(textureKey);
    const frames = texture.getFrameNames()
      .filter(name => name.startsWith(prefix))
      .map(name => ({ key: textureKey, frame: name }))
      .sort((a, b) => (a.frame > b.frame ? 1 : -1));
    if (frames.length > 0) this.anims.create({ key, frames, frameRate: fps, repeat: loop ? -1 : 0 });
  }

  createAnimByIndices(key, prefix, textureKey, indices, fps, loop) {
    if (this.anims.exists(key)) return;
    const texture = this.textures.get(textureKey);
    const allFrames = texture.getFrameNames().filter(name => name.startsWith(prefix)).sort();
    const animFrames = indices.map(i => (i < allFrames.length ? { key: textureKey, frame: allFrames[i] } : null)).filter(f => f);
    if (animFrames.length > 0) this.anims.create({ key, frames: animFrames, frameRate: fps, repeat: loop ? -1 : 0 });
  }
}

if (typeof game !== 'undefined') {
    game.scene.add("introDance", introDance);
}