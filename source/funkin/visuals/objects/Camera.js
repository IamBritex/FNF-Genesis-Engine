export class CameraController {
  constructor(scene) {
    this.scene = scene

    // 1. CREACIÓN DE CÁMARAS
    this.gameCamera = scene.cameras.add(0, 0, scene.scale.width, scene.scale.height)
    this.uiCamera = scene.cameras.add(0, 0, scene.scale.width, scene.scale.height)

    this.gameCamera.setName("gameCamera")
    this.uiCamera.setName("uiCamera")

    // 2. CREACIÓN DE CONTENEDORES DE CAPAS
    this.gameLayer = scene.add.group().setName("gameLayer")
    this.uiLayer = scene.add.group().setName("uiLayer")

    // 3. CONFIGURACIÓN DE PROPIEDADES
    // Configurar el fondo de la cámara del juego
    this.gameCamera.setBackgroundColor("#000000")
    
    // Hacer que la cámara UI sea transparente
    this.uiCamera.setBackgroundColor(undefined) // Quitar el color de fondo
    this.uiCamera.transparent = true // Hacer la cámara transparente

    // Desactivar la cámara principal de Phaser
    scene.cameras.main.visible = false

    // Propiedades para efectos
    this.defaultZoom = 1
    this.currentZoom = this.defaultZoom
    this.currentBPM = 100
    this.beatInterval = 60000 / this.currentBPM
    this.isBopping = false
    this.bopZoom = 1.15

    // 4. CONFIGURACIÓN INICIAL DE VISIBILIDAD
    this._setupCameraLayers()

    // Registrar este controlador en la escena para acceso global
    scene.registry.set("cameraController", this)

    console.log("CameraController inicializado correctamente")
  }

  _setupCameraLayers() {
    if (!this.gameCamera || !this.uiCamera || !this.gameLayer || !this.uiLayer) {
        console.warn("CameraController: Cámaras o capas no inicializadas.");
        return;
    }

    // Limpiar configuraciones previas
    this.gameCamera.ignore([]);
    this.uiCamera.ignore([]);

    // Obtener todos los elementos UI incluyendo contenedores y sus hijos
    const uiElements = this.uiLayer.getChildren();
    const gameElements = this.gameLayer.getChildren();

    // Configurar qué debe ignorar cada cámara
    this.gameCamera.ignore(uiElements);
    this.uiCamera.ignore(gameElements);

    // Asegurar que la cámara principal no interfiera
    this.scene.cameras.main.ignore([...gameElements, ...uiElements]);

    console.log("Camera layers setup complete. Game camera ignores UI layer, UI camera ignores game layer.");
  }

  destroy() {
    try {
      // Eliminar referencia en el registro de la escena
      if (this.scene && this.scene.registry) {
        this.scene.registry.remove("cameraController")
      }

      // Limpiar grupos
      if (this.gameLayer) this.gameLayer.clear(true, true)
      if (this.uiLayer) this.uiLayer.clear(true, true)

      // Destruir grupos y cámaras
      this.gameLayer?.destroy()
      this.uiLayer?.destroy()
      this.gameCamera?.destroy()
      this.uiCamera?.destroy()

      // Limpiar referencias
      this.gameLayer = null
      this.uiLayer = null
      this.gameCamera = null
      this.uiCamera = null
    } catch (e) {
      console.warn("Error en la limpieza de CameraController:", e)
    }
  }

  addToGameLayer(object) {
    if (!object || !this.gameLayer) {
      console.warn("No se puede añadir a gameLayer: objeto o capa no válidos.", object)
      return
    }
    try {
      // Quitar de cualquier grupo anterior
      if (object.parentContainer) {
        object.parentContainer.remove(object)
      }

      // Quitar de cualquier grupo anterior
      this.uiLayer.remove(object)

      // Añadir al grupo de juego
      this.gameLayer.add(object)

      // Configurar propiedades específicas para objetos de juego
      if (typeof object.setScrollFactor === "function") {
        object.setScrollFactor(1)
      }

      // Asegurar que el objeto sea visible
      if (typeof object.setVisible === "function") {
        object.setVisible(true)
      }

      console.log(`Objeto añadido a gameLayer: ${object.name || "sin nombre"}`)

      // Actualizar las cámaras
      this._setupCameraLayers()
    } catch (e) {
      console.warn("Error añadiendo a gameLayer:", object, e)
    }
  }

  addToUILayer(object) {
    if (!object || !this.uiLayer) {
        console.warn("No se puede añadir a uiLayer: objeto o capa no válidos.", object);
        return;
    }
    
    try {
        // Si el objeto es un contenedor, configurar todos sus hijos
        if (object.type === 'Container') {
            object.each(child => {
                if (typeof child.setScrollFactor === 'function') {
                    child.setScrollFactor(0);
                }
            });
        }
        
        // Configurar el objeto principal
        if (typeof object.setScrollFactor === 'function') {
            object.setScrollFactor(0);
        }

        // Remover de la capa de juego si está ahí
        this.gameLayer.remove(object);
        
        // Añadir a la capa UI
        this.uiLayer.add(object);
        
        // Asegurar visibilidad
        if (typeof object.setVisible === 'function') {
            object.setVisible(true);
        }

        this._setupCameraLayers();
        
    } catch (e) {
        console.warn("Error añadiendo a uiLayer:", e);
    }
  }

  startBoping() {
    this.isBopping = true
    this.lastBeatTime = 0
    this.beatCounter = 0
  }

  stopBoping() {
    this.isBopping = false
    if (this.gameCamera) {
      this.gameCamera.setZoom(this.defaultZoom)
    }
  }

  updateBPM(newBPM) {
    this.currentBPM = newBPM
    this.beatInterval = 60000 / this.currentBPM
  }

  update(songPosition, time, delta) {
    // Asegurar que las cámaras estén configuradas correctamente
    if (time % 1000 < 16) {
      this._setupCameraLayers()
    }

    if (!this.gameCamera || !this.isBopping) {
      if (this.gameCamera && this.gameCamera.zoom !== this.defaultZoom) {
        const newZoom = Phaser.Math.Linear(this.gameCamera.zoom, this.defaultZoom, (delta / 1000) * 3)
        this.gameCamera.setZoom(newZoom)
        this.currentZoom = newZoom
      }
      return
    }

    const elapsedSeconds = delta / 1000

    if (songPosition >= this.lastBeatTime + this.beatInterval) {
      this.lastBeatTime += this.beatInterval
      this.beatCounter++
      if (this.beatCounter % 4 === 0) {
        this.currentZoom = this.bopZoom
        this.gameCamera.setZoom(this.currentZoom)
      }
    }

    if (this.gameCamera.zoom > this.defaultZoom) {
      this.currentZoom = Phaser.Math.Linear(this.gameCamera.zoom, this.defaultZoom, elapsedSeconds * 3)
      this.gameCamera.setZoom(this.currentZoom)
    } else if (this.gameCamera.zoom < this.defaultZoom) {
      this.gameCamera.setZoom(this.defaultZoom)
      this.currentZoom = this.defaultZoom
    }
  }

  triggerBop() {
    if (this.gameCamera) {
      this.currentZoom = this.bopZoom
      this.gameCamera.setZoom(this.currentZoom)
    }
  }

  reset() {
    this.stopBoping()
    this.defaultZoom = 1
    this.bopZoom = 1.05
    this.lastBeatTime = 0
    this.beatCounter = 0
    this.currentZoom = this.defaultZoom

    // Limpiar grupos pero no destruirlos
    if (this.gameLayer) this.gameLayer.clear(false, false)
    if (this.uiLayer) this.uiLayer.clear(false, false)

    // Resetear cámaras
    if (this.gameCamera) {
      this.gameCamera.setZoom(this.defaultZoom).setScroll(0, 0)
    }
    if (this.uiCamera) {
      this.uiCamera.setZoom(this.defaultZoom).setScroll(0, 0)
    }

    // Reconfigurar capas
    this._setupCameraLayers()
  }

  toggleUICamera() {
    if (this.uiCamera) {
      this.uiCamera.visible = !this.uiCamera.visible
      console.log("Visibilidad de UI Camera:", this.uiCamera.visible)
      this.debugCameras()
    }
  }

  debugCameras() {
    if (this.gameCamera && this.uiCamera && this.gameLayer && this.uiLayer) {
      console.log("%c--- Estado de Cámaras y Capas ---", "color: blue; font-weight: bold;")
      console.log("%cGame Camera:", "color: green;", {
        visible: this.gameCamera.visible,
        zoom: this.gameCamera.zoom,
        scrollX: this.gameCamera.scrollX,
        scrollY: this.gameCamera.scrollY,
        numToRender: this.gameCamera._displayList?.length || 0,
      })
      console.log("%cUI Camera:", "color: purple;", {
        visible: this.uiCamera.visible,
        zoom: this.uiCamera.zoom,
        scrollX: this.uiCamera.scrollX,
        scrollY: this.uiCamera.scrollY,
        numToRender: this.uiCamera._displayList?.length || 0,
      })

      const gameChildren = this.gameLayer.getChildren()
      const uiChildren = this.uiLayer.getChildren()

      console.log("Game Layer: %d hijos", gameChildren.length)
      if (gameChildren.length > 0) {
        console.table(
          gameChildren.map((c) => ({
            type: c.type,
            name: c.name || "sin nombre",
            texture: c.texture?.key || "sin textura",
            visible: c.visible,
          })),
        )
      }
      console.log("UI Layer: %d hijos", uiChildren.length)
      if (uiChildren.length > 0) {
        console.table(
          uiChildren.map((c) => ({
            type: c.type,
            name: c.name || "sin nombre",
            texture: c.texture?.key || "sin textura",
            visible: c.visible,
          })),
        )
      }
      console.log("-----------------------------------")
    } else {
      console.log("Algunos componentes de cámara no están inicializados para depurar.")
    }
  }

  // Método para identificar y clasificar todos los elementos de la escena
  classifyAllSceneElements() {
    // Obtener todos los elementos de la escena
    const allGameObjects = this.scene.children.list.filter(
      (obj) => obj !== this.gameLayer && obj !== this.uiLayer && obj.type,
    )

    console.log(`Analizando ${allGameObjects.length} elementos en la escena...`)

    // Patrones para identificar elementos
    const uiPatterns = [
      "health",
      "bar",
      "rating",
      "text",
      "time",
      "arrow",
      "score",
      "ui",
      "button",
      "menu",
      "hud",
      "icon",
    ]

    const gamePatterns = [
      "character",
      "stage",
      "background",
      "enemy",
      "player",
      "world",
      "platform",
      "obstacle",
      "sprite",
    ]

    // Clasificar cada elemento
    allGameObjects.forEach((obj) => {
      const name = (obj.name || "").toLowerCase()
      const type = (obj.type || "").toLowerCase()
      const constructor = obj.constructor ? obj.constructor.name.toLowerCase() : ""

      // Verificar si es un elemento UI
      if (
        uiPatterns.some((pattern) => name.includes(pattern) || type.includes(pattern) || constructor.includes(pattern))
      ) {
        console.log(`Elemento UI identificado: ${obj.name || "sin nombre"} (${obj.type})`)
        this.addToUILayer(obj)
      }
      // Verificar si es un elemento de juego
      else if (
        gamePatterns.some(
          (pattern) => name.includes(pattern) || type.includes(pattern) || constructor.includes(pattern),
        )
      ) {
        console.log(`Elemento de juego identificado: ${obj.name || "sin nombre"} (${obj.type})`)
        this.addToGameLayer(obj)
      }
      // Si no se puede determinar, preguntar por su tipo
      else {
        // Intentar determinar por su tipo o propiedades
        if (obj.type === "Image" || obj.type === "Sprite" || obj.type === "Container") {
          // Verificar si tiene características de UI
          if (obj.scrollFactor && obj.scrollFactor.x === 0 && obj.scrollFactor.y === 0) {
            console.log(`Elemento UI detectado por scrollFactor: ${obj.name || "sin nombre"} (${obj.type})`)
            this.addToUILayer(obj)
          } else {
            console.log(`Elemento de juego por defecto: ${obj.name || "sin nombre"} (${obj.type})`)
            this.addToGameLayer(obj)
          }
        } else {
          // Por defecto, añadir a la capa de juego
          console.log(`Elemento desconocido añadido a gameLayer: ${obj.name || "sin nombre"} (${obj.type})`)
          this.addToGameLayer(obj)
        }
      }
    })

    // Actualizar las cámaras después de clasificar todos los elementos
    this._setupCameraLayers()

    return {
      totalClassified: allGameObjects.length,
      gameLayerCount: this.gameLayer.getLength(),
      uiLayerCount: this.uiLayer.getLength(),
    }
  }

  // Método para mostrar visualmente los límites de las cámaras
  showCameraBounds() {
    // Eliminar gráficos anteriores si existen
    if (this.gameCameraBounds) this.gameCameraBounds.destroy()
    if (this.uiCameraBounds) this.uiCameraBounds.destroy()

    // Crear gráficos para los límites de la cámara de juego
    this.gameCameraBounds = this.scene.add.graphics()
    this.gameCameraBounds.lineStyle(2, 0x00ff00, 1) // Verde para la cámara de juego
    this.gameCameraBounds.strokeRect(
      this.gameCamera.x,
      this.gameCamera.y,
      this.gameCamera.width,
      this.gameCamera.height,
    )
    this.gameCameraBounds.setScrollFactor(0)
    this.gameCameraBounds.setDepth(1000)
    this.addToUILayer(this.gameCameraBounds)

    // Crear gráficos para los límites de la cámara UI
    this.uiCameraBounds = this.scene.add.graphics()
    this.uiCameraBounds.lineStyle(2, 0xff00ff, 1) // Magenta para la cámara UI
    this.uiCameraBounds.strokeRect(this.uiCamera.x, this.uiCamera.y, this.uiCamera.width, this.uiCamera.height)
    this.uiCameraBounds.setScrollFactor(0)
    this.uiCameraBounds.setDepth(1000)
    this.addToUILayer(this.uiCameraBounds)

    console.log("Límites de cámaras visualizados")
  }

  // Método para ocultar los límites de las cámaras
  hideCameraBounds() {
    if (this.gameCameraBounds) {
      this.gameCameraBounds.destroy()
      this.gameCameraBounds = null
    }
    if (this.uiCameraBounds) {
      this.uiCameraBounds.destroy()
      this.uiCameraBounds = null
    }
    console.log("Límites de cámaras ocultados")
  }

  // Método para alternar la visualización de los límites de las cámaras
  toggleCameraBounds() {
    if (this.gameCameraBounds) {
      this.hideCameraBounds()
    } else {
      this.showCameraBounds()
    }
  }
}
