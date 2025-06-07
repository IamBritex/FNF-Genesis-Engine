export default class FlashCameraBlack {
    constructor(scene) {
        this.scene = scene;
        this.flash = null;
        // Default values
        this.defaults = {
            duration: 1,
            depth: Number.MAX_SAFE_INTEGER,
            color: 0xFFFFFF
        };
    }

    async define(...inputs) {
        // Parse inputs with defaults
        const [
            duration = this.defaults.duration,
            depth = this.defaults.depth,
            color = this.defaults.color
        ] = inputs;

        this.cleanup();

        // Create flash with parsed color
        this.flash = this.scene.add.rectangle(
            0,
            0,
            this.scene.game.config.width * 2,
            this.scene.game.config.height * 2,
            color
        );

        // Configuration
        this.flash.setOrigin(0.5);
        this.flash.setAlpha(1);
        this.flash.setScrollFactor(0);
        this.flash.setDepth(depth);

        // Center on screen
        this.flash.x = this.scene.game.config.width / 2;
        this.flash.y = this.scene.game.config.height / 2;

        console.log('Flash created:', {
            position: { x: this.flash.x, y: this.flash.y },
            dimensions: { width: this.flash.width, height: this.flash.height },
            alpha: this.flash.alpha,
            visible: this.flash.visible,
            duration,
            depth,
            color: `0x${color.toString(16).toUpperCase()}`
        });

        // Animate
        return new Promise(resolve => {
            this.scene.tweens.add({
                targets: this.flash,
                alpha: 0,
                duration: duration * 1000,
                ease: 'Linear',
                onComplete: () => {
                    this.cleanup();
                    resolve();
                }
            });
        });
    }

    cleanup() {
        if (this.flash) {
            this.flash.destroy();
            this.flash = null;
        }
    }
}