import { StageSpritesheet } from "./StageSpritesheet.js"

export const IMAGE_ORIGIN = { x: 0.5, y: 0.5 }

export class StageElements {
    constructor(scene, stageDataKey, cameraManager) {
        this.scene = scene
        this.stageDataKey = stageDataKey
        this.cameraManager = cameraManager

        this.stageElements = []
        this.spritesheetHandler = new StageSpritesheet(scene, stageDataKey, cameraManager)
    }

    preloadImages(stageContent) {
        if (!this.cameraManager) return
        if (!stageContent || !stageContent.stage) return

        this._traverseStageData(stageContent.stage, (item, type) => {
            if (type === "spritesheet") {
                this.spritesheetHandler.preload(item)
            } else if (type === "image") {
                const namePath = item.namePath
                if (namePath) {
                    const textureKey = `stage_${this.stageDataKey}_${namePath}`
                    if (!this.scene.textures.exists(textureKey)) {
                        const imagePath = `public/images/stages/${this.stageDataKey}/${namePath}.png`
                        this.scene.load.image(textureKey, imagePath)
                    }
                }
            }
        })
    }

    createSprites(stageContent) {
        if (!this.cameraManager) return
        if (!stageContent || !stageContent.stage) return

        this._traverseStageData(stageContent.stage, (item, type) => {
            if (type === "spritesheet") {
                this.spritesheetHandler.create(item)
            } else if (type === "image") {
                this._createSingleImage(item)
            }
        })
    }

    dance(beat) {
        if (this.spritesheetHandler) this.spritesheetHandler.dance(beat)
    }

    _createSingleImage(item) {
        const namePath = item.namePath
        const textureKey = `stage_${this.stageDataKey}_${namePath}`

        if (!this.scene.textures.exists(textureKey)) return

        if (item.isPixel) {
            const texture = this.scene.textures.get(textureKey)
            if (texture) {
                texture.setFilter(Phaser.Textures.FilterMode.NEAREST)
            }
        }

        const sprite = this.scene.add.image(
            item.position[0],
            item.position[1],
            textureKey
        )

        sprite.setOrigin(IMAGE_ORIGIN.x, IMAGE_ORIGIN.y)

        sprite.setScale(item.scale ?? 1)
        sprite.setDepth(item.layer)
        sprite.setAlpha(item.opacity ?? 1)
        sprite.setFlipX(item.flip_x || false)
        sprite.setFlipY(item.flip_y || false)
        sprite.setScrollFactor(item.scrollFactor ?? 1)
        sprite.setData('baseX', item.position[0])
        sprite.setData('baseY', item.position[1])

        this.cameraManager.assignToGame(sprite)
        this.stageElements.push(sprite)
    }

    _traverseStageData(nodeList, callback) {
        if (!Array.isArray(nodeList)) return

        for (const node of nodeList) {
            if (node.type) {
                if (node.type === 'group') {
                    if (node.children) this._traverseStageData(node.children, callback)
                } else {
                    callback(node, node.type)
                }
                continue
            }

            const keys = Object.keys(node)
            if (keys.length === 1) {
                const key = keys[0]
                const content = node[key]

                if (content && content.type === 'group') {
                    if (content.children) {
                        this._traverseStageData(content.children, callback)
                    }
                } else if (content && (content.type === 'image' || content.type === 'spritesheet')) {
                    callback(content, content.type)
                }
            }
        }
    }

    destroy() {
        for (const element of this.stageElements) {
            element.destroy()
        }
        this.spritesheetHandler.destroy()
        this.stageElements = []
    }
}