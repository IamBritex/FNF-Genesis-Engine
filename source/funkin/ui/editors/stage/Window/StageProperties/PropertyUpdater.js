export default class PropertyUpdater {
  constructor(scene) {
    this.scene = scene
    this.selectedElement = null
    this.positionUpdateEvent = null

    // NUEVO: Estado para la animación de spritesheet
    this.currentLayerData = null
    this.currentAnimIndex = 0
    this.tweens = new Map() // Para manejar los tweens de offset
  }

  setSelectedElement(element) {
    const oldElement = this.selectedElement;

    // --- NUEVO: Lógica para "eliminar el personaje anterior" ---
    if (oldElement && oldElement !== element) {
      // Obtenemos el tipo del elemento VIEJO
      const { type: oldType, characterId: oldId } = this.getElementType(oldElement);
      
      if (oldType === "Character") {
        const charactersModule = this.scene.moduleRegistry.get("Characters");
        
        // Si el ID NO está en la lista de 'default', es un personaje de prueba
        if (charactersModule && !charactersModule.loadedCharacters.has(oldId)) {
          console.log(`Destruyendo personaje de prueba anterior: ${oldId}`);
          const elementsModule = this.scene.moduleRegistry.get("Elements");
          // removeElement se encarga de llamar a destroy() y notificar a todos
          elementsModule.removeElement(oldElement);
        }
      }
    }
    // --- FIN DE LÓGICA ---
    
    // Resetea el offset del elemento anterior (si no fue destruido)
    if (oldElement && oldElement.active) {
      this.resetOffsets(oldElement); // Pasa el elemento viejo
    }

    this.selectedElement = element
    this.currentAnimIndex = 0 // Resetea el índice al seleccionar
    
    // NUEVO: Carga los datos del layer (si es un spritesheet)
    if (this.selectedElement) {
      const layersPanel = this.scene.moduleRegistry.get("LayersPanel")
      this.currentLayerData = Array.from(layersPanel.customLayers.values()).find(
        (l) => l.sprite === this.selectedElement
      )
    } else {
      this.currentLayerData = null
    }
  }

  // NUEVO: Función helper que StageProperties usa para obtener datos
  getCurrentAnimationObject() {
    if (!this.currentLayerData || !this.currentLayerData.animations) {
      return null
    }
    // Asegurarse de que el índice es válido
    if (this.currentAnimIndex >= this.currentLayerData.animations.length) {
      this.currentAnimIndex = 0
    }
    return this.currentLayerData.animations[this.currentAnimIndex]
  }

  getElementType(element) {
    let type = "Image"
    let characterId = null
    
    if (!element) return { type: "None", characterId: null }; // Check por si el elemento es nulo
    
    const charactersModule = this.scene.moduleRegistry.get("Characters")

    if (charactersModule) {
      for (const [id, char] of charactersModule.loadedCharacters) {
        if (char.sprite === element) {
          type = "Character"
          characterId = id
          break
        }
      }
    }

    // MODIFICADO: Lógica para 'Test Characters' que no están en 'loadedCharacters'
    if (type === "Image" && element && element.texture && element.texture.key.startsWith("character_")) {
        type = "Character";
        characterId = element.texture.key.replace("character_", "");
    }

    // MODIFICADO: Usa la info del layer que ya cargamos
    // (Esta comprobación debe ir DESPUÉS de la de personaje)
    const layersPanel = this.scene.moduleRegistry.get("LayersPanel");
    const layer = layersPanel && Array.from(layersPanel.customLayers.values()).find(
        (l) => l.sprite === element
    );
    if (type === "Image" && layer && layer.animations) {
      type = "Spritesheet"
    }

    return { type, characterId }
  }

  updateScale(delta, scaleText) {
    if (!this.selectedElement) return

    const currentScale = Number.parseFloat(scaleText.text)
    const newScale = Phaser.Math.Clamp(currentScale + delta, 0.1, 10.0)

    if (this.selectedElement.list && this.selectedElement.list[0]) {
      this.selectedElement.list[0].setScale(newScale)
    } else {
      this.selectedElement.setScale(newScale)
    }

    scaleText.setText(newScale.toFixed(1))
  }

  updateOpacity(delta, opacityText) {
    if (!this.selectedElement) return

    const currentOpacity = Number.parseFloat(opacityText.text)
    const newOpacity = Phaser.Math.Clamp(currentOpacity + delta, 0.1, 1.0)

    if (this.selectedElement.list && this.selectedElement.list[0]) {
      this.selectedElement.list[0].setAlpha(newOpacity)
    } else {
      this.selectedElement.setAlpha(newOpacity)
    }

    opacityText.setText(newOpacity.toFixed(1))
  }

  updateScrollFactor(delta, scrollText) {
    if (!this.selectedElement) return

    const currentText = scrollText.text
    let newValue = currentText === "Default" ? 1 : Number.parseFloat(currentText)
    newValue = Phaser.Math.Clamp(newValue + delta, 0, 2.0)
    newValue = Number.parseFloat(newValue.toFixed(1))

    scrollText.setText(newValue.toString())
    this.selectedElement.setData("scrollFactor", newValue)
    this.selectedElement.setScrollFactor(newValue)
  }

  toggleFlipX(flipCheckMark) {
    if (!this.selectedElement) return

    const sprite = this.selectedElement.list ? this.selectedElement.list[0] : this.selectedElement
    sprite.setFlipX(!sprite.flipX)
    flipCheckMark.setVisible(sprite.flipX)
  }

  updateFPS(delta, fpsText) {
    if (!this.selectedElement) return

    const currentFPS = Number.parseInt(fpsText.text)
    const newFPS = Phaser.Math.Clamp(currentFPS + delta, 1, 60)
    fpsText.setText(newFPS.toString())

    const sprite = this.selectedElement.list ? this.selectedElement.list[0] : this.selectedElement
    if (sprite.anims && sprite.anims.currentAnim) {
      sprite.anims.currentAnim.frameRate = newFPS
    }
  }

  // MODIFICADO: Esta función ahora solo cambia el índice y refresca la UI
  cycleAnimation(direction, animationText, fpsText) {
    if (!this.currentLayerData || !this.currentLayerData.animations) return

    const anims = this.currentLayerData.animations
    this.currentAnimIndex = (this.currentAnimIndex + direction + anims.length) % anims.length
    
    // Obtenemos la nueva animacion
    const newAnim = this.getCurrentAnimationObject()
    
    // Refrescamos la UI de StageProperties (esto actualizará el nombre, offsets, fps, etc.)
    this.scene.events.emit("element-selected", this.selectedElement);

    // Reproducimos la nueva animación seleccionada
    this.playCurrentAnimation(fpsText.text, "loop"); // Asumimos loop al cambiar
  }

  // MODIFICADO: Esta función ahora usa el estado guardado
  cyclePlayMode(direction, playModeText, fpsText) {
    const modes = ["none", "loop", "bpm"]
    let currentIndex = modes.indexOf(playModeText.text)
    currentIndex = (currentIndex + direction + modes.length) % modes.length
    const newMode = modes[currentIndex]
    playModeText.setText(newMode)

    this.playCurrentAnimation(fpsText.text, newMode)
  }

  // NUEVO: Función helper centralizada para reproducir animaciones
  playCurrentAnimation(fpsText, playMode) {
    const anim = this.getCurrentAnimationObject();
    if (!this.selectedElement || !anim || !this.currentLayerData) return;

    const sprite = this.selectedElement.list ? this.selectedElement.list[0] : this.selectedElement
    if (!sprite || !sprite.anims || !sprite.active) return; // Añadido check 'active'

    const textureKey = this.currentLayerData.textureKey
    const animKey = `${textureKey}_${anim.name}`

    // Re-crea la animación en Phaser. Esto es vital si los 'frameIndices' cambiaron.
    this.recreatePhaserAnimation(anim, textureKey)

    switch (playMode) {
      case "none":
        sprite.stop()
        this.resetOffsets() // Quita los offsets
        break
      case "loop":
        sprite.play({
          key: animKey,
          frameRate: Number.parseInt(fpsText) || anim.frameRate || 24,
          repeat: -1,
        })
        this.applyOffsets(anim) // Aplica offsets
        break
      case "bpm":
        sprite.play({
          key: animKey,
          frameRate: (130 / 60) * 24, // TODO: Usar BPM dinámico
          repeat: -1,
        })
        this.applyOffsets(anim) // Aplica offsets
        break
    }
  }
  
  // NUEVO: Función para actualizar los offsets de la animación
  updateAnimationOffset(axis, delta) {
    const currentAnim = this.getCurrentAnimationObject();
    if (!currentAnim) return;

    if (!Array.isArray(currentAnim.offsets)) {
      currentAnim.offsets = [0, 0];
    }

    if (axis === 'x') {
      currentAnim.offsets[0] = parseInt(currentAnim.offsets[0], 10) + delta;
    } else if (axis === 'y') {
      currentAnim.offsets[1] = parseInt(currentAnim.offsets[1], 10) + delta;
    }
    
    // Refresca la UI
    this.scene.events.emit("element-selected", this.selectedElement);
    
    // Aplica el offset en tiempo real
    this.applyOffsets(currentAnim);
  }

  // NUEVO: Lógica para aplicar offsets (adaptado de tu Booper.js)
  applyOffsets(anim) {
    if (!anim || !this.selectedElement || !this.selectedElement.active) return;

    const elementId = this.selectedElement.name || "selectedElement"; // Usar un ID
    if (this.tweens.has(elementId)) {
      this.tweens.get(elementId).kill();
      this.tweens.delete(elementId);
    }

    const baseX = this.selectedElement.getData("baseX");
    const baseY = this.selectedElement.getData("baseY");
    
    const offsets = anim.offsets || [0, 0];
    
    // Forzamos a número (como en Booper.js)
    const finalX = baseX + Number(offsets[0] || 0);
    const finalY = baseY + Number(offsets[1] || 0);
    
    const tween = gsap.to(this.selectedElement, {
      x: finalX,
      y: finalY,
      duration: 0.05,
      ease: "none",
      overwrite: "auto",
    });
    
    this.tweens.set(elementId, tween);
  }

  // MODIFICADO: Lógica para resetear offsets (acepta un elemento opcional)
  resetOffsets(element = null) {
    const target = element || this.selectedElement;
    if (!target || !target.active) return; // Si no hay target, o está destruido, salir

    const elementId = target.name || "selectedElement";
    if (this.tweens.has(elementId)) {
      this.tweens.get(elementId).kill();
      this.tweens.delete(elementId);
    }
    
    const baseX = target.getData("baseX");
    const baseY = target.getData("baseY");
    
    if (baseX !== undefined && baseY !== undefined) {
        target.setPosition(baseX, baseY);
    }
  }

  // NUEVO: Re-crea la animación en Phaser (para 'frameIndices')
  recreatePhaserAnimation(animation, textureKey) {
    if (!animation || !textureKey || !this.scene.textures.exists(textureKey)) return;

    const animKey = `${textureKey}_${animation.name}`;

    // Quita la vieja antes de crear la nueva
    if (this.scene.anims.exists(animKey)) {
      this.scene.anims.remove(animKey);
    }

    const frames = this.scene.textures.get(textureKey).getFrameNames();
    let animationFrames;

    // Asegurarse de que 'prefix' exista
    const prefix = animation.prefix || animation.name || '';

    if (animation.frameIndices?.length > 0) {
      animationFrames = animation.frameIndices
        .map((index) => {
          const paddedIndex = String(index).padStart(4, "0");
          // Usar el prefijo correcto
          return frames.find((frame) => frame.startsWith(`${prefix}${paddedIndex}`));
        })
        .filter(Boolean);
    } else {
      // Fallback si no hay índices (usa solo el prefijo)
      animationFrames = frames.filter((frame) => frame.startsWith(prefix)).sort();
    }

    if (animationFrames.length > 0) {
      this.scene.anims.create({
        key: animKey,
        frames: animationFrames.map((frameName) => ({
          key: textureKey,
          frame: frameName,
        })),
        frameRate: animation.frameRate || 24,
        repeat: animation.loop ? -1 : 0,
      });
    } else {
      console.warn(`No se encontraron frames para la animación: ${animation.name} con prefijo: ${prefix}`);
    }
  }

  startPositionTracking(positionText) {
    if (this.positionUpdateEvent) {
      this.scene.events.off("update", this.positionUpdateEvent)
    }

    this.positionUpdateEvent = () => {
      if (this.selectedElement && this.selectedElement.active) {
        const newX = Math.round(this.selectedElement.x)
        const newY = Math.round(this.selectedElement.y)
        positionText.setText(`${newX}, ${newY}`)
      }
    }

    this.scene.events.on("update", this.positionUpdateEvent)
  }

  stopPositionTracking() {
    if (this.positionUpdateEvent) {
      this.scene.events.off("update", this.positionUpdateEvent)
      this.positionUpdateEvent = null
    }
  }

  destroy() {
    this.stopPositionTracking()
    this.resetOffsets() // Asegura que el último elemento se resetee
    this.tweens.forEach((tween) => tween.kill()) // Limpia GSAP tweens
    this.tweens.clear()
    this.selectedElement = null
    this.currentLayerData = null
  }
}