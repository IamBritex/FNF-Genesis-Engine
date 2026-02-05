import { ChartDataHandler } from '../../data/chartData.js';
import ModHandler from '../../../../core/ModHandler.js';
import { Conductor } from '../../data/Conductor.js';
import { ScriptHandler } from '../../scripting/ScriptHandler.js';
import { NoteSkin } from '../../notes/NoteSkin.js';
import { HealthBar } from '../../health/healthBar.js';
import { Stage } from '../../stage/Stage.js';
import { Characters } from '../../characters/Characters.js';
import { SongPlayer } from '../../song/SongPlayer.js';
import { NotesHandler } from '../../notes/NotesHandler.js';
import { RatingText } from '../../judgments/RatingText.js';
import { PlayEvents } from '../../PlayEvents.js'; 

export class PlaySceneLoad {
    constructor(scene) {
        this.scene = scene;
        this.isAborted = false; 
        
        this._onBlurHandler = null; // Guardar referencia para limpiar

        this.scene.events.once('shutdown', this.stop, this);
        this.scene.events.once('destroy', this.stop, this);
    }

    stop() {
        this.isAborted = true;
        // Limpiar listener global de blur si existe
        if (this._onBlurHandler && this.scene && this.scene.game) {
            this.scene.game.events.off('blur', this._onBlurHandler);
            this._onBlurHandler = null;
        }
    }

    async processChartAndEvents() {
        if (this._shouldAbort()) return;
        await this._yieldToMainThread();
        if (this._shouldAbort()) return;

        this.scene.chartData = ChartDataHandler.processChartData(
            this.scene,
            this.scene.initData.targetSongId,
            this.scene.initData.DifficultyID || "normal"
        );

        if (!this.scene.chartData) {
            this.scene.events.emit(window.PlayEvents.EXIT_TO_MENU);
            return;
        }

        if (this.scene.chartData.events === true) {
            await this._loadChartEvents();
        } else {
            this.scene.chartData.events = [];
            this.continueCreate();
        }
    }

    async _loadChartEvents() {
        const songId = this.scene.initData.targetSongId;
        const eventsKey = `Events_${songId}`;
        let eventsPath = await ModHandler.getPath('songs', `${songId}/charts/Events.json`);

        if (this._shouldAbort()) return;

        if (eventsPath && typeof eventsPath !== 'string') {
            if (eventsPath instanceof Blob || eventsPath instanceof File) {
                eventsPath = URL.createObjectURL(eventsPath);
            }
        }

        if (typeof eventsPath === 'string') {
            await new Promise((resolve) => {
                if (this._shouldAbort()) { resolve(); return; }
                
                this.scene.load.json(eventsKey, eventsPath);
                this.scene.load.once('complete', () => {
                    if (!this._shouldAbort()) {
                        const eventsJson = this.scene.cache.json.get(eventsKey);
                        this.scene.chartData.events = (eventsJson && Array.isArray(eventsJson.events)) ? eventsJson.events : [];
                    }
                    resolve();
                });
                this.scene.load.start();
            });
        } else {
            this.scene.chartData.events = [];
        }
        
        if (!this._shouldAbort()) this.continueCreate();
    }

    async continueCreate() {
        await this._yieldToMainThread();
        if (this._shouldAbort()) return;

        this.scene.conductor = new Conductor(this.scene.chartData.bpm);
        this.scene.scriptHandler = new ScriptHandler(this.scene);
        
        if (this.scene.chartData.events && Array.isArray(this.scene.chartData.events)) {
            await this.scene.scriptHandler.loadEventScripts(this.scene.chartData.events);
        }
        
        if (this._shouldAbort()) return;

        this.scene.conductor.on('beat', (beat) => this.scene.events.emit(window.PlayEvents.BEAT_HIT, beat));
        this.scene.conductor.on('step', (step) => this.scene.events.emit(window.PlayEvents.STEP_HIT, step));

        this.scene.tempNoteSkin = new NoteSkin(this.scene, this.scene.chartData);
        await this.scene.tempNoteSkin.preloadJSON();

        if (this._shouldAbort()) return;

        this.scene.stageHandler = new Stage(this.scene, this.scene.chartData, this.scene.cameraManager);
        this.scene.charactersHandler = new Characters(
            this.scene, 
            this.scene.chartData, 
            this.scene.cameraManager, 
            this.scene.stageHandler, 
            this.scene.conductor, 
            this.scene.playSessionId
        );

        await this.scene.stageHandler.loadStageJSON();
        await this.scene.charactersHandler.loadCharacterJSONs();
        await SongPlayer.loadSongAudio(this.scene, this.scene.initData.targetSongId, this.scene.chartData);

        if (this._shouldAbort()) return;

        this.scene.load.once("complete", this.onAllDataLoaded, this);
        this.scene.load.start();

        this.setupAutoPause();
    }

    async onAllDataLoaded() {
        if (this._shouldAbort()) return;
        if (this.scene.assetsLoaded) return;

        if (this.scene.tempNoteSkin) await this.scene.tempNoteSkin.loadAssets();
        if (this.scene.stageHandler) await this.scene.stageHandler.loadStageImages();
        if (this.scene.charactersHandler) await this.scene.charactersHandler.processAndLoadImages();
        
        if (this._shouldAbort()) return;

        if (HealthBar.preloadIcons) {
            HealthBar.preloadIcons(this.scene, this.scene.chartData, this.scene.playSessionId);
        }

        this.scene.load.once("complete", this.onAllAssetsLoaded, this);
        this.scene.load.start();
    }

    async onAllAssetsLoaded() {
        if (this._shouldAbort()) return;
        if (this.scene.assetsLoaded) return;
        
        this.scene.assetsLoaded = true;
        await this._yieldToMainThread(); 

        if (this._shouldAbort()) return;

        try {
            if (this.scene.textures.exists('healthBar')) {
                const healthBar = new HealthBar(this.scene, this.scene.chartData, this.scene.conductor, this.scene.playSessionId);
                await healthBar.init(); 
                
                if (this._shouldAbort()) { 
                    if(healthBar.destroy) healthBar.destroy(); 
                    return; 
                }

                this.scene.events.emit(window.PlayEvents.SONG_LOADING_COMPLETE, {
                    healthBar: healthBar,
                    ratingText: null 
                });
            }

            this.scene.ratingText = new RatingText(this.scene, null); 
            if (this.scene.ratingText.container && this.scene.cameraManager) {
                this.scene.cameraManager.assignToUI(this.scene.ratingText.container);
                this.scene.ratingText.container.setDepth(101);
                if (this.scene.hud) this.scene.hud.onLoadingComplete({ ratingText: this.scene.ratingText });
            }

            if (this.scene.stageHandler) this.scene.stageHandler.createStageElements();
            if (this.scene.charactersHandler) this.scene.charactersHandler.createAnimationsAndSprites();

            try {
                this.scene.notesHandler = new NotesHandler(
                    this.scene, 
                    this.scene.chartData, 
                    this.scene.conductor, 
                    this.scene.playSessionId
                );
                
                if(this.scene.cameraManager && this.scene.notesHandler.mainUICADContainer) {
                    this.scene.cameraManager.assignToUI(this.scene.notesHandler.mainUICADContainer);
                    this.scene.notesHandler.mainUICADContainer.setDepth(2);
                }
            } catch (noteError) {
                console.error("[PlaySceneLoad] Error crítico creando NotesHandler:", noteError);
            }

        } catch (e) {
            console.error("[PlaySceneLoad] Error visual:", e);
        }

        this.scene.events.emit(window.PlayEvents.BEAT_HIT, 0); 
        if (this.scene.scriptHandler) this.scene.scriptHandler.call('onCreatePost');

        this.scene.isWaitingOnLoad = false;
        this.scene.startGameLogic();
    }

    setupAutoPause() {
        this._onBlurHandler = () => {
            if (this._shouldAbort()) return;
            // Evitar warning si la escena ya no está activa
            if (!this.scene.sys || !this.scene.sys.settings.active) return;
            
            let shouldAutoPause = true;
            try {
                const stored = localStorage.getItem('genesis_preferences');
                if (stored) {
                    const prefs = JSON.parse(stored);
                    if (prefs && typeof prefs['opt-autopause'] !== 'undefined') {
                        shouldAutoPause = prefs['opt-autopause'];
                    }
                }
            } catch (e) {}

            if (shouldAutoPause && !this.scene.isWaitingOnLoad) {
                this.scene.events.emit(window.PlayEvents.PAUSE_CALL);
            }
        };

        this.scene.game.events.on('blur', this._onBlurHandler);
    }

    _yieldToMainThread() {
        return new Promise(resolve => setTimeout(resolve, 0));
    }

    _shouldAbort() {
        if (this.isAborted) return true;
        if (!this.scene || !this.scene.sys) return true;
        if (!this.scene.sys.isActive() && !this.scene.sys.isTransitioning()) return true;
        return false;
    }
}