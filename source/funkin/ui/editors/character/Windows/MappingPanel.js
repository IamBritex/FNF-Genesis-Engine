export default class SingMappingModal {
  constructor(scene) {
    this.scene = scene
    this.modalContainer = null
    this.isVisible = false
    this.isMinimized = false
    this.dragOffset = { x: 0, y: 0 }
    this.isDragging = false
    this.lastPosition = null
    this.mappingOptions = []
    this.animationSelectorModal = null
    this.currentMapping = null // Add this line
    this.contentGroup = null // Add this line if not already present

    // Configuración de la ventana
    this.modalWidth = 400
    this.modalHeight = 350
    this.titleBarHeight = 40

    // Default mapping options
    this.defaultMappings = [
      { name: "idle", required: true, mapped: false, animation: null },
      { name: "singLEFT", required: true, mapped: false, animation: null },
      { name: "singRIGHT", required: true, mapped: false, animation: null },
      { name: "singUP", required: true, mapped: false, animation: null },
      { name: "singDOWN", required: true, mapped: false, animation: null },
      { name: "singLEFTmiss", required: false, mapped: false, animation: null },
      { name: "singRIGHTmiss", required: false, mapped: false, animation: null },
      { name: "singUPmiss", required: false, mapped: false, animation: null },
      { name: "singDOWNmiss", required: false, mapped: false, animation: null },
    ]
  }

  show() {
    if (this.modalContainer) {
      this.close() // Properly close existing instance
    }

    const { width, height } = this.scene.scale
    const startX = width / 2 - this.modalWidth / 2
    const startY = height / 2 - this.modalHeight / 2

    this.mappingOptions = [...this.defaultMappings]

    this.createModalWindow(startX, startY)
    this.createTitleBar()
    this.createContent()
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

    this.modalContainer = this.scene.add.container(x, y, [roundedBg])
    this.modalContainer.setSize(this.modalWidth, this.modalHeight)
    this.modalContainer.setDepth(2000)

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
      .text(this.modalWidth / 2, this.titleBarHeight / 2, "Sing Mapping", {
        fontSize: "16px",
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
        .text(this.modalWidth - 50, this.titleBarHeight / 2 - 2, "−", { // Adjusted Y position
            fontSize: "24px", // Increased size
            fill: "#FFFFFF",
            fontFamily: "VCR",
        })
        .setOrigin(0.5)
        .setDepth(2004)

    closeBtn.on("pointerdown", () => this.close())
    closeIcon.setInteractive({ cursor: "pointer" }).on("pointerdown", () => this.close())
    minimizeBtn.on("pointerdown", () => this.toggleMinimize())
    minimizeIcon.setInteractive({ cursor: "pointer" }).on("pointerdown", () => this.toggleMinimize())

    this.modalContainer.add([titleBar, title, closeBtn, closeIcon, minimizeBtn, minimizeIcon])
    this.titleBar = titleBar
  }

  refreshContent() {
    if (!this.modalContainer) return

    // Calcular nueva altura basada en el número de opciones
    const contentHeight = this.mappingOptions.length * 35 + 100 // 35px por opción + espacio extra
    this.modalHeight = Math.min(600, Math.max(350, contentHeight)) // Límite entre 350 y 600px

    // Actualizar tamaño del fondo modal
    const modalBg = this.modalContainer.list[0]
    modalBg.clear()
    modalBg.fillStyle(0x2a2a3a)
    modalBg.lineStyle(2, 0x663399)
    modalBg.fillRoundedRect(0, 0, this.modalWidth, this.modalHeight, 8)
    modalBg.strokeRoundedRect(0, 0, this.modalWidth, this.modalHeight, 8)

    // Actualizar tamaño del contenedor
    this.modalContainer.setSize(this.modalWidth, this.modalHeight)

    // Mantener solo los elementos de la barra de título (los primeros 6 elementos)
    const titleBarElements = this.modalContainer.list.slice(0, 6)
    this.modalContainer.removeAll()
    titleBarElements.forEach(element => this.modalContainer.add(element))

    // Recrear contenido una sola vez
    this.createContent()

    // Ajustar posición si está cerca del borde inferior
    const { height } = this.scene.scale
    if (this.modalContainer.y + this.modalHeight > height) {
        this.modalContainer.y = Math.max(30, height - this.modalHeight)
    }
}

  createContent() {
    // Limpiar el contenido anterior si existe
    if (this.contentGroup) {
        this.contentGroup.destroy(true)
    }

    // Crear nuevo grupo de contenido
    this.contentGroup = this.scene.add.container(0, this.titleBarHeight + 20)
    let yOffset = 0

    // Crear opciones de mapping
    this.mappingOptions.forEach((mapping, index) => {
        const optionContainer = this.createMappingOption(mapping, 20, yOffset)
        this.contentGroup.add(optionContainer)
        yOffset += 35
    })

    // Añadir botón personalizado
    const addButton = this.createAddButton(20, yOffset)
    this.contentGroup.add(addButton)

    // Añadir el grupo de contenido al contenedor modal
    this.modalContainer.add(this.contentGroup)
}

  createMappingOption(mapping, x, y) {
    const container = this.scene.add.container(x, y)

    const bgColor = mapping.mapped ? 0x44aa44 : mapping.required ? 0x4a4a5a : 0x3a3a4a
    const bg = this.scene.add
      .rectangle(0, 0, this.modalWidth - 40, 30, bgColor)
      .setOrigin(0)
      .setStrokeStyle(1, 0x666666)
      .setInteractive({ cursor: "pointer" })
      .setDepth(2002)

    const nameText = this.scene.add
      .text(10, 15, mapping.name, {
        fontSize: "14px",
        fill: mapping.mapped ? "#FFFFFF" : "#CCCCCC",
        fontFamily: "VCR",
      })
      .setOrigin(0, 0.5)
      .setDepth(2003)

    const statusText = this.scene.add
      .text(this.modalWidth - 60, 15, mapping.mapped ? mapping.animation : "Not mapped", {
        fontSize: "12px",
        fill: mapping.mapped ? "#AAFFAA" : "#FFAAAA",
        fontFamily: "VCR",
      })
      .setOrigin(1, 0.5)
      .setDepth(2003)

    // Delete button for non-required mappings
    if (!mapping.required) {
      const deleteBtn = this.scene.add
        .rectangle(this.modalWidth - 50, 15, 20, 20, 0xff4444)
        .setOrigin(0.5)
        .setInteractive({ cursor: "pointer" })
        .setDepth(2003)

      const deleteIcon = this.scene.add
        .text(this.modalWidth - 50, 15, "✕", {
          fontSize: "12px",
          fill: "#FFFFFF",
          fontFamily: "VCR",
        })
        .setOrigin(0.5)
        .setDepth(2004)

      deleteBtn.on("pointerdown", () => {
        this.removeMappingOption(mapping)
      })

      container.add([deleteBtn, deleteIcon])
    }

    bg.on("pointerdown", () => {
      this.openAnimationSelector(mapping)
    })

    container.add([bg, nameText, statusText])
    return container
  }

  createAddButton(x, y) {
    const container = this.scene.add.container(x, y)

    const bg = this.scene.add
      .rectangle(0, 0, this.modalWidth - 40, 30, 0x44aa44)
      .setOrigin(0)
      .setStrokeStyle(2, 0x66cc66)
      .setInteractive({ cursor: "pointer" })
      .setDepth(2002)

    const plusIcon = this.scene.add
      .text((this.modalWidth - 40) / 2, 15, "+", {
        fontSize: "20px",
        fill: "#FFFFFF",
        fontFamily: "VCR",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(2003)

    bg.on("pointerdown", () => {
      this.addCustomMapping()
    })

    container.add([bg, plusIcon])
    return container
  }

  openAnimationSelector(mapping) {
    this.closeAnimationSelector()
    this.currentMapping = mapping // Store the current mapping

    // Get available animations
    const character = this.getCurrentCharacter()
    if (!character || !character.data || !character.data.animations) {
        this.showToast("No character loaded", "error")
        return
    }

    // Filter out already mapped animations
    const mappedAnimations = this.mappingOptions
        .filter((m) => m.mapped && m !== mapping)
        .map((m) => m.animation)

    const availableAnimations = character.data.animations.filter(
        (anim) => !mappedAnimations.includes(anim.name || anim.anim)
    )

    if (availableAnimations.length === 0) {
        this.showToast("No available animations", "error")
        return
    }

    this.createAnimationSelectorModal(mapping, availableAnimations)
}

  createAnimationSelectorModal(mapping, animations) {
    this.closeAnimationSelector()

    const { width, height } = this.scene.scale
    const selectorWidth = 300
    const selectorHeight = Math.min(400, animations.length * 35 + 80)
    const selectorX = width / 2 - selectorWidth / 2
    const selectorY = height / 2 - selectorHeight / 2

    // Crear contenedor principal del selector
    const selectorContainer = this.scene.add.container(selectorX, selectorY)
    selectorContainer.setDepth(2099)

    // Crear fondo
    const selectorBg = this.scene.add.graphics()
    selectorBg.fillStyle(0x1a1a2a)
    selectorBg.lineStyle(2, 0x663399)
    selectorBg.fillRoundedRect(0, 0, selectorWidth, selectorHeight, 8)
    selectorBg.strokeRoundedRect(0, 0, selectorWidth, selectorHeight, 8)
    selectorBg.setDepth(2100)

    // Añadir fondo al contenedor
    selectorContainer.add(selectorBg)

    // Configurar interactividad del fondo
    selectorBg.setInteractive(
        new Phaser.Geom.Rectangle(0, 0, selectorWidth, selectorHeight),
        Phaser.Geom.Rectangle.Contains
    )

    // Prevenir scroll del documento cuando se hace scroll en el selector
    selectorBg.on("wheel", (pointer, deltaX, deltaY, deltaZ) => {
        pointer.event.preventDefault()
    })

    // Crear título
    const title = this.scene.add.text(
        selectorWidth / 2,
        20,
        `Select animation for ${mapping.name}`,
        {
            fontSize: "14px",
            fill: "#FFFFFF",
            fontFamily: "VCR",
            fontStyle: "bold"
        }
    ).setOrigin(0.5)
    selectorContainer.add(title)

    // Crear lista de animaciones
    let yOffset = 50
    animations.forEach(animation => {
        const optionContainer = this.createAnimationOption(
            animation,
            selectorWidth,
            yOffset
        )
        selectorContainer.add(optionContainer)
        yOffset += 35
    })

    // Registrar como elemento HUD
    if (typeof this.scene.setAsHUDElement === "function") {
        this.scene.setAsHUDElement(selectorContainer)
    }

    this.animationSelectorModal = selectorContainer
}

createAnimationOption(animation, selectorWidth, yOffset) {
    const container = this.scene.add.container(0, yOffset)

    // Fondo de la opción
    const bg = this.scene.add.rectangle(
        10,
        0,
        selectorWidth - 20,
        30,
        0x3a3a4a
    )
    .setOrigin(0)
    .setStrokeStyle(1, 0x5a5a6a)
    .setInteractive({ cursor: "pointer" })

    // Texto de la animación
    const text = this.scene.add.text(
        20,
        15,
        animation.name || animation.anim,
        {
            fontSize: "12px",
            fill: "#FFFFFF",
            fontFamily: "VCR"
        }
    ).setOrigin(0, 0.5)

    // Eventos de interacción
    bg.on("pointerover", () => bg.setFillStyle(0x4a4a5a))
    bg.on("pointerout", () => bg.setFillStyle(0x3a3a4a))
    bg.on("pointerdown", () => {
        if (this.currentMapping) { // Check if we have a current mapping
            this.mapAnimation(this.currentMapping, animation.name || animation.anim)
            this.closeAnimationSelector()
        } else {
            this.showToast("Error: No mapping selected", "error")
        }
    })

    container.add([bg, text])
    return container
  }

  mapAnimation(mapping, animationName) {
    mapping.mapped = true
    mapping.animation = animationName
    this.refreshContent()
    this.showToast(`Mapped ${mapping.name} to ${animationName}`, "success")
  }

  closeAnimationSelector() {
    if (this.animationSelectorModal) {
      this.animationSelectorModal.destroy(true)
      this.animationSelectorModal = null
    }
  }

  addCustomMapping() {
    const customName = prompt("Enter custom animation name:")
    if (customName && customName.trim()) {
      this.mappingOptions.push({
        name: customName.trim(),
        required: false,
        mapped: false,
        animation: null,
      })
      this.refreshContent()
    }
  }

  removeMappingOption(mapping) {
    const index = this.mappingOptions.indexOf(mapping)
    if (index > -1) {
      this.mappingOptions.splice(index, 1)
      this.refreshContent()
    }
  }

  getCurrentCharacter() {
    if (this.scene.charactersManager && this.scene.charactersManager.loadedCharacters.size > 0) {
      const characters = Array.from(this.scene.charactersManager.loadedCharacters.values())
      return characters[characters.length - 1]
    }
    return null
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

    // Get all content elements (everything except title bar elements)
    const contentElements = this.modalContainer.list.slice(6)

    if (this.isMinimized) {
        // Hide content elements
        contentElements.forEach(element => element.setVisible(false))
        
        // Resize background
        const modalBg = this.modalContainer.list[0]
        modalBg.clear()
        modalBg.fillStyle(0x2a2a3a)
        modalBg.lineStyle(2, 0x663399)
        modalBg.fillRoundedRect(0, 0, this.modalWidth, this.titleBarHeight, 8)
        modalBg.strokeRoundedRect(0, 0, this.modalWidth, this.titleBarHeight, 8)
        
        // Update container size
        this.modalContainer.setSize(this.modalWidth, this.titleBarHeight)
    } else {
        // Show content elements
        contentElements.forEach(element => element.setVisible(true))
        
        // Restore background size
        const modalBg = this.modalContainer.list[0]
        modalBg.clear()
        modalBg.fillStyle(0x2a2a3a)
        modalBg.lineStyle(2, 0x663399)
        modalBg.fillRoundedRect(0, 0, this.modalWidth, this.modalHeight, 8)
        modalBg.strokeRoundedRect(0, 0, this.modalWidth, this.modalHeight, 8)
        
        // Update container size
        this.modalContainer.setSize(this.modalWidth, this.modalHeight)
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
      .text(-toastWidth / 2, -toastHeight / 2 , message, {
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
    this.closeAnimationSelector()

    if (this.modalContainer) {
      this.modalContainer.destroy(true)
      this.modalContainer = null
    }

    this.isVisible = false
    this.isDragging = false
    this.isMinimized = false
    this.currentMapping = null // Add this line
  }

  destroy() {
    this.close()
  }
}
