import ImageLoader from "./AddElement/ImageLoader.js"
import SpritesheetLoader from "./AddElement/SpritesheetLoader.js"

export default class AddElement {
  constructor(scene) {
    this.scene = scene
    this.imageLoader = new ImageLoader(scene)
    this.spritesheetLoader = new SpritesheetLoader(scene)
  }

  add() {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".png,.xml"
    input.multiple = true
    input.style.display = "none"

    input.onchange = async (e) => {
      const files = Array.from(e.target.files)

      const pngFile = files.find((f) => f.name.toLowerCase().endsWith(".png"))
      const xmlFile = files.find((f) => f.name.toLowerCase().endsWith(".xml"))

      if (!pngFile) {
        alert("Por favor selecciona al menos un archivo PNG")
        return
      }

      if (xmlFile) {
        await this.spritesheetLoader.loadSpritesheet(pngFile, xmlFile)
      } else {
        await this.imageLoader.loadAndCreateImage(pngFile)
      }
    }

    input.click()
  }

  handleImageSelection() {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".png, .jpg, .jpeg"
    input.onchange = (e) => {
      const file = e.target.files[0]
      if (file) {
        this.imageLoader.loadAndCreateImage(file)
      }
    }
    input.click()
  }

  handleSpriteSelection() {
    const fileInput = document.createElement("input")
    fileInput.type = "file"
    fileInput.accept = ".png,.xml"
    fileInput.multiple = true
    fileInput.style.display = "none"

    document.body.appendChild(fileInput)

    fileInput.onchange = async (event) => {
      const files = event.target.files

      if (files.length !== 2) {
        alert("Please select one PNG file and one XML file together.")
        document.body.removeChild(fileInput)
        return
      }

      let pngFile = null
      let xmlFile = null

      Array.from(files).forEach((file) => {
        if (file.name.toLowerCase().endsWith(".png")) {
          pngFile = file
        } else if (file.name.toLowerCase().endsWith(".xml")) {
          xmlFile = file
        }
      })

      if (pngFile && xmlFile) {
        await this.spritesheetLoader.loadSpritesheet(pngFile, xmlFile)
      } else {
        alert("Invalid selection. You must select one .png file and one .xml file.")
      }

      document.body.removeChild(fileInput)
    }

    fileInput.click()
  }
}
