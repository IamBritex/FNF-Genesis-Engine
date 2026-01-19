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

export class PlaySceneLoad {
    constructor(scene) {
        this.scene = scene;
    }

    async processChartAndEvents() {
        this.scene.chartData = ChartDataHandler.processChartData(
            this.scene,
            this.scene.initData.targetSongId,
            this.scene.initData.DifficultyID || "normal"
        );

        if (!this.scene.chartData) {
            this.scene.exitToMenu();
            return;
        }

        if (this.scene.chartData.events === true) {
            console.log("[PlaySceneLoad] Events: true detectado...");
            const songId = this.scene.initData.targetSongId;
            const eventsKey = `Events_${songId}`;
            let eventsPath = await ModHandler.getPath('songs', `${songId}/charts/Events.json`);

            if (eventsPath && typeof eventsPath !== 'string') {
                if (eventsPath instanceof Blob || eventsPath instanceof File) {
                    eventsPath = URL.createObjectURL(eventsPath);
                }
            }

            if (typeof eventsPath === 'string') {
                this.scene.load.json(eventsKey, eventsPath);
                this.scene.load.once('complete', () => {
                    const eventsJson = this.scene.cache.json.get(eventsKey);
                    if (eventsJson && Array.isArray(eventsJson.events)) {
                        this.scene.chartData.events = eventsJson.events;
                    } else {
                        this.scene.chartData.events = [];
                    }
                    this.continueCreate();
                });
                this.scene.load.start();
                return;
            } else {
                this.scene.chartData.events = [];
                this.continueCreate();
                return;
            }
        }
        this.continueCreate();
    }

    async continueCreate() {
        // 1. Inicializar Conductor y Scripts
        this.scene.conductor = new Conductor(this.scene.chartData.bpm);
        this.scene.scriptHandler = new ScriptHandler(this.scene);
        
        if (this.scene.chartData.events && Array.isArray(this.scene.chartData.events)) {
            await this.scene.scriptHandler.loadEventScripts(this.scene.chartData.events);
        }

        this.scene.conductor.on('beat', (beat) => this.scene.scriptHandler.call('onBeatHit', beat));
        this.scene.conductor.on('step', (step) => this.scene.scriptHandler.call('onStepHit', step));

        // 2. PRECARGA ESPECÍFICA DEL NIVEL (Skin, Stage, Personajes)
        // Nota: La UI base (TimeBar, etc) YA FUE CARGADA en PlayScene.preload()

        this.scene.tempNoteSkin = new NoteSkin(this.scene, this.scene.chartData);
        await this.scene.tempNoteSkin.preloadJSON();

        this.scene.stageHandler = new Stage(this.scene, this.scene.chartData, this.scene.cameraManager, this.scene.conductor);
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

        this.scene.load.once("complete", this.onAllDataLoaded, this);
        this.scene.load.start();

        this.setupAutoPause();
    }

    async onAllDataLoaded() {
        if (this.scene.assetsLoaded) return;

        console.log("[PlaySceneLoad] Datos cargados. Iniciando carga de imágenes...");

        if (this.scene.tempNoteSkin) await this.scene.tempNoteSkin.loadAssets();
        if (this.scene.stageHandler) await this.scene.stageHandler.loadStageImages();
        if (this.scene.charactersHandler) await this.scene.charactersHandler.processAndLoadImages();
        
        if (HealthBar.preloadIcons) {
            HealthBar.preloadIcons(this.scene, this.scene.chartData, this.scene.playSessionId);
        }

        this.scene.load.once("complete", this.onAllAssetsLoaded, this);
        this.scene.load.start();
    }

    async onAllAssetsLoaded() {
        if (this.scene.assetsLoaded) return;
        this.scene.assetsLoaded = true;

        console.log("[PlaySceneLoad] Assets cargados. Finalizando creación...");

        // 1. Finalizar HealthBar
        const healthBar = new HealthBar(this.scene, this.scene.chartData, this.scene.conductor, this.scene.playSessionId);
        await healthBar.init(); 
        
        if (this.scene.hud) {
            this.scene.hud.healthBar = healthBar; 
            // IMPORTANTE: Esto actualiza el HUD y oculta la pantalla de carga
            this.scene.hud.onAssetsLoaded(this.scene.cameraManager);
        }

        // 2. Rating Text
        this.scene.ratingText = new RatingText(this.scene, this.scene.scoreManager);
        if (this.scene.ratingText.container) {
            this.scene.cameraManager.assignToUI(this.scene.ratingText.container);
            this.scene.ratingText.container.setDepth(101);
            if(this.scene.hud) this.scene.hud.ratingText = this.scene.ratingText;
        }

        // 3. Stage & Characters
        if (this.scene.stageHandler) this.scene.stageHandler.createStageElements();
        if (this.scene.charactersHandler) this.scene.charactersHandler.createAnimationsAndSprites();

        // 4. Notas
        this.scene.notesHandler = new NotesHandler(
            this.scene, 
            this.scene.chartData, 
            this.scene.scoreManager, 
            this.scene.conductor, 
            this.scene.playSessionId
        );
        this.scene.cameraManager.assignToUI(this.scene.notesHandler.mainUICADContainer);
        this.scene.notesHandler.mainUICADContainer.setDepth(2);
        
        if (this.scene.notesHandler.notesContainer) {
            this.scene.cameraManager.assignToUI(this.scene.notesHandler.notesContainer);
            this.scene.notesHandler.notesContainer.setDepth(2);
        }

        if (this.scene.notesHandler && this.scene.charactersHandler) {
            this.scene.notesHandler.setCharactersHandler(this.scene.charactersHandler);
        }

        if (this.scene.charactersHandler) {
            this.scene.charactersHandler.startBeatSystem();
            this.scene.charactersHandler.dance();
        }
        if (this.scene.stageHandler) {
            this.scene.stageHandler.dance();
        }

        if (this.scene.scriptHandler) this.scene.scriptHandler.call('onCreatePost');

        // Fallback por si HUDManager no ocultó la carga
        if (this.scene.hud && this.scene.hud.funWaiting && this.scene.isWaitingOnLoad) {
             // HUDManager se encarga
        } else {
            this.scene.isWaitingOnLoad = false;
            this.scene.startGameLogic();
        }
    }

    setupAutoPause() {
        this.scene.onWindowBlur = () => {
            if (!this.scene.scene || !this.scene.sys || !this.scene.sys.isActive()) return;
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

            if (shouldAutoPause && !this.scene.isWaitingOnLoad && this.scene.sys.settings.active) {
                this.scene.triggerPause();
            }
        };
        this.scene.game.events.on('blur', this.scene.onWindowBlur);
    }
}