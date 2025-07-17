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
import { PauseMenu } from "../visuals/objects/components/Pause.js"
import { ScriptHandler } from '../visuals/objects/components/ScriptHandler.js'
import { GameOver } from '../visuals/objects/components/GameOver.js'
import { ModManager } from '../../utils/ModDetect.js'  // Añadir esta importación

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
    this.pauseMenu = null;  // Asegurarse de que esto esté inicializado como null
    this.scriptHandler = null;
    this.gameOver = null;

    // UI y assets
    this.healthBarIcons = {}
    this.healthBarColors = {}
    this.loadingImage = null
    this.loadBar = null
    this.timeBar = null
  }

  init(data) {
    this._initializeManagers();
    this._resetGameState();
    
    // Asegurarnos de que el DataManager reciba todos los datos necesarios
    if (data) {
        this.dataManager.init({
            isStoryMode: data.isStoryMode,
            storyPlaylist: data.storyPlaylist || [],
            songList: data.songList || [],
            selectedDifficulty: data.selectedDifficulty,
            storyDifficulty: data.storyDifficulty,
            currentSongIndex: data.currentSongIndex || 0,
            campaignScore: data.campaignScore || 0,
            campaignMisses: data.campaignMisses || 0,
            weekName: data.weekName,
            weekBackground: data.weekBackground,
            weekCharacters: data.weekCharacters,
            weekTracks: data.weekTracks,
            // Explicitly pass mod data
            isMod: data.isMod,
            modPath: data.modPath,
            modName: data.modName
        });
    }
    
    this._clearSongCache();
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
    this.load.audio('breakfast', 'public/assets/audio/sounds/breakfast.ogg')
    this.load.audio('scrollMenu', 'public/assets/audio/sounds/scrollMenu.ogg') // Add this line

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
        let chartPath;
        
        // Check if we're in a mod context
        const isMod = Boolean(this.dataManager.isMod);
        const modPath = this.dataManager.modPath;
        
        console.log('Loading chart with context:', {
            isMod,
            modPath,
            currentSong,
            difficulty
        });

        // Try loading with difficulty first
        chartPath = isMod 
            ? `${modPath}/audio/songs/${currentSong}/charts/${currentSong}-${difficulty}.json`
            : `public/assets/audio/songs/${currentSong}/charts/${currentSong}-${difficulty}.json`;

        let response = await fetch(chartPath);
        
        // If not found with difficulty, try default chart
        if (!response.ok) {
            console.log(`Chart not found at ${chartPath}, trying default...`);
            chartPath = isMod
                ? `${modPath}/audio/songs/${currentSong}/charts/${currentSong}.json`
                : `public/assets/audio/songs/${currentSong}/charts/${currentSong}.json`;
                
            response = await fetch(chartPath);
        }

        if (!response.ok) {
            throw new Error(`Failed to load chart from ${chartPath}`);
        }

        this.songData = await response.json();
        
        // Add mod information to song data if needed
        if (isMod) {
            this.songData.isMod = true;
            this.songData.modPath = modPath;
            this.songData.modName = this.dataManager.modName;
        }
        
        return this.songData;

    } catch (error) {
        console.error(`Error loading chart for ${currentSong}:`, error.message);
        throw error;
    }
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
        const characterPath = this.dataManager.isMod
            ? Paths.getCharacterPath(characterId, this.dataManager.modPath)
            : Paths.getCharacterPath(characterId);

        const response = await fetch(characterPath);
        if (!response.ok) {
            // Si es un mod y falla, intentar cargar del juego base
            if (this.dataManager.isMod) {
                console.log(`Character ${characterId} not found in mod, trying base game...`);
                const baseResponse = await fetch(Paths.getCharacterPath(characterId));
                if (!baseResponse.ok) throw new Error('Character not found in mod or base game');
                return await baseResponse.json();
            }
            throw new Error(`HTTP ${response.status} for ${characterPath}`);
        }
        
        const characterData = await response.json();
        await this._loadCharacterTextures(characterId, characterData);
        
        if (characterData.healthicon) {
            this.healthBarIcons[characterId] = {
                name: characterData.healthicon,
                isMod: this.dataManager.isMod,
                modPath: this.dataManager.modPath
            };
        }
        
        if (characterData.healthbar_colors) {
            const [r, g, b] = characterData.healthbar_colors;
            this.healthBarColors[characterId] = Phaser.Display.Color.GetColor(r, g, b);
        }

        return characterData;
    } catch (error) {
        console.error(`Error loading character ${characterId}:`, error.message);
        return null;
    }
}

async _loadCharacterTextures(characterId, characterData) {
    const textureKey = `character_${characterId}`;
    if (this.textures.exists(textureKey)) return;

    const imagePath = characterData.image.replace('characters/', '');
    const spritesPath = this.dataManager.isMod
        ? Paths.getCharacterSpritePath(imagePath, this.dataManager.modPath)
        : Paths.getCharacterSpritePath(imagePath);

    try {
        this.load.atlasXML(textureKey, spritesPath.TEXTURE, spritesPath.ATLAS);
        
        await new Promise((resolve, reject) => {
            this.load.once('complete', resolve);
            this.load.once('loaderror', () => {
                // Si falla y es un mod, intentar cargar del juego base
                if (this.dataManager.isMod) {
                    const baseSpritesPath = Paths.getCharacterSpritePath(imagePath);
                    this.load.atlasXML(textureKey, baseSpritesPath.TEXTURE, baseSpritesPath.ATLAS);
                    this.load.once('complete', resolve);
                    this.load.once('loaderror', reject);
                    this.load.start();
                } else {
                    reject(new Error(`Failed to load character texture: ${characterId}`));
                }
            });
            this.load.start();
        });
    } catch (error) {
        console.error(`Failed to load character ${characterId}:`, error);
        throw error;
    }
}
  async _loadHealthIcons() {
    if (!this.healthBarIcons || !this.songData?.song) {
        console.error("No hay datos de iconos de salud o de canción para cargar.");
        return;
    }

    const { player1, player2 } = this.songData.song;
    const characterIdsWithIcons = [player1, player2].filter((id) => this.healthBarIcons[id]);
    
    if (characterIdsWithIcons.length === 0) return;

    for (const characterId of characterIdsWithIcons) {
        const iconInfo = this.healthBarIcons[characterId];
        if (!iconInfo || !iconInfo.name) {
            console.warn(`No icon info found for character ${characterId}`);
            continue;
        }

        const iconKey = `icon-${iconInfo.name}`;
        if (this.textures.exists(iconKey)) continue;

        try {
            let iconPath;
            if (iconInfo.isMod) {
                iconPath = `${iconInfo.modPath}/images/characters/icons/${iconInfo.name}.png`;
            } else {
                iconPath = `public/assets/images/characters/icons/${iconInfo.name}.png`;
            }

            this.load.image(iconKey, iconPath);
            console.log(`Loading icon ${iconInfo.name} from ${iconInfo.isMod ? 'mod' : 'base game'}`);
        } catch (error) {
            console.warn(`Failed to load icon ${iconInfo.name}, using default`);
            this.healthBarIcons[characterId] = {
                name: 'face',
                isMod: false
            };
        }
    }

    if (this.load.totalToLoad > 0) {
        await new Promise((resolve) => {
            this.load.once('complete', resolve);
            this.load.start();
        });
    }
}

  async _createHealthBar() {
    if (!this.songData?.song) {
        console.error("No hay datos de canción para crear la HealthBar.");
        return;
    }

    const { player1, player2 } = this.songData.song;
    
    // Obtener la información del personaje cargado
    const p1Character = this.characters.loadedCharacters.get(player1);
    const p2Character = this.characters.loadedCharacters.get(player2);

    // Configurar los iconos basados en la fuente del personaje
    const p1IconInfo = {
        name: this.healthBarIcons[player1]?.name || 'face',
        isMod: p1Character?.source?.isMod || false,
        modPath: p1Character?.source?.modPath
    };

    const p2IconInfo = {
        name: this.healthBarIcons[player2]?.name || 'face',
        isMod: p2Character?.source?.isMod || false,
        modPath: p2Character?.source?.modPath
    };

    // Obtener colores de la healthbar o usar valores por defecto
    const p1Color = this.healthBarColors[player1] || 0x31B0D1;
    const p2Color = this.healthBarColors[player2] || 0xF5FF31;

    this.healthBar = new HealthBar(this, {
        p1Color: p1Color,
        p2Color: p2Color,
        p1Icon: p1IconInfo,
        p2Icon: p2IconInfo
    });

    // Inicializar la healthbar
    await this.healthBar.init();

    // Forzar la adición a la capa UI
    if (this.healthBar.container) {
        this.cameraController.addToUILayer(this.healthBar.container);
        console.log("HealthBar añadido a la capa UI con colores:", {
            p1Color: `0x${p1Color.toString(16)}`,
            p2Color: `0x${p2Color.toString(16)}`
        });
    }
}

  async create() {
    console.log("PlayState iniciado.")
    this._setupInitialState()
    this.loadingScreen.setup()

    try {
        this.loadingScreen.setCreatingMode(true)
        
        // 1. Cargar datos de la canción
        this.loadingScreen.setCurrentItem("Song Data")
        const currentSong = this.dataManager.songList[this.dataManager.currentSongIndex]
        if (!currentSong) throw new Error("No hay canción actual para cargar en create.")
        await this._loadSongChart(currentSong)

        // 2. Cargar assets de personajes primero
        this.loadingScreen.setCurrentItem("Loading Characters")
        await this.preloadCharacterAssets(this.songData)
        
        // 3. Cargar audio después de que los personajes estén listos
        this.loadingScreen.setCurrentItem("Loading Audio")
        await this.audioManager.loadSongAudio(currentSong)

        // 4. Cargar iconos DESPUÉS de que los personajes estén cargados
        this.loadingScreen.setCurrentItem("Loading Icons")
        await this._loadHealthIcons()

        // Iniciar la carga de assets en Phaser si hay algo en la cola
        if (this.load.totalToLoad > 0) {
            this.loadingScreen.setCurrentItem("Loading Assets")
            await new Promise((resolve) => {
                this.load.on("complete", resolve)
                this.load.start()
            })
        }

        // 5. Inicializar componentes del juego
        this.loadingScreen.setCurrentItem("Game Components")
        await this._initializeGameComponents()

        this.loadingScreen.setCurrentItem("Game Elements")
        this._setupGameElements()

        this.loadingScreen.setCurrentItem("User Interface")
        this._setupUICameraElements()

        this.loadingScreen.setCurrentItem("Organizing Elements")
        this.cameraController.classifyAllSceneElements()

        this.loadingScreen.setCurrentItem("Controls")
        this._setupInputHandlers()

        this.loadingScreen.setCurrentItem("Preparing Game")
        this._startCountdown()

        this.loadingScreen.destroy()
        this.events.emit("createcomplete")

        if (this.cameraController) {
            this.cameraController.gameCamera.setVisible(true)
            this.cameraController.uiCamera.setVisible(true)
        }
    } catch (error) {
        console.error("Error detallado en PlayState create():", error)
        this.loadingScreen.destroy()
        this.redirectToNextState()
    }
  }

  _setupInitialState() {
    this.sound.stopAll();
    this.dataManager.setStartTime(this.time.now);

    // CameraController debe crearse aquí y estar disponible para todo el flujo
    this.cameraController = new CameraController(this);

    // Asegurar que las cámaras estén visibles
    this.cameraController.gameCamera.setVisible(true);
    this.cameraController.uiCamera.setVisible(true);
  }

  async _initializeGameComponents() {
    if (!this.songData?.song) {
        throw new Error("Datos de canción no disponibles en _initializeGameComponents")
    }

    if (!this.gameOver) {
        console.log('Initializing GameOver component...');
        this.gameOver = new GameOver(this);
    }

    this._initializeSongComponents()

    // 1. Primero crear las instancias
    if (!this.characters) {
        this.characters = new Characters(this)
    }
    
    if (!this.stageManager) {
        this.stageManager = new StageManager(this)
    }

    await this.characters.loadCharacterFromSong(this.songData)

    // 3. Configurar el StageManager con los personajes
    this.stageManager.setCharacters(this.characters)

    // 4. Cargar el stage después de que los personajes estén listos
    if (this.songData.song.stage) {
        await this.stageManager.loadStage(this.songData.song.stage)
    } else {
        await this.stageManager.loadStage('stage') // Stage por defecto
    }

    // Inicializar ScriptHandler y cargar eventos del chart
    this.scriptHandler = new ScriptHandler(this);
    await this.scriptHandler.loadEventsFromChart(this.songData);
    this.scriptHandler.cameraController = this.cameraController; // Asegurar que tenga referencia

    // Inicializar GameOver
    this.gameOver = new GameOver(this);
    
    // El resto de la inicialización...
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

    // Crear el menú de pausa y asegurarse de que esté oculto
    this.pauseMenu = new PauseMenu(this);
    if (this.cameraController) {
        this.cameraController.addToUILayer(this.pauseMenu);
    }
    
    // Triple verificación de invisibilidad
    this.pauseMenu.alpha = 0;
    this.pauseMenu.visible = false;
    this.pauseMenu.setVisible(false);
    this.pauseMenu.setActive(false);
    this.pauseMenu.isActive = false;
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
    this.arrowsManager.ratingManager = this.ratingManager

    this.input.keyboard.on('keydown-ESC', () => {
        if (!this.gameOver?.isActive) {
            if (this.pauseMenu?.isActive) {
                this._resumeGame();
            } else {
                this._pauseGame();
            }
        }
    });

    this.input.keyboard.on('keydown-ENTER', () => {
        if (!this.gameOver?.isActive) {
            if (this.pauseMenu?.isActive) {
                this._resumeGame();
            } else {
                this._pauseGame();
            }
        }
    });
  }

  _startCountdown() {
    this.countdownManager.start(() => this.startMusic())
  }

  update(time, delta) {
    // Siempre actualizar el menú de pausa, independientemente del estado del juego
    if (this.pauseMenu?.isActive) {
        this.pauseMenu.update(time, delta);
        return; // No actualizar nada más si estamos pausados
    }

    if (!this.isMusicPlaying || !this.currentInst || !this.songData) return;

    // Actualizar posición de la canción
    this.songPosition = this.currentInst.seek * 1000
    if (this.timeBar) {
        this.timeBar.update(this.songPosition)
    }

    this._updateGameComponents(time, delta)
    this._updateBeatDetection()
    this._updateBPMChanges()
    this._updateUI(time, delta)

    // Actualizar el ScriptHandler
    this.scriptHandler?.update(time, delta);
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
    console.log("Cleaning up before restart...");
    
    try {
        // Detener todos los sonidos primero
        this.sound.stopAll();

        // First cleanup scripts
        if (this.scriptHandler) {
            console.log("Cleaning up scripts...");
            try {
                await this.scriptHandler.cleanup();
            } catch (error) {
                console.warn("Error cleaning up scripts:", error);
            }
            this.scriptHandler = null;
        }
        
        // Then cleanup other components
        const cleanupPromises = [
            this.arrowsManager?.cleanup(),
            this.ratingManager?.reset(),
            this.characters?.cleanup(),
            this.stageManager?.cleanup(),
        ].filter(Boolean);

        if (cleanupPromises.length > 0) {
            await Promise.allSettled(cleanupPromises);
        }
        
        // Destroy UI elements de forma segura
        const uiElements = [
            this.healthBar,
            this.ratingText,
            this.timeBar
        ];

        uiElements.forEach(element => {
            try {
                if (element?.destroy) {
                    element.destroy();
                }
            } catch (error) {
                console.warn('Error destroying UI element:', error);
            }
        });

        // Null out references
        this.healthBar = null;
        this.ratingText = null;
        this.timeBar = null;
        
        // Clear audio de forma segura
        [this.currentVoices, this.currentInst].forEach(audio => {
            if (audio) {
                try {
                    this._safeStopAudio(audio);
                } catch (error) {
                    console.warn('Error stopping audio:', error);
                }
            }
        });
        
        this.currentVoices = null;
        this.currentInst = null;
        
        // Reset state
        this.songPosition = 0;
        this.isMusicPlaying = false;
        this.lastBeat = -1;
        this.songData = null;
        
        // Reset cameras de forma segura
        if (this.cameraController) {
            try {
                await this.cameraController.reset();
            } catch (error) {
                console.warn("Error resetting cameras:", error);
            }
        }
        
        console.log("Cleanup completed successfully");
    } catch (error) {
        console.error("Error during cleanup:", error);
    }
}

async _handleSongCompletion() {
    try {
        this.isMusicPlaying = false;
        
        // Guardar puntuación
        const currentSong = this.dataManager.songList[this.dataManager.currentSongIndex];
        const difficulty = this.dataManager.storyDifficulty || 'normal';
        const scoreData = this.ratingManager.saveScoreData(currentSong, difficulty);

        if (this.dataManager.isStoryMode) {
            // Actualizar puntuación de campaña
            this.dataManager.campaignScore += scoreData.score;
            this.dataManager.campaignMisses += scoreData.misses;

            // Si es la última canción de la semana
            if (this.dataManager.currentSongIndex >= this.dataManager.storyPlaylist.length - 1) {
                const weekKey = `weekScore_${this.dataManager.weekName}_${difficulty}`;
                const totalScore = this.dataManager.campaignScore;
                
                // Guardar solo si es mejor que el puntaje anterior
                const existingScore = localStorage.getItem(weekKey);
                if (!existingScore || totalScore > parseInt(existingScore)) {
                    localStorage.setItem(weekKey, totalScore.toString());
                }
                
                // Redirigir a StoryMode
                this.playFreakyMenuAndRedirect();
            } else {
                // Pasar a la siguiente canción
                this.dataManager.currentSongIndex++;
                this.scene.restart({
                    ...this.dataManager.getSceneData(), // Changed from getData to getSceneData
                    currentSongIndex: this.dataManager.currentSongIndex,
                    // Ensure mod data is passed along
                    isMod: this.dataManager.isMod,
                    modPath: this.dataManager.modPath,
                    modName: this.dataManager.modName
                });
            }
        } else {
            // Modo Freeplay: volver al menú de selección
            this.playFreakyMenuAndRedirect();
        }
    } catch (error) {
        console.error('Error in _handleSongCompletion:', error);
        this.scene.start('MainMenuState');
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
            campaignMisses: this.dataManager.campaignMisses,
            selectedWeekIndex: this.dataManager.weekIndex // Añadir esto para mantener la selección
        } : {
            selectedIndex: this.dataManager.currentSongIndex, // Añadir esto para mantener la selección
            selectedDifficulty: this.dataManager.storyDifficulty
        };

        // Primero detener la escena actual
        this.scene.stop();

        // Iniciar la reproducción de la música y luego cambiar de escena
        const freakyMusic = this.sound.add('freakyMenu', {
            volume: 0.7,
            loop: true
        });

        freakyMusic.play();

        // Cambiar de escena con los datos correspondientes
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
  }

  isPaused() {
      return this.pauseMenu?.isActive || false;
  }

  _pauseGame() {
    // No pausar si el jugador está muerto
    if (this.gameOver?.isActive) {
        return;
    }

    if (!this.pauseMenu?.isActive) {
        // Pausar la música
        this.currentInst?.pause();
        this.currentVoices?.pause();
        
        // Pausar animaciones y tweens
        this.anims.pauseAll();
        this.tweens.pauseAll();
        
        // Mostrar menú de pausa
        this.pauseMenu.alpha = 1;
        this.pauseMenu.visible = true;
        this.pauseMenu.setVisible(true);
        this.pauseMenu.isActive = true;
        
        // Desactivar inputs del juego
        if (this.arrowsManager) {
            this.arrowsManager.disableInputs();
        }

        // Detener el tiempo del juego pero mantener los inputs activos
        this.time.paused = true;
    }
}

_resumeGame() {
    if (this.pauseMenu?.isActive) {
        // Reanudar la música
        this.currentInst?.resume();
        this.currentVoices?.resume();
        
        // Reanudar animaciones y tweens
        this.anims.resumeAll();
        this.tweens.resumeAll();
        
        // Ocultar menú de pausa completamente
        this.pauseMenu.alpha = 0;
        this.pauseMenu.visible = false;
        this.pauseMenu.setVisible(false);
        this.pauseMenu.isActive = false;
        
        // Reactivar inputs del juego
        if (this.arrowsManager) {
            this.arrowsManager.enableInputs();
        }

        // Reanudar el tiempo del juego
        this.time.paused = false;
    }
}
}