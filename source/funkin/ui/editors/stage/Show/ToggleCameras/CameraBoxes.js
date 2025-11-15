export default class CameraBoxes {
  constructor(scene) {
    this.scene = scene
    this.cameraBoxes = new Map()
    this.isVisible = false

    this.boxWidth = this.scene.scale.width
    this.boxHeight = this.scene.scale.height

    this.cameraPositions = {
      dad: { x: 500, y: 320 },
      bf: { x: 850, y: 430 },
      gf: { x: 700, y: 360 },
    }

    this.cameraConfigs = {
      dad: { color: 0xff0000, alpha: 0.3 },
      bf: { color: 0x00ff00, alpha: 0.3 },
      gf: { color: 0xffff00, alpha: 0.3 },
    }

    this.createCameraBoxes()
    this.scene.events.on("depth-changed", this.updateCameraDepths, this)
  }

  createCameraBoxes() {
    for (const [characterId, config] of Object.entries(this.cameraConfigs)) {
      const position = this.cameraPositions[characterId]
      if (!position) continue

      const charactersModule = this.scene.moduleRegistry.get("Characters")
      const character = charactersModule?.loadedCharacters.get(characterId)

      const cameraDepth = 999999

      const container = this.scene.add.container(position.x - this.boxWidth / 2, position.y - this.boxHeight / 2)

      const graphics = this.scene.add.graphics()
      graphics.fillStyle(config.color, config.alpha)
      graphics.fillRect(0, 0, this.boxWidth, this.boxHeight)

      const plusSize = 40
      const plusThickness = 6
      const plusColor = 0xffffff

      const horizontalLine = this.scene.add.rectangle(
        this.boxWidth / 2,
        this.boxHeight / 2,
        plusSize,
        plusThickness,
        plusColor,
      )

      const verticalLine = this.scene.add.rectangle(
        this.boxWidth / 2,
        this.boxHeight / 2,
        plusThickness,
        plusSize,
        plusColor,
      )

      container.add([graphics, horizontalLine, verticalLine])
      container.setDepth(cameraDepth)
      container.setVisible(false)

      container.setInteractive(
        new Phaser.Geom.Rectangle(0, 0, this.boxWidth, this.boxHeight),
        Phaser.Geom.Rectangle.Contains,
      )

      const cameraBox = {
        container,
        graphics,
        horizontalLine,
        verticalLine,
        characterId,
        color: config.color,
        alpha: config.alpha,
        originalPosition: { ...position },
      }

      this.cameraBoxes.set(characterId, cameraBox)
      this.scene.setAsGameElement(container)
    }
  }

  toggleVisibility() {
    this.isVisible = !this.isVisible

    for (const [characterId, cameraBox] of this.cameraBoxes) {
      cameraBox.container.setVisible(this.isVisible)
    }

    const elementsModule = this.scene.moduleRegistry.get("Elements")
    if (elementsModule) {
      if (this.isVisible) {
        for (const [characterId, cameraBox] of this.cameraBoxes) {
          elementsModule.addElement(cameraBox.container)
        }
      } else {
        for (const [characterId, cameraBox] of this.cameraBoxes) {
          elementsModule.elements.delete(cameraBox.container)
        }
      }
    }
  }

  updateCameraBoxPosition(container, newX, newY) {
    for (const [characterId, cameraBox] of this.cameraBoxes) {
      if (cameraBox.container === container) {
        cameraBox.originalPosition.x = newX + this.boxWidth / 2
        cameraBox.originalPosition.y = newY + this.boxHeight / 2
        break
      }
    }
  }

  isCameraBox(element) {
    for (const [characterId, cameraBox] of this.cameraBoxes) {
      if (cameraBox.container === element) {
        return true
      }
    }
    return false
  }

  shouldApplyTint(element) {
    return !this.isCameraBox(element)
  }

  updateCameraDepths = () => {
    for (const [characterId, cameraBox] of this.cameraBoxes) {
      cameraBox.container.setDepth(999999)
    }
  }

  getCameraBoxes() {
    return this.cameraBoxes
  }

  destroy() {
    this.scene.events.off("depth-changed", this.updateCameraDepths)

    for (const [characterId, cameraBox] of this.cameraBoxes) {
      if (cameraBox.container) {
        cameraBox.container.destroy()
      }
    }

    this.cameraBoxes.clear()
  }
}
