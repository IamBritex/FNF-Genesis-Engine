// Character Editor with proper XML parsing for FNF-style sprites
class CharacterEditorState extends Phaser.Scene {
  constructor() {
    super({ key: "CharacterEditorState" })
    this.isDragging = false
    this.currentZoom = 1
    this.minZoom = 0.1
    this.maxZoom = 5
    this.modal = null
    this.animsModal = null
    this.characterPropertiesModal = null
    this.characterConfigsModal = null
    this.characterSprite = null
    this.ghostSprite = null
    this.isGhostActive = false
    this.ghostInitialAnim = null
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

    // Ajustar escala del fondo para que sea mss grande y evitar que el personaje se salga xd
    const scaleFactor = 1.5 // Aumentar el factor de escala
    this.bg.setScale(Math.max(width / this.bg.width, height / this.bg.height) * scaleFactor)

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

    // Add space key handler for playing current animation
    this.input.keyboard.on("keydown-SPACE", () => {
      if (this.currentAnimation && this.characterSprite) {
        this.playAnimation(this.currentAnimation)
        console.log(`Replaying animation: ${this.currentAnimation}`)
      }
    })

    // Configurar controles de cámara
    this.setupCameraControls()

    // Add the modal window
    this.setupModals()
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

    // Clear any existing ghost
    this.clearGhost()

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

  // Modify the createCharacterSprite method to match Characters.js
  createCharacterSprite(characterData, imagePath) {
    // Create the sprite directly without a container, using origin (0,0) like in Characters.js
    this.characterSprite = this.add.sprite(0, 0, imagePath)
    this.characterSprite.setOrigin(0, 0)
    this.characterSprite.setDepth(1)

    // Store base position
    this.basePosition = {
      x: characterData.position ? characterData.position[0] : 0,
      y: characterData.position ? characterData.position[1] : 0,
    }

    // Set scale from character data
    if (characterData.scale) {
      this.characterSprite.setScale(characterData.scale)
    }

    // If flip_x is true, flip all frames in the texture
    if (characterData.flip_x) {
      const texture = this.textures.get(imagePath)
      const frames = texture.getFrameNames()

      frames.forEach((frameName) => {
        const frame = texture.frames[frameName]
        if (frame && !frame._flipped) {
          const canvas = document.createElement("canvas")
          const ctx = canvas.getContext("2d")
          canvas.width = frame.width
          canvas.height = frame.height

          ctx.save()
          ctx.scale(-1, 1)
          ctx.drawImage(
            frame.source.image,
            -frame.cutX - frame.width,
            frame.cutY,
            frame.width,
            frame.height,
            0,
            0,
            frame.width,
            frame.height,
          )
          ctx.restore()

          // Replace the frame with the flipped version
          texture.add(frameName, 0, frame.cutX, frame.cutY, frame.width, frame.height, canvas)
          frame._flipped = true
        }
      })

      // Store the flipped state
      this.characterSprite.isFlipped = true
    }

    // Position the sprite using gsap, exactly like in Characters.js
    if (typeof gsap !== "undefined") {
      gsap.set(this.characterSprite, {
        x: this.basePosition.x,
        y: this.basePosition.y,
      })
    } else {
      // Fallback if gsap is not available
      this.characterSprite.setPosition(this.basePosition.x, this.basePosition.y)
    }

    // Center camera on character
    this.cameras.main.centerOn(this.basePosition.x, this.basePosition.y)

    // Parse XML and create frames
    this.parseXMLAndCreateFrames(characterData, imagePath)

    // Setup offset controls
    this.setupOffsetControls()
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
      }

      console.log(`Processed ${subTextures.length} SubTexture elements`)

      // Setup animations using the Characters.js approach
      this.setupAnimations(characterData, imagePath)
    } catch (error) {
      console.error("Error parsing XML:", error)
    }
  }

  // Setup animations using the Characters.js approach
  setupAnimations(characterData, imagePath) {
    if (!characterData.animations || characterData.animations.length === 0) {
      console.warn("No animations found in character data")
      return
    }

    console.log(`Setting up animations for ${characterData.animations.length} animation definitions`)

    // Process each animation in the character data
    characterData.animations.forEach((animation) => {
      try {
        const animName = animation.anim // e.g., "singLEFT"
        const animBaseName = animation.name // e.g., "BF NOTE LEFT"
        const fps = animation.fps || 24
        const loop = animation.loop !== undefined ? animation.loop : animName === "idle"

        console.log(`Processing animation: ${animName}, baseName: ${animBaseName}`)

        const frames = this.textures.get(imagePath).getFrameNames()
        let animationFrames = []

        // Use the exact same logic as Characters.js
        if (animation.indices?.length > 0) {
          // If indices are provided, use them to find frames
          animationFrames = animation.indices
            .map((index) => {
              const paddedIndex = String(index).padStart(4, "0")
              return frames.find((frame) => frame.startsWith(`${animBaseName}${paddedIndex}`))
            })
            .filter(Boolean)
        } else {
          // Otherwise, filter frames that start with the animation name
          animationFrames = frames.filter((frame) => frame.startsWith(animBaseName)).sort()
        }

        if (animationFrames.length > 0) {
          const animKey = `${imagePath}_${animName}`

          // Remove existing animation if it exists
          if (this.anims.exists(animKey)) {
            this.anims.remove(animKey)
          }

          // Create animation config exactly like in Characters.js
          this.anims.create({
            key: animKey,
            frames: animationFrames.map((frameName) => ({
              key: imagePath,
              frame: frameName,
            })),
            frameRate: fps,
            repeat: loop ? -1 : 0,
          })

          console.log(`Created animation: ${animKey} with ${animationFrames.length} frames`)
        } else {
          console.warn(`No frames found for animation: ${animName} using name: ${animBaseName}`)
        }
      } catch (error) {
        console.error(`Error creating animation ${animation.anim}:`, error)
      }
    })

    // Play idle animation by default
    this.playAnimation("idle")
  }

  // Play animation with offsets - match the approach in Characters.js
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

    // Only change animation if it's different from current
    if (this.currentAnimation !== animName) {
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
  }

  // Apply offsets - match the approach in Characters.js
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

    // First reset to base position using gsap.set, exactly like in Characters.js
    if (typeof gsap !== "undefined") {
      gsap.set(this.characterSprite, {
        x: this.basePosition.x,
        y: this.basePosition.y,
      })
    } else {
      // Fallback if gsap is not available
      this.characterSprite.setPosition(this.basePosition.x, this.basePosition.y)
    }

    // Get offsets
    const offsets = animation.offsets || [0, 0]
    const [offsetX, offsetY] = offsets

    // Apply offsets using gsap, exactly like in Characters.js
    if (typeof gsap !== "undefined") {
      try {
        // Use GSAP if available
        const tween = gsap.to(this.characterSprite, {
          x: this.basePosition.x + offsetX,
          y: this.basePosition.y + offsetY,
          duration: 0, // Instantaneous
          ease: "none",
          overwrite: "auto",
        })

        // Store reference to the tween
        this.activeTweens.character = tween
      } catch (error) {
        // Fallback to direct positioning if GSAP fails
        console.warn("GSAP error, using direct positioning:", error)
        this.characterSprite.setPosition(this.basePosition.x + offsetX, this.basePosition.y + offsetY)
      }
    } else {
      // Fallback to direct positioning
      this.characterSprite.setPosition(this.basePosition.x + offsetX, this.basePosition.y + offsetY)
    }

    console.log(`Applied offsets for ${animName}: [${offsetX}, ${offsetY}]`)
  }

  // Setup offset controls
  setupOffsetControls() {
    // Track if control key is pressed
    this.isCtrlPressed = false

    // Add keyboard listeners
    this.input.keyboard.on("keydown-CTRL", () => {
      this.isCtrlPressed = true
    })

    this.input.keyboard.on("keyup-CTRL", () => {
      this.isCtrlPressed = false
    })

    // Arrow key handlers
    this.input.keyboard.on("keydown-LEFT", () => {
      this.moveOffset(-1 * (this.isCtrlPressed ? 5 : 1), 0)
    })

    this.input.keyboard.on("keydown-RIGHT", () => {
      this.moveOffset(1 * (this.isCtrlPressed ? 5 : 1), 0)
    })

    this.input.keyboard.on("keydown-UP", () => {
      this.moveOffset(0, -1 * (this.isCtrlPressed ? 5 : 1))
    })

    this.input.keyboard.on("keydown-DOWN", () => {
      this.moveOffset(0, 1 * (this.isCtrlPressed ? 5 : 1))
    })

    // Make character draggable
    if (this.characterSprite) {
      this.characterSprite.setInteractive({ draggable: true })

      this.characterSprite.on("dragstart", () => {
        this.dragStartPosition = {
          x: this.characterSprite.x,
          y: this.characterSprite.y,
        }
      })

      this.characterSprite.on("drag", (pointer, dragX, dragY) => {
        // Calculate the offset from the base position
        const offsetX = Math.round(dragX - this.basePosition.x)
        const offsetY = Math.round(dragY - this.basePosition.y)

        // Update the character position
        this.characterSprite.setPosition(dragX, dragY)

        // Update the offsets in the character data
        this.updateOffsets(offsetX, offsetY)
      })
    }
  }

  // Add method to move offset by a specific amount
  moveOffset(deltaX, deltaY) {
    if (!this.characterSprite || !this.characterData || !this.currentAnimation) return

    // Find the animation in the character data
    const animation = this.characterData.animations.find((a) => a.anim === this.currentAnimation)
    if (!animation) return

    // Get current offsets
    const currentOffsets = animation.offsets || [0, 0]

    // Calculate new offsets
    const newOffsetX = currentOffsets[0] + deltaX
    const newOffsetY = currentOffsets[1] + deltaY

    // Update the offsets
    this.updateOffsets(newOffsetX, newOffsetY)

    // Apply the new offsets
    this.applyOffsets(this.currentAnimation)
  }

  // Add method to update offsets in the character data
  updateOffsets(offsetX, offsetY) {
    if (!this.characterData || !this.currentAnimation) return

    // Find the animation in the character data
    const animation = this.characterData.animations.find((a) => a.anim === this.currentAnimation)
    if (!animation) return

    // Update the offsets
    animation.offsets = [offsetX, offsetY]

    // Update the animation text in the animations modal if it exists
    if (this.animsModal) {
      this.animsModal.updateAnimationText(this.currentAnimation, [offsetX, offsetY])
    }

    console.log(`Updated offsets for ${this.currentAnimation}: [${offsetX}, ${offsetY}]`)
  }

  // Create ghost sprite
  createGhost(animName) {
    if (!this.characterSprite || !this.characterData) return

    // Clear any existing ghost
    this.clearGhost()

    // Find the animation in the character data
    const animation = this.characterData.animations.find((a) => a.anim === animName)
    if (!animation) return

    // Get the offsets for this animation
    const offsets = animation.offsets || [0, 0]
    const [offsetX, offsetY] = offsets

    // Create a copy of the character sprite
    const imagePath = this.characterData.image
    this.ghostSprite = this.add.sprite(0, 0, imagePath)
    this.ghostSprite.setOrigin(0, 0) // Use origin (0,0) like in Characters.js
    this.ghostSprite.setDepth(0.5) // Below the character
    this.ghostSprite.setAlpha(0.5) // Semi-transparent
    this.ghostSprite.setTint(0x0088ff) // Blue tint

    // Match the scale of the character
    this.ghostSprite.setScale(this.characterSprite.scaleX, this.characterSprite.scaleY)

    // Position the ghost at the FIXED position with the current animation's offset
    // This position will never change
    this.ghostSprite.setPosition(this.basePosition.x + offsetX, this.basePosition.y + offsetY)

    // Play the same animation
    const animKey = `${this.characterData.image}_${animName}`
    if (this.anims.exists(animKey)) {
      this.ghostSprite.play(animKey)
    }

    // Store the initial animation
    this.ghostInitialAnim = animName
    this.isGhostActive = true

    console.log(`Created ghost for animation: ${animName} at fixed position`)
  }

  // Clear ghost sprite
  clearGhost() {
    if (this.ghostSprite) {
      this.ghostSprite.destroy()
      this.ghostSprite = null
    }
    this.isGhostActive = false
    this.ghostInitialAnim = null
  }

  // Toggle ghost visibility
  toggleGhost(active) {
    if (active && !this.isGhostActive && this.currentAnimation) {
      this.createGhost(this.currentAnimation)
    } else if (!active && this.isGhostActive) {
      this.clearGhost()
    }
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

    this.height = 200 // Increase height to accommodate save button
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

    // Add save button
    this.saveButton = this.scene.add.rectangle(0, 70, 150, 30, 0x27ae60, 1)
    this.saveButton.setOrigin(0, 0)
    this.contentArea.add(this.saveButton)

    this.saveButtonText = this.scene.add.text(75, 85, "Save Character", { fontSize: "14px", fill: "#ffffff" })
    this.saveButtonText.setOrigin(0.5, 0.5)
    this.contentArea.add(this.saveButtonText)

    // Make save button interactive
    this.saveButton.setInteractive({ useHandCursor: true })
    this.saveButton.on("pointerdown", () => this.saveCharacter())

    // Move status text down
    this.statusText = this.scene.add.text(0, 110, "No character data loaded", { fontSize: "14px", fill: "#ffffff" })
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

    // Create the character configs modal
    this.createCharacterConfigsModal(data)
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

  createCharacterConfigsModal(data) {
    // Create a new modal for character configs
    if (this.scene.characterConfigsModal) {
      this.scene.characterConfigsModal.close()
    }

    this.scene.characterConfigsModal = new CharacterConfigsModal(this.scene, {
      x: this.x,
      y: this.y + this.height + 20,
      width: 300,
      height: 200,
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

  saveCharacter() {
    if (!this.characterData) {
      this.statusText.setText("No character data to save")
      return
    }

    try {
      // Convert the character data to JSON
      const jsonData = JSON.stringify(this.characterData, null, 2)

      // Create a blob with the JSON data
      const blob = new Blob([jsonData], { type: "application/json" })

      // Create a URL for the blob
      const url = URL.createObjectURL(blob)

      // Create a temporary link element
      const a = document.createElement("a")
      a.href = url

      // Set the filename to the original name or a default
      const filename = this.characterData.image ? `${this.characterData.image}.json` : "character.json"
      a.download = filename

      // Append the link to the body
      document.body.appendChild(a)

      // Trigger the download
      a.click()

      // Clean up
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      this.statusText.setText("Character saved!")
    } catch (error) {
      console.error("Error saving character:", error)
      this.statusText.setText(`Error saving: ${error.message}`)
    }
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
      right: camera.scrollX + this.camera.width,
      bottom: camera.scrollY + this.camera.height,
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

  updateAnimationText(animName, offsets) {
    // Find the animation text object
    const index = this.animations.findIndex((a) => a.anim === animName)
    if (index === -1 || !this.animTextObjects[index]) return

    // Update the text
    this.animTextObjects[index].setText(`${animName} [${offsets[0]}, ${offsets[1]}]`)
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
    this.panel = this.scene.add
      .rectangle(0, 0, this.width, this.height, this.backgroundColor, this.alpha)
      .setOrigin(0, 0)
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
    this.closeButton = this.scene.add
      .text(this.width - 30, 5, "X", {
        fontSize: "16px",
        fill: "#ffffff",
      })
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.close())
    this.container.add(this.closeButton)

    // Minimize button
    this.minimizeButton = this.scene.add
      .text(this.width - 50, 5, "_", {
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

// Character Configs Modal Window class
class CharacterConfigsModal {
  constructor(scene, options = {}) {
    this.scene = scene
    this.camera = scene.cameras.main

    // Default options
    this.x = options.x || 100
    this.y = options.y || 300
    this.width = options.width || 300
    this.height = options.height || 200
    this.title = "Character Configs"
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
    this.ghostActive = false

    this.createModal()
    this.addEventListeners()
  }

  createModal() {
    // Container setup
    this.container = this.scene.add.container(this.x, this.y)
    this.container.setDepth(1000)

    // Background
    this.panel = this.scene.add
      .rectangle(0, 0, this.width, this.height, this.backgroundColor, this.alpha)
      .setOrigin(0, 0)
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

    // Add ghost guide checkbox
    this.createGhostGuideControls()
  }

  setupButtons() {
    // Close button
    this.closeButton = this.scene.add
      .text(this.width - 30, 5, "X", {
        fontSize: "16px",
        fill: "#ffffff",
      })
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.close())
    this.container.add(this.closeButton)

    // Minimize button
    this.minimizeButton = this.scene.add
      .text(this.width - 50, 5, "_", {
        fontSize: "16px",
        fill: "#ffffff",
      })
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.toggleMinimize())
    this.container.add(this.minimizeButton)
  }

  createGhostGuideControls() {
    // Title for ghost guide
    const ghostTitle = this.scene.add.text(0, 0, "Ghost Guide:", {
      fontSize: "16px",
      fill: "#3498db",
      fontStyle: "bold",
    })
    this.contentArea.add(ghostTitle)

    // Description
    const ghostDesc = this.scene.add.text(0, 30, "Creates a blue ghost of the current\nanimation for reference", {
      fontSize: "12px",
      fill: "#ffffff",
    })
    this.contentArea.add(ghostDesc)

    // Checkbox background
    const checkboxBg = this.scene.add.rectangle(0, 70, 20, 20, 0x555555)
    checkboxBg.setOrigin(0, 0)
    this.contentArea.add(checkboxBg)

    // Checkbox
    this.checkbox = this.scene.add.rectangle(2, 72, 16, 16, 0xffffff)
    this.checkbox.setOrigin(0, 0)
    this.checkbox.setVisible(false) // Initially unchecked
    this.contentArea.add(this.checkbox)

    // Make checkbox interactive
    checkboxBg.setInteractive({ useHandCursor: true })
    checkboxBg.on("pointerdown", () => {
      this.ghostActive = !this.ghostActive
      this.checkbox.setVisible(this.ghostActive)

      // Toggle ghost in the scene
      this.scene.toggleGhost(this.ghostActive)
    })

    // Label
    const checkboxLabel = this.scene.add.text(30, 70, "Enable Ghost Guide", {
      fontSize: "14px",
      fill: "#ffffff",
    })
    this.contentArea.add(checkboxLabel)

    // Add button to clear ghost
    const clearButton = this.scene.add.rectangle(0, 100, 120, 30, 0x3498db)
    clearButton.setOrigin(0, 0)
    this.contentArea.add(clearButton)

    const clearText = this.scene.add.text(60, 115, "Clear Ghost", {
      fontSize: "14px",
      fill: "#ffffff",
    })
    clearText.setOrigin(0.5, 0.5)
    this.contentArea.add(clearText)

    clearButton.setInteractive({ useHandCursor: true })
    clearButton.on("pointerdown", () => {
      this.ghostActive = false
      this.checkbox.setVisible(false)
      this.scene.clearGhost()
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
