export default class Booper {
  constructor(charactersInstance) {
    this.characters = charactersInstance
    this.scene = charactersInstance.scene
    this.gfDanceDirection = "right"
    this.lastBeat = 0
    this.currentStep = 0
    this.lastStep = 0
    this.beatHit = false
    this.stepHit = false
    this.bpm = 130
    this.crochet = (60 / this.bpm) * 1000
    this.stepCrochet = this.crochet / 4
    this.isPlaying = false
    this.tweens = new Map()
  }

  startBeatSystem() {
    if (!this.characters.isInitialized) return

    // --- ¡¡INICIO DE LA CORRECCIÓN!! ---
    // Esta función ahora solo se asegura de que 'baseX'/'baseY' (la posición
    // superior-izquierda) esté guardada en el sprite.
    // NO debe sobrescribir 'this.characters.characterPositions',
    // ya que ese mapa almacena las posiciones del ANCLA (pies).
    if (!this.isPlaying) {
      console.log("Beat system started - Setting base positions")
      for (const [characterId, character] of this.characters.loadedCharacters) {
        if (character?.sprite && character.sprite.active) {
          
          let baseX = character.sprite.getData("baseX");
          let baseY = character.sprite.getData("baseY");

          // Si baseX/Y no existen (primera carga), los establece desde la pos. actual.
          if (baseX === undefined) {
            baseX = character.sprite.x;
            character.sprite.setData("baseX", baseX);
          }
          if (baseY === undefined) {
            baseY = character.sprite.y;
            character.sprite.setData("baseY", baseY);
          }

          // La línea que estaba aquí (que corrompía los datos) ha sido eliminada:
          // ELIMINADO: this.characters.characterPositions[characterId] = { x: currentX, y: currentY }
        }
      }
    } else {
      console.log("Beat system already running.")
    }
    // --- FIN DE LA CORRECCIÓN ---

    this.isPlaying = true
    this.scene.events.on("update", this.update, this)
    this.lastStep = 0
    this.currentStep = 0
    this.lastBeat = 0
  }

  stopBeatSystem() {
    this.isPlaying = false
    this.scene.events.off("update", this.update, this)
    console.log("Beat system stopped - Press ENTER to start")

    for (const [characterId, character] of this.characters.loadedCharacters) {
        if (character?.sprite && character.sprite.active) {
            if (this.tweens.has(characterId)) {
                // No matar el tween, simplemente dejar que termine.
                // Si lo matamos, el personaje puede saltar a una posición intermedia.
                // this.tweens.get(characterId).kill() 
                // this.tweens.delete(characterId)
            }
            
            // Al detener, forzamos la animación 'idle' para que aplique su offset
            // y el personaje no salte a la posición base.
            this.playAnimation(characterId, "idle", true);
        }
    }
  }

  update(time, delta) {
    if (!this.isPlaying) return

    const oldStep = this.currentStep
    this.currentStep = Math.floor(this.scene.time.now / this.stepCrochet)

    if (this.currentStep > this.lastStep) {
      this.stepHit = true
      this.lastStep = this.currentStep

      if (this.currentStep % 4 === 0) {
        this.beatHit = true
        this.onBeat(Math.floor(this.currentStep / 4))
      }
    }
  }

  onBeat(beat) {
    if (!this.isPlaying) return

    this.lastBeat = beat
    this.scene.events.emit("camera-beat", beat)

    const elementsModule = this.scene.moduleRegistry.get("Elements")
    const selectedElement = elementsModule?.selectedElement

    for (const [characterId, character] of this.characters.loadedCharacters) {
      if (!character?.isReady || !character.sprite || !character.sprite.active) continue

      this.handleCharacterTint(character, selectedElement)

      if (character.isGF) {
        if (beat % 2 === 0) {
          this.gfDanceDirection = this.gfDanceDirection === "left" ? "right" : "left"
          this.playGFDance()
        }
      } else {
        if (character.sprite.anims && !character.sprite.anims.isPlaying) {
          this.playAnimation(characterId, "idle", true)
        }
      }
    }
  }

  handleCharacterTint(character, selectedElement) {
    if (this.isPlaying) {
      character.sprite.clearTint()
    } else {
      character.sprite.setTint(selectedElement === character.sprite ? 0xffffff : 0x888888)
    }
  }

  playGFDance() {
    const gf = this.characters.loadedCharacters.get("gf")
    if (!gf?.isReady || !this.characters.isInitialized) return

    if (gf.currentAnimation === "cheer" || gf.currentAnimation === "sad") return

    const animName = `dance${this.gfDanceDirection.charAt(0).toUpperCase() + this.gfDanceDirection.slice(1)}`
    const animKey = `${gf.textureKey}_${animName}`

    if (this.scene.anims.exists(animKey) && gf.sprite?.anims) {
      try {
        gf.sprite.play({
          key: animKey,
          frameRate: 24,
          repeat: 0,
        })
        gf.currentAnimation = animName
        this.applyOffsets("gf", animName)
      } catch (error) {
        console.warn("Failed to play GF animation:", error)
      }
    }
  }

  playAnimation(characterId, animName, force = false) {
    const character = this.characters.loadedCharacters.get(characterId)
    if (!character?.isReady || !character.sprite?.anims) return

    const animation = character.data.animations.find((a) => a.anim === animName)
    if (!animation) return

    const animKey = `${character.textureKey}_${animation.anim}`
    if (!this.scene.anims.exists(animKey)) return

    if (force || !character.sprite.anims.isPlaying) {
      try {
        character.sprite.play({
          key: animKey,
          frameRate: animation.fps || 24,
          repeat: animName === "idle" ? 0 : -1,
        })
        character.currentAnimation = animName
        this.applyOffsets(characterId, animName)
      } catch (error) {
        console.warn(`Failed to play animation ${animName} for character ${characterId}:`, error)
      }
    }
  }

  applyOffsets(characterId, animName) {
    const character = this.characters.loadedCharacters.get(characterId)
    if (!character) return

    const animation = character.data.animations.find((a) => a.anim === animName)
    if (!animation) return

    if (this.tweens.has(characterId)) {
      this.tweens.get(characterId).kill()
      this.tweens.delete(characterId)
    }
    
    // Obtiene la posición (0,0) guardada
    const baseX = character.sprite.getData("baseX")
    const baseY = character.sprite.getData("baseY")
    const offsets = animation.offsets || [0, 0]

    const finalX = baseX + Number(offsets[0] || 0)
    const finalY = baseY + Number(offsets[1] || 0)

    const tween = gsap.to(character.sprite, {
      x: finalX,
      y: finalY,
      duration: 0.05,
      ease: "none",
      overwrite: "auto",
    })

    this.tweens.set(characterId, tween)
  }

  async ensureIdleAnimation(characterId) {
    const character = this.characters.loadedCharacters.get(characterId)
    if (!character || !character.isReady) return

    const animKey = `${character.textureKey}_idle`

    await new Promise((resolve) => {
      if (this.scene.anims.exists(animKey)) {
        resolve()
      } else {
        this.scene.time.delayedCall(100, resolve)
      }
    })

    this.playAnimation(characterId, "idle", false)
  }

  cleanup() {
    this.stopBeatSystem()
    this.tweens.forEach((tween) => tween.kill())
    this.tweens.clear()
  }
}