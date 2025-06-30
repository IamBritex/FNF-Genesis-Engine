export class StageManager {
    constructor(scene) {
        this.scene = scene;
        this.layers = [];
        this.currentStage = null;
        this.defaultStage = 'stage';
        this.characters = null;
        this.parallaxFactor = 0.1; // Factor base de parallax
        this.maxLayer = 6; // El número más alto de layer en tu stage.json
        this.stageAssetsPath = 'public/assets/images/stages'; // Nueva constante para la ruta base
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
            // Primero intentar cargar desde el mod si hay uno activo
            if (this.scene.songData?.isMod) {
                const modPath = this.scene.songData.modPath;
                const modResponse = await fetch(`${modPath}/data/stages/${stageName}.json`);
                if (modResponse.ok) {
                    return await modResponse.json();
                }
            }

            // Si no hay mod o falló la carga del mod, intentar desde el juego base
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

        // Filter out color-only layers and player layers
        const normalLayers = stageData.stage.filter(layer => 
            layer.visible !== false && 
            !layer.player && 
            layer.path // Only include layers with a path
        );

        // Only try to load if there are layers with paths
        if (normalLayers.length > 0) {
            const loadPromises = normalLayers.map(layer => this._loadLayerTexture(layer));
            await Promise.all(loadPromises);
        }
    }

    async _loadLayerTexture(layer) {
        const textureKey = this._getTextureKey(layer);
        
        if (this.scene.textures.exists(textureKey)) {
            return;
        }

        // Construir la ruta completa de la imagen
        const imagePath = this._getFullImagePath(layer.path);

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

    // También actualizar _getFullImagePath para soportar mods
    _getFullImagePath(imageName) {
        // Asegurarse de que el nombre de la imagen no incluya la extensión
        const cleanImageName = imageName.replace(/\.[^/.]+$/, "");
        
        // Si es un mod, usar la ruta del mod
        if (this.scene.songData?.isMod) {
            return `${this.scene.songData.modPath}/images/stages/${this.currentStage}/${cleanImageName}.png`;
        }
        
        // Si no es mod, usar la ruta base
        return `${this.stageAssetsPath}/${this.currentStage}/${cleanImageName}.png`;
    }

    _createStageLayers(stageData) {
        if (!this._isValidStageData(stageData)) return;

        // Crear fondo con color
        const bgColorLayer = stageData.stage.find(layer => layer.color);
        if (bgColorLayer?.color) {
            try {
                const colorHex = bgColorLayer.color.replace('#', '');
                const colorInt = parseInt(colorHex, 16);
                
                console.log('Creating background rectangle with color:', {
                    original: bgColorLayer.color,
                    hex: `0x${colorHex}`,
                    int: colorInt,
                    layer: bgColorLayer.layer || 0
                });

                // Crear un rectángulo que cubra toda la pantalla
                const screenWidth = this.scene.game.config.width * 4; // Hacerlo más grande
                const screenHeight = this.scene.game.config.height * 4;
                
                const bgRect = this.scene.add.rectangle(
                    -screenWidth/4, // Centrar
                    -screenHeight/4,
                    screenWidth,
                    screenHeight,
                    colorInt
                );
                
                // Configurar el rectángulo
                bgRect.setOrigin(0, 0);
                bgRect.setDepth(bgColorLayer.layer || 0);
                bgRect.setScrollFactor(0); // No se mueve con la cámara
                
                // Añadir a las capas para poder limpiarlo después
                this.layers.push({
                    image: bgRect,
                    layerData: bgColorLayer,
                    parallaxFactor: 0
                });
            } catch (error) {
                console.error('Error creating background rectangle:', error);
            }
        }

        // Procesar capas normales (no jugadores)
        const normalLayers = stageData.stage.filter(layer => 
            layer.visible !== false && 
            !layer.player && 
            layer.path
        );

        if (normalLayers.length > 0) {
            const sortedLayers = [...normalLayers].sort((a, b) => 
                (a.priority || 0) - (b.priority || 0)
            );

            sortedLayers.forEach(layer => {
                const textureKey = this._getTextureKey(layer);
                if (this.scene.textures.exists(textureKey)) {
                    this._createLayer(layer, textureKey);
                }
            });
        }

        // Procesar capas de personajes
        const characterLayers = stageData.stage.filter(layer => 
            layer.player && (layer.player === 1 || layer.player === 2 || layer.player === 'gf')
        );

        if (characterLayers.length > 0 && this.characters) {
            // Asegurarse de que los personajes estén por encima del fondo
            const depthsConfig = {
                player1: 10, // Aumentar las profundidades
                player2: 10,
                gf: 9
            };

            // Actualizar profundidades desde la configuración del stage
            characterLayers.forEach(layer => {
                const playerType = layer.player;
                const depth = layer.layer || (playerType === 'gf' ? 9 : 10);
                
                if (playerType === 1) depthsConfig.player1 = depth;
                else if (playerType === 2) depthsConfig.player2 = depth;
                else if (playerType === 'gf') depthsConfig.gf = depth;
            });

            console.log('Setting character depths:', depthsConfig);
            this.characters.updateCharacterDepths(depthsConfig);
        }
    }

    _processCharacterLayers(characterLayers) {
        if (!this.characters) {
            console.warn('No characters instance available');
            return;
        }

        // Configurar profundidades para cada personaje
        const depthsConfig = {
            player1: 3,  // Valores por defecto más altos para asegurar visibilidad
            player2: 3,
            gf: 2
        };

        // Actualizar configuración con valores del stage
        characterLayers.forEach(layerConfig => {
            const playerType = layerConfig.player;
            const depth = layerConfig.layer || 3; // Valor por defecto si no se especifica
            
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

        console.log('Updating character depths:', depthsConfig);
        this.characters.updateCharacterDepths(depthsConfig);
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
        if (!layer.path) return null;
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