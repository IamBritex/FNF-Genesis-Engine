import IntroDanceBoop from "./introDanceBoop.js";
import FunScript from "./FunScript.js";
import IntroTransition from "./introTransition.js";
import IntroAnimations from "./introAnimations.js";

class introDance extends Phaser.Scene {
  constructor() {
    super({ key: "introDance" });
    this.animations = null;
    this.boopController = null;
    this.funScript = null;
    this.transitionHandler = null;
    
    // Estado del gamepad
    this.lastGamepadState = false;
  }

  create() {
    if (!this.scene.isActive("TransitionScene")) {
      this.scene.launch("TransitionScene");
    }

    this.animations = new IntroAnimations(this);
    this.animations.create();

    // ============================================================
    // LÓGICA DE POSICIONAMIENTO
    // ============================================================
    const { width } = this.scale;
    const gf = this.animations.gf;
    const logo = this.animations.logo;
    const pressEnter = this.animations.enterLogo;
    
    // Detectar si es PC (Escritorio) o Móvil
    const isDesktop = this.sys.game.device.os.desktop;

    // 1. GF: Siempre alineada a la derecha
    if (gf) {
        if (isDesktop) {
          gf.x = width - gf.width;
        } else {
          const offset = 40;
          gf.x = width - gf.width - offset;
        }
    }

    // 2. Logo Bumpin: Diferente comportamiento según plataforma
    if (logo) {
        if (isDesktop) {
            // EN PC: Origen 0,0 y Posición 0,0
            logo.setOrigin(0, 0);
            logo.setPosition(-150, -130);
        } else {
            // EN MÓVIL: A la izquierda de GF (Lógica anterior)
            if (gf) {
                const offset = 40;
                logo.x = gf.x - logo.width - offset;
            }
        }
    }

    // 3. Press Enter (Tap): Centrado en pantalla
    if (pressEnter) {
        pressEnter.setOrigin(0, 0);
        const halfWidth = pressEnter.width / 2;
        pressEnter.x = (width / 2) - halfWidth;
    }
    // ============================================================

    this.boopController = new IntroDanceBoop(this, 102);

    this.funScript = new FunScript(
      this,
      { gf: this.animations.gf, logo: this.animations.logo },
      this.boopController
    );
    this.funScript.start();

    this.transitionHandler = new IntroTransition(this, {
        enterLogo: this.animations.enterLogo,
        funScript: this.funScript
    });

    this.boopController.start((isLeft) => {
        if (this.funScript) this.funScript.beatHit();
        if (this.animations) this.animations.beatHit(isLeft);
    });
  }

  update(time, delta) {
    // --- Lógica Gamepad ---
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gamepadPressed = false;
    
    for (const gamepad of gamepads) {
      if (!gamepad) continue;
      
      // Botón 0 (A) o Botón 9 (Start) para saltar intro
      if (gamepad.buttons[0]?.pressed || gamepad.buttons[9]?.pressed) {
          gamepadPressed = true;
          break;
      }
    }

    const gamepadJustPressed = gamepadPressed && !this.lastGamepadState;
    this.lastGamepadState = gamepadPressed;

    if (gamepadJustPressed && this.transitionHandler) {
      this.transitionHandler.handleEnterPress();
    }
    
    // Actualizamos FunScript para que detecte el código secreto
    if (this.funScript && this.funScript.update) {
      this.funScript.update(time, delta);
    }
    // ----------------------
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