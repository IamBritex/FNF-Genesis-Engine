export default class SpritesheetLoader {
  constructor(scene) {
    this.scene = scene
  }

  generateUniqueKey(filename) {
    const now = Date.now()
    const baseKey = filename.split(".").slice(0, -1).join(".")
    return `${baseKey}_${now}`
  }

  async loadSpritesheet(pngFile, xmlFile) {
    const uniqueKey = this.generateUniqueKey(pngFile.name)
    const textureKey = "layer_sprite_" + uniqueKey

    try {
      console.log("Loading spritesheet:", {
        textureKey,
        pngName: pngFile.name,
        xmlName: xmlFile.name,
      })

      const pngData = await this.readFileAsDataURL(pngFile)
      const xmlData = await this.readFileAsText(xmlFile)

      const atlas = this.parseXMLToAtlas(xmlData, pngFile.name)

      return new Promise((resolve, reject) => {
        this.scene.load.image(textureKey, pngData)

        this.scene.load.once("filecomplete-image-" + textureKey, () => {
          const texture = this.scene.textures.get(textureKey)
          const sourceImage = texture.source[0]

          atlas.meta.size = {
            w: sourceImage.width,
            h: sourceImage.height,
          }

          this.addFramesToTexture(texture, atlas)
          const frames = texture.getFrameNames()
          const animationGroups = this.groupFramesByAnimation(frames)
          const container = this.createSpriteContainer(textureKey, frames, atlas)

          this.registerSpritesheetInLayers(container, textureKey, pngFile.name, animationGroups)
          this.createAnimations(textureKey, animationGroups)

          resolve(container)
        })

        this.scene.load.start()
      })
    } catch (error) {
      console.error("Error loading spritesheet:", error)
      throw error
    }
  }

  parseXMLToAtlas(xmlData, imageName) {
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(xmlData, "text/xml")
    const frameElements = Array.from(xmlDoc.getElementsByTagName("SubTexture"))

    if (frameElements.length === 0) {
      throw new Error("No frame elements found in XML")
    }

    const atlas = {
      frames: {},
      meta: {
        image: imageName,
        format: "RGBA8888",
        size: { w: 0, h: 0 },
        scale: 1,
      },
    }

    frameElements.forEach((frame) => {
      const name = frame.getAttribute("name").trim()
      const x = Number.parseInt(frame.getAttribute("x"))
      const y = Number.parseInt(frame.getAttribute("y"))
      const width = Number.parseInt(frame.getAttribute("width"))
      const height = Number.parseInt(frame.getAttribute("height"))
      const frameX = Number.parseInt(frame.getAttribute("frameX") || "0")
      const frameY = Number.parseInt(frame.getAttribute("frameY") || "0")
      const frameWidth = Number.parseInt(frame.getAttribute("frameWidth") || width)
      const frameHeight = Number.parseInt(frame.getAttribute("frameHeight") || height)

      if (!name || isNaN(x) || isNaN(y) || isNaN(width) || isNaN(height)) {
        console.warn("Invalid frame data:", { name, x, y, width, height })
        return
      }

      atlas.frames[name] = {
        frame: { x, y, w: width, h: height },
        rotated: false,
        trimmed: frameX !== 0 || frameY !== 0,
        sourceSize: { w: frameWidth, h: frameHeight },
        spriteSourceSize: { x: frameX, y: frameY, w: width, h: height },
      }
    })

    return atlas
  }

  addFramesToTexture(texture, atlas) {
    Object.keys(atlas.frames).forEach((frameName) => {
      const frameData = atlas.frames[frameName]
      texture.add(frameName, 0, frameData.frame.x, frameData.frame.y, frameData.frame.w, frameData.frame.h)
    })
  }

  groupFramesByAnimation(frames) {
    const animationGroups = {}
    frames.forEach((frame) => {
      const baseAnimName = frame.replace(/\d+$/, "")
      if (!animationGroups[baseAnimName]) {
        animationGroups[baseAnimName] = []
      }
      animationGroups[baseAnimName].push(frame)
    })
    return animationGroups
  }

  createSpriteContainer(textureKey, frames, atlas) {
    const firstFrameData = atlas.frames[frames[0]]
    if (!firstFrameData) {
      throw new Error("No frame data found")
    }

    const width = firstFrameData.sourceSize.w
    const height = firstFrameData.sourceSize.h

    const sprite = this.scene.add.sprite(width / 2, height / 2, textureKey, frames[0])
    sprite.setOrigin(0.5)
    sprite.setAlpha(1)
    sprite.clearTint()
    sprite.setDisplaySize(width, height)

    const centerX = this.scene.gameCamera.scrollX + this.scene.scale.width / 2
    const centerY = this.scene.gameCamera.scrollY + this.scene.scale.height / 2
    const container = this.scene.add.container(centerX, centerY)
    container.add(sprite)
    container.setSize(width, height)

    container.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(width / 2, height / 2, width, height),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
      draggable: true,
    })

    return container
  }

  registerSpritesheetInLayers(container, textureKey, fileName, animationGroups) {
    const layersPanel = this.scene.moduleRegistry.get("LayersPanel")
    if (!layersPanel) return

    const newDepth = layersPanel.assignUniqueDepth({ sprite: container })
    this.scene.setAsGameElement(container)

    const elementsModule = this.scene.moduleRegistry.get("Elements")
    if (elementsModule) {
      elementsModule.addElement(container)
    }

    const spritesheetData = {
      sprite: container,
      textureKey,
      type: "spritesheet",
      name: fileName.replace(".png", ""),
      depth: newDepth,
      animations: Object.keys(animationGroups).map((name) => ({
        name: name,
        anim: name,
        loop: true,
      })),
      loop: true,
    }

    layersPanel.customLayers.set(textureKey, spritesheetData)
    layersPanel.refreshLayersList()
    layersPanel.selectLayer(spritesheetData)
  }

  createAnimations(textureKey, animationGroups) {
    Object.entries(animationGroups).forEach(([animName, animFrames]) => {
      const sortedFrames = animFrames.sort()
      const animKey = `${textureKey}_${animName}`

      this.scene.anims.create({
        key: animKey,
        frames: sortedFrames.map((frame) => ({
          key: textureKey,
          frame: frame,
        })),
        frameRate: 24,
        repeat: -1,
      })
    })
  }

  readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsText(file)
    })
  }
}
