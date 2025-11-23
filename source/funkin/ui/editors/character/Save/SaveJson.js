export default class SaveJson {
    constructor(scene) {
        this.scene = scene
    }

    execute() {
        const character = this.getCurrentCharacter()
        if (!character) {
            this.showToast("No character loaded", "error")
            return
        }

        // Obtener el nombre base del personaje (sin extensión)
        const baseName = character.data.image.replace(/\.[^/.]+$/, "")
        
        const jsonData = this.generateCharacterJson(character)
        this.downloadJson(jsonData, `${baseName}.json`)
    }

    getCurrentCharacter() {
        if (!this.scene.charactersManager?.loadedCharacters) return null
        const characters = Array.from(this.scene.charactersManager.loadedCharacters.values())
        return characters.length > 0 ? characters[0] : null
    }

    generateCharacterJson(character) {
        // Obtener el nombre base del personaje (sin extensión)
        const baseName = character.data.image.replace(/\.[^/.]+$/, "")
        
        // Obtener las animaciones mapeadas
        const mappingPanel = this.scene.moduleRegistry.get("MappingPanel")
        const mappedAnimations = mappingPanel ? mappingPanel.mappingOptions : []

        // Convertir las animaciones a formato FNF
        const animations = character.data.animations.map(anim => {
            const offset = character.animOffsets?.[anim.name || anim.anim] || [0, 0]
            return {
                name: anim.name || anim.anim,
                anim: (anim.name || anim.anim).toLowerCase(),
                fps: anim.fps || 24,
                loop: anim.loop || false,
                indices: anim.indices || [],
                offsets: offset
            }
        })

        return {
            animations: animations,
            image: `characters/${baseName}`,
            scale: character.data.scale || 1,
            sing_duration: character.data.sing_duration || 4,
            healthicon: baseName,
            camera_position: character.data.camera_position || [0, 0],
            flip_x: character.data.flip_x || false,
            no_antialiasing: character.data.no_antialiasing || false
        }
    }

    downloadJson(jsonData, filename) {
        const jsonStr = JSON.stringify(jsonData, null, '\t')
        const blob = new Blob([jsonStr], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        
        setTimeout(() => {
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
            this.showToast("Character JSON saved successfully!", "success")
        }, 0)
    }

    showToast(message, type = "info") {
        const { width, height } = this.scene.scale
        const toastWidth = Math.max(200, message.length * 8)
        const toastHeight = 40

        let bgColor = 0x4444aa
        if (type === "success") bgColor = 0x44aa44
        if (type === "error") bgColor = 0xaa4444

        const toast = this.scene.add.container(width - toastWidth - 20, height + toastHeight)
        const bg = this.scene.add.rectangle(0, 0, toastWidth, toastHeight, bgColor)
            .setStrokeStyle(2, 0xffffff)
        const text = this.scene.add.text(0, 0, message, {
            fontSize: "14px",
            fill: "#FFFFFF",
            fontFamily: "VCR"
        }).setOrigin(0.5)

        toast.add([bg, text])
        toast.setDepth(3000)

        this.scene.tweens.add({
            targets: toast,
            y: height - toastHeight - 20,
            duration: 300,
            ease: "Back.easeOut",
            onComplete: () => {
                this.scene.time.delayedCall(3000, () => {
                    this.scene.tweens.add({
                        targets: toast,
                        y: height + toastHeight,
                        alpha: 0,
                        duration: 300,
                        ease: "Back.easeIn",
                        onComplete: () => toast.destroy()
                    })
                })
            }
        })
    }
}