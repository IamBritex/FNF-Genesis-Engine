/**
 * Manages the loading, creation, and rendering of stage layers for the game.
 * Handles parallax effects, layer ordering, and character depth management.
 */
export class StageManager {
    /**
     * @param {Phaser.Scene} scene - The Phaser scene instance
     */
    constructor(scene) {
        this.scene = scene;
        this.layers = [];
        this.currentStage = null;
        this.defaultStage = 'stage';
        this.characters = null;
        this.parallaxFactor = 0.1;
        this.maxLayer = 6;
        this.stageAssetsPath = 'public/assets/images/stages';
        this.scripts = new Map();
        this.stageScripts = [];
    }

    /**
     * Sets the characters instance for depth management
     * @param {Object} charactersInstance - Characters controller instance
     * @returns {boolean} True if successful
     */
    setCharacters(charactersInstance) {
        if (!charactersInstance || typeof charactersInstance.updateCharacterDepths !== 'function') {
            console.error('Invalid characters instance provided to StageManager');
            return false;
        }
        this.characters = charactersInstance;
        return true;
    }

    /**
     * Loads a stage by name
     * @param {string} [stageName] - Name of stage to load
     * @returns {Promise<boolean>} True if loaded successfully
     */
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
            
            // Cargar scripts específicos del stage
            if (stageData.scripts && Array.isArray(stageData.scripts)) {
                await this._loadStageScripts(stageData.scripts);
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

    /**
     * Loads and initializes stage-specific scripts
     * @param {Array<string>} scriptNames - Array of script file names to load
     * @returns {Promise<void>}
     */
    async _loadStageScripts(scriptNames) {
        for (const scriptName of scriptNames) {
            try {
                const ScriptClass = (await import(`/public/assets/data/scripts/${scriptName}.js`)).default;
                const scriptInstance = new ScriptClass(this.scene);
                
                if (typeof scriptInstance.init === 'function') {
                    await scriptInstance.init();
                }
                
                this.stageScripts.push(scriptInstance);
            } catch (error) {
                console.warn(`Error loading stage script ${scriptName}:`, error);
            }
        }
    }

    /**
     * Validates stage data structure
     * @param {Object} stageData - Stage data to validate
     * @returns {boolean} True if valid
     */
    _isValidStageData(stageData) {
        return stageData && 
               stageData.stage && 
               Array.isArray(stageData.stage) && 
               stageData.stage.length > 0;
    }

    /**
     * Fetches stage data from JSON file
     * @param {string} stageName - Name of stage to load
     * @returns {Promise<Object|null>} Stage data object
     */
    async _fetchStageData(stageName) {
        try {
            if (this.scene.songData?.isMod) {
                const modPath = this.scene.songData.modPath;
                const modResponse = await fetch(`${modPath}/data/stages/${stageName}.json`);
                if (modResponse.ok) {
                    return await modResponse.json();
                }
            }

            const response = await fetch(`public/assets/data/stages/${stageName}.json`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.warn(`Error fetching stage "${stageName}":`, error);
            return null;
        }
    }
    
    /**
     * Loads all textures for stage layers
     * @param {Object} stageData - Stage data object
     * @throws {Error} If stage data is invalid
     */
    async _loadStageAssets(stageData) {
        if (!this._isValidStageData(stageData)) {
            throw new Error('Invalid stage data');
        }

        const normalLayers = stageData.stage.filter(layer => 
            layer.visible !== false && 
            !layer.player && 
            layer.namePath
        );

        if (normalLayers.length > 0) {
            const loadPromises = normalLayers.map(layer => this._loadLayerTexture(layer));
            await Promise.all(loadPromises);
        }
    }

    /**
     * Loads a single layer texture
     * @param {Object} layer - Layer data object
     * @returns {Promise<void>}
     */
    async _loadLayerTexture(layer) {
        const textureKey = this._getTextureKey(layer);
        
        if (this.scene.textures.exists(textureKey)) {
            return;
        }

        const imagePath = this._getFullImagePath(layer.namePath);

        return new Promise((resolve) => {
            this.scene.load.image(textureKey, imagePath);
            this.scene.load.once(`filecomplete-image-${textureKey}`, resolve);
            this.scene.load.once(`loaderror-image-${textureKey}`, () => {
                console.warn(`Texture not found: ${imagePath}`);
                resolve();
            });
            this.scene.load.start();
        });
    }

    /**
     * Gets full image path for a layer
     * @param {string} imageName - Image name without extension
     * @returns {string} Full image path
     */
    _getFullImagePath(imageName) {
        const cleanImageName = imageName.replace(/\.[^/.]+$/, "");
        
        if (this.scene.songData?.isMod) {
            return `${this.scene.songData.modPath}/images/stages/${this.currentStage}/${cleanImageName}.png`;
        }
        
        return `${this.stageAssetsPath}/${this.currentStage}/${cleanImageName}.png`;
    }

    /**
     * Creates all stage layers from loaded data
     * @param {Object} stageData - Stage data object
     */
    _createStageLayers(stageData) {
        if (!this._isValidStageData(stageData)) return;

        const bgColorLayer = stageData.stage.find(layer => layer.color);
        if (bgColorLayer?.color) {
            try {
                const colorHex = bgColorLayer.color.replace('#', '');
                const colorInt = parseInt(colorHex, 16);
                
                const screenWidth = this.scene.game.config.width * 4;
                const screenHeight = this.scene.game.config.height * 4;
                
                const bgRect = this.scene.add.rectangle(
                    -screenWidth/4,
                    -screenHeight/4,
                    screenWidth,
                    screenHeight,
                    colorInt
                );
                
                bgRect.setOrigin(0, 0);
                bgRect.setDepth(bgColorLayer.layer || 0);
                bgRect.setScrollFactor(0);
                
                this.layers.push({
                    image: bgRect,
                    layerData: bgColorLayer,
                    parallaxFactor: 0
                });
            } catch (error) {
                console.error('Error creating background rectangle:', error);
            }
        }

        const normalLayers = stageData.stage.filter(layer => 
            layer.visible !== false && 
            !layer.player && 
            layer.namePath
        );

        if (normalLayers.length > 0) {
            normalLayers.forEach(layer => {
                const textureKey = this._getTextureKey(layer);
                if (this.scene.textures.exists(textureKey)) {
                    this._createLayer(layer, textureKey);
                }
            });
        }

        const characterLayers = stageData.stage.filter(layer => 
            layer.player && (layer.player === 1 || layer.player === 2 || layer.player === 'gf')
        );

        if (characterLayers.length > 0 && this.characters) {
            const depthsConfig = {
                player1: 10,
                player2: 10,
                gf: 9
            };

            characterLayers.forEach(layer => {
                const playerType = layer.player;
                const depth = layer.layer || (playerType === 'gf' ? 9 : 10);
                
                if (playerType === 1) depthsConfig.player1 = depth;
                else if (playerType === 2) depthsConfig.player2 = depth;
                else if (playerType === 'gf') depthsConfig.gf = depth;
            });

            this.characters.updateCharacterDepths(depthsConfig);
        }
    }

    /**
     * Processes character layers and updates their depths
     * @param {Array} characterLayers - Array of character layer data
     */
    _processCharacterLayers(characterLayers) {
        if (!this.characters) {
            console.warn('No characters instance available');
            return;
        }

        const depthsConfig = {
            player1: 3,
            player2: 3,
            gf: 2
        };

        characterLayers.forEach(layerConfig => {
            const playerType = layerConfig.player;
            const depth = layerConfig.layer || 3;
            
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

        this.characters.updateCharacterDepths(depthsConfig);
    }

    /**
     * Creates a single stage layer
     * @param {Object} layer - Layer data object
     * @param {string} textureKey - Texture key for the layer
     */
    _createLayer(layer, textureKey) {
        const [x = 0, y = 0] = Array.isArray(layer.position) ? layer.position : [];
        const layerDepth = layer.layer ?? 0;
        const parallaxMultiplier = (layerDepth / this.maxLayer) * this.parallaxFactor;
        
        const bgImage = this.scene.add.image(x, y, textureKey)
            .setOrigin(0, 0)
            .setDepth(layerDepth)
            .setScale(layer.scale || 1.0)
            .setAlpha(layer.opacity ?? 1.0)
            .setFlipX(layer.flipx === true);

        const scrollFactor = 1 + parallaxMultiplier;
        bgImage.setScrollFactor(scrollFactor);

        this.layers.push({
            image: bgImage,
            layerData: layer,
            parallaxFactor: scrollFactor
        });
    }

    /**
     * Generates texture key for a layer
     * @param {Object} layer - Layer data object
     * @returns {string} Texture key
     */
    _getTextureKey(layer) {
        if (!layer.namePath) return null;
        return `stage_${this.currentStage}_layer_${layer.layer}`;
    }

    /**
     * Clears all current stage layers and textures
     */
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

    /**
     * Performs complete cleanup of all resources
     */
    cleanup() {
        try {
            this.clearCurrentStage();
            this.characters = null;
            this.currentStage = null;
            
            if (this.container) {
                this.container.destroy();
                this.container = null;
            }
            
            if (this.scene && this.scene.textures) {
                const prefix = `stage_${this.currentStage}_layer_`;
                this.scene.textures.getTextureKeys()
                    .filter(key => key.startsWith(prefix))
                    .forEach(key => this.scene.textures.remove(key));
            }
        } catch (error) {
            console.error('Error during StageManager cleanup:', error);
        }
    }

    /**
     * Updates stage layers (parallax effects)
     * @param {number} time - Current game time
     * @param {number} delta - Time delta since last update
     */
    update(time, delta) {
        if (!this.scene.cameraController?.gameCamera) return;
    
        const camera = this.scene.cameraController.gameCamera;
    
        this.layers.forEach(layer => {
            if (layer.image && layer.parallaxFactor) {
                const baseX = layer.layerData.position[0] || 0;
                const baseY = layer.layerData.position[1] || 0;
                
                layer.image.x = baseX - (camera.scrollX * (layer.parallaxFactor - 1));
                layer.image.y = baseY - (camera.scrollY * (layer.parallaxFactor - 1));
            }
        });

        // Actualizar scripts
        for (const script of this.stageScripts) {
            if (typeof script.update === 'function') {
                script.update(time, delta);
            }
        }
    }
}