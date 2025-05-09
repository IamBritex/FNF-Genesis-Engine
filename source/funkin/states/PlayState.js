import { LoadingScreen } from '../visuals/objects/Loading.js';
import { AudioManager } from '../visuals/objects/AudioManager.js';
import { DataManager } from '../visuals/objects/DataManager.js';
import { NotesController } from '../visuals/objects/NotesController.js';
import { CountdownManager } from '../visuals/objects/CountdownManager.js';
import { RatingManager } from '../visuals/objects/RatingManager.js';
import { Characters } from '../visuals/objects/Characters.js';
import { CameraController } from '../visuals/objects/Camera.js';
import { RatingText } from '../visuals/objects/RatingText.js';
import { HealthBar } from '../visuals/objects/HealthBar.js';
import { StageManager } from '../visuals/objects/StageManager.js';
import { TimeBar } from '../visuals/objects/TimeBar.js';
import { Paths } from '../../utils/Paths.js';

export class PlayState extends Phaser.Scene {
    constructor() {
        super({ key: "PlayState" });
        this._initProperties();
        this.loadingScreen = new LoadingScreen(this);
    }

    _initProperties() {
        // Pantalla de carga
        this._loadingDots = 0;
        this._loadingText = null;
        this._loadingAnim = null;
        this._isCreating = false;

        // Estado del juego
        this.songPosition = 0;
        this.isMusicPlaying = false;
        this.lastBeat = -1;
        
        // Datos de la canción
        this.songData = null;
        this.currentBPM = 0;
        this.bpmChangePoints = [];
        
        // Instancias de audio
        this.currentInst = null;
        this.currentVoices = null;
        
        // Componentes del juego
        this.audioManager = null;
        this.dataManager = null;
        this.arrowsManager = null;
        this.countdownManager = null;
        this.ratingManager = null;
        this.characters = null;
        this.stageManager = null;
        this.cameraController = null;
        this.ratingText = null;
        this.healthBar = null;
        
        // UI y assets
        this.healthBarIcons = {};
        this.healthBarColors = {};
        this.loadingImage = null;
        this.loadBar = null;
        this.timeBar = null;
    }

    init(data) {
        this._initializeManagers();
        this._resetGameState();
        this.dataManager.init(data);
        this._clearSongCache();
    }

    _initializeManagers() {
        this.audioManager = new AudioManager(this);
        this.dataManager = new DataManager(this);
        this.arrowsManager = new NotesController(this);
        this.countdownManager = new CountdownManager(this);
        this.ratingManager = new RatingManager(this);
        this.characters = new Characters(this);
        this.stageManager = new StageManager(this);
    }

    _resetGameState() {
        this.songPosition = 0;
        this.isMusicPlaying = false;
        this.lastBeat = -1;
        this.currentInst = null;
        this.currentVoices = null;
        this.currentBPM = 0;
        this.bpmChangePoints = [];
    }

    _clearSongCache() {
        if (this.cache.json.exists('songData')) {
            this.cache.json.remove('songData');
        }
    }

    preload() {
        this.load.reset();
        this._loadCoreAssets();
        this.countdownManager.preload();
        this._loadSongData();
    }

    _loadCoreAssets() {
        // Assets de UI
        this.load.image('healthBar', Paths.HEALTH_BAR);
        this.load.image('funkay', Paths.FUNKAY);
        this.load.image('timeBar', Paths.TIME_BAR);
        
        // Sonidos
        this.load.audio('missnote1', Paths.MISS_NOTE_1);
        this.load.audio('missnote2', Paths.MISS_NOTE_2);
        this.load.audio('missnote3', Paths.MISS_NOTE_3);
        this.load.audio('freakyMenu', Paths.FREAKY_MENU);
        
        // Assets de notas
        this.load.atlasXML('notes', Paths.NOTES.TEXTURE, Paths.NOTES.ATLAS);
        this.load.atlasXML('noteStrumline', Paths.NOTE_STRUMLINE.TEXTURE, Paths.NOTE_STRUMLINE.ATLAS);
        this.load.atlasXML('NOTE_hold_assets', Paths.NOTE_HOLD_ASSETS.TEXTURE, Paths.NOTE_HOLD_ASSETS.ATLAS);
    }

    _loadSongData() {
        if (this.dataManager.songList?.length > 0) {
            this.loadCurrentAndNextSong();
        } else {
            console.error("No hay canciones para cargar.");
            this.redirectToNextState();
        }
    }

    async loadCurrentAndNextSong() {
        try {
            const currentSong = this._getCurrentSong();
            await this._loadSongChart(currentSong);
            await this._loadSongAssets(currentSong);
            this._initializeSongComponents();
            this._completeLoading();
        } catch (error) {
            console.error('Error cargando la canción:', error);
            this.redirectToNextState();
        }
    }

    _getCurrentSong() {
        const currentSong = this.dataManager.songList[this.dataManager.currentSongIndex];
        if (!currentSong) throw new Error('No hay canción actual');
        return currentSong;
    }

    async _loadSongChart(currentSong) {
        const difficulty = this.dataManager.storyDifficulty || 'normal';
        
        try {
            const response = await fetch(Paths.getSongChart(currentSong, difficulty));
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            this.songData = await response.json();
        } catch (e) {
            console.warn('Usando chart por defecto debido a:', e);
            const response = await fetch(Paths.getDefaultSongChart(currentSong));
            this.songData = await response.json();
        }

        if (!this.songData?.song) throw new Error('Datos de canción inválidos');
    }

    async _loadSongAssets(currentSong) {
        await this.audioManager.loadSongAudio(currentSong);
        await this.preloadCharacterAssets(this.songData);
    }

    _initializeSongComponents() {
        if (!this.songData?.song) return;
        
        this.cameraController.updateBPM(this.songData.song.bpm);
        this.processBPMChanges(this.songData);
        this.arrowsManager.loadNotes(this.songData);
    }

    _completeLoading() {
        this._safeDestroy(this.loadingImage);
        this._safeDestroy(this.loadBar);
        
        this.cameras.main.setBackgroundColor("#000000");
        this.dataManager.showData();
    }

    async preloadCharacterAssets(songData) {
        if (!songData?.song) {
            console.error('Datos de canción inválidos:', songData);
            return;
        }

        const characterIds = this._getCharacterIds(songData);
        await this._loadCharactersData(characterIds);
    }

    _getCharacterIds(songData) {
        const { player1, player2, gfVersion } = songData.song;
        const characterIds = [player1, player2];
        if (gfVersion) characterIds.push(gfVersion);
        return characterIds.filter(Boolean);
    }

    async _loadCharactersData(characterIds) {
        const loadPromises = characterIds.map(characterId => 
            this._loadSingleCharacter(characterId)
        );
        await Promise.all(loadPromises);
    }

    async _loadSingleCharacter(characterId) {
        try {
            if (this.healthBarColors[characterId] && this.healthBarIcons[characterId]) {
                return;
            }

            const response = await fetch(Paths.getCharacterData(characterId));
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const characterData = await response.json();

            this._processCharacterHealthData(characterId, characterData);
            await this._loadCharacterTextures(characterId, characterData);
        } catch (error) {
            console.error(`Error loading character ${characterId}:`, error);
            throw error;
        }
    }

    _processCharacterHealthData(characterId, characterData) {
        if (characterData.healthbar_colors) {
            const [r, g, b] = characterData.healthbar_colors;
            const color = (
                (Math.min(255, Math.floor(r)) << 16) |
                (Math.min(255, Math.floor(g)) << 8 | Math.min(255, Math.floor(b))
            ));
            this.healthBarColors[characterId] = color;
        }

        if (characterData.healthicon) {
            this.healthBarIcons[characterId] = characterData.healthicon;
        }
    }

    async _loadCharacterTextures(characterId, characterData) {
        const textureKey = `character_${characterId}`;
        if (this.textures.exists(textureKey)) return;

        const sprites = Paths.getCharacterSprites(characterData);
        return new Promise((resolve) => {
            this.load.atlasXML(
                textureKey,
                sprites.TEXTURE,
                sprites.ATLAS
            );
            this.load.once('complete', resolve);
            this.load.start();
        });
    }

    async preloadHealthIcons() {
        if (!this.healthBarIcons || !this.songData?.song) {
            console.error('No hay datos de iconos o canción para cargar');
            return;
        }

        const { player1, player2 } = this.songData.song;
        await this._loadHealthIcons([player1, player2]);
    }

    async _loadHealthIcons(characterIds) {
        const iconLoadPromises = characterIds.map(characterId => {
            const iconName = this.healthBarIcons[characterId];
            if (!iconName) return Promise.resolve();

            const iconKey = `icon-${iconName}`;
            if (this.textures.exists(iconKey)) {
                this.textures.remove(iconKey);
            }

            return new Promise((resolve) => {
                this.load.image(iconKey, Paths.getCharacterIcon(iconName));
                this.load.once('complete', () => resolve());
                this.load.once('loaderror', () => resolve());
                this.load.start();
            });
        });

        await Promise.all(iconLoadPromises);
    }

    async createHealthBar() {
        const { player1, player2 } = this.songData.song;
        const p1Icon = this.healthBarIcons[player1];
        const p2Icon = this.healthBarIcons[player2];

        if (!p1Icon || !p2Icon || 
            !this.textures.exists(`icon-${p1Icon}`) || 
            !this.textures.exists(`icon-${p2Icon}`)) {
            console.error('Error creando HealthBar:', { p1Icon, p2Icon });
            return;
        }

        this.healthBar = new HealthBar(this, {
            p1Color: this.healthBarColors[player1],
            p2Color: this.healthBarColors[player2],
            p1Icon: p1Icon,
            p2Icon: p2Icon
        });
    }

    async create() {
        console.log("PlayState iniciado.");
        this._setupInitialState();
        this.loadingScreen.setup();
        
        try {
            await this._initializeGameComponents();
            this.loadingScreen.setCreatingMode(true);
            this.loadingScreen.setCurrentItem("Game Elements");
            this._setupGameElements();
            this.loadingScreen.setCurrentItem("User UI");
            this._setupUICameraElements();
            this.loadingScreen.setCurrentItem("Controls");
            this._setupInputHandlers();
            this.loadingScreen.setCurrentItem("Preparing Game");
            this._startCountdown();
            this.events.emit('createcomplete');
        } catch (error) {
            console.error('Error en create():', error);
            this.redirectToNextState();
        }
    }

    _setupInitialState() {
        this.sound.stopAll();
        this.dataManager.setupF3Toggle();
        this.dataManager.setStartTime(this.time.now);
        
        this.cameraController = new CameraController(this);
        this.cameras.main.visible = false;
    }

    async _initializeGameComponents() {
        await this.loadCurrentAndNextSong();
        
        if (!this.songData?.song) {
            throw new Error('Datos de canción no disponibles');
        }

        if (this.songData.song.stage) {
            await this.stageManager.loadStage(this.songData.song.stage);
        }

        await this.characters.loadCharacterFromSong(this.songData);
        await this.arrowsManager.init();
        await this.ratingManager.create();
        
        this.ratingText = new RatingText(this);
        await this.preloadHealthIcons();
        await this.createHealthBar();
    }

    _setupGameElements() {
        this.cameraController.addToGameCamera(this.stageManager?.container);
        this.cameraController.addToGameCamera(this.characters?.container);
    }

    _setupUICameraElements() {
        const uiElements = [
            this.ratingText,
            this.healthBar?.background,
            this.healthBar?.foreground,
            this.healthBar?.iconP1,
            this.healthBar?.iconP2,
            ...(this.arrowsManager.uiElements || [])
        ].filter(Boolean);
        
        uiElements.forEach(element => {
            this.cameraController.addToUICamera(element);
        });
    }

    _setupInputHandlers() {
        this.arrowsManager.setupInputHandlers();
        this.arrowsManager.ratingManager = this.ratingManager;
    }

    _startCountdown() {
        this.countdownManager.start(() => this.startMusic());
    }

    update(time, delta) {
        if (!this.isMusicPlaying || !this.currentInst) return;
        if (this.timeBar && this.currentInst) {this.timeBar.update(this.songPosition);}

        this._updateSongPosition(delta);
        this._updateGameComponents(time, delta);
        this._updateBeatDetection();
        this._updateBPMChanges();
        this._updateUI();
    }

    _updateSongPosition(delta) {
        this.songPosition = this.currentInst.seek * 1000;
    }

    _updateGameComponents(time, delta) {
        const elapsed = delta / 1000;
        
        this.stageManager?.update(time, delta);
        
        if (this.characters) {
            this.characters.update(elapsed);
        }
        
        this.cameraController.update(this.songPosition, time, delta);
        this.healthBar?.updateBeatBounce(this.songPosition, time, delta);
        this.arrowsManager?.update(this.songPosition);
        this.arrowsManager?.updateEnemyNotes(this.songPosition);
    }

    _updateBeatDetection() {
        const beatTime = (60000 / (this.songData.song.bpm || 100));
        const currentBeat = Math.floor(this.songPosition / beatTime);
        
        if (currentBeat > this.lastBeat) {
            this.characters?.onBeat(currentBeat);
            this.lastBeat = currentBeat;
        }
    }

    _updateBPMChanges() {
        this.bpmChangePoints.forEach(change => {
            if (this.songPosition >= change.time && this.currentBPM !== change.bpm) {
                this.currentBPM = change.bpm;
                this.cameraController.updateBPM(this.currentBPM);
                this.arrowsManager?.updateScrollSpeed(this.currentBPM);
            }
        });
    }

    _updateUI() {
        if (this.dataManager.isDataVisible) {
            this.dataManager.updateData();
        }
        
        this.ratingText?.updateTexts();
    }

    async startMusic() {
        const currentSong = this.dataManager.songList[this.dataManager.currentSongIndex];
        const audioInstances = this.audioManager.playSongAudio(currentSong);
    
        this.isMusicPlaying = true;
        this.cameraController.startBoping();
        
        this.currentInst = audioInstances.inst;
        this.currentVoices = audioInstances.voices;

        this.timeBar = new TimeBar(this);
        this.timeBar.create();
        this.timeBar.setTotalDuration(this.currentInst.duration * 1000);
    
        this.currentInst.once('complete', async () => {
            await this._handleSongCompletion();
        });
    }

    async _handleSongCompletion() {
        this.isMusicPlaying = false;
        
        this._safeStopAudio(this.currentVoices);
        this._safeStopAudio(this.currentInst);
        
        this.dataManager.currentSongIndex++;
        
        if (this.dataManager.currentSongIndex < this.dataManager.songList.length) {
            await this.cleanupBeforeRestart();
            this.time.delayedCall(100, () => {
                this.scene.restart(this.dataManager.getSceneData());
            });
        } else {
            this.playFreakyMenuAndRedirect();
        }
    }

    async cleanupBeforeRestart() {
        // 1. Detener todos los sonidos primero
        this.sound.stopAll();
        
        // 2. Limpiar componentes del juego
        if (this.arrowsManager?.cleanup) {
            await this.arrowsManager.cleanup();
        }
        
        if (this.stageManager?.clearCurrentStage) {
            await this.stageManager.clearCurrentStage();
        }
        
        if (this.characters?.cleanup) {
            await this.characters.cleanup();
        }

        // 3. Limpiar texturas y assets
        await this._cleanupCharacterTextures();
        await this._cleanupHealthIcons();
        
        // 4. Resetear datos de UI
        this._resetHealthBarData();
        this._destroyUIElements();
        
        // 5. Resetear estado del juego
        this._resetGameState();
        
        // 6. Limpiar cámara
        if (this.cameraController?.reset) {
            this.cameraController.reset();
        }
        
        // 7. Limpiar timeBar
        this._safeDestroy(this.timeBar);
        this.timeBar = null;
        
        // 8. Limpiar cache y datos
        this._clearSongCache();
        this.songData = null;
        
        // 9. Pequeña pausa para asegurar limpieza
        await new Promise(resolve => this.time.delayedCall(50, resolve));
    }

    async _cleanupCharacterTextures() {
        if (!this.songData?.song) return;

        const { player1, player2, gfVersion } = this.songData.song;
        const characters = [player1, player2, gfVersion].filter(Boolean);
        
        // Limpiar sprites primero
        this.children.each(child => {
            if (child.texture && characters.some(id => 
                child.texture.key === `character_${id}` ||
                child.texture.key === `icon-${this.healthBarIcons[id]}`
            )) {
                this._safeDestroy(child);
            }
        });
        
        // Luego limpiar texturas
        for (const characterId of characters) {
            const textureKey = `character_${characterId}`;
            if (this.textures.exists(textureKey)) {
                this.textures.remove(textureKey);
            }
        }
    }

    async _cleanupHealthIcons() {
        if (!this.healthBarIcons) return;
        
        // Limpiar sprites de iconos primero
        this.children.each(child => {
            if (child.texture && child.texture.key.startsWith('icon-')) {
                this._safeDestroy(child);
            }
        });
        
        // Luego limpiar texturas
        for (const iconName of Object.values(this.healthBarIcons)) {
            if (!iconName) continue;
            
            const iconKey = `icon-${iconName}`;
            if (this.textures.exists(iconKey)) {
                this.textures.remove(iconKey);
            }
        }
    }

    _destroyUIElements() {
        // Destruir elementos UI específicos
        this._safeDestroy(this.ratingText);
        this.ratingText = null;
        
        this._safeDestroy(this.healthBar);
        this.healthBar = null;
        
        // Destruir otros elementos UI
        this.children.each(child => {
            // Conservar solo elementos esenciales
            if (!child.texture?.key?.includes('hitbox') && 
                child !== this.loadingScreen) {
                this._safeDestroy(child);
            }
        });
    }

    _resetHealthBarData() {
        this.healthBarColors = {};
        this.healthBarIcons = {};
    }

    playFreakyMenuAndRedirect() {
        if (!this.sound.get('freakyMenu')) {
            this.sound.add('freakyMenu', { loop: true }).play();
        }
        this.redirectToNextState();
    }

    redirectToNextState() {
        const target = this.dataManager.isStoryMode ? "StoryModeState" : "FreeplayState";
        this.scene.start(target);
    }
    
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

    processBPMChanges(songData) {
        this.currentBPM = songData.song?.bpm || 100;
        this.bpmChangePoints = [];
        
        if (!songData.song?.notes) return;

        songData.song.notes.forEach((section, index) => {
            if (section.bpm && section.bpm !== this.currentBPM) {
                this.bpmChangePoints.push({
                    time: section.sectionBeats * (60000 / this.currentBPM) * index,
                    bpm: section.bpm
                });
            }
        });
    }

    handleNoteHit(direction) {
        const animations = {
            0: 'singLEFT',
            1: 'singDOWN',
            2: 'singUP',
            3: 'singRIGHT'
        };
        
        this.characters?.playAnimation('bf', animations[direction]);
    }

    _safeDestroy(object) {
        if (object && typeof object.destroy === 'function') {
            try {
                // Asegurarse de remover listeners primero
                if (object.removeAllListeners) {
                    object.removeAllListeners();
                }
                object.destroy();
            } catch (e) {
                console.warn('Error al destruir objeto:', object, e);
            }
        }
    }

    _safeStopAudio(audio) {
        if (audio) {
            try {
                if (audio.stop) audio.stop();
                if (audio.destroy) audio.destroy();
            } catch (e) {
                console.warn('Error al detener audio:', e);
            }
        }
    }
}

globalThis.PlayState = PlayState;