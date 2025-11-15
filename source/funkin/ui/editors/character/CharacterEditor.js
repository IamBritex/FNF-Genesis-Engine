import NavBarMenu from '../NavBarMenu.js'

export class CharacterEditorState extends Phaser.Scene {
  constructor() {
    super({ key: "CharacterEditorState" })
    this.characters = []
    this.gameCamera = null
    this.hudCamera = null
    this.activeDropdown = null
    this.activeDropdownButton = null
    this.dropdownItems = []
    this.moduleRegistry = new Map()
    this.charactersManager = {
      loadedCharacters: new Map(),
    }

    this.clickDownSound = null
    this.clickUpSound = null
    this.isCameraDragging = false
    this.currentTheme = localStorage.getItem("editorTheme") || "light"
    this.navBar = null
  }

  preload() {
    this.load.audio("clickdown", "public/assets/audio/sounds/editor/ClickDown.ogg")
    this.load.audio("clickup", "public/assets/audio/sounds/editor/ClickUp.ogg")
    this.load.image("character_icon", "public/assets/images/characters/icons/face.png")
  }

  create() {
    const { width, height } = this.scale

    this.gameCamera = this.cameras.main
    this.gameCamera.setBounds(-4000, -4000, 8000, 8000)
    this.gameCamera.setZoom(1)
    this.hudCamera = this.cameras.add(0, 0, width, height)
    this.hudCamera.setScroll(0, 0)
    this.clickDownSound = this.sound.add("clickdown")
    this.clickUpSound = this.sound.add("clickup")

    this.createCheckerboardPattern()
    this.nav()
    this.setInputs()

    // Inicializar shortcuts después de crear todo
    this.initializeShortcuts()
  }

  initializeShortcuts() {
    // Crear instancia de ConfigShortcuts y configurar atajos
    const shortcutsModule = new ConfigShortcuts(this)
    this.moduleRegistry.set('ConfigShortcuts', shortcutsModule)
    shortcutsModule.setupGlobalShortcuts()
  }

  setInputs() {
    this.input.on("pointerdown", (pointer) => {
      this.clickDownSound.play()

      if (this.activeDropdown) {
        const dropdownBounds = this.activeDropdown.getBounds()
        const buttonBounds = this.activeDropdownButton.getBounds()

        if (!dropdownBounds.contains(pointer.x, pointer.y) && !buttonBounds.contains(pointer.x, pointer.y)) {
          this.hideDropdown()
        }
      }

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

        const newScrollX = this.gameCamera.scrollX + deltaX
        const newScrollY = this.gameCamera.scrollY + deltaY

        const clampedScrollX = Phaser.Math.Clamp(newScrollX, -4000, 4000 - this.scale.width / this.gameCamera.zoom)
        const clampedScrollY = Phaser.Math.Clamp(newScrollY, -4000, 4000 - this.scale.height / this.gameCamera.zoom)

        this.gameCamera.scrollX = clampedScrollX
        this.gameCamera.scrollY = clampedScrollY

        this.cameraDragStartX = pointer.x
        this.cameraDragStartY = pointer.y
      }
    })

    this.input.on("pointerup", (_pointer) => {
      this.clickUpSound.play()
      this.isCameraDragging = false
    })

    this.input.keyboard.on("keydown-BACKSPACE", () => {
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

  createCheckerboardPattern() {
    if (this.textures.exists("checkerboardPattern")) {
      const checkboard = this.add.tileSprite(-4000, -4000, 8000, 8000, "checkerboardPattern")
      checkboard.setOrigin(0, 0)
      checkboard.setDepth(0)
      this.setAsGameElement(checkboard)
      return
    }

    const squareSize = 10
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

    ctx.fillStyle = darkColor
    ctx.fillRect(0, squareSize, squareSize, squareSize)
    ctx.fillStyle = lightColor
    ctx.fillRect(squareSize, squareSize, squareSize, squareSize)

    this.textures.addCanvas("checkerboardPattern", canvas)

    const checkerboard = this.add.tileSprite(-4000, -4000, 8000, 8000, "checkerboardPattern")
    checkerboard.setOrigin(0, 0)
    checkerboard.setDepth(0)
    this.setAsGameElement(checkerboard)
  }

  setAsGameElement(gameObject) {
    this.hudCamera.ignore(gameObject)
    if (gameObject.list && Array.isArray(gameObject.list)) {
      gameObject.list.forEach((child) => {
        this.hudCamera.ignore(child)
        child.setData("isGameElement", true)
      })
    }
    return gameObject
  }

  setAsHUDElement(gameObject) {
    this.gameCamera.ignore(gameObject)
    // Si es un contenedor, ignora todos sus hijos
    if (gameObject.list && Array.isArray(gameObject.list)) {
      gameObject.list.forEach((child) => {
        this.gameCamera.ignore(child)
        child.setData("isHUDElement", true)
        if (child.input) {
          child.input.gameCamera = false
        }
      })
    }
    // Si tiene hijos (como un container), ignora recursivamente
    if (typeof gameObject.getAll === "function") {
      gameObject.getAll().forEach((child) => {
        this.gameCamera.ignore(child)
        child.setData("isHUDElement", true)
        if (child.input) {
          child.input.gameCamera = false
        }
      })
    }
    if (gameObject.input) {
      gameObject.input.gameCamera = false
    }
    return gameObject
  }

  nav() {
    const config = {
      buttons: [
        {
          name: "File",
          items: [
            { name: "Add character", module: "AddCharacter", method: "execute" },
            { name: "Save JSON", module: "SaveJson", method: "execute" },
            { name: "Save all", module: "SaveAll", method: "execute" },
          ],
        },
        {
          name: "Panels",
          items: [
            { name: "Properties", module: "CharacterPropertiesModal", method: "show" },
            { name: "Animations", module: "AnimationsPanel", method: "show" },
            { name: "Mapping", module: "MappingPanel", method: "show" },
          ],
        },
        {
          name: "Config",
          items: [
            { name: "Theme", module: "ConfigTheme", method: "execute" },
            { name: "Shortcuts", module: "ConfigShortcuts", method: "show" },
          ],
        },
        {
          name: "Help",
          items: [
            { name: "Documentation", module: "HelpDocumentation", method: "show" },
            { name: "About", module: "HelpAbout", method: "show" },
          ],
        },
      ]
    }

    this.navBar = new NavBarMenu(this)
    this.navBar.create(config)
  }

  isPointerOverDropdown(pointer) {
    if (!this.activeDropdown) return false
    const dropdownBounds = this.activeDropdown.getBounds()
    return dropdownBounds.contains(pointer.x, pointer.y)
  }

  async executeModule(moduleName, methodName) {
    try {
      const modulePath = `./WindowsModals/CharacterEditor/${moduleName}.js`
      const module = await import(modulePath)

      if (!this.moduleRegistry.has(moduleName)) {
        const moduleInstance = new module.default(this)
        this.moduleRegistry.set(moduleName, moduleInstance)
      }

      const moduleInstance = this.moduleRegistry.get(moduleName)

      if (moduleInstance[methodName] && typeof moduleInstance[methodName] === "function") {
        moduleInstance[methodName]()
      } else {
        console.error(`Method ${methodName} not found in module ${moduleName}`)
      }
    } catch (error) {
      console.error(`Error loading module ${moduleName}:`, error)
    }
  }

  onCharacterAdded(characterData) {
    // Notify AnimationsPanel if it exists
    const animationsPanel = this.moduleRegistry.get("AnimationsPanel")
    if (animationsPanel && animationsPanel.modalContainer) {
      animationsPanel.refreshContent()
    }

    const propertiesModal = this.moduleRegistry.get("CharacterPropertiesModal")
    if (propertiesModal && propertiesModal.isVisible) {
      propertiesModal.currentCharacter = propertiesModal.getCurrentCharacter()
      propertiesModal.updateContent()
    }
  }

  isPointerOverHUD(pointer) {
    // Check if pointer is over navbar
    if (pointer.y <= 30) return true

    // Check if pointer is over any active modal windows
    const modals = ["AnimationsPanel", "CharacterPropertiesModal", "SingMappingModal"]
    for (const modalName of modals) {
      const modal = this.moduleRegistry.get(modalName)
      if (modal && modal.modalContainer && modal.modalContainer.visible) {
        const bounds = modal.modalContainer.getBounds()
        if (bounds.contains(pointer.x, pointer.y)) {
          return true
        }
      }
    }

    // Check if pointer is over dropdown
    if (this.activeDropdown) {
      const dropdownBounds = this.activeDropdown.getBounds()
      if (dropdownBounds.contains(pointer.x, pointer.y)) {
        return true
      }
    }

    if (this.navBar && this.navBar.isDropdownActive()) {
      const dropdown = this.navBar.getActiveDropdown()
      const dropdownBounds = dropdown.getBounds()
      if (dropdownBounds.contains(pointer.x, pointer.y)) {
        return true
      }
    }

    return false
  }
}

game.scene.add("CharacterEditorState", CharacterEditorState)
