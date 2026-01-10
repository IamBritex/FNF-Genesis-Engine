/**
 * funkin/play/PlayScene.js
 */
import { PlaySceneData } from "./data/PlaySceneData.js"
import { SongPlayer } from "./song/SongPlayer.js"
import { ChartDataHandler } from "./data/chartData.js"
import { NotesHandler } from "./notes/NotesHandler.js"
import { CameraManager } from "./camera/Camera.js"
import { Stage } from "./stage/Stage.js"
import { Characters } from "./characters/Characters.js"
import { PopUpManager } from "./judgments/PopUpManager.js"
import { Countdown } from "./countDown.js"
import { TimeBar } from "./components/timeBar.js"
import { HealthBar } from "./health/healthBar.js"
import { RatingText } from "./judgments/RatingText.js"
import { Score } from "./judgments/Score.js"
import { Conductor } from "./data/Conductor.js"
import { FunWaiting } from "./components/FunWaiting.js"
import { NoteSkin } from "./notes/NoteSkin.js"
import { ScriptHandler } from "./scripting/ScriptHandler.js"
import ModHandler from "../../core/ModHandler.js"
import { PlaySceneCleanup } from "./components/PlaySceneCleanup.js"

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
    this.scriptHandler = null

    this.isWaitingOnLoad = true
    this.isInCountdown = false
    this.countdownStartTime = 0
    this.songStartTime = 0

    this.playSessionId = null
    this.deathCounter = 0
    this.onWindowBlur = null
    this.tempNoteSkin = null

    this.pauseKeys = null
    this.resetKey = null
  }

  init(data) {
    this.sound.stopAll()
    this.playSessionId = Date.now().toString() + Math.floor(Math.random() * 1000)
    console.log(`PlayScene initialized with Session ID: ${this.playSessionId}`)

    const registryData = this.registry.get("PlaySceneData")
    const finalData = registryData || data
    this.registry.set("PlaySceneData", undefined)

    this.initData = PlaySceneData.init(this, finalData)
    this.deathCounter = data.deathCounter || 0
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

    if (!this.cache.audio.has("menuMusic")) {
      this.load.audio("menuMusic", "public/music/FreakyMenu.mp3")
    }

    PopUpManager.preload(this)
    Countdown.preload(this)
    TimeBar.preload(this)
    HealthBar.preload(this, this.playSessionId)
  }

  async create() {
    if (window.Genesis && window.Genesis.discord) {
      Genesis.discord.setActivity({
        details: `Playing ${this.initData.targetSongId}`,
        state: "Play State"
      })
    }

    this.pauseKeys = this.input.keyboard.addKeys({
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      esc: Phaser.Input.Keyboard.KeyCodes.ESC
    })

    this.setupResetControl()

    this.assetsLoaded = false
    this.isWaitingOnLoad = true

    this.cameraManager = new CameraManager(this)
    this.funWaiting = new FunWaiting(this, this.cameraManager)
    this.funWaiting.createOverlay()
    this.scoreManager = new Score(this)
    this.popUpManager = new PopUpManager(this, this.cameraManager)
    this.countdown = new Countdown(this, this.cameraManager)

    this.timeBar = new TimeBar(this)
    this.timeBar.create()
    this.cameraManager.assignToUI(this.timeBar.container)

    this.keyI = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I)
    this.keyK = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K)
    this.keyJ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J)
    this.keyL = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L)

    await this.startChartLoading()
  }

  setupResetControl() {
    let canReset = true
    let resetBind = "R"

    try {
      const stored = localStorage.getItem('genesis_preferences')
      if (stored) {
        const prefs = JSON.parse(stored)

        if (prefs && typeof prefs['opt-reset'] !== 'undefined') {
          canReset = prefs['opt-reset']
        }

        if (prefs && prefs['keybind_reset_0']) {
          resetBind = prefs['keybind_reset_0']
        }
      }
    } catch (e) {
      console.warn("PlayScene: Error leyendo preferencias para Reset:", e)
    }

    if (canReset) {
      let finalKey = resetBind
      if (finalKey.startsWith("Key")) finalKey = finalKey.replace("Key", "")

      try {
        this.resetKey = this.input.keyboard.addKey(finalKey.toUpperCase())
        console.log(`[PlayScene] Reset activado con tecla: ${finalKey.toUpperCase()}`)
      } catch (err) {
        console.warn(`[PlayScene] Tecla de reset '${finalKey}' inválida, usando R por defecto.`)
        this.resetKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R)
      }
    } else {
      console.log("[PlayScene] Reset desactivado por opciones.")
    }
  }

  triggerReset() {
    console.log("Reiniciando escena (Reset manual)...")

    if (this.songAudio) {
      if (this.songAudio.inst) this.songAudio.inst.stop()
      if (this.songAudio.voices) {
        this.songAudio.voices.forEach(v => { if (v) v.stop() })
      }
    }

    this.scene.restart(this.initData)
  }

  async startChartLoading() {
    await ChartDataHandler.preloadChart(this, this.initData.targetSongId, this.initData.DifficultyID || "normal")

    this.load.once('complete', () => {
      this.processChartAndEvents()
    })
    this.load.start()
  }

  async processChartAndEvents() {
    this.chartData = ChartDataHandler.processChartData(
      this,
      this.initData.targetSongId,
      this.initData.DifficultyID || "normal",
    )
    if (!this.chartData) {
      this.exitToMenu()
      return
    }

    if (this.chartData.events === true) {
      console.log("[PlayScene] Events: true detectado. Buscando Events.json...")

      const songId = this.initData.targetSongId
      const eventsKey = `Events_${songId}`
      let eventsPath = await ModHandler.getPath('songs', `${songId}/charts/Events.json`)

      if (eventsPath && typeof eventsPath !== 'string') {
        if (eventsPath instanceof Blob || eventsPath instanceof File) {
          eventsPath = URL.createObjectURL(eventsPath)
        }
      }

      if (typeof eventsPath === 'string') {
        this.load.json(eventsKey, eventsPath)

        this.load.once('complete', () => {
          const eventsJson = this.cache.json.get(eventsKey)
          if (eventsJson && Array.isArray(eventsJson.events)) {
            this.chartData.events = eventsJson.events
          } else {
            this.chartData.events = []
          }
          this.continueCreate()
        })

        this.load.start()
        return
      } else {
        console.warn("[PlayScene] No se pudo resolver la ruta de Events.json o es inválida.")
        this.chartData.events = []
        this.continueCreate()
        return
      }
    }

    this.continueCreate()
  }

  async continueCreate() {
    this.conductor = new Conductor(this.chartData.bpm)

    this.scriptHandler = new ScriptHandler(this)
    if (this.chartData.events && Array.isArray(this.chartData.events)) {
      await this.scriptHandler.loadEventScripts(this.chartData.events)
    }

    this.conductor.on('beat', (beat) => this.scriptHandler.call('onBeatHit', beat))
    this.conductor.on('step', (step) => this.scriptHandler.call('onStepHit', step))

    this.tempNoteSkin = new NoteSkin(this, this.chartData)
    await this.tempNoteSkin.preloadJSON()

    this.healthBar = new HealthBar(this, this.chartData, this.conductor, this.playSessionId)
    this.stageHandler = new Stage(this, this.chartData, this.cameraManager, this.conductor)
    this.charactersHandler = new Characters(this, this.chartData, this.cameraManager, this.stageHandler, this.conductor, this.playSessionId)

    await this.stageHandler.loadStageJSON()
    await this.charactersHandler.loadCharacterJSONs()
    this.healthBar.loadCharacterData()

    await SongPlayer.loadSongAudio(this, this.initData.targetSongId, this.chartData)

    this.load.once("complete", this.onAllDataLoaded, this)
    this.load.start()

    this.onWindowBlur = () => {
      if (!this.scene || !this.sys || !this.sys.isActive()) return

      let shouldAutoPause = true
      try {
        const stored = localStorage.getItem('genesis_preferences')
        if (stored) {
          const prefs = JSON.parse(stored)
          if (prefs && typeof prefs['opt-autopause'] !== 'undefined') {
            shouldAutoPause = prefs['opt-autopause']
          }
        }
      } catch (e) {
        console.warn("PlayScene: Error leyendo preferencia opt-autopause:", e)
      }

      if (shouldAutoPause && !this.isWaitingOnLoad && this.sys.settings.active) {
        console.log("Ventana perdió foco: Auto-pausando juego.")
        this.triggerPause()
      }
    }
    this.game.events.on('blur', this.onWindowBlur)
  }

  async onAllDataLoaded() {
    if (this.assetsLoaded) return

    if (this.tempNoteSkin) await this.tempNoteSkin.loadAssets()
    if (this.stageHandler) await this.stageHandler.loadStageImages()
    if (this.charactersHandler) await this.charactersHandler.processAndLoadImages()
    if (this.healthBar) this.healthBar.preloadIcons()

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

    if (this.stageHandler) this.stageHandler.createStageElements()
    if (this.charactersHandler) this.charactersHandler.createAnimationsAndSprites()

    this.notesHandler = new NotesHandler(this, this.chartData, this.scoreManager, this.conductor, this.playSessionId)
    this.cameraManager.assignToUI(this.notesHandler.mainUICADContainer)
    this.notesHandler.mainUICADContainer.setDepth(2)

    if (this.notesHandler.notesContainer) {
      this.cameraManager.assignToUI(this.notesHandler.notesContainer)
      this.notesHandler.notesContainer.setDepth(2)
    }

    if (this.notesHandler && this.charactersHandler) {
      this.notesHandler.setCharactersHandler(this.charactersHandler)
    }

    if (this.charactersHandler) {
      this.charactersHandler.startBeatSystem()
      this.charactersHandler.dance()
    }

    if (this.stageHandler) {
      this.stageHandler.dance()
    }

    if (this.scriptHandler) this.scriptHandler.call('onCreatePost')

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

    if (this.scriptHandler) this.scriptHandler.call('onStartCountdown')

    this.countdown.performCountdown(beatLengthMs, () => {
      if (!this.scene) return
      this.isInCountdown = false

      if (this.scriptHandler) this.scriptHandler.call('onSongStart')

      this.songAudio = SongPlayer.playSong(this, this.chartData)

      if (this.songAudio?.inst) {
        const durationMs = this.songAudio.inst.duration * 1000
        if (this.timeBar) this.timeBar.setTotalDuration(durationMs)
        this.songAudio.inst.on("complete", this.onSongComplete, this)
      }
    })
  }

  debugCameraControls(delta) {
    if (!this.keyI || !this.cameraManager || !this.cameraManager.gameCamera) return
    const moveSpeed = 1000 * (delta / 1000)

    if (this.keyI.isDown) this.cameraManager.gameCamera.scrollY -= moveSpeed
    if (this.keyK.isDown) this.cameraManager.gameCamera.scrollY += moveSpeed
    if (this.keyJ.isDown) this.cameraManager.gameCamera.scrollX -= moveSpeed
    if (this.keyL.isDown) this.cameraManager.gameCamera.scrollX += moveSpeed
  }

  triggerPause() {
    if (this.songAudio) {
      if (this.songAudio.inst && this.songAudio.inst.isPlaying) this.songAudio.inst.pause()
      if (this.songAudio.voices) {
        this.songAudio.voices.forEach(v => { if (v.isPlaying) v.pause() })
      }
    }

    const diff = this.initData.DifficultyID ? this.initData.DifficultyID.toUpperCase() : "NORMAL"
    this.scene.launch('PauseScene', {
      parent: this,
      songName: this.initData.targetSongId,
      difficulty: diff,
      deaths: this.deathCounter
    })

    this.scene.pause()
  }

  resumeFromPause() {
    if (this.songAudio) {
      if (this.songAudio.inst && this.songAudio.inst.isPaused) this.songAudio.inst.resume()
      if (this.songAudio.voices) {
        this.songAudio.voices.forEach(v => { if (v.isPaused) v.resume() })
      }
    }
    this.scene.resume()
  }

  update(time, delta) {
    if (!this.isWaitingOnLoad) {
      if (Phaser.Input.Keyboard.JustDown(this.pauseKeys.enter) || Phaser.Input.Keyboard.JustDown(this.pauseKeys.esc)) {
        this.triggerPause()
        return
      }

      if (this.resetKey && Phaser.Input.Keyboard.JustDown(this.resetKey)) {
        this.triggerReset()
        return
      }
    }

    if (this.isWaitingOnLoad) return

    if (this.scriptHandler && this.assetsLoaded) {
      this.scriptHandler.call('onUpdate', delta, time)

      let currentPos = 0
      if (this.isInCountdown) {
        currentPos = time - this.songStartTime
      } else if (this.songAudio?.inst?.isPlaying) {
        currentPos = this.songAudio.inst.seek * 1000
      }
      this.scriptHandler.processEvents(currentPos)
    }

    this.debugCameraControls(delta)

    if (!this.assetsLoaded) return

    let songPosition
    if (this.isInCountdown) {
      songPosition = time - this.songStartTime
      if (this.charactersHandler) this.charactersHandler.update(songPosition)
      if (this.notesHandler) this.notesHandler.update(songPosition)
    } else {
      if (!this.songAudio?.inst?.isPlaying) {
        if (this.charactersHandler) this.charactersHandler.update(0)
        if (this.conductor) this.conductor.updateFromSong(0)
        return
      }

      songPosition = this.songAudio.inst.seek * 1000

      if (this.notesHandler) this.notesHandler.update(songPosition)
      if (this.charactersHandler) this.charactersHandler.update(songPosition)
    }

    if (this.conductor) this.conductor.updateFromSong(songPosition)
    if (this.timeBar) this.timeBar.update(songPosition)
    if (this.healthBar) {
      this.healthBar.updateHealth(delta / 1000)
      this.healthBar.updateBeatBounce(songPosition, delta)
    }
  }

  damage(amount = 1) {
    if (this.healthBar) this.healthBar.damage(amount)
  }

  heal(amount = 1) {
    if (this.healthBar) this.healthBar.heal(amount)
  }

  onSongComplete() {
    if (this.scriptHandler) this.scriptHandler.call('onSongEnd')
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
    this.initData.deathCounter = this.deathCounter
    this.scene.restart(this.initData)
  }

  exitToMenu() {
    const nextSceneKey = this.initData?.isStoryMode ? "StoryModeScene" : "FreeplayScene"
    this.scene.stop('PauseScene')
    this.scene.start(nextSceneKey)
  }

  shutdown() {
    PlaySceneCleanup.shutdown(this)
  }
}

game.scene.add("PlayScene", PlayScene)