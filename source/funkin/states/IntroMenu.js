import Alphabet from "../../utils/Alphabet.js";

class IntroMenu extends Phaser.Scene {
  constructor() {
    super({ key: "IntroMenu" })
    this.music = null
    this.randomTextPairs = []
  }

  preload() {
    this.load.audio("introMusic", "public/assets/audio/sounds/FreakyMenu.mp3")
    this.load.image("newgrounds", "public/assets/images/UI/newgrounds.svg")
    this.load.text("introRandomText", "public/assets/data/introRandomText.txt")

    // Load the atlas using the correct format
    this.load.atlas("bold", "public/assets/images/UI/bold.png", "public/assets/images/UI/bold.json")
  }

create() {
    console.log("IntroMenu loaded successfully")
    const bpmTime = Math.floor((60 / 102) * 1235)

    // Android support
    if (this.game.device.os.android) {
      this.input.on("pointerdown", () => {
        if (!this.sceneEnded) {
          this.sceneEnded = true
          this.scene.get("FlashEffect").startTransition("GfDanceState")
        }
      })

      if (window.AndroidSupport) {
        window.AndroidSupport.initialize(this)
      }
    }

    // Process text file
    const textFile = this.cache.text.get("introRandomText")
    this.randomTextPairs = textFile
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line) => {
        const parts = line.split("--").map((part) => part.trim().toUpperCase())
        return parts.length >= 2 ? parts : [parts[0], ""]
      })

    // Steps with uppercase text
    const steps = [
      { text: "GENESIS ENGINE MADE", wait: 1 },
      { text: "BY BRITEX", wait: 1.5 },
      { clear: true, wait: 1.6 },
      { text: "NOT ASSOCIATED WITH ", wait: 1.3 },
      { text: "NEWGROUNDS", image: "newgrounds", wait: 1.3 },
      { clear: true, wait: 0.6 },
      { randomPart: 0, wait: 1 },
      { randomPart: 1, wait: 1 },
      { clear: true, wait: 0.1 },
      { text: "FRIDAY", wait: 1 },
      { text: "NIGHT", wait: 1 },
      { text: "FUNKIN", wait: 0.5 },
    ]

    let index = 0
    this.music = this.sound.add("introMusic", { loop: true })
    this.music.play()

    this.texts = []
    this.imageObj = null
    const startY = 300
    const lineSpacing = 50
    this.currentYOffset = 0
    this.sceneEnded = false
    this.currentRandomPair = null

    const processStep = () => {
      if (this.sceneEnded) return

      if (index >= steps.length) {
        this.time.delayedCall(190, () => {
          this.scene.get("FlashEffect").startTransition("GfDanceState")
        })
        return
      }

      const step = steps[index]

      if (step.clear) {
        this.texts.forEach((t) => t.destroy())
        this.texts = []
        if (this.imageObj) {
          this.imageObj.destroy()
          this.imageObj = null
        }
        this.currentYOffset = 0
      }

      if (step.text) {
        const text = new Alphabet(this, 40, 0, step.text, true, 0.8)
        // Ajustamos la posición X para centrar el texto completo
        text.x = (this.game.config.width + 100) / 2 - text.width / 2
        text.y = startY + this.currentYOffset
        this.add.existing(text)
        this.texts.push(text)
        this.currentYOffset += lineSpacing
      } else if (step.randomPart !== undefined) {
        if (step.randomPart === 0 || !this.currentRandomPair) {
          this.currentRandomPair = this.getRandomTextPair()
        }

        if (this.currentRandomPair && this.currentRandomPair[step.randomPart]) {
          const text = new Alphabet(
            this,
            0,
            0,
            this.currentRandomPair[step.randomPart],
            true,
            0.8,
          )
          // Ajustamos la posición X para centrar el texto completo
          text.x = this.game.config.width / 2 - text.width / 2
          text.y = startY + this.currentYOffset
          this.add.existing(text)
          this.texts.push(text)
          this.currentYOffset += lineSpacing
        }
      }

      if (step.image) {
        if (this.imageObj) this.imageObj.destroy()
        this.imageObj = this.add.image(
          this.game.config.width / 2,
          startY + this.currentYOffset + 80,
          step.image
        ).setOrigin(0.5, 0.5).setScale(1)
        this.currentYOffset += 100
      }

      index++
      this.time.delayedCall(step.wait * bpmTime, processStep)
    }

    processStep()

    this.input.keyboard.on("keydown-ENTER", () => {
      if (!this.sceneEnded) {
        this.sceneEnded = true
        this.scene.get("FlashEffect").startTransition("GfDanceState")
      }
    })
  }

  getRandomTextPair() {
    if (this.randomTextPairs.length === 0) return ["PART 1", "PART 2"]
    const randomIndex = Math.floor(Math.random() * this.randomTextPairs.length)
    return this.randomTextPairs[randomIndex]
  }

  shutdown() {
    if (this.music) {
      this.music.stop()
      this.music.destroy()
    }
    this.texts.forEach((t) => t.destroy())
    if (this.imageObj) this.imageObj.destroy()
    this.input.keyboard.off("keydown-ENTER")
  }
}

game.scene.add("IntroMenu", IntroMenu);