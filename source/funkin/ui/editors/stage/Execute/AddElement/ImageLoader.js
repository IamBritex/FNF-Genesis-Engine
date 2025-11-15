export default class ImageLoader {
  constructor(scene) {
    this.scene = scene
  }

  generateUniqueKey(filename) {
    const now = Date.now()
    const baseKey = filename.split(".").slice(0, -1).join(".")
    return `${baseKey}_${now}`
  }

  async loadAndCreateImage(file) {
    const reader = new FileReader()
    reader.onload = (event) => {
      const uniqueKey = this.generateUniqueKey(file.name)
      const textureKey = "layer_img_" + uniqueKey

      this.scene.load.image(textureKey, event.target.result)
      this.scene.load.once("complete", () => {
        const centerX = this.scene.gameCamera.scrollX + this.scene.scale.width / 2
        const centerY = this.scene.gameCamera.scrollY + this.scene.scale.height / 2
        const sprite = this.scene.add.image(centerX, centerY, textureKey)

        this.registerImageInLayers(sprite, textureKey, file.name)
      })
      this.scene.load.start()
    }
    reader.readAsDataURL(file)
  }

  registerImageInLayers(sprite, textureKey, fileName) {
    const layersPanel = this.scene.moduleRegistry.get("LayersPanel")
    if (!layersPanel) return

    const newDepth = layersPanel.assignUniqueDepth({ sprite })

    this.scene.setAsGameElement(sprite)

    const elementsModule = this.scene.moduleRegistry.get("Elements")
    if (elementsModule) {
      elementsModule.addElement(sprite)
    }

    layersPanel.customLayers.set(textureKey, {
      sprite,
      type: "image",
      name: fileName.replace(/\.[^/.]+$/, ""),
      depth: newDepth,
    })

    layersPanel.refreshLayersList()
    layersPanel.selectLayer({ sprite })
  }

  readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }
}
