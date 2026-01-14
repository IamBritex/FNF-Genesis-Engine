/**
 * Clase IntroTransition
 * Maneja la lógica de transición de la Intro a la siguiente escena.
 * Incluye: Detección de Input, Animación de confirmación y Skip (salto rápido).
 */
export default class IntroTransition {
    /**
     * @param {Phaser.Scene} scene - La escena principal (introDance).
     * @param {Object} dependencies - Referencias a objetos necesarios { enterLogo, funScript }.
     */
    constructor(scene, dependencies) {
        this.scene = scene;
        this.enterLogo = dependencies.enterLogo;
        this.funScript = dependencies.funScript;

        this.isTransitioning = false;
        this.transitionTimer = null;

        this.setupInput();
    }

    setupInput() {
        // Limpiamos listeners previos para evitar duplicados
        this.scene.input.keyboard.removeAllListeners("keydown-ENTER");
        this.scene.input.keyboard.on("keydown-ENTER", () => this.handleEnterPress());
    }

    handleEnterPress() {
        // Si ya está en transición y se presiona ENTER de nuevo, saltamos todo.
        if (this.isTransitioning) {
            this.skip();
        } else {
            this.start();
        }
    }

    start() {
        this.isTransitioning = true;

        // Detener scripts visuales/secretos
        if (this.funScript) {
            this.funScript.shutdown();
        }

        // Feedback visual y auditivo
        if (this.enterLogo && this.scene.anims.exists("enterPressed")) {
            this.enterLogo.play("enterPressed");
        }
        this.scene.sound.play("confirm");

        // Iniciar temporizador para la transición normal
        this.transitionTimer = this.scene.time.delayedCall(800, () => {
            this.changeScene();
        });
    }

    /**
     * Salta la espera y va directo al menú (Fast Skip).
     */
    skip() {
        // Cancelar el temporizador pendiente
        if (this.transitionTimer) {
            this.transitionTimer.remove();
            this.transitionTimer = null;
        }

        // Ir inmediatamente
        this.scene.scene.start("MainMenuScene");
    }

    /**
     * Ejecuta el cambio de escena (usando TransitionScene si está disponible).
     */
    changeScene() {
        const transitionScene = this.scene.scene.get("TransitionScene");
        if (transitionScene) {
            transitionScene.startTransition("MainMenuScene");
        } else {
            this.scene.scene.start("MainMenuScene");
        }
    }

    shutdown() {
        this.scene.input.keyboard.removeAllListeners("keydown-ENTER");
        
        if (this.transitionTimer) {
            this.transitionTimer.remove();
            this.transitionTimer = null;
        }
        
        this.enterLogo = null;
        this.funScript = null;
        this.scene = null;
    }
}