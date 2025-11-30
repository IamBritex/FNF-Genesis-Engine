import { PlaySceneData } from "./PlaySceneData.js"
import { SongPlayer } from "./song/SongPlayer.js"
import { ChartDataHandler } from "./chartData.js"
import { NotesHandler } from "./notes/NotesHandler.js"
import { CameraManager } from "./camera/Camera.js"
import { Stage } from "./stage/Stage.js"
import { Characters } from "./characters/Characters.js"
import { PopUpManager } from "./judgments/PopUpManager.js"
import { Countdown } from "./countDown.js"
import { TimeBar } from "./components/timeBar.js"
import { HealthBar } from "./components/healthBar.js"
import { RatingText } from "./judgments/RatingText.js"
import { Score } from "./components/Score.js"
import { Conductor } from "./Conductor.js"
import { FunWaiting } from "./components/FunWaiting.js"
import { Pause } from "./Pause.js" 
import { NoteSkin } from "./notes/NoteSkin.js" // Importar NoteSkin

export class PlayScene extends Phaser.Scene {
  constructor() {
    super({ key: "PlayScene" })
    this.initData = null
    this.chartData = null
    this.assetsLoaded = false
    this.songAudio = { inst: null, voices: [] }

    this.conductor = null
    this.notesHandler = null
    this.cameraManager = null
    this.stageHandler = null
    this.charactersHandler = null
    this.popUpManager = null
    this.countdown = null
    this.timeBar = null
    this.healthBar = null
    this.ratingText = null
    this.scoreManager = null
    this.funWaiting = null
    this.pauseHandler = null 
    this.isWaitingOnLoad = true

    this.isInCountdown = false
    this.countdownStartTime = 0
    this.songStartTime = 0
    
    this.playSessionId = null; 
    this.deathCounter = 0; 
    
    this.onWindowBlur = null;
    
    this.tempNoteSkin = null; // Helper temporal para carga
  }

  init(data) {
    this.sound.stopAll()

    this.playSessionId = Date.now().toString() + Math.floor(Math.random() * 1000);
    console.log(`PlayScene initialized with Session ID: ${this.playSessionId}`);

    const registryData = this.registry.get("PlaySceneData")
    const finalData = registryData || data
    this.registry.set("PlaySceneData", undefined)

    this.initData = PlaySceneData.init(this, finalData)
    this.deathCounter = 0; 
  }

  preload() {
    const fontPath = "public/fonts/vcr.ttf"
    const style = document.createElement("style")
    style.innerHTML = `
      @font-face {
        font-family: 'VCR OSD Mono';
        src: url('${fontPath}') format('truetype');
      }
    `
    document.head.appendChild(style)

    NotesHandler.preload(this, this.playSessionId)
    ChartDataHandler.preloadChart(this, this.initData.targetSongId, this.initData.DifficultyID || "normal")

    if (!this.cache.audio.has("menuMusic")) {
      this.load.audio("menuMusic", "public/music/FreakyMenu.mp3")
    }

    PopUpManager.preload(this)
    Countdown.preload(this)
    TimeBar.preload(this)
    HealthBar.preload(this, this.playSessionId)
    Pause.preload(this) 
  }

  create() {

    if (window.Genesis && window.Genesis.discord) {
        Genesis.discord.setActivity({
            details: `Playing ${this.initData.targetSongId}`, 
            state: "Play State"
        });
    }

    this.assetsLoaded = false
    this.isWaitingOnLoad = true

    this.cameraManager = new CameraManager(this)

    this.funWaiting = new FunWaiting(this, this.cameraManager)
    this.funWaiting.createOverlay()

    this.scoreManager = new Score(this)

    this.popUpManager = new PopUpManager(this, this.cameraManager)
    this.countdown = new Countdown(this, this.cameraManager)
    
    this.pauseHandler = new Pause(this, this.cameraManager);

    this.timeBar = new TimeBar(this)
    this.timeBar.create()
    this.cameraManager.assignToUI(this.timeBar.container)

    this.keyI = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I)
    this.keyK = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K)
    this.keyJ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J)
    this.keyL = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L)

    this.chartData = ChartDataHandler.processChartData(
      this,
      this.initData.targetSongId,
      this.initData.DifficultyID || "normal",
    )
    if (!this.chartData) {
      this.exitToMenu()
      return
    }

    this.conductor = new Conductor(this.chartData.bpm)

    // --- [NUEVO: PASO 1 CARGA DE SKIN] ---
    // Instanciar NoteSkin y precargar JSON
    this.tempNoteSkin = new NoteSkin(this, this.chartData);
    this.tempNoteSkin.preloadJSON();
    // -------------------------------------

    this.healthBar = new HealthBar(this, this.chartData, this.conductor, this.playSessionId)
    
    this.stageHandler = new Stage(this, this.chartData, this.cameraManager, this.conductor)
    
    this.charactersHandler = new Characters(this, this.chartData, this.cameraManager, this.stageHandler, this.conductor, this.playSessionId)

    this.stageHandler.loadStageJSON()

    this.charactersHandler.loadCharacterJSONs()
    this.healthBar.loadCharacterData()

    // [IMPORTANTE] NO creamos NotesHandler aquí todavía. Esperamos a que cargue el skin.

    SongPlayer.loadSongAudio(this, this.initData.targetSongId, this.chartData)

    this.load.once("complete", this.onAllDataLoaded, this)
    this.load.start()

    this.onWindowBlur = () => {
        if (!this.scene || !this.sys || !this.sys.isActive()) {
            return;
        }
        if (!this.isWaitingOnLoad && this.pauseHandler && !this.pauseHandler.isPaused) {
            console.log("Ventana perdió foco: Auto-pausando juego.");
            this.pauseHandler.pauseGame();
        }
    };
    
    this.game.events.on('blur', this.onWindowBlur);
  }

  async onAllDataLoaded() {
    if (this.assetsLoaded) return

    // --- [NUEVO: PASO 2 CARGA DE SKIN] ---
    // El JSON del skin ya cargó, ahora cargamos las texturas (Atlas)
    if (this.tempNoteSkin) {
        this.tempNoteSkin.loadAssets();
    }
    // -------------------------------------

    if (this.stageHandler) {
      this.stageHandler.loadStageImages()
    }
    if (this.charactersHandler) {
      this.charactersHandler.processAndLoadImages()
    }
    if (this.healthBar) {
      this.healthBar.preloadIcons()
    }

    this.load.once("complete", this.onAllAssetsLoaded, this)
    this.load.start()
  }

  async onAllAssetsLoaded() {
    if (this.assetsLoaded) return
    this.assetsLoaded = true

    if (this.healthBar) {
      await this.healthBar.init()
      this.healthBar.container.setDepth(1)
      this.cameraManager.assignToUI(this.healthBar.container)
    }

    this.ratingText = new RatingText(this, this.scoreManager)
    if (this.ratingText.container) {
      this.cameraManager.assignToUI(this.ratingText.container)
      this.ratingText.container.setDepth(101)
    }

    if (this.stageHandler) {
      this.stageHandler.createStageElements()
    }
    if (this.charactersHandler) {
      this.charactersHandler.createAnimationsAndSprites()
    }

    // --- [NUEVO: CREACIÓN DIFERIDA DE NOTESHANDLER] ---
    // Ahora que los assets del skin están cargados, es seguro crear NotesHandler
    this.notesHandler = new NotesHandler(this, this.chartData, this.scoreManager, this.conductor, this.playSessionId)

    this.cameraManager.assignToUI(this.notesHandler.mainUICADContainer)
    this.notesHandler.mainUICADContainer.setDepth(2)

    if (this.notesHandler.notesContainer) {
      this.cameraManager.assignToUI(this.notesHandler.notesContainer)
      this.notesHandler.notesContainer.setDepth(2)
    }
    // --------------------------------------------------

    if (this.notesHandler && this.charactersHandler) {
      this.notesHandler.setCharactersHandler(this.charactersHandler)
    }

    if (this.charactersHandler) {
      this.charactersHandler.startBeatSystem()
    }

    if (this.funWaiting) {
      this.funWaiting.startFadeOut(() => {
        this.isWaitingOnLoad = false
        this.startGameLogic()
      }, 500)
    } else {
      this.isWaitingOnLoad = false
      this.startGameLogic()
    }
  }

  startGameLogic() {
    if (!this.scene || !this.conductor) return

    this.isInCountdown = true

    const beatLengthMs = this.conductor.crochet

    this.countdownStartTime = this.time.now
    this.songStartTime = this.countdownStartTime + beatLengthMs * 5

    this.countdown.performCountdown(beatLengthMs, () => {
      if (!this.scene) return

      this.isInCountdown = false

      this.songAudio = SongPlayer.playSong(this, this.chartData)
      
      if (this.pauseHandler) {
          this.pauseHandler.setSongAudio(this.songAudio);
      }

      if (this.songAudio?.inst) {
        const durationMs = this.songAudio.inst.duration * 1000
        if (this.timeBar) {
          this.timeBar.setTotalDuration(durationMs)
        }

        this.songAudio.inst.on("complete", this.onSongComplete, this)
      }
    })
  }

  debugCameraControls(delta) {
    if (!this.keyI || !this.cameraManager || !this.cameraManager.gameCamera) return
    const moveSpeed = 1000 * (delta / 1000)

    if (this.keyI.isDown) {
      this.cameraManager.gameCamera.scrollY -= moveSpeed
    }
    if (this.keyK.isDown) {
      this.cameraManager.gameCamera.scrollY += moveSpeed
    }
    if (this.keyJ.isDown) {
      this.cameraManager.gameCamera.scrollX -= moveSpeed
    }
    if (this.keyL.isDown) {
      this.cameraManager.gameCamera.scrollX += moveSpeed
    }
  }

  update(time, delta) {
    if (this.pauseHandler) {
        this.pauseHandler.update();
        if (this.pauseHandler.isPaused) {
            return; 
        }
    }

    if (this.isWaitingOnLoad) {
      return
    }

    this.debugCameraControls(delta)

    if (!this.assetsLoaded) return

    let songPosition

    if (this.isInCountdown) {
      songPosition = time - this.songStartTime

      if (this.charactersHandler) {
        this.charactersHandler.update(songPosition)
      }
      if (this.notesHandler) {
        this.notesHandler.update(songPosition)
      }
    } else {
      if (!this.songAudio?.inst?.isPlaying) {
        if (this.charactersHandler) this.charactersHandler.update(0)
        if (this.conductor) this.conductor.updateFromSong(0)
        return
      }

      songPosition = this.songAudio.inst.seek * 1000

      if (this.notesHandler) this.notesHandler.update(songPosition)
      if (this.charactersHandler) {
        this.charactersHandler.update(songPosition)
      }
    }

    if (this.conductor) {
      this.conductor.updateFromSong(songPosition)
    }

    if (this.timeBar) {
      this.timeBar.update(songPosition)
    }

    if (this.healthBar) {
      this.healthBar.updateHealth(delta / 1000)
      this.healthBar.updateBeatBounce(songPosition, delta)
    }
  }

  damage(amount = 1) {
    if (this.healthBar) {
      this.healthBar.damage(amount)
    }
  }

  heal(amount = 1) {
    if (this.healthBar) {
      this.healthBar.heal(amount)
    }
  }

  onSongComplete() {
    if (!this.initData.isStoryMode) {
      this.exitToMenu()
      return
    }
    const currentIndex = this.initData?.currentSongIndex || 0
    const nextIndex = currentIndex + 1
    if (nextIndex >= this.initData.playlistSongIds.length) {
      this.exitToMenu()
      return
    }
    const nextSongId = this.initData.playlistSongIds[nextIndex]
    this.initData.currentSongIndex = nextIndex
    this.initData.targetSongId = nextSongId
    this.scene.restart(this.initData)
  }

  exitToMenu() {
    const nextSceneKey = this.initData?.isStoryMode ? "StoryModeScene" : "FreeplayScene"
    this.scene.start(nextSceneKey)
  }

  shutdown() {
    this.input.keyboard.removeAllKeys()
    this.input.removeAllListeners()
    this.time.removeAllEvents()
    this.tweens.killAll()

    if (window.gsap) {
      gsap.globalTimeline.clear()
    }

    if (this.onWindowBlur) {
        this.game.events.off('blur', this.onWindowBlur);
        this.onWindowBlur = null;
    }

    if (this.game && this.game.sound) {
      this.game.sound.stopAll()
    }

    if (this.songAudio?.inst) this.songAudio.inst.off("complete", this.onSongComplete, this)
    this.load.off("complete", this.onAllDataLoaded, this)
    this.load.off("complete", this.onAllAssetsLoaded, this)

    if (this.pauseHandler) {
        this.pauseHandler.destroy();
        this.pauseHandler = null;
    }

    if (this.notesHandler) {
      this.notesHandler.shutdown()
      this.notesHandler = null
    }
    if (this.charactersHandler) {
      this.charactersHandler.shutdown()
      this.charactersHandler = null
    }
    if (this.stageHandler) {
      this.stageHandler.shutdown()
      this.stageHandler = null
    }

    this.children.removeAll(true)

    if (this.healthBar) {
      this.healthBar.destroy()
      this.healthBar = null
    }
    if (this.timeBar) {
      this.timeBar.destroy()
      this.timeBar = null
    }
    if (this.ratingText) {
      this.ratingText.destroy()
      this.ratingText = null
    }
    if (this.scoreManager) {
      this.scoreManager.destroy()
      this.scoreManager = null
    }
    if (this.funWaiting) {
      this.funWaiting.destroy()
      this.funWaiting = null
    }
    if (this.cameraManager) {
      this.cameraManager.shutdown(this)
      this.cameraManager = null
    }
    if (this.popUpManager) {
      this.popUpManager.shutdown()
      this.popUpManager = null
    }
    if (this.countdown) {
      this.countdown.stop()
      this.countdown = null
    }

    if (this.conductor) {
      this.conductor.stop()
      this.conductor = null
    }

    SongPlayer.shutdown(this, this.chartData, this.songAudio)
    ChartDataHandler.shutdown(this, this.initData?.targetSongId, this.initData?.DifficultyID || "normal")
    PlaySceneData.shutdown(this)
    
    this.playSessionId = null;
    this.tempNoteSkin = null;

    console.log("PlayScene shutdown complete - all sprites and textures cleaned")
  }
}

game.scene.add("PlayScene", PlayScene );