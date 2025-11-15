export default class CharacterLoader {
  constructor(scene) {
    this.scene = scene
  }

  async loadCustomCharacter(selectedElement, testCharText, onSuccess) {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"
    input.style.display = "none"
    document.body.appendChild(input)

    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) return

      try {
        const jsonContent = await this.readFileAsText(file)
        const characterData = JSON.parse(jsonContent)
        const characterId = file.name.replace(".json", "")

        const charactersModule = this.scene.moduleRegistry.get("Characters")
        if (!charactersModule) return

        const currentX = selectedElement.x
        const currentY = selectedElement.y
        const currentScale = selectedElement.scaleX
        const currentAlpha = selectedElement.alpha
        const currentScrollFactor = selectedElement.getData("scrollFactor") || 1
        const currentDepth = selectedElement.depth

        const tempChar = await charactersModule.createCharacter(characterId, false)

        if (tempChar && tempChar.sprite) {
          selectedElement.destroy()

          tempChar.sprite.setPosition(currentX, currentY)
          tempChar.sprite.setScale(currentScale)
          tempChar.sprite.setAlpha(currentAlpha)
          tempChar.sprite.setScrollFactor(currentScrollFactor)
          tempChar.sprite.setData("scrollFactor", currentScrollFactor)
          tempChar.sprite.setDepth(currentDepth)

          if (!charactersModule.loadedCharacters.has(characterId)) {
            charactersModule.loadedCharacters.set(characterId, tempChar)
          }

          const elementsModule = this.scene.moduleRegistry.get("Elements")
          if (elementsModule) {
            elementsModule.addElement(tempChar.sprite)
            elementsModule.selectElement(tempChar.sprite)
          }

          testCharText.setText(characterId)

          const layersPanel = this.scene.moduleRegistry.get("LayersPanel")
          if (layersPanel) {
            layersPanel.refreshLayersList()
          }

          if (onSuccess) {
            onSuccess(tempChar.sprite)
          }
        }
      } catch (error) {
        console.error("Error loading character:", error)
      } finally {
        document.body.removeChild(input)
      }
    }

    input.click()
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
