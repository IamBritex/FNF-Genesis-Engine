export default class LayersPanel {
  constructor(scene) {
    this.scene = scene
    this.modalContainer = null
    this.layersList = []
    this.customLayers = new Map()
    this.selectedLayer = null
    this.colors = {
      background: 0x663399,
      headerBg: 0x4a2c66,
      buttonHover: 0x7a4fcf,
      selected: 0x8a6fdf,
      border: 0x4a2c66,
      itemBg: 0x4a2c66,
      previewBg: 0x2a2a3a,
    }
    
    // Propiedades para el scroll y la máscara
    this.scrollContainer = null
    this.maskGraphics = null
    this.scrollY = 0
    this.maxScroll = 0

    // Propiedades para el drag & drop
    this.dragStartY = 0
    this.draggedItem = null
    this.isDragging = false
    this.originalPositions = new Map()
    this.currentReorderIndex = -1
  }

  assignUniqueDepth(layer) {
    const usedDepths = new Set(this.getAllLayers().map((l) => l.depth))
    let newDepth = Array.from(usedDepths).reduce((max, d) => Math.max(max, d), 0) + 1
    layer.sprite.setDepth(newDepth)
    if (layer.depth !== undefined) {
      layer.depth = newDepth
    }
    return newDepth
  }

  show() {
    if (this.modalContainer) return

    // --- CONFIGURACIÓN DE DIMENSIONES ---
    const { width, height } = this.scene.scale
    const navBarHeight = 30
    const headerHeight = 40
    const panelWidth = 300
    const panelHeight = height - navBarHeight
    const startY = navBarHeight

    // --- CONTENEDOR PRINCIPAL ---
    this.modalContainer = this.scene.add.container(width - panelWidth, startY).setDepth(1000)

    const bg = this.scene.add
      .rectangle(0, 0, panelWidth, panelHeight, this.colors.background)
      .setOrigin(0)
      .setStrokeStyle(1, this.colors.border)

    // --- HEADER ---
    const headerBg = this.scene.add
      .rectangle(0, 0, panelWidth, headerHeight, this.colors.headerBg)
      .setOrigin(0)

    const title = this.scene.add
      .text(panelWidth / 2 - 20, headerHeight / 2, "Layers", {
        fontSize: "18px",
        fill: "#FFFFFF",
        fontFamily: "VCR",
      })
      .setOrigin(0.5)

    // Modificar la creación del botón +
    const addButton = this.scene.add
      .text(panelWidth - 30, headerHeight / 2, "+", {
        fontSize: "24px",
        fill: "#FFFFFF",
        fontFamily: "VCR",
      })
      .setOrigin(0.5)
      .setInteractive({ cursor: 'pointer' })
      .on('pointerdown', () => {
        const addElement = this.scene.moduleRegistry.get("AddElement")
        if (addElement) {
          addElement.add()  // Llamar directamente al método add()
        }
      })
      .on('pointerover', () => {
        addButton.setTint(this.colors.buttonHover)
      })
      .on('pointerout', () => {
        addButton.clearTint()
      })

    // --- ÁREA DE CONTENIDO CON MÁSCARA (NUEVA IMPLEMENTACIÓN) ---
    const contentAreaHeight = panelHeight - headerHeight
    
    // 1. Crear la máscara gráfica
    this.maskGraphics = this.scene.add.graphics({ x: this.modalContainer.x, y: this.modalContainer.y + headerHeight })
    this.maskGraphics.fillStyle(0xffffff, 0) // Invisible
    this.maskGraphics.fillRect(0, 0, panelWidth, contentAreaHeight)
    
    // 2. Crear el contenedor para el contenido scrolleable
    this.scrollContainer = this.scene.add.container(0, headerHeight)
    
    // 3. Aplicar la máscara
    const mask = this.maskGraphics.createGeometryMask()
    this.scrollContainer.setMask(mask)

    // --- SETUP SCROLLING ---
    this.setupScrolling(panelWidth, panelHeight, headerHeight)
    
    // --- AÑADIR ELEMENTOS AL CONTENEDOR PRINCIPAL ---
    this.modalContainer.add([bg, headerBg, title, addButton, this.scrollContainer])

    this.refreshLayersList()
    this.scene.setAsHUDElement(this.modalContainer)

    this.scene.input.on("pointermove", this.handleDrag, this)
    this.scene.input.on("pointerup", this.handleDragEnd, this)
  }

  // Método para configurar el scroll
  setupScrolling(panelWidth, panelHeight, headerHeight) {
    const scrollZone = new Phaser.Geom.Rectangle(
        this.modalContainer.x, 
        this.modalContainer.y + headerHeight, 
        panelWidth, 
        panelHeight - headerHeight
    );
    
    this.scene.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
        if (this.modalContainer && scrollZone.contains(pointer.x, pointer.y)) {
            const scrollSpeed = 20;
            this.scrollY += deltaY > 0 ? scrollSpeed : -scrollSpeed;
            this.updateScrollPosition();
        }
    });
  }

  updateScrollPosition() {
    this.scrollY = Phaser.Math.Clamp(this.scrollY, 0, this.maxScroll);
    if (this.scrollContainer) {
      // Anima suavemente el scroll en lugar de saltar directamente
      this.scene.tweens.add({
        targets: this.scrollContainer,
        y: -this.scrollY + 40, // +40 para compensar la altura del header
        duration: 100,
        ease: 'Quad.easeOut'
      });
    }
  }

  hide() {
    if (this.maskGraphics) {
        this.maskGraphics.destroy()
        this.maskGraphics = null
    }
    if (this.modalContainer) {
      this.modalContainer.destroy()
      this.modalContainer = null
    }
    this.layersList = []
    
    if (this.scene.input) {
      this.scene.input.off("pointermove", this.handleDrag, this)
      this.scene.input.off("pointerup", this.handleDragEnd, this)
      // Opcional: Desactivar el listener de 'wheel' si es específico de este panel
    }
  }

  getAllLayers() {
    const allLayers = []
    const charactersModule = this.scene.moduleRegistry.get("Characters")
    if (charactersModule) {
      for (const [id, char] of charactersModule.loadedCharacters) {
        allLayers.push({
          id: `character_${id}`,
          name: id,
          type: "character",
          sprite: char.sprite,
          depth: char.sprite.depth,
          animations: char.data.animations,
        })
      }
    }
    for (const [id, layer] of this.customLayers) {
      allLayers.push({
        id,
        name: layer.name,
        type: layer.type,
        sprite: layer.sprite,
        depth: layer.sprite.depth,
        animations: layer.animations,
      })
    }
    return allLayers.sort((a, b) => b.depth - a.depth)
  }

  refreshLayersList() {
    if (!this.modalContainer || !this.scrollContainer) return

    this.layersList.forEach((item) => item?.destroy())
    this.layersList = []
    this.originalPositions.clear()
    
    // Limpiar el contenedor de scroll antes de repoblar
    this.scrollContainer.removeAll(true)

    const allLayers = this.getAllLayers()
    const itemSpacing = 65
    const initialOffset = 30 
    let totalContentHeight = initialOffset;

    allLayers.forEach((layer, index) => {
      const yPos = initialOffset + (index * itemSpacing)
      const layerItem = this.createLayerItem(layer, yPos)
      this.layersList.push(layerItem)
      this.scrollContainer.add(layerItem) // Añadir al scrollContainer
      this.originalPositions.set(layer.id, yPos)
      totalContentHeight = yPos + itemSpacing;
    })
    
    // Calcular el scroll máximo
    const { height } = this.scene.scale;
    const navBarHeight = 30;
    const headerHeight = 40;
    const visibleHeight = height - navBarHeight - headerHeight;
    this.maxScroll = Math.max(0, totalContentHeight - visibleHeight);
    
    // Resetear posición de scroll
    this.scrollY = 0;
    this.updateScrollPosition();
  }

  createLayerItem(layer, y) {
    const panelWidth = 300
    const container = this.scene.add.container(panelWidth / 2, y)
    const isSelected = this.isLayerSelected(layer)

    const bg = this.scene.add.rectangle(0, 0, 280, 60, isSelected ? this.colors.selected : this.colors.itemBg)
      .setStrokeStyle(1, this.colors.border)

    const previewContainer = this.scene.add
      .rectangle(-110, 0, 50, 50, this.colors.previewBg)
      .setStrokeStyle(2, this.colors.border)

    let preview
    if (layer.sprite) {
      // Manejar diferentes tipos de sprites
      if (layer.type === "spritesheet") {
        // Para spritesheets, obtener el primer frame
        const sprite = layer.sprite.list ? layer.sprite.list[0] : layer.sprite
        if (sprite && sprite.texture) {
          const frames = sprite.texture.getFrameNames()
          if (frames.length > 0) {
            preview = this.scene.add.sprite(-110, 0, sprite.texture.key, frames[0])
              .setDisplaySize(46, 46)
              .setOrigin(0.5)
          }
        }
      } else if (layer.type === "character") {
        // Para personajes
        if (layer.sprite.texture?.key) {
          preview = this.scene.add.sprite(-110, 0, layer.sprite.texture.key)
            .setDisplaySize(46, 46)
            .setOrigin(0.5)
          const frames = this.scene.textures.get(layer.sprite.texture.key).getFrameNames()
          if (frames.length > 0) preview.setFrame(frames[0])
        }
      } else {
        // Para imágenes simples
        if (layer.sprite.texture?.key) {
          preview = this.scene.add.image(-110, 0, layer.sprite.texture.key)
            .setDisplaySize(46, 46)
            .setOrigin(0.5)
        }
      }
    }

    const nameText = this.scene.add.text(-80, 0, layer.name, { 
      fontSize: "14px", 
      fill: "#FFFFFF", 
      fontFamily: "VCR" 
    }).setOrigin(0, 0.5)

    const depthText = this.scene.add.text(80, -15, `${layer.depth}`, { 
      fontSize: "14px", 
      fill: "#FFFFFF", 
      fontFamily: "VCR", 
      fontStyle: "bold" 
    }).setOrigin(0, 0.5)

    const eyeIcon = this.scene.add.text(80, 15, layer.sprite.visible ? "👁" : "-", { 
      fontSize: "18px" 
    })
    .setOrigin(0, 0.5)
    .setInteractive({ cursor: "pointer" })
    .on("pointerdown", (pointer) => {
      pointer.event.stopPropagation()
      layer.sprite.setVisible(!layer.sprite.visible)
      eyeIcon.setText(layer.sprite.visible ? "👁" : "-")
    })

    container.add([bg, previewContainer, nameText, depthText, eyeIcon])
    if (preview) container.add(preview)

    bg.setInteractive({ cursor: "move" })
      .on("pointerdown", (pointer) => {
        pointer.event.stopPropagation()
        this.selectLayer(layer)
        this.dragStartY = container.y
        this.draggedItem = { 
          container, 
          layer, 
          startY: container.y, 
          originalIndex: this.layersList.indexOf(container) 
        }
        this.isDragging = true
        container.setAlpha(0.8)
        this.scrollContainer.bringToTop(container)
        
        this.originalPositions.clear()
        this.layersList.forEach((item, idx) => {
          this.originalPositions.set(idx, item.y)
        })
      })

    return container
  }

  isLayerSelected(layer) {
    const elementsModule = this.scene.moduleRegistry.get("Elements")
    return elementsModule?.selectedElement === layer.sprite
  }

  selectLayer(layer) {
    const elementsModule = this.scene.moduleRegistry.get("Elements")
    elementsModule?.selectElement(layer.sprite)
  }

  handleDrag = (pointer) => {
    if (this.draggedItem && this.isDragging) {
        const headerHeight = 40;
        // Ajustar la posición Y del puntero para que sea relativa al scrollContainer
        const localPointerY = (pointer.y - this.modalContainer.y - headerHeight) + this.scrollY;
        
        this.draggedItem.container.y = localPointerY;
        this.updateOtherItemsPosition(localPointerY);
    }
  }

  updateOtherItemsPosition(draggedY) {
    const itemHeight = 65
    const startY = 30 // Corresponde al initialOffset en refreshLayersList
    
    const newIndex = Math.max(0, Math.min(this.layersList.length - 1, Math.floor((draggedY - startY) / itemHeight)))
    
    if (newIndex !== this.currentReorderIndex) {
      this.currentReorderIndex = newIndex
      
      this.layersList.forEach((item, index) => {
        if (item !== this.draggedItem.container) {
          let targetY
          const originalIndex = this.draggedItem.originalIndex
          const originalY = this.originalPositions.get(index)

          if (index < originalIndex && index >= newIndex) {
            targetY = originalY + itemHeight // Mover hacia abajo
          } else if (index > originalIndex && index <= newIndex) {
            targetY = originalY - itemHeight // Mover hacia arriba
          } else {
            targetY = originalY // Volver a la posición original
          }
          
          this.scene.tweens.add({
            targets: item,
            y: targetY,
            duration: 150,
            ease: 'Power2'
          })
        }
      })
    }
  }

  handleDragEnd = () => {
    if (this.draggedItem && this.isDragging) {
      this.finalizeLayerReorder()
      this.isDragging = false
      this.draggedItem.container.setAlpha(1)
      this.draggedItem = null
      this.currentReorderIndex = -1
    }
  }

  finalizeLayerReorder() {
    if (!this.draggedItem) return

    const itemHeight = 65
    const startY = 30 // initialOffset
    const draggedFinalY = this.draggedItem.container.y

    const newIndex = Math.max(0, Math.min(this.layersList.length - 1, Math.round((draggedFinalY - startY) / itemHeight)))

    let allLayers = this.getAllLayers()
    const draggedLayerData = allLayers.find((l) => l.id === this.draggedItem.layer.id)
    allLayers = allLayers.filter((l) => l.id !== this.draggedItem.layer.id)
    allLayers.splice(newIndex, 0, draggedLayerData)

    const totalLayers = allLayers.length
    allLayers.forEach((layer, index) => {
      const newDepth = totalLayers - index
      if (layer.sprite.depth !== newDepth) {
        layer.sprite.setDepth(newDepth)
        layer.depth = newDepth
        this.scene.events.emit('depth-changed')
      }
    })

    this.scene.tweens.add({
      targets: this.draggedItem.container,
      y: startY + newIndex * itemHeight,
      duration: 200,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.refreshLayersList()
        this.scene.moduleRegistry.get("StageProperties")?.refreshProperties()
      }
    })
  }
}