import { LocalHostOptions } from "../../utils/LocalHostOptions.js"

/**
 * OptionsState scene for managing game settings and configurations.
 * @extends Phaser.Scene
 */
class OptionsState extends Phaser.Scene {
  /**
   * Creates an instance of OptionsState.
   * @constructor
   */
  constructor() {
    super({ key: "OptionsState" })
    this.currentSelected = 0
    this.options = []
    this.targetScrollY = 190
    this.scrollSpeed = 0.2
    this.descriptionText = null
    this.isKeyAssignMode = false
  }

  /**
   * Calculates the total height of all visible options.
   * @returns {number} The total height in pixels.
   */
  getContentHeight() {
    let totalHeight = 0
    this.options.forEach((option) => {
      if (!option.collapsed) {
        if (option.type === "title") {
          totalHeight += 45
        } else if (option.type === "subtitle") {
          totalHeight += 40
        } else {
          totalHeight += 35
        }
      }
    })
    return totalHeight
  }

  /**
   * Repositions all options based on their visibility and collapsed state.
   */
  repositionOptions() {
    let yPos = 0
    this.options.forEach((option) => {
      if (!this.isOptionHidden(option)) {
        option.text.setVisible(true)
        option.text.y = yPos

        if (option.valueText) {
          option.valueText.setVisible(true)
          option.valueText.y = yPos
        }

        if (option.type === "title" || option.type === "subtitle") {
          option.text.setTint(option.collapsed ? 0xffff00 : 0xffffff)
        }

        if (option.type === "title") {
          yPos += 45
        } else if (option.type === "subtitle") {
          yPos += 40
        } else {
          yPos += 35
        }
      } else {
        option.text.setVisible(false)
        if (option.valueText) {
          option.valueText.setVisible(false)
        }
      }
    })
  }

  /**
   * Checks if an option should be hidden based on its parent's collapsed state.
   * @param {Object} option - The option to check.
   * @returns {boolean} True if the option should be hidden, false otherwise.
   */
  isOptionHidden(option) {
    if (option.type === "title") {
      return false
    }

    if (option.type === "subtitle") {
      return option.parent.collapsed
    }

    if (option.type === "option") {
      return option.parent.collapsed || option.parent.parent.collapsed
    }

    return false
  }

  /**
   * Preloads assets for the options menu.
   */
  preload() {
    this.load.image("menuBG", "public/assets/images/menuDesat.png")
    this.load.atlasXML(
      "optionsMenu",
      "public/assets/images/states/MainMenuState/options/menu_options.png",
      "public/assets/images/states/MainMenuState/options/menu_options.xml"
    )
    this.load.audio("scrollSound", "public/assets/audio/sounds/scrollMenu.ogg")
    this.load.audio("checkboxChecked", "public/assets/audio/sounds/checkboxChecked.ogg")
    this.load.audio("checkboxUnchecked", "public/assets/audio/sounds/checkboxUnchecked.ogg")
    this.load.atlasXML(
      "checkboxThingie",
      "public/assets/images/states/OptionsState/checkboxThingie.png",
      "public/assets/images/states/OptionsState/checkboxThingie.xml"
    )
    this.load.json("optionsConfig", "source/utils/OptionsState.json")
  }

  /**
   * Formats a key name for display.
   * @param {string} key - The key name.
   * @param {string} code - The key code.
   * @returns {string} The formatted key name.
   */
  formatKeyName(key, code) {
    const specialKeys = {
      " ": "SPACE",
      ArrowUp: "UP",
      ArrowDown: "DOWN",
      ArrowLeft: "LEFT",
      ArrowRight: "RIGHT",
      Control: "CTRL",
      Alt: "ALT",
      Shift: "SHIFT",
      Tab: "TAB",
      CapsLock: "CAPS",
      Backspace: "BACKSPACE",
      Delete: "DELETE",
      Insert: "INSERT",
      Home: "HOME",
      End: "END",
      PageUp: "PAGEUP",
      PageDown: "PAGEDOWN",
      Enter: "ENTER",
      Meta: "META",
      ContextMenu: "MENU",
    }
    if (specialKeys[key]) return specialKeys[key]
    if (key && key.startsWith("F") && key.length <= 3) return key.toUpperCase()
    if (code && code.startsWith("Numpad")) return code.replace("Numpad", "NUM_")
    if (key && key.length === 1) return key.toUpperCase()
    return key ? key.toUpperCase() : ""
  }

  /**
   * Sets up input handlers using custom controls from localStorage.
   */
  setupInputs() {
    const getKeyFromStorage = (key, fallback) => {
      const value = localStorage.getItem(key)
      return value && value !== "null" && value !== "undefined" ? value : fallback
    }

    this.controls = {
      up: getKeyFromStorage('CONTROLS.UI.UP', 'UP'),
      down: getKeyFromStorage('CONTROLS.UI.DOWN', 'DOWN'),
      left: getKeyFromStorage('CONTROLS.UI.LEFT', 'LEFT'),
      right: getKeyFromStorage('CONTROLS.UI.RIGHT', 'RIGHT'),
      accept: getKeyFromStorage('CONTROLS.UI.ACCEPT', 'ENTER'),
      back: getKeyFromStorage('CONTROLS.UI.BACK', 'ESCAPE')
    }

    this.input.keyboard.removeAllListeners('keydown')
    this.input.keyboard.on('keydown', (event) => {
      if (this.isKeyAssignMode) return

      const pressed = this.formatKeyName(event.key, event.code)

      if (pressed === this.controls.up) {
        this.moveSelection(-1)
      } else if (pressed === this.controls.down) {
        this.moveSelection(1)
      } else if (pressed === this.controls.left) {
        this.handleNumberChange(-1)
      } else if (pressed === this.controls.right) {
        this.handleNumberChange(1)
      } else if (pressed === this.controls.accept) {
        this.toggleSection()
      } else if (pressed === this.controls.back || pressed === "BACKSPACE") {
        this.returnToMenu()
      }
    })
  }

  /**
   * Creates the options menu scene.
   */
  async create() {
    // Background and UI elements
    const blackRectOptions = this.add.graphics()
    const optionsX = 30
    const optionsY = 150
    const optionsW = this.cameras.main.width - 700
    const optionsH = this.cameras.main.height - 190
    const radius = 20
    blackRectOptions.fillStyle(0x000000, 0.5)
    blackRectOptions.fillRoundedRect(optionsX, optionsY, optionsW, optionsH, radius)
    blackRectOptions.setDepth(1)

    const blackRectPreview = this.add.graphics()
    const previewX = 660
    const previewY = 150
    const previewW = this.cameras.main.width - 700
    const previewH = this.cameras.main.height - 190
    blackRectPreview.fillStyle(0x000000, 0.5)
    blackRectPreview.fillRoundedRect(previewX, previewY, previewW, previewH, radius)
    blackRectPreview.setDepth(1)

    const navBar = this.add
      .rectangle(0, 0, this.cameras.main.width, 80, 0x000000)
      .setOrigin(0)
      .setAlpha(0.7)
      .setDepth(10)

    this.add
      .text(this.cameras.main.width / 2, 30, "OPTIONS", {
        fontFamily: "VCR",
        fontSize: "32px",
        color: "#FFFFFF",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(11)

    const bg = this.add.image(0, 0, "menuBG").setOrigin(0).setDepth(0)

    const optionsMenu = this.add.sprite(200, 35, "optionsMenu").setOrigin(0.5).setScale(0.5)

    if (!this.anims.exists("options-white")) {
      this.anims.create({
        key: "options-white",
        frames: this.anims.generateFrameNames("optionsMenu", {
          prefix: "options white",
          start: 0,
          end: 2,
          zeroPad: 4,
        }),
        frameRate: 14,
        repeat: -1,
      })
    }

    optionsMenu.play("options-white")
    optionsMenu.setDepth(4)

    this.descriptionText = this.add
      .text(660, 600, "", {
        fontFamily: "VCR",
        fontSize: "24px",
        color: "#FFFFFF",
        align: "center",
        wordWrap: { width: this.cameras.main.width - 700 - 40 },
      })
      .setOrigin(0)
      .setDepth(2)

    this.optionsContainer = this.add.container(30, 10)
    this.optionsContainer.setDepth(2)

    // Load configuration and apply saved values
    let config = this.cache.json.get("optionsConfig")
    config = await LocalHostOptions.loadOptionsToConfig(config)

    await this.createOptionsMenu(config)

    const optionsMask = this.add
      .graphics()
      .fillRect(30, 150, this.cameras.main.width - 700, this.cameras.main.height - 190)

    this.optionsContainer.setMask(new Phaser.Display.Masks.GeometryMask(this, optionsMask))

    this.currentSelected = 0
    this.updateSelection()
    this.scrollToSelected()

    // Setup input handlers
    this.setupInputs()

    // Animation setup for checkboxes
    if (!this.anims.exists("checkbox-static")) {
      this.anims.create({
        key: "checkbox-static",
        frames: this.anims.generateFrameNames("checkboxThingie", {
          prefix: "Check Box Selected Static",
          start: 0,
          end: 1,
          zeroPad: 4,
        }),
        frameRate: 12,
        repeat: -1,
      })

      this.anims.create({
        key: "checkbox-selecting",
        frames: this.anims.generateFrameNames("checkboxThingie", {
          prefix: "Check Box selecting animation",
          start: 0,
          end: 10,
          zeroPad: 4,
        }),
        frameRate: 24,
        repeat: 0,
      })

      this.anims.create({
        key: "checkbox-unselecting",
        frames: this.anims
          .generateFrameNames("checkboxThingie", {
            prefix: "Check Box selecting animation",
            start: 0,
            end: 10,
            zeroPad: 4,
          })
          .reverse(),
        frameRate: 24,
        repeat: 0,
      })
    }

    this.events.on("update", this.updateScroll, this)
  }

  /**
   * Creates the options menu structure from the configuration.
   * @param {Object} config - The configuration object.
   */
  async createOptionsMenu(config) {
    const sections = config.sections
    let yPos = 0

    sections.forEach((section) => {
      const title = this.add
        .text(50, yPos, section.title.toUpperCase(), {
          fontFamily: "FNF",
          fontSize: "38px",
          color: "#FFFFFF",
        })
        .setInteractive()
        .setAlpha(0.6)
        .setDepth(3)
        .setScale(1)

      title.on("pointerdown", () => {
        this.toggleSection(this.options.length)
      })

      this.optionsContainer.add(title)

      const titleObj = {
        text: title,
        type: "title",
        collapsed: false,
        children: [],
        description: section.description,
      }

      this.options.push(titleObj)
      yPos += 45

      if (!section.subsections) return

      section.subsections.forEach((subsection) => {
        const subtitle = this.add
          .text(80, yPos, subsection.title.toUpperCase(), {
            fontFamily: "FNF",
            fontSize: "32px",
            color: "#FFFFFF",
          })
          .setInteractive()
          .setAlpha(0.6)
          .setDepth(3)

        subtitle.on("pointerdown", () => {
          this.toggleSection(this.options.length)
        })

        this.optionsContainer.add(subtitle)

        const subtitleObj = {
          text: subtitle,
          type: "subtitle",
          collapsed: false,
          children: [],
          parent: titleObj,
          description: subsection.description,
        }

        titleObj.children.push(subtitleObj)
        this.options.push(subtitleObj)
        yPos += 40

        if (!subsection.options) return

        subsection.options.forEach((optionData) => {
          const path = `${section.title}.${subsection.title}.${optionData.name}`.toUpperCase()
          const value = optionData.value
          const currentValue = optionData.currentValue || 0

          const option = this.add
            .text(110, yPos, optionData.name.toUpperCase(), {
              fontFamily: "FNF",
              fontSize: "28px",
              color: "#FFFFFF",
            })
            .setAlpha(0.6)
            .setDepth(3)

          let valueDisplay

          if (optionData.type === "scene") {
            valueDisplay = this.add
              .text(570, yPos, ">", {
                fontFamily: "VCR",
                fontSize: "28px",
                color: "#FFFFFF",
                align: "right",
              })
              .setAlpha(0.6)
              .setScale(0.4)
              .setDepth(3)
              .setOrigin(1, 0)
          } else if (optionData.type === "boolean") {
            const checkbox = this.add
              .sprite(540, yPos + 15, "checkboxThingie")
              .setScale(0.3)
              .setDepth(3)
              .setOrigin(0.5, 0.5)

            this.updateCheckboxVisual(checkbox, value, yPos)

            valueDisplay = checkbox
          } else if (optionData.type === "static") {
            const values = optionData.value
            const valueText = values[currentValue]

            valueDisplay = this.add
              .text(570, yPos, valueText, {
                fontFamily: "VCR",
                fontSize: "28px",
                color: "#FFFFFF",
                align: "right",
              })
              .setAlpha(0.6)
              .setScale(0.4)
              .setDepth(3)
              .setOrigin(1, 0)
          } else {
            let valueText = ""
            if (optionData.type === "key") {
              valueText = value
            } else if (optionData.type === "number") {
              valueText = value.toFixed(2)
            }

            valueDisplay = this.add
              .text(570, yPos, valueText, {
                fontFamily: "VCR",
                fontSize: "28px",
                color: "#FFFFFF",
                align: "right",
              })
              .setAlpha(0.6)
              .setScale(0.4)
              .setDepth(3)
              .setOrigin(1, 0)
          }

          this.optionsContainer.add([option, valueDisplay])

          const optionObj = {
            text: option,
            valueText: valueDisplay,
            type: "option",
            parent: subtitleObj,
            description: optionData.description,
            value: value,
            currentValue: currentValue,
            valueType: optionData.type,
            min: optionData.min,
            max: optionData.max,
          }

          if (optionData.type === "boolean") {
            option.setInteractive()
            option.on("pointerdown", async () => {
              optionObj.value = !optionObj.value
              await LocalHostOptions.saveOption(path, optionObj.value, optionObj.valueType)
              this.sound.play(optionObj.value ? "checkboxChecked" : "checkboxUnchecked")

              this.updateCheckboxVisual(optionObj.valueText, optionObj.value, yPos)
            })
          }

          subtitleObj.children.push(optionObj)
          this.options.push(optionObj)
          yPos += 35
        })
      })
    })
  }

  /**
   * Updates the visual state of a checkbox.
   * @param {Phaser.GameObjects.Sprite} checkbox - The checkbox sprite.
   * @param {boolean} value - The checkbox value.
   * @param {number} yPos - The y-position of the checkbox.
   */
  updateCheckboxVisual(checkbox, value, yPos) {
    if (value) {
      checkbox.play("checkbox-static")
      checkbox.y = yPos + 15
    } else {
      checkbox.setFrame("Check Box unselected0000")
      checkbox.y = yPos + 17
    }
  }

  /**
   * Moves the selection in the specified direction.
   * @param {number} direction - The direction to move (-1 for up, 1 for down).
   */
  moveSelection(direction) {
    let nextIndex = this.currentSelected

    do {
      nextIndex += direction

      if (nextIndex < 0 || nextIndex >= this.options.length) {
        return
      }

      if (
        !this.isOptionHidden(this.options[nextIndex]) &&
        (this.options[nextIndex].type === "title" || !this.options[nextIndex].parent?.collapsed)
      ) {
        this.currentSelected = nextIndex
        this.updateSelection()
        this.scrollToSelected()
        this.sound.play("scrollSound")
        break
      }
    } while (nextIndex >= 0 && nextIndex < this.options.length)
  }

  /**
   * Scrolls the menu to center the currently selected option.
   */
  scrollToSelected() {
    const selectedOption = this.options[this.currentSelected]
    const selectedY = selectedOption.text.y
    const containerHeight = this.cameras.main.height - 213

    const centerY = containerHeight / 2
    this.targetScrollY = 190 - selectedY + centerY - 20

    this.targetScrollY = Phaser.Math.Clamp(this.targetScrollY, -this.getContentHeight() + containerHeight + 190, 190)
  }

  /**
   * Updates the scroll position smoothly.
   */
  updateScroll() {
    const currentY = this.optionsContainer.y
    const diff = this.targetScrollY - currentY

    if (Math.abs(diff) > 0.1) {
      this.optionsContainer.y += diff * this.scrollSpeed
    }
  }

  /**
   * Toggles the collapsed state of the current section or performs an action on the current option.
   */
  async toggleSection() {
    const currentOption = this.options[this.currentSelected]

    if (currentOption.type === "option") {
      const path = `${currentOption.parent.parent.text.text}.${currentOption.parent.text.text}.${currentOption.text.text}`

      if (currentOption.valueType === "static") {
        const values = currentOption.value
        currentOption.currentValue = (currentOption.currentValue + 1) % values.length
        currentOption.valueText.setText(values[currentOption.currentValue])

        await LocalHostOptions.saveOption(path, currentOption.currentValue, currentOption.valueType)
        this.sound.play("scrollSound")
      } else if (currentOption.valueType === "boolean") {
        currentOption.value = !currentOption.value
        const checkbox = currentOption.valueText

        await LocalHostOptions.saveOption(path, currentOption.value, currentOption.valueType)

        if (currentOption.value) {
          checkbox.play("checkbox-selecting").once("animationcomplete", () => {
            checkbox.play("checkbox-static")
          })
          this.sound.play("checkboxChecked")
        } else {
          checkbox.play("checkbox-unselecting").once("animationcomplete", () => {
            checkbox.setFrame("Check Box unselected0000")
            checkbox.y = currentOption.text.y + 17
          })
          this.sound.play("checkboxUnchecked")
        }
      } else if (currentOption.valueType === "key") {
        this.showKeyAssignOverlay(currentOption, path)
        return
      }

      this.updateDescription(currentOption)
    } else if (currentOption.type === "title") {
      currentOption.collapsed = !currentOption.collapsed
      currentOption.text.setTint(currentOption.collapsed ? 0xffff00 : 0xffffff)

      currentOption.children.forEach((subtitleObj) => {
        subtitleObj.collapsed = currentOption.collapsed
        subtitleObj.text.setTint(currentOption.collapsed ? 0xffff00 : 0xffffff)
        subtitleObj.children.forEach((optionObj) => {
          optionObj.collapsed = currentOption.collapsed
        })
      })
    } else if (currentOption.type === "subtitle") {
      currentOption.collapsed = !currentOption.collapsed
      currentOption.text.setTint(currentOption.collapsed ? 0xffff00 : 0xffffff)

      currentOption.children.forEach((optionObj) => {
        optionObj.collapsed = currentOption.collapsed
      })
    }

    this.repositionOptions()
  }

  /**
   * Shows an overlay for assigning a new key to an option.
   * @param {Object} option - The option to assign the key to.
   * @param {string} path - The path for saving the option.
   */
  showKeyAssignOverlay(option, path) {
    this.isKeyAssignMode = true

    this.tweens.add({
      targets: [this.optionsContainer, this.descriptionText],
      alpha: 0.3,
      duration: 200,
      ease: "Power2",
    })

    const overlayWidth = 600
    const overlayHeight = 250
    const centerX = this.cameras.main.width / 2
    const centerY = this.cameras.main.height / 2

    const overlay = this.add
      .rectangle(centerX, centerY, overlayWidth, overlayHeight, 0x000000)
      .setAlpha(0.85)
      .setDepth(1000)
      .setStrokeStyle(2, 0xffffff, 0.8)

    const currentKeyLabel = this.add
      .text(centerX, centerY - 80, "Current Key:", {
        fontFamily: "VCR",
        fontSize: "28px",
        color: "#FFFFFF",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(1001)

    const currentKeyValue = this.add
      .text(centerX, centerY - 30, option.value, {
        fontFamily: "VCR",
        fontSize: "54px",
        color: "#FFD700",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(1001)

    const assignText = this.add
      .text(centerX, centerY + 70, `Press any key to assign to: ${option.text.text}`, {
        fontFamily: "VCR",
        fontSize: "20px",
        color: "#FFFFFF",
        align: "center",
        wordWrap: { width: overlayWidth - 40 },
      })
      .setOrigin(0.5)
      .setDepth(1001)

    let firstKey = true

    const closeOverlay = () => {
      this.isKeyAssignMode = false
      overlay.destroy()
      currentKeyLabel.destroy()
      currentKeyValue.destroy()
      assignText.destroy()
      this.tweens.add({
        targets: [this.optionsContainer, this.descriptionText],
        alpha: 1,
        duration: 200,
        ease: "Power2",
      })
      this.updateDescription(option)
    }

    const keyHandler = async (event) => {
      if (firstKey) {
        firstKey = false
        if (event.key === "Enter") return
      }

      if (event.key === "Escape") {
        this.input.keyboard.off("keydown", keyHandler)
        closeOverlay()
        return
      }

      const newKey = this.formatKeyName(event.key, event.code)
      option.value = newKey
      option.valueText.setText(newKey)
      currentKeyValue.setText(newKey)

      try {
        await LocalHostOptions.saveOption(path, newKey, "key")
        this.sound.play("scrollSound")
        this.time.delayedCall(300, () => {
          this.input.keyboard.off("keydown", keyHandler)
          closeOverlay()
        })
      } catch (error) {
        this.input.keyboard.off("keydown", keyHandler)
        closeOverlay()
      }
    }

    this.input.keyboard.on("keydown", keyHandler)
  }

  /**
   * Updates the visual state of all options based on the current selection.
   */
  updateSelection() {
    if (this.options.length > 0) {
      this.options.forEach((option, index) => {
        if (index === this.currentSelected) {
          option.text.setAlpha(1)
          if (option.valueText) {
            option.valueText.setAlpha(1)
            if (option.valueType !== "boolean") {
              this.tweens.add({
                targets: option.valueText,
                scale: 0.7,
                duration: 150,
                ease: "Back.Out",
              })
            }
          }
          this.tweens.add({
            targets: option.text,
            scale: 1.1,
            duration: 150,
            ease: "Back.Out",
          })
          this.updateDescription(option)
          this.sound.play("scrollSound", { volume: 0.1 })
        } else {
          option.text.setAlpha(0.6)
          if (option.valueText) {
            option.valueText.setAlpha(0.6)
            if (option.valueType !== "boolean") {
              this.tweens.add({
                targets: option.valueText,
                scale: 0.4,
                duration: 150,
                ease: "Quad.Out",
              })
            }
          }
          this.tweens.add({
            targets: option.text,
            scale: 1,
            duration: 150,
            ease: "Quad.Out",
          })
        }
      })
    }
  }

  /**
   * Updates the description text for the currently selected option.
   * @param {Object} option - The option to display the description for.
   */
  updateDescription(option) {
    if (this.descriptionText && option) {
      let description = option.description || ""

      if (option.type === "option") {
        if (option.valueType === "scene") {
          description += "\nPress ENTER to access"
        } else if (option.valueType === "static") {
          description += `\nCurrent: ${option.value[option.currentValue]}`
        } else if (option.valueType === "key") {
          description += `\nCurrent: ${option.value}\nPress ENTER to change key`
        } else if (option.valueType === "boolean") {
          description += `\nCurrent: ${option.value ? "On" : "Off"}`
        } else if (option.valueType === "number") {
          description += `\nCurrent: ${option.value.toFixed(2)}`
        }
      }

      this.descriptionText.setText(description)
      const containerWidth = this.cameras.main.width - 700
      const containerHeight = this.cameras.main.height - 627
      const textBounds = this.descriptionText.getBounds()

      this.descriptionText.setPosition(
        660 + (containerWidth - textBounds.width) / 2,
        600 + (containerHeight - textBounds.height) / 2
      )
    }
  }

  /**
   * Handles changing a numeric option value.
   * @param {number} direction - The direction to change the value (-1 for decrease, 1 for increase).
   */
  handleNumberChange(direction) {
    const currentOption = this.options[this.currentSelected]

    if (currentOption.type === "option" && currentOption.valueType === "number") {
      const path = `${currentOption.parent.parent.text.text}.${currentOption.parent.text.text}.${currentOption.text.text}`
      const step = 0.1
      const newValue = Phaser.Math.Clamp(
        currentOption.value + direction * step,
        currentOption.min || 0,
        currentOption.max || 10
      )

      currentOption.value = Math.round(newValue * 100) / 100
      currentOption.valueText.setText(currentOption.value.toFixed(2))

      LocalHostOptions.saveOption(path, currentOption.value, currentOption.valueType)
      this.sound.play("scrollSound")

      this.updateDescription(currentOption)
    }
  }

  /**
   * Returns to the main menu.
   */
  returnToMenu() {
    this.saveAllOptions().then(() => {
      this.input.keyboard.removeAllListeners()
      this.events.off("update", this.updateScroll, this)
      this.scene.start("MainMenuState")
    })
  }

  /**
   * Saves all options to localStorage.
   * @returns {Promise} A promise that resolves when all options are saved.
   */
  async saveAllOptions() {
    const savePromises = []

    this.options.forEach((option) => {
      if (option.type === "option") {
        const path = `${option.parent.parent.text.text}.${option.parent.text.text}.${option.text.text}`
        let value = option.value

        if (option.valueType === "static") {
          value = option.currentValue
        }

        savePromises.push(LocalHostOptions.saveOption(path, value, option.valueType, true))
      }
    })

    await Promise.all(savePromises)
  }

  /**
   * Cleans up the scene when shutting down.
   */
  shutdown() {
    this.textures.remove("menuBG")
    this.textures.remove("optionsMenu")
    this.anims.remove("options-white")
    this.input.keyboard.removeAllListeners()
    this.events.off("update", this.updateScroll, this)

    this.options = []
    this.targetScrollY = 190
    this.currentSelected = 0

    if (this.optionsContainer) {
      this.optionsContainer.removeAll(true)
      this.optionsContainer.destroy(true)
      this.optionsContainer = null
    }

    if (this.descriptionText) {
      this.descriptionText.destroy()
      this.descriptionText = null
    }
  }
}


game.scene.add("OptionsState", OptionsState)