import CameraBoxes from "./ToggleCameras/CameraBoxes.js"
import CameraBeats from "./ToggleCameras/CameraBeats.js"
import AnimationController from "./ToggleCameras/AnimationController.js"

export default class ToggleCameras {
  constructor(scene) {
    this.scene = scene
    this.isVisible = false
    this.cameraBoxes = new Map()
    this.isCameraSystemActive = false
    this.currentCameraIndex = 0
    this.cameraSequence = ["bf", "dad", "gf"]
    this.lastCameraBeat = 0

    // Usar el tamaño del canvas
    this.boxWidth = this.scene.scale.width
    this.boxHeight = this.scene.scale.height

    // Posiciones predefinidas para las cámaras
    this.cameraPositions = {
      dad: { x: 500, y: 320 },
      bf: { x: 850, y: 430 },
      gf: { x: 700, y: 360 },
    }

    // Configuración de cámaras con profundidad dinámica
    this.cameraConfigs = {
      dad: { color: 0xff0000, alpha: 0.3 },
      bf: { color: 0x00ff00, alpha: 0.3 },
      gf: { color: 0xffff00, alpha: 0.3 },
    }

    this.cameraBoxes = new CameraBoxes(scene)
    this.cameraBeats = new CameraBeats(scene, this.cameraBoxes.getCameraBoxes(), this.cameraSequence)
    this.animationController = new AnimationController(scene)

    this.setupKeyboardControls()

    // Iniciar el sistema de cámaras pero no activarlo
    this.createCameraSystem()

    // Suscribirse a cambios de profundidad
    this.scene.events.on("depth-changed", this.updateCameraDepths, this)
  }

  setupKeyboardControls() {
    this.scene.input.keyboard.on("keydown-ENTER", () => {
      this.handleEnterPress()
    })
  }

  handleEnterPress() {
    this.cameraBeats.toggleSystem()
    this.toggleEditorInteractivity()

    if (this.cameraBeats.isActive()) {
      this.animationController.startAnimations()
    } else {
      this.animationController.stopAnimations()
    }
  }

  toggleEditorInteractivity() {
    const isActive = this.cameraBeats.isActive()

    if (this.scene.hudCamera) {
      this.scene.hudCamera.visible = !isActive
    }

    const elementsModule = this.scene.moduleRegistry.get("Elements")
    if (elementsModule) {
      elementsModule.setInteractive(!isActive)

      if (isActive) {
        elementsModule.elements.forEach((element) => {
          if (element instanceof Phaser.GameObjects.Container) {
            element.list.forEach((item) => {
              if (item.clearTint && typeof item.clearTint === "function") {
                item.clearTint()
              }
            })
          } else if (element.clearTint && typeof element.clearTint === "function") {
            element.clearTint()
          }
        })
      } else {
        elementsModule.applyTints()
      }
    }

    this.scene.toggleEditorInput(!isActive)
  }

  createCameraSystem() {
    this.isCameraSystemActive = false
    this.currentCameraIndex = 0
    this.lastCameraBeat = 0
  }

  toggleCameraSystem() {
    this.isCameraSystemActive = !this.isCameraSystemActive

    if (this.isCameraSystemActive) {
      // Activar primera cámara inmediatamente
      this.switchToCamera(this.cameraSequence[0])
    } else {
      // Resetear cámara
      gsap.to(this.scene.gameCamera, {
        scrollX: 0,
        scrollY: 0,
        zoom: 1,
        duration: 0.5,
        ease: "power2.out",
      })
    }

    console.log(`Camera system ${this.isCameraSystemActive ? "started" : "stopped"}`)
  }

  execute() {
    this.cameraBoxes.toggleVisibility()
  }

  updateCameraBoxPosition(container, newX, newY) {
    this.cameraBoxes.updateCameraBoxPosition(container, newX, newY)
  }

  isCameraBox(element) {
    return this.cameraBoxes.isCameraBox(element)
  }

  shouldApplyTint(element) {
    return this.cameraBoxes.shouldApplyTint(element)
  }

  updateCameraDepths = () => {
    const charactersModule = this.scene.moduleRegistry.get("Characters")
    if (!charactersModule) return

    for (const [characterId, cameraBox] of this.cameraBoxes.getCameraBoxes()) {
      const character = charactersModule.loadedCharacters.get(characterId)
      if (character && character.sprite) {
        // Establecer la profundidad de la cámara una capa por encima del personaje
        cameraBox.container.setDepth(character.sprite.depth + 1)
      }
    }
  }

  destroy() {
    this.scene.input.keyboard.off("keydown-ENTER")
    this.cameraBeats.destroy()
    this.cameraBoxes.destroy()
    console.log("ToggleCameras destroyed")
  }
}
