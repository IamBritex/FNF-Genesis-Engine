export class StageManager {
    constructor(scene) {
        this.scene = scene;
        this.layers = [];
        this.currentStage = null;
        this.defaultStage = 'stage';
        this.characters = null;
        this.parallaxFactor = 0.1; // Factor base de parallax
        this.maxLayer = 6; // El número más alto de layer en tu stage.json
    }

    setCharacters(charactersInstance) {
        if (!charactersInstance || typeof charactersInstance.updateCharacterDepths !== 'function') {
            console.error('Invalid characters instance provided to StageManager');
            return false;
        }
        this.characters = charactersInstance;
        return true;
    }

    async loadStage(stageName) {
        this.clearCurrentStage();
        const stageToLoad = stageName || this.defaultStage;
        
        try {
            const stageData = await this._fetchStageData(stageToLoad);
            
            if (!this._isValidStageData(stageData)) {
                console.warn(`Stage "${stageToLoad}" data is invalid`);
                if (stageToLoad !== this.defaultStage) {
                    return this.loadStage(this.defaultStage);
                }
                throw new Error('Invalid default stage data');
            }
            
            this.currentStage = stageToLoad;
            await this._loadStageAssets(stageData);
            this._createStageLayers(stageData);
            
            // Procesar las capas de personajes solo si hay characters disponible
            if (this.characters) {
                const characterLayers = stageData.stage.filter(layer => 
                    layer.player && (layer.player === 1 || layer.player === 2 || layer.player === 'gf')
                );
                this._processCharacterLayers(characterLayers);
            }
            
            return true;
        } catch (error) {
            console.warn(`Error loading stage "${stageToLoad}":`, error);
            if (stageToLoad !== this.defaultStage) {
                return this.loadStage(this.defaultStage);
            }
            return false;
        }
    }

    _isValidStageData(stageData) {
        return stageData && 
               stageData.stage && 
               Array.isArray(stageData.stage) && 
               stageData.stage.length > 0;
    }

    async _fetchStageData(stageName) {
        try {
            const response = await fetch(`public/assets/data/stages/${stageName}.json`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.warn(`Error fetching stage "${stageName}":`, error);
            return null;
        }
    }
    
    async _loadStageAssets(stageData) {
        if (!this._isValidStageData(stageData)) {
            throw new Error('Invalid stage data');
        }

        const normalLayers = stageData.stage.filter(layer => 
            layer.visible !== false && !layer.player
        );

        const loadPromises = normalLayers.map(layer => 
            this._loadLayerTexture(layer)
        );

        await Promise.all(loadPromises);
    }

    async _loadLayerTexture(layer) {
        const textureKey = this._getTextureKey(layer);
        
        if (this.scene.textures.exists(textureKey)) {
            return;
        }

        return new Promise((resolve) => {
            this.scene.load.image(textureKey, layer.path);
            this.scene.load.once(`filecomplete-image-${textureKey}`, resolve);
            this.scene.load.once(`loaderror-image-${textureKey}`, () => {
                console.warn(`Texture not found: ${layer.path}`);
                resolve();
            });
            this.scene.load.start();
        });
    }

    _createStageLayers(stageData) {
        if (!this._isValidStageData(stageData)) return;

        const normalLayers = stageData.stage.filter(layer => 
            layer.visible !== false && !layer.player
        );
        const characterLayers = stageData.stage.filter(layer => 
            layer.player && (layer.player === 1 || layer.player === 2 || layer.player === 'gf')
        );

        const sortedLayers = [...normalLayers]
            .sort((a, b) => (a.priority || 0) - (b.priority || 0));

        sortedLayers.forEach(layer => {
            const textureKey = this._getTextureKey(layer);
            
            if (!this.scene.textures.exists(textureKey)) {
                console.warn(`Texture not loaded: ${textureKey}`);
                return;
            }

            this._createLayer(layer, textureKey);
        });

        this._processCharacterLayers(characterLayers);
    }

    _processCharacterLayers(characterLayers) {
        if (!this.characters) {
            console.warn('No characters instance available');
            return;
        }

        const depthsConfig = {
            player1: 0,  // Default values
            player2: 0,
            gf: 0
        };
    
        characterLayers.forEach(layerConfig => {
            const playerType = layerConfig.player;
            const depth = layerConfig.layer ?? 0;
            
            if (playerType === 1) {
                depthsConfig.player1 = depth;
            }
            else if (playerType === 2) {
                depthsConfig.player2 = depth;
            }
            else if (playerType === 'gf') {
                depthsConfig.gf = depth;
            }
        });
    
        try {
            this.characters.updateCharacterDepths(depthsConfig);
        } catch (error) {
            console.error('Error updating character depths:', error, depthsConfig);
        }
    }

    _createLayer(layer, textureKey) {
        const [x = 0, y = 0] = Array.isArray(layer.position) ? layer.position : [];
        const layerDepth = layer.layer ?? 0;
        
        // Calcula el factor de parallax basado en la profundidad de la capa
        const parallaxMultiplier = (layerDepth / this.maxLayer) * this.parallaxFactor;
        
        const bgImage = this.scene.add.image(x, y, textureKey)
            .setOrigin(0, 0)
            .setDepth(layerDepth)
            .setScale(layer.scale || 1.0)
            .setAlpha(layer.opacity ?? 1.0)
            .setFlipX(layer.flipx === true);

        // Configura el scroll factor basado en la profundidad
        // Las capas más altas se moverán más
        const scrollFactor = 1 + parallaxMultiplier;
        bgImage.setScrollFactor(scrollFactor);

        this.layers.push({
            image: bgImage,
            layerData: layer,
            parallaxFactor: scrollFactor
        });
    }

    _getTextureKey(layer) {
        return `stage_${this.currentStage}_layer_${layer.layer}`;
    }

    clearCurrentStage() {
        this.layers.forEach(layer => {
            if (layer.image?.destroy) {
                layer.image.destroy();
            }
            
            const textureKey = this._getTextureKey(layer.layerData);
            if (this.scene.textures.exists(textureKey)) {
                this.scene.textures.remove(textureKey);
            }
        });

        this.layers = [];
        this.currentStage = null;
    }

    cleanup() {
        try {
            // Clear all stage layers
            this.clearCurrentStage();
            
            // Clear any additional references
            this.characters = null;
            this.currentStage = null;
            
            // If there's a container, destroy it
            if (this.container) {
                this.container.destroy();
                this.container = null;
            }
            
            // Remove any remaining textures
            if (this.scene && this.scene.textures) {
                const prefix = `stage_${this.currentStage}_layer_`;
                this.scene.textures.getTextureKeys()
                    .filter(key => key.startsWith(prefix))
                    .forEach(key => this.scene.textures.remove(key));
            }

            console.log('StageManager cleanup complete');
        } catch (error) {
            console.error('Error during StageManager cleanup:', error);
        }
    }

    update(time, delta) {
        if (!this.scene.cameraController?.gameCamera) return;
    
        const camera = this.scene.cameraController.gameCamera;
    
        this.layers.forEach(layer => {
            if (layer.image && layer.parallaxFactor) {
                // Ajusta la posición base según el movimiento de la cámara
                const baseX = layer.layerData.position[0] || 0;
                const baseY = layer.layerData.position[1] || 0;
                
                // Aplica el efecto parallax
                layer.image.x = baseX - (camera.scrollX * (layer.parallaxFactor - 1));
                layer.image.y = baseY - (camera.scrollY * (layer.parallaxFactor - 1));
            }
        });
    }
}