export default class AnimationsPanel {
  constructor(scene) {
    this.scene = scene
    this.modalContainer = null
    this.isVisible = false
    this.isMinimized = false
    this.dragOffset = { x: 0, y: 0 }
    this.isDragging = false
    this.lastPosition = null
    this.contentGroup = null
    this.scrollY = 0
    this.maxScroll = 0
    this.maskGraphics = null
    this.animationBlocks = []
    this.scrollContainer = null
    this.maskContainer = null

    // Configuración de la ventana
    this.modalWidth = 480
    this.modalHeight = 400
    this.titleBarHeight = 40
    this.blockHeight = 60
    this.blockSpacing = 10
    this.contentPadding = 15
  }

  show() {
    if (this.isVisible && this.modalContainer) {
        this.close()
    }

    // Reproducir sonido de apertura
    this.scene.sound.play('openWindow')

    const { width, height } = this.scene.scale
    const startX = width / 2 - this.modalWidth / 2
    const startY = height / 2 - this.modalHeight / 2

    this.createModalWindow(startX, startY)
    this.createTitleBar()
    this.createContentArea()
    this.loadAnimationsContent()
    this.setupScrolling()
    this.setupDragAndDrop()
    this.setupBoundaryLimits()

    this.isVisible = true
    this.lastPosition = { x: startX, y: startY }
  }

  createModalWindow(x, y) {
    const roundedBg = this.scene.add.graphics()
    roundedBg.fillStyle(0x2a2a3a)
    roundedBg.lineStyle(2, 0x663399)
    roundedBg.fillRoundedRect(0, 0, this.modalWidth, this.modalHeight, 8)
    roundedBg.strokeRoundedRect(0, 0, this.modalWidth, this.modalHeight, 8)
    roundedBg.setDepth(2001)

    // Contenedor principal
    this.modalContainer = this.scene.add.container(x, y, [roundedBg])
    this.modalContainer.setSize(this.modalWidth, this.modalHeight)
    this.modalContainer.setDepth(2000)

    // Registrar como elemento HUD
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
      .text(this.modalWidth / 2, this.titleBarHeight / 2, "Animations Panel", {
        fontSize: "18px",
        fill: "#FFFFFF",
        fontFamily: "VCR",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(2003)

    // Botón cerrar
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

    // Botón minimizar
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

    // Eventos de botones
    closeBtn.on("pointerdown", () => this.close())
    closeIcon.setInteractive({ cursor: "pointer" }).on("pointerdown", () => this.close())
    minimizeBtn.on("pointerdown", () => this.toggleMinimize())
    minimizeIcon.setInteractive({ cursor: "pointer" }).on("pointerdown", () => this.toggleMinimize())

    this.modalContainer.add([titleBar, title, closeBtn, closeIcon, minimizeBtn, minimizeIcon])
    this.titleBar = titleBar
  }

  createContentArea() {
    const contentAreaHeight = this.modalHeight - this.titleBarHeight

    // Crear el contenedor para la máscara y el contenido
    this.maskContainer = this.scene.add.container(0, this.titleBarHeight + 5) // Ajustado 5 píxeles más abajo
    
    // Crear la máscara gráfica
    this.maskGraphics = this.scene.add.graphics()
    this.maskGraphics.fillStyle(0xffffff, 0) // Alpha 0 para hacerlo invisible
    this.maskGraphics.fillRect(0, 0, this.modalWidth, contentAreaHeight - 10) // Reducir altura para compensar
    
    // Crear el contenedor para el contenido scrolleable
    this.scrollContainer = this.scene.add.container(0, 0)
    
    // Añadir todo al contenedor principal en el orden correcto
    this.modalContainer.add([this.maskGraphics, this.maskContainer])
    this.maskContainer.add(this.scrollContainer)
    
    // Aplicar la máscara al contenedor de scroll
    const mask = this.maskGraphics.createGeometryMask()
    this.scrollContainer.setMask(mask)

    // Hacer el contenedor principal interactivo para el scroll
    this.modalContainer.setInteractive({
        hitArea: new Phaser.Geom.Rectangle(0, this.titleBarHeight, this.modalWidth, contentAreaHeight),
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
        cursor: "default"
    })
  }

  loadAnimationsContent() {
    if (this.scrollContainer) {
      this.scrollContainer.removeAll(true)
    }

    this.animationBlocks = []
    let yOffset = this.contentPadding

    // Buscar personaje con animaciones
    let characterWithAnimations = null
    if (this.scene.charactersManager && this.scene.charactersManager.loadedCharacters.size > 0) {
      const loadedCharacters = Array.from(this.scene.charactersManager.loadedCharacters.values()).reverse()
      characterWithAnimations = loadedCharacters.find(
        (c) => c && c.data && Array.isArray(c.data.animations) && c.data.animations.length > 0,
      )
    }

    if (characterWithAnimations) {
      // Título del personaje
      const characterTitle = this.scene.add
        .text(this.contentPadding, yOffset, `Character: ${characterWithAnimations.data.image || "Unknown"}`, {
          fontSize: "16px",
          fill: "#FFD966",
          fontFamily: "VCR",
          fontStyle: "bold",
        })
        .setDepth(2003)

      this.scrollContainer.add(characterTitle)
      yOffset += 35

      // Crear bloques de animaciones
      characterWithAnimations.data.animations.forEach((animation, index) => {
        const block = this.createAnimationBlock(animation, yOffset, index)
        this.animationBlocks.push(block)
        yOffset += this.blockHeight + this.blockSpacing
      })
    } else {
      // Mensaje cuando no hay personajes
      const noCharacterMsg = this.scene.add
        .text(this.modalWidth / 2, yOffset + 50, "No characters loaded\nAdd a character first", {
          fontSize: "16px",
          fill: "#FF8888",
          fontFamily: "VCR",
          align: "center",
        })
        .setOrigin(0.5, 0)
        .setDepth(2003)

      this.scrollContainer.add(noCharacterMsg)
      yOffset += 100
    }

    // Calcular scroll máximo
    const totalContentHeight = yOffset + this.contentPadding
    const visibleHeight = this.modalHeight - this.titleBarHeight
    this.maxScroll = Math.max(0, totalContentHeight - visibleHeight)
  }

  createAnimationBlock(animation, yOffset, index) {
    const blockWidth = this.modalWidth - (this.contentPadding * 2)
    const blockColor = index % 2 === 0 ? 0x3a3a4a : 0x4a4a5a

    const container = this.scene.add.container(this.contentPadding, yOffset)

    // Fondo del bloque
    const blockBg = this.scene.add.rectangle(
      0,
      0,
      blockWidth,
      this.blockHeight,
      blockColor
    )
    .setOrigin(0)
    .setStrokeStyle(1, 0x5a5a6a)

    // Nombre de la animación
    const animName = this.scene.add.text(
      10,
      10,
      animation.name || animation.anim || `Animation ${index + 1}`,
      {
        fontSize: '14px',
        fill: '#FFFFFF',
        fontFamily: 'VCR',
        fontStyle: 'bold'
      }
    )

    // Información adicional
    const animInfo = this.scene.add.text(
      10,
      30,
      `Frames: ${animation.frames?.length || 'N/A'} | FPS: ${animation.fps || 24}`,
      {
        fontSize: '11px',
        fill: '#CCCCCC',
        fontFamily: 'VCR'
      }
    )

    // Botón de reproducción
    const playBtn = this.scene.add.rectangle(
      blockWidth - 40,
      this.blockHeight / 2,
      20,
      20,
      0x44aa44
    )
    .setOrigin(0.5)

    const playIcon = this.scene.add.text(
      blockWidth - 40,
      this.blockHeight / 2,
      '▶',
      {
        fontSize: '10px',
        fill: '#FFFFFF',
        fontFamily: 'VCR'
      }
    )
    .setOrigin(0.5)

    // Hacer interactivo solo el fondo del bloque
    blockBg.setInteractive({ cursor: 'pointer' })
    playBtn.setInteractive({ cursor: 'pointer' })

    // Eventos
    blockBg.on('pointerover', () => blockBg.setFillStyle(0x5a5a6a))
    blockBg.on('pointerout', () => blockBg.setFillStyle(blockColor))
    blockBg.on('pointerdown', () => this.selectAnimation(animation))

    playBtn.on('pointerdown', (pointer) => {
      pointer.event.stopPropagation()
      this.playAnimation(animation)
    })

    container.add([blockBg, animName, animInfo, playBtn, playIcon])
    this.scrollContainer.add(container)

    // Actualizar interactividad basada en la máscara
    this.updateElementsInteractivity()

    return {
      container,
      animation,
      yPosition: yOffset
    }
  }

  updateScrollPosition() {
    if (this.scrollContainer) {
        // Limitar el scroll a los límites del contenido
        this.scrollY = Phaser.Math.Clamp(this.scrollY, 0, this.maxScroll)
        
        // Actualizar la posición del contenido relativa al contenedor de máscara
        this.scrollContainer.y = -this.scrollY
        
        // Actualizar interactividad basada en la posición
        this.updateElementsInteractivity()
    }
  }

  updateElementsInteractivity() {
    if (!this.scrollContainer || !this.maskContainer) return
    
    // Usar las coordenadas globales del contenedor modal
    const globalBounds = new Phaser.Geom.Rectangle(
        this.modalContainer.x,
        this.modalContainer.y + this.titleBarHeight,
        this.modalWidth,
        this.modalHeight - this.titleBarHeight
    )
    
    this.scrollContainer.each(child => {
        if (child.list && child.list.length > 0) {
            child.list.forEach(element => {
                if (element.input) {
                    const elementBounds = element.getBounds()
                    const isVisible = Phaser.Geom.Rectangle.Contains(
                        globalBounds,
                        elementBounds.centerX,
                        elementBounds.centerY
                    )
                    element.input.enabled = isVisible
                }
            })
        } else if (child.input) {
            const elementBounds = child.getBounds()
            const isVisible = Phaser.Geom.Rectangle.Contains(
                globalBounds,
                elementBounds.centerX,
                elementBounds.centerY
            )
            child.input.enabled = isVisible
        }
    })
  }

  setupScrolling() {
    this.scrollY = 0

    this.scene.input.on("wheel", (pointer, gameObjects, deltaX, deltaY) => {
      if (!this.modalContainer || this.isMinimized || !this.isVisible) return

      const bounds = this.modalContainer.getBounds()
      if (bounds.contains(pointer.x, pointer.y) && pointer.y > bounds.y + this.titleBarHeight) {
        const scrollSpeed = 15
        const newScrollY = this.scrollY + (deltaY > 0 ? scrollSpeed : -scrollSpeed)

        if (newScrollY !== this.scrollY && newScrollY >= 0 && newScrollY <= this.maxScroll) {
          this.scrollY = newScrollY
          this.updateScrollPosition()
        }
      }
    })
  }

  selectAnimation(animation) {
    if (this.scene.charactersManager && this.scene.charactersManager.loadedCharacters.size > 0) {
        const characters = Array.from(this.scene.charactersManager.loadedCharacters.values())
        const character = characters.find(c => 
            c && c.data && c.data.animations && 
            c.data.animations.some(a => (a.name || a.anim) === (animation.name || animation.anim))
        )

        if (character && character.sprite) {
            const currentOffsets = character.animOffsets?.[character.currentAnimation] || [0, 0]
            
            // Guardar offsets actuales antes de cambiar
            if (character.currentAnimation) {
                character.animOffsets = character.animOffsets || {}
                character.animOffsets[character.currentAnimation] = [
                    character.sprite.x - character.originalX,
                    character.sprite.y - character.originalY
                ]
            }

            // Resetear a la posición original
            character.sprite.setPosition(character.originalX || 0, character.originalY || 0)

            // Aplicar offsets
            const animData = character.data.animations.find(a => 
                (a.name || a.anim) === (animation.name || animation.anim)
            )

            if (animData) {
                // Usar offsets guardados o los del animData
                const offsets = character.animOffsets?.[animation.name || animation.anim] || animData.offsets || [0, 0]
                character.sprite.x += offsets[0]
                character.sprite.y += offsets[1]

                const animKey = `${character.textureKey}_${animation.name || animation.anim}`
                if (this.scene.anims.exists(animKey)) {
                    const anim = this.scene.anims.get(animKey)
                    anim.repeat = animData.loop ? -1 : 0
                    character.sprite.play(animKey)
                    character.currentAnimation = animation.name || animation.anim

                    // Actualizar properties modal
                    const propertiesModal = this.scene.moduleRegistry.get("CharacterPropertiesModal")
                    if (propertiesModal && propertiesModal.isVisible) {
                        propertiesModal.updateContent()
                    }
                }
            }
        }
    }
  }

  playAnimation(animation) {
    if (this.scene.charactersManager && this.scene.charactersManager.loadedCharacters.size > 0) {
        const characters = Array.from(this.scene.charactersManager.loadedCharacters.values())
        const character = characters[0]
        
        if (character && character.currentAnimation === (animation.name || animation.anim)) {
            // Si es la misma animación, solo reiniciarla manteniendo los offsets actuales
            const animKey = `${character.textureKey}_${animation.name || animation.anim}`
            if (character.sprite && this.scene.anims.exists(animKey)) {
                character.sprite.play(animKey)
            }
        } else {
            // Si es una animación diferente, usar selectAnimation
            this.selectAnimation(animation)
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
                height - (this.isMinimized ? this.titleBarHeight : this.modalHeight)
            )

            this.modalContainer.x = clampedX
            this.modalContainer.y = clampedY
            this.lastPosition = { x: clampedX, y: clampedY }

            // Actualizar posición de la máscara
            this.maskGraphics.x = clampedX
            this.maskGraphics.y = clampedY + this.titleBarHeight + 5 // Ajustar posición Y de la máscara
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
        this.scrollContainer.setVisible(false)
        this.maskGraphics.setVisible(false)

        // Update background size
        const modalBg = this.modalContainer.list[0]
        if (modalBg && modalBg.clear) {
            modalBg.clear()
            modalBg.fillStyle(0x2a2a3a)
            modalBg.lineStyle(2, 0x663399)
            modalBg.fillRoundedRect(0, 0, this.modalWidth, this.titleBarHeight, 8)
            modalBg.strokeRoundedRect(0, 0, this.modalWidth, this.titleBarHeight, 8)
        }
        this.modalContainer.setSize(this.modalWidth, this.titleBarHeight)
    } else {
        this.scrollContainer.setVisible(true)
        this.maskGraphics.setVisible(true)

        // Restore background size
        const modalBg = this.modalContainer.list[0]
        if (modalBg && modalBg.clear) {
            modalBg.clear()
            modalBg.fillStyle(0x2a2a3a)
            modalBg.lineStyle(2, 0x663399)
            modalBg.fillRoundedRect(0, 0, this.modalWidth, this.modalHeight, 8)
            modalBg.strokeRoundedRect(0, 0, this.modalWidth, this.modalHeight, 8)
        }
        this.modalContainer.setSize(this.modalWidth, this.modalHeight)

        if (this.lastPosition) {
            this.modalContainer.x = this.lastPosition.x
            this.modalContainer.y = this.lastPosition.y
            // Actualizar posición de la máscara
            this.maskGraphics.x = this.lastPosition.x
            this.maskGraphics.y = this.lastPosition.y
        }
    }

    this.setupBoundaryLimits()
  }

  setupBoundaryLimits() {
    if (!this.modalContainer) return

    const { width, height } = this.scene.scale

    if (this.modalContainer.x < 0) this.modalContainer.x = 0
    if (this.modalContainer.y < 30) this.modalContainer.y = 30
    if (this.modalContainer.x + this.modalWidth > width) {
      this.modalContainer.x = width - this.modalWidth
    }

    const currentHeight = this.isMinimized ? this.titleBarHeight : this.modalHeight
    if (this.modalContainer.y + currentHeight > height) {
      this.modalContainer.y = height - currentHeight
    }
    
    // Actualizar interactividad después de ajustar límites
    this.updateElementsInteractivity()
  }

  refreshContent() {
    if (!this.isVisible || !this.scrollContainer) return

    // Reset scroll position
    this.scrollY = 0

    // Reload content
    this.loadAnimationsContent()
    this.updateScrollPosition()
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

  close() {
    if (this.modalContainer) {
        // Reproducir sonido de cierre
        this.scene.sound.play('exitWindow')
        
        this.modalContainer.destroy(true)
        this.modalContainer = null
    }

    if (this.maskGraphics) {
      this.maskGraphics.destroy()
      this.maskGraphics = null
    }

    // Clear all references
    this.scrollContainer = null
    this.maskContainer = null
    this.animationBlocks = []
    this.scrollY = 0
    this.maxScroll = 0
    this.isDragging = false
    this.isMinimized = false
    this.isVisible = false
    this.titleBar = null
  }

  destroy() {
    this.close()
  }
}