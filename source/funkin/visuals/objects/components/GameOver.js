export class GameOver {
    constructor(scene) {
        this.scene = scene;
        this.isActive = false;
        console.log('GameOver component initialized');
        this.sounds = {
            dies: null,
            loop: null,
            confirm: null
        };
        this._loadSounds();
        this._setupEventListeners();
    }

    _loadSounds() {
        this.scene.load.audio('fnf_loss_sfx', 'public/assets/audio/sounds/fnf_loss_sfx.mp3');
        this.scene.load.audio('gameOver', 'public/assets/audio/sounds/gameOver.mp3');
        this.scene.load.audio('gameOverEnd', 'public/assets/audio/sounds/gameOverEnd.mp3');
        
        this.scene.load.once('complete', () => {
            this.sounds.dies = this.scene.sound.add('fnf_loss_sfx');
            this.sounds.loop = this.scene.sound.add('gameOver', { loop: true });
            this.sounds.confirm = this.scene.sound.add('gameOverEnd');
            console.log('Game over sounds loaded');
        });
        
        this.scene.load.start();
    }

    _setupEventListeners() {
        // Remover listeners anteriores para evitar duplicados
        this.scene.events.off('gameOver');
        
        console.log('Setting up game over event listener');
        this.scene.events.on('gameOver', (player) => {
            console.log('Game over event received for player:', player);
            this.startGameOver(player);
        });
    }

    async startGameOver(player) {
        console.log('Starting game over sequence...');
        
        if (this.isActive) {
            console.log('Game over already active, ignoring');
            return;
        }
        
        this.isActive = true;
        console.log('Game over state activated');

        try {
            // Detener la música y sonidos
            this.scene.sound.stopAll();
            console.log('All sounds stopped');

            // Ocultar la cámara UI
            if (this.scene.cameraController?.uiCamera) {
                this.scene.cameraController.uiCamera.setVisible(false);
                console.log('UI camera hidden');
            }

            // Cargar personaje de muerte
            const defaultDeathPath = 'public/assets/data/characters/bf-dead.json';
            console.log('Loading default death character (bf-dead)');
            
            try {
                const response = await fetch(defaultDeathPath);
                if (!response.ok) throw new Error('Failed to load default death character');
                
                const characterData = await response.json();
                const textureKey = 'character_bf-dead';

                // Cargar las texturas del personaje de muerte
                await this._loadDeathTextures(textureKey, characterData);
                
                // Reemplazar el sprite actual del jugador con el sprite de muerte
                const player = this.scene.characters.loadedCharacters.get(this.scene.characters.currentPlayer);
                if (player?.sprite) {
                    // Mantener la posición original
                    const originalPos = {
                        x: player.sprite.x,
                        y: player.sprite.y
                    };

                    // Crear nuevo sprite de muerte
                    const deathSprite = this.scene.add.sprite(originalPos.x, originalPos.y, textureKey);
                    deathSprite.setScale(characterData.scale || 1);
                    // No aplicamos flip al sprite de muerte
                    
                    // Reemplazar el sprite viejo
                    player.sprite.destroy();
                    player.sprite = deathSprite;
                    player.textureKey = textureKey;
                }

                // Configurar las animaciones de muerte
                await this._setupDeathAnimations(textureKey);

            } catch (error) {
                console.error('Failed to load death character:', error);
                return;
            }

            // Continuar con la secuencia de muerte
            await this._hideStageElements(player);
            await this._focusCameraOnPlayer();
            await this._playDeathAnimation();
            this._setupDeathInputs();

        } catch (error) {
            console.error('Error during game over sequence:', error);
        }
    }

    async _loadDeathTextures(textureKey, characterData) {
        if (this.scene.textures.exists(textureKey)) return;

        const spritesPath = {
            TEXTURE: 'public/assets/images/characters/BOYFRIEND_DEAD.png',
            ATLAS: 'public/assets/images/characters/BOYFRIEND_DEAD.xml'
        };

        return new Promise((resolve, reject) => {
            this.scene.load.atlasXML(textureKey, spritesPath.TEXTURE, spritesPath.ATLAS);
            this.scene.load.once('complete', resolve);
            this.scene.load.once('loaderror', reject);
            this.scene.load.start();
        });
    }

    async _setupDeathAnimations(textureKey) {
        const animations = [
            { name: "BF dies", anim: "firstDeath" },
            { name: "BF Dead Loop", anim: "deathLoop" },
            { name: "BF Dead confirm", anim: "deathConfirm" }
        ];

        for (const animation of animations) {
            const frames = this.scene.textures.get(textureKey)
                .getFrameNames()
                .filter(frame => frame.startsWith(animation.name))
                .sort();

            if (frames.length > 0) {
                const animKey = `${textureKey}_${animation.anim}`;
                
                if (!this.scene.anims.exists(animKey)) {
                    this.scene.anims.create({
                        key: animKey,
                        frames: frames.map(frame => ({
                            key: textureKey,
                            frame: frame
                        })),
                        frameRate: 24,
                        repeat: animation.anim === "deathLoop" ? -1 : 0
                    });
                }
            }
        }
    }

    _setupDeathInputs() {
        // Evitar múltiples triggers de ENTER
        let enterPressed = false;

        this.scene.input.keyboard.addKey('ENTER').on('down', () => {
            if (this.isActive && !enterPressed) {
                enterPressed = true;
                this.sounds.loop.stop();
                this.sounds.confirm.play();
                this.scene.characters.confirmDeath();

                const player = this.scene.characters.loadedCharacters.get(this.scene.characters.currentPlayer);
                if (player?.sprite) {
                    this.scene.tweens.add({
                        targets: player.sprite,
                        alpha: 0,
                        duration: 4500,
                        onComplete: () => {
                            this.sounds.confirm.once('complete', () => {
                                console.log('Restarting scene...');
                                this.scene._cleanupBeforeRestart().then(() => {
                                    this.scene.scene.restart();
                                });
                            });
                        }
                    });
                } else {
                    // Si no hay sprite, solo espera el sonido y reinicia
                    this.sounds.confirm.once('complete', () => {
                        this.scene._cleanupBeforeRestart().then(() => {
                            this.scene.scene.restart();
                        });
                    });
                }
            }
        });

        this.scene.input.keyboard.addKey('BACKSPACE').on('down', () => {
            if (this.isActive) {
                this.sounds.loop.stop();
                this.scene.playFreakyMenuAndRedirect();
            }
        });
    }

    async _hideUIElements() {
        console.log('Hiding UI elements...');
        
        const uiElements = [
            { element: this.scene.healthBar, name: 'healthBar' },
            { element: this.scene.ratingText, name: 'ratingText' },
            { element: this.scene.timeBar, name: 'timeBar' },
            { element: this.scene.ratingManager, name: 'ratingManager' },
            { element: this.scene.arrowsManager, name: 'arrowsManager' }
        ];

        uiElements.forEach(({ element, name }) => {
            if (element) {
                console.log(`Hiding ${name}`);
                if (element.container) {
                    element.container.setVisible(false);
                    console.log(`${name} container hidden`);
                }
                if (element.setVisible) {
                    element.setVisible(false);
                    console.log(`${name} element hidden`);
                }
            } else {
                console.log(`${name} not found`);
            }
        });
    }

    async _hideStageElements(player) {
        console.log('Hiding stage elements...');

        // Ocultar stage layers
        if (this.scene.stageManager?.layers) {
            console.log('Processing stage layers...');
            
            // Ocultar TODAS las capas primero
            this.scene.stageManager.layers.forEach(layer => {
                if (layer?.image) {
                    layer.image.setVisible(false);
                    console.log(`Layer hidden:`, layer.layerData);
                }
            });

            // Mostrar SOLO la capa del player1
            const player1Layer = this.scene.stageManager.layers.find(layer => 
                layer?.layerData?.player === 1 || layer?.layerData?.player === "1"
            );

            if (player1Layer?.image) {
                player1Layer.image.setVisible(true);
                console.log('Player 1 layer made visible');
            }
        }

        // Procesar personajes
        if (this.scene.characters) {
            console.log('Processing characters...');
            
            // Ocultar TODOS los personajes primero
            const characters = this.scene.characters;
            
            // Ocultar GF si existe
            if (characters.currentGF) {
                const gf = characters.loadedCharacters.get(characters.currentGF);
                if (gf?.sprite) {
                    gf.sprite.setVisible(false);
                    console.log('GF hidden');
                }
            }
            
            // Ocultar enemy
            if (characters.currentEnemy) {
                const enemy = characters.loadedCharacters.get(characters.currentEnemy);
                if (enemy?.sprite) {
                    enemy.sprite.setVisible(false);
                    console.log('Enemy hidden');
                }
            }
            
            // Mostrar solo player1
            if (characters.currentPlayer) {
                const player1 = characters.loadedCharacters.get(characters.currentPlayer);
                if (player1?.sprite) {
                    player1.sprite.setVisible(true);
                    console.log('Player 1 shown');
                    
                    // Asegurar que el sprite del player1 esté en la capa del juego
                    if (this.scene.cameraController) {
                        this.scene.cameraController.addToGameLayer(player1.sprite);
                    }
                }
            }
        }
    }

    async _focusCameraOnPlayer() {
        // Obtener los datos del personaje muerto
        const playerData = this.scene.characters.loadedCharacters.get(this.scene.characters.currentPlayer);
        
        if (!playerData?.data) {
            console.warn('No player data found for camera positioning');
            return;
        }

        console.log('Death character data:', playerData.data);

        // Usar camera_position de los datos del personaje muerto
        if (playerData.data.camera_position) {
            const [camX, camY] = playerData.data.camera_position;
            console.log('Using camera position from death character:', { x: camX, y: camY });
            
            // Usar el método panToPosition del CameraController
            if (this.scene.cameraController) {
                await this.scene.cameraController.panToPosition(camX, camY, 1000);
                console.log('Camera panned to position');
            }
        } else {
            // Fallback a la posición del sprite si no hay camera_position
            if (this.scene.characters?.player1?.sprite) {
                const sprite = this.scene.characters.player1.sprite;
                console.log('Falling back to sprite position:', { x: sprite.x, y: sprite.y });
                await this.scene.cameraController.panToPosition(sprite.x, sprite.y, 1000);
            }
        }

        // Asegurar que la cámara del juego esté visible
        if (this.scene.cameraController?.gameCamera) {
            this.scene.cameraController.gameCamera.setVisible(true);
        }
    }

    async _playDeathAnimation() {
        const characters = this.scene.characters;
        if (!characters) return;

        const player = characters.loadedCharacters.get(characters.currentPlayer);
        if (!player?.sprite) {
            console.error('Player sprite not found');
            return;
        }

        // Primera animación: BF dies
        console.log('Playing death animation...');
        this.sounds.dies.play();
        await characters.playDeathAnimation();
        
        // Cuando termine la primera animación y sonido
        return new Promise(resolve => {
            this.sounds.dies.once('complete', () => {
                console.log('Death sound completed, starting loop...');
                // Iniciar el loop de muerte y su sonido
                const loopAnim = `${player.textureKey}_deathLoop`;
                player.sprite.play(loopAnim);
                this.sounds.loop.play();
                resolve();
            });
        });
    }

    destroy() {
        console.log('Destroying GameOver component');
        this.scene.events.off('gameOver');
        
        // Stop and destroy all sounds
        Object.values(this.sounds).forEach(sound => {
            if (sound) {
                sound.stop();
                sound.destroy();
            }
        });
        
        this.isActive = false;
    }
}