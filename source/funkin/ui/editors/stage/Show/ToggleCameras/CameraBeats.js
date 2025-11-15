export default class CameraBeats {
  constructor(scene, cameraBoxes, cameraSequence) {
    this.scene = scene
    this.cameraBoxes = cameraBoxes
    this.cameraSequence = cameraSequence
    this.isCameraSystemActive = false
    this.currentCameraIndex = 0
    this.lastCameraBeat = 0

    this.scene.events.on("camera-beat", this.onCameraBeat, this)
  }

  toggleSystem() {
    this.isCameraSystemActive = !this.isCameraSystemActive

    if (this.isCameraSystemActive) {
      this.switchToCamera(this.cameraSequence[0])
    } else {
      this.resetCamera()
    }

    console.log(`Camera system ${this.isCameraSystemActive ? "started" : "stopped"}`)
    return this.isCameraSystemActive
  }

  onCameraBeat = (beat) => {
    if (!this.isCameraSystemActive) return

    if (beat > 0 && beat % 4 === 0) {
      this.currentCameraIndex = (this.currentCameraIndex + 1) % this.cameraSequence.length
      const nextCamera = this.cameraSequence[this.currentCameraIndex]
      this.switchToCamera(nextCamera)
    }
  }

  switchToCamera(characterId) {
    const cameraBox = this.cameraBoxes.get(characterId)
    if (!cameraBox) return

    const container = cameraBox.container
    const boxWidth = this.scene.scale.width
    const boxHeight = this.scene.scale.height
    const centerX = container.x + boxWidth / 2
    const centerY = container.y + boxHeight / 2

    const targetZoom = Math.min(this.scene.scale.width / boxWidth, this.scene.scale.height / boxHeight) * 0.95

    gsap.to(this.scene.gameCamera, {
      scrollX: centerX - this.scene.scale.width / 2,
      scrollY: centerY - this.scene.scale.height / 2,
      zoom: targetZoom,
      duration: 0.5,
      ease: "power2.out",
    })
  }

  resetCamera() {
    gsap.to(this.scene.gameCamera, {
      scrollX: 0,
      scrollY: 0,
      zoom: 1,
      duration: 0.5,
      ease: "power2.out",
    })
  }

  isActive() {
    return this.isCameraSystemActive
  }

  destroy() {
    this.scene.events.off("camera-beat", this.onCameraBeat)
  }
}
