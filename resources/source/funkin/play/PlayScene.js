import { PlaySceneData } from "./data/PlaySceneData.js";
import { PlaySceneLoad } from "./components/extensionPlay/PlaySceneLoad.js";
import { PlaySceneCleanup } from "./components/extensionPlay/PlaySceneCleanup.js";
import { PlayScenePreload } from "./components/extensionPlay/PlayScenePreload.js";
import { PlayInputHandler } from "./components/extensionPlay/PlayInputHandler.js";
import { PlayHUDManager } from "./components/extensionPlay/PlayHUDManager.js";
import { PlayGameReferee } from "./components/extensionPlay/PlayGameReferee.js";
import { PlayDebug } from "./components/extensionPlay/PlayDebug.js"; 
import { SongPlayer } from "./song/SongPlayer.js";
import { NotesHandler } from "./notes/NotesHandler.js";
import { CameraManager } from "./camera/Camera.js";
import { PlayEvents } from "./PlayEvents.js"; 

export class PlayScene extends Phaser.Scene {
  constructor() {
    super({ key: "PlayScene" });
    
    this.loader = null;
    this.preloader = null;
    this.inputHandler = null;
    this.hud = null;
    this.referee = null;
    this.cameraManager = null;
    this.debugHandler = null; 
    
    this.conductor = null;
    this.notesHandler = null;
    this.stageHandler = null;
    this.charactersHandler = null;
    this.scriptHandler = null;
    this.tempNoteSkin = null;

    this.initData = null;
    this.chartData = null;
    this.songAudio = { inst: null, voices: [] };
    this.playSessionId = null;
    this.isWaitingOnLoad = true;
    this.isInCountdown = false;
    this.countdownStartTime = 0;
    this.songStartTime = 0;
    this.deathCounter = 0;
    this.assetsLoaded = false;
  }

  init(data) {
    this.sound.stopAll();
    this.playSessionId = Date.now().toString() + Math.floor(Math.random() * 1000);
    
    const registryData = this.registry.get("PlaySceneData");
    const finalData = registryData || data;
    this.registry.set("PlaySceneData", undefined);

    this.initData = PlaySceneData.init(this, finalData);
    this.deathCounter = data.deathCounter || 0;

    this.loader = new PlaySceneLoad(this);
    this.preloader = new PlayScenePreload(this);
    this.inputHandler = new PlayInputHandler(this);
    this.hud = new PlayHUDManager(this);
    this.referee = new PlayGameReferee(this);
    this.debugHandler = new PlayDebug(this);
  }

  preload() {
    this.preloader.preloadAll(this.playSessionId);
    NotesHandler.preload(this);
    if (!this.cache.audio.has("menuMusic")) {
      this.load.audio("menuMusic", "public/music/FreakyMenu.mp3");
    }
  }

  async create() {
    if (window.Genesis && window.Genesis.discord) {
        Genesis.discord.setActivity({
            details: `Playing ${this.initData.targetSongId}`,
            state: "Play State"
        });
    }

    this.setupGlobalEvents();

    this.inputHandler.create();
    this.cameraManager = new CameraManager(this);
    this.hud.create(this.cameraManager);

    this.isWaitingOnLoad = true;
    this.assetsLoaded = false;
    await this.startChartLoading();
  }

  setupGlobalEvents() {
    const Events = window.PlayEvents || PlayEvents;
    
    // [IMPORTANTE] Conectar el shutdown para limpiar memoria y evitar errores i.size
    this.events.on('shutdown', this.shutdown, this);

    this.events.on(Events.PAUSE_CALL, this.onPauseCall, this);
    this.events.on(Events.RESET_CALL, this.onResetCall, this);
    this.events.on(Events.GAME_OVER, this.onGameOver, this);
    this.events.on(Events.EXIT_TO_MENU, this.exitToMenu, this);
    this.events.on(Events.RESTART_SONG, this.onRestartSong, this);
    
    this.events.on(Events.DEBUG_CAMERA_MOVE, (pos) => {
        if (this.cameraManager?.gameCamera) {
            this.cameraManager.gameCamera.scrollX += pos.x;
            this.cameraManager.gameCamera.scrollY += pos.y;
        }
    });
  }

  async startChartLoading() {
    if (this.loader) {
        await import("./data/chartData.js").then(m => m.ChartDataHandler.preloadChart(this, this.initData.targetSongId, this.initData.DifficultyID || "normal"));
        
        this.load.once('complete', () => {
            this.loader.processChartAndEvents();
        });
        this.load.start();
    }
  }

  startGameLogic() {
    if (!this.sys.isActive() || !this.conductor) return;
    
    this.isInCountdown = true;
    const beatLengthMs = this.conductor.crochet;
    this.countdownStartTime = this.time.now;
    this.songStartTime = this.countdownStartTime + beatLengthMs * 5;

    if (this.scriptHandler) this.scriptHandler.call('onStartCountdown');

    this.hud.startCountdown(beatLengthMs, () => {
        if (!this.sys.isActive()) return;
        this.isInCountdown = false;

        if (this.scriptHandler) this.scriptHandler.call('onSongStart');

        this.songAudio = SongPlayer.playSong(this, this.chartData);
        
        if (this.songAudio?.inst) {
            const durationMs = this.songAudio.inst.duration * 1000;
            const Events = window.PlayEvents || PlayEvents;
            
            this.songAudio.inst.on("complete", () => {
                this.events.emit(Events.SONG_COMPLETE);
            });

            this.events.emit(Events.SONG_START, { duration: durationMs });
        }
    });
  }

  update(time, delta) {
    if (this.isWaitingOnLoad) return;
    if (this.debugHandler) this.debugHandler.update();

    this.inputHandler.update(delta);

    if (this.scriptHandler && this.assetsLoaded) {
      this.scriptHandler.call('onUpdate', delta, time);
      let currentPos = 0;
      if (this.isInCountdown) {
        currentPos = time - this.songStartTime;
      } else if (this.songAudio?.inst?.isPlaying) {
        currentPos = this.songAudio.inst.seek * 1000;
      }
      this.scriptHandler.processEvents(currentPos);
    }

    if (!this.assetsLoaded) return;

    let songPosition;
    if (this.isInCountdown) {
      songPosition = time - this.songStartTime;
    } else {
      if (!this.songAudio?.inst?.isPlaying) return;
      songPosition = this.songAudio.inst.seek * 1000;
    }

    if (this.conductor) this.conductor.updateFromSong(songPosition);
    if (this.hud) this.hud.update(songPosition, delta);
    if (this.notesHandler) this.notesHandler.update(songPosition);
  }

  onPauseCall() {
    if (!this.sys || !this.sys.settings.active || this.isWaitingOnLoad || !this.assetsLoaded) return;
    if (this.sys.isPaused() || this.sys.isTransitioning()) return;

    this.pauseMusic();
    const diff = this.initData.DifficultyID ? this.initData.DifficultyID.toUpperCase() : "NORMAL";
    
    this.scene.launch('PauseScene', {
      parent: this,
      songName: this.initData.targetSongId,
      difficulty: diff,
      deaths: this.deathCounter
    });
    
    this.scene.pause();
  }

  onResetCall() {
    if (!this.sys.isActive() || this.isWaitingOnLoad) return;
    this.onRestartSong({ newData: this.initData });
  }

  onGameOver() {
    this.onRestartSong({ newData: this.initData });
  }

  onRestartSong(eventData) {
      this.stopMusic();
      this.scene.restart(eventData.newData || this.initData);
  }

  exitToMenu() {
    this.stopMusic();
    const nextSceneKey = this.initData?.isStoryMode ? "StoryModeScene" : "FreeplayScene";
    this.scene.stop('PauseScene');
    this.scene.start(nextSceneKey);
  }

  resumeFromPause() {
    if (this.sys.isPaused()) {
        this.resumeMusic();
        this.scene.resume();
    }
  }
  
  damage(amount) { 
      const Events = window.PlayEvents || PlayEvents;
      if (this.hud && this.hud.healthBar) {
          this.hud.healthBar.damage(amount); 
          this.events.emit(Events.HEALTH_CHANGED, { value: this.hud.healthBar.curHealth });
      }
  }
  
  heal(amount) { 
      const Events = window.PlayEvents || PlayEvents;
      if (this.hud && this.hud.healthBar) {
          this.hud.healthBar.heal(amount);
          this.events.emit(Events.HEALTH_CHANGED, { value: this.hud.healthBar.curHealth });
      }
  }

  stopMusic() {
    if (this.songAudio) {
      if (this.songAudio.inst) this.songAudio.inst.stop();
      if (this.songAudio.voices) this.songAudio.voices.forEach(v => v && v.stop());
    }
  }

  pauseMusic() {
    if (this.songAudio) {
      if (this.songAudio.inst && this.songAudio.inst.isPlaying) this.songAudio.inst.pause();
      if (this.songAudio.voices) this.songAudio.voices.forEach(v => { if (v && v.isPlaying) v.pause(); });
    }
  }

  resumeMusic() {
    if (this.songAudio) {
      if (this.songAudio.inst && this.songAudio.inst.isPaused) this.songAudio.inst.resume();
      if (this.songAudio.voices) this.songAudio.voices.forEach(v => { if (v && v.isPaused) v.resume(); });
    }
  }

  shutdown() {
    PlaySceneCleanup.shutdown(this);
    
    // Evitar recursión
    this.events.off('shutdown', this.shutdown, this);

    const Events = window.PlayEvents || PlayEvents;
    this.events.off(Events.PAUSE_CALL);
    this.events.off(Events.RESET_CALL);
    this.events.off(Events.GAME_OVER);
    this.events.off(Events.EXIT_TO_MENU);
    this.events.off(Events.RESTART_SONG);
    this.events.off(Events.DEBUG_CAMERA_MOVE);

    if(this.inputHandler) this.inputHandler.destroy();
    if(this.debugHandler) this.debugHandler.destroy();
    
    this.loader = null;
    this.hud = null;
    this.referee = null;
    this.preloader = null;
    this.cameraManager = null;
    this.debugHandler = null;
  }
}

game.scene.add('PlayScene', PlayScene);