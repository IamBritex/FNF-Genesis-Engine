export default class SaveStage {
    constructor(scene) {
        this.scene = scene
    }

    execute() {
        const stageData = this.generateStageData()
        this.downloadJSON(stageData)
    }

    generateStageData() {
        const layersPanel = this.scene.moduleRegistry.get("LayersPanel")
        const toggleCameras = this.scene.moduleRegistry.get("ToggleCameras")
        const data = { stage: [] }

        if (!layersPanel) return data

        // Obtener todas las capas ordenadas por profundidad
        const allLayers = layersPanel.getAllLayers().sort((a, b) => a.depth - b.depth)

        for (const layer of allLayers) {
            let layerData = {}

            switch (layer.type) {
                case "image":
                case "spritesheet":
                    layerData = {
                        type: layer.type,
                        layer: layer.depth,
                        scale: layer.sprite.list ? layer.sprite.list[0].scaleX : layer.sprite.scaleX,
                        namePath: layer.name,
                        visible: layer.sprite.visible,
                        opacity: layer.sprite.list ? layer.sprite.list[0].alpha : layer.sprite.alpha,
                        position: [
                            Math.round(layer.sprite.x),
                            Math.round(layer.sprite.y)
                        ],
                        flip_x: layer.sprite.list ? layer.sprite.list[0].flipX : layer.sprite.flipX,
                        scrollFactor: layer.sprite.getData('scrollFactor') || 1
                    }

                    // Agregar datos específicos para spritesheets
                    if (layer.type === "spritesheet" && layer.sprite.list && layer.sprite.list[0].anims.currentAnim) {
                        layerData.animation = {
                            name: layer.sprite.list[0].anims.currentAnim.key.split('_').pop(),
                            frameRate: layer.sprite.list[0].anims.currentAnim.frameRate,
                            play: this.getPlayMode(layer.sprite.list[0])
                        }
                    }
                    data.stage.push(layerData)
                    break

                case "character":
                    // Determinar el tipo de personaje
                    let playerKey = ""
                    if (layer.name === "bf") playerKey = "player"
                    else if (layer.name === "dad") playerKey = "enemy"
                    else if (layer.name === "gf") playerKey = "playergf"

                    // Obtener la posición de la cámara para este personaje
                    let cameraPosition = [0, 0]
                    if (toggleCameras) {
                        
                        const cameraBox = toggleCameras.cameraBoxes.getCameraBoxes().get(layer.name)

                        if (cameraBox) {
                            cameraPosition = [
                                Math.round(cameraBox.originalPosition.x - toggleCameras.boxWidth/2),
                                Math.round(cameraBox.originalPosition.y - toggleCameras.boxHeight/2)
                            ]
                        }
                    }

                    // --- ¡¡LÓGICA DE ANCLAJE MODIFICADA!! ---
                    // El sprite (layer.sprite) tiene su origen en (0, 0).
                    // layer.sprite.x/y es la esquina superior izquierda.
                    // Necesitamos guardar el punto inferior-central (el ancla).

                    // 1. Obtener la posición (0, 0)
                    const spriteX = layer.sprite.x;
                    const spriteY = layer.sprite.y;

                    // 2. Obtener las dimensiones (ya están escaladas)
                    const spriteWidth = layer.sprite.width;
                    const spriteHeight = layer.sprite.height;

                    // 3. Calcular el ancla (pies)
                    const anchorX = spriteX + (spriteWidth / 2);
                    const anchorY = spriteY + spriteHeight;
                    // --- FIN DE LA MODIFICACIÓN ---

                    const characterData = {
                        [playerKey]: {
                            type: "character",
                            layer: layer.depth,
                            scale: layer.sprite.scaleX,
                            visible: layer.sprite.visible,
                            opacity: layer.sprite.alpha,
                            // Guardamos la posición del ANCLA (pies)
                            position: [
                                Math.round(anchorX),
                                Math.round(anchorY)
                            ],
                            camera: cameraPosition,
                            flip_x: layer.sprite.flipX,
                            scrollFactor: layer.sprite.getData('scrollFactor') || 1
                        }
                    }
                    data.stage.push(characterData)
                    break
            }
        }

        return data
    }

    getPlayMode(sprite) {
        if (!sprite.anims.isPlaying) return "none"
        if (sprite.anims.currentAnim.frameRate === (130/60 * 24)) return "bpm"
        return "loop"
    }

    downloadJSON(data) {
        const jsonString = JSON.stringify(data, null, 4)
        const blob = new Blob([jsonString], { type: 'application/json' })
        
        // Crear elemento para descargar
        const downloadLink = document.createElement('a')
        downloadLink.href = URL.createObjectURL(blob)
        downloadLink.download = 'stage.json'
        
        // Simular click para abrir el explorador de archivos
        document.body.appendChild(downloadLink)
        downloadLink.click()
        document.body.removeChild(downloadLink)
        
        // Limpiar URL
        URL.revokeObjectURL(downloadLink.href)
    }
}