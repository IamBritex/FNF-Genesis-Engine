export default class Elements {
  constructor(scene) {
    this.scene = scene
    this.selectedElement = null
    this.elements = new Set()

    // --- NUEVO: Estados de arrastre ---
    this.isDragging = false         // Para mover el elemento
    this.isOffsetDragging = false   // Para mover el offset de la animación (Ctrl+Alt)

    // Almacena el punto de inicio del clic en coordenadas del mundo
    this.dragStartPoint = { x: 0, y: 0 } 
    // Almacena la posición original del elemento al empezar el arrastre normal
    this.elementStartPoint = { x: 0, y: 0 }

    this.setupInputs()
  }

  setupInputs() {
    this.interactionEnabled = true

    this.scene.input.on("gameobjectdown", (pointer, gameObject) => {
      if (!this.interactionEnabled || this.scene.isPointerOverHUD(pointer)) return
      
      const targetObject = gameObject.parentContainer || gameObject
      const worldPoint = this.scene.gameCamera.getWorldPoint(pointer.x, pointer.y)

      // --- FEATURE: Lógica de Arrastre de Offset (Ctrl+Alt) ---
      if (pointer.ctrlKey && pointer.altKey) {
        // Comprobar si es un Spritesheet
        const layersPanel = this.scene.moduleRegistry.get("LayersPanel")
        const layer = Array.from(layersPanel.customLayers.values()).find(
          (l) => l.sprite === targetObject
        )

        if (layer && layer.animations) {
          console.log("Iniciando Arrastre de Offset de Animación")
          this.isOffsetDragging = true
          
          // --- CORRECCIÓN a la Feature ---
          // Solo seleccionar el elemento si NO es el que ya estaba seleccionado.
          // Esto evita que PropertyUpdater resetee la animación actual.
          if (this.selectedElement !== targetObject) {
            this.selectElement(targetObject)
          }
          
          this.dragStartPoint = worldPoint // Guarda dónde empezó el clic
          return // Previene el arrastre normal
        }
      }
      // --- FIN Lógica de Arrastre de Offset ---

      // Lógica de Arrastre Normal
      if (pointer.leftButtonDown()) {
        this.isDragging = true
        this.selectElement(targetObject)
        this.dragStartPoint = worldPoint // Guarda dónde empezó el clic
        this.elementStartPoint = { x: targetObject.x, y: targetObject.y } // Guarda dónde estaba el sprite
      }
    })

    this.scene.input.on("pointermove", (pointer) => {
      // Modificado para comprobar ambos tipos de arrastre
      if ((this.isDragging || this.isOffsetDragging) && this.selectedElement) {
        this.updateDrag(pointer)
      }
    })

    this.scene.input.on("pointerup", () => {
      this.stopDrag()
    })

    this.scene.input.on("pointerdown", (pointer, gameObjects) => {
      if (gameObjects.length === 0 && !this.scene.isPointerOverHUD(pointer)) {
        this.deselectAll()
      }
    })

    // --- FEATURE: Borrar con Backspace ---
    this.scene.input.keyboard.on("keydown-BACKSPACE", () => {
        if (this.selectedElement && this.interactionEnabled) {
            
            // No se pueden borrar los personajes por defecto
            const charactersModule = this.scene.moduleRegistry.get("Characters");
            let isDefaultChar = false;
            if (charactersModule) {
                for (const [id, char] of charactersModule.loadedCharacters) {
                    if (char.sprite === this.selectedElement) {
                        isDefaultChar = true;
                        break;
                    }
                }
            }
            
            if (isDefaultChar) {
                console.warn("No se pueden borrar los personajes por defecto (bf, dad, gf).");
                return;
            }

            // Borrar el elemento (de prueba o spritesheet)
            console.log("Elemento borrado con Backspace");
            this.removeElement(this.selectedElement);
        }
    })
    // --- FIN Feature Backspace ---
  }

  applyTints() {
    const unselectedTint = 0x777777
    const toggleCamerasModule = this.scene.moduleRegistry.get("ToggleCameras")
    const isCameraMode = toggleCamerasModule?.isCameraSystemActive

    // No aplicar tintes si estamos en modo cámara
    if (isCameraMode) {
        // Si estamos en modo cámara, limpiamos todos los tintes
        this.elements.forEach((element) => {
            const target = element.list ? element.list : [element]
            target.forEach((item) => {
                if (item.clearTint) {
                    item.clearTint()
                }
            })
        })
        return // Salimos de la función
    }

    this.elements.forEach((element) => {
      const target = element.list ? element.list : [element]
      target.forEach((item) => {
        if (item.setTint) {
          if (element === this.selectedElement) {
            item.clearTint()
          } else {
            const isCameraBox = toggleCamerasModule?.isCameraBox(element)
            const shouldApplyTint = toggleCamerasModule?.shouldApplyTint(element) !== false
            
            if (isCameraBox && toggleCamerasModule.isVisible) {
              item.clearTint()
            } else if (shouldApplyTint) {
              item.setTint(unselectedTint)
            }
          }
        }
      })
    })
  }

  deselectAll() {
    this.selectedElement = null
    this.applyTints() // Tints all elements gray as nothing is selected

    this.scene.events.emit("element-deselected", null) // Usar 'element-deselected'

    const layersPanel = this.scene.moduleRegistry.get("LayersPanel")
    if (layersPanel) {
      layersPanel.refreshLayersList()
    }
  }

  selectElement(element) {
    if (this.selectedElement === element) return // Don't re-select

    this.selectedElement = element
    this.applyTints() // Re-applies all tints based on the new selection

    const layersPanel = this.scene.moduleRegistry.get("LayersPanel")
    if (layersPanel) {
      layersPanel.refreshLayersList()
    }

    this.scene.events.emit("element-selected", this.selectedElement)
  }

  // --- 'startDrag' fue eliminada, la lógica se movió a 'gameobjectdown' ---

  // --- MODIFICADO: 'updateDrag' para manejar ambos casos ---
  updateDrag(pointer) {
    if ((!this.isDragging && !this.isOffsetDragging) || !this.selectedElement) return
    
    const worldPoint = this.scene.gameCamera.getWorldPoint(pointer.x, pointer.y)

    // --- Lógica de Arrastre de Offset (Ctrl+Alt) ---
    if (this.isOffsetDragging) {
      const propertyUpdater = this.scene.moduleRegistry.get("PropertyUpdater")
      if (!propertyUpdater) return
      
      const currentAnim = propertyUpdater.getCurrentAnimationObject()
      if (!currentAnim) return

      // El delta desde el inicio del clic es el nuevo offset
      const deltaX = Math.round(worldPoint.x - this.dragStartPoint.x)
      const deltaY = Math.round(worldPoint.y - this.dragStartPoint.y)

      // Guardamos el offset en el objeto de datos de la animación
      currentAnim.offsets[0] = deltaX
      currentAnim.offsets[1] = deltaY

      // Aplicamos visualmente el offset (usa baseX/Y + offset)
      propertyUpdater.applyOffsets(currentAnim)
      
      // Actualizamos la UI del panel de propiedades
      this.scene.events.emit("element-selected", this.selectedElement)
      return // Importante: no ejecutar el arrastre normal
    }
    
    // --- Lógica de Arrastre Normal ---
    if (this.isDragging) {
      // El delta desde el inicio del *arrastre*
      const deltaX = worldPoint.x - this.dragStartPoint.x
      const deltaY = worldPoint.y - this.dragStartPoint.y

      // La nueva posición es la posición original del elemento + el delta
      const newX = this.elementStartPoint.x + deltaX
      const newY = this.elementStartPoint.y + deltaY

      // Actualizar posición actual
      this.selectedElement.x = newX
      this.selectedElement.y = newY

      // Actualizar posición base para parallax Y para el sistema de 'Booper'
      this.selectedElement.setData('baseX', newX)
      this.selectedElement.setData('baseY', newY)

      // Notificar cambios
      this.updateCharacterPosition(this.selectedElement)
    }
  }

  updateCharacterPosition(element) {
    // Verificar si el elemento es un sprite de personaje
    const charactersModule = this.scene.moduleRegistry.get("Characters")
    if (charactersModule && element) {
      
      // Lógica para personajes de prueba (que no están en loadedCharacters)
      const propertyUpdater = this.scene.moduleRegistry.get("PropertyUpdater")
      if (propertyUpdater) {
          const { type, characterId } = propertyUpdater.getElementType(element);
          if (type === "Character" && !charactersModule.loadedCharacters.has(characterId)) {
              // Es un personaje de prueba, solo actualizamos su 'base'
              element.setData('baseX', element.x);
              element.setData('baseY', element.y);
              return;
          }
      }

      // Lógica para personajes por defecto
      for (const [id, character] of charactersModule.loadedCharacters) {
        if (character.sprite === element) {
          // Actualizar la posición del personaje en el módulo Characters
          charactersModule.updateCharacterPosition(id, element.x, element.y)
          break
        }
      }
    }

    // Verificar si el elemento es un cuadrado de cámara
    const toggleCamerasModule = this.scene.moduleRegistry.get("ToggleCameras")
    if (toggleCamerasModule && element) {
      if (toggleCamerasModule.isCameraBox(element)) {
        // Actualizar la posición del cuadrado de cámara
        toggleCamerasModule.updateCameraBoxPosition(element, element.x, element.y)
      }
    }
  }

  stopDrag() {
    this.isDragging = false
    this.isOffsetDragging = false // Resetea ambos
    // No reseteamos los puntos de inicio, se re-asignan en el próximo clic
  }

  addElement(element) {
    if (!element) return

    this.elements.add(element)
    
    // Guardar posición inicial para parallax
    element.setData('baseX', element.x)
    element.setData('baseY', element.y)
    
    if (element instanceof Phaser.GameObjects.Container) {
      const bounds = element.getBounds()
      const width = element.width || bounds.width
      const height = element.height || bounds.height
      
      element.setInteractive({
        hitArea: new Phaser.Geom.Rectangle(0, 0, width, height),
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
        useHandCursor: true
      })
    } else if (element.setInteractive) {
      element.setInteractive({ useHandCursor: true })
    }
    
    this.applyTints() // Apply initial tint
  }

  removeElement(element) {
    if (!element) return

    if (this.selectedElement === element) {
      this.selectedElement = null
      this.scene.events.emit("element-deselected", null) // Notificar a PropertyPanel
    }
    this.elements.delete(element)

    // --- INICIO ARREGLO 2: NOTIFICAR A LAYERSPANEL ---
    // Notificar al LayersPanel que elimine esta capa.
    const layersPanel = this.scene.moduleRegistry.get("LayersPanel");
    if (layersPanel) {
        // Buscar la capa por el sprite y eliminarla
        let layerId = null;
        for (const [id, layer] of layersPanel.customLayers) {
            if (layer.sprite === element) {
                layerId = id;
                break;
            }
        }
        if (layerId) {
            layersPanel.customLayers.delete(layerId);
            layersPanel.refreshLayersList(); // Refrescar la lista
        }
    }
    // --- FIN ARREGLO 2 ---

    element.destroy()
    this.applyTints()
  }

  destroy() {
    this.scene.input.off("gameobjectdown")
    this.scene.input.off("pointermove")
    this.scene.input.off("pointerup")
    this.scene.input.off("pointerdown")
    this.scene.input.keyboard.off("keydown-BACKSPACE"); // Limpiar listener
    this.elements.clear()
    this.selectedElement = null
  }

  // Añadir método para controlar interactividad
  setInteractive(enabled) {
    this.interactionEnabled = enabled
    
    // Deseleccionar elemento actual si se desactiva la interacción
    if (!enabled && this.selectedElement) {
      this.deselectAll()
    }
  }
}