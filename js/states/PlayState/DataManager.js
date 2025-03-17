export class DataManager {
    constructor(scene) {
      this.scene = scene
      this.isDataVisible = false
      this.isGridVisible = false
      this.dataTexts = []
      this.gridLines = []
      this.startTime = 0
      this.consoleContainer = null
      this.consoleInput = null
      this.consoleOutput = null
      this.isDragging = false
      this.dragStartX = 0
      this.dragStartY = 0
      this.consoleHistory = []
      this.resizeHandle = null
      this.consoleWidth = 0
      this.consoleHeight = 0
    }
  
    init(data) {
      this.storyPlaylist = data.storyPlaylist ? data.storyPlaylist.flat() : []
      this.storyDifficulty = data.storyDifficulty
      this.isStoryMode = data.isStoryMode
      this.campaignScore = data.campaignScore
      this.campaignMisses = data.campaignMisses
      this.weekName = data.weekName
      this.weekBackground = data.weekBackground
      this.weekCharacters = data.weekCharacters
      this.weekTracks = data.weekTracks
      this.selectedDifficulty = data.selectedDifficulty
      this.currentSongIndex = data.currentSongIndex || 0
      this.songList = Array.isArray(this.storyPlaylist) && this.storyPlaylist.length > 0 ? this.storyPlaylist : []
    }
  
    setStartTime(startTime) {
      this.startTime = startTime
    }
  
    setupF3Toggle() {
      const keyF3 = this.scene.input.keyboard.addKey("F3")
      const keyG = this.scene.input.keyboard.addKey("G")
      const keyC = this.scene.input.keyboard.addKey("C")
  
      keyF3.on("down", () => {
        this.isDataVisible = !this.isDataVisible
        this.isDataVisible ? this.showData() : this.hideData()
      })
  
      keyG.on("down", () => {
        this.toggleGridVisibility()
      })
  
      keyC.on("down", () => {
        this.toggleConsole()
      })
    }
  
    showData() {
      this.updateData()
    }
  
    hideData() {
      this.dataTexts.forEach((text) => text.destroy())
      this.dataTexts = []
    }
  
    updateData() {
      if (!this.isDataVisible) return
      this.hideData()
  
      const { width, height } = this.scene.scale
      const leftData = {
        FPS: Math.round(this.scene.game.loop.actualFps),
        "Current Song": this.songList[this.currentSongIndex] || "None",
        Playtime: this.formatTime(this.scene.time.now - this.startTime),
        "Loaded Images": Object.keys(this.scene.textures.list).length,
        "Loaded Audio": this.scene.cache.audio.entries.size,
      }
  
      const rightData = {
        Week: this.weekName || "Not available",
        Playlist: this.storyPlaylist ? this.storyPlaylist.join(", ") : "Not available",
        Difficulty: this.storyDifficulty || "Not available",
        Background: this.weekBackground || "Not available",
        Characters: this.weekCharacters ? this.weekCharacters.join(", ") : "Not available",
        Score: this.campaignScore || 0,
        Misses: this.campaignMisses || 0,
        "Story Mode": this.isStoryMode ? "Enabled" : "Disabled",
      }
  
      this.createDebugTexts(leftData, 20, 20, 0)
      this.createDebugTexts(rightData, width - 20, 20, 1)
    }
  
    createDebugTexts(data, startX, startY, align) {
      const lineHeight = 28
  
      Object.entries(data).forEach(([key, value], index) => {
        const text = this.scene.add
          .text(startX, startY + index * lineHeight, `${key}: ${value}`, {
            fontFamily: "Arial",
            fontSize: "22px",
            color: "#FFFFFF",
            align: "left",
          })
          .setOrigin(align, 0)
  
        this.dataTexts.push(text)
      })
    }
  
    toggleGridVisibility() {
      this.isGridVisible = !this.isGridVisible
      this.isGridVisible ? this.showGrid() : this.hideGrid()
    }
  
    showGrid() {
      const { width, height } = this.scene.scale
      const gridSize = 100
  
      for (let x = 0; x <= width; x += gridSize) {
        this.createGridLine(x, 0, x, height)
        this.createGridText(x + 2, 2, `X: ${x}`)
      }
  
      for (let y = 0; y <= height; y += gridSize) {
        this.createGridLine(0, y, width, y)
        this.createGridText(2, y + 2, `Y: ${y}`)
      }
    }
  
    createGridLine(x1, y1, x2, y2) {
      const line = this.scene.add.line(0, 0, x1, y1, x2, y2, 0xffff00).setOrigin(0, 0).setDepth(10)
      this.gridLines.push(line)
    }
  
    createGridText(x, y, text) {
      const coordText = this.scene.add.text(x, y, text, { fontSize: "16px", color: "#FFFF00" }).setDepth(11)
      this.gridLines.push(coordText)
    }
  
    hideGrid() {
      this.gridLines.forEach((line) => line.destroy())
      this.gridLines = []
    }
  
    toggleConsole() {
      if (!this.consoleContainer) {
        this.createConsole()
      } else {
        this.consoleContainer.setVisible(!this.consoleContainer.visible)
        if (this.consoleContainer.visible) {
          this.captureConsoleOutput()
        }
      }
    }
  
    createConsole() {
      const { width, height } = this.scene.scale
      this.consoleWidth = width
      this.consoleHeight = 200
  
      // Create container
      this.consoleContainer = this.scene.add.container(0, height - this.consoleHeight)
      this.consoleContainer.setDepth(20)
  
      // Background
      const background = this.scene.add.rectangle(0, 0, this.consoleWidth, this.consoleHeight, 0x222222, 0.9)
      background.setOrigin(0, 0)
  
      // Header for dragging
      const header = this.scene.add.rectangle(0, 0, this.consoleWidth, 30, 0x333333, 1)
      header.setOrigin(0, 0)
      header.setInteractive({ draggable: true })
  
      // Header text
      const headerText = this.scene.add.text(10, 8, "Console", {
        fontSize: "16px",
        fontFamily: "monospace",
        color: "#FFFFFF",
      })
  
      // Close button
      const closeButton = this.scene.add.text(this.consoleWidth - 30, 8, "X", {
        fontSize: "16px",
        fontFamily: "monospace",
        color: "#FFFFFF",
      })
      closeButton.setInteractive()
      closeButton.on("pointerdown", () => {
        this.toggleConsole()
      })
  
      // Console output area
      this.consoleOutput = this.scene.add.text(10, 40, "", {
        fontSize: "16px",
        fontFamily: "monospace",
        color: "#00FF00",
        wordWrap: { width: this.consoleWidth - 20 },
      })
      this.consoleOutput.setOrigin(0, 0)
  
      // Input field background
      const inputBackground = this.scene.add.rectangle(0, this.consoleHeight - 40, this.consoleWidth, 30, 0x111111, 1)
      inputBackground.setOrigin(0, 0)
  
      // Input field
      this.consoleInput = this.scene.add.text(10, this.consoleHeight - 35, "Type your command here", {
        fontSize: "16px",
        fontFamily: "monospace",
        color: "#AAAAAA",
      })
      this.consoleInput.setOrigin(0, 0)
      this.consoleInput.setInteractive()
  
      // Resize handle
      this.resizeHandle = this.scene.add.rectangle(this.consoleWidth - 20, this.consoleHeight - 20, 20, 20, 0x555555, 1)
      this.resizeHandle.setOrigin(0, 0)
      this.resizeHandle.setInteractive({ draggable: true })
  
      // Add all elements to container
      this.consoleContainer.add([
        background,
        header,
        headerText,
        closeButton,
        this.consoleOutput,
        inputBackground,
        this.consoleInput,
        this.resizeHandle,
      ])
  
      // Setup input interactions
      this.setupInputInteractions()
  
      // Setup dragging
      this.setupDragging(header)
  
      // Setup resizing
      this.setupResizing()
  
      // Capture console output
      this.captureConsoleOutput()
    }
  
    setupInputInteractions() {
      // Click on input to clear placeholder
      this.consoleInput.on("pointerdown", () => {
        if (this.consoleInput.text === "Type your command here") {
          this.consoleInput.setText("")
          this.consoleInput.setStyle({ color: "#FFFFFF" })
        }
  
        // Add blinking cursor effect
        if (!this.cursorBlink) {
          this.cursorBlink = this.scene.time.addEvent({
            delay: 500,
            callback: () => {
              if (this.consoleInput.text.endsWith("|")) {
                this.consoleInput.setText(this.consoleInput.text.slice(0, -1))
              } else {
                this.consoleInput.setText(this.consoleInput.text + "|")
              }
            },
            loop: true,
          })
        }
      })
  
      // Handle keyboard input
      this.scene.input.keyboard.on("keydown", (event) => {
        if (!this.consoleContainer.visible) return
  
        // Remove cursor for typing
        if (this.consoleInput.text.endsWith("|")) {
          this.consoleInput.setText(this.consoleInput.text.slice(0, -1))
        }
  
        if (event.key === "Enter") {
          const command = this.consoleInput.text.replace("|", "").trim()
          if (command && command !== "Type your command here") {
            this.executeCommand(command)
            this.consoleInput.setText("")
          }
        } else if (event.key === "Backspace") {
          if (this.consoleInput.text !== "Type your command here" && this.consoleInput.text.length > 0) {
            this.consoleInput.setText(this.consoleInput.text.slice(0, -1))
          }
        } else if (event.key.length === 1) {
          if (this.consoleInput.text === "Type your command here") {
            this.consoleInput.setText("")
            this.consoleInput.setStyle({ color: "#FFFFFF" })
          }
          this.consoleInput.setText(this.consoleInput.text + event.key)
        }
      })
  
      // Handle click outside to reset placeholder
      this.scene.input.on("pointerdown", (pointer) => {
        if (this.consoleContainer.visible && !this.isPointInConsole(pointer) && this.consoleInput.text === "") {
          if (this.cursorBlink) {
            this.cursorBlink.remove()
            this.cursorBlink = null
          }
  
          this.consoleInput.setText("Type your command here")
          this.consoleInput.setStyle({ color: "#AAAAAA" })
        }
      })
    }
  
    isPointInConsole(pointer) {
      const bounds = this.consoleContainer.getBounds()
      return (
        pointer.x >= bounds.x &&
        pointer.x <= bounds.x + bounds.width &&
        pointer.y >= bounds.y &&
        pointer.y <= bounds.y + bounds.height
      )
    }
  
    setupDragging(header) {
      header.on("pointerdown", (pointer) => {
        this.isDragging = true
        this.dragStartX = pointer.x - this.consoleContainer.x
        this.dragStartY = pointer.y - this.consoleContainer.y
      })
  
      this.scene.input.on("pointermove", (pointer) => {
        if (this.isDragging) {
          this.consoleContainer.x = pointer.x - this.dragStartX
          this.consoleContainer.y = pointer.y - this.dragStartY
        }
      })
  
      this.scene.input.on("pointerup", () => {
        this.isDragging = false
      })
    }
  
    setupResizing() {
      let isResizing = false
      let startX, startY, startWidth, startHeight
  
      this.resizeHandle.on("pointerdown", (pointer) => {
        isResizing = true
        startX = pointer.x
        startY = pointer.y
        startWidth = this.consoleWidth
        startHeight = this.consoleHeight
      })
  
      this.scene.input.on("pointermove", (pointer) => {
        if (isResizing) {
          // Calculate new dimensions
          const newWidth = Math.max(300, startWidth + (pointer.x - startX))
          const newHeight = Math.max(150, startHeight + (pointer.y - startY))
  
          // Update console dimensions
          this.resizeConsole(newWidth, newHeight)
        }
      })
  
      this.scene.input.on("pointerup", () => {
        isResizing = false
      })
    }
  
    resizeConsole(width, height) {
      this.consoleWidth = width
      this.consoleHeight = height
  
      // Update background
      this.consoleContainer.getAt(0).width = width
      this.consoleContainer.getAt(0).height = height
  
      // Update header
      this.consoleContainer.getAt(1).width = width
  
      // Update close button position
      this.consoleContainer.getAt(3).x = width - 30
  
      // Update input background
      this.consoleContainer.getAt(5).width = width
      this.consoleContainer.getAt(5).y = height - 40
  
      // Update input position
      this.consoleContainer.getAt(6).y = height - 35
  
      // Update resize handle position
      this.consoleContainer.getAt(7).x = width - 20
      this.consoleContainer.getAt(7).y = height - 20
    }
  
    captureConsoleOutput() {
      // Store original console methods
      if (!this.originalConsole) {
        this.originalConsole = {
          log: console.log,
          error: console.error,
          warn: console.warn,
          info: console.info,
        }
  
        // Override console methods
        console.log = (...args) => {
          this.originalConsole.log(...args)
          this.addToConsoleOutput("LOG", ...args)
        }
  
        console.error = (...args) => {
          this.originalConsole.error(...args)
          this.addToConsoleOutput("ERROR", ...args)
        }
  
        console.warn = (...args) => {
          this.originalConsole.warn(...args)
          this.addToConsoleOutput("WARN", ...args)
        }
  
        console.info = (...args) => {
          this.originalConsole.info(...args)
          this.addToConsoleOutput("INFO", ...args)
        }
      }
    }
  
    addToConsoleOutput(type, ...args) {
      if (!this.consoleContainer || !this.consoleContainer.visible) return
  
      const colors = {
        LOG: "#FFFFFF",
        ERROR: "#FF5555",
        WARN: "#FFFF55",
        INFO: "#55FFFF",
      }
  
      const timestamp = new Date().toLocaleTimeString()
      const message = args
        .map((arg) => {
          if (typeof arg === "object") {
            try {
              return JSON.stringify(arg)
            } catch (e) {
              return String(arg)
            }
          }
          return String(arg)
        })
        .join(" ")
  
      // Add to history
      this.consoleHistory.push({
        type,
        message,
        timestamp,
      })
  
      // Limit history
      if (this.consoleHistory.length > 100) {
        this.consoleHistory.shift()
      }
  
      // Update display
      this.updateConsoleOutput()
    }
  
    updateConsoleOutput() {
      if (!this.consoleOutput) return
  
      const output = this.consoleHistory
        .map((entry) => {
          return `[${entry.timestamp}] [${entry.type}] ${entry.message}`
        })
        .join("\n")
  
      this.consoleOutput.setText(output)
  
      // Auto-scroll to bottom
      // This is a simple approach - in a real implementation you might want
      // to implement proper scrolling with a mask
    }
  
    executeCommand(command) {
      // Add command to output
      this.addToConsoleOutput("CMD", `> ${command}`)
  
      if (command.toLowerCase() === "cls" || command.toLowerCase() === "clear") {
        this.consoleHistory = []
        this.updateConsoleOutput()
        return
      }
  
      try {
        const result = eval(command)
        console.log(result)
      } catch (error) {
        console.error(error.message)
      }
    }
  
    formatTime(milliseconds) {
      const seconds = Math.floor(milliseconds / 1000)
      const minutes = Math.floor((seconds % 3600) / 60)
      const secs = seconds % 60
      return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
    }
  }
  
  