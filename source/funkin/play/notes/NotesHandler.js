import { NoteSpawner } from "./NoteSpawner.js"
import { Parser } from "./parser.js"
import { Strumline } from "./Strumline.js"
import { NoteDirection } from "./NoteDirection.js"
import { SustainNote } from "./SustainNote.js"
import { BotAutoHandler } from "./bot.js"
import { PlayerJudgement } from "../judgments/PlayerJudgement.js"
import { HitWindow } from "../judgments/HitWindow.js"

export class NotesHandler {
  // [MODIFICADO] Acepta sessionId
  constructor(scene, chartData, ratingManager, conductor, sessionId) {
    this.scene = scene
    this.sessionId = sessionId // Guardar ID de sesión
    
    this.mainUICADContainer = scene.add.layer(0, 0)
    this.chartData = chartData
    
    // Pasar sessionId a setupStrumlines
    const strumlines = Strumline.setupStrumlines(scene, this.sessionId)
    this.playerStrums = strumlines.player
    this.enemyStrums = strumlines.enemy

    this.playerStrums.forEach((strum) => this.mainUICADContainer.add(strum))
    this.enemyStrums.forEach((strum) => this.mainUICADContainer.add(strum))

    this.parsedNotes = Parser.parseNotes(chartData)
    this.playerNotesGroup = scene.add.group()
    this.enemyNotesGroup = scene.add.group()
    this.holdGroup = scene.add.group()
    this.noteScale = 0.7
    this.noteOffsetX = 21
    this.bpm = conductor.bpm || 100
    this.speed = chartData.speed || 1
    this.scrollSpeedMultiplier = 0.3
    this.spawnLeadTime = 2000 / this.speed
    this.activeInput = { 0: false, 1: false, 2: false, 3: false }
    this.activeHolds = { 0: null, 1: null, 2: null, 3: null }

    this.charactersHandler = null
    this.bot = new BotAutoHandler(this, true)

    this.ratingManager = ratingManager

    this._initGameplayInputHandling()
  }

  // [MODIFICADO] Acepta sessionId para preload
  static preload(scene, sessionId) {
    NoteSpawner.preload(scene, sessionId)
    Strumline.preload(scene, sessionId)
    SustainNote.preload(scene, sessionId)

    scene.load.audio("missnote1", "public/sounds/gameplay/miss/missnote1.ogg")
    scene.load.audio("missnote2", "public/sounds/gameplay/miss/missnote2.ogg")
    scene.load.audio("missnote3", "public/sounds/gameplay/miss/missnote3.ogg")
  }

  /**
   * @param {import('../characters/Characters.js').Characters} handler
   */
  setCharactersHandler(handler) {
    this.charactersHandler = handler
    if (this.bot) {
      this.bot.setCharactersHandler(handler)
    }
  }

  _initGameplayInputHandling() {
    const keyMap = {
      A: NoteDirection.LEFT,
      S: NoteDirection.DOWN,
      W: NoteDirection.UP,
      D: NoteDirection.RIGHT,
      LEFT: NoteDirection.LEFT,
      DOWN: NoteDirection.DOWN,
      UP: NoteDirection.UP,
      RIGHT: NoteDirection.RIGHT,
    }
    this.gameplayInputListeners = this.gameplayInputListeners || []
    Object.keys(keyMap).forEach((keyName) => {
      const direction = keyMap[keyName]
      const keyObj = this.scene.input.keyboard.addKey(keyName)

      const onGameplayDown = () => {
        if (this.bot && this.bot.isPlayerBotActive) return
        if (!this.activeInput[direction]) {
          this.activeInput[direction] = true
          this.onStrumPressed(direction)
        }
      }
      const onGameplayUp = () => {
        if (this.bot && this.bot.isPlayerBotActive) return
        if (this.activeInput[direction]) {
          this.activeInput[direction] = false
          this.onStrumReleased(direction)
        }
      }

      keyObj.on("down", onGameplayDown)
      keyObj.on("up", onGameplayUp)
      this.gameplayInputListeners.push({ keyObj, downHandler: onGameplayDown, upHandler: onGameplayUp })
    })

    const bKey = this.scene.input.keyboard.addKey("B")
    const onBotKey = () => {
      if (this.bot) this.bot.togglePlayerBot()
    }
    bKey.on("down", onBotKey)
    this.gameplayInputListeners.push({ keyObj: bKey, downHandler: onBotKey, upHandler: () => {} })
  }

  _shutdownGameplayInputHandling() {
    if (this.gameplayInputListeners) {
      this.gameplayInputListeners.forEach(({ keyObj, downHandler, upHandler }) => {
        keyObj.off("down", downHandler)
        keyObj.off("up", upHandler)
      })
      this.gameplayInputListeners = []
    }
  }

  update(songPosition) {
    if (!this.scene) {
      return
    }

    this.spawnNotesInRange(songPosition)
    this.updateNotePositions(songPosition)

    if (this.bot && !this.bot.isPlayerBotActive) {
      const missedResults = PlayerJudgement.checkMisses(songPosition, this.playerNotesGroup, this.activeHolds)
      missedResults.forEach((miss) => {
        this.missNote(miss.noteSprite, miss.noteData, miss.timeDiff)
      })
    }

    this.updateActiveHolds(songPosition)

    if (this.bot) {
      this.bot.update(songPosition)
    }
  }

  spawnNotesInRange(songPosition) {
    const scrollSpeedValue = this.scrollSpeedMultiplier * this.speed * (this.bpm / 100)

    for (const noteData of this.parsedNotes) {
      if (
        noteData.spawned ||
        noteData.strumTime > songPosition + this.spawnLeadTime ||
        noteData.strumTime < songPosition - 1500
      )
        continue

      noteData.spawned = true
      const strumlineToUse = noteData.isPlayerNote ? this.playerStrums : this.enemyStrums
      const group = noteData.isPlayerNote ? this.playerNotesGroup : this.enemyNotesGroup

      // Pasar sessionId a NoteSpawner
      const noteSprite = NoteSpawner.spawnNoteSprite(
        this.scene,
        noteData,
        this.noteScale,
        strumlineToUse,
        this.noteOffsetX,
        this.sessionId
      )
      if (!noteSprite) continue

      group.add(noteSprite)

      this.mainUICADContainer.add(noteSprite)

      noteSprite.setVisible(true)
      this.calculateInitialNotePosition(noteSprite, songPosition)

      if (noteData.isHoldNote) {
        // Pasar sessionId a SustainNote
        const holdContainer = SustainNote.spawnHoldSprites(
          this.scene,
          noteData,
          this.noteScale,
          noteSprite,
          scrollSpeedValue,
          this.sessionId
        )
        if (holdContainer) {
          noteData.holdSpriteRef = holdContainer
          this.holdGroup.add(holdContainer)

          this.mainUICADContainer.add(holdContainer)
        }
      }
    }
  }

  calculateInitialNotePosition(noteSprite, songPosition) {
    const noteData = noteSprite.noteData
    const strumlineToUse = noteData.isPlayerNote ? this.playerStrums : this.enemyStrums
    const targetStrum = strumlineToUse[noteData.noteDirection]
    if (!targetStrum) return

    const targetY = targetStrum.y
    const timeDiff = noteData.strumTime - songPosition
    const scrollSpeed = this.scrollSpeedMultiplier * this.speed * (this.bpm / 100)
    const downScroll = false
    noteSprite.y = downScroll ? targetY - timeDiff * scrollSpeed : targetY + timeDiff * scrollSpeed

    const strumWidth = targetStrum.width || 150 * this.noteScale
    noteSprite.x = targetStrum.x + strumWidth / 2 + this.noteOffsetX
  }

  updateNotePositions(songPosition) {
    const scrollSpeed = this.scrollSpeedMultiplier * this.speed * (this.bpm / 100)
    const downScroll = false

    const updateGroup = (group, strums) => {
      group.getChildren().forEach((noteSprite) => {
        if (!noteSprite.active || !noteSprite.noteData) return
        const noteData = noteSprite.noteData
        const targetStrum = strums[noteData.noteDirection]
        if (!targetStrum) return
        const targetY = targetStrum.y
        const timeDiff = noteData.strumTime - songPosition
        const newY = downScroll ? targetY - timeDiff * scrollSpeed : targetY + timeDiff * scrollSpeed

        const strumWidth = targetStrum.width || 150 * this.noteScale
        const newX = targetStrum.x + strumWidth / 2 + this.noteOffsetX

        noteSprite.setPosition(newX, newY)
      })
    }
    updateGroup(this.playerNotesGroup, this.playerStrums)
    updateGroup(this.enemyNotesGroup, this.enemyStrums)

    this.holdGroup.getChildren().forEach((holdContainer) => {
      if (!holdContainer.active || !holdContainer.noteData) return

      const noteData = holdContainer.noteData
      const strums = noteData.isPlayerNote ? this.playerStrums : this.enemyStrums
      const targetStrum = strums[noteData.noteDirection]
      if (!targetStrum) return

      const targetY = targetStrum.y
      const timeDiff = noteData.strumTime - songPosition
      const newY = downScroll ? targetY - timeDiff * scrollSpeed : targetY + timeDiff * scrollSpeed

      const strumWidth = targetStrum.width || 150 * this.noteScale
      const newX = targetStrum.x + strumWidth / 2 + this.noteOffsetX

      holdContainer.setPosition(newX, newY)
    })
  }

  updateActiveHolds(songPosition) {
    const downScroll = false

    this.holdGroup.getChildren().forEach((holdContainer) => {
      if (!holdContainer.active || !holdContainer.noteData) return

      const noteData = holdContainer.noteData

      if (!noteData.isBeingHeld || noteData.holdEndPassed) return

      const strums = noteData.isPlayerNote ? this.playerStrums : this.enemyStrums
      const targetStrum = strums[noteData.noteDirection]
      if (!targetStrum) return

      const strumCenterY = targetStrum.y
      const holdSprites = holdContainer.holdSprites || []

      for (let i = noteData.holdSegmentsDestroyed || 0; i < holdSprites.length; i++) {
        const piece = holdSprites[i]
        if (!piece || !piece.active) continue

        const pieceTopWorldY = holdContainer.y + piece.y - 24
        const crossedCenter = !downScroll && pieceTopWorldY <= strumCenterY + 3

        if (crossedCenter) {
          piece.destroy()
          holdSprites[i] = null
          noteData.holdSegmentsDestroyed = i + 1

          if (i === holdSprites.length - 1) {
            noteData.holdPassed = true

            if (noteData.isPlayerNote) {
              const direction = noteData.noteDirection
              if (this.activeInput[direction]) {
                Strumline.playPressAnimation(this.playerStrums, Number.parseInt(direction, 10))
              } else {
                Strumline.setStaticFrame(this.playerStrums, Number.parseInt(direction, 10))
                this.activeHolds[direction] = null
              }
            }
          }
        } else {
          break
        }
      }
    })
  }

  onStrumPressed(direction) {
    if (!this.activeHolds[direction]) {
      Strumline.playPressAnimation(this.playerStrums, direction)
    }
    const songPosition = this.scene.songAudio?.inst?.seek * 1000 ?? 0

    const result = PlayerJudgement.judgeInput(direction, songPosition, this.playerNotesGroup)

    if (result.note) {
      if (result.rating === "miss") {
        this.missNote(result.note, null, result.timeDiff)
      } else {
        this.hitNote(result.note, result.rating, result.timeDiff)
      }
    }
  }

  onStrumReleased(direction) {
    const activeHoldData = this.activeHolds[direction]?.noteData

    if (activeHoldData && !activeHoldData.holdEndPassed) {
      const songPosition = (this.scene && this.scene.songAudio?.inst?.seek * 1000) ?? 0
      const noteEndTime = activeHoldData.strumTime + activeHoldData.sustainLength
      const timeDiffFromEnd = noteEndTime - songPosition

      if (timeDiffFromEnd <= HitWindow.SHIT_WINDOW_MS) {
        this.releaseHold(direction, false)
      } else {
        this.releaseHold(direction, true) // true = wasReleasedEarly
      }
    } else if (activeHoldData && activeHoldData.holdEndPassed) {
      this.releaseHold(direction, false)
    } else {
      Strumline.setStaticFrame(this.playerStrums, direction)
    }
  }

  hitNote(noteSprite, rating, timeDiff) {
    if (!noteSprite || !noteSprite.active || !noteSprite.noteData || noteSprite.noteData.wasHit) return

    const noteData = noteSprite.noteData
    const originalNoteData = this.findParsedNote(noteData.strumTime, noteData.noteDirection, noteData.isPlayerNote)
    if (originalNoteData) originalNoteData.wasHit = true
    noteData.wasHit = true

    if (this.charactersHandler) {
      this.charactersHandler.playSingAnimation(true, noteData.noteDirection)
    }

    if (this.scene && this.scene.popUpManager) {
      this.scene.popUpManager.popUpScore(rating)
    }

    if (this.ratingManager) {
      this.ratingManager.processHit(rating, timeDiff)
    }

    if (noteData.isHoldNote) {
      noteData.isBeingHeld = true
      noteData.holdReleased = false
      this.activeHolds[noteData.noteDirection] = { noteData: originalNoteData }
      Strumline.playConfirmAnimation(this.playerStrums, noteData.noteDirection, true)

      this.playerNotesGroup.remove(noteSprite, false, false)
      noteSprite.setVisible(false)

      if (originalNoteData) originalNoteData.spriteRef = noteSprite
    } else {
      Strumline.playConfirmAnimation(this.playerStrums, noteData.noteDirection, false)
      this.playerNotesGroup.remove(noteSprite, true, true)
    }
  }

  releaseHold(direction, wasReleasedEarly) {
    const holdRef = this.activeHolds[direction]
    if (!holdRef || !holdRef.noteData) return
    const noteData = holdRef.noteData

    noteData.isBeingHeld = false
    this.activeHolds[direction] = null
    Strumline.setStaticFrame(this.playerStrums, direction)

    if (wasReleasedEarly) {
      noteData.holdReleased = true
      this.missNote(null, noteData, Number.POSITIVE_INFINITY)
    } else {
      noteData.holdReleased = false
      if (noteData.spriteRef) {
        noteData.spriteRef.destroy()
        noteData.spriteRef = null
      }
    }
  }

  missNote(noteSprite, noteData = null, timeDiff = null) {
    if (!this.scene) {
      return
    }

    const dataToUse = noteData || noteSprite?.noteData
    if (!dataToUse || dataToUse.tooLate) return

    if (this.ratingManager) {
      this.ratingManager.processMiss()
    }

    dataToUse.tooLate = true

    if (this.charactersHandler) {
      this.charactersHandler.playMissAnimation(true, dataToUse.noteDirection)
    }

    if (this.scene && this.scene.popUpManager) {
      this.scene.popUpManager.popUpScore("miss")
    }

    const missSoundKey = `missnote${Phaser.Math.Between(1, 3)}`
    if (this.scene.cache && this.scene.cache.audio && this.scene.cache.audio.has(missSoundKey)) {
      this.scene.sound.play(missSoundKey, { volume: 0.6 })
    }

    const originalNoteData = this.findParsedNote(dataToUse.strumTime, dataToUse.noteDirection, dataToUse.isPlayerNote)

    if (originalNoteData) originalNoteData.tooLate = true
    if (noteSprite?.noteData) noteSprite.noteData.tooLate = true

    if (dataToUse.isHoldNote && this.activeHolds[dataToUse.noteDirection]?.noteData === originalNoteData) {
      this.activeHolds[dataToUse.noteDirection] = null
      Strumline.setStaticFrame(this.playerStrums, dataToUse.noteDirection)
    }

    const noteHeadSprite = noteSprite || originalNoteData?.spriteRef || noteData?.spriteRef
    const holdContainer = originalNoteData?.holdSpriteRef || noteData?.holdSpriteRef

    const isLateMiss = timeDiff === null || timeDiff >= 0
    const missTint = 0x808080
    const missAlpha = 0.8

    if (isLateMiss) {
      if (noteHeadSprite && noteHeadSprite.active) {
        noteHeadSprite.setTint(missTint)
        noteHeadSprite.setAlpha(missAlpha)
      }
      if (holdContainer && holdContainer.active) {
        holdContainer.setAlpha(missAlpha)
        if (holdContainer.holdSprites) {
          holdContainer.holdSprites.forEach((piece) => {
            if (piece && piece.active) {
              piece.setTint(missTint)
            }
          })
        }
      }
    } else {
      if (holdContainer && holdContainer.active) {
        this.holdGroup.remove(holdContainer, true, true)
        if (originalNoteData) originalNoteData.holdSpriteRef = null
        if (noteData) noteData.holdSpriteRef = null
      }

      if (noteHeadSprite && noteHeadSprite.active) {
        const group = dataToUse.isPlayerNote ? this.playerNotesGroup : this.enemyNotesGroup
        group.remove(noteHeadSprite, true, true)
      } else if (originalNoteData?.spriteRef) {
        originalNoteData.spriteRef.destroy()
        originalNoteData.spriteRef = null
      } else if (noteData?.spriteRef) {
        noteData.spriteRef.destroy()
        noteData.spriteRef = null
      }
    }
  }

  findParsedNote(strumTime, direction, isPlayerNote) {
    const found = this.parsedNotes.find(
      (note) => note.strumTime === strumTime && note.noteDirection === direction && note.isPlayerNote === isPlayerNote,
    )
    if (found) return found

    return this.parsedNotes.find(
      (note) =>
        note.strumTime === strumTime &&
        note.noteDirection === direction &&
        note.isPlayerNote === isPlayerNote &&
        !note.wasHit,
    )
  }

  shutdown() {
    if (this.bot) {
      this.bot.shutdown()
      this.bot = null
    }

    this._shutdownGameplayInputHandling()

    if (this.mainUICADContainer) {
      this.mainUICADContainer.destroy(true)
      this.mainUICADContainer = null
    }

    this.charactersHandler = null
    this.ratingManager = null
    this.scene = null

    // Destroy all note groups
    if (this.playerNotesGroup) {
      this.playerNotesGroup.clear(true, true)
      this.playerNotesGroup.destroy()
      this.playerNotesGroup = null
    }
    if (this.enemyNotesGroup) {
      this.enemyNotesGroup.clear(true, true)
      this.enemyNotesGroup.destroy()
      this.enemyNotesGroup = null
    }
    if (this.holdGroup) {
      this.holdGroup.clear(true, true)
      this.holdGroup.destroy()
      this.holdGroup = null
    }

    // [MODIFICADO] Limpieza con sessionId
    // Se eliminan las texturas específicas de esta sesión
    const texturesToClean = [
        `${NoteSpawner.ATLAS_KEY}_${this.sessionId}`, 
        `${Strumline.ATLAS_KEY}_${this.sessionId}`, 
        `${SustainNote.ATLAS_KEY}_${this.sessionId}`
    ];

    if (this.scene && this.scene.anims) {
        // Eliminar animaciones asociadas
        // (Como las animaciones usan la key de la textura, podemos filtrar por ella)
        const anims = this.scene.anims.anims.entries;
        const animKeysToRemove = [];
        for (const [key, anim] of Object.entries(anims)) {
            if (anim.frames && anim.frames.length > 0) {
                 const textureKey = anim.frames[0].textureKey; 
                 if (texturesToClean.includes(textureKey)) {
                     animKeysToRemove.push(key);
                 }
            }
        }
        animKeysToRemove.forEach(key => this.scene.anims.remove(key));
    }

    if (this.scene && this.scene.textures) {
        texturesToClean.forEach(key => {
            if (this.scene.textures.exists(key)) {
                this.scene.textures.remove(key);
                console.log(`Limpiada textura de nota: ${key}`);
            }
            if (this.scene.cache.xml.exists(key)) {
                 this.scene.cache.xml.remove(key);
            }
        });
    }

    this.playerStrums = []
    this.enemyStrums = []
    this.parsedNotes = []
    this.activeHolds = { 0: null, 1: null, 2: null, 3: null }
    console.log("NotesHandler shutdown complete (and session notes textures cleaned)")
  }
}