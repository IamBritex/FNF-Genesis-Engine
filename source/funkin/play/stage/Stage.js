/**
 * funkin/play/stage/Stage.js
 */
import { StageData } from "./StageData.js"
import { StageElements } from "./StageElements.js"
import ModHandler from "../../../core/ModHandler.js"

export class Stage {
  constructor(scene, chartData, cameraManager, conductor) {
    this.scene = scene
    this.cameraManager = cameraManager
    this.conductor = conductor
    this.stageDataKey = StageData.extract(chartData)
    this.stageKey = null
    this.defaultStageKey = "StageJSON_stage"
    this.stageContent = null
    this.stageElements = new StageElements(this.scene, this.stageDataKey, this.cameraManager, this.conductor)
  }

  async loadStageJSON() {
    if (!this.stageDataKey) return
    this.stageKey = `StageJSON_${this.stageDataKey}`

    const specificPath = await ModHandler.getPath('data', `stages/${this.stageDataKey}.json`)

    if (!this.scene.cache.json.exists(this.stageKey)) {
      this.scene.load.json(this.stageKey, specificPath)
    }

    const defaultPath = await ModHandler.getPath('data', "stages/stage.json")
    if (!this.scene.cache.json.exists(this.defaultStageKey)) {
      this.scene.load.json(this.defaultStageKey, defaultPath)
    }
  }

  async loadStageImages() {
    if (this.stageContent) return
    if (this.scene.cache.json.exists(this.stageKey)) {
      this.stageContent = this.scene.cache.json.get(this.stageKey)
    } else {
      this.stageContent = this.scene.cache.json.get(this.defaultStageKey)
      this.stageElements.stageDataKey = "stage"
      this.stageElements.spritesheetHandler.stageDataKey = "stage"
    }

    if (this.stageElements) {
      this.stageElements.preloadImages(this.stageContent)
    }
  }

  createStageElements() {
    if (this.stageElements) {
      this.stageElements.createSprites(this.stageContent)
    }
  }

  dance() {
    if (this.stageElements) this.stageElements.dance()
  }

  shutdown() {
    const finalStageKey = this.stageElements?.stageDataKey || this.stageDataKey

    if (this.stageElements) {
      this.stageElements.destroy()
      this.stageElements = null
    }

    if (this.stageContent && this.stageContent.stage) {
      for (const item of this.stageContent.stage) {
        if (item.type === "image" || item.type === "spritesheet") {
          const namePath = item.namePath
          const textureKey = `stage_${finalStageKey}_${namePath}`

          if (item.type === "spritesheet") {
            const anims = this.scene.anims.anims.entries
            const keysToDelete = []
            for (const [animKey] of Object.entries(anims)) {
              if (animKey.startsWith(textureKey)) {
                keysToDelete.push(animKey)
              }
            }
            keysToDelete.forEach((k) => this.scene.anims.remove(k))
          }

          if (this.scene.textures.exists(textureKey)) {
            this.scene.textures.remove(textureKey)
          }
        }
      }
    }

    if (this.stageKey && this.scene.cache.json.exists(this.stageKey)) {
      this.scene.cache.json.remove(this.stageKey)
    }
    if (this.defaultStageKey && this.scene.cache.json.exists(this.defaultStageKey)) {
      this.scene.cache.json.remove(this.defaultStageKey)
    }
  }
}