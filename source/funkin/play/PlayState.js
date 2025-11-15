import { PlayStateData } from "./PlayStateData.js";
import { SongPlayer } from "./song/SongPlayer.js";
import { ChartDataHandler } from "./chartData.js";
import { NotesHandler } from "./notes/NotesHandler.js"; 
import { CameraManager } from "./camera/Camera.js";
import { Stage } from "./stage/Stage.js";
import { Characters } from "./characters/Characters.js";
import { PopUpManager } from "./judgments/PopUpManager.js";
import { Countdown } from "./countDown.js"; 
import { TimeBar } from "./components/timeBar.js";
import { HealthBar } from "./components/healthBar.js";
import { RatingText } from "./judgments/RatingText.js";
import { Score } from "./components/Score.js"; 
// --- [NUEVO] ---
import { FunWaiting } from "./components/FunWaiting.js";
// --- [FIN NUEVO] ---

export class PlayState extends Phaser.Scene {
  constructor() {
    super({ key: "PlayState" });
    this.initData = null;
    this.chartData = null;
    this.assetsLoaded = false;
    this.songAudio = { inst: null, voices: [] };
    this.notesHandler = null;
    this.cameraManager = null;
    this.stageHandler = null;
    this.charactersHandler = null;
    this.popUpManager = null;
    this.countdown = null;
    this.timeBar = null; 
    this.healthBar = null; 
    
    this.ratingText = null;
    this.scoreManager = null; 

    // --- [NUEVO] ---
    this.funWaiting = null; // Gestor de la pantalla negra
    this.isWaitingOnLoad = true; // Flag para pausar el update
    // --- [FIN NUEVO] ---

    this.isInCountdown = false; 
    this.countdownStartTime = 0;
    this.songStartTime = 0; 
  }

  init(data) {
    this.sound.stopAll();
    
    const registryData = this.registry.get('playStateData');
    const finalData = registryData || data;
    this.registry.set('playStateData', undefined); 
    
    this.initData = PlayStateData.init(this, finalData); 
  }

  preload() {
    NotesHandler.preload(this); 
    ChartDataHandler.preloadChart(this, this.initData.targetSongId, this.initData.DifficultyID || "normal"); 
    
    if (!this.cache.audio.has("menuMusic")) {
        this.load.audio("menuMusic", "public/music/FreakyMenu.mp3");
    }

    PopUpManager.preload(this);
    Countdown.preload(this);
    TimeBar.preload(this);
    HealthBar.preload(this); 
  }

  create() {
    // --- [MODIFICADO] ---
    // Establecer flags de carga
    this.assetsLoaded = false;
    this.isWaitingOnLoad = true; 
    // --- [FIN MODIFICADO] ---
    
    // El CameraManager DEBE crearse primero
    this.cameraManager = new CameraManager(this);

    // --- [NUEVO] ---
    // Crear la pantalla negra INMEDIATAMENTE
    this.funWaiting = new FunWaiting(this, this.cameraManager);
    this.funWaiting.createOverlay();
    // --- [FIN NUEVO] ---

    // Crear el gestor de puntuación
    this.scoreManager = new Score(this);
    
    this.popUpManager = new PopUpManager(this, this.cameraManager);
    this.countdown = new Countdown(this, this.cameraManager);

    this.timeBar = new TimeBar(this);
    this.timeBar.create();
    this.cameraManager.assignToUI(this.timeBar.container);

    this.keyI = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I);
    this.keyK = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K);
    this.keyJ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J);
    this.keyL = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L);

    this.chartData = ChartDataHandler.processChartData(this, this.initData.targetSongId, this.initData.DifficultyID || "normal");
    if (!this.chartData) { this.exitToMenu(); return; }

    this.healthBar = new HealthBar(this, this.chartData);
    this.stageHandler = new Stage(this, this.chartData, this.cameraManager);
    this.charactersHandler = new Characters(this, this.chartData, this.cameraManager, this.stageHandler);
    
    this.stageHandler.loadStageJSON();
    
    this.charactersHandler.loadCharacterJSONs();
    this.healthBar.loadCharacterData(); 

    this.notesHandler = new NotesHandler(this, this.chartData, this.scoreManager);

    this.cameraManager.assignToUI(this.notesHandler.mainUICADContainer);
    this.notesHandler.mainUICADContainer.setDepth(2);

    if (this.notesHandler.notesContainer) {
        this.cameraManager.assignToUI(this.notesHandler.notesContainer);
        this.notesHandler.notesContainer.setDepth(2);
    }

    SongPlayer.loadSongAudio(this, this.initData.targetSongId, this.chartData);
    
    this.load.once("complete", this.onAllDataLoaded, this);
    this.load.start();
  }

  async onAllDataLoaded() {
    if (this.assetsLoaded) return; // Prevenir doble ejecución

    if (this.stageHandler) {
      this.stageHandler.loadStageImages(); 
    }
    if (this.charactersHandler) {
      this.charactersHandler.processAndLoadImages(); 
    }
    if (this.healthBar) {
        this.healthBar.preloadIcons();
    }
    
    this.load.once("complete", this.onAllAssetsLoaded, this);
    this.load.start(); 
  }

  async onAllAssetsLoaded() {
    if (this.assetsLoaded) return; 
    this.assetsLoaded = true;

    // Crear todos los elementos visuales (mientras la pantalla sigue en negro)
    if (this.healthBar) {
        await this.healthBar.init(); 
        this.healthBar.container.setDepth(1) 
        this.cameraManager.assignToUI(this.healthBar.container);
    }

    this.ratingText = new RatingText(this, this.scoreManager);
    if (this.ratingText.container) {
        this.cameraManager.assignToUI(this.ratingText.container);
        this.ratingText.container.setDepth(101); 
    }

    if (this.stageHandler) {
      this.stageHandler.createStageElements();
    }
    if (this.charactersHandler) {
      this.charactersHandler.createAnimationsAndSprites(); 
    }

    if (this.notesHandler && this.charactersHandler) {
      this.notesHandler.setCharactersHandler(this.charactersHandler);
    }

    if (this.charactersHandler) {
      this.charactersHandler.startBeatSystem(); 
    }

    // --- [MODIFICADO] ---
    // En lugar de iniciar el juego, iniciamos el fundido de salida.
    // El juego comenzará cuando el fundido termine.
    if (this.funWaiting) {
        this.funWaiting.startFadeOut(() => {
            // Callback: Se llama al terminar el fundido
            this.isWaitingOnLoad = false; // Desbloquear el update
            this.startGameLogic();      // Iniciar la cuenta atrás
        }, 500); // 500ms de fundido
    } else {
        // Fallback por si FunWaiting falló
        this.isWaitingOnLoad = false;
        this.startGameLogic();
    }
    // --- [FIN MODIFICADO] ---
  }

  /**
   * [NUEVA FUNCIÓN]
   * Contiene la lógica que se ejecuta DESPUÉS del fundido de carga.
   */
  startGameLogic() {
    if (!this.scene) return; // Seguridad por si la escena se cerró

    this.isInCountdown = true;
    
    const beatLengthMs = (60 / this.chartData.bpm) * 1000;

    this.countdownStartTime = this.time.now; 
    this.songStartTime = this.countdownStartTime + (beatLengthMs * 5);

    this.countdown.performCountdown(beatLengthMs, () => {
        if (!this.scene) return;
        
        this.isInCountdown = false;
        
        this.songAudio = SongPlayer.playSong(this, this.chartData);
        
        if (this.songAudio?.inst) {
            const durationMs = this.songAudio.inst.duration * 1000;
            if (this.timeBar) {
                this.timeBar.setTotalDuration(durationMs);
            }
            
            this.songAudio.inst.on('complete', this.onSongComplete, this);
        }
    });
  }

  debugCameraControls(delta) {
    if (!this.keyI || !this.cameraManager || !this.cameraManager.gameCamera) return;
    const moveSpeed = 1000 * (delta / 1000); 

    if (this.keyI.isDown) {
        this.cameraManager.gameCamera.scrollY -= moveSpeed;
    }
    if (this.keyK.isDown) {
        this.cameraManager.gameCamera.scrollY += moveSpeed;
    }
    if (this.keyJ.isDown) {
        this.cameraManager.gameCamera.scrollX -= moveSpeed;
    }
    if (this.keyL.isDown) {
        this.cameraManager.gameCamera.scrollX += moveSpeed;
    }
  }

   update(time, delta) {
    // --- [NUEVO] ---
    // Pausar toda la lógica de update si estamos en la pantalla negra
    if (this.isWaitingOnLoad) {
        return;
    }
    // --- [FIN NUEVO] ---

    this.debugCameraControls(delta);

    // assetsLoaded es true si isWaitingOnLoad es false,
    // así que esta comprobación es redundante, pero la dejamos por seguridad.
    if (!this.assetsLoaded) return;

    let songPosition; 

    if (this.isInCountdown) {
        songPosition = time - this.songStartTime;
        
        if (this.charactersHandler) {
          this.charactersHandler.update(songPosition); 
        }
        if (this.notesHandler) {
          this.notesHandler.update(songPosition);
        }

    } else {
        if (!this.songAudio?.inst?.isPlaying) {
             if (this.charactersHandler) this.charactersHandler.update(0); 
             return;
        }
        
        songPosition = this.songAudio.inst.seek * 1000; 
        
        if (this.notesHandler) this.notesHandler.update(songPosition);
        if (this.charactersHandler) {
          this.charactersHandler.update(songPosition); 
        }
    }
    
    if (this.timeBar) {
        this.timeBar.update(songPosition);
    }
    
    if (this.healthBar) {
        this.healthBar.updateHealth(delta / 1000); 
        this.healthBar.updateBeatBounce(songPosition, delta); 
    }
   }
   
   damage(amount = 1) {
       if (this.healthBar) {
           this.healthBar.damage(amount); 
       }
   }

   heal(amount = 1) {
       if (this.healthBar) {
           this.healthBar.heal(amount); 
       }
   }

  onSongComplete() {
    if (!this.initData.isStoryMode) { this.exitToMenu(); return; }
    const currentIndex = this.initData.currentSongIndex || 0;
    const nextIndex = currentIndex + 1;
    if (nextIndex >= this.initData.playlistSongIds.length) { this.exitToMenu(); return; }
    const nextSongId = this.initData.playlistSongIds[nextIndex];
    this.initData.currentSongIndex = nextIndex;
    this.initData.targetSongId = nextSongId;
    this.scene.restart(this.initData);
  }

  exitToMenu() {
    const nextSceneKey = this.initData?.isStoryMode ? "StoryModeState" : "FreeplayState";
    
    const nextScene = this.scene.get(nextSceneKey);
    
    if (nextScene) {
        nextScene.events.once('create', () => {
            if (this.game && this.game.sound) {
                let menuMusic = this.game.sound.get('menuMusic');
                if (!menuMusic || !menuMusic.isPlaying) {
                    this.game.sound.play('menuMusic', { 
                        loop: true,
                        volume: 0.7 
                    });
                }
            }
        });
    }

    this.scene.start(nextSceneKey);
  }

  shutdown() {
    // Limpiar todo
    if (this.healthBar) { this.healthBar.destroy(); this.healthBar = null; } 
    if (this.timeBar) { this.timeBar.destroy(); this.timeBar = null; }
    if (this.ratingText) { this.ratingText.destroy(); this.ratingText = null; }
    if (this.scoreManager) { this.scoreManager.destroy(); this.scoreManager = null; }
    // --- [NUEVO] ---
    if (this.funWaiting) { this.funWaiting.destroy(); this.funWaiting = null; }
    // --- [FIN NUEVO] ---
    if (this.notesHandler) { this.notesHandler.shutdown(); this.notesHandler = null; }
    if (this.cameraManager) { this.cameraManager.shutdown(this); this.cameraManager = null; }
    if (this.stageHandler) { this.stageHandler.shutdown(); this.stageHandler = null; }
    if (this.charactersHandler) { this.charactersHandler.shutdown(); this.charactersHandler = null; } 
    if (this.popUpManager) { this.popUpManager.shutdown(); this.popUpManager = null; }
    if (this.countdown) { this.countdown.stop(); this.countdown = null; }

    SongPlayer.shutdown(this, this.chartData, this.songAudio);
    
    ChartDataHandler.shutdown(this, this.initData?.targetSongId, this.initData?.DifficultyID || "normal"); 
    PlayStateData.shutdown(this); 
    
    if (this.game && this.game.sound) {
        this.game.sound.stopAll();
    }
    
    this.load.off("complete", this.onAllDataLoaded, this);
    this.load.off("complete", this.onAllAssetsLoaded, this);
    
    if (this.songAudio?.inst) this.songAudio.inst.off('complete', this.onSongComplete, this);
  }
}
game.scene.add("PlayState", PlayState);