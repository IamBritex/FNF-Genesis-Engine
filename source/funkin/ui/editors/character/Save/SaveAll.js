export default class SaveAll {
    constructor(scene) {
        this.scene = scene
    }

    async execute() {
        const character = this.getCurrentCharacter()
        if (!character) {
            this.showToast("No character loaded to save", "error")
            return
        }

        try {
            // Usar JSZip del CDN que ya está cargado en index.html
            const zip = new JSZip()

            // Añadir JSON
            const jsonData = await this.generateCharacterJson(character)
            zip.file(`${character.data.image}.json`, JSON.stringify(jsonData, null, '\t'))

            // Añadir XML
            const xmlContent = await this.getCharacterXml(character)
            if (xmlContent) {
                zip.file(`${character.data.image}.xml`, xmlContent)
            }

            // Añadir PNG
            const pngData = await this.getCharacterImage(character)
            if (pngData) {
                zip.file(`${character.data.image}.png`, pngData)
            }

            // Generar y descargar el ZIP
            const blob = await zip.generateAsync({type: 'blob'})
            this.downloadZip(blob, `${character.data.image}_full.zip`)
            
        } catch (error) {
            console.error('Error saving files:', error)
            this.showToast("Error saving files: " + error.message, "error")
        }
    }

    getCurrentCharacter() {
        if (!this.scene.charactersManager?.loadedCharacters) return null
        const characters = Array.from(this.scene.charactersManager.loadedCharacters.values())
        return characters.length > 0 ? characters[0] : null
    }

    async generateCharacterJson(character) {
        // Import SaveJson dynamically instead of using require
        const SaveJson = await import('./SaveJson.js')
        const saveJson = new SaveJson.default(this.scene)
        return saveJson.generateCharacterJson(character)
    }

    async getCharacterXml(character) {
        const texture = this.scene.textures.get(character.textureKey)
        if (!texture) return null

        // Generar XML basado en los frames de la textura
        let xml = '<?xml version="1.0" encoding="utf-8"?>\n'
        xml += '<TextureAtlas imagePath="' + character.data.image + '.png">\n'

        // Añadir cada frame como SubTexture
        texture.getFrameNames().forEach(frameName => {
            const frame = texture.frames[frameName]
            xml += `\t<SubTexture name="${frameName}" x="${frame.x}" y="${frame.y}" width="${frame.width}" height="${frame.height}"`
            if (frame.trimmed) {
                xml += ` frameX="${frame.cutX}" frameY="${frame.cutY}" frameWidth="${frame.realWidth}" frameHeight="${frame.realHeight}"`
            }
            xml += "/>\n"
        })

        xml += '</TextureAtlas>'
        return xml
    }

    async getCharacterImage(character) {
        return new Promise((resolve, reject) => {
            const texture = this.scene.textures.get(character.textureKey)
            if (!texture) {
                reject(new Error('Texture not found'))
                return
            }

            try {
                const canvas = texture.getSourceImage()
                canvas.toBlob(resolve, 'image/png')
            } catch (error) {
                reject(error)
            }
        })
    }

    downloadZip(blob, filename) {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        
        setTimeout(() => {
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
            this.showToast("All files saved successfully!", "success")
        }, 0)
    }

    showToast(message, type = "info") {
        // Implement toast directly instead of importing SaveJson
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