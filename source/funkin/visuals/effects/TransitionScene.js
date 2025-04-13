class TransitionScene extends Phaser.Scene {
    constructor() {
        super({ key: "TransitionScene", active: true });
    }

    create() {
        // Crear textura de gradiente
        const gradientTexture = this.createGradientTexture();
        
        // Sprite de transición (fuera de pantalla inicialmente)
        this.blackScreen = this.add.sprite(
            this.cameras.main.centerX,
            this.cameras.main.height * 1.5,
            gradientTexture
        )
        .setOrigin(0.5)
        .setDepth(9999)
        .setAlpha(0);

        this.isTransitioning = false;
        this.currentScene = null;
    }

    createGradientTexture() {
        const textureKey = 'transitionGradient';
        if (this.textures.exists(textureKey)) return textureKey;

        const width = this.scale.width;
        const height = this.scale.height * 2;
        
        const canvas = this.textures.createCanvas(textureKey, width, height);
        const ctx = canvas.context;
        
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(0.2, 'rgba(0, 0, 0, 1)');
        gradient.addColorStop(0.8, 'rgba(0, 0, 0, 1)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        canvas.refresh();

        return textureKey;
    }

    startTransition(nextScene) {
        if (this.isTransitioning) return;
        this.isTransitioning = true;

        // 1. Obtener escena actual
        this.currentScene = this.game.scene.getScenes(true).find(s => s.scene.key !== "TransitionScene");

        // 2. Traer TransitionScene al frente
        this.scene.bringToTop();
        this.blackScreen.setAlpha(1);

        // 3. Animación ENTRADA
        this.tweens.add({
            targets: this.blackScreen,
            y: this.cameras.main.centerY,
            duration: 500,
            ease: 'Power2.Out',
            onComplete: () => {
                // 4. Detener escena anterior
                if (this.currentScene) {
                    this.currentScene.scene.stop();
                }

                // 5. Iniciar nueva escena
                this.scene.launch(nextScene);

                // 6. Animación SALIDA después de 300ms
                this.time.delayedCall(300, () => {
                    this.tweens.add({
                        targets: this.blackScreen,
                        y: -this.cameras.main.height,
                        duration: 500,
                        ease: 'Power2.In',
                        onComplete: () => {
                            this.blackScreen.setAlpha(0);
                            this.isTransitioning = false;
                        }
                    });
                });
            }
        });
    }
}

game.scene.add("TransitionScene", TransitionScene);