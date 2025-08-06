export class Hitbox {
  constructor(scene) {
    this.scene = scene
    this.container = null
    this.hitboxSprites = []
    this.directions = ["left", "down", "up", "right"]
    this.isVisible = false
    this.alpha = 0.3

    // Estados de las hitboxes
    this.hitboxStates = {
      left: "static",
      down: "static",
      up: "static",
      right: "static",
    }

    this.init()
  }

  init() {
    // Solo crear si es dispositivo móvil REAL
    if (!this._isRealMobileDevice()) {
      console.log("Hitbox: No es dispositivo móvil real, no se creará")
      return
    }

    console.log("Hitbox: Inicializando para dispositivo móvil")
    this.createHitboxes()
    this.setupEventListeners()
    this.setVisible(true)
  }

  _isRealMobileDevice() {
    // Detectar dispositivos móviles REALES, no por tamaño de pantalla
    const userAgent = navigator.userAgent.toLowerCase()
    const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)
    const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0
    const isActualMobile = /mobi|android/i.test(userAgent)

    // Verificar que no sea un desktop con touch
    const isDesktopWithTouch = hasTouch && window.innerWidth > 1024

    console.log("Device detection:", {
      userAgent: userAgent,
      isMobileUA: isMobileUA,
      hasTouch: hasTouch,
      isActualMobile: isActualMobile,
      isDesktopWithTouch: isDesktopWithTouch,
      screenWidth: window.innerWidth,
    })

    return (isMobileUA || isActualMobile) && !isDesktopWithTouch
  }

  createHitboxes() {
    if (!this.scene.textures.exists("hitboxTexture")) {
      console.error("Hitbox: Texture hitboxTexture no encontrada")
      return
    }

    // Crear contenedor principal
    this.container = this.scene.add.container(0, 0)
    this.container.setName("Hitbox_Container")
    this.container.setDepth(950)

    // Obtener dimensiones de la pantalla
    const screenWidth = this.scene.scale.width
    const screenHeight = this.scene.scale.height

    // Configuración de hitboxes
    const hitboxWidth = 120
    const hitboxHeight = 180
    const spacing = 10
    const totalWidth = hitboxWidth * 4 + spacing * 3
    const startX = (screenWidth - totalWidth) / 2
    const yPosition = screenHeight - hitboxHeight - 20

    console.log("Hitbox: Creando hitboxes en posición:", {
      startX: startX,
      yPosition: yPosition,
      screenWidth: screenWidth,
      screenHeight: screenHeight,
    })

    // Crear hitboxes para cada dirección
    this.directions.forEach((direction, index) => {
      const x = startX + index * (hitboxWidth + spacing)
      const y = yPosition

      // Crear sprite de hitbox
      const hitbox = this.scene.add.sprite(x, y, "hitboxTexture", "static")
      hitbox.setOrigin(0, 0)
      hitbox.setScale(1)
      hitbox.setAlpha(this.alpha)
      hitbox.setInteractive()
      hitbox.setName(`Hitbox_${direction}`)

      // Configurar área interactiva
      hitbox.input.hitArea.setTo(0, 0, hitboxWidth, hitboxHeight)

      // Eventos de touch
      hitbox.on("pointerdown", (pointer) => {
        this.onHitboxPress(direction, index)
      })

      hitbox.on("pointerup", (pointer) => {
        this.onHitboxRelease(direction, index)
      })

      hitbox.on("pointerout", (pointer) => {
        this.onHitboxRelease(direction, index)
      })

      // Añadir al contenedor
      this.container.add(hitbox)
      this.hitboxSprites[index] = hitbox

      console.log(`Hitbox: Creada hitbox ${direction} en posición (${x}, ${y})`)
    })

    // Asegurar que el contenedor esté visible
    this.container.setVisible(true)
    this.container.setActive(true)
  }

  onHitboxPress(direction, index) {
    if (!this.scene.arrowsManager || this.scene.isPaused()) return

    console.log(`Hitbox: Presionada ${direction} (${index})`)

    // Cambiar estado visual
    this.hitboxStates[direction] = "press"
    this.updateHitboxVisual(index, "press")

    // Simular presión de tecla
    this.scene.arrowsManager.keysHeld[direction] = true

    // Verificar hit de nota
    this.checkNoteHit(index)
  }

  onHitboxRelease(direction, index) {
    if (!this.scene.arrowsManager || this.scene.isPaused()) return

    console.log(`Hitbox: Liberada ${direction} (${index})`)

    // Cambiar estado visual
    this.hitboxStates[direction] = "static"
    this.updateHitboxVisual(index, "static")

    // Simular liberación de tecla
    this.scene.arrowsManager.keysHeld[direction] = false

    // Manejar liberación de hold notes
    this.handleNoteRelease(index)
  }

  updateHitboxVisual(index, state) {
    if (!this.hitboxSprites[index]) return

    const hitbox = this.hitboxSprites[index]
    let frame = "static"
    let alpha = this.alpha

    switch (state) {
      case "press":
        frame = "press"
        alpha = 0.6
        break
      case "confirm":
        frame = "confirm"
        alpha = 0.8
        break
      case "hold":
        frame = "confirm-hold"
        alpha = 0.7
        break
      default:
        frame = "static"
        alpha = this.alpha
    }

    hitbox.setFrame(frame)
    hitbox.setAlpha(alpha)
  }

  checkNoteHit(directionIndex) {
    if (!this.scene.arrowsManager) return

    const currentTime = this.scene.songPosition
    let closestNote = null
    let closestTimeDiff = Number.POSITIVE_INFINITY

    // Buscar la nota más cercana en esta dirección
    for (const note of this.scene.arrowsManager.songNotes) {
      if (note.isPlayerNote && note.noteDirection === directionIndex && !note.wasHit && !note.tooLate && note.spawned) {
        const timeDiff = note.strumTime - currentTime
        if (
          Math.abs(timeDiff) <= this.scene.arrowsManager.safeZoneOffset &&
          Math.abs(timeDiff) < Math.abs(closestTimeDiff)
        ) {
          closestNote = note
          closestTimeDiff = timeDiff
        }
      }
    }

    if (closestNote) {
      console.log(`Hitbox: Hit detectado en dirección ${directionIndex}`)
      this.updateHitboxVisual(directionIndex, "confirm")
      this.scene.arrowsManager.hitNote(closestNote, closestTimeDiff)
    } else {
      // Ghost tapping
      const ghostTapping = localStorage.getItem("GAMEPLAY.NOTE SETTINGS.GHOST TAPPING")
      if (ghostTapping === "false") {
        this.scene.arrowsManager.missNote({
          isPlayerNote: true,
          noteDirection: directionIndex,
          wasHit: false,
          tooLate: false,
          spawned: true,
          isHoldNote: false,
          sprite: null,
        })
      }
    }
  }

  handleNoteRelease(directionIndex) {
    if (!this.scene.arrowsManager) return

    // Manejar liberación de hold notes
    const activeHold = this.scene.arrowsManager.activeHoldNotes[directionIndex]
    if (activeHold) {
      const currentTime = this.scene.songPosition
      const holdEndTime = activeHold.strumTime + activeHold.sustainLength

      activeHold.isBeingHeld = false

      if (currentTime < holdEndTime - this.scene.arrowsManager.safeZoneOffset) {
        this.scene.arrowsManager.score -= this.scene.arrowsManager.holdPenalty
        activeHold.holdReleased = true
        this.scene.arrowsManager.ratingManager.recordMiss()
      }
    }

    // Emitir evento de liberación
    this.scene.arrowsManager.events.emit("noteReleased", {
      direction: directionIndex,
      isPlayerNote: true,
    })
  }

  // Método para actualizar estados desde el NotesController
  updateFromStrumlineState(data) {
    if (!this.isVisible || !data.isPlayerNote) return

    const index = data.direction
    if (index < 0 || index >= this.hitboxSprites.length) return

    let visualState = "static"

    switch (data.state) {
      case "confirm":
        visualState = data.sustainNote ? "hold" : "confirm"
        break
      case "press":
        visualState = "press"
        break
      case "static":
      default:
        visualState = "static"
        break
    }

    this.updateHitboxVisual(index, visualState)
  }

  setVisible(visible) {
    this.isVisible = visible
    if (this.container) {
      this.container.setVisible(visible)
      console.log(`Hitbox: Visibilidad establecida a ${visible}`)
    }
  }

  setAlpha(alpha) {
    this.alpha = Math.max(0, Math.min(1, alpha))
    if (this.container) {
      this.hitboxSprites.forEach((hitbox, index) => {
        if (hitbox) {
          const currentState = this.hitboxStates[this.directions[index]]
          this.updateHitboxVisual(index, currentState)
        }
      })
    }
    console.log(`Hitbox: Alpha establecido a ${this.alpha}`)
  }

  setupEventListeners() {
    if (!this.scene.arrowsManager) return

    // Escuchar cambios de estado de strumline
    this.scene.arrowsManager.events.on("strumlineStateChange", (data) => {
      this.updateFromStrumlineState(data)
    })

    console.log("Hitbox: Event listeners configurados")
  }

  destroy() {
    if (this.container) {
      this.container.destroy()
      this.container = null
    }
    this.hitboxSprites = []
    console.log("Hitbox: Destruida")
  }
}
