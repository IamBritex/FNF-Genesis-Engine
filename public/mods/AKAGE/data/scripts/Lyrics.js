export default class Lyrics {
    constructor(scene) {
        this.scene = scene;
        this.text = null;
        this.currentTween = null;
    }

    async init() {
        // Create text object
        this.text = this.scene.add.text(
            this.scene.game.config.width / 2, 
            500,
            '',
            {
                fontFamily: 'VCR',
                fontSize: '32px',
                color: '#FFFFFF',
                align: 'center',
                stroke: '#000000',
                strokeThickness: 4
            }
        );

        // Configure text
        this.text.setOrigin(0.5);
        this.text.setScrollFactor(0);
        this.text.setDepth(999);
        this.text.setVisible(false);

        // Add to UI layer
        if (this.scene.cameraController) {
            this.scene.cameraController.addToUILayer(this.text);
        }
    }

    async define(...inputs) {
        // Handle stop command
        if (inputs[0] === 'stop') {
            this.cleanup();
            return;
        }

        const [text = '', size = 32, color = '#FFFFFF'] = inputs;

        // Cleanup any existing text and animations
        if (this.currentTween) {
            this.currentTween.stop();
            this.currentTween = null;
        }

        if (this.text) {
            this.text.setVisible(false);
        }

        // If no text provided, just cleanup
        if (!text) return;

        // Update text properties
        this.text.setText(text);
        this.text.setFontSize(size);
        this.text.setColor(color);
        
        // Show text immediately
        this.text.setVisible(true);
        this.text.setAlpha(1);
    }

    cleanup() {
        if (this.currentTween) {
            this.currentTween.stop();
            this.currentTween = null;
        }
        
        if (this.text) {
            this.text.setVisible(false);
        }
    }
}