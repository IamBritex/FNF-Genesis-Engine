export const SPRITESHEET_ORIGIN = { x: 0.5, y: 0.5 }

export class StageSpritesheet {
    constructor(scene, stageDataKey, cameraManager) {
        this.scene = scene
        this.stageDataKey = stageDataKey
        this.cameraManager = cameraManager

        this.createdSprites = []
    }

    preload(item) {
        const namePath = item.namePath
        if (!namePath) return

        const textureKey = `stage_${this.stageDataKey}_${namePath}`
        if (this.scene.textures.exists(textureKey)) {
            return
        }

        const basePath = `public/images/stages/${this.stageDataKey}/${namePath}`
        const imagePath = `${basePath}.png`
        const xmlPath = `${basePath}.xml`

        this.scene.load.atlasXML(textureKey, imagePath, xmlPath)
    }

    create(item) {
        const namePath = item.namePath
        const textureKey = `stage_${this.stageDataKey}_${namePath}`

        if (!this.scene.textures.exists(textureKey)) return

        if (item.isPixel) {
            const texture = this.scene.textures.get(textureKey)
            if (texture) {
                texture.setFilter(Phaser.Textures.FilterMode.NEAREST)
            }
        }

        const anim = item.animation || {}
        const play_list = anim.play_list || {}
        const play_mode = anim.play_mode || 'None'
        const frameRate = anim.frameRate || 24

        const animNames = Object.keys(play_list)

        if (animNames.length === 0) return

        for (const animName of animNames) {
            const animKey = `${textureKey}_${animName}`
            if (this.scene.anims.exists(animKey)) continue

            const animData = play_list[animName]
            if (!animData || !animData.prefix || !animData.indices) {
                continue
            }

            const frameNames = animData.indices.map((idx) => `${animData.prefix}${idx}`)

            const phaserFrames = []
            for (const frame of frameNames) {
                if (this.scene.textures.get(textureKey).has(frame)) {
                    phaserFrames.push({ key: textureKey, frame: frame })
                }
            }

            if (phaserFrames.length > 0) {
                this.scene.anims.create({
                    key: animKey,
                    frames: phaserFrames,
                    frameRate: frameRate,
                    repeat: 0,
                })
            }
        }

        const firstAnimName = animNames[0]
        const firstAnimData = play_list[firstAnimName]
        const firstFrame = `${firstAnimData.prefix}${firstAnimData.indices[0]}`

        if (!this.scene.textures.get(textureKey).has(firstFrame)) return

        const sprite = this.scene.add.sprite(item.position[0], item.position[1], textureKey, firstFrame)

        sprite.setOrigin(0, 0)

        sprite.setScale(item.scale ?? 1)
        sprite.setDepth(item.layer)
        sprite.setAlpha(item.opacity ?? 1)
        sprite.setFlipX(item.flip_x || false)
        sprite.setFlipY(item.flip_y || false)

        if (item.scroll_x !== undefined && item.scroll_y !== undefined) {
            sprite.setScrollFactor(item.scroll_x, item.scroll_y)
        } else {
            sprite.setScrollFactor(item.scrollFactor ?? 1)
        }

        if (item.angle) {
            sprite.setAngle(item.angle)
        }

        sprite.setData('baseX', item.position[0])
        sprite.setData('baseY', item.position[1])

        this.cameraManager.assignToGame(sprite)

        const firstAnimKey = `${textureKey}_${firstAnimName}`

        // Guardamos metadatos para la lógica de Beat
        sprite.setData('play_mode', play_mode);

        if (play_mode === 'Loop') {
            const animToPlay = this.scene.anims.get(firstAnimKey)
            if (animToPlay) {
                animToPlay.repeat = -1
                sprite.play(firstAnimKey)
            }
        } else if (play_mode === 'Beat') {
            const beatInterval = anim.beat && anim.beat[0] > 0 ? anim.beat[0] : 1

            sprite.setData('beat_anim_list', animNames.map((name) => `${textureKey}_${name}`))
            sprite.setData('beat_anim_interval', beatInterval)
            sprite.setData('beat_anim_index', 0)
            sprite.setData('beat_anim_countdown', beatInterval)

            if (this.scene.anims.exists(firstAnimKey)) {
                sprite.play(firstAnimKey)
            }
        }

        this.createdSprites.push(sprite)
    }

    // Este método ahora es llamado manualmente por Stage.onBeatHit, que recibe el evento
    dance(beat) {
        if (!this.createdSprites || !this.scene) return;

        for (const sprite of this.createdSprites) {
            if (!sprite || !sprite.active) continue;
            
            const playMode = sprite.getData('play_mode');
            if (playMode === 'Beat') {
                this.updateBeatSprite(sprite);
            }
        }
    }

    updateBeatSprite(sprite) {
        const animList = sprite.getData('beat_anim_list')
        if (!animList) return

        let interval = sprite.getData('beat_anim_interval')
        let countdown = sprite.getData('beat_anim_countdown')

        countdown--

        if (countdown <= 0) {
            let index = sprite.getData('beat_anim_index')
            index = (index + 1) % animList.length

            const nextAnimKey = animList[index]

            if (this.scene && this.scene.anims.exists(nextAnimKey)) {
                sprite.play(nextAnimKey)
            }

            sprite.setData('beat_anim_index', index)
            sprite.setData('beat_anim_countdown', interval)
        } else {
            sprite.setData('beat_anim_countdown', countdown)
        }
    }

    destroy() {
        this.createdSprites.forEach((s) => s.destroy())
        this.createdSprites = []
        this.scene = null
        this.cameraManager = null
    }
}