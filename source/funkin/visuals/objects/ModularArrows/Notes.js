export class NoteSpawner {
  constructor(scene, notesController) {
    this.scene = scene
    this.notesController = notesController
    this.songNotes = []
    this.speed = 1

    // Valores por defecto para escalas
    this.defaultScale = {
      notes: 0.68,
      holds: 0.68,
    }
  }

  loadNotes(songData, bpm, speed) {
    this.songNotes = []
    if (!songData) return

    this.bpm = bpm || songData.bpm || (songData.song && songData.song.bpm) || 100
    this.speed = speed || songData.speed || (songData.song && songData.song.speed) || 1

    let notesArray
    if (songData.notes && Array.isArray(songData.notes)) {
      notesArray = songData.notes
    } else if (songData.song && songData.song.notes && Array.isArray(songData.song.notes)) {
      notesArray = songData.song.notes
    } else if (Array.isArray(songData)) {
      notesArray = songData
    } else {
      return
    }

    notesArray.forEach((section, sectionIndex) => {
      if (section.sectionNotes && Array.isArray(section.sectionNotes)) {
        section.sectionNotes.forEach((noteData) => {
          const strumTime = noteData[0]
          let noteDirection = noteData[1]
          const sustainLength = noteData[2] || 0
          if (typeof noteDirection !== "number") return

          let isPlayerNote
          if (section.mustHitSection) {
            isPlayerNote = noteDirection < 4
            noteDirection = noteDirection % 4
          } else {
            isPlayerNote = noteDirection >= 4
            noteDirection = noteDirection % 4
          }

          if (noteDirection >= 0 && noteDirection <= 3) {
            this.songNotes.push({
              strumTime,
              noteDirection,
              sustainLength,
              isPlayerNote,
              sectionIndex,
              wasHit: false,
              canBeHit: false,
              tooLate: false,
              spawned: false,
              isHoldNote: sustainLength > 0,
              isBeingHeld: false,
              holdReleased: false,
              holdScoreTime: 0,
              holdSegmentsDestroyed: 0,
              holdEndPassed: false,
            })
          }
        })
      }
    })

    this.songNotes.sort((a, b) => a.strumTime - b.strumTime)
    return this.songNotes
  }

  getNotePosition(isPlayer, directionIndex) {
    const strumPos = this.notesController.getStrumlinePositions(isPlayer)[directionIndex]
    const offset = this.notesController.offsets.note
    const offsetY = -400 + (offset.y || 0)
    return {
      x: strumPos.x + (offset.x || 0),
      y: strumPos.y + offsetY,
    }
  }

  spawnNote(note) {
    if (note.cleanedUp) return
    const isPlayer = note.isPlayerNote
    const directionIndex = note.noteDirection
    const direction = this.notesController.directions[directionIndex]
    const holdColor = this.notesController.holdColors[directionIndex]
    const pos = this.getNotePosition(isPlayer, directionIndex)

    const currentTime = this.scene.songPosition
    const strumPos = this.notesController.getStrumlinePositions(isPlayer)[directionIndex]
    const timeDiff = note.strumTime - currentTime
    const scrollSpeed = 0.45 * this.speed
    const downScroll = localStorage.getItem("GAMEPLAY.NOTE SETTINGS.DOWNSCROLL") === "true"
    const noteY = downScroll ? strumPos.y - timeDiff * scrollSpeed : strumPos.y + timeDiff * scrollSpeed

    const frameKey = `note${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`
    const noteSprite = this.scene.add.sprite(pos.x, noteY, "notes", frameKey)
    noteSprite.setOrigin(0, 0)
    noteSprite.setScale(this.defaultScale.notes)
    noteSprite.setDepth(115)
    noteSprite.setName(`Note_${direction}_${note.strumTime}`)

    // --- APLICAR ESCALA Y OPACIDAD SI ES NOTA ENEMIGA Y MIDDLESCROLL ---
    if (!isPlayer && this.notesController.enemyStrumlineVisuals) {
      noteSprite.setScale(this.defaultScale.notes * this.notesController.enemyStrumlineVisuals.scale)
      noteSprite.setAlpha(this.notesController.enemyStrumlineVisuals.alpha)
    }

    if (this.scene.cameraController) {
      this.scene.cameraController.addToUILayer(noteSprite)
    }

    if (note.isHoldNote) {
      if (!this.scene.textures.exists("NOTE_hold_assets")) return

      const holdDuration = note.sustainLength
      const pixelsPerMs = 0.45 * this.speed
      const holdLength = holdDuration * pixelsPerMs
      const pieceHeight = 32 * this.defaultScale.holds
      const numPieces = Math.max(1, Math.ceil(holdLength / pieceHeight))
      note.holdSprites = []

      // Usa la posición de la strumline directamente
      const holdOffset = this.notesController.offsets.hold

      // --- INVERTIR LA DIRECCIÓN DE LAS HOLD NOTES SI DOWNSCROLL ES TRUE ---
      let holdContainerY = noteY + (holdOffset.y || 0)
      let pieceDirection = 1
      if (downScroll) {
        holdContainerY = noteY + (holdOffset.y || 0)
        pieceDirection = -1
      } else {
        holdContainerY = noteY + (holdOffset.y || 0)
        pieceDirection = 1
      }

      const holdContainer = this.scene.add.container(pos.x + (holdOffset.x || 0), holdContainerY)
      holdContainer.setDepth(noteSprite.depth - 1)
      holdContainer.setName(`HoldNote_${direction}_${note.strumTime}`)

      // --- APLICAR ESCALA Y OPACIDAD SI ES HOLD NOTE ENEMIGA Y MIDDLESCROLL ---
      let holdScale = this.defaultScale.holds
      let holdAlpha = 1
      if (!isPlayer && this.notesController.enemyStrumlineVisuals) {
        holdScale = this.defaultScale.holds * this.notesController.enemyStrumlineVisuals.scale
        holdAlpha = this.notesController.enemyStrumlineVisuals.alpha
        holdContainer.setAlpha(holdAlpha)
      }

      for (let i = 0; i < numPieces; i++) {
        const segmentY = i * pieceHeight * pieceDirection
        const pieceFrame = `${holdColor} hold piece0000`
        const holdPiece = this.scene.add
          .sprite(0, segmentY, "NOTE_hold_assets", pieceFrame)
          .setOrigin(0.5, 0)
          .setScale(holdScale)
        if (!isPlayer && this.notesController.enemyStrumlineVisuals) {
          holdPiece.setAlpha(holdAlpha)
        }
        holdContainer.add(holdPiece)
        note.holdSprites.push(holdPiece)
      }

      // El extremo final del hold
      const endY = numPieces * pieceHeight * pieceDirection
      const holdEnd = this.scene.add
        .sprite(0, endY, "NOTE_hold_assets", `${holdColor} hold end0000`)
        .setOrigin(0.5, 0)
        .setScale(holdScale)
      if (!isPlayer && this.notesController.enemyStrumlineVisuals) {
        holdEnd.setAlpha(holdAlpha)
      }
      holdContainer.add(holdEnd)
      note.holdSprites.push(holdEnd)

      note.holdContainer = holdContainer
      note.holdPieceHeight = pieceHeight // Guardar altura de pieza para cálculos

      if (this.scene.cameraController) {
        holdContainer.setScrollFactor(0)
        this.scene.cameraController.addToUILayer(holdContainer)
        holdContainer.each((sprite) => {
          if (sprite.setScrollFactor) sprite.setScrollFactor(0)
        })
      }
    }

    note.sprite = noteSprite
    note.spawned = true
  }

  updateNotes(songNotes, songPosition, speed, bpm) {
    // Leer downscroll desde localStorage
    const downScroll = localStorage.getItem("GAMEPLAY.NOTE SETTINGS.DOWNSCROLL") === "true"

    for (const note of songNotes) {
      if (note.cleanedUp) continue

      if (!note.spawned) continue
      const directionIndex = note.noteDirection
      const isPlayer = note.isPlayerNote
      const strumPos = this.notesController.getStrumlinePositions(isPlayer)[directionIndex]
      const noteOffset = this.notesController.offsets.note
      const holdOffset = this.notesController.offsets.hold
      const timeDiff = note.strumTime - songPosition
      const scrollSpeed = 0.45 * speed * (bpm / 100)

      // Si downscroll es true, invertir la dirección del movimiento de la nota
      let noteY
      if (downScroll) {
        noteY = strumPos.y - timeDiff * scrollSpeed
      } else {
        noteY = strumPos.y + timeDiff * scrollSpeed
      }

      if (note.sprite?.active) {
        note.sprite.x = strumPos.x + (noteOffset.x || 0)
        note.sprite.y = noteY + (noteOffset.y || 0)
      }
      if (note.isHoldNote && note.holdContainer?.active) {
        note.holdContainer.x = strumPos.x + (holdOffset.x || 0)
        note.holdContainer.y = noteY + (holdOffset.y || 0)
      }
    }
  }

  cleanUpNote(note) {
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
    if (note.holdContainer?.active) {
      note.holdContainer.destroy()
      note.holdContainer = null
    }
    if (note.isHoldNote) {
      note.isBeingHeld = false
      note.enemyHoldActive = false
      note.holdReleased = true
      note.holdEndPassed = true
    }
    note.wasHit = true
    note.tooLate = true
    note.cleanedUp = true
  }

  cleanup() {
    this.songNotes.forEach((note) => {
      this.cleanUpNote(note)
    })
    this.songNotes = []
  }
}
