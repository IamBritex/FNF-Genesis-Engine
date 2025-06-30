import { ModManager } from "../../utils/ModDetect.js"
import { NumberAnimation } from "../../utils/NumberAnimation.js"

class FreeplayState extends Phaser.Scene {
  constructor() {
    super({ key: "FreeplayState" })
    this._initProperties()
  }

  _initProperties() {
    this.songList = []
    this.selectedIndex = 0
    this.selectedDifficulty = 1
    this.difficulties = ["easy", "normal", "hard"]
    this.bg = null
    this.textContainer = null
    this.difficultyContainer = null
    this.songTexts = null
    this.scrollSound = null
    this.confirmSound = null
    this.cancelSound = null
    this.scrollTween = null
    this.scoreAnimator = null
    this.accuracyAnimator = null
    this.missesAnimator = null
  }

  init(data) {
    this._initProperties()
    if (data?.selectedIndex !== undefined) {
      this.selectedIndex = data.selectedIndex
    }
    if (data?.selectedDifficulty !== undefined) {
      this.selectedDifficulty = this.difficulties.indexOf(data.selectedDifficulty)
    }
  }

  preload() {
    this.load.image("menuBGMagenta", "public/assets/images/menuBGMagenta.png")
    this.load.audio("scrollMenu", "public/assets/audio/sounds/scrollMenu.ogg")
    this.load.audio("confirmMenu", "public/assets/audio/sounds/confirmMenu.ogg")
    this.load.audio("cancelMenu", "public/assets/audio/sounds/cancelMenu.ogg")
    this.load.text("weekList", "public/assets/data/weekList.txt")
  }

  async create() {
    const { width, height } = this.scale
    this.setupBackground(width, height)
    this.setupSounds()
    if (this.songList.length === 0) {
      await this.loadWeekData()
    }
    await this.setupUI(width, height)
    this.selectedIndex = 0
    this.updateScroll(true)
    this.updateSelection()
    this.setupInputs()
    this.cameras.main.setVisible(true)
    this.cameras.main.fadeIn(500)
  }

  setupBackground(width, height) {
    this.bg = this.add
      .image(width / 2, height / 2, "menuBGMagenta")
      .setOrigin(0.5)
      .setScale(1.1)
      .setDepth(-1)
  }

  setupSounds() {
    this.scrollSound = this.sound.add("scrollMenu")
    this.confirmSound = this.sound.add("confirmMenu")
    this.cancelSound = this.sound.add("cancelMenu")
  }

  async loadWeekData() {
    try {
      const allSongs = []
      const baseWeekList = this.cache.text
        .get("weekList")
        .trim()
        .split("\n")
        .filter((week) => week.trim())

      for (const week of baseWeekList) {
        try {
          const response = await fetch(`public/assets/data/weekList/${week}.json`)
          if (response.ok) {
            const weekData = await response.json()
            if (weekData.tracks) {
              weekData.tracks.flat().forEach((song) => {
                allSongs.push({
                  name: song,
                  weekName: weekData.weekName,
                  color: weekData.color || "#FFFFFF",
                  isMod: false,
                  modPath: null,
                })
              })
            }
          }
        } catch (error) {
          console.warn(`Error loading base week ${week}:`, error)
        }
      }

      if (ModManager.isModActive()) {
        const modWeeks = ModManager.getModWeekList()
        for (const weekData of modWeeks) {
          try {
            const response = await fetch(`${weekData.modPath}/data/weekList/${weekData.week}.json`)
            if (response.ok) {
              const weekJson = await response.json()
              if (weekJson.tracks) {
                weekJson.tracks.flat().forEach((song) => {
                  allSongs.push({
                    name: song,
                    weekName: weekJson.weekName,
                    color: weekJson.color || "#FFFFFF",
                    isMod: true,
                    modPath: weekData.modPath,
                    modName: weekData.modName,
                  })
                })
              }
            }
          } catch (error) {
            console.warn(`Error loading mod week ${weekData.week}:`, error)
          }
        }
      }

      this.songList = allSongs
      if (this.songList.length === 0) {
        console.warn("No se encontraron canciones para cargar")
      } else {
        console.log(`Se cargaron ${this.songList.length} canciones en total`)
      }
    } catch (error) {
      console.error("Error cargando weekData:", error)
      throw error
    }
  }

  async setupUI(width, _height) {
    if (this.textContainer) this.textContainer.destroy()
    if (this.difficultyContainer) this.difficultyContainer.destroy()

    this.textContainer = this.add.container(80, 0)
    const songSpacing = 122

    // Cargar iconos de enemigos antes de crear los textos
    await Promise.all(
      this.songList.map(async (song) => {
        let iconName = "face"
        let iconPath = null
        let isMod = false
        let modPath = null

        try {
          let chartPath = song.isMod
            ? `${song.modPath}/audio/songs/${song.name}/charts/${song.name}.json`
            : `public/assets/audio/songs/${song.name}/charts/${song.name}.json`
          let response = await fetch(chartPath)
          if (!response.ok) {
            chartPath = song.isMod
              ? `${song.modPath}/audio/songs/${song.name}/charts/${song.name}.json`
              : `public/assets/audio/songs/${song.name}/charts/${song.name}.json`
            response = await fetch(chartPath)
          }
          if (response.ok) {
            const chartData = await response.json()
            if (chartData.song && chartData.song.player2) {
              iconName = chartData.song.player2
              isMod = song.isMod
              modPath = song.modPath
            }
          }
        } catch (e) {
          iconName = "face"
        }

        // Intentar cargar icono desde mod, luego base, luego default
        let foundIcon = false
        let iconSources = []
        if (isMod && modPath) iconSources.push(`${modPath}/images/characters/icons/${iconName}.png`)
        iconSources.push(`public/assets/images/characters/icons/${iconName}.png`)
        iconSources.push(`public/assets/images/characters/icons/face.png`)

        let iconSrc = iconSources[0]
        let realWidth = 0, realHeight = 0
        for (let src of iconSources) {
          try {
            const img = new window.Image()
            img.src = src
            await new Promise((resolve) => {
              img.onload = () => {
                realWidth = img.width
                realHeight = img.height
                foundIcon = realWidth >= 2 && realHeight >= 2
                resolve()
              }
              img.onerror = () => resolve()
            })
            if (foundIcon) {
              iconSrc = src
              break
            }
          } catch (e) {}
        }

        let frameWidth = 158,
          frameHeight = 158,
          frameCount = 1
        if (realWidth >= realHeight * 2 && realHeight > 0) {
          frameWidth = Math.floor(realWidth / 2)
          frameHeight = realHeight
          frameCount = 2
        } else if (realWidth > 0 && realHeight > 0) {
          frameWidth = Math.min(realWidth, realHeight)
          frameHeight = frameWidth
          frameCount = 1
        }

        const iconKey = `icon-${iconName}-${song.isMod ? song.modName || "mod" : "base"}`
        if (!this.textures.exists(iconKey)) {
          await new Promise((resolve) => {
            this.load.spritesheet(iconKey, iconSrc, { frameWidth, frameHeight, endFrame: frameCount - 1 })
            this.load.once("complete", resolve)
            this.load.start()
          })
        }

        song._enemyIconKey = iconKey
      }),
    )

    // Crear los textos y los iconos
    this.songTexts = this.songList.map((song, index) => {
      const songContainer = this.add.container(0, index * songSpacing)
      const songText = this.createText(0, 0, song.name.toUpperCase(), {
        fontSize: "48px",
        color: "#FFFFFF",
      }).setOrigin(0, 0.5)
      songContainer.add(songText)

      let iconSprite = null
      if (song._enemyIconKey && this.textures.exists(song._enemyIconKey)) {
        iconSprite = this.add
          .sprite(0, 0, song._enemyIconKey, 0)
          .setOrigin(0, 0.5)
        // BPM FIJO
        iconSprite._bpm = 120
        iconSprite._lastBeat = 0
        iconSprite._baseScale = 0.9
        iconSprite.setScale(iconSprite._baseScale)
        songContainer.add(iconSprite)
      }

      songContainer._songText = songText
      songContainer._iconSprite = iconSprite

      this.textContainer.add(songContainer)
      return songContainer
    })

    this.difficultyContainer = this.add.container(width - 250, 170)
    this.updateDifficultyText()
  }

  createText(x, y, text, style = {}) {
    return this.add.text(x, y, text, {
      fontFamily: "FNF",
      fontSize: "32px",
      color: "#FFFFFF",
      ...style,
    })
  }

  updateDifficultyText() {
    if (!this.difficultyContainer) return
    this.difficultyContainer.removeAll(true)

    const difficulty = this.difficulties[this.selectedDifficulty]
    const selectedSong = this.songList[this.selectedIndex]
    const savedData = this.loadSongScore(selectedSong.name, difficulty)
    const diffText = this.createText(0, 0, `DIFFICULTY: \n${difficulty.toUpperCase()}`).setOrigin(0.5)

    if (savedData) {
      const scoreContainer = this.add.container(-100, 50)
      const scoreLabel = this.createText(0, 0, "SCORE: ").setOrigin(0, 0.5)
      const scoreValue = this.createText(scoreLabel.width, 0, "0").setOrigin(0, 0.5)
      const accuracyLabel = this.createText(0, 30, "ACCURACY: ").setOrigin(0, 0.5)
      const accuracyValue = this.createText(accuracyLabel.width, 30, "0%").setOrigin(0, 0.5)
      const missesLabel = this.createText(0, 60, "MISSES: ").setOrigin(0, 0.5)
      const missesValue = this.createText(missesLabel.width, 60, "0").setOrigin(0, 0.5)
      scoreContainer.add([scoreLabel, scoreValue, accuracyLabel, accuracyValue, missesLabel, missesValue])

      if (this.scoreAnimator) this.scoreAnimator.destroy()
      if (this.accuracyAnimator) this.accuracyAnimator.destroy()
      if (this.missesAnimator) this.missesAnimator.destroy()

      this.scoreAnimator = new NumberAnimation(this, scoreValue)
      this.accuracyAnimator = new NumberAnimation(this, accuracyValue)
      this.missesAnimator = new NumberAnimation(this, missesValue)

      try {
        this.scoreAnimator.animateNumber(0, savedData.score)
        this.accuracyAnimator.animateNumber(0, savedData.accuracy * 100, "", "%", 800)
        this.missesAnimator.animateNumber(0, savedData.misses, "", "", 600)
      } catch (error) {
        console.warn("Error starting number animations:", error)
      }

      this.difficultyContainer.add([diffText, scoreContainer])
    } else {
      this.difficultyContainer.add(diffText)
    }
  }

  loadSongScore(songName, difficulty) {
    const songKey = `score_${songName}_${difficulty}`
    const savedData = localStorage.getItem(songKey)
    return savedData ? JSON.parse(savedData) : null
  }

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

  setupInputs() {
    this.input.keyboard.removeAllListeners("keydown")
    const getKeyFromStorage = (key, fallback) => {
      const value = localStorage.getItem(key)
      return value && value !== "null" && value !== "undefined" ? value : fallback
    }
    const controls = {
      up: getKeyFromStorage("CONTROLS.UI.UP", "UP"),
      down: getKeyFromStorage("CONTROLS.UI.DOWN", "DOWN"),
      left: getKeyFromStorage("CONTROLS.UI.LEFT", "LEFT"),
      right: getKeyFromStorage("CONTROLS.UI.RIGHT", "RIGHT"),
      accept: getKeyFromStorage("CONTROLS.UI.ACCEPT", "ENTER"),
      back: getKeyFromStorage("CONTROLS.UI.BACK", "ESCAPE"),
    }

    this.input.keyboard.on("keydown", (event) => {
      const pressed = this.formatKeyName(event.key, event.code)
      if (pressed === controls.up) {
        this.changeSelection(-1)
      } else if (pressed === controls.down) {
        this.changeSelection(1)
      } else if (pressed === controls.left) {
        this.changeDifficulty(-1)
      } else if (pressed === controls.right) {
        this.changeDifficulty(1)
      } else if (pressed === controls.accept) {
        if (this.confirmSound) this.confirmSound.play()
        this.selectSong()
      } else if (pressed === controls.back || pressed === "BACKSPACE") {
        if (this.cancelSound) this.cancelSound.play()
        this.scene.start("MainMenuState")
      }
    })

    // Wheel scroll
    this.input.on("wheel", (_pointer, _gameObjects, _dx, dy) => {
      if (dy < 0) this.changeSelection(-1)
      else if (dy > 0) this.changeSelection(1)
    })
  }

  changeDifficulty(change) {
    if (this.scrollSound) this.scrollSound.play()
    this.selectedDifficulty = Phaser.Math.Wrap(this.selectedDifficulty + change, 0, this.difficulties.length)
    this.updateDifficultyText()
  }

  changeSelection(change) {
    if (this.scrollSound) this.scrollSound.play()
    this.selectedIndex = Phaser.Math.Wrap(this.selectedIndex + change, 0, this.songList.length)
    this.updateSelection()
    this.updateScroll()
    this.updateDifficultyText()
  }

  updateScroll(immediate = false) {
    if (!this.textContainer) return
    const songSpacing = 122
    const cameraHeight = this.cameras.main.height
    const centerY = cameraHeight / 2
    const selectedSongY = this.selectedIndex * songSpacing
    let targetY = centerY - selectedSongY
    const totalHeight = this.songList.length * songSpacing
    const minY = Math.min(0, cameraHeight - totalHeight)
    const maxY = 0
    if (totalHeight > cameraHeight) {
      targetY = Phaser.Math.Clamp(targetY, minY, maxY)
    }
    if (this.scrollTween) this.scrollTween.stop()
    this.scrollTween = this.tweens.add({
      targets: this.textContainer,
      y: targetY,
      duration: immediate ? 200 : 400,
      ease: "Cubic.out",
    })
  }

  updateSelection() {
    if (!this.songTexts) return
    this.songTexts.forEach((container, index) => {
      const songText = container._songText || container.list[0]
      const iconSprite = container._iconSprite
      if (!songText) return
      const isSelected = index === this.selectedIndex

      // Tween para el texto
      this.tweens.add({
        targets: songText,
        scale: isSelected ? 1.2 : 1,
        duration: 120,
        ease: "Cubic.easeOut"
      })
      songText.setColor("#FFFFFF")
      songText.setStyle({ fontSize: isSelected ? "48px" : "42px" })
      songText.setAlpha(isSelected ? 1 : 0.6)

      // Tween para el icono y reposicionamiento dinámico
      if (iconSprite) {
        this.tweens.add({
          targets: iconSprite,
          scale: isSelected ? 1.2 : 1,
          duration: 120,
          ease: "Cubic.easeOut"
        })
        iconSprite.setAlpha(isSelected ? 1 : 0.6)
        // Ajustar tamaño del icono para que coincida con el texto
        const textHeight = songText.height * songText.scaleY
        iconSprite.displayHeight = textHeight
        iconSprite.displayWidth = textHeight
        // Reposicionar icono justo al final del texto (más a la derecha si está seleccionado)
        this.time.delayedCall(0, () => {
          iconSprite.x = songText.x + songText.width * songText.scaleX + (isSelected ? 48 : 8)
        })
      }
    })
  }

  selectSong() {
    const selectedSong = this.songList[this.selectedIndex]
    if (!selectedSong) return
    const songData = {
      storyPlaylist: [selectedSong.name],
      songList: [selectedSong.name],
      currentSongIndex: 0,
      storyDifficulty: this.difficulties[this.selectedDifficulty],
      isStoryMode: false,
      weekName: selectedSong.weekName,
      selectedDifficulty: this.difficulties[this.selectedDifficulty],
      isMod: selectedSong.isMod,
      modPath: selectedSong.modPath,
    }
    console.log("Enviando datos a PlayState:", songData)
    this.scene.start("PlayState", songData)
  }

  shutdown() {
    if (this.scoreAnimator) { this.scoreAnimator.destroy(); this.scoreAnimator = null }
    if (this.accuracyAnimator) { this.accuracyAnimator.destroy(); this.accuracyAnimator = null }
    if (this.missesAnimator) { this.missesAnimator.destroy(); this.missesAnimator = null }
    if (this.textContainer) this.textContainer.destroy(true)
    if (this.difficultyContainer) this.difficultyContainer.destroy(true)
    if (this.bg) this.bg.destroy()
    ;[this.scrollSound, this.confirmSound, this.cancelSound].forEach((sound) => {
      if (sound) { sound.stop(); sound.destroy() }
    })
    this.input.keyboard.removeAllListeners()
    this.tweens.killAll()
  }

  update(_time, _delta) {
    if (!this.songTexts) return
    this.songTexts.forEach((container, index) => {
      const iconSprite = container._iconSprite
      if (!iconSprite) return
      if (index === this.selectedIndex) {
        const bpm = iconSprite._bpm || 120
        const beatLength = 60000 / bpm
        const now = this.time.now
        const beat = Math.floor(now / beatLength)
        if (iconSprite._lastBeat !== beat) {
          iconSprite._lastBeat = beat
          this.tweens.add({
            targets: iconSprite,
            scale: iconSprite._baseScale * 1.25,
            duration: 80,
            yoyo: true,
            ease: "Quad.out",
            onComplete: () => {
              iconSprite.setScale(iconSprite._baseScale)
            },
          })
        }
      } else {
        // Reset escala si no está seleccionado
        iconSprite.setScale(iconSprite._baseScale)
      }
    })
  }
}

game.scene.add("FreeplayState", FreeplayState)
