import UIBuilder from "./StageProperties/UIBuilder.js"
import PropertyUpdater from "./StageProperties/PropertyUpdater.js"
import CharacterLoader from "./StageProperties/CharacterLoader.js"

export default class StageProperties {
  constructor(scene) {
    this.scene = scene
    this.modalContainer = null
    this.contentContainer = null
    this.isMinimized = false
    this.isDragging = false
    this.dragStartX = 0
    this.dragStartY = 0

    this.colors = {
      background: 0x663399,
      headerBg: 0x4a2c66,
      buttonHover: 0x7a4fcf,
      border: 0x4a2c66,
    }

    this.uiBuilder = new UIBuilder(scene, this.colors)
    this.propertyUpdater = new PropertyUpdater(scene)
    this.characterLoader = new CharacterLoader(scene)
  }

  show() {
    if (this.modalContainer) return

    const { width, height } = this.scene.scale
    const modalWidth = 300
    const headerHeight = 30
    const modalHeight = height - 100

    const startX = width - modalWidth - 320
    const startY = 40

    this.modalContainer = this.scene.add.container(startX, startY)

    const bg = this.scene.add
      .rectangle(0, 0, modalWidth, modalHeight, this.colors.background)
      .setOrigin(0)
      .setStrokeStyle(1, this.colors.border)

    const headerBg = this.scene.add
      .rectangle(0, 0, modalWidth, headerHeight, this.colors.headerBg)
      .setOrigin(0)
      .setInteractive({ cursor: "move" })
      .on("pointerdown", this.startDrag.bind(this))

    const title = this.scene.add
      .text(10, headerHeight / 2, "Properties", {
        fontSize: "16px",
        fill: "#FFFFFF",
        fontFamily: "VCR",
      })
      .setOrigin(0, 0.5)

    const closeBtn = this.uiBuilder.createButton(modalWidth - 25, headerHeight / 2, "×", () => {
      this.destroy()
    })

    const minimizeBtn = this.uiBuilder.createButton(modalWidth - 50, headerHeight / 2, "-", () => {
      this.toggleMinimize()
    })

    this.contentContainer = this.scene.add.container(0, headerHeight)

    this.modalContainer.add([bg, headerBg, title, closeBtn, minimizeBtn, this.contentContainer])

    this.dragBounds = {
      left: 0,
      right: width - modalWidth - 300,
      top: 30,
      bottom: height - modalHeight,
    }

    this.scene.setAsHUDElement(this.modalContainer)

    this.scene.input.on("pointermove", this.handleDrag, this)
    this.scene.input.on("pointerup", this.stopDrag, this)

    this.setupPropertiesContent()

    // Comprueba si ya hay un elemento seleccionado al abrir la ventana
    const elementsModule = this.scene.moduleRegistry.get("Elements")
    if (elementsModule && elementsModule.selectedElement) {
      this.refreshProperties(elementsModule.selectedElement)
    } else {
      this.clearProperties()
    }
  }

  startDrag(pointer) {
    this.isDragging = true
    this.dragStartX = pointer.x - this.modalContainer.x
    this.dragStartY = pointer.y - this.modalContainer.y
  }

  handleDrag(pointer) {
    if (!this.isDragging) return

    let x = pointer.x - this.dragStartX
    let y = pointer.y - this.dragStartY

    x = Phaser.Math.Clamp(x, this.dragBounds.left, this.dragBounds.right)
    y = Phaser.Math.Clamp(y, this.dragBounds.top, this.dragBounds.bottom)

    this.modalContainer.setPosition(x, y)
  }

  stopDrag() {
    this.isDragging = false
  }

  toggleMinimize() {
    this.isMinimized = !this.isMinimized
    this.contentContainer.setVisible(!this.isMinimized)

    const bg = this.modalContainer.list[0]
    bg.height = this.isMinimized ? 30 : this.scene.scale.height - 100
  }

  setupPropertiesContent() {
    const propertiesContainer = this.scene.add.container(10, 10)
    const spacing = 30 // Espacio vertical entre controles

    this.typeText = this.scene.add.text(0, 0, "Type: None", {
      fontSize: "16px",
      fill: "#FFFFFF",
      fontFamily: "VCR",
    })

    // --- Controles Generales ---
    const scaleControl = this.uiBuilder.createPropertyControl(
      spacing,
      "Scale:",
      "1.0",
      () => this.propertyUpdater.updateScale(-0.1, this.scaleText),
      () => this.propertyUpdater.updateScale(0.1, this.scaleText),
    )
    this.scaleText = scaleControl.valueText

    const opacityControl = this.uiBuilder.createPropertyControl(
      spacing * 2,
      "Opacity:",
      "1.0",
      () => this.propertyUpdater.updateOpacity(-0.1, this.opacityText),
      () => this.propertyUpdater.updateOpacity(0.1, this.opacityText),
    )
    this.opacityText = opacityControl.valueText

    const scrollControl = this.uiBuilder.createPropertyControl(
      spacing * 3,
      "Scroll Factor:",
      "1.0",
      () => this.propertyUpdater.updateScrollFactor(-0.1, this.scrollText),
      () => this.propertyUpdater.updateScrollFactor(0.1, this.scrollText),
    )
    this.scrollText = scrollControl.valueText

    const positionLabel = this.uiBuilder.createLabelValue(spacing * 4, "Position:", "0, 0")
    this.positionText = positionLabel.valueText

    const flipControl = this.uiBuilder.createCheckbox(spacing * 5, "Flip X:", () =>
      this.propertyUpdater.toggleFlipX(this.flipCheckMark),
    )
    this.flipCheckMark = flipControl.checkMark

    const originXControl = this.uiBuilder.createPropertyControl(
      spacing * 6,
      "Origin X:",
      "0.0",
      () => this.updateOrigin(-0.1, 0, this.originXText),
      () => this.updateOrigin(0.1, 0, this.originXText),
    )
    this.originXText = originXControl.valueText

    const originYControl = this.uiBuilder.createPropertyControl(
      spacing * 7,
      "Origin Y:",
      "0.0",
      () => this.updateOrigin(0, -0.1, this.originYText),
      () => this.updateOrigin(0, 0.1, this.originYText),
    )
    this.originYText = originYControl.valueText

    // --- Controles Específicos de Personaje ---
    const charControlsY = spacing * 8
    this.testCharContainer = this.scene.add.container(0, charControlsY)
    const testCharLabel = this.scene.add.text(0, 0, "Test Character:", {
      fontSize: "16px",
      fill: "#FFFFFF",
      fontFamily: "VCR",
    })

    this.testCharText = this.scene.add
      .text(130, 0, "none", {
        fontSize: "16px",
        fill: "#FFFFFF",
        fontFamily: "VCR",
      })
      .setInteractive({ cursor: "pointer" })
      .on("pointerover", () => this.testCharText.setTint(this.colors.buttonHover))
      .on("pointerout", () => this.testCharText.clearTint())
      .on("pointerdown", () => this.loadCustomCharacter())

    this.testCharContainer.add([testCharLabel, this.testCharText])
    this.testCharContainer.setVisible(false)

    // --- Controles Específicos de Spritesheet ---
    const animControlsY = spacing * 8
    
    const fpsControl = this.uiBuilder.createPropertyControl(
      animControlsY, // y = 240
      "FPS:",
      "24",
      () => this.propertyUpdater.updateFPS(-1, this.fpsText),
      () => this.propertyUpdater.updateFPS(1, this.fpsText),
    )
    this.fpsText = fpsControl.valueText
    this.fpsContainer = fpsControl.container
    this.fpsContainer.setVisible(false)

    const animControl = this.uiBuilder.createPropertyControl(
      animControlsY + spacing, // y = 270
      "Animation:",
      "none",
      () => this.propertyUpdater.cycleAnimation(-1, this.animationText, this.fpsText),
      () => this.propertyUpdater.cycleAnimation(1, this.animationText, this.fpsText),
    )
    this.animationText = animControl.valueText
    this.animationsContainer = animControl.container
    this.animationsContainer.setVisible(false)

    // --- Controles de editor de animación ---
    const offsetXControl = this.uiBuilder.createPropertyControl(
      animControlsY + spacing * 2, // y = 300
      "Offset X:",
      "0",
      () => this.propertyUpdater.updateAnimationOffset("x", -1),
      () => this.propertyUpdater.updateAnimationOffset("x", 1)
    );
    this.offsetXText = offsetXControl.valueText;
    this.offsetXContainer = offsetXControl.container;
    this.offsetXContainer.setVisible(false);

    const offsetYControl = this.uiBuilder.createPropertyControl(
      animControlsY + spacing * 3, // y = 330
      "Offset Y:",
      "0",
      () => this.propertyUpdater.updateAnimationOffset("y", -1),
      () => this.propertyUpdater.updateAnimationOffset("y", 1)
    );
    this.offsetYText = offsetYControl.valueText;
    this.offsetYContainer = offsetYControl.container;
    this.offsetYContainer.setVisible(false);

    // --- SECCIÓN DE ÍNDICES ELIMINADA ---

    const playControl = this.uiBuilder.createPropertyControl(
      animControlsY + spacing * 4, // y = 360 (ajustado)
      "Play:",
      "none",
      () => this.propertyUpdater.cyclePlayMode(-1, this.playModeText, this.fpsText),
      () => this.propertyUpdater.cyclePlayMode(1, this.playModeText, this.fpsText),
    )
    this.playModeText = playControl.valueText
    this.playModeContainer = playControl.container
    this.playModeContainer.setVisible(false)

    // Añadir todos los contenedores a la UI
    propertiesContainer.add([
      this.typeText,
      scaleControl.container,
      opacityControl.container,
      scrollControl.container,
      positionLabel.container,
      flipControl.container,
      originXControl.container,
      originYControl.container,
      this.fpsContainer,
      this.animationsContainer,
      this.offsetXContainer,
      this.offsetYContainer,
      // this.indicesContainer, // ELIMINADO
      this.playModeContainer,
      this.testCharContainer,
    ])

    this.contentContainer.add(propertiesContainer)
    this.scene.setAsHUDElement(this.contentContainer)

    this.scene.events.on("element-selected", this.refreshProperties, this)
    this.scene.events.on("element-deselected", this.clearProperties, this)
  }

  updateOrigin(dx, dy, textElement) {
    const element = this.propertyUpdater.selectedElement
    if (!element) return

    const sprite = element.list ? element.list[0] : element
    if (!sprite || typeof sprite.setOrigin !== 'function') return

    const currentOriginX = sprite.originX !== undefined ? sprite.originX : 0
    const currentOriginY = sprite.originY !== undefined ? sprite.originY : 0

    let newOriginX = Phaser.Math.RoundTo(currentOriginX + dx, -1)
    let newOriginY = Phaser.Math.RoundTo(currentOriginY + dy, -1)
    
    newOriginX = Phaser.Math.Clamp(newOriginX, 0, 1)
    newOriginY = Phaser.Math.Clamp(newOriginY, 0, 1)

    sprite.setOrigin(newOriginX, newOriginY)
    
    if (dx !== 0) textElement.setText(newOriginX.toFixed(1))
    if (dy !== 0) textElement.setText(newOriginY.toFixed(1))
  }

  refreshProperties = (element) => {
    if (!element) {
        this.clearProperties()
        return
    }

    this.propertyUpdater.setSelectedElement(element)
    const { type, characterId } = this.propertyUpdater.getElementType(element)

    this.typeText.setText(`Type: ${type}`)

    const sprite = element.list ? element.list[0] : element
    
    if (!sprite) {
        this.clearProperties()
        this.typeText.setText(`Type: Empty ${type}`)
        return
    }

    this.scaleText.setText(sprite.scaleX.toFixed(1))
    this.opacityText.setText(sprite.alpha.toFixed(1))
    
    const scrollFactor = element.getData("scrollFactor") ?? 1
    this.scrollText.setText(scrollFactor.toString())

    const x = Math.round(element.x)
    const y = Math.round(element.y)
    this.positionText.setText(`${x}, ${y}`)
    
    this.flipCheckMark.setVisible(sprite.flipX || false)

    const originX = sprite.originX !== undefined ? sprite.originX : 0
    const originY = sprite.originY !== undefined ? sprite.originY : 0
    this.originXText.setText(originX.toFixed(1))
    this.originYText.setText(originY.toFixed(1))

    this.testCharContainer.setVisible(type === "Character")
    if (type === "Character") {
      this.testCharText.setText(characterId || "none")
    }

    this.propertyUpdater.startPositionTracking(this.positionText)

    if (type === "Spritesheet") {
      // Mostrar todos los controles de spritesheet
      this.fpsContainer.setVisible(true)
      this.animationsContainer.setVisible(true)
      this.playModeContainer.setVisible(true)
      this.offsetXContainer.setVisible(true)
      this.offsetYContainer.setVisible(true)
      // this.indicesContainer.setVisible(true) // ELIMINADO
      this.testCharContainer.setVisible(false) // Ocultar el de personaje

      const layersPanel = this.scene.moduleRegistry.get("LayersPanel")
      const layer = Array.from(layersPanel.customLayers.values()).find((l) => l.sprite === element)

      // Usamos la función del updater para obtener la info
      const currentAnim = this.propertyUpdater.getCurrentAnimationObject();
      
      if (layer && layer.animations && currentAnim) {
        
        // 1. Asegurarse de que 'offsets' exista y sea un array
        if (!Array.isArray(currentAnim.offsets)) {
            currentAnim.offsets = [0, 0];
        }
        // 2. Asegurarse de que 'frameIndices' exista y sea un array
        if (!Array.isArray(currentAnim.frameIndices)) {
            currentAnim.frameIndices = [];
        }

        // Poblar todos los campos con la info de la anim actual
        this.fpsText.setText(currentAnim.frameRate || "24")
        this.animationText.setText(currentAnim.name)
        this.playModeText.setText("none")

        // Poblar los nuevos campos (AHORA ES SEGURO LEERLOS)
        this.offsetXText.setText(currentAnim.offsets[0]);
        this.offsetYText.setText(currentAnim.offsets[1]);
        
        // --- SECCIÓN DE ÍNDICES ELIMINADA ---

      } else {
        // Fallback si no se encuentra la anim
        this.animationText.setText("none");
        this.fpsText.setText("24");
        this.offsetXText.setText("0");
        this.offsetYText.setText("0");
        // this.indicesText.setText("..."); // ELIMINADO
      }

    } else {
      // Ocultar todos los controles de spritesheet
      this.fpsContainer.setVisible(false)
      this.animationsContainer.setVisible(false)
      this.playModeContainer.setVisible(false)
      this.offsetXContainer.setVisible(false)
      this.offsetYContainer.setVisible(false)
      // this.indicesContainer.setVisible(false) // ELIMINADO
    }
  }

  clearProperties = () => {
    if (!this.modalContainer) return

    this.typeText.setText("Type: None")
    this.scaleText.setText("1.0")
    this.opacityText.setText("1.0")
    this.scrollText.setText("1.0")
    this.positionText.setText("0, 0")
    this.flipCheckMark.setVisible(false)

    if (this.originXText) this.originXText.setText("0.0")
    if (this.originYText) this.originYText.setText("0.0")

    if (this.testCharContainer) {
      this.testCharContainer.setVisible(false)
      this.testCharText.setText("none")
    }

    this.propertyUpdater.setSelectedElement(null)
    this.propertyUpdater.stopPositionTracking()

    // Ocultar todos los contenedores específicos
    this.fpsContainer?.setVisible(false)
    this.animationsContainer?.setVisible(false)
    this.playModeContainer?.setVisible(false)
    this.testCharContainer?.setVisible(false)
    this.offsetXContainer?.setVisible(false)
    this.offsetYContainer?.setVisible(false)
    // this.indicesContainer?.setVisible(false) // ELIMINADO
  }

  loadCustomCharacter() {
    const { characterId } = this.propertyUpdater.getElementType(this.propertyUpdater.selectedElement);
    if (!characterId) {
      console.error("No se pudo determinar el ID del personaje a reemplazar.");
      return;
    }
    this.characterLoader.loadCustomCharacter(this.propertyUpdater.selectedElement, characterId, (newSprite) => {
      
      const oldElement = this.propertyUpdater.selectedElement; // Guardar el elemento antiguo
      const elementsModule = this.scene.moduleRegistry.get("Elements")
      const charactersModule = this.scene.moduleRegistry.get("Characters")
      
      // --- INICIO ARREGLO 1: RESETEAR OFFSETS ---
      // Asumimos que CharacterLoader actualizó 'loadedCharacters'
      // Buscamos el 'character info' del nuevo sprite
      let charInfo = null;
      if (charactersModule) {
        for (const [id, char] of charactersModule.loadedCharacters) {
            if (char.sprite === newSprite) {
                charInfo = char;
                break;
            }
        }
      }

      // Si encontramos el personaje (que fue reemplazado en loadedCharacters),
      // reseteamos todos sus offsets de animación para prevenir el teletransporte.
      if (charInfo && charInfo.data && charInfo.data.animations) {
          console.log(`Resetting offsets for replaced character: ${charInfo.data.name}`);
          charInfo.data.animations.forEach(anim => {
              anim.offsets = [0, 0];
          });
      }
      // --- FIN ARREGLO 1 ---

      // --- INICIO ARREGLO 2: ELIMINAR CAPA ANTIGUA ---
      // (Esta lógica asume que 'PropertyUpdater' o 'CharacterLoader'
      // NO eliminan el 'oldElement' por sí mismos, sino que 'setSelectedElement'
      // lo hará, y 'removeElement' será llamado en cascada).
      // Si el elemento antiguo era un 'test char' (un spritesheet que no es
      // un personaje por defecto), debe ser eliminado.
      const propertyUpdater = this.propertyUpdater;
      const { type: oldType, characterId: oldCharId } = propertyUpdater.getElementType(oldElement);
      
      let isDefaultChar = false;
      if (charactersModule && oldCharId) {
            isDefaultChar = charactersModule.loadedCharacters.has(oldCharId);
      }

      // Si el elemento antiguo era un Spritesheet, O si era un Personaje
      // que NO es por defecto (o sea, un 'test char' anterior), lo borramos.
      // Comprobamos también que no sea el nuevo sprite (por si acaso)
      if (oldElement && oldElement !== newSprite && (oldType === "Spritesheet" || (oldType === "Character" && !isDefaultChar))) {
          console.log("Removing old test character/spritesheet from layers.");
          // Elements.removeElement se encargará de destruir el sprite
          // y (con el nuevo parche) de actualizar el LayersPanel.
          if (elementsModule) {
              elementsModule.removeElement(oldElement);
          } else {
              oldElement.destroy(); // Fallback por si acaso
          }
      }
      // --- FIN ARREGLO 2 ---

      // 'setSelectedElement' ahora solo se preocupa de seleccionar el nuevo
      this.propertyUpdater.setSelectedElement(newSprite)
      // También lo seleccionamos en Elements para que el tinte se aplique
      elementsModule.selectElement(newSprite);
    })
  }

  destroy() {
    if (this.modalContainer) {
      this.scene.events.off("element-selected", this.refreshProperties)
      this.scene.events.off("element-deselected", this.clearProperties)
      
      this.scene.input.off("pointermove", this.handleDrag, this)
      this.scene.input.off("pointerup", this.stopDrag, this)

      this.propertyUpdater.destroy()

      this.modalContainer.destroy()
      this.modalContainer = null
      this.contentContainer = null
    }
  }
}