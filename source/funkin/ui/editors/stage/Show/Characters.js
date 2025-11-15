import Booper from "./Character/booper.js"
import TextureLoader from "./Character/textures.js"

export default class Characters {
  constructor(scene) {
    this.scene = scene
    this.loadedCharacters = new Map()
    this.isInitialized = false

    // ESTAS POSICIONES AHORA SE INTERPRETAN COMO EL ANCLA (INFERIOR-CENTRAL)
    this.characterPositions = {
      bf: { x: 1045, y: 756 },
      dad: { x: 178, y: 756 },
      gf: { x: 800, y: 697 },
    }

    // Inicializar módulos
    this.booper = new Booper(this)
    this.textureLoader = new TextureLoader(this)
    
  }

  // Delegar métodos del sistema de beats al módulo Booper
  startBeatSystem() {
    this.booper.startBeatSystem()
  }

  stopBeatSystem() {
    this.booper.stopBeatSystem()
  }

  update(time, delta) {
    this.booper.update(time, delta)
  }

  playAnimation(characterId, animName, force = false) {
    this.booper.playAnimation(characterId, animName, force)
  }

  async ensureIdleAnimation(characterId) {
    await this.booper.ensureIdleAnimation(characterId)
  }

  async preloadDefaultCharacters() {
    const characterIds = ["bf", "dad", "gf"]
    const loadPromises = []

    for (const id of characterIds) {
      if (id === "gf") {
        loadPromises.push(this.createGFCharacter(id))
      } else {
        loadPromises.push(this.createCharacter(id, id === "bf"))
      }
    }

    await Promise.all(loadPromises)
    this.isInitialized = true
    console.log("Default characters loaded:", Array.from(this.loadedCharacters.keys()))
  }

  async createCharacter(characterId, isPlayer) {
    try {
      const textureKey = `character_${characterId}`

      const response = await fetch(`public/data/characters/${characterId}.json`)
      if (!response.ok) {
        throw new Error(`Character ${characterId} not found`)
      }
      const characterData = await response.json()

      await this.textureLoader.loadCharacterTextures(characterId, characterData)

      // 1. Crear sprite en (0,0) temporalmente
      const sprite = this.scene.add.sprite(0, 0, textureKey)
      
      // 2. Establecer propiedades iniciales (origen, depth, etc.)
      sprite.setOrigin(0, 0) 
      sprite.setDepth(isPlayer ? 3 : 2)
      sprite.setScrollFactor(1)
      sprite.setData("scrollFactor", 1)
      this.scene.setAsGameElement(sprite)
      sprite.setFlipX(characterId === "bf" ? false : characterData.flip_x === true)
      sprite.setScale(characterData.scale || 1)

      // 3. Crear el objeto de información (aún sin posición)
      const characterInfo = {
        data: characterData,
        sprite: sprite,
        textureKey: textureKey,
        currentAnimation: null,
        isReady: false,
        basePosition: { x: 0, y: 0 }, // Temporal
        originalProps: { adjustedX: 0, adjustedY: 0 }, // Temporal
        animOffsets: {},
        isPlayer: isPlayer,
        isGF: false,
      }

      // --- ¡¡INICIO DE LA CORRECCIÓN!! ---
      
      // 4. Cargar animaciones Y establecer el primer frame (idle)
      // ESTO ACTUALIZA sprite.width y sprite.height A SUS VALORES CORRECTOS
      await this.textureLoader.setupAnimations(characterInfo)
      this.textureLoader.setIdleFirstFrame(characterInfo) // ¡Crucial!

      // 5. Obtener la posición del ANCLA (pies)
      let anchorPosition
      if (characterId === "dad") {
        anchorPosition = this.characterPositions[characterId] || { x: 100, y: 100 }
        this.characterPositions[characterId] = { ...anchorPosition }
      } else {
        anchorPosition = this.characterPositions[characterId] || { x: 0, y: 0 }
      }

      // 6. Calcular la posición (0,0) final (AHORA con width/height correctos)
      const finalX = anchorPosition.x - (sprite.width / 2);
      const finalY = anchorPosition.y - sprite.height;

      // 7. Establecer la posición (0,0) final
      sprite.setPosition(finalX, finalY)
      sprite.setData("baseX", finalX)
      sprite.setData("baseY", finalY)

      // 8. Actualizar el characterInfo con la posición final
      characterInfo.basePosition = { x: finalX, y: finalY }
      characterInfo.originalProps.adjustedX = finalX
      characterInfo.originalProps.adjustedY = finalY
      
      // --- FIN DE LA CORRECCIÓN ---

      characterInfo.isReady = true
      this.loadedCharacters.set(characterId, characterInfo)

      return characterInfo
    } catch (error) {
      console.error(`Error loading character ${characterId}:`, error)
      return null
    }
  }

  async createGFCharacter(characterId) {
    try {
      const textureKey = `character_${characterId}`

      const response = await fetch(`public/data/characters/${characterId}.json`)
      if (!response.ok) {
        throw new Error(`GF character ${characterId} not found`)
      }
      const characterData = await response.json()

      await this.textureLoader.loadCharacterTextures(characterId, characterData)

      // 1. Crear sprite y establecer propiedades
      const sprite = this.scene.add.sprite(0, 0, textureKey)
      sprite.setOrigin(0, 0)
      sprite.setDepth(1)
      sprite.setFlipX(characterData.flip_x === true)
      this.scene.setAsGameElement(sprite)
      sprite.setScale(characterData.scale || 1)

      // 2. Crear characterInfo temporal
      const characterInfo = {
        data: characterData,
        sprite: sprite,
        textureKey: textureKey,
        isPlayer: false,
        currentAnimation: null,
        isGF: true,
        isReady: false,
        basePosition: { x: 0, y: 0 }, // Temporal
        originalProps: { adjustedX: 0, adjustedY: 0 }, // Temporal
        animOffsets: {},
      }

      // --- ¡¡INICIO DE LA CORRECCIÓN!! ---
      
      // 3. Cargar animaciones Y establecer el primer frame (dance)
      // ESTO ACTUALIZA sprite.width y sprite.height
      await this.textureLoader.setupGFAnimation(characterInfo)
      this.textureLoader.setGFFirstFrame(characterInfo) // ¡Crucial!

      // 4. Obtener ancla (pies)
      const anchorPosition = this.characterPositions[characterId]

      // 5. Calcular pos (0,0) final (AHORA con width/height correctos)
      const finalX = anchorPosition.x - (sprite.width / 2);
      const finalY = anchorPosition.y - sprite.height;

      // 6. Establecer pos (0,0) y 'base'
      sprite.setPosition(finalX, finalY)
      sprite.setData("baseX", finalX)
      sprite.setData("baseY", finalY)

      // 7. Actualizar el characterInfo con la posición final
      characterInfo.basePosition = { x: finalX, y: finalY }
      characterInfo.originalProps.adjustedX = finalX
      characterInfo.originalProps.adjustedY = finalY

      // --- FIN DE LA CORRECCIÓN ---

      characterInfo.isReady = true
      this.loadedCharacters.set(characterId, characterInfo)
      
      this.textureLoader.setupAnimationOffsets(characterInfo)

      return characterInfo
    } catch (error) {
      console.error(`Error creating GF character ${characterId}:`, error)
      return null
    }
  }

  updateCharacterPosition(characterId, newX, newY) {
    const character = this.loadedCharacters.get(characterId)
    if (!character) return

    // newX y newY son la nueva posición (0,0) desde 'Elements.js'
    
    // 1. Almacenar y establecer la nueva posición base (0,0)
    character.sprite.setData("baseX", newX)
    character.sprite.setData("baseY", newY)
    character.basePosition.x = newX
    character.basePosition.y = newY
    character.originalProps.adjustedX = newX
    character.originalProps.adjustedY = newY
    
    character.sprite.setPosition(newX, newY)

    // 2. Recalcular la posición del ancla (pies) basada en la nueva pos (0,0)
    // ¡Asegurarse de que el sprite tenga ancho!
    const spriteWidth = character.sprite.width || 0;
    const spriteHeight = character.sprite.height || 0;
    
    const newAnchorX = newX + (spriteWidth / 2);
    const newAnchorY = newY + spriteHeight;

    // 3. Guardar la nueva posición del ANCLA en el mapa principal
    this.characterPositions[characterId] = {
      x: newAnchorX,
      y: newAnchorY,
    }

    // --- CORRECCIÓN ---
    // Aplicar offsets de animación siempre que haya una animación actual,
    // no solo cuando el booper está sonando.
    // Esto evita que el personaje salte a su posición base al ser arrastrado.
    if (character.currentAnimation) {
      this.booper.applyOffsets(characterId, character.currentAnimation)
    }
  }

  cleanup() {
    try {
      this.booper.cleanup()

      for (const [characterId, character] of this.loadedCharacters) {
        if (character?.sprite) {
          character.sprite.destroy()
        }
        if (character?.textureKey) {
          this.textureLoader.clearAnimationCache(character.textureKey)
        }
      }

      this.loadedCharacters.clear()

      this.textureLoader.cleanup()

      this.scene.input.keyboard.off("keydown-ENTER")

      console.log("Characters cleanup complete with memory optimization")
    } catch (error) {
      console.error("Error during Characters cleanup:", error)
    }
  }
}