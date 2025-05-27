import { LoadingScreen } from "../visuals/objects/Loading.js"
import { AudioManager } from "../visuals/objects/AudioManager.js"
import { DataManager } from "../visuals/objects/DataManager.js"
import { NotesController } from "../visuals/objects/NotesController.js"
import { CountdownManager } from "../visuals/objects/CountdownManager.js"
import { RatingManager } from "../visuals/objects/RatingManager.js"
import { Characters } from "../visuals/objects/Characters.js"
import { CameraController } from "../visuals/objects/Camera.js"
import { RatingText } from "../visuals/objects/RatingText.js"
import { HealthBar } from "../visuals/objects/HealthBar.js"
import { StageManager } from "../visuals/objects/StageManager.js"
import { TimeBar } from "../visuals/objects/TimeBar.js"
import { Paths } from "../../utils/Paths.js"

export class PlayState extends Phaser.Scene {
  constructor() {
    super({ key: "PlayState" })
    this._initProperties()
    this.loadingScreen = new LoadingScreen(this)
  }

  _initProperties() {
    // Pantalla de carga
    this._loadingDots = 0
    this._loadingText = null
    this._loadingAnim = null
    this._isCreating = false

    // Estado del juego
    this.songPosition = 0
    this.isMusicPlaying = false
    this.lastBeat = -1

    // Datos de la canción
    this.songData = null
    this.currentBPM = 0
    this.bpmChangePoints = []

    // Instancias de audio
    this.currentInst = null
    this.currentVoices = null

    // Componentes del juego
    this.audioManager = null
    this.dataManager = null
    this.arrowsManager = null
    this.countdownManager = null
    this.ratingManager = null
    this.characters = null
    this.stageManager = null
    this.cameraController = null
    this.ratingText = null
    this.healthBar = null

    // UI y assets
    this.healthBarIcons = {}
    this.healthBarColors = {}
    this.loadingImage = null
    this.loadBar = null
    this.timeBar = null
  }

  init(data) {
    this._initializeManagers()
    this._resetGameState()
    
    // Asegurarnos de que el DataManager reciba todos los datos necesarios
    if (data) {
        this.dataManager.init({
            isStoryMode: data.isStoryMode,
            storyPlaylist: data.storyPlaylist || [],
            selectedDifficulty: data.selectedDifficulty,
            currentSongIndex: data.currentSongIndex || 0,
            campaignScore: data.campaignScore || 0,
            campaignMisses: data.campaignMisses || 0,
            weekName: data.weekName,
            weekBackground: data.weekBackground,
            weekCharacters: data.weekCharacters,
            weekTracks: data.weekTracks
        });
    }
    
    this._clearSongCache()
  }

  _initializeManagers() {
    this.audioManager = new AudioManager(this)
    this.dataManager = new DataManager(this)
    this.arrowsManager = new NotesController(this)
    this.countdownManager = new CountdownManager(this)
    this.ratingManager = new RatingManager(this)
    this.characters = new Characters(this)
    this.stageManager = new StageManager(this)
  }

  _resetGameState() {
    this.songPosition = 0
    this.isMusicPlaying = false
    this.lastBeat = -1
    this.currentInst = null
    this.currentVoices = null
    this.currentBPM = 0
    this.bpmChangePoints = []
  }

  _clearSongCache() {
    if (this.cache.json.exists("songData")) {
      this.cache.json.remove("songData")
    }
  }

  preload() {
    this.load.reset()
    this._loadCoreAssets()
    this.countdownManager.preload()
    this._loadSongData()
  }

  _loadCoreAssets() {
    // Assets de UI
    this.load.image("healthBar", Paths.HEALTH_BAR)
    this.load.image("funkay", Paths.FUNKAY)
    this.load.image("timeBar", Paths.TIME_BAR)

    // Sonidos
    this.load.audio("missnote1", Paths.MISS_NOTE_1)
    this.load.audio("missnote2", Paths.MISS_NOTE_2)
    this.load.audio("missnote3", Paths.MISS_NOTE_3)
    this.load.audio("freakyMenu", Paths.FREAKY_MENU)

    // Assets de notas
    this.load.atlasXML("notes", Paths.NOTES.TEXTURE, Paths.NOTES.ATLAS)
    this.load.atlasXML("noteStrumline", Paths.NOTE_STRUMLINE.TEXTURE, Paths.NOTE_STRUMLINE.ATLAS)
    this.load.atlasXML("NOTE_hold_assets", Paths.NOTE_HOLD_ASSETS.TEXTURE, Paths.NOTE_HOLD_ASSETS.ATLAS)
  }

  _loadSongData() {
    // Verificar si tenemos datos de canción
    if (this.dataManager.isStoryMode) {
        if (this.dataManager.storyPlaylist?.length > this.dataManager.currentSongIndex) {
            const currentSong = this.dataManager.storyPlaylist[this.dataManager.currentSongIndex];
            console.log('Cargando canción de Story Mode:', currentSong);
            return true;
        } else {
            console.error("No hay más canciones en la playlist de Story Mode.");
            this.redirectToNextState();
            return false;
        }
    } else if (this.dataManager.songList?.length > 0) {
        const currentSong = this.dataManager.songList[this.dataManager.currentSongIndex];
        console.log('Cargando canción de Freeplay:', currentSong);
        return true;
    } else {
        console.error("No hay canciones para cargar. DataManager:", {
            isStoryMode: this.dataManager.isStoryMode,
            storyPlaylist: this.dataManager.storyPlaylist,
            songList: this.dataManager.songList,
            currentSongIndex: this.dataManager.currentSongIndex
        });
        this.redirectToNextState();
        return false;
    }
  }

  async _loadSongChart(currentSong) {
    try {
      const difficulty = this.dataManager.storyDifficulty;
      let chartPath = '';
      
      // Construir la ruta del chart basada en la dificultad
      if (difficulty === 'normal') {
        // Para dificultad normal, usar el nombre base de la canción sin sufijo
        chartPath = `public/assets/audio/songs/${currentSong}/charts/${currentSong}.json`;
      } else {
        // Para easy y hard, añadir el sufijo de dificultad
        chartPath = `public/assets/audio/songs/${currentSong}/charts/${currentSong}-${difficulty}.json`;
      }

      console.log('Intentando cargar chart:', chartPath);
      
      const response = await fetch(chartPath);
      if (!response.ok) throw new Error(`HTTP ${response.status} para ${chartPath}`);
      this.songData = await response.json();
      
    } catch (e) {
      console.warn(`Usando chart por defecto para ${currentSong} debido a:`, e.message);
      try {
        // Intentar cargar el chart por defecto (sin sufijo de dificultad)
        const defaultPath = `public/assets/audio/songs/${currentSong}/charts/${currentSong}.json`;
        console.log('Intentando cargar chart por defecto:', defaultPath);
        
        const response = await fetch(defaultPath);
        if (!response.ok)
          throw new Error(`HTTP ${response.status} para chart por defecto ${defaultPath}`);
        this.songData = await response.json();
      } catch (defaultError) {
        console.error(`Error cargando chart para ${currentSong}:`, defaultError.message);
        throw defaultError;
      }
    }

    if (!this.songData?.song) throw new Error("Datos de canción inválidos o no cargados.")
  }

  async _loadSongAssets(currentSong) {
    await this.audioManager.loadSongAudio(currentSong)
    await this.preloadCharacterAssets(this.songData) // Asume que songData ya está cargado
  }

  _initializeSongComponents() {
    if (!this.songData?.song) {
      console.error("No hay datos de canción para inicializar componentes.")
      return
    }

    this.cameraController.updateBPM(this.songData.song.bpm)
    this.processBPMChanges(this.songData)
    this.arrowsManager.loadNotes(this.songData)
  }

  _completeLoading() {
    // Esto parece ser parte de una pantalla de carga interna, no de Phaser
    this._safeDestroy(this.loadingImage)
    this._safeDestroy(this.loadBar)

    // this.cameras.main.setBackgroundColor("#000000"); // main cámara está desactivada
    if (this.cameraController && this.cameraController.gameCamera) {
      this.cameraController.gameCamera.setBackgroundColor("#000000")
    }
    this.dataManager.showData()
  }

  async preloadCharacterAssets(songData) {
    if (!songData?.song) {
      console.error("Datos de canción inválidos para precargar assets de personajes:", songData)
      return
    }

    const characterIds = this._getCharacterIds(songData)
    if (characterIds.length === 0) {
      // console.warn("No se encontraron IDs de personajes para cargar.");
      return
    }
    await this._loadCharactersData(characterIds)
  }

  _getCharacterIds(songData) {
    const { player1, player2, gfVersion } = songData.song
    const characterIds = []
    if (player1) characterIds.push(player1)
    if (player2) characterIds.push(player2)
    if (gfVersion) characterIds.push(gfVersion) // Asumiendo que gfVersion es un ID de personaje
    return characterIds.filter(Boolean) // Filtra nulos o undefined
  }

  async _loadCharactersData(characterIds) {
    const loadPromises = characterIds.map((characterId) => this._loadSingleCharacter(characterId))
    await Promise.all(loadPromises)
  }

  async _loadSingleCharacter(characterId) {
    try {
      // Evitar recargar si ya tenemos los datos y assets (esto es una optimización, revisar si aplica siempre)
      // if (this.healthBarColors[characterId] && this.healthBarIcons[characterId] && this.textures.exists(`character_${characterId}`)) {
      //     return;
      // }

      const response = await fetch(Paths.getCharacterData(characterId))
      if (!response.ok) throw new Error(`HTTP ${response.status} para ${Paths.getCharacterData(characterId)}`)
      const characterData = await response.json()

      this._processCharacterHealthData(characterId, characterData)
      await this._loadCharacterTextures(characterId, characterData)
    } catch (error) {
      console.error(`Error cargando personaje ${characterId}:`, error.message)
      // Decidir si re-lanzar el error o continuar sin el personaje
      // throw error; // Si es crítico
    }
  }

  _processCharacterHealthData(characterId, characterData) {
    if (
      characterData.healthbar_colors &&
      Array.isArray(characterData.healthbar_colors) &&
      characterData.healthbar_colors.length === 3
    ) {
      const [r, g, b] = characterData.healthbar_colors
      const color =
        (Math.min(255, Math.max(0, Math.floor(r))) << 16) |
        (Math.min(255, Math.max(0, Math.floor(g))) << 8) |
        Math.min(255, Math.max(0, Math.floor(b)))
      this.healthBarColors[characterId] = color
    }

    if (characterData.healthicon) {
      this.healthBarIcons[characterId] = characterData.healthicon
    }
  }

  async _loadCharacterTextures(characterId, characterData) {
    const textureKey = `character_${characterId}`
    if (this.textures.exists(textureKey)) return

    const sprites = Paths.getCharacterSprites(characterData) // Asume que esto devuelve { TEXTURE: 'path', ATLAS: 'path' }
    if (!sprites || !sprites.TEXTURE || !sprites.ATLAS) {
      console.warn(`No se encontraron rutas de sprites para el personaje ${characterId}`)
      return
    }

    // Cargar atlas XML
    this.load.atlasXML(textureKey, sprites.TEXTURE, sprites.ATLAS)
    // No se necesita Promise aquí si se maneja con el 'complete' global de Phaser o se carga en preload.
    // Si se necesita esperar específicamente, la gestión de promesas con this.load.start() es más compleja.
    // Normalmente, se deja que el loader de Phaser maneje la cola y se espera al evento 'complete' de la escena.
  }

  async preloadHealthIcons() {
    if (!this.healthBarIcons || !this.songData?.song) {
      console.error("No hay datos de iconos de salud o de canción para cargar.")
      return
    }

    const { player1, player2 } = this.songData.song
    const characterIdsWithIcons = [player1, player2].filter((id) => this.healthBarIcons[id])

    if (characterIdsWithIcons.length === 0) return

    characterIdsWithIcons.forEach((characterId) => {
      const iconName = this.healthBarIcons[characterId]
      const iconKey = `icon-${iconName}`

      // No es necesario remover y recargar si ya existe, a menos que el asset pueda cambiar dinámicamente.
      if (!this.textures.exists(iconKey)) {
        this.load.image(iconKey, Paths.getCharacterIcon(iconName))
      }
    })
    // Dejar que el loader de Phaser maneje la carga. Si se necesita esperar, usar this.load.start() y eventos.
  }

  async _createHealthBar() {
    if (!this.songData?.song) {
      console.error("No hay datos de canción para crear la HealthBar.")
      return
    }

    const { player1, player2 } = this.songData.song
    const p1IconName = this.healthBarIcons[player1]
    const p2IconName = this.healthBarIcons[player2]

    if (!p1IconName || !p2IconName) {
      console.warn("Faltan nombres de iconos para los jugadores en HealthBar.", { p1IconName, p2IconName })
      return
    }

    this.healthBar = new HealthBar(this, {
      p1Color: this.healthBarColors[player1] !== undefined ? this.healthBarColors[player1] : 0xffffff,
      p2Color: this.healthBarColors[player2] !== undefined ? this.healthBarColors[player2] : 0xffffff,
      p1Icon: p1IconName,
      p2Icon: p2IconName,
      position: {
        x: this.scale.width / 2,
        y: this.scale.height - 70,
      },
    })

    // Forzar la adición a la capa UI
    if (this.healthBar.container) {
      this.cameraController.addToUILayer(this.healthBar.container)
      console.log("HealthBar añadido a la capa UI")
    }
  }

  async create() {
    console.log("PlayState iniciado.")
    this._setupInitialState() // Configura cameraController aquí.
    this.loadingScreen.setup() // Configura la pantalla de carga visual.

    try {
      this.loadingScreen.setCreatingMode(true) // Mostrar "Creating..."
      this.loadingScreen.setCurrentItem("Song Data") // Informar al usuario

      // Cargar datos de la canción y assets básicos necesarios ANTES de crear elementos de juego
      const currentSong = this.dataManager.songList[this.dataManager.currentSongIndex]
      if (!currentSong) throw new Error("No hay canción actual para cargar en create.")

      await this._loadSongChart(currentSong) // Carga el JSON de la canción
      await this._loadSongAssets(currentSong) // Carga audio y assets de personajes (texturas)
      await this.preloadHealthIcons() // Carga texturas de iconos de vida

      // Iniciar la carga de assets en Phaser si hay algo en la cola
      if (this.load.totalToLoad > 0) {
        this.loadingScreen.setCurrentItem("Loading Assets")
        await new Promise((resolve) => {
          this.load.on("complete", resolve)
          this.load.start()
        })
      }

      this.loadingScreen.setCurrentItem("Game Components")
      await this._initializeGameComponents() // Inicializa managers, personajes, notas con datos cargados

      this.loadingScreen.setCurrentItem("Game Elements")
      this._setupGameElements() // Añade elementos a la capa del juego

      this.loadingScreen.setCurrentItem("User Interface")
      this._setupUICameraElements() // Añade elementos a la capa UI

      // Clasificar todos los elementos de la escena
      this.loadingScreen.setCurrentItem("Organizing Elements")
      this.cameraController.classifyAllSceneElements()

      this.loadingScreen.setCurrentItem("Controls")
      this._setupInputHandlers()

      this.loadingScreen.setCurrentItem("Preparing Game")
      this._startCountdown()

      this.loadingScreen.destroy() // Ocultar pantalla de carga
      this.events.emit("createcomplete")

      // Asegurar que las cámaras estén visibles
      if (this.cameraController) {
        this.cameraController.gameCamera.setVisible(true)
        this.cameraController.uiCamera.setVisible(true)
      }
    } catch (error) {
      console.error("Error detallado en PlayState create():", error)
      this.loadingScreen.destroy(); // Changed from hide() to destroy()
      this.redirectToNextState() // O manejar el error de forma más elegante
    }
  }

  _setupInitialState() {
    this.sound.stopAll()
    this.dataManager.setupF3Toggle()
    this.dataManager.setStartTime(this.time.now)

    // CameraController debe crearse aquí y estar disponible para todo el flujo
    this.cameraController = new CameraController(this)

    // Asegurar que las cámaras estén visibles
    this.cameraController.gameCamera.setVisible(true)
    this.cameraController.uiCamera.setVisible(true)
  }

  async _initializeGameComponents() {
    if (!this.songData?.song) {
      throw new Error("Datos de canción no disponibles en _initializeGameComponents")
    }

    this._initializeSongComponents()

    // Primero inicializar el stage y los personajes (capa de juego)
    if (this.songData.song.stage) {
      await this.stageManager.loadStage(this.songData.song.stage)
    }
    await this.characters.loadCharacterFromSong(this.songData)

    // Luego inicializar los elementos UI
    await this.ratingManager.create()
    await this._createHealthBar()
    await this.arrowsManager.init()

    // Asegurar que los elementos UI estén en la capa correcta
    if (this.cameraController) {
      if (this.ratingManager?.container) {
        this.cameraController.addToUILayer(this.ratingManager.container)
      }
      if (this.healthBar?.container) {
        this.cameraController.addToUILayer(this.healthBar.container)
      }
    }

    // Crear nuevo RatingText para cada canción
    if (this.ratingText) {
      this.ratingText.destroy()
    }
    this.ratingText = new RatingText(this)

    // Asegurar que esté en la capa UI
    if (this.cameraController && this.ratingText?.container) {
      this.cameraController.addToUILayer(this.ratingText.container)
    }
  }

  _setupGameElements() {
    if (!this.cameraController) return

    // Asegurarse de que los elementos del juego se añadan SOLO a gameLayer
    if (this.stageManager?.container) {
      this.stageManager.container.setName("Stage_container")
      this.cameraController.addToGameLayer(this.stageManager.container)
    }

    if (this.characters?.container) {
      this.characters.container.setName("Characters_container")
      this.cameraController.addToGameLayer(this.characters.container)
    }

    // Asegurar que todos los elementos del juego sean visibles
    if (this.stageManager?.container) this.stageManager.container.setVisible(true)
    if (this.characters?.container) this.characters.container.setVisible(true)
  }

  _setupUICameraElements() {
    if (!this.cameraController) return

    // Crear y configurar RatingText
    if (!this.ratingText) {
      this.ratingText = new RatingText(this)
    }

    // Crear y configurar HealthBar si no existe
    if (!this.healthBar) {
      this._createHealthBar()
    }

    // Asegurarse de que los elementos UI estén en la capa correcta
    const uiElements = [
      { container: this.healthBar?.container, name: "HealthBar_container" },
      { container: this.ratingText?.container, name: "RatingText_container" },
      { container: this.timeBar?.container, name: "TimeBar_container" },
      { container: this.ratingManager?.container, name: "RatingManager_container" },
    ]

    // Añadir cada elemento UI a la capa UI
    uiElements.forEach((element) => {
      if (element.container) {
        element.container.setName(element.name)
        this.cameraController.addToUILayer(element.container)
        element.container.setVisible(true)
      }
    })

    // Añadir flechas a la capa UI
    if (this.arrowsManager?.uiElements) {
      this.arrowsManager.uiElements
        .filter(Boolean)
        .forEach((element, index) => {
          element.setName(`Arrow_${index}`)
          this.cameraController.addToUILayer(element)
          element.setVisible(true)
        })
    }

    // Forzar actualización de las capas de la cámara
    this.cameraController._setupCameraLayers()
  }

  _setupInputHandlers() {
    this.arrowsManager.setupInputHandlers()
    this.arrowsManager.ratingManager = this.ratingManager // Enlazar ratingManager

    // Debug handlers
    this.input.keyboard.on("keydown-V", () => {
      if (this.cameraController) {
        this.cameraController.toggleUICamera()
      }
    })

    this.input.keyboard.on("keydown-F2", () => {
      if (this.cameraController) {
        this.cameraController.debugCameras()
      }
    })

    // Añadir tecla para mostrar/ocultar límites de cámaras
    this.input.keyboard.on("keydown-F3", () => {
      if (this.cameraController) {
        this.cameraController.toggleCameraBounds()
      }
    })

    // Añadir tecla para forzar la clasificación de todos los elementos
    this.input.keyboard.on("keydown-F4", () => {
      if (this.cameraController) {
        console.log("Forzando clasificación de todos los elementos...")
        this.cameraController.classifyAllSceneElements()
        this.cameraController.debugCameras()
      }
    })

    // Añadir tecla para alternar visibilidad de cámara de juego
    this.input.keyboard.on("keydown-F5", () => {
      if (this.cameraController && this.cameraController.gameCamera) {
        this.cameraController.gameCamera.visible = !this.cameraController.gameCamera.visible
        console.log("Visibilidad de Game Camera:", this.cameraController.gameCamera.visible)
        this.cameraController.debugCameras()
      }
    })
  }

  _startCountdown() {
    this.countdownManager.start(() => this.startMusic())
  }

  update(time, delta) {
    if (!this.isMusicPlaying || !this.currentInst || !this.songData) return

    // Actualizar posición de la canción
    // Usar el seek del audio es más preciso que acumular delta.
    this.songPosition = this.currentInst.seek * 1000
    if (this.timeBar) {
      this.timeBar.update(this.songPosition)
    }

    this._updateGameComponents(time, delta) // Pasa songPosition si es necesario
    this._updateBeatDetection() // Usa this.songPosition actualizado
    this._updateBPMChanges() // Usa this.songPosition actualizado
    this._updateUI(time, delta) // Actualizaciones de UI que dependen de time/delta
  }

  _updateSongPosition(delta) {
    // Ya se actualiza desde currentInst.seek en el método update principal
    // this.songPosition += delta; // Acumular delta puede llevar a desincronización.
  }

  _updateGameComponents(time, delta) {
    const elapsedSeconds = delta / 1000 // Para animaciones y físicas basadas en tiempo real

    this.stageManager?.update(time, delta) // O (elapsedSeconds) si es lo que espera
    this.characters?.update(elapsedSeconds) // Suponiendo que Characters.update usa segundos
    this.cameraController?.update(this.songPosition, time, delta) // CameraController usa songPosition y delta
    this.healthBar?.updateBeatBounce(this.songPosition, time, delta) // Similar a cameraController

    // arrowsManager necesita songPosition para saber qué notas mostrar/activar
    this.arrowsManager?.update(this.songPosition)
    // this.arrowsManager?.updateEnemyNotes(this.songPosition); // Si es una lógica separada
  }

  _updateBeatDetection() {
    // Asegurar que songData y bpm estén disponibles
    const bpm = this.currentBPM || this.songData?.song?.bpm || 100
    const beatTime = 60000 / bpm // Duración de un beat en ms

    if (beatTime <= 0) return // Evitar división por cero o BPM inválido

    const currentBeat = Math.floor(this.songPosition / beatTime)

    if (currentBeat > this.lastBeat) {
      this.characters?.onBeat(currentBeat)
      // Aquí también podrían ir otros efectos de beat como el de la cámara o healthbar,
      // si no se manejan con su propia lógica de bop/songPosition en sus updates.
      this.lastBeat = currentBeat
    }
  }

  _updateBPMChanges() {
    if (!this.bpmChangePoints || this.bpmChangePoints.length === 0) return;

    for (const change of this.bpmChangePoints) {
        if (this.songPosition >= change.time && this.currentBPM !== change.bpm) {
            console.log(`BPM Change: From ${this.currentBPM} to ${change.bpm} at time ${this.songPosition}`);
            this.currentBPM = change.bpm;
            
            // Actualizar BPM en todos los componentes necesarios
            this.cameraController?.updateBPM(this.currentBPM);
            this.arrowsManager?.updateScrollSpeed(this.currentBPM);
            this.characters?.updateBPM(this.currentBPM); // Añadir este método a Characters
            
            const beatTime = 60000 / this.currentBPM;
            this.lastBeat = Math.floor(this.songPosition / beatTime) - 1;
            break;
        }
    }
  }

  _updateUI(time, delta) {
    if (this.dataManager.isDataVisible) {
      this.dataManager.updateData(this.songPosition, this.currentBPM, this.lastBeat)
    }
    this.ratingText?.updateMainText(time) // Asumiendo que updateMainText maneja su propia lógica de tiempo
  }

  async startMusic() {
    const currentSong = this.dataManager.songList[this.dataManager.currentSongIndex]
    const audioInstances = this.audioManager.playSongAudio(currentSong)

    if (!audioInstances || !audioInstances.inst) {
      console.error("No se pudo reproducir la música, instancia de audio no válida.")
      this.isMusicPlaying = false
      // Considerar manejar este error, ej. reintentar o ir al siguiente estado.
      return
    }

    this.currentInst = audioInstances.inst
    this.currentVoices = audioInstances.voices // Puede ser null/undefined si no hay voces

    this.isMusicPlaying = true
    this.cameraController?.startBoping()
    this.dataManager.setStartTime(this.time.now - (this.currentInst.seek * 1000 || 0)) // Sincronizar con el tiempo actual de la música si ya empezó (seek > 0)

    // Crear y configurar TimeBar
    this.timeBar = new TimeBar(this)
    this.timeBar.create() // Asumiendo que create es async o devuelve una promesa
 // Asumiendo que create es async o devuelve una promesa

    // Asignar nombre al contenedor de TimeBar
    if (this.timeBar.container) {
      this.timeBar.container.setName("TimeBar_container")
    }

    if (this.currentInst.duration > 0) {
      this.timeBar.setTotalDuration(this.currentInst.duration * 1000)
    } else {
      // Si la duración no está disponible inmediatamente, escuchar evento 'durationchange' o similar
      this.currentInst.once("play", () => {
        // o 'canplaythrough' o cuando la duración esté disponible
        if (this.currentInst.duration > 0) {
          this.timeBar.setTotalDuration(this.currentInst.duration * 1000)
        }
      })
    }

    if (this.timeBar.container) {
      this.timeBar.container.setDepth(150) // Profundidad alta para estar sobre otros elementos UI
      this.cameraController?.addToUILayer(this.timeBar.container)
      this.timeBar.container.setVisible(true) // Asegurar que sea visible
    }

    this.currentInst.once("complete", () => this._handleSongCompletion())
    this.currentInst.once("stop", () => {
      // En caso de que se detenga por otra razón
      // console.log("Instancia de música detenida.");
      // this.isMusicPlaying = false; // Ya se maneja en _handleSongCompletion o shutdown
    })
  }

  async _cleanupBeforeRestart() {
    // Limpiar componentes actuales
    this.arrowsManager?.cleanup();
    this.ratingManager?.reset();
    this.characters?.cleanup();
    this.stageManager?.cleanup();
    this.healthBar?.destroy();
    this.ratingText?.destroy();
    this.timeBar?.destroy();
    
    // Limpiar audio
    this._safeStopAudio(this.currentVoices);
    this._safeStopAudio(this.currentInst);
    
    // Resetear estado
    this.songPosition = 0;
    this.isMusicPlaying = false;
    this.lastBeat = -1;
    
    // Limpiar datos de canción
    this.songData = null;
    
    // Resetear cámaras
    this.cameraController?.reset();
}

async _handleSongCompletion() {
    try {
        this.isMusicPlaying = false;
        
        // Detener audio actual
        this._safeStopAudio(this.currentVoices);
        this._safeStopAudio(this.currentInst);
        
        this.currentInst = null;
        this.currentVoices = null;

        // Verificar si estamos en modo historia
        if (this.dataManager.isStoryMode) {
            // Incrementar el índice de la canción actual
            this.dataManager.currentSongIndex++;
            
            // Verificar si hay más canciones en la playlist
            if (this.dataManager.currentSongIndex < this.dataManager.storyPlaylist.length) {
                console.log('Moving to next song:', this.dataManager.storyPlaylist[this.dataManager.currentSongIndex]);
                
                // Limpiar el estado actual
                await this._cleanupBeforeRestart();
                
                // Reiniciar la escena con la siguiente canción
                this.scene.restart({
                    isStoryMode: true,
                    storyPlaylist: this.dataManager.storyPlaylist,
                    currentSongIndex: this.dataManager.currentSongIndex,
                    selectedDifficulty: this.dataManager.storyDifficulty,
                    campaignScore: this.dataManager.campaignScore,
                    campaignMisses: this.dataManager.campaignMisses,
                    weekName: this.dataManager.weekName,
                    weekBackground: this.dataManager.weekBackground,
                    weekCharacters: this.dataManager.weekCharacters,
                    weekTracks: this.dataManager.weekTracks
                });
                return;
            }
        }
        
        // Si no hay más canciones o no estamos en modo historia
        this.playFreakyMenuAndRedirect();
    } catch (error) {
        console.error('Error in _handleSongCompletion:', error);
        this.playFreakyMenuAndRedirect();
    }
}

playFreakyMenuAndRedirect() {
    try {
        // Detener todos los sonidos primero
        this.sound.stopAll();
        
        // Limpiar la escena actual
        this._cleanupBeforeRestart();

        // Determinar la siguiente escena y los datos
        const nextScene = this.dataManager.isStoryMode ? 'StoryModeState' : 'FreeplayState';
        const sceneData = this.dataManager.isStoryMode ? {
            weekName: this.dataManager.weekName,
            weekBackground: this.dataManager.weekBackground,
            weekCharacters: this.dataManager.weekCharacters,
            campaignScore: this.dataManager.campaignScore,
            campaignMisses: this.dataManager.campaignMisses
        } : {};

        // Primero detener la escena actual
        this.scene.stop();

        // Iniciar la reproducción de la música y luego cambiar de escena
        const freakyMusic = this.sound.add('freakyMenu', {
            volume: 0.7,
            loop: true
        });

        freakyMusic.play();

        // Cambiar de escena
        this.scene.start(nextScene, sceneData);
    } catch (error) {
        console.error('Error during scene transition:', error);
        // Fallback en caso de error
        this.scene.start('MainMenuState');
    }
}

// Modificar redirectToNextState para que use la misma lógica
redirectToNextState() {
    try {
        this.playFreakyMenuAndRedirect();
    } catch (error) {
        console.error('Error during scene transition:', error);
        this.scene.start('MainMenuState');
    }
}

  processBPMChanges(songData) {
    if (!songData?.song) {
      console.warn("No song data available for BPM changes processing");
      return;
    }

    this.bpmChangePoints = [];
    this.currentBPM = songData.song.bpm || 100;

    // Check if there are any BPM changes in the song data
    if (songData.song.notes) {
      songData.song.notes.forEach(section => {
        if (section.changeBPM && section.bpm !== this.currentBPM) {
          this.bpmChangePoints.push({
            time: section.startTime,
            bpm: section.bpm
          });
        }
      });
    }
  
    // Sort BPM changes by time
    this.bpmChangePoints.sort((a, b) => a.time - b.time);
    
    console.log("Initial BPM:", this.currentBPM);
    console.log("BPM change points:", this.bpmChangePoints);
  }

  // Add this method to the PlayState class
  _safeStopAudio(audioInstance) {
    if (audioInstance && typeof audioInstance.stop === 'function') {
        try {
            audioInstance.stop();
        } catch (e) {
            console.warn('Error stopping audio instance:', e);
        }
    }
}}