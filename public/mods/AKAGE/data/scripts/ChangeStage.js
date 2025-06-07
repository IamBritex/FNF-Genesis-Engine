export default class ChangeStage {
    constructor(scene) {
        this.scene = scene;
    }

    async init() {
        // No initialization needed
    }

    async define(...inputs) {
        const [layer, content] = inputs;

        if (layer === undefined || content === undefined) {
            console.error('ChangeStage: Missing required inputs', { layer, content });
            return;
        }

        try {
            // Get stage manager
            if (!this.scene.stageManager) {
                console.error('Stage manager not found in scene');
                return;
            }

            // Get the layer to modify
            const targetLayer = this.scene.stageManager.layers[layer];
            if (!targetLayer) {
                console.error(`Layer ${layer} not found`);
                return;
            }

            // Check if content is a color or image path
            const isColor = content.startsWith('#') || content.startsWith('0x');

            if (isColor) {
                // Convert hex color to number if needed
                const colorNum = content.startsWith('#') 
                    ? parseInt(content.slice(1), 16)
                    : parseInt(content, 16);

                // Update background color
                if (targetLayer.rectangle) {
                    targetLayer.rectangle.setFillStyle(colorNum);
                } else {
                    // Create new color rectangle if it doesn't exist
                    const rect = this.scene.add.rectangle(
                        0, 0,
                        this.scene.game.config.width * 4,
                        this.scene.game.config.height * 4,
                        colorNum
                    );
                    rect.setOrigin(0.5);
                    rect.setScrollFactor(0);
                    targetLayer.rectangle = rect;
                    
                    // Add to game layer
                    if (this.scene.cameraController) {
                        this.scene.cameraController.addToGameLayer(rect);
                    }
                }

                console.log(`Changed layer ${layer} color to ${content}`);

            } else {
                // Load and set image
                const textureKey = `stage_layer_${layer}`;
                
                // Load image if not already loaded
                if (!this.scene.textures.exists(textureKey)) {
                    await new Promise((resolve, reject) => {
                        this.scene.load.image(textureKey, content);
                        this.scene.load.once('complete', resolve);
                        this.scene.load.once('loaderror', reject);
                        this.scene.load.start();
                    });
                }

                // Remove old content
                if (targetLayer.rectangle) {
                    targetLayer.rectangle.destroy();
                    targetLayer.rectangle = null;
                }
                if (targetLayer.image) {
                    targetLayer.image.destroy();
                    targetLayer.image = null;
                }

                // Create new image
                const image = this.scene.add.image(
                    this.scene.game.config.width / 2,
                    this.scene.game.config.height / 2,
                    textureKey
                );
                image.setOrigin(0.5);
                targetLayer.image = image;

                // Add to game layer
                if (this.scene.cameraController) {
                    this.scene.cameraController.addToGameLayer(image);
                }

                console.log(`Changed layer ${layer} image to ${content}`);
            }

        } catch (error) {
            console.error('Error in ChangeStage:', error);
        }
    }

    cleanup() {
        // Cleanup is handled by stage manager
    }
}