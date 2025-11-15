export default class AnimationController {
  constructor(scene) {
    this.scene = scene
  }

  startAnimations() {
    this.startCharacterAnimations()
    this.startSpritesheetAnimations()
  }

  stopAnimations() {
    this.stopCharacterAnimations()
    this.stopSpritesheetAnimations()
  }

  startCharacterAnimations() {
    const charactersModule = this.scene.moduleRegistry.get("Characters")
    if (charactersModule) {
      charactersModule.startBeatSystem()
    }
  }

  stopCharacterAnimations() {
    const charactersModule = this.scene.moduleRegistry.get("Characters")
    if (charactersModule) {
      charactersModule.stopBeatSystem()
    }
  }

  startSpritesheetAnimations() {
    const layersPanel = this.scene.moduleRegistry.get("LayersPanel")
    if (!layersPanel) return

    for (const [id, layer] of layersPanel.customLayers) {
      if (layer.type === "spritesheet" && layer.sprite) {
        const sprite = layer.sprite.list ? layer.sprite.list[0] : layer.sprite
        if (sprite && layer.animations && layer.animations.length > 0) {
          const firstAnim = layer.animations[0]
          const animKey = `${layer.textureKey}_${firstAnim.name}`

          if (sprite.anims && this.scene.anims.exists(animKey)) {
            sprite.play({
              key: animKey,
              repeat: -1,
              frameRate: 24,
            })
          }
        }
      }
    }
  }

  stopSpritesheetAnimations() {
    const layersPanel = this.scene.moduleRegistry.get("LayersPanel")
    if (!layersPanel) return

    for (const [id, layer] of layersPanel.customLayers) {
      if (layer.type === "spritesheet" && layer.sprite) {
        const sprite = layer.sprite.list ? layer.sprite.list[0] : layer.sprite
        if (sprite && sprite.anims) {
          sprite.stop()
        }
      }
    }
  }
}
