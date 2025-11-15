export default class TextureLoader {
  constructor(charactersInstance) {
    this.characters = charactersInstance
    this.scene = charactersInstance.scene
    this.textureCache = new Map()
    this.animationCache = new Map()
  }

  async loadCharacterTextures(characterId, characterData) {
    const textureKey = `character_${characterId}`

    if (this.textureCache.has(textureKey)) {
      return this.textureCache.get(textureKey)
    }

    if (this.scene.textures.exists(textureKey)) {
      this.textureCache.set(textureKey, textureKey)
      return textureKey
    }

    const imagePath = characterData.image.replace("characters/", "")
    const texturePath = `public/images/characters/${imagePath}.png`
    const atlasPath = `public/images/characters/${imagePath}.xml`

    return new Promise((resolve, reject) => {
      this.scene.load.atlasXML(textureKey, texturePath, atlasPath)

      this.scene.load.once("complete", () => {
        console.log(`Successfully loaded textures for ${characterId}`)
        this.textureCache.set(textureKey, textureKey)
        resolve(textureKey)
      })

      this.scene.load.once("loaderror", () => {
        console.error(`Failed to load textures for ${characterId}`)
        reject(new Error(`Failed to load character textures: ${characterId}`))
      })

      this.scene.load.start()
    })
  }

  async setupAnimations(characterInfo) {
    const { data, textureKey, sprite, isPlayer } = characterInfo
    const cacheKey = `${textureKey}_animations`

    if (this.animationCache.has(cacheKey)) {
      this.setIdleFirstFrame(characterInfo)
      return
    }

    const essentialAnims = ["idle", "singLEFT", "singDOWN", "singUP", "singRIGHT"]
    const animationsToCreate = data.animations.filter((anim) => essentialAnims.includes(anim.anim))

    const createAnimationPromises = animationsToCreate.map((animation) => {
      return new Promise((resolve) => {
        const animKey = `${textureKey}_${animation.anim}`

        if (this.scene.anims.exists(animKey)) {
          resolve()
          return
        }

        const frames = this.scene.textures.get(textureKey).getFrameNames()
        let animationFrames

        if (animation.indices?.length > 0) {
          animationFrames = animation.indices
            .map((index) => {
              const paddedIndex = String(index).padStart(4, "0")
              return frames.find((frame) => frame.startsWith(`${animation.name}${paddedIndex}`))
            })
            .filter(Boolean)
        } else {
          animationFrames = frames.filter((frame) => frame.startsWith(animation.name)).sort()
        }

        if (animationFrames.length > 0) {
          const frameRate = animation.fps || 24
          const repeatVal = animation.anim === "idle" ? 0 : animation.loop ? -1 : 0

          this.scene.anims.create({
            key: animKey,
            frames: animationFrames.map((frameName) => ({
              key: textureKey,
              frame: frameName,
            })),
            frameRate: frameRate,
            repeat: repeatVal,
          })
        }
        resolve()
      })
    })

    await Promise.all(createAnimationPromises)
    this.animationCache.set(cacheKey, true)

    this.setIdleFirstFrame(characterInfo)
  }

  setIdleFirstFrame(characterInfo) {
    // --- ¡¡CORRECCIÓN DEL CRASH!! ---
    // Si el sprite no existe o ya fue destruido (no está activo), no hacer nada.
    if (!characterInfo || !characterInfo.sprite || !characterInfo.sprite.active) {
      return
    }
    // --- FIN DE LA CORRECCIÓN ---
    
    const { textureKey, sprite } = characterInfo
    const idleAnimKey = `${textureKey}_idle`

    if (this.scene.anims.exists(idleAnimKey)) {
      const idleAnim = this.scene.anims.get(idleAnimKey)
      if (idleAnim && idleAnim.frames.length > 0) {
        // Establecer el primer frame de la animación idle sin reproducirla
        const firstFrame = idleAnim.frames[0]
        sprite.setTexture(firstFrame.textureKey, firstFrame.textureFrame)
      }
    }
  }

  async setupGFAnimation(characterInfo) {
    const { data, textureKey } = characterInfo
    const cacheKey = `${textureKey}_gf_animations`

    if (this.animationCache.has(cacheKey)) {
      this.setGFFirstFrame(characterInfo)
      return
    }

    const danceAnims = data.animations.filter((anim) => anim.anim.includes("dance") || anim.anim === "idle")

    const animationPromises = danceAnims.map((animation) => {
      return new Promise((resolve) => {
        const animKey = `${textureKey}_${animation.anim}`

        if (this.scene.anims.exists(animKey)) {
          resolve()
          return
        }

        const frames = this.scene.textures.get(textureKey).getFrameNames()
        let animationFrames

        if (animation.indices?.length > 0) {
          animationFrames = animation.indices
            .map((index) => {
              const paddedIndex = String(index).padStart(4, "0")
              return frames.find((frame) => frame.startsWith(`${animation.name}${paddedIndex}`))
            })
            .filter(Boolean)
        } else {
          animationFrames = frames.filter((frame) => frame.startsWith(animation.name)).sort()
        }

        if (animationFrames.length > 0) {
          const frameRate = animation.fps || 24

          this.scene.anims.create({
            key: animKey,
            frames: animationFrames.map((frameName) => ({
              key: textureKey,
              frame: frameName,
            })),
            frameRate: frameRate,
            repeat: 0,
          })
        }
        resolve()
      })
    })

    await Promise.all(animationPromises)
    this.animationCache.set(cacheKey, true)

    this.setGFFirstFrame(characterInfo)
  }

  setGFFirstFrame(characterInfo) {
    // --- ¡¡CORRECCIÓN DEL CRASH!! ---
    // Si el sprite no existe o ya fue destruido (no está activo), no hacer nada.
    if (!characterInfo || !characterInfo.sprite || !characterInfo.sprite.active) {
      return
    }
    // --- FIN DE LA CORRECCIÓN ---

    const { textureKey, sprite } = characterInfo
    const danceLeftKey = `${textureKey}_danceLeft`

    if (this.scene.anims.exists(danceLeftKey)) {
      const danceAnim = this.scene.anims.get(danceLeftKey)
      if (danceAnim && danceAnim.frames.length > 0) {
        // Establecer el primer frame de danceLeft sin reproducirla
        const firstFrame = danceAnim.frames[0]
        sprite.setTexture(firstFrame.textureKey, firstFrame.textureFrame)
      }
    }
  }

  async loadAnimationOnDemand(characterInfo, animName) {
    const { data, textureKey } = characterInfo
    const animKey = `${textureKey}_${animName}`

    if (this.scene.anims.exists(animKey)) {
      return true
    }

    const animation = data.animations.find((anim) => anim.anim === animName)
    if (!animation) return false

    const frames = this.scene.textures.get(textureKey).getFrameNames()
    let animationFrames

    if (animation.indices?.length > 0) {
      animationFrames = animation.indices
        .map((index) => {
          const paddedIndex = String(index).padStart(4, "0")
          return frames.find((frame) => frame.startsWith(`${animation.name}${paddedIndex}`))
        })
        .filter(Boolean)
    } else {
      animationFrames = frames.filter((frame) => frame.startsWith(animation.name)).sort()
    }

    if (animationFrames.length > 0) {
      const frameRate = animation.fps || 24
      const repeatVal = animation.anim === "idle" ? 0 : animation.loop ? -1 : 0

      this.scene.anims.create({
        key: animKey,
        frames: animationFrames.map((frameName) => ({
          key: textureKey,
          frame: frameName,
        })),
        frameRate: frameRate,
        repeat: repeatVal,
      })
      return true
    }
    return false
  }

  setupAnimationOffsets(characterInfo) {
    characterInfo.data.animations.forEach((animation) => {
      const offsets = animation.offsets || [0, 0]
      characterInfo.animOffsets[animation.anim] = offsets
    })
  }

  destroyTexture(textureKey) {
    if (this.scene.textures.exists(textureKey)) {
      this.scene.textures.remove(textureKey)
      this.textureCache.delete(textureKey)
      console.log(`Destroyed texture: ${textureKey}`)
    }
  }

  clearAnimationCache(textureKey) {
    const cacheKey = `${textureKey}_animations`
    this.animationCache.delete(cacheKey)
    this.animationCache.delete(`${textureKey}_gf_animations`)
  }

  cleanup() {
    this.textureCache.clear()
    this.animationCache.clear()
  }
}