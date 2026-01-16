export default class IntroTransition {
    constructor(scene, dependencies) {
        this.scene = scene;
        this.enterLogo = dependencies.enterLogo;
        this.funScript = dependencies.funScript;

        this.isTransitioning = false;
        this.transitionTimer = null;

        this.touchStartX = 0;
        this.touchStartY = 0;
        this.swipeThreshold = 30; 

        this.setupInput();
    }

    setupInput() {
        this.scene.input.keyboard.removeAllListeners("keydown-ENTER");
        this.scene.input.keyboard.on("keydown-ENTER", () => this.handleEnterPress());

        if (!this.scene.sys.game.device.os.desktop) {
            this.scene.input.on('pointerdown', (pointer) => {
                this.touchStartX = pointer.x;
                this.touchStartY = pointer.y;
            });

            this.scene.input.on('pointerup', (pointer) => {
                const distance = Phaser.Math.Distance.Between(
                    this.touchStartX,
                    this.touchStartY,
                    pointer.x,
                    pointer.y
                );

                if (distance < this.swipeThreshold) {
                    this.handleEnterPress();
                }
            });
        }
    }

    handleEnterPress() {
        if (this.isTransitioning) {
            this.skip();
        } else {
            this.start();
        }
    }

    start() {
        this.isTransitioning = true;

        if (navigator.vibrate) navigator.vibrate(70);

        if (this.funScript) {
            this.funScript.shutdown();
        }

        if (this.enterLogo && this.scene.anims.exists("enterPressed") && this.enterLogo.visible) {
            this.enterLogo.play("enterPressed");
        }

        this.scene.sound.play("confirm");

        this.transitionTimer = this.scene.time.delayedCall(800, () => {
            this.changeScene();
        });
    }

    skip() {
        if (this.funScript) {
            this.funScript.shutdown();
        }

        if (this.transitionTimer) {
            this.transitionTimer.remove();
            this.transitionTimer = null;
        }

        this.scene.scene.start("MainMenuScene");
    }

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
        this.scene.input.off('pointerdown');
        this.scene.input.off('pointerup');
        
        if (this.transitionTimer) {
            this.transitionTimer.remove();
            this.transitionTimer = null;
        }
        
        this.enterLogo = null;
        this.funScript = null;
        this.scene = null;
    }
}