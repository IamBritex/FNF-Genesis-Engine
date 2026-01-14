import IntroDanceBoop from "./introDanceBoop.js";
import FunScript from "./FunScript.js";
import IntroTransition from "./introTransition.js";
import IntroAnimations from "./introAnimations.js";

/**
 * Escena introDance
 * Orquestador principal de la introducción.
 * Conecta los módulos de Animación, Ritmo, Scripting y Transición.
 */
class introDance extends Phaser.Scene {
  constructor() {
    super({ key: "introDance" });
    this.animations = null;
    this.boopController = null;
    this.funScript = null;
    this.transitionHandler = null;
  }

  create() {
    // Iniciar transición de fade-in
    if (!this.scene.isActive("TransitionScene")) {
      this.scene.launch("TransitionScene");
    }

    // --- 1. Inicializar Animaciones y Sprites ---
    this.animations = new IntroAnimations(this);
    this.animations.create();

    // --- 2. Inicializar Controlador de Ritmo (102 BPM) ---
    this.boopController = new IntroDanceBoop(this, 102);

    // --- 3. Inicializar Script Secreto (FunScript) ---
    // Pasamos los sprites creados por IntroAnimations
    this.funScript = new FunScript(
      this,
      { gf: this.animations.gf, logo: this.animations.logo },
      this.boopController
    );
    this.funScript.start();

    // --- 4. Inicializar Lógica de Transición ---
    this.transitionHandler = new IntroTransition(this, {
        enterLogo: this.animations.enterLogo,
        funScript: this.funScript
    });

    // --- 5. Iniciar el ciclo de Beats ---
    this.boopController.start((isLeft) => {
        // Notificar al script secreto
        if (this.funScript) this.funScript.beatHit();
        
        // Notificar al gestor de animaciones
        if (this.animations) this.animations.beatHit(isLeft);
    });
  }

  shutdown() {
    if (this.boopController) {
      this.boopController.stop();
      this.boopController = null;
    }

    if (this.funScript) {
      this.funScript.shutdown();
      this.funScript = null;
    }

    if (this.transitionHandler) {
      this.transitionHandler.shutdown();
      this.transitionHandler = null;
    }

    this.animations = null;
  }
}

game.scene.add("introDance", introDance);