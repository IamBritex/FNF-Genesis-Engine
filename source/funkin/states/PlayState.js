import { AudioManager } from '../visuals/objects/AudioManager.js';
import { DataManager } from '../visuals/objects/DataManager.js';
import { NotesController } from '../visuals/objects/NotesController.js';
import { CountdownManager } from '../visuals/objects/CountdownManager.js'
import { RatingManager } from '../visuals/objects/RatingManager.js';
import { Characters } from '../visuals/objects/Characters.js';
import { CameraController } from '../visuals/objects/Camera.js';
import { RatingText } from '../visuals/objects/RatingText.js';
import { HealthBar } from '../visuals/objects/HealthBar.js'; // Añadir esta línea

export class PlayState extends Phaser.Scene {
    constructor() {
        super({ key: "PlayState" });
        this.songPosition = 0;
        this.isMusicPlaying = false;
        this.currentBPM = 0;
        this.bpmChangePoints = [];
        this.characters = null;
        this.cameraController = null;
        this.ratingText = null;
    }

    init(data) {
        // Create new instances of managers on each scene initialization
        // This ensures clean state for each song
        this.audioManager = new AudioManager(this);
        this.dataManager = new DataManager(this);
        this.arrowsManager = new NotesController(this);
        this.countdownManager = new CountdownManager(this);
        this.ratingManager = new RatingManager(this);
        this.characters = new Characters(this);
        this.cameraController = new CameraController(this);
        
        // Reset state variables
        this.songPosition = 0;
        this.isMusicPlaying = false;
        
        // Initialize data manager with passed data
        this.dataManager.init(data);
        
        // Clear the cache for previous song data
        if (this.cache.json.exists('songData')) {
            this.cache.json.remove('songData');
        }
    }

    preload() {
        this.load.image('healthBar', 'public/assets/images/UI/healthBar.png');
        this.load.audio('missnote1', 'public/assets/audio/sounds/missnote1.ogg');
        this.load.audio('missnote2', 'public/assets/audio/sounds/missnote2.ogg');
        this.load.audio('missnote3', 'public/assets/audio/sounds/missnote3.ogg');
        this.load.atlasXML('notes', 'public/assets/images/states/PlayState/notes.png', 'public/assets/images/states/PlayState/notes.xml');
        this.load.atlasXML('noteStrumline', 'public/assets/images/states/PlayState/noteStrumline.png', 'public/assets/images/states/PlayState/noteStrumline.xml');
        this.load.atlasXML('NOTE_hold_assets', 'public/assets/images/states/PlayState/NOTE_hold_assets.png', 'public/assets/images/states/PlayState/NOTE_hold_assets.xml');
        this.load.image('funkay', 'public/assets/images/funkay.png');
        this.load.audio('freakyMenu', 'public/assets/audio/sounds/FreakyMenu.mp3');
        // En la escena de precarga
        this.cameras.main.setBackgroundColor("#cbfa4c");
        const { width, height } = this.scale;
        this.loadingImage = this.add.image(width / 2, height / 2, 'funkay');
        this.loadingImage.setScale(Math.min(width / this.loadingImage.width, height / this.loadingImage.height) * 0.8);

        this.loadBar = this.add.graphics();
        this.loadBar.fillStyle(0x8A2BE2, 1);
        this.loadBar.fillRect(0, height - 20, width, 20);

        // Precargar assets del countdown
        this.countdownManager.preload();

        if (this.dataManager.songList.length > 0) {
            this.loadCurrentAndNextSong();
        } else {
            console.error("No hay canciones para cargar.");
            this.redirectToNextState();
        }

        this.load.on('progress', (value) => {
            this.loadBar.clear();
            this.loadBar.fillStyle(0x8A2BE2, 1);
            this.loadBar.fillRect(0, height - 20, width * value, 20);
        });

        // Añadir la carga de la barra de vida
        this.load.image('healthBar', 'public/assets/images/UI/healthBar.png');
    }

    async loadCurrentAndNextSong() {
        const currentSong = this.dataManager.songList[this.dataManager.currentSongIndex];
        if (typeof currentSong !== 'string') {
            console.error("La canción actual no es válida.");
            this.redirectToNextState();
            return;
        }

        try {
            // Cargar el audio primero
            await this.audioManager.loadSongAudio(currentSong);

            // Cargar los datos de la canción
            const difficulty = this.dataManager.selectedDifficulty;
            const jsonPath = difficulty === 'normal' ? 
                `public/assets/audio/songs/${currentSong}/charts/${currentSong}.json` :
                `public/assets/audio/songs/${currentSong}/charts/${currentSong}-${difficulty}.json`;

            this.load.json('songData', jsonPath);
            
            // Esperar a que se complete la carga del JSON
            await new Promise(resolve => this.load.once('complete', resolve));
            
            const songData = this.cache.json.get('songData');
            if (!songData || !songData.song) {
                throw new Error("Invalid song data");
            }

            // Store song data
            this.songData = songData;

            // Precargar assets de personajes
            await this.preloadCharacterAssets(songData);

            // Inicializar componentes
            const stepCrochet = (60000 / songData.song.bpm) / 4;
            const sectionLength = stepCrochet * 16;
            this.cameraController.initialize(sectionLength);
            
            this.processBPMChanges(songData);
            this.arrowsManager.loadNotes(songData);

            // Limpiar elementos de carga
            if (this.loadingImage) this.loadingImage.destroy();
            if (this.loadBar) this.loadBar.destroy();
            
            this.cameras.main.setBackgroundColor("#000000");
            this.dataManager.showData();
            
            // Cargar personajes
            await this.characters.loadCharacterFromSong(songData);
            
            // Iniciar countdown
            this.countdownManager.start(() => this.startMusic());

        } catch (error) {
            console.error("Error during song loading:", error);
            this.redirectToNextState();
        }
    }

    // Nuevo método para precargar assets de personajes
    async preloadCharacterAssets(songData) {
        if (!songData.song) return;

        const { player1, player2, gfVersion } = songData.song;
        const characterIds = [player1, player2];
        if (gfVersion) characterIds.push(gfVersion);

        this.healthBarColors = {};
        this.healthBarIcons = {};

        const loadPromises = characterIds.map(async (characterId) => {
            try {
                const response = await fetch(`public/assets/data/characters/${characterId}.json`);
                const characterData = await response.json();

                // Cargar el sprite del personaje
                const textureKey = `character_${characterId}`;
                if (!this.textures.exists(textureKey)) {
                    return new Promise((resolve) => {
                        this.load.atlasXML(
                            textureKey,
                            `public/assets/images/${characterData.image}.png`,
                            `public/assets/images/${characterData.image}.xml`
                        );

                        // Cargar el icono de salud al mismo tiempo
                        if (characterData.healthicon) {
                            this.healthBarIcons[characterId] = characterData.healthicon;
                            const iconKey = `icon-${characterData.healthicon}`;
                            
                            if (!this.textures.exists(iconKey)) {
                                this.load.image(
                                    iconKey,
                                    `public/assets/images/characters/icons/icon-${characterData.healthicon}.png`
                                );
                            }
                        }

                        // Cuando se complete la carga
                        this.load.once('complete', () => {
                            // Procesar los colores de la barra de vida
                            if (characterData.healthbar_colors) {
                                const [r, g, b] = characterData.healthbar_colors;
                                const color = (
                                    (Math.min(255, Math.max(0, Math.floor(r))) << 16) |
                                    (Math.min(255, Math.max(0, Math.floor(g))) << 8) |
                                    Math.min(255, Math.max(0, Math.floor(b)))
                                );
                                this.healthBarColors[characterId] = color;
                            }
                            resolve();
                        });

                        this.load.start();
                    });
                }

            } catch (error) {
                console.error(`Error loading character ${characterId}:`, error);
                return Promise.reject(error);
            }
        });

        // Esperar a que se complete toda la carga
        await Promise.all(loadPromises);
    }

    async create() {
        console.log("PlayState iniciado.");
        this.sound.stopAll();
        this.dataManager.setupF3Toggle();
        this.cameras.main.setBackgroundColor("#000000");
        this.dataManager.setStartTime(this.time.now);
        
        // Inicializar NotesController y RatingManager primero
        await this.arrowsManager.init();
        await this.ratingManager.create();
        
        // Crear RatingText después
        this.ratingText = new RatingText(this);

        // Esperar a que los personajes y sus iconos estén cargados
        await this.preloadCharacterAssets(this.songData);

        // Debug después de la carga
        console.log('Post-load check:', {
            songData: this.songData.song,
            player1: this.songData.song.player1,
            player2: this.songData.song.player2,
            icons: this.healthBarIcons,
            colors: this.healthBarColors
        });

        // Verificar que los iconos estén cargados
        const p1Icon = this.healthBarIcons[this.songData.song.player1];
        const p2Icon = this.healthBarIcons[this.songData.song.player2];

        console.log('Verificación de iconos:', {
            p1Icon,
            p2Icon,
            p1IconLoaded: this.textures.exists(`icon-${p1Icon}`),
            p2IconLoaded: this.textures.exists(`icon-${p2Icon}`)
        });

        // Solo crear la barra de vida si tenemos todos los recursos necesarios
        if (p1Icon && p2Icon && 
            this.textures.exists(`icon-${p1Icon}`) && 
            this.textures.exists(`icon-${p2Icon}`)) {
            
            this.healthBar = new HealthBar(this, {
                p1Color: this.healthBarColors[this.songData.song.player1],
                p2Color: this.healthBarColors[this.songData.song.player2],
                p1Icon: p1Icon,
                p2Icon: p2Icon
            });
        } else {
            console.error('Failed to load health icons:', {
                p1Icon,
                p2Icon,
                availableTextures: Object.keys(this.textures.list)
            });
        }
        
        // Configurar los inputs después de que todo esté listo
        this.arrowsManager.setupInputHandlers();

        // Establecer conexión entre RatingManager y NotesController
        this.arrowsManager.ratingManager = this.ratingManager;

        // Conectar la barra de vida con el NotesController
        this.arrowsManager.scene = this;

        console.log('Components initialized:', {
            arrowsManager: !!this.arrowsManager,
            ratingManager: {
                initialized: !!this.ratingManager,
                hasEvents: !!this.ratingManager?.events,
                score: this.ratingManager?.score,
                combo: this.ratingManager?.combo
            },
            ratingText: {
                initialized: !!this.ratingText,
                hasRatingManager: !!this.ratingText?.ratingManager
            }
        });
    }

    update() {
        if (this.isMusicPlaying && this.currentInst) {
            this.songPosition = this.currentInst.seek * 1000;
            
            // Check for BPM changes
            this.bpmChangePoints.forEach(change => {
                if (this.songPosition >= change.time && this.currentBPM !== change.bpm) {
                    this.currentBPM = change.bpm;
                    // Actualizar BPM en el controlador de cámara
                    this.cameraController.updateBPM(this.currentBPM);
                    // Update scroll speed based on new BPM
                    if (this.arrowsManager) {
                        this.arrowsManager.updateScrollSpeed(this.currentBPM);
                    }
                }
            });
            
            this.arrowsManager.update(this.songPosition);
            this.arrowsManager.updateEnemyNotes(this.songPosition);

            // Actualizar la cámara
            this.cameraController.update(this.songPosition);
        }

        if (this.dataManager.isDataVisible) {
            this.dataManager.updateData();
        }
        
        if (this.ratingText) {
            this.ratingText.updateTexts();
        }
    }

    async startMusic() {
        const currentSong = this.dataManager.songList[this.dataManager.currentSongIndex];
        const audioInstances = this.audioManager.playSongAudio(currentSong);
    
        this.isMusicPlaying = true;
        this.cameraController.startBoping(); // Iniciar el bop de la cámara
        
        // Guardar referencias a ambas pistas
        this.currentInst = audioInstances.inst;
        this.currentVoices = audioInstances.voices;
    
        // Configurar evento de finalización
        this.currentInst.once('complete', async () => {
            this.isMusicPlaying = false;
            
            // Detener todo el audio y limpiar
            if (this.currentVoices) {
                this.currentVoices.stop();
            }
            this.currentInst.stop();
            
            this.dataManager.currentSongIndex++;
            
            if (this.dataManager.currentSongIndex < this.dataManager.songList.length) {
                // Limpiar completamente la escena actual
                await this.cleanupBeforeRestart();
                
                // Reiniciar la escena con un pequeño delay
                this.time.delayedCall(100, () => {
                    this.scene.restart(this.dataManager.getSceneData());
                });
            } else {
                this.playFreakyMenuAndRedirect();
            }
        });
    
        console.log("Reproduciendo canción:", currentSong);
    }

    async cleanupBeforeRestart() {
        return new Promise(async (resolve) => {
            // Detener toda la música
            this.sound.stopAll();
            
            // Limpiar NotesController
            if (this.arrowsManager) {
                this.arrowsManager.cleanup();
            }
            
            // Limpiar caché
            if (this.cache.json.exists('songData')) {
                this.cache.json.remove('songData');
            }

            // Limpiar texturas de iconos de salud
            if (this.healthBarIcons) {
                Object.values(this.healthBarIcons).forEach(iconName => {
                    const iconKey = `icon-${iconName}`;
                    if (this.textures.exists(iconKey)) {
                        this.textures.remove(iconKey);
                    }
                });
            }
            
            // Limpiar referencias de la barra de salud
            this.healthBarColors = {};
            this.healthBarIcons = {};
            
            if (this.healthBar) {
                this.healthBar.destroy();
                this.healthBar = null;
            }
            
            // Resetear variables
            this.songPosition = 0;
            this.isMusicPlaying = false;
            
            // Limpiar referencias de audio
            this.currentInst = null;
            this.currentVoices = null;
            
            // Destruir todos los objetos excepto hitbox
            this.children.list.slice().forEach(child => {
                if (!(child.texture && child.texture.key === 'hitbox')) {
                    child.destroy();
                }
            });

            // Resetear controladores
            if (this.cameraController) {
                this.cameraController.reset();
            }

            // Limpiar referencias
            this.songData = null;
            
            if (this.ratingText) {
                this.ratingText.destroy();
                this.ratingText = null;
            }
            
            // Esperar un frame para asegurar que todo se limpie
            await new Promise(resolve => this.time.delayedCall(16, resolve));
            
            resolve();
        });
    }

    playFreakyMenuAndRedirect() {
        if (!this.sound.get('freakyMenu')) {
            const freakyMenu = this.sound.add('freakyMenu', { loop: true });
            freakyMenu.play();
        }

        this.redirectToNextState();
    }

    redirectToNextState() {
        const target = this.dataManager.isStoryMode ? "StoryModeState" : "FreeplayState";
        this.scene.start(target);
    }
    
    // Add a shutdown method to ensure proper cleanup when the scene is stopped
    shutdown() {
        this.cleanupBeforeRestart().then(() => {
            this.audioManager = null;
            this.dataManager = null;
            this.arrowsManager = null;
            this.countdownManager = null;
            this.characters = null;
            this.cameraController = null;
            
            super.shutdown();
        });
    }

    // Add this method to process BPM changes
    processBPMChanges(songData) {
        this.currentBPM = songData.bpm || 100;
        this.bpmChangePoints = [];
        
        // Process BPM changes if they exist
        if (songData.notes) {
            songData.notes.forEach((section, index) => {
                if (section.bpm && section.bpm !== this.currentBPM) {
                    this.bpmChangePoints.push({
                        time: section.sectionBeats * (60000 / this.currentBPM) * index,
                        bpm: section.bpm
                    });
                }
            });
        }
    }

    // In the keydown handler or note hit function:
    handleNoteHit(direction) {
        switch(direction) {
            case 0: // LEFT
                this.characters.playAnimation('bf', 'singLEFT');
                break;
            case 1: // DOWN
                this.characters.playAnimation('bf', 'singDOWN');
                break;
            case 2: // UP
                this.characters.playAnimation('bf', 'singUP');
                break;
            case 3: // RIGHT
                this.characters.playAnimation('bf', 'singRIGHT');
                break;
        }
    }
}

// Mantén esta línea si es necesaria para compatibilidad
globalThis.PlayState = PlayState;