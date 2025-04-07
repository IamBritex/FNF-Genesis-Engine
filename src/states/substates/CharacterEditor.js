// Character Editor with proper XML parsing for FNF-style sprites
class CharacterEditorState extends Phaser.Scene {
  constructor() {
    super({ key: "CharacterEditorState" })
    this.isDragging = false
    this.currentZoom = 1
    this.minZoom = 0.5
    this.maxZoom = 2
    this.modal = null
    this.animsModal = null
    this.characterPropertiesModal = null
    this.characterSprite = null
    this.currentAnimation = null
    this.characterData = null
    this.activeTweens = {} // Store active tweens
  }

  preload() {
    this.load.image("tempBG", "public/assets/images/states/Editors/temp-bg.png")
  }

  create() {
    const { width, height } = this.scale

    this.bg = this.add.image(width / 2, height / 2, "tempBG").setOrigin(0.5)

    // Ajustar escala del fondo si es necesario
    this.bg.setScale(Math.max(width / this.bg.width, height / this.bg.height))

    this.add
      .text(width / 2, height - 50, "Press BACKSPACE to return", {
        fontSize: "20px",
        fill: "#FFFFFF",
      })
      .setOrigin(0.5)

    // Input handler para regresar
    this.input.keyboard.on("keydown-BACKSPACE", () => {
      if (this.scene.get("TransitionScene")) {
        this.scene.get("TransitionScene").startTransition("EditorsState")
      }
    })

    // Configurar controles de cámara
    this.setupCameraControls()

    // Add the modal window
    this.setupModals()

    // Create a container for the character sprite
    this.characterContainer = this.add.container(width / 2, height / 2)
  }

  setupModals() {
    // Create the main modal
    this.modal = new ModalWindow(this, {
      x: 100,
      y: 100,
      width: 300,
      height: 150,
      title: "Character Loader",
    })
  }

  setupCameraControls() {
    // Control de arrastre con rueda del ratón
    this.input.on("pointerdown", (pointer) => {
      if (pointer.middleButtonDown()) {
        this.isDragging = true
        this.lastPointerPosition = { x: pointer.x, y: pointer.y }
      }
    })

    this.input.on("pointermove", (pointer) => {
      if (this.isDragging && pointer.middleButtonDown()) {
        const deltaX = pointer.x - this.lastPointerPosition.x
        const deltaY = pointer.y - this.lastPointerPosition.y

        this.cameras.main.scrollX -= deltaX / this.cameras.main.zoom
        this.cameras.main.scrollY -= deltaY / this.cameras.main.zoom

        this.lastPointerPosition = { x: pointer.x, y: pointer.y }
      }
    })

    this.input.on("pointerup", () => {
      this.isDragging = false
    })

    // Control de zoom con la rueda
    this.input.on("wheel", (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
      const zoomChange = deltaY > 0 ? 0.9 : 1.1 // Reducir/aumentar en un 10%
      const newZoom = this.cameras.main.zoom * zoomChange

      // Aplicar zoom solo si está dentro de los límites
      if (newZoom >= this.minZoom && newZoom <= this.maxZoom) {
        // Calcular el punto focal del zoom (posición del puntero)
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y)

        this.cameras.main.zoom = newZoom
        this.currentZoom = newZoom

        // Ajustar la posición de la cámara para mantener el punto focal
        const newWorldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
        this.cameras.main.scrollX += worldPoint.x - newWorldPoint.x
        this.cameras.main.scrollY += worldPoint.y - newWorldPoint.y
      }
    })
  }

  // New method to load character data
  loadCharacter(characterData) {
    this.characterData = characterData

    // Clear any existing character
    if (this.characterSprite) {
      this.characterSprite.destroy()
      this.characterSprite = null
    }

    // Clear any existing animations
    try {
      const keys = this.anims.getAnimationNames ? this.anims.getAnimationNames() : Object.keys(this.anims.anims.entries)

      for (let i = 0; i < keys.length; i++) {
        this.anims.remove(keys[i])
      }
    } catch (error) {
      console.warn("Could not clear animations:", error)
    }

    // Get the image path from the character data
    const imagePath = characterData.image
    if (!imagePath) {
      console.error("No image path found in character data")
      return
    }

    // Construct the paths for the image and XML
    const imageFullPath = `public/assets/images/${imagePath}.png`
    const xmlFullPath = `public/assets/images/${imagePath}.xml`

    console.log(`Loading character: ${imagePath}`)
    console.log(`Image path: ${imageFullPath}`)
    console.log(`XML path: ${xmlFullPath}`)

    // Load the image and XML
    this.load.image(imagePath, imageFullPath)
    this.load.xml(imagePath + "_xml", xmlFullPath)

    // When loading is complete, create the sprite and animations
    this.load.once("complete", () => {
      this.createCharacterSprite(characterData, imagePath)
    })

    // Start loading
    this.load.start()
  }

  // Create character sprite
  createCharacterSprite(characterData, imagePath) {
    const { width, height } = this.scale

    // Create the sprite
    this.characterSprite = this.add.sprite(0, 0, imagePath)
    this.characterContainer.add(this.characterSprite)

    // Apply character properties
    if (characterData.flip_x) {
      this.characterSprite.setFlipX(true)
    }

    if (characterData.scale) {
      this.characterSprite.setScale(characterData.scale)
    }

    // Store base position
    this.basePosition = {
      x: 0,
      y: 0,
    }

    // Position the character container
    this.characterContainer.setPosition(width / 2, height / 2)

    // Parse XML and create frames
    this.parseXMLAndCreateFrames(characterData, imagePath)
  }

  // Parse XML and create frames
  parseXMLAndCreateFrames(characterData, imagePath) {
    // Get the XML data
    const xmlData = this.cache.xml.get(imagePath + "_xml")

    if (!xmlData) {
      console.error(`No XML data found for ${imagePath}`)
      return
    }

    try {
      console.log("Parsing XML data...")

      // Get the texture
      const texture = this.textures.get(imagePath)

      // Get all SubTexture elements
      const subTextures = xmlData.getElementsByTagName("SubTexture")
      console.log(`Found ${subTextures.length} SubTexture elements`)

      // Create a map to store animation prefixes and their frames
      const animationFrames = new Map()

      // Process each SubTexture
      for (let i = 0; i < subTextures.length; i++) {
        const subTexture = subTextures[i]

        // Get attributes
        const name = subTexture.getAttribute("name")
        const x = Number.parseInt(subTexture.getAttribute("x"), 10)
        const y = Number.parseInt(subTexture.getAttribute("y"), 10)
        const width = Number.parseInt(subTexture.getAttribute("width"), 10)
        const height = Number.parseInt(subTexture.getAttribute("height"), 10)

        // Optional attributes
        const frameX = subTexture.hasAttribute("frameX") ? Number.parseInt(subTexture.getAttribute("frameX"), 10) : 0
        const frameY = subTexture.hasAttribute("frameY") ? Number.parseInt(subTexture.getAttribute("frameY"), 10) : 0
        const frameWidth = subTexture.hasAttribute("frameWidth")
          ? Number.parseInt(subTexture.getAttribute("frameWidth"), 10)
          : width
        const frameHeight = subTexture.hasAttribute("frameHeight")
          ? Number.parseInt(subTexture.getAttribute("frameHeight"), 10)
          : height

        // Add the frame to the texture
        texture.add(name, 0, x, y, width, height)

        // Extract animation prefix (e.g., "BF idle dance" from "BF idle dance0000")
        const match = name.match(/^(.*?)(\d+)$/)
        if (match) {
          const prefix = match[1]
          const frameNumber = Number.parseInt(match[2], 10)

          // Add to animation frames map
          if (!animationFrames.has(prefix)) {
            animationFrames.set(prefix, [])
          }

          animationFrames.get(prefix).push({
            name: name,
            frameNumber: frameNumber,
          })
        }
      }

      console.log(`Processed ${animationFrames.size} animation prefixes`)

      // Create animations from the character data
      this.createAnimationsFromData(characterData, imagePath, animationFrames)
    } catch (error) {
      console.error("Error parsing XML:", error)
    }
  }

  // Create animations from character data
  createAnimationsFromData(characterData, imagePath, animationFrames) {
    if (!characterData.animations || characterData.animations.length === 0) {
      console.warn("No animations found in character data")
      return
    }

    console.log(`Creating animations for ${characterData.animations.length} animation definitions`)

    // Process each animation in the character data
    characterData.animations.forEach((animation) => {
      try {
        const animName = animation.anim // e.g., "singLEFT"
        const frameName = animation.name // e.g., "BF NOTE LEFT0"
        const fps = animation.fps || 24
        const loop = animation.loop !== undefined ? animation.loop : animName === "idle"

        console.log(`Processing animation: ${animName}, frameName: ${frameName}`)

        // Encontrar el prefijo correcto basado en el nombre del frame
        let prefix = ""
        for (let [key] of animationFrames) {
          // Remover números del final del nombre del frame para comparar
          const baseFrameName = frameName.replace(/[0-9]+$/, "")
          if (key.includes(baseFrameName)) {
            prefix = key
            break
          }
        }

        if (!prefix) {
          console.warn(`No matching prefix found for animation: ${animName} (${frameName})`)
          return
        }

        // Get frames and sort by frame number
        let frames =
          animationFrames
            .get(prefix)
            ?.sort((a, b) => a.frameNumber - b.frameNumber)
            ?.map((frame) => frame.name) || []

        if (frames.length > 0) {
          const animKey = `${imagePath}_${animName}`

          // Remove existing animation if it exists
          if (this.anims.exists(animKey)) {
            this.anims.remove(animKey)
          }

          // Create animation config
          const animConfig = {
            key: animKey,
            frames: this.anims.generateFrameNames(imagePath, {
              frames: frames,
            }),
            frameRate: fps,
            repeat: loop ? -1 : 0,
          }

          // Create the animation
          this.anims.create(animConfig)
          console.log(`Created animation: ${animKey} with ${frames.length} frames`)
        } else {
          console.warn(`No frames found for animation: ${animName} using prefix: ${prefix}`)
        }
      } catch (error) {
        console.error(`Error creating animation ${animation.anim}:`, error)
      }
    })

    // Play idle animation by default
    this.playAnimation("idle")
  }

  // Play animation with offsets
  playAnimation(animName) {
    if (!this.characterSprite || !this.characterData) {
      console.warn("Cannot play animation: character sprite or data is missing")
      return
    }

    // Find the animation in the character data
    const animation = this.characterData.animations.find((a) => a.anim === animName)
    if (!animation) {
      console.warn(`Animation not found in character data: ${animName}`)
      return
    }

    // Get the animation key
    const animKey = `${this.characterData.image}_${animName}`

    // Check if the animation exists
    if (!this.anims.exists(animKey)) {
      console.warn(`Animation not found in Phaser: ${animKey}`)
      return
    }

    // Store current animation
    this.currentAnimation = animName

    // Apply offsets
    this.applyOffsets(animName)

    // Play the animation
    this.characterSprite.play(animKey)

    console.log(`Playing animation: ${animName}`)
  }

  // Apply offsets
  applyOffsets(animName) {
    if (!this.characterSprite || !this.characterData) return

    // Find the animation in the character data
    const animation = this.characterData.animations.find((a) => a.anim === animName)
    if (!animation) return

    // Kill any existing tween
    if (this.activeTweens.character) {
      if (typeof gsap !== "undefined" && gsap.isTweening && gsap.isTweening(this.characterSprite)) {
        gsap.killTweensOf(this.characterSprite)
      } else if (this.scene && this.scene.tweens) {
        // If using Phaser tweens
        this.scene.tweens.killTweensOf(this.characterSprite)
      }
      this.activeTweens.character = null
    }

    // Reset position to center
    this.characterSprite.setPosition(0, 0)

    // Get offsets
    const offsets = animation.offsets || [0, 0]
    const [offsetX, offsetY] = offsets

    // Apply offsets
    if (typeof gsap !== "undefined") {
      try {
        // Use GSAP if available
        const tween = gsap.to(this.characterSprite, {
          x: offsetX,
          y: offsetY,
          duration: 0, // Instantaneous
          ease: "none",
          overwrite: "auto",
        })

        // Store reference to the tween
        this.activeTweens.character = tween
      } catch (error) {
        // Fallback to direct positioning if GSAP fails
        console.warn("GSAP error, using direct positioning:", error)
        this.characterSprite.setPosition(offsetX, offsetY)
      }
    } else {
      // Fallback to direct positioning
      this.characterSprite.setPosition(offsetX, offsetY)
    }

    console.log(`Applied offsets for ${animName}: [${offsetX}, ${offsetY}]`)
  }
}

// Modal Window class definition
class ModalWindow {
  constructor(scene, options = {}) {
    this.scene = scene
    this.camera = scene.cameras.main

    // Default options
    this.x = options.x || 100
    this.y = options.y || 100
    this.width = options.width || 300
    this.height = options.height || 150
    this.title = options.title || "Character Editor"
    this.backgroundColor = options.backgroundColor || 0x2c3e50
    this.titleColor = options.titleColor || 0x3498db
    this.textColor = options.textColor || 0xffffff
    this.alpha = options.alpha !== undefined ? options.alpha : 0.9
    this.padding = options.padding || 10

    // State variables
    this.isMinimized = false
    this.isDragging = false
    this.dragOffset = { x: 0, y: 0 }
    this.characterData = null

    // Create the modal container
    this.createModal()

    // Add event listeners
    this.addEventListeners()
  }

  createModal() {
    // Create a container for all modal elements
    this.container = this.scene.add.container(this.x, this.y)
    this.container.setDepth(1000) // Ensure it's above other game elements

    // Background panel
    this.panel = this.scene.add.rectangle(0, 0, this.width, this.height, this.backgroundColor, this.alpha)
    this.panel.setOrigin(0, 0)
    this.container.add(this.panel)

    // Title bar
    this.titleBar = this.scene.add.rectangle(0, 0, this.width, 30, this.titleColor, this.alpha)
    this.titleBar.setOrigin(0, 0)
    this.container.add(this.titleBar)

    // Title text
    this.titleText = this.scene.add.text(10, 5, this.title, { fontSize: "16px", fill: "#ffffff" })
    this.container.add(this.titleText)

    // Close button
    this.closeButton = this.scene.add.text(this.width - 30, 5, "X", { fontSize: "16px", fill: "#ffffff" })
    this.closeButton.setInteractive({ useHandCursor: true })
    this.closeButton.on("pointerdown", () => this.close())
    this.container.add(this.closeButton)

    // Minimize button
    this.minimizeButton = this.scene.add.text(this.width - 50, 5, "_", { fontSize: "16px", fill: "#ffffff" })
    this.minimizeButton.setInteractive({ useHandCursor: true })
    this.minimizeButton.on("pointerdown", () => this.toggleMinimize())
    this.container.add(this.minimizeButton)

    // Content area
    this.contentArea = this.scene.add.container(this.padding, 40)
    this.container.add(this.contentArea)

    // Add file input instructions
    this.fileInputText = this.scene.add.text(0, 0, "Load Character JSON:", { fontSize: "14px", fill: "#ffffff" })
    this.contentArea.add(this.fileInputText)

    // Add load button
    this.loadButton = this.scene.add.rectangle(0, 30, 150, 30, 0x3498db, 1)
    this.loadButton.setOrigin(0, 0)
    this.contentArea.add(this.loadButton)

    this.loadButtonText = this.scene.add.text(75, 45, "Load JSON File", { fontSize: "14px", fill: "#ffffff" })
    this.loadButtonText.setOrigin(0.5, 0.5)
    this.contentArea.add(this.loadButtonText)

    // Make load button interactive
    this.loadButton.setInteractive({ useHandCursor: true })
    this.loadButton.on("pointerdown", () => this.openFileDialog())

    // Status text (simplified)
    this.statusText = this.scene.add.text(0, 70, "No character data loaded", { fontSize: "14px", fill: "#ffffff" })
    this.contentArea.add(this.statusText)

    // Create an invisible file input element
    this.createFileInput()
  }

  createFileInput() {
    // Create a file input element in the DOM
    const fileInput = document.createElement("input")
    fileInput.type = "file"
    fileInput.id = "character-file-input"
    fileInput.accept = ".json"
    fileInput.style.display = "none"
    document.body.appendChild(fileInput)

    // Add event listener for file selection
    fileInput.addEventListener("change", (event) => {
      const file = event.target.files[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const jsonData = JSON.parse(e.target.result)
            this.loadCharacterData(jsonData)
          } catch (error) {
            this.statusText.setText(`Error parsing JSON: ${error.message}`)
          }
        }
        reader.readAsText(file)
      }
    })

    this.fileInput = fileInput
  }

  openFileDialog() {
    // Trigger the file input click
    if (this.fileInput) {
      this.fileInput.click()
    }
  }

  loadCharacterData(data) {
    this.characterData = data

    // Update status text to just show "Loaded!"
    this.statusText.setText("Loaded!")

    console.log("Character data loaded:", data)

    // Store the data in the scene for reference
    this.scene.characterData = data

    // Load the character in the scene
    this.scene.loadCharacter(data)

    // Create the animations modal
    this.createAnimationsModal(data)

    // Create the character properties modal
    this.createCharacterPropertiesModal(data)
  }

  createAnimationsModal(data) {
    // Check if we have animations data
    if (data && data.animations && data.animations.length > 0) {
      // Create a new modal for animations
      if (this.scene.animsModal) {
        this.scene.animsModal.close()
      }

      this.scene.animsModal = new AnimationsModal(this.scene, {
        x: this.x + this.width + 20,
        y: this.y,
        width: 300,
        height: 400,
        title: "CharacterAnims",
        animations: data.animations,
        imagePath: data.image,
      })
    }
  }

  createCharacterPropertiesModal(data) {
    // Create a new modal for character properties
    if (this.scene.characterPropertiesModal) {
      this.scene.characterPropertiesModal.close()
    }

    this.scene.characterPropertiesModal = new CharacterPropertiesModal(this.scene, {
      x: this.x + this.width + 340,
      y: this.y,
      width: 250,
      height: 300,
      characterData: data,
    })
  }

  addEventListeners() {
    // Make title bar draggable
    this.titleBar.setInteractive({ useHandCursor: true })

    this.titleBar.on("pointerdown", (pointer) => {
      this.isDragging = true
      this.dragOffset.x = pointer.x - this.container.x
      this.dragOffset.y = pointer.y - this.container.y
    })

    this.scene.input.on("pointermove", (pointer) => {
      if (this.isDragging) {
        this.container.x = pointer.x - this.dragOffset.x
        this.container.y = pointer.y - this.dragOffset.y
      }
    })

    this.scene.input.on("pointerup", () => {
      this.isDragging = false
    })

    // Make sure the modal stays in the camera view
    this.scene.events.on("update", this.updatePosition, this)
  }

  updatePosition() {
    // Ensure the modal stays within the camera bounds
    const camera = this.camera
    const bounds = {
      left: camera.scrollX,
      top: camera.scrollY,
      right: camera.scrollX + camera.width,
      bottom: camera.scrollY + camera.height,
    }

    // Adjust position
    if (this.container.x < bounds.left) {
      this.container.x = bounds.left
    } else if (this.container.x + this.width > bounds.right) {
      this.container.x = bounds.right - this.width
    }

    if (this.container.y < bounds.top) {
      this.container.y = bounds.top
    } else if (this.container.y + this.height > bounds.bottom) {
      this.container.y = bounds.bottom - this.height
    }
  }

  toggleMinimize() {
    this.isMinimized = !this.isMinimized

    if (this.isMinimized) {
      // Hide content area and resize panel
      this.contentArea.setVisible(false)
      this.panel.height = 30
    } else {
      // Show content area and restore panel size
      this.contentArea.setVisible(true)
      this.panel.height = this.height
    }
  }

  close() {
    // Remove the file input from DOM
    if (this.fileInput && this.fileInput.parentNode) {
      this.fileInput.parentNode.removeChild(this.fileInput)
    }

    // Remove event listeners
    this.scene.events.off("update", this.updatePosition, this)

    // Destroy the container and all its children
    this.container.destroy()
  }
}

// Animations Modal Window class
class AnimationsModal {
  constructor(scene, options = {}) {
    this.scene = scene
    this.camera = scene.cameras.main

    // Default options
    this.x = options.x || 500
    this.y = options.y || 100
    this.width = options.width || 300
    this.height = options.height || 400
    this.title = options.title || "CharacterAnims"
    this.backgroundColor = options.backgroundColor || 0x2c3e50
    this.titleColor = options.titleColor || 0x3498db
    this.textColor = options.textColor || 0xffffff
    this.alpha = options.alpha !== undefined ? options.alpha : 0.9
    this.padding = options.padding || 10

    // Animation data
    this.animations = options.animations || []
    this.imagePath = options.imagePath || ""

    // State variables
    this.isMinimized = false
    this.isDragging = false
    this.dragOffset = { x: 0, y: 0 }

    // Create the modal container
    this.createModal()

    // Add event listeners
    this.addEventListeners()
  }

  createModal() {
    // Create a container for all modal elements
    this.container = this.scene.add.container(this.x, this.y)
    this.container.setDepth(1000) // Ensure it's above other game elements

    // Background panel
    this.panel = this.scene.add.rectangle(0, 0, this.width, this.height, this.backgroundColor, this.alpha)
    this.panel.setOrigin(0, 0)
    this.container.add(this.panel)

    // Title bar
    this.titleBar = this.scene.add.rectangle(0, 0, this.width, 30, this.titleColor, this.alpha)
    this.titleBar.setOrigin(0, 0)
    this.container.add(this.titleBar)

    // Title text
    this.titleText = this.scene.add.text(10, 5, this.title, { fontSize: "16px", fill: "#ffffff" })
    this.container.add(this.titleText)

    // Close button
    this.closeButton = this.scene.add.text(this.width - 30, 5, "X", { fontSize: "16px", fill: "#ffffff" })
    this.closeButton.setInteractive({ useHandCursor: true })
    this.closeButton.on("pointerdown", () => this.close())
    this.container.add(this.closeButton)

    // Minimize button
    this.minimizeButton = this.scene.add.text(this.width - 50, 5, "_", { fontSize: "16px", fill: "#ffffff" })
    this.minimizeButton.setInteractive({ useHandCursor: true })
    this.minimizeButton.on("pointerdown", () => this.toggleMinimize())
    this.container.add(this.minimizeButton)

    // Content area
    this.contentArea = this.scene.add.container(this.padding, 40)
    this.container.add(this.contentArea)

    // Create animations list
    this.createAnimationsList()
  }

  createAnimationsList() {
    // Title for animations
    const animsTitle = this.scene.add.text(0, 0, "Click to play animation:", {
      fontSize: "14px",
      fill: "#ffffff",
      fontStyle: "bold",
    })
    this.contentArea.add(animsTitle)

    // Create a scrollable list of animations
    const yOffset = 30
    const lineHeight = 20

    this.animTextObjects = []

    this.animations.forEach((anim, index) => {
      const animName = anim.anim || "unnamed"
      const offsets = anim.offsets || [0, 0]

      const animText = this.scene.add.text(
        0,
        yOffset + index * lineHeight,
        `${animName} [${offsets[0]}, ${offsets[1]}]`,
        { fontSize: "12px", fill: "#ffffff" },
      )

      // Make animation text interactive
      animText.setInteractive({ useHandCursor: true })
      animText.on("pointerover", () => {
        if (this.scene.currentAnimation !== animName) {
          animText.setStyle({ fill: "#3498db" })
        }
      })
      animText.on("pointerout", () => {
        if (this.scene.currentAnimation !== animName) {
          animText.setStyle({ fill: "#ffffff" })
        }
      })
      animText.on("pointerdown", () => {
        // Play the animation in the scene
        this.scene.playAnimation(animName)

        // Highlight the selected animation
        this.highlightSelectedAnimation(index)
      })

      this.contentArea.add(animText)
      this.animTextObjects.push(animText)
    })

    // Adjust panel height if needed to fit all animations
    const totalContentHeight = 30 + this.animations.length * lineHeight + 20
    if (totalContentHeight > this.height - 40) {
      this.panel.height = totalContentHeight + 40
      this.height = totalContentHeight + 40
    }
  }

  highlightSelectedAnimation(selectedIndex) {
    // Reset all animation text styles
    this.animTextObjects.forEach((text, index) => {
      if (index === selectedIndex) {
        text.setStyle({ fill: "#ffff00", fontStyle: "bold" })
      } else {
        text.setStyle({ fill: "#ffffff", fontStyle: "normal" })
      }
    })
  }

  addEventListeners() {
    // Make title bar draggable
    this.titleBar.setInteractive({ useHandCursor: true })

    this.titleBar.on("pointerdown", (pointer) => {
      this.isDragging = true
      this.dragOffset.x = pointer.x - this.container.x
      this.dragOffset.y = pointer.y - this.container.y
    })

    this.scene.input.on("pointermove", (pointer) => {
      if (this.isDragging) {
        this.container.x = pointer.x - this.dragOffset.x
        this.container.y = pointer.y - this.dragOffset.y
      }
    })

    this.scene.input.on("pointerup", () => {
      this.isDragging = false
    })

    // Make sure the modal stays in the camera view
    this.scene.events.on("update", this.updatePosition, this)
  }

  updatePosition() {
    // Ensure the modal stays within the camera bounds
    const camera = this.camera
    const bounds = {
      left: camera.scrollX,
      top: camera.scrollY,
      right: camera.scrollX + camera.width,
      bottom: camera.scrollY + camera.height,
    }

    // Adjust position if needed
    if (this.container.x < bounds.left) {
      this.container.x = bounds.left
    } else if (this.container.x + this.width > bounds.right) {
      this.container.x = bounds.right - this.width
    }

    if (this.container.y < bounds.top) {
      this.container.y = bounds.top
    } else if (this.container.y + this.height > bounds.bottom) {
      this.container.y = bounds.bottom - this.height
    }
  }

  toggleMinimize() {
    this.isMinimized = !this.isMinimized

    if (this.isMinimized) {
      // Hide content area and resize panel
      this.contentArea.setVisible(false)
      this.panel.height = 30
    } else {
      // Show content area and restore panel size
      this.contentArea.setVisible(true)
      this.panel.height = this.height
    }
  }

  close() {
    // Remove event listeners
    this.scene.events.off("update", this.updatePosition, this)

    // Destroy the container and all its children
    this.container.destroy()
  }
}

// Character Properties Modal Window class
class CharacterPropertiesModal {
  constructor(scene, options = {}) {
    this.scene = scene
    this.camera = scene.cameras.main

    // Default options
    this.x = options.x || 800 // Positioned to the right of animations modal
    this.y = options.y || 100
    this.width = options.width || 250
    this.height = options.height || 300
    this.title = "Character Properties"
    this.backgroundColor = 0x2c3e50
    this.titleColor = 0x3498db
    this.alpha = 0.9
    this.padding = 10

    // Properties data
    this.characterData = options.characterData || {}

    // State variables
    this.isMinimized = false
    this.isDragging = false
    this.dragOffset = { x: 0, y: 0 }

    this.createModal()
    this.addEventListeners()
  }

  createModal() {
    // Container setup
    this.container = this.scene.add.container(this.x, this.y)
    this.container.setDepth(1000)

    // Background
    this.panel = this.scene.add.rectangle(0, 0, this.width, this.height, this.backgroundColor, this.alpha).setOrigin(0, 0)
    this.container.add(this.panel)

    // Title bar
    this.titleBar = this.scene.add.rectangle(0, 0, this.width, 30, this.titleColor, this.alpha).setOrigin(0, 0)
    this.container.add(this.titleBar)

    // Title text
    this.titleText = this.scene.add.text(10, 5, this.title, {
      fontSize: "16px",
      fill: "#ffffff",
    })
    this.container.add(this.titleText)

    // Minimize/Close buttons
    this.setupButtons()

    // Content area
    this.contentArea = this.scene.add.container(this.padding, 40)
    this.container.add(this.contentArea)

    // Display properties
    this.displayProperties()
  }

  setupButtons() {
    // Close button
    this.closeButton = this.scene.add.text(this.width - 30, 5, "X", {
      fontSize: "16px",
      fill: "#ffffff",
    })
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.close())
    this.container.add(this.closeButton)

    // Minimize button
    this.minimizeButton = this.scene.add.text(this.width - 50, 5, "_", {
      fontSize: "16px",
      fill: "#ffffff",
    })
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.toggleMinimize())
    this.container.add(this.minimizeButton)
  }

  displayProperties() {
    const properties = {
      "Anti-aliasing": !this.characterData.no_antialiasing,
      Position: this.characterData.position || [0, 0],
      "Camera Position": this.characterData.camera_position || [0, 0],
      "Sing Duration": this.characterData.sing_duration || 4,
      "Flip X": this.characterData.flip_x || false,
      Scale: this.characterData.scale || 1,
      "Is Player": this.characterData._editor_isPlayer || false,
    }

    let yPos = 0
    Object.entries(properties).forEach(([key, value]) => {
      // Property name
      const propText = this.scene.add.text(0, yPos, `${key}:`, {
        fontSize: "14px",
        fill: "#3498db",
        fontStyle: "bold",
      })

      // Property value
      let valueText
      if (Array.isArray(value)) {
        valueText = `[${value.join(", ")}]`
      } else if (typeof value === "boolean") {
        valueText = value ? "✓" : "✗"
      } else {
        valueText = value.toString()
      }

      const valueDisplay = this.scene.add.text(100, yPos, valueText, {
        fontSize: "14px",
        fill: "#ffffff",
      })

      this.contentArea.add([propText, valueDisplay])
      yPos += 30
    })
  }

  addEventListeners() {
    this.titleBar.setInteractive({ useHandCursor: true })
    this.titleBar.on("pointerdown", (pointer) => {
      this.isDragging = true
      this.dragOffset.x = pointer.x - this.container.x
      this.dragOffset.y = pointer.y - this.container.y
    })

    this.scene.input.on("pointermove", (pointer) => {
      if (this.isDragging) {
        this.container.x = pointer.x - this.dragOffset.x
        this.container.y = pointer.y - this.dragOffset.y
      }
    })

    this.scene.input.on("pointerup", () => {
      this.isDragging = false
    })

    this.scene.events.on("update", this.updatePosition, this)
  }

  updatePosition() {
    const bounds = {
      left: this.camera.scrollX,
      top: this.camera.scrollY,
      right: this.camera.scrollX + this.camera.width,
      bottom: this.camera.scrollY + this.camera.height,
    }

    if (this.container.x < bounds.left) {
      this.container.x = bounds.left
    } else if (this.container.x + this.width > bounds.right) {
      this.container.x = bounds.right - this.width
    }

    if (this.container.y < bounds.top) {
      this.container.y = bounds.top
    } else if (this.container.y + this.height > bounds.bottom) {
      this.container.y = bounds.bottom - this.height
    }
  }

  toggleMinimize() {
    this.isMinimized = !this.isMinimized
    if (this.isMinimized) {
      this.contentArea.setVisible(false)
      this.panel.height = 30
    } else {
      this.contentArea.setVisible(true)
      this.panel.height = this.height
    }
  }

  close() {
    this.scene.events.off("update", this.updatePosition, this)
    this.container.destroy()
  }
}

// Kill me
window.game.scene.add("CharacterEditorState", CharacterEditorState)