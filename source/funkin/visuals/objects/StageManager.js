
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
        this.beatAnimationMode = true; // Activar modo de animación por beats
        this.lastBeatTime = 0;
        this.beatInterval = 500; // Intervalo por defecto en ms (120 BPM)
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
     * Sets the BPM for beat-based sprite animations
     * @param {number} bpm - Beats per minute
     */
    setBPM(bpm) {
        this.beatInterval = (60 / bpm) * 1000; // Convertir BPM a milisegundos por beat
        console.log(`🎵 Stage BPM set to ${bpm} (${this.beatInterval}ms per beat)`);
    }

    /**
     * Triggers beat-based animations for all sprite layers
     * Called by the main game when a beat occurs
     */
    onBeat() {
        if (!this.beatAnimationMode) return;

        console.log(`🎵 Beat triggered! Animating ${this.layers.filter(l => l.isSprite).length} sprite layers`);

        this.layers.forEach((layer, index) => {
            if (layer.isSprite && layer.spriteData && layer.spriteData.totalFrames > 1) {
                // Solo animar si la capa tiene configurado animación por beats
                if (layer.layerData.beatAnimation !== false) {
                    console.log(`🎬 Starting beat animation for sprite: ${layer.layerData.namePath}`);
                    this.playBeatAnimation(index);
                }
            }
        });
    }

    /**
     * Manually trigger beat animation (useful for testing)
     */
    triggerBeatTest() {
        console.log('🧪 Triggering test beat animation...');
        this.onBeat();
    }

    /**
     * Enable or disable beat animation mode
     * @param {boolean} enabled - Whether to enable beat animations
     */
    setBeatAnimationMode(enabled) {
        this.beatAnimationMode = enabled;
        console.log(`🎵 Beat animation mode: ${enabled ? 'enabled' : 'disabled'}`);
        
        if (!enabled) {
            // Si se desactiva el modo beat, iniciar animaciones continuas
            this.initializeAllSpriteAnimations();
        }
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
            const loadPromises = normalLayers.map(layer => {
                if (layer.type === 'sprite' && layer.spriteData) {
                    return this._loadSpriteTextures(layer);
                } else {
                    return this._loadLayerTexture(layer);
                }
            });
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
     * Loads sprite textures from spritesheet data
     * @param {Object} layer - Layer data object with sprite information
     * @returns {Promise<void>}
     */
    async _loadSpriteTextures(layer) {
        const textureKey = this._getTextureKey(layer);
        const spriteData = layer.spriteData;

        if (!spriteData || !spriteData.frames) {
            console.warn(`Invalid sprite data for layer: ${layer.namePath}`);
            return;
        }

        // Cargar la imagen base del spritesheet
        const imagePath = this._getFullImagePath(layer.namePath.replace(' (Sprite)', ''));

        return new Promise((resolve) => {
            // Primero cargar la imagen completa del spritesheet
            this.scene.load.image(textureKey, imagePath);
            this.scene.load.once(`filecomplete-image-${textureKey}`, async () => {
                // Una vez cargada la imagen base, crear los frames individuales de forma sincrónica
                await this._createSpriteFramesSynchronously(textureKey, spriteData);
                resolve();
            });
            this.scene.load.once(`loaderror-image-${textureKey}`, () => {
                console.warn(`Sprite texture not found: ${imagePath}`);
                resolve();
            });
            this.scene.load.start();
        });
    }

    /**
     * Creates individual frame textures from sprite data synchronously
     * @param {string} baseKey - Base texture key
     * @param {Object} spriteData - Sprite data with frames information
     * @returns {Promise<void>}
     */
    async _createSpriteFramesSynchronously(baseKey, spriteData) {
        if (!spriteData.frames || spriteData.frames.length === 0) return;

        console.log(`🎨 Creating ${spriteData.frames.length} sprite frames for ${baseKey} (synchronous)`);

        const baseTexture = this.scene.textures.get(baseKey);
        if (!baseTexture) {
            console.error(`Base texture not found: ${baseKey}`);
            return;
        }

        // Crear frames individuales usando canvas y añadirlos como texturas separadas
        spriteData.frames.forEach((frame, index) => {
            const frameKey = `${baseKey}_frame_${index}`;

            // Solo crear si no existe ya
            if (!this.scene.textures.exists(frameKey)) {
                try {
                    // Crear un canvas temporal para el frame
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    canvas.width = frame.width;
                    canvas.height = frame.height;

                    // Obtener la imagen source del baseTexture
                    const sourceImage = baseTexture.source[0].image;

                    // Dibujar el frame específico en el canvas
                    ctx.drawImage(
                        sourceImage,
                        frame.x, frame.y, frame.width, frame.height,
                        0, 0, frame.width, frame.height
                    );

                    // Añadir como nueva textura
                    this.scene.textures.addCanvas(frameKey, canvas);

                    console.log(`📋 Frame created: ${frameKey} (${frame.width}x${frame.height})`);
                } catch (error) {
                    console.error(`Error creating frame ${frameKey}:`, error);
                }
            }
        });
    }

    /**
     * Creates individual frame textures from sprite data (legacy method)
     * @param {string} baseKey - Base texture key
     * @param {Object} spriteData - Sprite data with frames information
     * @param {string} imagePath - Path to the spritesheet image
     */
    _createSpriteFrames(baseKey, spriteData, imagePath) {
        if (!spriteData.frames || spriteData.frames.length === 0) return;

        console.log(`🎨 Creating ${spriteData.frames.length} sprite frames for ${baseKey}`);

        // Crear frames individuales usando canvas
        spriteData.frames.forEach((frame, index) => {
            const frameKey = `${baseKey}_frame_${index}`;

            // Solo crear si no existe ya
            if (!this.scene.textures.exists(frameKey)) {
                // Crear un canvas temporal para el frame
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = frame.width;
                canvas.height = frame.height;

                // Cargar la imagen y extraer el frame
                const img = new Image();
                img.onload = () => {
                    ctx.drawImage(
                        img,
                        frame.x, frame.y, frame.width, frame.height,
                        0, 0, frame.width, frame.height
                    );

                    // Agregar como textura
                    this.scene.textures.addCanvas(frameKey, canvas);
                    console.log(`📋 Frame created: ${frameKey} (${frame.width}x${frame.height})`);
                };
                img.src = imagePath;
            }
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
                    -screenWidth / 4,
                    -screenHeight / 4,
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

                // Verificar si es un sprite o una imagen normal
                if (layer.type === 'sprite' && layer.spriteData) {
                    this._createSpriteLayer(layer, textureKey);
                } else if (this.scene.textures.exists(textureKey)) {
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
     * Creates a sprite layer with animation support
     * @param {Object} layer - Layer data object with sprite information
     * @param {string} textureKey - Base texture key for the sprite
     */
    _createSpriteLayer(layer, textureKey) {
        const [x = 0, y = 0] = Array.isArray(layer.position) ? layer.position : [];
        const layerDepth = layer.layer ?? 0;
        const parallaxMultiplier = (layerDepth / this.maxLayer) * this.parallaxFactor;

        const spriteData = layer.spriteData;
        const currentFrame = spriteData.currentFrame || 0;

        // Construir la clave de la textura del frame actual
        // Usar la misma nomenclatura que el Stage Editor
        const frameKey = `${textureKey}_frame_${currentFrame}`;

        // Verificar si existe la textura del frame
        if (!this.scene.textures.exists(frameKey)) {
            console.warn(`Sprite frame texture not found: ${frameKey}, falling back to base texture`);
            // Fallback a la textura base si no existe el frame específico
            if (this.scene.textures.exists(textureKey)) {
                this._createLayer(layer, textureKey);
            }
            return;
        }

        const spriteImage = this.scene.add.image(x, y, frameKey)
            .setOrigin(0, 0)
            .setDepth(layerDepth)
            .setScale(layer.scale || 1.0)
            .setAlpha(layer.opacity ?? 1.0)
            .setFlipX(layer.flipx === true);

        const scrollFactor = 1 + parallaxMultiplier;
        spriteImage.setScrollFactor(scrollFactor);

        // Agregar datos específicos del sprite
        spriteImage.setData('isSprite', true);
        spriteImage.setData('spriteData', spriteData);
        spriteImage.setData('currentFrame', currentFrame);
        spriteImage.setData('baseTextureKey', textureKey);

        this.layers.push({
            image: spriteImage,
            layerData: layer,
            parallaxFactor: scrollFactor,
            isSprite: true,
            spriteData: spriteData
        });

        console.log(`🎞️ Sprite layer created: ${layer.namePath} (frame ${currentFrame + 1}/${spriteData.totalFrames}) - Beat animation: ${layer.beatAnimation !== false ? 'enabled' : 'disabled'}`);
    }

    /**
     * Generates texture key for a layer
     * @param {Object} layer - Layer data object
     * @returns {string} Texture key
     */
    _getTextureKey(layer) {
        if (!layer.namePath) return null;

        // Para sprites, usar el nombre limpio del sprite
        if (layer.type === 'sprite') {
            const spriteName = layer.namePath.replace(' (Sprite)', '');
            return `stage_${spriteName}`;
        }

        // Para imágenes normales, usar el namePath directamente
        return `stage_${layer.namePath}`;
    }

    /**
     * Clears all current stage layers and textures
     */
    clearCurrentStage() {
        this.layers.forEach((layer, index) => {
            // Detener animaciones de sprites
            if (layer.isSprite && layer.animationTimer) {
                layer.animationTimer.destroy();
            }

            // Detener animaciones por beat
            if (layer.isSprite && layer.beatAnimationTimer) {
                layer.beatAnimationTimer.destroy();
            }

            if (layer.image?.destroy) {
                layer.image.destroy();
            }

            const textureKey = this._getTextureKey(layer.layerData);
            if (this.scene.textures.exists(textureKey)) {
                this.scene.textures.remove(textureKey);
            }

            // Limpiar texturas de frames de sprites
            if (layer.isSprite && layer.spriteData) {
                for (let i = 0; i < layer.spriteData.totalFrames; i++) {
                    const frameKey = `${textureKey}_frame_${i}`;
                    if (this.scene.textures.exists(frameKey)) {
                        this.scene.textures.remove(frameKey);
                    }
                }
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
     * Changes the frame of a specific sprite layer
     * @param {number} layerIndex - Index of the layer in the layers array
     * @param {number} frameIndex - Frame index to switch to
     * @returns {boolean} True if frame change was successful
     */
    changeSpriteFrame(layerIndex, frameIndex) {
        if (layerIndex < 0 || layerIndex >= this.layers.length) return false;

        const layer = this.layers[layerIndex];
        if (!layer.isSprite || !layer.spriteData) return false;

        const spriteData = layer.spriteData;
        if (frameIndex < 0 || frameIndex >= spriteData.totalFrames) return false;

        const baseKey = layer.image.getData('baseTextureKey');
        const frameKey = `${baseKey}_frame_${frameIndex}`;

        if (this.scene.textures.exists(frameKey)) {
            layer.image.setTexture(frameKey);
            layer.image.setData('currentFrame', frameIndex);
            layer.spriteData.currentFrame = frameIndex;

            return true;
        }

        return false;
    }

    /**
     * Starts automatic animation for a sprite layer
     * @param {number} layerIndex - Index of the layer to animate
     * @param {number} frameRate - Animation frame rate (frames per second)
     * @param {boolean} loop - Whether to loop the animation
     * @returns {boolean} True if animation started successfully
     */
    startSpriteAnimation(layerIndex, frameRate = 12, loop = true) {
        if (layerIndex < 0 || layerIndex >= this.layers.length) return false;

        const layer = this.layers[layerIndex];
        if (!layer.isSprite || !layer.spriteData) return false;

        // Si el modo de animación por beats está activado, no iniciar animación continua
        if (this.beatAnimationMode && layer.layerData.beatAnimation !== false) {
            console.log(`🎵 Sprite layer ${layerIndex} configured for beat animation, skipping continuous animation`);
            return false;
        }

        // Verificar que al menos los primeros 2 frames existan
        const baseKey = layer.image.getData('baseTextureKey');
        const frame0Key = `${baseKey}_frame_0`;
        const frame1Key = `${baseKey}_frame_1`;

        if (!this.scene.textures.exists(frame0Key) || !this.scene.textures.exists(frame1Key)) {
            console.warn(`Cannot start animation: sprite frames not loaded for layer ${layerIndex}`);
            return false;
        }

        // Detener animación previa si existe
        this.stopSpriteAnimation(layerIndex);

        const spriteData = layer.spriteData;
        const frameDuration = 1000 / frameRate; // Duración en milisegundos

        layer.animationTimer = this.scene.time.addEvent({
            delay: frameDuration,
            callback: () => {
                const currentFrame = layer.image.getData('currentFrame') || 0;
                let nextFrame = currentFrame + 1;

                if (nextFrame >= spriteData.totalFrames) {
                    if (loop) {
                        nextFrame = 0;
                    } else {
                        this.stopSpriteAnimation(layerIndex);
                        return;
                    }
                }

                this.changeSpriteFrame(layerIndex, nextFrame);
            },
            loop: true
        });

        console.log(`▶️ Started sprite animation: Layer ${layerIndex} (${frameRate} FPS, loop: ${loop})`);
        return true;
    }

    /**
     * Plays a beat-based animation for a specific sprite layer
     * @param {number} layerIndex - Index of the layer to animate
     * @returns {boolean} True if animation started successfully
     */
    playBeatAnimation(layerIndex) {
        if (layerIndex < 0 || layerIndex >= this.layers.length) {
            console.warn(`Invalid layer index for beat animation: ${layerIndex}`);
            return false;
        }

        const layer = this.layers[layerIndex];
        if (!layer.isSprite || !layer.spriteData) {
            console.warn(`Layer ${layerIndex} is not a sprite layer`);
            return false;
        }

        const spriteData = layer.spriteData;
        const baseKey = layer.image.getData('baseTextureKey');
        
        // Verificar que los frames existan antes de animar
        const frame0Key = `${baseKey}_frame_0`;
        if (!this.scene.textures.exists(frame0Key)) {
            console.warn(`Beat animation failed: frame textures not found for ${layer.layerData.namePath}`);
            return false;
        }

        // Detener cualquier animación en curso
        this.stopSpriteAnimation(layerIndex);

        const frameRate = layer.layerData.frameRate || 24; // FPS más rápido para beat animations
        const frameDuration = 1000 / frameRate;

        console.log(`🎵 Beat animation started: ${layer.layerData.namePath} (${spriteData.totalFrames} frames, ${frameRate} FPS)`);

        // Resetear al primer frame
        this.changeSpriteFrame(layerIndex, 0);

        let currentFrameIndex = 0;

        // Crear timer para reproducir toda la animación una vez
        layer.beatAnimationTimer = this.scene.time.addEvent({
            delay: frameDuration,
            callback: () => {
                currentFrameIndex++;
                
                if (currentFrameIndex >= spriteData.totalFrames) {
                    // Animación completada, volver al primer frame y detener
                    this.changeSpriteFrame(layerIndex, 0);
                    if (layer.beatAnimationTimer) {
                        layer.beatAnimationTimer.destroy();
                        layer.beatAnimationTimer = null;
                    }
                    console.log(`✅ Beat animation completed: ${layer.layerData.namePath}`);
                    return;
                }

                const success = this.changeSpriteFrame(layerIndex, currentFrameIndex);
                if (!success) {
                    console.warn(`Failed to change frame ${currentFrameIndex} for ${layer.layerData.namePath}`);
                }
            },
            repeat: spriteData.totalFrames - 1 // Repetir hasta completar todos los frames
        });

        return true;
    }

    /**
     * Force starts all sprite animations (useful for manual initialization)
     * @param {number} frameRate - Default frame rate for animations
     * @returns {number} Number of animations started
     */
    initializeAllSpriteAnimations(frameRate = 12) {
        let animationsStarted = 0;

        this.layers.forEach((layer, index) => {
            if (layer.isSprite && layer.spriteData.totalFrames > 1) {
                const customFrameRate = layer.layerData.frameRate || frameRate;
                const loop = layer.layerData.loop !== false;

                if (this.startSpriteAnimation(index, customFrameRate, loop)) {
                    animationsStarted++;
                    layer.autoAnimationStarted = true;
                }
            }
        });

        console.log(`🎬 Initialized ${animationsStarted} sprite animations`);
        return animationsStarted;
    }

    /**
     * Stops automatic animation for a sprite layer
     * @param {number} layerIndex - Index of the layer to stop animating
     * @returns {boolean} True if animation stopped successfully
     */
    stopSpriteAnimation(layerIndex) {
        if (layerIndex < 0 || layerIndex >= this.layers.length) return false;

        const layer = this.layers[layerIndex];
        let stopped = false;

        // Detener animación continua
        if (layer.animationTimer) {
            layer.animationTimer.destroy();
            layer.animationTimer = null;
            stopped = true;
        }

        // Detener animación por beat
        if (layer.beatAnimationTimer) {
            layer.beatAnimationTimer.destroy();
            layer.beatAnimationTimer = null;
            stopped = true;
        }

        if (stopped) {
            console.log(`⏹️ Stopped sprite animation: Layer ${layerIndex}`);
        }

        return stopped;
    }

    /**
     * Gets sprite information for a specific layer
     * @param {number} layerIndex - Index of the layer
     * @returns {Object|null} Sprite information or null if not a sprite
     */
    getSpriteInfo(layerIndex) {
        if (layerIndex < 0 || layerIndex >= this.layers.length) return null;

        const layer = this.layers[layerIndex];
        if (!layer.isSprite) return null;

        return {
            currentFrame: layer.image.getData('currentFrame') || 0,
            totalFrames: layer.spriteData.totalFrames,
            isAnimating: !!layer.animationTimer,
            isBeatAnimating: !!layer.beatAnimationTimer,
            layerData: layer.layerData,
            baseTextureKey: layer.image.getData('baseTextureKey')
        };
    }

    /**
     * Gets debug information about all sprite layers
     * @returns {Array} Array of sprite information
     */
    getSpritesDebugInfo() {
        const sprites = [];
        this.layers.forEach((layer, index) => {
            if (layer.isSprite) {
                sprites.push({
                    index,
                    name: layer.layerData.namePath,
                    totalFrames: layer.spriteData.totalFrames,
                    currentFrame: layer.image.getData('currentFrame') || 0,
                    isAnimating: !!layer.animationTimer,
                    isBeatAnimating: !!layer.beatAnimationTimer,
                    beatAnimationEnabled: layer.layerData.beatAnimation !== false
                });
            }
        });
        return sprites;
    }

    /**
     * Logs current state of all sprites (useful for debugging)
     */
    logSpritesState() {
        const sprites = this.getSpritesDebugInfo();
        console.log('🎞️ Current sprites state:');
        sprites.forEach(sprite => {
            console.log(`  - ${sprite.name}: Frame ${sprite.currentFrame + 1}/${sprite.totalFrames}, Beat anim: ${sprite.beatAnimationEnabled ? 'enabled' : 'disabled'}, Animating: ${sprite.isBeatAnimating ? 'beat' : sprite.isAnimating ? 'continuous' : 'none'}`);
        });
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

        // Auto-iniciar animaciones de sprites si es necesario
        this._updateSpriteAnimations();
    }

    /**
     * Updates sprite animations and auto-starts them if configured
     * @private
     */
    _updateSpriteAnimations() {
        this.layers.forEach((layer, index) => {
            if (layer.isSprite && !layer.animationTimer && layer.layerData.autoAnimate !== false) {
                // Auto-iniciar animación para sprites con más de 1 frame
                if (layer.spriteData.totalFrames > 1) {
                    // Si el modo beat está activado, no iniciar animaciones continuas
                    if (this.beatAnimationMode && layer.layerData.beatAnimation !== false) {
                        // Solo mostrar el primer frame para sprites que se animan por beat
                        if (!layer.beatFrameSet) {
                            this.changeSpriteFrame(index, 0);
                            layer.beatFrameSet = true;
                        }
                        return;
                    }

                    // Verificar que las texturas de los frames existan antes de iniciar animación
                    const baseKey = layer.image.getData('baseTextureKey');
                    const firstFrameKey = `${baseKey}_frame_0`;
                    const secondFrameKey = `${baseKey}_frame_1`;

                    if (this.scene.textures.exists(firstFrameKey) && this.scene.textures.exists(secondFrameKey)) {
                        const frameRate = layer.layerData.frameRate || 12; // FPS por defecto
                        const loop = layer.layerData.loop !== false; // Loop por defecto

                        // Solo iniciar si no hemos marcado como "no auto-animar"
                        if (!layer.autoAnimationStarted) {
                            this.startSpriteAnimation(index, frameRate, loop);
                            layer.autoAnimationStarted = true;
                            console.log(`🎬 Auto-started animation for sprite: ${layer.layerData.namePath}`);
                        }
                    } else {
                        console.log(`⏳ Waiting for sprite frames to load: ${layer.layerData.namePath}`);
                    }
                }
            }
        });
    }
}