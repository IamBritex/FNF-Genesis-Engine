import { RatingManager } from "./RatingManager.js"
import { NoteSpawner } from "./ModularArrows/Notes.js"
import { HoldNotes } from "./ModularArrows/HoldNotes.js"
import { Pharser } from "./ModularArrows/Pharser.js"
import { StrumlinesNotes } from "./ModularArrows/StrumlinesNotes.js"
import { NoteSplashes } from "./ModularArrows/NoteSplashes.js"
import { SustainCover } from "./ModularArrows/SustainCover.js"
import { Paths } from "../../../utils/Paths.js"

/**
 * Main controller for handling note gameplay logic
 */
export class NotesController {
  /**
   * @param {Phaser.Scene} scene - The phaser scene instance
   */
  constructor(scene) {
    this.scene = scene
    this.offsets = {
      static: { x: 0, y: 0 },
      press: { x: 28, y: 28 },
      confirm: { x: 11, y: 12 },
      note: { x: 21, y: 0 },
      hold: { x: 74, y: 30 },
    }

    this.initialized = false
    this.bpm = 100
    this.speed = 1
    this.safeFrames = 15
    this.safeZoneOffset = (this.safeFrames / 60) * 1000

    this.songNotes = []
    this.playerNotes = []
    this.enemyNotes = []
    this.notesHit = 0
    this.notesMissed = 0
    this.combo = 0
    this.maxCombo = 0
    this.score = 0

    this.ratingManager = new RatingManager(scene)
    this.configureRatingManager()
    this.setupKeyBindings()

    this.keysHeld = { left: false, down: false, up: false, right: false }
    this.events = new Phaser.Events.EventEmitter()

    this.holdScoreRate = 100
    this.holdScoreInterval = 100
    this.holdPenalty = 50

    this.activeHoldNotes = [null, null, null, null]
    this.activeEnemyHoldNotes = [null, null, null, null]
    this.enemyHoldTimers = [null, null, null, null] // Para manejar timers de notas largas del enemigo

    this.noteVisibilityConfig = {
      spawnOffset: 2000,
      despawnOffset: 1000,
      holdNoteDespawnDelay: 500,
    }

    this.currentBPM = 100
    this.missSounds = ["missnote1", "missnote2", "missnote3"]

    this.healthConfig = {
      hitGain: 0.023,
      missLoss: 0.05,
      holdGain: 0.023 / 10,
      holdRate: 60,
    }

    this.noteSpawner = new NoteSpawner(scene, this)
    this.holdNotes = new HoldNotes(scene, this)
    this.strumlines = new StrumlinesNotes(scene, this)
    this.noteSplashes = new NoteSplashes(scene, this, 62, 72)
    this.sustainCover = new SustainCover(scene, this, 62, 72)

    this.lastSingTime = {
      player: 0,
      enemy: 0,
    }

    this.enemyHeldDirections = new Map()
    this.botEnabled = false
    this.botKey = this.scene.input.keyboard.addKey("B")
    this.botKey.on("down", this.toggleBot, this)
    this.botReactionTime = 16
    this.lastBotHitTime = 0

    this.uiElements = []

    // Optimización: Pool de objetos para evitar garbage collection
    this.notePool = []
    this.maxPoolSize = 100

    // Cache para posiciones de strumline
    this.cachedPlayerPositions = null
    this.cachedEnemyPositions = null
    this.positionsCacheValid = false

    this.noteSkin = 'Funkin'; // Skin por defecto
  }

  /**
   * Sets up keyboard bindings from localStorage
   */
  async setupKeyBindings() {
    const leftKey = localStorage.getItem("CONTROLS.NOTES.LEFT") || "LEFT"
    const downKey = localStorage.getItem("CONTROLS.NOTES.DOWN") || "DOWN"
    const upKey = localStorage.getItem("CONTROLS.NOTES.UP") || "UP"
    const rightKey = localStorage.getItem("CONTROLS.NOTES.RIGHT") || "RIGHT"

    this.keyBindings = {
      left: [
        this.scene.input.keyboard.addKey(
          Phaser.Input.Keyboard.KeyCodes[leftKey.toUpperCase()] || Phaser.Input.Keyboard.KeyCodes.LEFT,
        ),
      ],
      down: [
        this.scene.input.keyboard.addKey(
          Phaser.Input.Keyboard.KeyCodes[downKey.toUpperCase()] || Phaser.Input.Keyboard.KeyCodes.DOWN,
        ),
      ],
      up: [
        this.scene.input.keyboard.addKey(
          Phaser.Input.Keyboard.KeyCodes[upKey.toUpperCase()] || Phaser.Input.Keyboard.KeyCodes.UP,
        ),
      ],
      right: [
        this.scene.input.keyboard.addKey(
          Phaser.Input.Keyboard.KeyCodes[rightKey.toUpperCase()] || Phaser.Input.Keyboard.KeyCodes.RIGHT,
        ),
      ],
    }
  }

  directions = ["left", "down", "up", "right"]
  holdColors = ["purple", "blue", "green", "red"]

  /**
   * Configures the rating manager with default positions
   */
  configureRatingManager() {
    this.ratingManager.configure({
      positions: {
        rating: { x: null, y: 300 },
        comboNumbers: {
          x: 0,
          y: 50,
          spacing: 30,
          scale: 0.5,
          rotation: 0,
        },
      },
    })
  }

  /**
   * Loads notes from song data
   * @param {Object} songData - The song data containing notes
   * @param {number} bpm - Option BPM override
   * @param {number} speed - Optional speed override
   */
  loadNotes(songData, bpm, speed) {
    // Actualizar el skin basado en los datos de la canción
    this.noteSkin = songData.song?.skin || 'Funkin';

    this.songNotes = Pharser.parseNotes(songData)
    this.bpm = bpm || songData.bpm || (songData.song && songData.song.bpm) || 100
    this.speed = speed || songData.speed || (songData.song && songData.song.speed) || 1
    this.crochet = (60 / this.bpm) * 1000
    this.stepCrochet = this.crochet / 4
    this.safeZoneOffset = Math.floor((this.safeFrames / 60) * 1000)

    const playerNotes = this.songNotes.filter((note) => note.isPlayerNote).length
    const enemyNotes = this.songNotes.filter((note) => !note.isPlayerNote).length

    console.log("Total notes loaded:", this.songNotes.length)
    console.log("Player notes:", playerNotes)
    console.log("Enemy notes:", enemyNotes)
  }

  /**
   * Sets up input handlers for note controls
   */
  setupInputHandlers() {
    if (!this.initialized) {
      console.log("NotesController not initialized yet")
      return
    }

    // Limpiar callbacks anteriores
    if (this.keyPressCallbacks) {
      this.keyPressCallbacks.forEach(({ key, callback }) => {
        key.off("down", callback)
      })
    }

    if (this.keyReleaseCallbacks) {
      this.keyReleaseCallbacks.forEach(({ key, callback }) => {
        key.off("up", callback)
      })
    }

    this.keyPressCallbacks = []
    this.keyReleaseCallbacks = []

    this.directions.forEach((direction, index) => {
      const keys = this.keyBindings[direction]

      const pressHandler = () => {
        if (!this.initialized || !this.strumlines.playerStrumline[index] || this.scene.isPaused()) return

        const arrow = this.strumlines.playerStrumline[index]
        if (!this.keysHeld[direction]) {
          this.keysHeld[direction] = true

          if (!arrow || !arrow.active) {
            console.warn(`Arrow ${direction} no está disponible`)
            return
          }

          const pos = this.getStrumlinePositions(true)[index]
          const pressOffset = this.offsets.press
          const confirmOffset = this.offsets.confirm
          const pressPos = {
            x: pos.x + (pressOffset.x || 0),
            y: pos.y + (pressOffset.y || 0),
          }
          const confirmPos = {
            x: pos.x + (confirmOffset.x || 0),
            y: pos.y + (confirmOffset.y || 0),
          }

          let hasHittableNote = false
          const currentTime = this.scene.songPosition

          // Optimización: buscar solo en notas cercanas
          for (const note of this.songNotes) {
            if (note.isPlayerNote && note.noteDirection === index && !note.wasHit && !note.tooLate && note.spawned) {
              const timeDiff = note.strumTime - currentTime
              if (Math.abs(timeDiff) <= this.safeZoneOffset) {
                hasHittableNote = true
                break
              }
            }
          }

          if (hasHittableNote) {
            arrow.x = confirmPos.x
            arrow.y = confirmPos.y
            arrow.setTexture("noteStrumline", `confirm${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`)
            arrow.setScale(this.strumlines.defaultScale.confirm)
            this.checkNoteHit(index)
          } else {
            arrow.x = pressPos.x
            arrow.y = pressPos.y
            arrow.setTexture("noteStrumline", `press${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`)
            arrow.setScale(this.strumlines.defaultScale.press)

            const ghostTapping = localStorage.getItem("GAMEPLAY.NOTE SETTINGS.GHOST TAPPING")
            if (ghostTapping === "false") {
              this.missNote({
                isPlayerNote: true,
                noteDirection: index,
                wasHit: false,
                tooLate: false,
                spawned: true,
                isHoldNote: false,
                sprite: null,
              })
            }
          }
        }
      }

      const releaseHandler = () => {
        if (!this.initialized || !this.strumlines.playerStrumline[index] || this.scene.isPaused()) return

        this.keysHeld[direction] = false
        const arrow = this.strumlines.playerStrumline[index]

        if (!arrow || !arrow.active || typeof arrow.originalX === "undefined") {
          console.warn(`Arrow ${direction} no está disponible o no tiene posición original`)
          return
        }

        arrow.x = arrow.originalX
        arrow.y = arrow.originalY
        arrow.setTexture("noteStrumline", `static${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`)
        arrow.setScale(this.strumlines.defaultScale.static)

        this.events.emit("noteReleased", {
          direction: index,
          isPlayerNote: true,
        })

        if (this.activeHoldNotes[index]) {
          const holdNote = this.activeHoldNotes[index]
          const currentTime = this.scene.songPosition
          const holdEndTime = holdNote.strumTime + holdNote.sustainLength

          holdNote.isBeingHeld = false

          if (currentTime < holdEndTime - this.safeZoneOffset) {
            this.score -= this.holdPenalty
            holdNote.holdReleased = true
            this.ratingManager.recordMiss()
          }
        }
      }

      keys.forEach((key) => {
        if (key) {
          key.on("down", pressHandler)
          key.on("up", releaseHandler)
          this.keyPressCallbacks.push({ key, callback: pressHandler })
          this.keyReleaseCallbacks.push({ key, callback: releaseHandler })
        }
      })
    })

    console.log("Input handlers setup complete")
  }

  /**
   * Check for note hits in a specific direction
   * @param {number} directionIndex - The direction index to check
   */
  checkNoteHit(directionIndex) {
    const currentTime = this.scene.songPosition
    let closestNote = null
    let closestTimeDiff = Number.POSITIVE_INFINITY

    for (const note of this.songNotes) {
      if (note.isPlayerNote && note.noteDirection === directionIndex && !note.wasHit && !note.tooLate && note.spawned) {
        const timeDiff = note.strumTime - currentTime
        if (Math.abs(timeDiff) <= this.safeZoneOffset && Math.abs(timeDiff) < Math.abs(closestTimeDiff)) {
          closestNote = note
          closestTimeDiff = timeDiff
        }
      }
    }

    if (closestNote) {
      this.hitNote(closestNote, closestTimeDiff)
    }
  }

  /**
   * Handles a successful note hit
   * @param {Object} note - The note that was hit
   * @param {number} timeDiff - The time difference between the note and the current timing
   */
  hitNote(note, timeDiff) {
    note.wasHit = true
    const direction = this.directions[note.noteDirection]
    const arrow = this.strumlines.playerStrumline[note.noteDirection]
    const pos = this.getStrumlinePositions(true)[note.noteDirection]
    const confirmOffset = this.offsets.confirm
    const confirmPos = {
      x: pos.x + (confirmOffset.x || 0),
      y: pos.y + (confirmOffset.y || 0),
    }

    arrow.x = confirmPos.x
    arrow.y = confirmPos.y
    arrow.setTexture("noteStrumline", `confirm${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`)
    arrow.setScale(this.strumlines.defaultScale.confirm)

    this.events.emit("strumlineStateChange", {
      direction: note.noteDirection,
      isPlayerNote: note.isPlayerNote,
      state: "confirm",
    })

    this.scene.time.delayedCall(103, () => {
      if (!this.keysHeld[direction]) {
        arrow.x = arrow.originalX
        arrow.y = arrow.originalY
        arrow.setTexture("noteStrumline", `static${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`)
        arrow.setScale(this.strumlines.defaultScale.static)

        this.events.emit("strumlineStateChange", {
          direction: note.noteDirection,
          isPlayerNote: note.isPlayerNote,
          state: "static",
        })
      }
    })

    if (note.isHoldNote) {
      if (!this.activeHoldNotes[note.noteDirection]) {
        this.activeHoldNotes[note.noteDirection] = note
        note.isBeingHeld = true
        note.holdReleased = false
      }

      if (note.sprite?.active) {
        note.sprite.destroy()
        note.sprite = null
      }
    } else {
      if (note.sprite?.active) {
        note.sprite.destroy()
        note.sprite = null
      }
    }

    this.notesHit++
    let rating
    if (this.botEnabled) {
      rating = this.ratingManager.recordHit(0)
    } else {
      rating = this.ratingManager.recordHit(timeDiff)
    }

    this.combo = this.ratingManager.combo
    this.maxCombo = this.ratingManager.maxCombo

    if (rating === "sick" && note.isPlayerNote) {
      const color = this.holdColors[note.noteDirection]
      this.noteSplashes.showSplash(note.noteDirection, color)
    }

    if (this.scene.healthBar) {
      this.scene.healthBar.heal(this.healthConfig.hitGain)
    }

    this.events.emit("noteHit", {
      direction: note.noteDirection,
      isPlayerNote: true,
      timeDiff: timeDiff,
      rating: rating,
    })
  }

  /**
   * Handles a missed note
   * @param {Object} note - The note that was missed
   */
  missNote(note) {
    note.tooLate = true
    this.notesMissed++

    const randomSound = this.missSounds[Math.floor(Math.random() * this.missSounds.length)]
    if (this.scene.cache.audio.exists(randomSound)) {
      this.scene.sound.play(randomSound, { volume: 0.5 })
    }

    if (note.sprite?.active) {
      note.sprite.destroy()
      note.sprite = null
    }

    if (note.holdSprites) {
      note.holdSprites.forEach((sprite) => {
        if (sprite?.active) sprite.destroy()
      })
      note.holdSprites = []
    }

    const missAnims = {
      0: "singLEFTmiss",
      1: "singDOWNmiss",
      2: "singUPmiss",
      3: "singRIGHTmiss",
    }

    this.events.emit("strumlineStateChange", {
      direction: note.noteDirection,
      isPlayerNote: true,
      state: "miss",
      animation: missAnims[note.noteDirection],
    })

    this.ratingManager.recordMiss()
    this.combo = this.ratingManager.combo

    if (this.scene.healthBar) {
      this.scene.healthBar.damage(this.healthConfig.missLoss)
    }
  }

  /**
   * Spawns a note in the game
   * @param {Object} note - The note object to spawn
   */
  spawnNote(note) {
    this.noteSpawner.spawnNote(note)
  }

  /**
   * Gets all active notes
   * @returns {Array} Array of active notes
   */
  getAllNotes() {
    return this.songNotes.filter((note) => note.spawned && (!note.wasHit || (note.isHoldNote && !note.holdEndPassed)))
  }

  /**
   * Initializes the NotesController
   */
  async init() {
    if (this.initialized) {
      console.warn("NotesController already initialized");
      return;
    }

    try {
      // Load all required assets first
      await new Promise((resolve, reject) => {
        if (!this.scene.textures.exists('notes')) {
          const skinAssets = Paths.getNoteSkinAssets(this.noteSkin);
          const loader = this.scene.load;

          // Cargar hold covers
          const colors = ['Purple', 'Blue', 'Green', 'Red'];
          colors.forEach(color => {
            const coverAsset = skinAssets.HOLD_COVERS[color];

            // Cargar el XML primero como archivo de texto
            loader.xml(`holdCover${color}XML`, coverAsset.ATLAS);

            // Luego cargar el atlas
            loader.atlasXML(
              `holdCover${color}`,
              coverAsset.TEXTURE,
              coverAsset.ATLAS
            );
          });

          // Cargar assets básicos
          loader.atlasXML('notes', skinAssets.NOTES.TEXTURE, skinAssets.NOTES.ATLAS);
          loader.atlasXML('noteStrumline', skinAssets.STRUMLINE.TEXTURE, skinAssets.STRUMLINE.ATLAS);
          loader.atlasXML('NOTE_hold_assets', skinAssets.HOLD_ASSETS.TEXTURE, skinAssets.HOLD_ASSETS.ATLAS);
          loader.atlasXML('noteSplashes', skinAssets.SPLASHES.TEXTURE, skinAssets.SPLASHES.ATLAS);


          loader.once('complete', resolve);
          loader.once('loaderror', reject);
          loader.start();
        } else {
          resolve();
        }
      });

      // Initialize components after assets are loaded
      await this.strumlines.createPlayerStrumline();
      this.strumlines.createEnemyStrumline();

      // Initialize splashes
      this.noteSplashes = new NoteSplashes(this.scene, this, -50, -50);
      this.noteSplashes._ensureAnimations();

      // Initialize sustain covers
      this.sustainCover = new SustainCover(this.scene, this, 62, 72);

      // Procesar la información de rotación después de que todo esté cargado
      const colors = ['Purple', 'Blue', 'Green', 'Red'];
      colors.forEach(color => {
        const texture = this.scene.textures.get(`holdCover${color}`);
        if (texture) {
          const xmlData = this.scene.cache.xml.get(`holdCover${color}XML`);

          if (!xmlData) {
            console.warn(`[NotesController] XML data not found for holdCover${color}XML`);
            return;
          }

          texture.getFrameNames().forEach(frameName => {
            const frame = texture.frames[frameName];
            const subTextures = xmlData.getElementsByTagName('SubTexture');
            for (let i = 0; i < subTextures.length; i++) {
              const subTexture = subTextures[i];
              if (subTexture.getAttribute('name') === frameName) {
                if (subTexture.getAttribute('rotated') === 'true') {
                  frame.customData = {
                    rotated: true,
                    frameX: parseInt(subTexture.getAttribute('frameX') || 0),
                    frameY: parseInt(subTexture.getAttribute('frameY') || 0)
                  };
                }
                break;
              }
            }
          });
        }
      });

      // Ensure animations after processing rotation data
      this.sustainCover._ensureAnimations();

      if (this.enemyStrumlineVisuals) {
        this.strumlines.enemyStrumline.forEach((arrow) => {
          if (arrow) {
            arrow.setScale(this.enemyStrumlineVisuals.scale);
            arrow.setAlpha(this.enemyStrumlineVisuals.alpha);
          }
        });
      }

      if (this.scene.cameraController) {
        this.strumlines.playerStrumline.forEach((arrow) => {
          if (arrow) {
            this.scene.cameraController.addToUILayer(arrow)
            arrow.setScale(this.strumlines.defaultScale.static)
          }
        })

        this.strumlines.enemyStrumline.forEach((arrow) => {
          if (arrow) {
            this.scene.cameraController.addToUILayer(arrow)
            const scale = this.enemyStrumlineVisuals
              ? this.strumlines.defaultScale.static * this.enemyStrumlineVisuals.scale
              : this.strumlines.defaultScale.static
            arrow.setScale(scale)
          }
        })

        this.scene.cameraController._setupCameraLayers()
      }

      this.uiElements = [...this.strumlines.playerStrumline, ...this.strumlines.enemyStrumline]

      this.setupInputHandlers()
      this.initialized = true
      console.log("NotesController initialized successfully")
    } catch (error) {
      console.error("Error initializing NotesController:", error);
      throw error;
    }
  }

  /**
   * Updates the NotesController
   * @param {number} songPosition - Current song position in milliseconds
   */
  update(songPosition) {
    if (this.scene.isPaused()) return

    const currentTime = songPosition
    const spawnTime = 2000 * this.speed

    // Optimización: filtrar notas de manera más eficiente
    this.songNotes = this.songNotes.filter((note) => {
      const timeDiff = note.strumTime - currentTime
      const isHoldActive = note.isHoldNote && note.wasHit && currentTime <= note.strumTime + note.sustainLength

      if (
        (!note.isHoldNote && timeDiff < -1000) ||
        (note.isHoldNote && !isHoldActive && currentTime > note.strumTime + note.sustainLength + 500)
      ) {
        this.cleanUpNote(note)
        return false
      }
      return true
    })

    this.noteSpawner.updateNotes(this.songNotes, currentTime, this.speed, this.currentBPM)

    // Spawn notes
    for (const note of this.songNotes) {
      if (!note.spawned && note.strumTime <= currentTime + spawnTime) {
        this.spawnNote(note)
        note.spawned = true
      }
    }

    // Check note hits and misses
    for (const note of this.songNotes) {
      if (note.isPlayerNote) {
        const timeDiff = note.strumTime - currentTime
        note.canBeHit = Math.abs(timeDiff) <= this.safeZoneOffset

        if (!note.wasHit && !note.tooLate && timeDiff < -this.safeZoneOffset) {
          this.missNote(note)
        }
      } else {
        const timeDiff = note.strumTime - currentTime
        if (!note.wasHit && Math.abs(timeDiff) <= this.safeZoneOffset && timeDiff <= 0) {
          this.playEnemyNote(note)
        }
      }
    }

    this.updateActiveHoldNotes(currentTime)

    // Floating animation for strumlines
    const time = this.scene.time.now
    const floatOffset = Math.sin(time / 500) * 1000

    this.strumlines.playerStrumline.forEach((arrow) => {
      if (arrow && typeof arrow.baseY === "number") {
        arrow.y = arrow.baseY + floatOffset
      }
    })

    this.strumlines.enemyStrumline.forEach((arrow) => {
      if (arrow && typeof arrow.baseY === "number") {
        arrow.y = arrow.baseY + floatOffset
      }
    })

    if (this.botEnabled) {
      this.updateBot(songPosition)
    }
  }

  /**
   * Updates active hold notes
   * @param {number} currentTime - Current song position in milliseconds
   */
  updateActiveHoldNotes(currentTime) {
    // Player hold notes
    for (let i = 0; i < this.activeHoldNotes.length; i++) {
      const note = this.activeHoldNotes[i]
      if (note && note.isPlayerNote && !note.cleanedUp) {
        const holdEndTime = note.strumTime + note.sustainLength
        const direction = this.directions[note.noteDirection]

        if ((this.keysHeld[direction] || this.botEnabled) && currentTime <= holdEndTime) {
          const arrow = this.strumlines.playerStrumline[note.noteDirection]
          if (arrow) {
            arrow.setTexture("noteStrumline", `confirm${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`)
            arrow.setScale(this.strumlines.defaultScale.confirm)
          }
          note.isBeingHeld = true
        } else if (!this.keysHeld[direction] && !this.botEnabled) {
          note.isBeingHeld = false
          note.holdReleased = true
        }

        this.holdNotes.updateHoldNote(note, currentTime)

        if (currentTime > holdEndTime || note.cleanedUp) {
          this.activeHoldNotes[i] = null
          const arrow = this.strumlines.playerStrumline[note.noteDirection]
          if (arrow) {
            arrow.x = arrow.originalX
            arrow.y = arrow.originalY
            arrow.setTexture("noteStrumline", `static${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`)
            arrow.setScale(this.strumlines.defaultScale.static)
          }
        }
      }
    }

    // Enemy hold notes - OPTIMIZADO
    for (let i = 0; i < this.activeEnemyHoldNotes.length; i++) {
      const note = this.activeEnemyHoldNotes[i]
      if (note && !note.isPlayerNote && !note.cleanedUp) {
        const holdEndTime = note.strumTime + note.sustainLength
        const direction = this.directions[note.noteDirection]

        if (currentTime <= holdEndTime) {
          const arrow = this.strumlines.enemyStrumline[note.noteDirection]
          if (arrow) {
            // Mantener la posición original durante toda la duración de la nota larga
            const enemyVisuals = this.enemyStrumlineVisuals
            const scaleConfirm = this.strumlines.defaultScale.confirm * (enemyVisuals ? enemyVisuals.scale : 1)
            const alpha = enemyVisuals ? enemyVisuals.alpha : 1

            arrow.setTexture("noteStrumline", `confirm${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`)
            arrow.setScale(scaleConfirm)
            arrow.setAlpha(alpha)

            // IMPORTANTE: Mantener la posición original, no mover
            // No cambiar arrow.x ni arrow.y aquí
          }
          note.isBeingHeld = true
        }

        this.holdNotes.updateEnemyHoldNote(note, currentTime)

        if (currentTime > holdEndTime || note.cleanedUp) {
          this.activeEnemyHoldNotes[i] = null

          // Limpiar timer si existe
          if (this.enemyHoldTimers[i]) {
            this.enemyHoldTimers[i].remove()
            this.enemyHoldTimers[i] = null
          }

          const arrow = this.strumlines.enemyStrumline[note.noteDirection]
          if (arrow) {
            const enemyVisuals = this.enemyStrumlineVisuals
            const scaleStatic = this.strumlines.defaultScale.static * (enemyVisuals ? enemyVisuals.scale : 1)
            const alpha = enemyVisuals ? enemyVisuals.alpha : 1

            // Restaurar a posición original
            arrow.x = arrow.originalX
            arrow.y = arrow.originalY
            arrow.setTexture("noteStrumline", `static${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`)
            arrow.setScale(scaleStatic)
            arrow.setAlpha(alpha)
          }
        }
      }
    }
  }

  /**
   * Updates bot behavior
   * @param {number} currentTime - Current song position in milliseconds
   */
  updateBot(currentTime) {
    for (let dirIndex = 0; dirIndex < this.directions.length; dirIndex++) {
      const direction = this.directions[dirIndex]
      let shouldHoldKey = false

      // Check active hold notes
      const activeHold = this.activeHoldNotes[dirIndex]
      if (activeHold && activeHold.isHoldNote && !activeHold.holdReleased) {
        const holdEndTime = activeHold.strumTime + activeHold.sustainLength
        if (currentTime <= holdEndTime) {
          shouldHoldKey = true
          const arrow = this.strumlines.playerStrumline[dirIndex]
          if (arrow) {
            arrow.setTexture("noteStrumline", `confirm${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`)
            arrow.setScale(this.strumlines.defaultScale.confirm)
            this.events.emit("strumlineStateChange", {
              direction: dirIndex,
              isPlayerNote: true,
              state: "confirm",
              sustainNote: true,
            })
          }
        }
      }

      // Find next note
      let closestNote = null
      let closestTimeDiff = Number.POSITIVE_INFINITY

      for (const note of this.songNotes) {
        if (note.isPlayerNote && note.noteDirection === dirIndex && !note.wasHit && !note.tooLate && note.spawned) {
          const timeDiff = note.strumTime - currentTime
          if (Math.abs(timeDiff) <= this.safeZoneOffset && Math.abs(timeDiff) < Math.abs(closestTimeDiff)) {
            closestNote = note
            closestTimeDiff = timeDiff
          }
        }
      }

      // Handle key presses
      if (shouldHoldKey || (closestNote && Math.abs(closestTimeDiff) <= this.safeZoneOffset)) {
        if (!this.keysHeld[direction]) {
          this.keysHeld[direction] = true
          if (closestNote) {
            this.checkNoteHit(dirIndex)
          }
        }
      } else {
        if (this.keysHeld[direction]) {
          this.keysHeld[direction] = false
          const arrow = this.strumlines.playerStrumline[dirIndex]
          if (arrow) {
            arrow.x = arrow.originalX
            arrow.y = arrow.originalY
            arrow.setTexture("noteStrumline", `static${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`)
            arrow.setScale(this.strumlines.defaultScale.static)
            this.events.emit("strumlineStateChange", {
              direction: dirIndex,
              isPlayerNote: true,
              state: "static",
            })
          }
        }
      }
    }
  }

  /**
   * Handles enemy note hits - OPTIMIZADO
   * @param {Object} note - The note being hit by the enemy
   */
  playEnemyNote(note) {
    note.wasHit = true
    const direction = this.directions[note.noteDirection]
    const arrow = this.strumlines.enemyStrumline[note.noteDirection]

    if (note.isHoldNote) {
      if (!this.activeEnemyHoldNotes[note.noteDirection]) {
        this.activeEnemyHoldNotes[note.noteDirection] = note
        note.isBeingHeld = true
        note.holdReleased = false

        // Configurar la animación de la strumline para toda la duración
        const holdDuration = note.sustainLength
        const singAnims = {
          0: "singLEFT",
          1: "singDOWN",
          2: "singUP",
          3: "singRIGHT",
        }

        this.events.emit("strumlineStateChange", {
          direction: note.noteDirection,
          isPlayerNote: false,
          state: "confirm",
          sustainNote: true,
          perfect: true,
          animation: singAnims[note.noteDirection],
          holdDuration: holdDuration,
        })

        // Programar el retorno al estado static SOLO UNA VEZ
        this.enemyHoldTimers[note.noteDirection] = this.scene.time.delayedCall(holdDuration, () => {
          if (arrow) {
            const enemyVisuals = this.enemyStrumlineVisuals
            const scaleStatic = this.strumlines.defaultScale.static * (enemyVisuals ? enemyVisuals.scale : 1)
            const alpha = enemyVisuals ? enemyVisuals.alpha : 1

            arrow.x = arrow.originalX
            arrow.y = arrow.originalY
            arrow.setTexture("noteStrumline", `static${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`)
            arrow.setScale(scaleStatic)
            arrow.setAlpha(alpha)
          }

          this.events.emit("strumlineStateChange", {
            direction: note.noteDirection,
            isPlayerNote: false,
            state: "static",
          })

          this.enemyHoldTimers[note.noteDirection] = null
        })
      }

      // Limpiar sprite de la nota
      if (note.sprite?.active) {
        note.sprite.destroy()
        note.sprite = null
      }
    } else {
      // Nota normal
      if (note.sprite?.active) {
        note.sprite.destroy()
        note.sprite = null
      }
    }

    const singAnims = {
      0: "singLEFT",
      1: "singDOWN",
      2: "singUP",
      3: "singRIGHT",
    }

    // Asegurarse de registrar el tiempo de animación para el enemigo
    this.events.emit("strumlineStateChange", {
      direction: note.noteDirection,
      isPlayerNote: false,
      state: "confirm",
      sustainNote: note.isHoldNote,
      perfect: true,
      animation: singAnims[note.noteDirection],
      startTime: this.scene.songPosition // Añadir el tiempo de inicio
    });

    const enemyVisuals = this.enemyStrumlineVisuals
    const scaleConfirm = this.strumlines.defaultScale.confirm * (enemyVisuals ? enemyVisuals.scale : 1)
    const scaleStatic = this.strumlines.defaultScale.static * (enemyVisuals ? enemyVisuals.scale : 1)
    const alpha = enemyVisuals ? enemyVisuals.alpha : 1

    if (arrow) {
      // Para notas normales, hacer la animación de confirm y luego volver a static
      if (!note.isHoldNote) {
        const pos = this.getStrumlinePositions(false)[note.noteDirection]
        const confirmOffset = this.offsets.confirm
        const confirmPos = {
          x: pos.x + (confirmOffset.x || 0),
          y: pos.y + (confirmOffset.y || 0),
        }

        arrow.x = confirmPos.x
        arrow.y = confirmPos.y
        arrow.setTexture("noteStrumline", `confirm${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`)
        arrow.setScale(scaleConfirm)
        arrow.setAlpha(alpha)

        this.scene.time.delayedCall(103, () => {
          arrow.x = arrow.originalX
          arrow.y = arrow.originalY
          arrow.setTexture("noteStrumline", `static${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`)
          arrow.setScale(scaleStatic)
          arrow.setAlpha(alpha)
        })
      } else {
        // Para notas largas, solo cambiar la textura y escala, mantener posición
        arrow.setTexture("noteStrumline", `confirm${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`)
        arrow.setScale(scaleConfirm)
        arrow.setAlpha(alpha)
      }
    }

    if (this.scene.events && typeof this.scene.events.emit === "function") {
      this.scene.events.emit("enemyNoteHit", note)
    }
  }

  /**
   * Clean up a note after it has been hit or missed
   * @param {Object} note - The note to clean up
   */
  cleanUpNote(note) {
    this.noteSpawner.cleanUpNote(note);
    note.cleanedUp = true;

    // Emitir evento de nota destruida
    this.events.emit('noteDestroyed', {
      direction: note.noteDirection,
      isPlayerNote: note.isPlayerNote,
      sustainNote: note.isHoldNote,
      lastPiece: true
    });

    // Emitir evento de estado static explícitamente
    this.events.emit('strumlineStateChange', {
      direction: note.noteDirection,
      isPlayerNote: note.isPlayerNote,
      state: 'static'
    });
  }

  /**
   * Toggle bot mode
   */
  toggleBot() {
    this.botEnabled = !this.botEnabled
    console.log(`Bot ${this.botEnabled ? "enabled" : "disabled"}`)
  }

  /**
   * Gets current score, combo, max combo, notes hit, notes missed, and accuracy
   */
  getScore() {
    return this.score
  }
  getCombo() {
    return this.combo
  }
  getMaxCombo() {
    return this.maxCombo
  }
  getNotesHit() {
    return this.notesHit
  }
  getNotesMissed() {
    return this.notesMissed
  }
  getAccuracy() {
    return this.ratingManager.getResults().accuracy
  }

  /**
   * Cleans up all resources
   */
  cleanup() {
    // Limpiar timers de notas largas del enemigo
    this.enemyHoldTimers.forEach((timer) => {
      if (timer) {
        timer.remove()
      }
    })
    this.enemyHoldTimers = [null, null, null, null]

    this.noteSpawner.cleanup()
    this.playerNotes = []
    this.enemyNotes = []
    this.songNotes = []
    this.keyPressCallbacks = []
    this.keyReleaseCallbacks = []
    this.activeHoldNotes = [null, null, null, null]
    this.activeEnemyHoldNotes = [null, null, null, null]

    if (this.ratingManager) this.ratingManager.reset()
    if (this.strumlines) this.strumlines.destroyStrumlines()

    this.uiElements = []
    this.notePool = []
    this.cachedPlayerPositions = null
    this.cachedEnemyPositions = null
    this.positionsCacheValid = false

    console.log("NotesController cleanup complete")
  }

  /**
   * Get strumline positions with caching
   * @param {boolean} isPlayer - Whether to get positions for player or enemy positions
   * @return {Array} Array of positions objects
   */
  getStrumlinePositions(isPlayer = true) {
    // Cache positions to avoid recalculating every frame
    if (isPlayer && this.cachedPlayerPositions && this.positionsCacheValid) {
      return this.cachedPlayerPositions
    }
    if (!isPlayer && this.cachedEnemyPositions && this.positionsCacheValid) {
      return this.cachedEnemyPositions
    }

    const arrowWidth = 64
    const separation = 110
    const staticOffset = this.offsets.static
    let baseX, baseY

    const middleScroll = localStorage.getItem("GAMEPLAY.NOTE SETTINGS.MIDDLESCROLL") === "true"
    const downScroll = localStorage.getItem("GAMEPLAY.NOTE SETTINGS.DOWNSCROLL") === "true"
    const opponentNotes = localStorage.getItem("GAMEPLAY.NOTE SETTINGS.OPPONENT NOTES") === "true"

    if (downScroll) {
      baseY = this.scene.cameras.main.height - arrowWidth - 120
    } else {
      baseY = 40
    }

    let positions

    if (isPlayer) {
      if (middleScroll) {
        baseX = 400
      } else {
        baseX = 780
      }

      positions = this.directions.map((_, i) => ({
        x: baseX + separation * i + (staticOffset.x || 0),
        y: baseY + (staticOffset.y || 0),
      }))

      this.cachedPlayerPositions = positions
    } else {
      const enemyScale = middleScroll ? 0.8 : 1
      const enemyAlpha = !opponentNotes ? 0 : middleScroll ? 0.5 : 1
      const enemySeparation = separation * (middleScroll ? 0.7 : 1)
      baseX = 40

      this.enemyStrumlineVisuals = { scale: enemyScale, alpha: enemyAlpha }

      let enemyBaseY
      if (middleScroll && !downScroll) {
        enemyBaseY = this.scene.cameras.main.height / 2 - 200
      } else if (middleScroll && downScroll) {
        enemyBaseY = this.scene.cameras.main.height / 2 - arrowWidth + 200
      } else if (downScroll) {
        enemyBaseY = this.scene.cameras.main.height - arrowWidth - 120
      } else {
        enemyBaseY = baseY
      }

      positions = this.directions.map((_, i) => ({
        x: baseX + enemySeparation * i + (staticOffset.x || 0),
        y: enemyBaseY + (staticOffset.y || 0),
      }))

      this.cachedEnemyPositions = positions
    }

    this.positionsCacheValid = true
    return positions
  }

  /**
   * Disables input handlers
   */
  disableInputs() {
    if (this.keyPressCallbacks) {
      this.keyPressCallbacks.forEach(({ key, callback }) => key.off("down", callback))
    }
    if (this.keyReleaseCallbacks) {
      this.keyReleaseCallbacks.forEach(({ key, callback }) => key.off("up", callback))
    }
  }

  /**
   * Enables input handlers
   */
  enableInputs() {
    this.setupInputHandlers()
  }
}
