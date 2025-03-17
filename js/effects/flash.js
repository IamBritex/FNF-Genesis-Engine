class FlashEffect extends Phaser.Scene {
    constructor() {
        super({ key: "FlashEffect", active: true });
    }

    create() {
        // Crear un rectángulo blanco que cubra toda la pantalla
        this.whiteScreen = this.add.rectangle(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            this.cameras.main.width,
            this.cameras.main.height,
            0xffffff // Color blanco
        )
        .setOrigin(0.5)
        .setDepth(9999) // Asegurarse de que esté por encima de todo
        .setAlpha(0); // Iniciar invisible

        this.isTransitioning = false; // Controlar si ya hay una transición en curso
    }

    startTransition(nextScene) {
        if (this.isTransitioning) return; // Evitar múltiples transiciones simultáneas
        this.isTransitioning = true;

        // 1. Traer FlashEffect al frente
        this.scene.bringToTop();

        // 2. Fade In (cuadro blanco aparece)
        this.tweens.add({
            targets: this.whiteScreen,
            alpha: 1, // Hacerlo completamente visible
            duration: 200, // Duración del fade in en milisegundos
            ease: 'Linear',
            onComplete: () => {
                // 3. Detener la escena actual
                const currentScene = this.game.scene.getScenes(true).find(s => s.scene.key !== "FlashEffect");
                if (currentScene) {
                    currentScene.scene.stop();
                }

                // 4. Iniciar la nueva escena
                this.scene.launch(nextScene);

                // 5. Fade Out (cuadro blanco desaparece)
                this.tweens.add({
                    targets: this.whiteScreen,
                    alpha: 0, // Hacerlo completamente transparente
                    duration: 2300, // Duración del fade out en milisegundos
                    ease: 'Linear',
                    onComplete: () => {
                        this.isTransitioning = false; // Reiniciar el estado de la transición
                    }
                });
            }
        });
    }
}

game.scene.add("FlashEffect", FlashEffect);