export default class Cicada {
    constructor(scene) {
        this.scene = scene;
        this.sprite = null;
        this.visible = false;
        this.textureName = 'cicadaSprite_' + Date.now(); // Make texture key unique
        this.textureKey = '/public/mods/AKAGE/images/cicada.png';
        this.isLoading = false;
    }

    async init() {
        try {
            await this.loadTexture();
            await this.createSprite();
        } catch (error) {
            console.error('Error initializing cicada:', error);
        }
    }

    async loadTexture() {
        if (this.isLoading) return;
        this.isLoading = true;

        return new Promise((resolve, reject) => {
            // Create a new loader instance
            const loader = new Phaser.Loader.LoaderPlugin(this.scene);
            
            loader.image(this.textureName, this.textureKey);

            loader.once('complete', () => {
                // Verify texture loaded correctly
                const texture = this.scene.textures.get(this.textureName);
                if (texture && texture.key) {
                    console.log('Cicada texture loaded successfully:', this.textureName);
                    this.isLoading = false;
                    resolve();
                } else {
                    this.isLoading = false;
                    reject(new Error('Texture verification failed'));
                }
                loader.destroy();
            });

            loader.once('loaderror', () => {
                this.isLoading = false;
                loader.destroy();
                reject(new Error('Failed to load cicada image'));
            });

            loader.start();
        });
    }

    async createSprite() {
        if (!this.scene.textures.exists(this.textureName)) {
            console.error('Texture not found:', this.textureName);
            return;
        }

        try {
            // Create sprite directly after verifying texture exists
            this.sprite = this.scene.add.sprite(
                this.scene.game.config.width / 2,
                this.scene.game.config.height / 2,
                this.textureName
            );

            // Configure sprite
            this.sprite.setScale(1.3);
            this.sprite.setVisible(false);
            this.sprite.setDepth(999);
            this.sprite.setOrigin(0.5);

            // Add to game layer if camera controller exists
            if (this.scene.cameraController) {
                this.scene.cameraController.addToGameLayer(this.sprite);
            }

            console.log('Cicada sprite created successfully');
        } catch (error) {
            console.error('Error creating cicada sprite:', error);
        }
    }

    async define() {
        if (!this.sprite?.active) {
            console.warn('Cicada sprite not ready');
            return;
        }
        
        this.visible = !this.visible;
        this.sprite.setVisible(this.visible);

        // Si el sprite se hizo visible, programar su desaparición
        if (this.visible) {
            this.scene.time.delayedCall(10, () => {
                if (this.sprite?.active) {
                    this.visible = false;
                    this.sprite.setVisible(false);
                    this.cleanup();
                }
            });
        }
    }

    cleanup() {
        if (this.sprite?.active) {
            this.sprite.destroy();
            this.sprite = null;
        }
        if (this.scene.textures.exists(this.textureName)) {
            this.scene.textures.remove(this.textureName);
        }
        this.isLoading = false;
    }
}