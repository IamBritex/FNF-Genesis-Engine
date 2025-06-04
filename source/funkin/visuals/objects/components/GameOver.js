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

            // Detener inputs
            if (this.scene.arrowsManager) {
                this.scene.arrowsManager.disableInputs();
                console.log('Inputs disabled');
            }

            // Detener actualizaciones del juego
            this.scene.isMusicPlaying = false;
            console.log('Game updates stopped');

            // Asegurarnos de que todo lo que sigue sea solo visible en la gameCamera
            if (this.scene.cameraController) {
                // Ocultar la cámara UI completamente
                this.scene.cameraController.uiCamera.setVisible(false);
                console.log('UI Camera hidden');

                // Asegurar que la cámara del juego esté visible
                this.scene.cameraController.gameCamera.setVisible(true);
                console.log('Game Camera visible');
            }

            // Cargar y configurar el personaje de muerte
            const playerData = this.scene.characters.loadedCharacters.get(this.scene.characters.currentPlayer);
            if (playerData?.data?.dead) {
                await this.scene.characters.loadDeathCharacter(playerData.data.dead);
            }

            // Ya no necesitamos ocultar UI pues la cámara UI está oculta
            await this._hideStageElements(player);

            // Centrar cámara en player1
            await this._focusCameraOnPlayer();

            // Reproducir animación de muerte
            await this._playDeathAnimation();

            // Configurar inputs para la secuencia de muerte
            this._setupDeathInputs();

        } catch (error) {
            console.error('Error during game over sequence:', error);
        }
    }

    _setupDeathInputs() {
        this.scene.input.keyboard.addKey('ENTER').on('down', () => {
            if (this.isActive) {
                this.sounds.loop.stop();
                this.sounds.confirm.play();
                this.scene.characters.confirmDeath();
                
                // Esperar a que termine la animación y el sonido
                this.sounds.confirm.once('complete', () => {
                    console.log('Restarting scene...');
                    this.scene._cleanupBeforeRestart().then(() => {
                        this.scene.scene.restart();
                    });
                });
            }
        });

        this.scene.input.keyboard.addKey('BACKSPACE').on('down', () => {
            if (this.isActive) {
                // Detener el sonido del loop de muerte
                this.sounds.loop.stop();
                
                // Llamar directamente al método del PlayState
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