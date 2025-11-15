export default class CharacterPropertiesModal {
  constructor(scene) {
    this.scene = scene
    this.modalContainer = null
    this.isVisible = false
    this.isDragging = false
    this.isMinimized = false
    this.dragOffset = { x: 0, y: 0 }
    this.currentCharacter = null
    this.onionSkinSprite = null
    this.offsetDisplay = { x: null, y: null }
    this.loopCheckbox = null
    this.onionCheckbox = null
    this.lastPosition = null
    this.originalPosition = { x: 0, y: 0 }
    this.currentAnimationDisplay = null
    this.updateTimer = null

    this.modalWidth = 350
    this.modalHeight = 350 // Increased height to accommodate new animation display
    this.titleBarHeight = 40
  }

  show() {
    if (this.isVisible) return

    // Get current character
    this.currentCharacter = this.getCurrentCharacter()
    if (!this.currentCharacter) {
      this.showToast("No character loaded", "error")
      return
    }

    if (this.currentCharacter.sprite) {
      this.originalPosition.x = this.currentCharacter.originalX || this.currentCharacter.sprite.x
      this.originalPosition.y = this.currentCharacter.originalY || this.currentCharacter.sprite.y

      // Store original position in character if not already stored
      if (!this.currentCharacter.originalX) {
        this.currentCharacter.originalX = this.currentCharacter.sprite.x
        this.currentCharacter.originalY = this.currentCharacter.sprite.y
      }
    }

    this.createModal()
    this.isVisible = true

    this.startUpdateTimer()
  }

  startUpdateTimer() {
    if (this.updateTimer) {
      this.updateTimer.destroy()
    }

    this.updateTimer = this.scene.time.addEvent({
      delay: 100, // Update every 100ms
      callback: this.updateContent,
      callbackScope: this,
      loop: true,
    })
  }

  stopUpdateTimer() {
    if (this.updateTimer) {
      this.updateTimer.destroy()
      this.updateTimer = null
    }
  }

  getCurrentCharacter() {
    if (!this.scene.charactersManager?.loadedCharacters) return null

    // Get first character (assuming single character editor)
    const characters = Array.from(this.scene.charactersManager.loadedCharacters.values())
    return characters.length > 0 ? characters[0] : null
  }

  createModal() {
    const { width, height } = this.scene.scale
    const startX = width / 2 - this.modalWidth / 2
    const startY = height / 2 - this.modalHeight / 2

    const roundedBg = this.scene.add.graphics()
    roundedBg.fillStyle(0x2a2a3a)
    roundedBg.lineStyle(2, 0x663399)
    roundedBg.fillRoundedRect(0, 0, this.modalWidth, this.modalHeight, 8)
    roundedBg.strokeRoundedRect(0, 0, this.modalWidth, this.modalHeight, 8)
    roundedBg.setDepth(2001)

    this.modalContainer = this.scene.add.container(startX, startY, [roundedBg])
    this.modalContainer.setSize(this.modalWidth, this.modalHeight)
    this.modalContainer.setDepth(2000)

    this.createTitleBar()
    this.createContent()
    this.setupDragAndDrop()
    this.setupBoundaryLimits()

    this.lastPosition = { x: startX, y: startY }

    if (typeof this.scene.setAsHUDElement === "function") {
      this.scene.setAsHUDElement(this.modalContainer)
    }
  }

  createTitleBar() {
    const titleBar = this.scene.add
      .rectangle(0, 0, this.modalWidth, this.titleBarHeight, 0x663399)
      .setOrigin(0)
      .setInteractive({ cursor: "grab" })
      .setDepth(2002)

    const title = this.scene.add
      .text(this.modalWidth / 2, this.titleBarHeight / 2, "Properties", {
        fontSize: "16px",
        fill: "#FFFFFF",
        fontFamily: "VCR",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(2003)

    // Close button
    const closeBtn = this.scene.add
      .rectangle(this.modalWidth - 20, this.titleBarHeight / 2, 24, 24, 0xff4444)
      .setOrigin(0.5)
      .setInteractive({ cursor: "pointer" })
      .setDepth(2003)

    const closeIcon = this.scene.add
      .text(this.modalWidth - 20, this.titleBarHeight / 2, "✕", {
        fontSize: "14px",
        fill: "#FFFFFF",
        fontFamily: "VCR",
      })
      .setOrigin(0.5)
      .setDepth(2004)

    // Minimize button
    const minimizeBtn = this.scene.add
      .rectangle(this.modalWidth - 50, this.titleBarHeight / 2, 24, 24, 0xffaa44)
      .setOrigin(0.5)
      .setInteractive({ cursor: "pointer" })
      .setDepth(2003)

    const minimizeIcon = this.scene.add
      .text(this.modalWidth - 50, this.titleBarHeight / 2, "−", {
        fontSize: "16px",
        fill: "#FFFFFF",
        fontFamily: "VCR",
      })
      .setOrigin(0.5)
      .setDepth(2004)

    closeBtn.on("pointerdown", () => this.hide())
    closeIcon.setInteractive({ cursor: "pointer" }).on("pointerdown", () => this.hide())
    minimizeBtn.on("pointerdown", () => this.toggleMinimize())
    minimizeIcon.setInteractive({ cursor: "pointer" }).on("pointerdown", () => this.toggleMinimize())

    this.modalContainer.add([titleBar, title, closeBtn, closeIcon, minimizeBtn, minimizeIcon])
    this.titleBar = titleBar
  }

  createContent() {
    this.contentContainer = this.scene.add.container(0, this.titleBarHeight + 20)
    let yOffset = 0

    const currentAnimLabel = this.scene.add
      .text(20, yOffset, "Current Animation:", {
        fontSize: "14px",
        fill: "#FFFFFF",
        fontFamily: "VCR",
      })
      .setOrigin(0, 0.5)
      .setDepth(2003)

    this.currentAnimationDisplay = this.scene.add
      .text(20, yOffset + 20, "None", {
        fontSize: "12px",
        fill: "#FFAA00",
        fontFamily: "VCR",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5)
      .setDepth(2003)

    yOffset += 50

    const offsetLabel = this.scene.add
      .text(20, yOffset, "Animation Offset (pixels moved):", {
        fontSize: "14px",
        fill: "#FFFFFF",
        fontFamily: "VCR",
      })
      .setOrigin(0, 0.5)
      .setDepth(2003)

    this.offsetDisplay.x = this.scene.add
      .text(20, yOffset + 25, "X: 0", {
        fontSize: "12px",
        fill: "#CCCCCC",
        fontFamily: "VCR",
      })
      .setOrigin(0, 0.5)
      .setDepth(2003)

    this.offsetDisplay.y = this.scene.add
      .text(20, yOffset + 45, "Y: 0", {
        fontSize: "12px",
        fill: "#CCCCCC",
        fontFamily: "VCR",
      })
      .setOrigin(0, 0.5)
      .setDepth(2003)

    yOffset += 80

    // Onion Skin checkbox
    this.onionCheckbox = this.createCheckbox(20, yOffset, "Onion Skin", false, (checked) => {
      this.toggleOnionSkin(checked)
    })

    yOffset += 40

    // Loop checkbox
    this.loopCheckbox = this.createCheckbox(20, yOffset, "Loop Animation", false, (checked) => {
      this.toggleLoop(checked)
    })

    yOffset += 40

    // Añadir sección de icono
    const iconLabel = this.scene.add
      .text(20, yOffset, "Icon:", {
        fontSize: "14px",
        fill: "#FFFFFF",
        fontFamily: "VCR",
      })
      .setOrigin(0, 0.5)
      .setDepth(2003)

    yOffset += 15

    // Add icon with fallback texture
    const iconImage = this.scene.add
        .image(20, yOffset, this.scene.textures.exists('character_icon') ? 'character_icon' : '__DEFAULT')
        .setOrigin(0)
        .setScale(0.5)
        .setDepth(2003)

    if (!this.scene.textures.exists('character_icon')) {
        console.warn('Character icon texture not found, using default placeholder')
    }

    // Configurar selección de icono
    this.setupIconSelection(iconImage)

    this.contentContainer.add([
      currentAnimLabel,
      this.currentAnimationDisplay,
      offsetLabel,
      this.offsetDisplay.x,
      this.offsetDisplay.y,
      iconLabel,
      iconImage
    ])
    this.modalContainer.add(this.contentContainer)

    this.updateContent()
  }

  createCheckbox(x, y, label, checked, callback) {
    const checkboxSize = 16
    const checkboxBg = this.scene.add
      .rectangle(x, y, checkboxSize, checkboxSize, 0x444444)
      .setOrigin(0, 0.5)
      .setStrokeStyle(1, 0x666666)
      .setDepth(2003)

    const checkmark = this.scene.add
      .text(x + checkboxSize / 2, y, "✓", {
        fontSize: "12px",
        fill: "#00FF00",
        fontFamily: "VCR",
      })
      .setOrigin(0.5)
      .setVisible(checked)
      .setDepth(2004)

    const labelText = this.scene.add
      .text(x + 25, y, label, {
        fontSize: "12px",
        fill: "#FFFFFF",
        fontFamily: "VCR",
      })
      .setOrigin(0, 0.5)
      .setDepth(2003)

    checkboxBg.setInteractive({ cursor: "pointer" }).on("pointerdown", () => {
      const newChecked = !checkmark.visible
      checkmark.setVisible(newChecked)
      callback(newChecked)
    })

    this.contentContainer.add([checkboxBg, checkmark, labelText])

    return { bg: checkboxBg, checkmark, label: labelText, checked: () => checkmark.visible }
  }

  updateContent() {
    if (!this.currentCharacter) return

    const currentAnim =
        this.currentCharacter.currentAnimation ||
        (this.currentCharacter.sprite?.anims?.currentAnim?.key
            ? this.currentCharacter.sprite.anims.currentAnim.key.split("_").pop()
            : "None")

    if (this.currentAnimationDisplay) {
        this.currentAnimationDisplay.setText(currentAnim)
    }

    // Update animation offsets
    if (this.currentCharacter.sprite && currentAnim) {
        const animData = this.currentCharacter.data.animations.find(
            (a) => (a.name || a.anim) === currentAnim
        )
        if (animData) {
            // Calcular diferencia desde la posición original
            const offsetX = Math.round(this.currentCharacter.sprite.x - this.originalPosition.x)
            const offsetY = Math.round(this.currentCharacter.sprite.y - this.originalPosition.y)

            // Actualizar offsets en los datos de la animación
            animData.offsets = [offsetX, offsetY]

            // Actualizar display
            this.offsetDisplay.x.setText(`X: ${offsetX}`)
            this.offsetDisplay.y.setText(`Y: ${offsetY}`)

            // Guardar los offsets
            if (!this.currentCharacter.animOffsets) {
                this.currentCharacter.animOffsets = {}
            }
            this.currentCharacter.animOffsets[currentAnim] = [offsetX, offsetY]
        }
    }

    // Actualizar checkbox de loop
    if (currentAnim && currentAnim !== "None" && this.currentCharacter.data.animations) {
        const animData = this.currentCharacter.data.animations.find(
            (a) => (a.name || a.anim) === currentAnim
        )
        if (animData && this.loopCheckbox) {
            this.loopCheckbox.checkmark.setVisible(animData.loop || false)
        }
    }
  }

  toggleOnionSkin(enabled) {
    if (enabled) {
      this.createOnionSkin()
    } else {
      this.removeOnionSkin()
    }
  }

  createOnionSkin() {
    if (!this.currentCharacter || this.onionSkinSprite) return

    this.onionSkinSprite = this.scene.add
        .sprite(this.currentCharacter.sprite.x, this.currentCharacter.sprite.y, this.currentCharacter.textureKey)
        .setOrigin(0, 0)
        .setScale(this.currentCharacter.sprite.scaleX, this.currentCharacter.sprite.scaleY)
        .setAlpha(0.3)
        .setDepth(this.currentCharacter.sprite.depth - 1)

    // Just set the frame without playing animation
    if (this.currentCharacter.sprite.frame) {
        this.onionSkinSprite.setFrame(this.currentCharacter.sprite.frame.name)
    }

    this.scene.setAsGameElement(this.onionSkinSprite)
  }

  removeOnionSkin() {
    if (this.onionSkinSprite) {
      this.onionSkinSprite.destroy()
      this.onionSkinSprite = null
    }
  }

  toggleLoop(enabled) {
    if (!this.currentCharacter) return

    const currentAnim = this.currentCharacter.currentAnimation
    if (currentAnim && this.currentCharacter.data.animations) {
      const animData = this.currentCharacter.data.animations.find((a) => a.anim === currentAnim)
      if (animData) {
        animData.loop = enabled

        // Update Phaser animation
        const animKey = `${this.currentCharacter.textureKey}_${currentAnim}`
        if (this.scene.anims.exists(animKey)) {
          const phaserAnim = this.scene.anims.get(animKey)
          phaserAnim.repeat = enabled ? -1 : 0

          if (this.currentCharacter.sprite.anims.isPlaying) {
            this.currentCharacter.sprite.play(animKey)
          }
        }
      }
    }
  }

  setupDragAndDrop() {
    this.titleBar.on("pointerdown", (pointer) => {
      this.isDragging = true
      this.dragOffset.x = pointer.x - this.modalContainer.x
      this.dragOffset.y = pointer.y - this.modalContainer.y
      this.scene.input.setDefaultCursor("grabbing")
    })

    this.scene.input.on("pointermove", (pointer) => {
      if (this.isDragging) {
        const newX = pointer.x - this.dragOffset.x
        const newY = pointer.y - this.dragOffset.y

        const { width, height } = this.scene.scale
        const clampedX = Phaser.Math.Clamp(newX, 0, width - this.modalWidth)
        const clampedY = Phaser.Math.Clamp(
          newY,
          30,
          height - (this.isMinimized ? this.titleBarHeight : this.modalHeight),
        )

        this.modalContainer.x = clampedX
        this.modalContainer.y = clampedY
        this.lastPosition = { x: clampedX, y: clampedY }
      }
    })

    this.scene.input.on("pointerup", () => {
      if (this.isDragging) {
        this.isDragging = false
        this.scene.input.setDefaultCursor("default")
      }
    })
  }

  toggleMinimize() {
    if (!this.modalContainer) return

    this.isMinimized = !this.isMinimized

    if (this.isMinimized) {
      this.contentContainer.setVisible(false)
      const modalBg = this.modalContainer.list[0]
      modalBg.height = this.titleBarHeight
      this.modalContainer.setSize(this.modalWidth, this.titleBarHeight)
    } else {
      this.contentContainer.setVisible(true)
      const modalBg = this.modalContainer.list[0]
      modalBg.height = this.modalHeight
      this.modalContainer.setSize(this.modalWidth, this.modalHeight)

      if (this.lastPosition) {
        this.modalContainer.x = this.lastPosition.x
        this.modalContainer.y = this.lastPosition.y
      }
    }

    this.setupBoundaryLimits()
  }

  setupBoundaryLimits() {
    const { width, height } = this.scene.scale

    if (this.modalContainer.x < 0) this.modalContainer.x = 0
    if (this.modalContainer.y < 30) this.modalContainer.y = 30
    if (this.modalContainer.x + this.modalWidth > width) {
      this.modalContainer.x = width - this.modalWidth
    }
    if (this.modalContainer.y + this.modalHeight > height) {
      this.modalContainer.y = height - this.modalHeight
    }
  }

  showToast(message, type = "info") {
    const { width, height } = this.scene.scale
    const toastWidth = Math.max(200, message.length * 8)
    const toastHeight = 40

    let bgColor = 0x4444aa
    if (type === "success") bgColor = 0x44aa44
    if (type === "error") bgColor = 0xaa4444

    const toast = this.scene.add.container(width - toastWidth - 20, height + toastHeight)

    const bg = this.scene.add.rectangle(0, 0, toastWidth, toastHeight, bgColor).setStrokeStyle(2, 0xffffff)

    const text = this.scene.add
      .text(0, 0, message, {
        fontSize: "14px",
        fill: "#FFFFFF",
        fontFamily: "VCR",
      })
      .setOrigin(0.5)

    toast.add([bg, text])
    toast.setDepth(3000)

    if (typeof this.scene.setAsHUDElement === "function") {
      this.scene.setAsHUDElement(toast)
    }

    this.scene.tweens.add({
      targets: toast,
      y: height - toastHeight - 20,
      duration: 300,
      ease: "Back.easeOut",
    })

    this.scene.time.delayedCall(3000, () => {
      this.scene.tweens.add({
        targets: toast,
        y: height + toastHeight,
        alpha: 0,
        duration: 300,
        ease: "Back.easeIn",
        onComplete: () => toast.destroy(),
      })
    })
  }

  hide() {
    this.stopUpdateTimer()

    if (this.modalContainer) {
      this.removeOnionSkin()
      this.modalContainer.destroy()
      this.modalContainer = null
    }
    this.isVisible = false
    this.isDragging = false
    this.isMinimized = false
  }

  destroy() {
    this.stopUpdateTimer()
    this.hide()
  }

  setupIconSelection(iconImage) {
    iconImage.setInteractive({ cursor: 'pointer' })
    
    // Crear input file oculto
    const fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.accept = '.png'
    fileInput.style.display = 'none'
    document.body.appendChild(fileInput)

    // Manejar click en el icono
    iconImage.on('pointerdown', () => {
        fileInput.click()
    })

    // Manejar selección de archivo
    fileInput.onchange = (event) => {
        const file = event.target.files[0]
        if (file) {
            const reader = new FileReader()
            reader.onload = (e) => {
                // Crear nueva textura con la imagen seleccionada
                const image = new Image()
                image.onload = () => {
                    const texture = this.scene.textures.createCanvas(
                        'character_icon_custom',
                        image.width,
                        image.height
                    )
                    const context = texture.getContext()
                    context.drawImage(image, 0, 0)
                    texture.refresh()

                    // Actualizar icono
                    iconImage.setTexture('character_icon_custom')
                    
                    // Actualizar datos del personaje si existe
                    if (this.currentCharacter && this.currentCharacter.data) {
                        this.currentCharacter.data.healthicon = 'custom'
                    }
                }
                image.src = e.target.result
            }
            reader.readAsDataURL(file)
        }
    }

    // Limpiar al destruir
    this.scene.events.once('shutdown', () => {
        fileInput.remove()
    })
  }
}
