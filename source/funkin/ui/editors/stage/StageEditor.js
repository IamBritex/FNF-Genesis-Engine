// 1. IMPORTS ESTÁTICOS
// Se importan TODOS los módulos aquí
import NavBarMenu from "../NavBarMenu.js"
import Elements from "./Show/Elements.js"
import LayersPanel from "./Window/LayersPanel.js"
import Characters from "./Show/Characters.js"
import ToggleCameras from "./Show/ToggleCameras.js"
import AddElement from "./Execute/AddElement.js"

// Módulos que antes eran dinámicos
import ConfigTheme from "./ConfigTheme.js"
import NewStage from "./Execute/NewStage.js"
import SaveStage from "./Execute/SaveStage.js"
import StageProperties from "./Window/StageProperties.js"

export class StageEditorState extends Phaser.Scene {
  constructor() {
    super({ key: "StageEditorState" })
    this.gameCamera = null
    this.hudCamera = null
    this.moduleRegistry = new Map()
    this.isCameraDragging = false
    this.currentTheme = localStorage.getItem("editorTheme") || "light"
    this.editorInputEnabled = true
    this.parallaxFactor = 0.1
    this.maxLayer = 6
  }

  preload() {
    this.load.audio("clickdown", "public/sounds/editor/ClickDown.ogg")
    this.load.audio("clickup", "public/sounds/editor/ClickUp.ogg")
  }

  async create() {
    const { width, height } = this.scale

    this.gameCamera = this.cameras.main
    this.gameCamera.setBounds(
      Number.NEGATIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      Number.POSITIVE_INFINITY,
      Number.POSITIVE_INFINITY,
    )
    this.hudCamera = this.cameras.add(0, 0, width, height)

    this.clickDownSound = this.sound.add("clickdown")
    this.clickUpSound = this.sound.add("clickup")

    this.createCheckerboardPattern()
    await this.initializeModules() // <- 2. SE INICIALIZAN TODOS LOS MÓDULOS

    this.layersPanel.show() // 'this.layersPanel' se define en initializeModules
    this.nav()
    this.setInputs()
  }

  // 2. INITIALIZE_MODULES (ACTUALIZADO)
  // Ahora crea y registra TODOS los módulos de una vez.
  async initializeModules() {
    // --- Módulos Principales (Usados inmediatamente) ---
    const elementsModule = new Elements(this)
    this.moduleRegistry.set("Elements", elementsModule)

    this.layersPanel = new LayersPanel(this) // Se mantiene la propiedad para acceso fácil
    this.moduleRegistry.set("LayersPanel", this.layersPanel)

    const charactersModule = new Characters(this)
    this.moduleRegistry.set("Characters", charactersModule)

    const toggleCamerasModule = new ToggleCameras(this)
    this.moduleRegistry.set("ToggleCameras", toggleCamerasModule)

    const addElementModule = new AddElement(this)
    this.moduleRegistry.set("AddElement", addElementModule)

    // --- Módulos de Menú/Acción (Se instancian pero no se usan aún) ---
    this.moduleRegistry.set("ConfigTheme", new ConfigTheme(this))
    this.moduleRegistry.set("NewStage", new NewStage(this))
    this.moduleRegistry.set("SaveStage", new SaveStage(this))
    this.moduleRegistry.set("StageProperties", new StageProperties(this))

    // --- Lógica de inicialización (depende de los módulos creados) ---
    await charactersModule.preloadDefaultCharacters()

    for (const [id, char] of charactersModule.loadedCharacters) {
      elementsModule.addElement(char.sprite)
    }

    this.layersPanel.refreshLayersList()
    this.setupParallaxSystem()
  }

  setupParallaxSystem() {
    this.parallaxSmoothing = 0.1
    this.lastCameraScroll = { x: 0, y: 0 }

    this.events.on("update", () => {
      const layersPanel = this.moduleRegistry.get("LayersPanel")
      const toggleCameras = this.moduleRegistry.get("ToggleCameras")

      if (!layersPanel || !toggleCameras?.isCameraSystemActive) return

      const allLayers = layersPanel.getAllLayers()

      allLayers.forEach((layer) => {
        if (!layer.sprite?.active) return

        const normalizedDepth = layer.depth / this.maxLayer
        const parallaxMultiplier = normalizedDepth * this.parallaxFactor

        if (!layer.sprite.getData("baseX")) {
          layer.sprite.setData("baseX", layer.sprite.x)
          layer.sprite.setData("baseY", layer.sprite.y)
        }

        const baseX = layer.sprite.getData("baseX")
        const baseY = layer.sprite.getData("baseY")

        layer.sprite.x = baseX - this.gameCamera.scrollX * parallaxMultiplier
        layer.sprite.y = baseY - this.gameCamera.scrollY * parallaxMultiplier
      })

      this.lastCameraScroll = {
        x: this.gameCamera.scrollX,
        y: this.gameCamera.scrollY,
      }
    })
  }

  createCheckerboardPattern() {
    if (this.textures.exists("checkerboardPattern")) {
      this.textures.remove("checkerboardPattern")
    }

    const squareSize = 20
    const patternSize = squareSize * 2
    const canvas = document.createElement("canvas")
    canvas.width = patternSize
    canvas.height = patternSize
    const ctx = canvas.getContext("2d")

    const lightColor = this.currentTheme === "light" ? "#FFFFFF" : "#333333"
    const darkColor = this.currentTheme === "light" ? "#F0F0F0" : "#2A2A2A"

    ctx.fillStyle = lightColor
    ctx.fillRect(0, 0, squareSize, squareSize)
    ctx.fillStyle = darkColor
    ctx.fillRect(squareSize, 0, squareSize, squareSize)
    ctx.fillRect(0, squareSize, squareSize, squareSize)
    ctx.fillStyle = lightColor
    ctx.fillRect(squareSize, squareSize, squareSize, squareSize)

    this.textures.addCanvas("checkerboardPattern", canvas)

    const { width, height } = this.scale
    const extraSize = 8

    this.checkerboard = this.add
      .tileSprite(0, 0, width * extraSize, height * extraSize, "checkerboardPattern")
      .setOrigin(0.5)
      .setDepth(-1)

    this.events.on("update", () => {
      if (!this.checkerboard || !this.gameCamera) return

      const zoomFactor = 1 / this.gameCamera.zoom
      const newWidth = width * extraSize * Math.max(1, zoomFactor)
      const newHeight = height * extraSize * Math.max(1, zoomFactor)

      this.checkerboard.setSize(newWidth, newHeight)
      this.checkerboard.x = this.gameCamera.scrollX
      this.checkerboard.y = this.gameCamera.scrollY
      this.checkerboard.setTileScale(Math.max(0.1, 1 / this.gameCamera.zoom))
    })

    this.scale.on("resize", (gameSize) => {
      if (this.checkerboard) {
        const zoomFactor = 1 / this.gameCamera.zoom
        this.checkerboard.setSize(
          gameSize.width * extraSize * Math.max(1, zoomFactor),
          gameSize.height * extraSize * Math.max(1, zoomFactor),
        )
      }
    })

    this.setAsGameElement(this.checkerboard)
  }

  nav() {
    const config = {
      buttons: [
        {
          name: "File",
          items: [
            { name: "New Stage", module: "NewStage", method: "execute" },
            { name: "Save JSON", module: "SaveStage", method: "execute" },
            { name: "Save All", module: "ExportStage", method: "execute" },
          ],
        },
        {
          name: "View",
          items: [
            { name: "Cameras", module: "ToggleCameras", method: "execute" },
            { name: "Properties", module: "StageProperties", method: "show" },
          ],
        },
        {
          name: "Settings",
          items: [
            { name: "Theme", module: "ConfigTheme", method: "execute" },
          ],
        },
      ],
    }

    this.navBar = new NavBarMenu(this)
    this.navBar.create(config)
  }

  toggleEditorInput(enabled) {
    const elementsModule = this.moduleRegistry.get("Elements")

    if (elementsModule) {
      elementsModule.elements.forEach((element) => {
        if (element.input) {
          element.input.enabled = enabled
        }
      })
    }

    if (!enabled) {
      this.input.mouse.target.style.cursor = "default"
    }

    this.editorInputEnabled = enabled
  }

  setInputs() {
    this.editorInputEnabled = true

    this.input.on("pointerdown", (pointer) => {
      if (!this.editorInputEnabled) return

      this.clickDownSound.play()

      if (pointer.rightButtonDown() || pointer.middleButtonDown()) {
        if (!this.isPointerOverHUD(pointer)) {
          this.isCameraDragging = true
          this.cameraDragStartX = pointer.x
          this.cameraDragStartY = pointer.y
        }
      }
    })

    this.input.on("pointermove", (pointer) => {
      if (this.isCameraDragging && (pointer.rightButtonDown() || pointer.middleButtonDown())) {
        const deltaX = this.cameraDragStartX - pointer.x
        const deltaY = this.cameraDragStartY - pointer.y
        this.gameCamera.scrollX += deltaX
        this.gameCamera.scrollY += deltaY
        this.cameraDragStartX = pointer.x
        this.cameraDragStartY = pointer.y
      }
    })

    this.input.on("pointerup", () => {
      this.clickUpSound.play()
      this.isCameraDragging = false
    })

    this.input.keyboard.on("keydown-ESC", () => {
      this.scene.get("TransitionScene").startTransition("EditorsState")
    })

    this.input.on("wheel", (pointer, _gameObjects, deltaX, deltaY) => {
      if (!this.isPointerOverHUD(pointer)) {
        const zoomFactor = deltaY > 0 ? 0.9 : 1.1
        const newZoom = Phaser.Math.Clamp(this.gameCamera.zoom * zoomFactor, 0.1, 3)
        this.gameCamera.setZoom(newZoom)
      }
    })
  }

  setAsGameElement(gameObject) {
    this.hudCamera.ignore(gameObject)
    return gameObject
  }

  setAsHUDElement(gameObject) {
    this.gameCamera.ignore(gameObject)

    if (gameObject.list) {
      gameObject.list.forEach((child) => this.gameCamera.ignore(child))
    }

    if (typeof gameObject.getAll === "function") {
      gameObject.getAll().forEach((child) => this.gameCamera.ignore(child))
    }

    return gameObject
  }

  // 3. EXECUTE_MODULE (SIMPLIFICADO)
  // Ya no es 'async'. No usa 'import()'. Solo busca y ejecuta.
  executeModule(moduleName, methodName) {
    try {
      // Obtener la instancia del módulo que ya fue creada
      const moduleInstance = this.moduleRegistry.get(moduleName)

      if (!moduleInstance) {
        console.error(`El módulo "${moduleName}" no se encontró en el registro.`)
        return
      }

      // Verificar que el método exista y ejecutarlo
      if (moduleInstance[methodName] && typeof moduleInstance[methodName] === "function") {
        moduleInstance[methodName]()
      } else {
        console.error(`El método "${methodName}" no se encontró en el módulo "${moduleName}".`)
      }
    } catch (error) {
      // Captura errores de la *ejecución* del método
      console.error(`Error al ejecutar ${methodName} en ${moduleName}:`, error)
    }
  }

  isPointerOverHUD(pointer) {
    if (pointer.y <= 30) return true

    const modals = ["StageProperties", "LayersPanel"]

    for (const modalName of modals) {
      const modal = this.moduleRegistry.get(modalName)
      if (modal?.modalContainer?.visible) {
        const bounds = modal.modalContainer.getBounds()
        if (bounds.contains(pointer.x, pointer.y)) {
          return true
        }
      }
    }

    return false
  }
}

game.scene.add("StageEditorState", StageEditorState)