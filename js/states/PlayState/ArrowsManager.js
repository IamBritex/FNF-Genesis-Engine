export class ArrowsManager {
    constructor(scene) {
      this.scene = scene
      this.playerArrows = []
      this.enemyArrows = []
      this.movingNotes = [] // Almacenar las notas móviles
      this.bpm = 100 // BPM por defecto
      this.speed = 1 // Velocidad por defecto
      this.scrollSpeed = 1 // Velocidad de desplazamiento de las notas
      this.songPosition = 0 // Tiempo actual de la canción
      this.startYOffset = 200 // Margen para que las notas aparezcan más abajo
      this.noteLeadTime = 1000 // Tiempo de anticipación (en milisegundos)
  
      // Configuraciones de las flechas del jugador
      this.playerArrowConfigs = [
        { texture: "staticLeft0001", x: 799, y: 100, scaleX: 0.68, scaleY: 0.68, rotation: 0 }, // Morado: Izquierda
        { texture: "staticDown0001", x: 899, y: 100, scaleX: 0.68, scaleY: 0.68, rotation: 0 }, // Azul: Abajo
        { texture: "staticUp0001", x: 999, y: 100, scaleX: 0.68, scaleY: 0.68, rotation: 0 }, // Verde: Arriba
        { texture: "staticRight0001", x: 1099, y: 100, scaleX: 0.68, scaleY: 0.68, rotation: 0 }, // Rojo: Derecha
      ]
  
      // Configuraciones de las flechas del enemigo
      this.enemyArrowConfigs = [
        { texture: "staticLeft0001", x: 99, y: 100, scaleX: 0.68, scaleY: 0.68, rotation: 0 }, // Morado: Izquierda
        { texture: "staticDown0001", x: 199, y: 100, scaleX: 0.68, scaleY: 0.68, rotation: 0 }, // Azul: Abajo
        { texture: "staticUp0001", x: 299, y: 100, scaleX: 0.68, scaleY: 0.68, rotation: 0 }, // Verde: Arriba
        { texture: "staticRight0001", x: 399, y: 100, scaleX: 0.68, scaleY: 0.68, rotation: 0 }, // Rojo: Derecha
      ]
  
      // Referencia a las flechas del jugador
      this.playerArrowsRefs = []
  
      // Estado de las teclas presionadas
      this.keysPressed = {
        left: false,
        down: false,
        up: false,
        right: false,
      }
  
      // Configuración de puntuación
      this.score = 0
      this.combo = 0
      this.maxCombo = 0
      this.misses = 0
  
      // Ratings
      this.ratings = {
        sick: { score: 350, timing: 45, count: 0 },
        good: { score: 200, timing: 90, count: 0 },
        bad: { score: 100, timing: 135, count: 0 },
        shit: { score: 50, timing: 180, count: 0 },
      }
  
      // Textos de puntuación
      this.scoreText = null
      this.comboText = null
      this.ratingText = null
  
      // Notas procesadas para evitar doble conteo
      this.processedNotes = new Set()
  
      // Animaciones
      this.arrowAnimations = {
        left: { confirm: [], press: [] },
        down: { confirm: [], press: [] },
        up: { confirm: [], press: [] },
        right: { confirm: [], press: [] },
      }
  
      // Sonidos
      this.hitSounds = {
        sick: null,
        good: null,
        bad: null,
        shit: null,
        miss: null,
      }
  
      // Sustain notes activas
      this.activeSustains = {
        left: null,
        down: null,
        up: null,
        right: null,
      }
    }
  
    createPlayerArrows() {
      this._createArrows(this.playerArrowConfigs, this.playerArrows, "Jugador")
      this.playerArrowsRefs = this.playerArrows // Guardar referencia a las flechas del jugador
  
      // Configurar las animaciones para cada flecha
      this.setupArrowAnimations()
  
      // Configurar los textos de puntuación
      this.setupScoreTexts()
  
      // Configurar los sonidos
      this.setupSounds()
  
      // Configurar los controles
      this.setupControls()
    }
  
    createEnemyArrows() {
      this._createArrows(this.enemyArrowConfigs, this.enemyArrows, "Enemigo")
    }
  
    _createArrows(configs, arrowArray, type) {
      if (!configs || configs.length === 0) {
        console.error(`No se encontraron configuraciones para las flechas del ${type}.`)
        return
      }
  
      configs.forEach((config, index) => {
        const { texture, x, y, scaleX, scaleY, rotation } = config
        const arrow = this.scene.add.sprite(x, y, "noteStrumline", texture)
        if (!arrow) {
          console.error(`Error al crear la flecha del ${type}: ${texture}`)
          return
        }
  
        arrow.setScale(scaleX, scaleY)
        arrow.setRotation(rotation)
        arrowArray.push(arrow)
  
        console.log(
          `Flecha del ${type} creada: ${texture} en (${x}, ${y}) con escala (${scaleX}, ${scaleY}) y rotación ${rotation}`,
        )
      })
    }
  
    setupArrowAnimations() {
      // Definir los frames para cada animación
      const directions = ["left", "down", "up", "right"]
  
      directions.forEach((direction, index) => {
        // Crear animaciones de confirmación (cuando se presiona correctamente)
        const confirmFrames = []
        for (let i = 1; i <= 3; i++) {
          confirmFrames.push(`confirm${direction.charAt(0).toUpperCase() + direction.slice(1)}000${i}`)
        }
        this.arrowAnimations[direction].confirm = confirmFrames
  
        // Crear animaciones de presión (cuando se presiona sin nota)
        const pressFrames = []
        for (let i = 1; i <= 2; i++) {
          pressFrames.push(`press${direction.charAt(0).toUpperCase() + direction.slice(1)}000${i}`)
        }
        this.arrowAnimations[direction].press = pressFrames
      })
    }
  
    setupScoreTexts() {
      // Crear textos de puntuación
      this.scoreText = this.scene.add
        .text(10, 10, "Score: 0", {
          fontFamily: "Arial",
          fontSize: "24px",
          color: "#FFFFFF",
        })
        .setDepth(10)
  
      this.comboText = this.scene.add
        .text(10, 40, "Combo: 0", {
          fontFamily: "Arial",
          fontSize: "24px",
          color: "#FFFFFF",
        })
        .setDepth(10)
  
      this.ratingText = this.scene.add
        .text(this.scene.scale.width / 2, 200, "", {
          fontFamily: "Arial",
          fontSize: "36px",
          color: "#FFFFFF",
        })
        .setOrigin(0.5, 0.5)
        .setDepth(10)
  
      // Hacer que el texto de rating desaparezca después de un tiempo
      this.ratingText.setAlpha(0)
    }
  
    setupSounds() {
      // Cargar sonidos si están disponibles en el juego
      if (this.scene.cache.audio.exists("hitSick")) {
        this.hitSounds.sick = this.scene.sound.add("hitSick")
      }
  
      if (this.scene.cache.audio.exists("hitGood")) {
        this.hitSounds.good = this.scene.sound.add("hitGood")
      }
  
      if (this.scene.cache.audio.exists("hitBad")) {
        this.hitSounds.bad = this.scene.sound.add("hitBad")
      }
  
      if (this.scene.cache.audio.exists("hitShit")) {
        this.hitSounds.shit = this.scene.sound.add("hitShit")
      }
  
      if (this.scene.cache.audio.exists("miss")) {
        this.hitSounds.miss = this.scene.sound.add("miss")
      }
    }
  
    setupControls() {
      // Configurar los controles del teclado
      const keys = this.scene.input.keyboard.addKeys({
        left: "LEFT",
        down: "DOWN",
        up: "UP",
        right: "RIGHT",
        a: "A", // Tecla A para izquierda (WASD)
        s: "S", // Tecla S para abajo (WASD)
        w: "W", // Tecla W para arriba (WASD)
        d: "D", // Tecla D para derecha (WASD)
      })
  
      // Configurar eventos de tecla presionada
      const directions = ["left", "down", "up", "right"]
      const wasdKeys = ["a", "s", "w", "d"]
  
      directions.forEach((direction, index) => {
        // Flecha direccional
        keys[direction].on("down", () => {
          this.handleKeyPress(index)
        })
  
        keys[direction].on("up", () => {
          this.handleKeyRelease(index)
        })
  
        // Tecla WASD
        keys[wasdKeys[index]].on("down", () => {
          this.handleKeyPress(index)
        })
  
        keys[wasdKeys[index]].on("up", () => {
          this.handleKeyRelease(index)
        })
      })
    }
  
    loadNotes(notes, bpm = 100, speed = 1) {
      console.log("Notas cargadas:", notes)
      this.bpm = bpm
      this.speed = speed
      this.scrollSpeed = speed * 0.45 // Ajustar la velocidad de desplazamiento según el speed
  
      if (!Array.isArray(notes)) {
        console.error("Error: notes no es un array", notes)
        return
      }
  
      // Extraer las notas de cada sección y agregar el valor de mustHitSection
      this.movingNotes = notes.flatMap((section) => {
        return section.sectionNotes.map((note) => {
          return [...note, section.mustHitSection] // Agregar mustHitSection a cada nota
        })
      })
  
      console.log("Notas extraídas:", this.movingNotes)
  
      // Renderizar las notas móviles
      this.renderMovingNotes()
    }
  
    renderMovingNotes() {
      this.movingNotes.forEach((note) => {
        const [time, direction, sustain, mustHitSection] = note
  
        // Determinar si la nota es para el jugador o el enemigo
        const isPlayerNote = mustHitSection
  
        // Obtener la textura correcta según la dirección
        const texture = this.getTextureFromDirection(direction)
  
        // Crear la nota móvil
        const noteSprite = this.scene.add.sprite(0, 0, "notes", texture)
        noteSprite.setScale(0.68, 0.68)
  
        // Calcular la posición inicial en Y (comenzar desde abajo con un margen)
        const startY = this.scene.scale.height + this.startYOffset
        noteSprite.y = startY
  
        // Calcular la posición en X según la dirección y si es para el jugador o el enemigo
        noteSprite.x = this.getXPositionFromDirection(direction, isPlayerNote)
  
        // Si es una nota larga, crear múltiples hold pieces y un hold end
        if (sustain > 0) {
          const holdPieceTexture = this.getHoldPieceTextureFromDirection(direction)
          const holdEndTexture = this.getHoldEndTextureFromDirection(direction)
  
          // Crear el hold end
          const holdEnd = this.scene.add.sprite(noteSprite.x, noteSprite.y, "NOTE_hold_assets", holdEndTexture)
          holdEnd.setScale(0.68, 0.68)
  
          // Almacenar el hold end en la nota
          note.holdEnd = holdEnd
  
          // Crear múltiples hold pieces
          const holdPieces = []
          const holdPieceHeight = 30 // Nueva altura de cada hold piece
          const overlap = 2 // Cantidad de superposición entre hold pieces (ajusta según sea necesario)
          const numHoldPieces = Math.ceil(sustain / (holdPieceHeight - overlap)) // Número de hold pieces necesarios
  
          for (let i = 0; i < numHoldPieces; i++) {
            const holdPiece = this.scene.add.sprite(noteSprite.x, noteSprite.y, "NOTE_hold_assets", holdPieceTexture)
            holdPiece.setScale(0.68, 0.68)
  
            // Ajustar la posición Y de cada hold piece para que se superpongan ligeramente
            holdPiece.y = noteSprite.y + i * (holdPieceHeight - overlap)
  
            // Establecer un z-index más bajo para las hold pieces
            holdPiece.setDepth(1) // Las hold pieces estarán detrás de las notas normales
  
            holdPieces.push(holdPiece)
          }
  
          // Almacenar los hold pieces en la nota
          note.holdPieces = holdPieces
        }
  
        // Establecer un z-index más alto para las notas normales
        noteSprite.setDepth(2) // Las notas normales estarán sobre las hold pieces
  
        // Almacenar la nota para actualizarla en el método update
        note.sprite = noteSprite
        note.startY = startY
        note.isPlayerNote = isPlayerNote
        note.strumTime = time
        note.direction = direction
        note.hit = false
        note.missed = false
        note.sustainActive = false
        note.sustainHitTime = 0 // Tiempo en que se activó la sustain
        note.processedPieces = new Set() // Para rastrear qué piezas ya se han procesado
      })
    }
  
    update(songPosition) {
      this.songPosition = songPosition
  
      // Actualizar las notas móviles
      this.updateMovingNotes()
  
      // Verificar notas perdidas
      this.checkMissedNotes()
  
      // Actualizar las animaciones de las flechas del jugador
      this.updateArrowAnimations()
  
      // Actualizar los textos de puntuación
      this.updateScoreTexts()
    }
  
    updateMovingNotes() {
      this.movingNotes.forEach((note) => {
        const [time, direction, sustain, mustHitSection] = note
        const noteSprite = note.sprite
  
        if (!noteSprite || noteSprite.destroyed) return
  
        // Calcular la posición Y de la nota basada en el tiempo de la canción
        let strumY = 100 // Default value
        if (direction >= 0 && direction < 4) {
          if (mustHitSection && this.playerArrowConfigs && this.playerArrowConfigs[direction]) {
            strumY = this.playerArrowConfigs[direction].y
          } else if (!mustHitSection && this.enemyArrowConfigs && this.enemyArrowConfigs[direction]) {
            strumY = this.enemyArrowConfigs[direction].y
          }
        }
        const noteY = strumY + (time - this.songPosition) * this.scrollSpeed
  
        // Actualizar la posición de la nota - SIEMPRE se mueve, incluso si fue golpeada o fallada
        noteSprite.y = noteY
  
        // Si es una nota larga, actualizar la posición de los hold pieces y el hold end
        if (sustain > 0) {
          const holdPieces = note.holdPieces
          const holdEnd = note.holdEnd
  
          if (holdPieces && holdPieces.length > 0) {
            const holdPieceHeight = 30 // Nueva altura de cada hold piece
            const overlap = 2 // Cantidad de superposición entre hold pieces (ajusta según sea necesario)
  
            // Actualizar la posición de cada hold piece
            holdPieces.forEach((holdPiece, index) => {
              if (holdPiece && !holdPiece.destroyed) {
                holdPiece.y = noteY + index * (holdPieceHeight - overlap)
              }
            })
  
            // Colocar el hold end justo debajo de la última hold piece
            if (holdEnd && !holdEnd.destroyed) {
              holdEnd.y = noteY + holdPieces.length * (holdPieceHeight - overlap)
            }
          }
  
          // Si la nota ya fue golpeada y la tecla sigue presionada, continuar la sustain
          if (note.hit && note.sustainActive) {
            this.updateSustainNote(note, strumY)
          }
        }
  
        // Verificar si la nota está fuera de la pantalla (para optimización)
        if (noteY < -100 || noteY > this.scene.scale.height + 100) {
          // Si la nota ya pasó y no fue golpeada, contarla como perdida
          if (noteY < -100 && !note.hit && !note.missed && mustHitSection) {
            this.missNote(note)
          }
        }
      })
    }
  
    checkMissedNotes() {
      // Verificar notas que ya pasaron y no fueron golpeadas
      this.movingNotes.forEach((note) => {
        const [time, direction, sustain, mustHitSection] = note
  
        // Solo procesar notas del jugador que no han sido golpeadas o marcadas como perdidas
        if (!mustHitSection || note.hit || note.missed) return
  
        // Si la nota ya pasó el tiempo de golpeo y no fue golpeada
        if (time < this.songPosition - this.ratings.shit.timing && !note.hit && !note.missed) {
          this.missNote(note)
        }
      })
    }
  
    missNote(note) {
      if (note.missed) return // Evitar contar la misma nota dos veces
  
      note.missed = true
      this.misses++
      this.combo = 0
  
      // Reproducir sonido de fallo
      if (this.hitSounds.miss) {
        this.hitSounds.miss.play()
      }
  
      // Mostrar texto de "Miss"
      this.showRatingText("MISS", "#FF0000")
  
      // Reducir la opacidad de la nota pero NO detenerla
      if (note.sprite && !note.sprite.destroyed) {
        note.sprite.setAlpha(0.3)
        // NO modificamos la velocidad, la nota sigue su camino
      }
  
      // Si es una nota larga, reducir la opacidad de los hold pieces y el hold end
      if (note.holdPieces) {
        note.holdPieces.forEach((piece) => {
          if (piece && !piece.destroyed) {
            piece.setAlpha(0.3)
          }
        })
      }
  
      if (note.holdEnd && !note.holdEnd.destroyed) {
        note.holdEnd.setAlpha(0.3)
      }
  
      console.log("Nota perdida en tiempo:", this.songPosition)
    }
  
    handleKeyPress(direction) {
      // Actualizar el estado de la tecla
      const directionName = ["left", "down", "up", "right"][direction]
      this.keysPressed[directionName] = true
  
      // Verificar si hay una nota para golpear
      const noteToHit = this.findNoteToHit(direction)
  
      if (noteToHit) {
        // Golpear la nota
        this.hitNote(noteToHit)
  
        // Animar la flecha con la animación de confirmación
        this.playConfirmAnimation(direction)
      } else {
        // No hay nota para golpear, solo animar la flecha con la animación de presión
        this.playPressAnimation(direction)
      }
  
      // Verificar si hay una nota sustain activa
      this.checkActiveSustain(direction)
    }
  
    handleKeyRelease(direction) {
      // Actualizar el estado de la tecla
      const directionName = ["left", "down", "up", "right"][direction]
      this.keysPressed[directionName] = false
  
      // Desactivar la sustain activa
      if (this.activeSustains[directionName]) {
        this.activeSustains[directionName].sustainActive = false
        this.activeSustains[directionName] = null
      }
  
      // Volver a la animación estática
      this.resetArrowAnimation(direction)
    }
  
    findNoteToHit(direction) {
      // Buscar la nota más cercana al tiempo de golpeo
      let closestNote = null
      let closestDiff = Number.POSITIVE_INFINITY
  
      this.movingNotes.forEach((note) => {
        const [time, noteDirection, sustain, mustHitSection] = note
  
        // Solo considerar notas del jugador que no han sido golpeadas o perdidas
        if (!mustHitSection || note.hit || note.missed) return
  
        // Solo considerar notas de la misma dirección
        if (noteDirection !== direction) return
  
        // Calcular la diferencia de tiempo
        const timeDiff = Math.abs(time - this.songPosition)
  
        // Si la diferencia es menor que el umbral de "shit" y menor que la diferencia actual
        if (timeDiff <= this.ratings.shit.timing && timeDiff < closestDiff) {
          closestNote = note
          closestDiff = timeDiff
        }
      })
  
      return closestNote
    }
  
    hitNote(note) {
      if (note.hit) return // Evitar golpear la misma nota dos veces
  
      note.hit = true
  
      // Calcular la diferencia de tiempo
      const [time, direction, sustain, mustHitSection] = note
      const timeDiff = Math.abs(time - this.songPosition)
  
      // Determinar el rating según la diferencia de tiempo
      let rating
      if (timeDiff <= this.ratings.sick.timing) {
        rating = "sick"
      } else if (timeDiff <= this.ratings.good.timing) {
        rating = "good"
      } else if (timeDiff <= this.ratings.bad.timing) {
        rating = "bad"
      } else {
        rating = "shit"
      }
  
      // Actualizar puntuación y combo
      this.score += this.ratings[rating].score
      this.combo++
      this.maxCombo = Math.max(this.maxCombo, this.combo)
      this.ratings[rating].count++
  
      // Reproducir sonido de golpe
      if (this.hitSounds[rating]) {
        this.hitSounds[rating].play()
      }
  
      // Mostrar texto de rating
      this.showRatingText(rating.toUpperCase(), this.getRatingColor(rating))
  
      // Manejar la nota
      if (note.sprite && !note.sprite.destroyed) {
        if (sustain > 0) {
          // Si es una nota sustain, activarla
          note.sustainActive = true
          note.sustainHitTime = this.songPosition // Guardar el tiempo en que se activó la sustain
  
          // Guardar referencia a la nota sustain activa
          const directionName = ["left", "down", "up", "right"][direction]
          this.activeSustains[directionName] = note
          
          // Hacer que la cabeza de la nota desaparezca gradualmente
          this.scene.tweens.add({
            targets: note.sprite,
            alpha: 0,
            duration: 200,
          })
        } else {
          // Si no es una sustain, hacerla desaparecer gradualmente
          this.scene.tweens.add({
            targets: note.sprite,
            alpha: 0,
            duration: 200,
          })
        }
      }
  
      console.log(`Nota golpeada: ${rating} en tiempo: ${this.songPosition}, diff: ${timeDiff}`)
    }
  
    updateSustainNote(note, strumY) {
      const [time, direction, sustain, mustHitSection] = note
      const directionName = ["left", "down", "up", "right"][direction]
  
      // Verificar si la tecla sigue presionada
      if (!this.keysPressed[directionName]) {
        note.sustainActive = false
        this.activeSustains[directionName] = null
        
        // Mantener la animación de confirmación mientras se presiona la tecla
        this.resetArrowAnimation(direction)
        return
      }
  
      // Mantener la animación de confirmación mientras se presiona la tecla
      this.playConfirmAnimation(direction)
  
      // Calcular el progreso de la sustain
      const sustainProgress = (this.songPosition - time) / sustain
  
      // Si la sustain ha terminado, desactivarla
      if (sustainProgress >= 1) {
        note.sustainActive = false
        this.activeSustains[directionName] = null
  
        // Ocultar los hold pieces y el hold end gradualmente
        if (note.holdPieces) {
          note.holdPieces.forEach((piece) => {
            if (piece && !piece.destroyed) {
              this.scene.tweens.add({
                targets: piece,
                alpha: 0,
                duration: 200,
                onComplete: () => {
                  piece.destroy()
                }
              })
            }
          })
        }
  
        if (note.holdEnd && !note.holdEnd.destroyed) {
          this.scene.tweens.add({
            targets: note.holdEnd,
            alpha: 0,
            duration: 200,
            onComplete: () => {
              note.holdEnd.destroy()
            }
          })
        }
  
        return
      }
  
      // Actualizar la visualización de la sustain
      // Procesar las hold pieces que pasan por el hitbox
      if (note.holdPieces) {
        note.holdPieces.forEach((piece, index) => {
          if (piece && !piece.destroyed) {
            // Verificar si la pieza está en el hitbox
            if (piece.y <= strumY + 10 && piece.y >= strumY - 10) {
              // Si la pieza no ha sido procesada, hacerla desaparecer
              if (!note.processedPieces.has(index)) {
                note.processedPieces.add(index)
                
                // Desvanecer gradualmente la pieza
                this.scene.tweens.add({
                  targets: piece,
                  alpha: 0,
                  duration: 200,
                  onComplete: () => {
                    piece.destroy()
                  }
                })
              }
            }
          }
        })
      }
  
      // Añadir puntos continuamente mientras se mantiene la sustain
      if (this.scene.time.now % 60 === 0) {
        // Cada 60ms (aproximadamente)
        this.score += 5 // Puntos por mantener la sustain
      }
    }
  
    checkActiveSustain(direction) {
      const directionName = ["left", "down", "up", "right"][direction]
  
      // Si hay una sustain activa para esta dirección, actualizarla
      if (this.activeSustains[directionName]) {
        this.activeSustains[directionName].sustainActive = true
        
        // Mantener la animación de confirmación
        this.playConfirmAnimation(direction)
      }
    }
  
    // Método modificado para mantener la animación de confirmación en bucle
    playConfirmAnimation(direction) {
      const arrow = this.playerArrowsRefs[direction]
      const directionName = ["left", "down", "up", "right"][direction]
      const frames = this.arrowAnimations[directionName].confirm
  
      // Si ya hay una animación en curso y es una animación de confirmación, no la interrumpimos
      if (arrow.isPlayingConfirm) return
  
      // Marcar que estamos reproduciendo una animación de confirmación
      arrow.isPlayingConfirm = true
  
      // Clear any existing animation
      if (arrow.animationTimer) {
        clearTimeout(arrow.animationTimer)
      }
  
      // Función para reproducir la animación en bucle
      const playConfirmLoop = (frameIndex = 0) => {
        // Si ya no estamos presionando la tecla, detener la animación
        const dirName = ["left", "down", "up", "right"][direction]
        if (!this.keysPressed[dirName]) {
          arrow.isPlayingConfirm = false
          arrow.setTexture("noteStrumline", `static${directionName.charAt(0).toUpperCase() + directionName.slice(1)}0001`)
          return
        }
  
        // Establecer el frame actual
        arrow.setTexture("noteStrumline", frames[frameIndex])
  
        // Programar el siguiente frame
        arrow.animationTimer = setTimeout(() => {
          // Avanzar al siguiente frame o volver al primero si llegamos al final
          const nextFrame = (frameIndex + 1) % frames.length
          playConfirmLoop(nextFrame)
        }, 50)
      }
  
      // Iniciar la animación en bucle
      playConfirmLoop()
    }
  
    // Replace the playPressAnimation method with this version that doesn't use timelines
    playPressAnimation(direction) {
      const arrow = this.playerArrowsRefs[direction]
      const directionName = ["left", "down", "up", "right"][direction]
      const frames = this.arrowAnimations[directionName].press
  
      // Si ya hay una animación de confirmación en curso, no la interrumpimos
      if (arrow.isPlayingConfirm) return
  
      // Clear any existing animation
      if (arrow.animationTimer) {
        clearTimeout(arrow.animationTimer)
      }
  
      // Play the first frame immediately
      arrow.setTexture("noteStrumline", frames[0])
  
      // Set up a sequence of delayed texture changes
      let frameIndex = 1
      const playNextFrame = () => {
        if (frameIndex < frames.length) {
          arrow.setTexture("noteStrumline", frames[frameIndex])
          frameIndex++
          arrow.animationTimer = setTimeout(playNextFrame, 50)
        } else {
          // Return to static texture at the end
          arrow.isPlayingConfirm = false
          arrow.setTexture("noteStrumline", `static${directionName.charAt(0).toUpperCase() + directionName.slice(1)}0001`)
        }
      }
  
      // Start the animation sequence
      arrow.animationTimer = setTimeout(playNextFrame, 50)
    }
  
    // Replace the resetArrowAnimation method to handle the new animation approach
    resetArrowAnimation(direction) {
      const arrow = this.playerArrowsRefs[direction]
      const directionName = ["left", "down", "up", "right"][direction]
  
      // Clear any existing animation
      if (arrow.animationTimer) {
        clearTimeout(arrow.animationTimer)
      }
  
      // Marcar que ya no estamos reproduciendo una animación de confirmación
      arrow.isPlayingConfirm = false
  
      // Return to static texture
      arrow.setTexture("noteStrumline", `static${directionName.charAt(0).toUpperCase() + directionName.slice(1)}0001`)
    }
  
    updateArrowAnimations() {
      // Este método ahora solo se usa para mantener las animaciones de las flechas del enemigo
      // Las animaciones del jugador se manejan con los eventos de teclado
  
      // Actualizar las animaciones de las flechas del enemigo
      this.enemyArrows.forEach((arrow, index) => {
        // Buscar notas del enemigo que estén cerca de la posición de golpeo
        const enemyNotes = this.movingNotes.filter((note) => {
          const [time, direction, sustain, mustHitSection] = note
          return !mustHitSection && direction === index && Math.abs(time - this.songPosition) < 50
        })
  
        if (enemyNotes.length > 0) {
          // Si hay notas del enemigo cerca, animar la flecha
          const directionName = ["left", "down", "up", "right"][index]
          arrow.setTexture(
            "noteStrumline",
            `confirm${directionName.charAt(0).toUpperCase() + directionName.slice(1)}0001`,
          )
        } else {
          // Si no hay notas cerca, volver a la animación estática
          const directionName = ["left", "down", "up", "right"][index]
          arrow.setTexture("noteStrumline", `static${directionName.charAt(0).toUpperCase() + directionName.slice(1)}0001`)
        }
      })
    }
  
    updateScoreTexts() {
      // Actualizar los textos de puntuación
      if (this.scoreText) {
        this.scoreText.setText(`Score: ${this.score}`)
      }
  
      if (this.comboText) {
        this.comboText.setText(`Combo: ${this.combo}`)
      }
    }
  
    // Replace the showRatingText method to use standard tweens instead of complex animations
    showRatingText(rating, color) {
      if (!this.ratingText) return
  
      // Reset any previous animations
      if (this.ratingText.tween) {
        this.ratingText.tween.stop()
      }
  
      // Configure the text
      this.ratingText.setText(rating)
      this.ratingText.setColor(color)
      this.ratingText.setAlpha(1)
      this.ratingText.y = 200 // Reset position
  
      // Simple fade out animation
      this.ratingText.tween = this.scene.tweens.add({
        targets: this.ratingText,
        y: 150,
        alpha: 0,
        duration: 800,
        ease: "Power2",
      })
    }
  
    getRatingColor(rating) {
      const colors = {
        sick: "#00FFFF",
        good: "#00FF00",
        bad: "#FFFF00",
        shit: "#FF8800",
      }
  
      return colors[rating] || "#FFFFFF"
    }
  
    getHitbox(direction) {
      const arrowConfig = this.playerArrowConfigs[direction]
      return {
        x: arrowConfig.x,
        y: arrowConfig.y,
        width: 100, // Ancho de la hitbox (ajusta según tu imagen)
        height: 100, // Alto de la hitbox (ajusta según tu imagen)
      }
    }
  
    isNoteInHitbox(note, direction) {
      const hitbox = this.getHitbox(direction)
      const noteSprite = note.sprite
  
      if (!noteSprite || noteSprite.destroyed) return false
  
      // Verificar si la nota está dentro de la hitbox
      const noteX = noteSprite.x
      const noteY = noteSprite.y
  
      return (
        noteX >= hitbox.x - hitbox.width / 2 &&
        noteX <= hitbox.x + hitbox.width / 2 &&
        noteY >= hitbox.y - hitbox.height / 2 &&
        noteY <= hitbox.y + hitbox.height / 2
      )
    }
  
    getTextureFromDirection(direction) {
      const textures = ["noteLeft0001", "noteDown0001", "noteUp0001", "noteRight0001"]
      return textures[direction] || "noteLeft0001"
    }
  
    getHoldPieceTextureFromDirection(direction) {
      const textures = ["purple hold piece0000", "blue hold piece0000", "green hold piece0000", "red hold piece0000"]
      return textures[direction] || "purple hold piece0000"
    }
  
    getHoldEndTextureFromDirection(direction) {
      const textures = ["pruple end hold0000", "blue hold end0000", "green hold end0000", "red hold end0000"]
      return textures[direction] || "pruple end hold0000"
    }
  
    getXPositionFromDirection(direction, isPlayerNote) {
      // Posiciones para el jugador y el enemigo
      const playerPositions = [820, 920, 1020, 1120] // Morado, Azul, Verde, Rojo
      const enemyPositions = [120, 220, 320, 420] // Morado, Azul, Verde, Rojo
  
      return isPlayerNote ? playerPositions[direction] : enemyPositions[direction]
    }
  
    // Método para cambiar el margen de aparición de las notas
    setStartYOffset(offset) {
      this.startYOffset = offset
    }
  
    // Método para cambiar el tiempo de anticipación de las notas
    setNoteLeadTime(leadTime) {
      this.noteLeadTime = leadTime
    }
  
    // Método para obtener la puntuación actual
    getScore() {
      return {
        score: this.score,
        combo: this.combo,
        maxCombo: this.maxCombo,
        misses: this.misses,
        ratings: {
          sick: this.ratings.sick.count,
          good: this.ratings.good.count,
          bad: this.ratings.bad.count,
          shit: this.ratings.shit.count,
        },
      }
    }
  
    // Método para reiniciar la puntuación
    resetScore() {
      this.score = 0
      this.combo = 0
      this.maxCombo = 0
      this.misses = 0
  
      Object.keys(this.ratings).forEach((rating) => {
        this.ratings[rating].count = 0
      })
  
      this.updateScoreTexts()
    }
  }