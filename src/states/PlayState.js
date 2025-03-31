import { AudioManager } from '../gameplay/AudioManager.js';
import { DataManager } from '../gameplay/DataManager.js';
import { NotesController } from '../gameplay/NotesController.js';
import { CountdownManager } from '../gameplay/CountdownManager.js'
import { RatingManager } from '../gameplay/RatingManager.js';

class PlayState extends Phaser.Scene {
    constructor() {
        super({ key: "PlayState" });
        this.songPosition = 0;
        this.isMusicPlaying = false;
    }

    init(data) {
        // Create new instances of managers on each scene initialization
        // This ensures clean state for each song
        this.audioManager = new AudioManager(this);
        this.dataManager = new DataManager(this);
        this.arrowsManager = new NotesController(this);
        this.countdownManager = new CountdownManager(this);
        this.ratingManager = new RatingManager(this)
        
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

        this.load.once('complete', () => {
            // Obtener los datos de la canción
            const songData = this.cache.json.get('songData');
            console.log("songData:", songData);

            if (!songData) {
                console.error("Error: No se pudo cargar el JSON de la canción.");
                return;
            }

            // Guardar una referencia global para debugging
            window.currentSongData = songData;
            
            // IMPORTANTE: Guardar una copia en la escena
            this.songData = songData;
            
            // Pasar directamente el objeto songData al NotesController
            this.arrowsManager.loadNotes(songData);

            this.loadingImage.destroy();
            this.loadBar.destroy();
            this.cameras.main.setBackgroundColor("#000000");
            this.dataManager.showData();
            
            // Iniciar el conteo regresivo usando el CountdownManager
            this.countdownManager.start(() => this.startMusic());
        });
    }

    create() {
        console.log("PlayState iniciado.");
        this.sound.stopAll();
        this.dataManager.setupF3Toggle();
        this.cameras.main.setBackgroundColor("#000000");
        this.dataManager.setStartTime(this.time.now);

        this.arrowsManager.createPlayerArrows();
        this.arrowsManager.createEnemyArrows();
        // En la escena de creación
        this.ratingManager.create();
    }

    update(time, delta) {
        if (this.isMusicPlaying && this.currentInst) {
            // Obtener el tiempo exacto de la canción en milisegundos
            this.songPosition = this.currentInst.seek * 1000;
            this.arrowsManager.update(this.songPosition);
        }

        if (this.dataManager.isDataVisible) {
            this.dataManager.updateData();
        }
    }

    startMusic() {
        const currentSong = this.dataManager.songList[this.dataManager.currentSongIndex];
        const audioInstances = this.audioManager.playSongAudio(currentSong);
    
        this.isMusicPlaying = true;
        
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
        // Stop all sounds
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
        
        this.children.removeAll();
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
}

globalThis.PlayState = PlayState;