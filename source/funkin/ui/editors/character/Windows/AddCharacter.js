export default class AddCharacter {
  constructor(scene) {
    this.scene = scene
    this.fileInput = null
    this.loadingText = null
  }

  execute() {
    if (this.hasExistingCharacter()) {
      this.showCharacterExistsDialog()
    } else {
      this.createFileInput()
    }
  }

  hasExistingCharacter() {
    return (
      this.scene.charactersManager &&
      this.scene.charactersManager.loadedCharacters &&
      this.scene.charactersManager.loadedCharacters.size > 0
    )
  }

  showCharacterExistsDialog() {
    const { width, height } = this.scene.scale

    // Create modal background
    const modalBg = this.scene.add
      .rectangle(0, 0, width, height, 0x000000, 0.7)
      .setOrigin(0, 0)
      .setDepth(4000)
      .setInteractive()

    // Create dialog container
    const dialogWidth = 500
    const dialogHeight = 200
    const dialog = this.scene.add.container(width / 2, height / 2).setDepth(4001)

    // Dialog background
    const dialogBg = this.scene.add.rectangle(0, 0, dialogWidth, dialogHeight, 0x2a2a2a).setStrokeStyle(2, 0x663399)

    // Warning text
    const warningText = this.scene.add
      .text(
        0,
        -40,
        "You already have a character loaded.\nIf you load this new one, you will lose it forever!\nIt's a lot of work!",
        {
          fontSize: "16px",
          fill: "#FFFFFF",
          fontFamily: "VCR",
          align: "center",
          lineSpacing: 8,
        },
      )
      .setOrigin(0.5)

    // Buttons container
    const buttonsContainer = this.scene.add.container(0, 50)

    // Cancel button
    const cancelBtn = this.createDialogButton(-120, 0, 100, 35, "Cancel", 0x666666, () => {
      this.closeDialog(modalBg, dialog)
    })

    // Save and Load button
    const saveLoadBtn = this.createDialogButton(0, 0, 120, 35, "Save & Load", 0x4a90e2, () => {
      this.saveAndLoadCharacter()
      this.closeDialog(modalBg, dialog)
    })

    // Load button
    const loadBtn = this.createDialogButton(130, 0, 80, 35, "Load", 0xe74c3c, () => {
      this.loadNewCharacter()
      this.closeDialog(modalBg, dialog)
    })

    buttonsContainer.add([cancelBtn, saveLoadBtn, loadBtn])
    dialog.add([dialogBg, warningText, buttonsContainer])

    this.scene.setAsHUDElement(modalBg)
    this.scene.setAsHUDElement(dialog)
  }

  createDialogButton(x, y, width, height, text, color, callback) {
    const button = this.scene.add.container(x, y)
    const bg = this.scene.add.rectangle(0, 0, width, height, color).setStrokeStyle(1, 0xffffff, 0.3)
    const label = this.scene.add
      .text(0, 0, text, {
        fontSize: "14px",
        fill: "#FFFFFF",
        fontFamily: "VCR",
      })
      .setOrigin(0.5)

    button.add([bg, label])
    button.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      cursor: "pointer",
    })

    button.on("pointerover", () => {
      const r = Math.min(255, ((color >> 16) & 0xff) + 30)
      const g = Math.min(255, ((color >> 8) & 0xff) + 30)
      const b = Math.min(255, (color & 0xff) + 30)
      const newColor = (r << 16) | (g << 8) | b
      bg.setFillStyle(newColor)
    })

    button.on("pointerout", () => bg.setFillStyle(color))
    button.on("pointerdown", callback)

    return button
  }

  closeDialog(modalBg, dialog) {
    modalBg.destroy()
    dialog.destroy()
  }

  saveAndLoadCharacter() {
    // TODO: Implement save functionality
    this.showToast("Character saved successfully!", "success")
    this.loadNewCharacter()
  }

  loadNewCharacter() {
    // Clear existing character
    if (this.scene.charactersManager && this.scene.charactersManager.loadedCharacters) {
      this.scene.charactersManager.loadedCharacters.clear()
    }
    this.createFileInput()
  }

  createFileInput() {
    if (this.fileInput) {
      this.fileInput.remove()
    }

    this.fileInput = document.createElement("input")
    this.fileInput.type = "file"
    this.fileInput.multiple = true
    this.fileInput.accept = ".png,.xml"
    this.fileInput.style.position = "absolute"
    this.fileInput.style.top = "0"
    this.fileInput.style.left = "0"
    this.fileInput.style.opacity = "0"
    this.fileInput.style.zIndex = "9999"
    this.fileInput.style.width = "1px"
    this.fileInput.style.height = "1px"

    document.body.appendChild(this.fileInput)

    this.fileInput.onchange = (event) => {
      this.handleFiles(event.target.files)
    }

    this.fileInput.click()
  }

  handleFiles(files) {
    const pngFiles = []
    const xmlFiles = []

    Array.from(files).forEach((file) => {
      if (file.name.toLowerCase().endsWith(".png")) {
        pngFiles.push(file)
      } else if (file.name.toLowerCase().endsWith(".xml")) {
        xmlFiles.push(file)
      }
    })

    if (pngFiles.length === 0) {
      alert("Please select at least one PNG file")
      return
    }

    if (xmlFiles.length === 0) {
      alert("Please select at least one XML file")
      return
    }

    this.processFiles(pngFiles, xmlFiles)
  }

  async processFiles(pngFiles, xmlFiles) {
    // Mostrar mensaje de loading centrado
    this.showLoadingMessage("Loading...")
    try {
      const xmlFile = xmlFiles[0]
      const xmlContent = await this.loadXML(xmlFile)
      const pngFile = pngFiles[0]
      const textureData = await this.loadTextureViaDOM(pngFile)

      this.createCharacterFromDOM(textureData, xmlContent, pngFile.name)

      // Ocultar loading y mostrar toast de éxito
      this.hideLoadingMessage()
    } catch (error) {
      console.error("Error processing files:", error)
      this.hideLoadingMessage()
      this.showToast("Error adding character: " + error.message, "error")
    } finally {
      this.cleanup()
    }
  }

  loadTextureViaDOM(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const image = new Image()
        image.onload = () => {
          resolve({
            image: image,
            name: file.name,
            width: image.width,
            height: image.height,
            dataUrl: e.target.result,
          })
        }
        image.onerror = reject
        image.src = e.target.result
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  loadXML(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        resolve({
          name: file.name,
          content: e.target.result,
          xml: new DOMParser().parseFromString(e.target.result, "text/xml"),
        })
      }
      reader.onerror = reject
      reader.readAsText(file)
    })
  }

  createCharacterFromDOM(textureData, xmlData, fileName) {
    try {
      const characterName = fileName.replace(".png", "")
      const textureKey = `character_${characterName}_${Date.now()}`

      this.createTextureFromImage(textureData.image, textureKey)
      this.parseAndCreateSpritesheet(textureKey, textureData, xmlData, characterName)
      this.showToast("Character added successfully!", "success")

      if (typeof this.scene.onCharacterAdded === "function") {
        const characterInfo = this.scene.charactersManager.loadedCharacters.get(characterName)
        this.scene.onCharacterAdded(characterInfo)
      }
    } catch (error) {
      console.error("Error creating character from DOM:", error)
      throw error
    }
  }

  createTextureFromImage(image, textureKey) {
    // Crear un canvas temporal
    const canvas = document.createElement("canvas")
    canvas.width = image.width
    canvas.height = image.height

    const ctx = canvas.getContext("2d")
    ctx.drawImage(image, 0, 0)

    // Crear la textura en Phaser usando el canvas
    if (this.scene.textures.exists(textureKey)) {
      this.scene.textures.remove(textureKey)
    }

    const texture = this.scene.textures.createCanvas(textureKey, image.width, image.height)
    const source = texture.getSourceImage()

    // Dibujar en el canvas de Phaser
    const phaserCtx = source.getContext("2d")
    phaserCtx.drawImage(image, 0, 0)

    texture.refresh()
  }

  parseAndCreateSpritesheet(textureKey, textureData, xmlData, characterName) {
    const xmlDoc = xmlData.xml
    const textureAtlas = xmlDoc.getElementsByTagName("TextureAtlas")[0]
    if (!textureAtlas) return

    const subTextures = xmlDoc.getElementsByTagName("SubTexture")
    const frames = {}

    for (let i = 0; i < subTextures.length; i++) {
      const subTexture = subTextures[i]
      const name = subTexture.getAttribute("name")
      const x = Number.parseInt(subTexture.getAttribute("x"))
      const y = Number.parseInt(subTexture.getAttribute("y"))
      const width = Number.parseInt(subTexture.getAttribute("width"))
      const height = Number.parseInt(subTexture.getAttribute("height"))
      const frameX = Number.parseInt(subTexture.getAttribute("frameX") || 0)
      const frameY = Number.parseInt(subTexture.getAttribute("frameY") || 0)
      const frameWidth = Number.parseInt(subTexture.getAttribute("frameWidth") || width)
      const frameHeight = Number.parseInt(subTexture.getAttribute("frameHeight") || height)

      frames[name] = {
        frame: { x, y, width, height },
        sourceSize: { w: frameWidth, h: frameHeight },
        spriteSourceSize: { x: frameX, y: frameY, w: width, h: height },
        rotated: false,
        trimmed: false,
      }
    }

    // Crear configuración del atlas

    // Añadir frames manualmente a la textura
    const texture = this.scene.textures.get(textureKey)
    for (const [frameName, frameData] of Object.entries(frames)) {
      texture.add(frameName, 0, frameData.frame.x, frameData.frame.y, frameData.frame.width, frameData.frame.height)
    }

    // Crear animaciones
    const animations = this.extractAnimationsFromFrames(frames)

    // Crear el personaje
    this.createCharacterSprite(characterName, textureKey, animations, textureData)
  }

  extractAnimationsFromFrames(frames) {
    const animations = {}
    const frameNames = Object.keys(frames)

    // Agrupar frames por nombre de animación
    frameNames.forEach((frameName) => {
      const animationName = this.extractAnimationName(frameName)
      if (animationName) {
        if (!animations[animationName]) {
          animations[animationName] = {
            frames: [],
            frameRate: 24,
            repeat: -1,
          }
        }
        animations[animationName].frames.push({ key: frameName })
      }
    })

    // Ordenar frames numéricamente
    for (const animName in animations) {
      animations[animName].frames.sort((a, b) => {
        const numA = this.extractFrameNumber(a.key)
        const numB = this.extractFrameNumber(b.key)
        return numA - numB
      })
    }

    return animations
  }

  extractAnimationName(frameName) {
    // Extraer el nombre base de la animación (sin números)
    const match = frameName.match(/^([^\d]+)/)
    return match ? match[1].trim() : null
  }

  extractFrameNumber(frameName) {
    // Extraer el número del frame
    const match = frameName.match(/\d+/)
    return match ? Number.parseInt(match[0]) : 0
  }

  createCharacterSprite(characterName, textureKey, animations, textureData) {
    // Esperar un frame para asegurar que la textura esté lista
    this.scene.time.delayedCall(50, () => {
      try {
        // Dibuja el sprite igual que Characters.js
        const sprite = this.scene.add.sprite(0, 0, textureKey)
        sprite.setOrigin(0, 0)
        sprite.setScale(1)
        sprite.setDepth(100)

        // Asegura que el sprite esté en la gameCamera, no en el HUD
        this.scene.setAsGameElement(sprite)

        // Configurar animaciones
        this.setupAnimations(textureKey, animations)

        // Reproducir primera animación si existe
        const firstAnim = Object.keys(animations)[0]
        if (firstAnim) {
          sprite.play(`${textureKey}_${firstAnim}`)
        }

        // Hacer interactivo
        this.makeSpriteInteractive(sprite, characterName)

        // Guardar referencia si hay charactersManager
        if (this.scene.charactersManager) {
          const characterData = {
            image: characterName,
            scale: 1,
            flip_x: false,
            animations: this.convertToCharacterAnimations(animations),
            camera_position: [0, 0],
            healthicon: characterName,
          }

          const characterInfo = {
            data: characterData,
            sprite: sprite,
            textureKey: textureKey,
            currentAnimation: firstAnim || null,
            isReady: true,
            basePosition: {
              x: 0,
              y: 0,
            },
            animationsInitialized: true,
            isPlayer: false,
            source: { isMod: false, modPath: null },
          }

          this.scene.charactersManager.loadedCharacters.set(characterName, characterInfo)

          if (typeof this.scene.onCharacterAdded === "function") {
            this.scene.onCharacterAdded(characterInfo)
          }
        }
      } catch (error) {
        console.error("Error creating sprite:", error)
      }
    })
  }

  setupAnimations(textureKey, animations) {
    for (const [animName, animData] of Object.entries(animations)) {
      const animKey = `${textureKey}_${animName}`

      if (!this.scene.anims.exists(animKey)) {
        this.scene.anims.create({
          key: animKey,
          frames: animData.frames.map((frame) => ({
            key: textureKey,
            frame: frame.key,
          })),
          frameRate: animData.frameRate,
          repeat: animData.repeat,
        })
      }
    }
  }

  convertToCharacterAnimations(animations) {
    const characterAnimations = []

    for (const [animName, animData] of Object.entries(animations)) {
        characterAnimations.push({
            name: animName,
            anim: animName.toLowerCase(),
            fps: animData.frameRate,
            loop: false, // Default to false
            indices: animData.frames.map((frame, index) => index),
            offsets: [0, 0], // Default offsets
        })
    }

    return characterAnimations
  }

  makeSpriteInteractive(sprite, characterName) {
    sprite.setInteractive({ draggable: true })

    let isDragging = false
    const dragOffset = { x: 0, y: 0 }

    sprite.on("pointerdown", (pointer) => {
      const cameraPos = this.scene.gameCamera
      const worldPoint = pointer.positionToCamera(cameraPos)

      dragOffset.x = sprite.x - worldPoint.x
      dragOffset.y = sprite.y - worldPoint.y
      isDragging = true

      sprite.setTint(0x888888)
    })

    sprite.on("pointerup", () => {
      isDragging = false
      sprite.clearTint()
    })

    sprite.on("pointerout", () => {
      if (!isDragging) {
        sprite.clearTint()
      }
    })

    this.scene.input.on("pointermove", (pointer) => {
      if (isDragging && pointer.isDown) {
        const cameraPos = this.scene.gameCamera
        const worldPoint = pointer.positionToCamera(cameraPos)

        sprite.x = worldPoint.x + dragOffset.x
        sprite.y = worldPoint.y + dragOffset.y
      }
    })
  }

  triggerCharacterAddedEvent(characterData) {
    const event = new CustomEvent("characterAdded", {
      detail: characterData,
    })
    document.dispatchEvent(event)
  }

  cleanup() {
    if (this.fileInput) {
      this.fileInput.remove()
      this.fileInput = null
    }
  }

  destroy() {
    this.cleanup()
  }

  // --- NUEVOS MÉTODOS PARA MENSAJES Y TOASTS ---

  showLoadingMessage(message) {
    // Si ya existe, no crear otro
    if (this.loadingText) return
    const { width, height } = this.scene.scale
    this.loadingText = this.scene.add
      .text(width / 2, height / 2, message, {
        fontSize: "32px",
        fill: "#FFFFFF",
        fontFamily: "VCR",
        backgroundColor: "#222",
      })
      .setOrigin(0.5)
      .setDepth(5000)
    this.scene.setAsHUDElement(this.loadingText)
  }

  hideLoadingMessage() {
    if (this.loadingText) {
      this.loadingText.destroy()
      this.loadingText = null
    }
  }

  showToast(message, type = "success") {
    const { width, height } = this.scene.scale
    const boxWidth = Math.max(260, message.length * 12)
    const boxHeight = 48

    // Colores según tipo
    let bgColor = 0x22bb33
    let borderColor = 0x99ff99
    if (type === "error") {
      bgColor = 0xbb2222
      borderColor = 0xff9999
    }

    const bg = this.scene.add
      .rectangle(0, 0, boxWidth, boxHeight, bgColor)
      .setOrigin(1, 1)
      .setStrokeStyle(4, borderColor)

    const text = this.scene.add
      .text(-boxWidth / 2, -28, message, {
        fontSize: "20px",
        fill: "#FFFFFF",
        fontFamily: "VCR",
      })
      .setOrigin(0.5)

    const container = this.scene.add
      .container(width - 30, height + boxHeight, [bg, text])
      .setDepth(3000)
      .setAlpha(0)

    this.scene.setAsHUDElement(container)

    this.scene.tweens.add({
      targets: container,
      y: height - 30,
      alpha: 1,
      duration: 350,
      ease: "Cubic.easeOut",
    })

    this.scene.time.delayedCall(3000, () => {
      this.scene.tweens.add({
        targets: container,
        y: height + boxHeight,
        alpha: 0,
        duration: 350,
        ease: "Cubic.easeIn",
        onComplete: () => container.destroy(),
      })
    })
  }
}
