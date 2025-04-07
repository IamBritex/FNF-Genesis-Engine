import { AudioManager } from '../gameplay/AudioManager.js';
import { DataManager } from '../gameplay/DataManager.js';
import { NotesController } from '../gameplay/NotesController.js';
import { CountdownManager } from '../gameplay/CountdownManager.js'
import { RatingManager } from '../gameplay/RatingManager.js';
import { Characters } from '../gameplay/utils/Characters.js';
import { CameraController } from '../gameplay/utils/Camera.js';

class PlayState extends Phaser.Scene {
    constructor() {
        super({ key: "PlayState" });
        this.songPosition = 0;
        this.isMusicPlaying = false;
        this.currentBPM = 0;
        this.bpmChangePoints = [];
        this.characters = null;
        this.cameraController = null;
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
        this.load.atlasXML('notes', 'public/assets/images/states/PlayState/notes.png', 'public/assets/images/states/PlayState/notes.xml');
        this.load.atlasXML('noteStrumline', 'public/assets/images/states/PlayState/noteStrumline.png', 'public/assets/images/states/PlayState/noteStrumline.xml');
        this.load.atlasXML('NOTE_hold_assets', 'public/assets/images/states/PlayState/NOTE_hold_assets.png', 'public/assets/images/states/PlayState/NOTE_hold_assets.xml');
        this.load.image('funkay', 'public/assets/images/funkay.png');
        this.load.audio('freakyMenu', 'public/assets/sounds/FreakyMenu.mp3');
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
    }

    async loadCurrentAndNextSong() {
        const currentSong = this.dataManager.songList[this.dataManager.currentSongIndex];
        if (typeof currentSong !== 'string') {
            console.error("La canción actual no es válida.");
            this.redirectToNextState();
            return;
        }

        await this.audioManager.loadSongAudio(currentSong);

        const difficulty = this.dataManager.selectedDifficulty;
        const jsonPath = difficulty === 'normal' ? 
            `public/assets/data/data/${currentSong}/${currentSong}.json` :
            `public/assets/data/data/${currentSong}/${currentSong}-${difficulty}.json`;

        this.load.json('songData', jsonPath);
        this.load.start();

        this.load.once('complete', async () => {
            const songData = this.cache.json.get('songData');
            
            if (!songData || !songData.song) {
                console.error("Error: Invalid song data");
                this.redirectToNextState();
                return;
            }

            // Store song data
            this.songData = songData;
            
            // Update camera section length based on actual BPM
            const stepCrochet = (60000 / songData.song.bpm) / 4;
            const sectionLength = stepCrochet * 16;
            this.cameraController.initialize(sectionLength);
            
            this.processBPMChanges(songData);
            this.arrowsManager.loadNotes(songData);

            // Precargar assets de personajes antes de continuar
            if (songData.song) {
                const { player1, player2, gfVersion } = songData.song;
                
                // Cargar JSONs de personajes
                const characterPromises = [
                    fetch(`public/assets/data/characters/${player1}.json`).then(r => r.json()),
                    fetch(`public/assets/data/characters/${player2}.json`).then(r => r.json())
                ];

                // Añadir GF si está especificada
                if (gfVersion) {
                    characterPromises.push(
                        fetch(`public/assets/data/characters/${gfVersion}.json`).then(r => r.json())
                    );
                }

                try {
                    const characterData = await Promise.all(characterPromises);
                    
                    // Cargar texturas de personajes
                    const loadTexture = (characterId, data) => {
                        const baseImagePath = `public/assets/images/${data.image}`;
                        const textureKey = `character_${characterId}`;
                        this.load.atlasXML(
                            textureKey,
                            `${baseImagePath}.png`,
                            `${baseImagePath}.xml`
                        );
                    };

                    loadTexture(player1, characterData[0]);
                    loadTexture(player2, characterData[1]);
                    if (gfVersion) {
                        loadTexture(gfVersion, characterData[2]);
                    }

                    // Iniciar la carga de texturas
                    await new Promise(resolve => {
                        this.load.once('complete', resolve);
                        this.load.start();
                    });
                } catch (error) {
                    console.error("Error loading character assets:", error);
                }
            }

            // Guardar una referencia global para debugging
            window.currentSongData = songData;
            
            this.loadingImage.destroy();
            this.loadBar.destroy();
            this.cameras.main.setBackgroundColor("#000000");
            this.dataManager.showData();
            
            // Ahora llamamos a loadCharacterFromSong que ya no necesita cargar assets
            this.characters.loadCharacterFromSong(songData).then(() => {
                this.countdownManager.start(() => this.startMusic());
            });
        });
    }

    create() {
        console.log("PlayState iniciado.");
        this.sound.stopAll();
        this.dataManager.setupF3Toggle();
        this.cameras.main.setBackgroundColor("#000000");
        this.dataManager.setStartTime(this.time.now);
        
        // Initialize camera with default values first
        this.cameraController.initialize(1600); // Default section length for 100 BPM
        
        // Set depth for different elements
        this.arrowsManager.createPlayerArrows();
        this.arrowsManager.createEnemyArrows();
        
        // Set depth for notes to be above strums
        this.children.list.forEach(child => {
            if (child.texture && child.texture.key === 'notes') {
                child.setDepth(15); // Notes above strums
            }
            if (child.texture && child.texture.key === 'noteStrumline') {
                child.setDepth(10); // Strums above characters
            }
        });

        // Initialize Android hitbox if needed
        if (this.game.device.os.android && !this.hitboxInitialized) {
            hitboxAndroid.initialize(this);
            this.hitboxInitialized = true;
        }
        
        this.ratingManager.create();

        // Initialize controllers
        this.notesController = new NotesController(this);
        this.countdownManager = new CountdownManager(this, this.notesController);
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
    }

    startMusic() {
        const currentSong = this.dataManager.songList[this.dataManager.currentSongIndex];
        const audioInstances = this.audioManager.playSongAudio(currentSong);
    
        this.isMusicPlaying = true;
        this.cameraController.startBoping(); // Iniciar el bop de la cámara
        
        // Guardar referencias a ambas pistas
        this.currentInst = audioInstances.inst;
        this.currentVoices = audioInstances.voices;
    
        // Configurar evento de finalización
        this.currentInst.once('complete', () => {
            this.isMusicPlaying = false;
            if (this.currentVoices) {
                this.currentVoices.stop();
            }
            this.dataManager.currentSongIndex++;
            if (this.dataManager.currentSongIndex < this.dataManager.songList.length) {
                // Clean up before restarting
                this.cleanupBeforeRestart();
                this.scene.restart(this.dataManager.getSceneData());
            } else {
                this.playFreakyMenuAndRedirect();
            }
        });
    
        console.log("Reproduciendo canción:", currentSong);
    }

    // New method to clean up resources before restarting
    cleanupBeforeRestart() {
        this.sound.stopAll();
        
        // Clean up ArrowsManager resources
        if (this.arrowsManager) {
            this.arrowsManager.cleanup();
        }
        
        if (this.cache.json.exists('songData')) {
            this.cache.json.remove('songData');
        }
        
        // Reset song position and music playing flag
        this.songPosition = 0;
        this.isMusicPlaying = false;
        
        if (this.currentInst) {
            this.currentInst.stop();
        }
        if (this.currentVoices) {
            this.currentVoices.stop();
        }
        this.currentInst = null;
        this.currentVoices = null;
        
        // Do NOT destroy hitboxAndroid
        // Remove everything except hitboxAndroid
        this.children.list.forEach(child => {
            if (!(child.texture && child.texture.key === 'hitbox')) {
                child.destroy();
            }
        });

        if (this.cameraController) {
            this.cameraController.reset();
            this.cameraController.initialize(1600); // Reset to default section length
        }

        this.songData = null;
    }

    playFreakyMenuAndRedirect() {
        if (!this.sound.get('freakyMenu')) {
            const freakyMenu = this.sound.add('freakyMenu', { loop: true });
            freakyMenu.play();
        }

        this.redirectToNextState();
    }

    redirectToNextState() {
        const target = this.dataManager.isStoryMode ? "StoryModeState" : "FreePlayState";
        this.scene.start(target);
    }
    
    // Add a shutdown method to ensure proper cleanup when the scene is stopped
    shutdown() {
        this.cleanupBeforeRestart();
        
        this.audioManager = null;
        this.dataManager = null;
        this.arrowsManager = null;
        this.countdownManager = null;
        
        super.shutdown();
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

globalThis.PlayState = PlayState;