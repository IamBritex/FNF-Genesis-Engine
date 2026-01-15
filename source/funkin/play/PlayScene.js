import { PlaySceneData } from "./data/PlaySceneData.js";
import { PlaySceneLoad } from "./components/extensionPlay/PlaySceneLoad.js";
import { PlaySceneCleanup } from "./components/extensionPlay/PlaySceneCleanup.js";
import { PlayScenePreload } from "./components/extensionPlay/PlayScenePreload.js"; // [IMPORTANTE]

import { PlayInputHandler } from "./components/extensionPlay/PlayInputHandler.js";
import { PlayHUDManager } from "./components/extensionPlay/PlayHUDManager.js";
import { PlayGameReferee } from "./components/extensionPlay/PlayGameReferee.js";

import { SongPlayer } from "./song/SongPlayer.js";
import { NotesHandler } from "./notes/NotesHandler.js";
import { CameraManager } from "./camera/Camera.js";

export class PlayScene extends Phaser.Scene {
  constructor() {
    super({ key: "PlayScene" });
    this.loader = null;
    this.preloader = null; // [NUEVO]
    this.inputHandler = null;
    this.hud = null;
    this.referee = null;

    this.initData = null;
    this.chartData = null;
    this.assetsLoaded = false;
    this.songAudio = { inst: null, voices: [] };
    this.isWaitingOnLoad = true;
    this.isInCountdown = false;
    this.playSessionId = null;
    this.deathCounter = 0;

    this.conductor = null;
    this.notesHandler = null;
    this.cameraManager = null;
    this.stageHandler = null;
    this.charactersHandler = null;
    this.scriptHandler = null;
    this.tempNoteSkin = null;

    this.countdownStartTime = 0;
    this.songStartTime = 0;
  }

  // Getters para compatibilidad
  get healthBar() { return this.hud ? this.hud.healthBar : null; }
  set healthBar(val) { if(this.hud) this.hud.healthBar = val; }
  get timeBar() { return this.hud ? this.hud.timeBar : null; }
  set timeBar(val) { if(this.hud) this.hud.timeBar = val; }
  get scoreManager() { return this.hud ? this.hud.scoreManager : null; }
  set scoreManager(val) { if(this.hud) this.hud.scoreManager = val; }
  get ratingText() { return this.hud ? this.hud.ratingText : null; }
  set ratingText(val) { if(this.hud) this.hud.ratingText = val; }
  get popUpManager() { return this.hud ? this.hud.popUpManager : null; }
  set popUpManager(val) { if(this.hud) this.hud.popUpManager = val; }
  get countdown() { return this.hud ? this.hud.countdown : null; }
  set countdown(val) { if(this.hud) this.hud.countdown = val; }
  get funWaiting() { return this.hud ? this.hud.funWaiting : null; }
  set funWaiting(val) { if(this.hud) this.hud.funWaiting = val; }

  init(data) {
    this.sound.stopAll();
    this.playSessionId = Date.now().toString() + Math.floor(Math.random() * 1000);
    
    const registryData = this.registry.get("PlaySceneData");
    const finalData = registryData || data;
    this.registry.set("PlaySceneData", undefined);

    this.initData = PlaySceneData.init(this, finalData);
    this.deathCounter = data.deathCounter || 0;

    // Inicializar Módulos
    this.loader = new PlaySceneLoad(this);
    this.preloader = new PlayScenePreload(this); // [NUEVO]
    this.inputHandler = new PlayInputHandler(this);
    this.hud = new PlayHUDManager(this);
    this.referee = new PlayGameReferee(this);
  }

  preload() {
    // [SOLUCIÓN] Cargar UI aquí para que esté lista en el create()
    this.preloader.preloadAll(this.playSessionId);

    // Cargas adicionales
    NotesHandler.preload(this, this.playSessionId);
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

    this.inputHandler.create();
    this.inputHandler.on('pause', () => this.triggerPause());
    this.inputHandler.on('reset', () => this.triggerReset());
    this.inputHandler.on('debugCamera', (x, y) => {
        if (this.cameraManager?.gameCamera) {
            this.cameraManager.gameCamera.scrollX += x;
            this.cameraManager.gameCamera.scrollY += y;
        }
    });

    this.assetsLoaded = false;
    this.isWaitingOnLoad = true;

    this.cameraManager = new CameraManager(this);

    // [AHORA FUNCIONARÁ] Como precargamos en preload(), esto ya tiene texturas
    this.hud.create(this.cameraManager);

    await this.startChartLoading();
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
    if (!this || !this.sys || !this.sys.isActive() || !this.conductor) return;
    this.isInCountdown = true;

    const beatLengthMs = this.conductor.crochet;
    this.countdownStartTime = this.time.now;
    this.songStartTime = this.countdownStartTime + beatLengthMs * 5;

    if (this.scriptHandler) this.scriptHandler.call('onStartCountdown');

    this.hud.startCountdown(beatLengthMs, () => {
      if (!this || !this.sys || !this.sys.isActive()) return;
      this.isInCountdown = false;

      if (this.scriptHandler) this.scriptHandler.call('onSongStart');

      this.songAudio = SongPlayer.playSong(this, this.chartData);

      if (this.songAudio?.inst) {
        const durationMs = this.songAudio.inst.duration * 1000;
        this.hud.setTotalTime(durationMs);
        this.songAudio.inst.on("complete", () => this.referee.onSongComplete(), this);
      }
    });
  }

  update(time, delta) {
    if (!this.isWaitingOnLoad) this.inputHandler.update(delta);
    if (this.isWaitingOnLoad) return;

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
      if (this.charactersHandler) this.charactersHandler.update(songPosition);
      if (this.notesHandler) this.notesHandler.update(songPosition);
    } else {
      if (!this.songAudio?.inst?.isPlaying) {
        if (this.charactersHandler) this.charactersHandler.update(0);
        if (this.conductor) this.conductor.updateFromSong(0);
        return;
      }
      songPosition = this.songAudio.inst.seek * 1000;
      if (this.notesHandler) this.notesHandler.update(songPosition);
      if (this.charactersHandler) this.charactersHandler.update(songPosition);
    }

    if (this.conductor) this.conductor.updateFromSong(songPosition);
    
    this.hud.update(songPosition, delta);
    this.referee.checkVitality();
  }

  triggerReset() {
    console.log("Reiniciando escena...");
    this.stopMusic();
    this.scene.restart(this.initData);
  }

  triggerPause() {
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

  resumeFromPause() {
    this.resumeMusic();
    this.scene.resume();
  }
  
  damage(amount = 1) { this.hud.damage(amount); }
  heal(amount = 1) { this.hud.heal(amount); }
  exitToMenu() { this.referee.exitToMenu(); }

  shutdown() {
    PlaySceneCleanup.shutdown(this);
    if(this.inputHandler) this.inputHandler.destroy();
    this.loader = null;
    this.hud = null;
    this.referee = null;
    this.preloader = null;
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
}

game.scene.add("PlayScene", PlayScene);