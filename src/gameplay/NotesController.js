import { RatingManager } from './RatingManager.js'

export class NotesController {
    constructor(scene) {
        this.scene = scene;
        
        // Core game properties - Propiedades básicas del juego
        this.bpm = 100;
        this.speed = 1;
        this.safeFrames = 10;
        this.safeZoneOffset = 0;
        
        // Arrow sprite groups - Grupos de sprites de flechas
        this.playerArrows = [];
        this.enemyArrows = [];
        
        // Note tracking arrays - Arrays para seguimiento de notas
        this.playerNotes = [];
        this.enemyNotes = [];
        this.songNotes = [];
        
        // Game statistics - Estadísticas del juego
        this.notesHit = 0;
        this.notesMissed = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.score = 0;
        
        // Rating system initialization - Inicialización del sistema de calificación
        this.ratingManager = new RatingManager(scene);
        this.configureRatingManager();

        // Input configuration - Configuración de entrada
        this.setupKeyBindings();
        
        // Hold note configuration - Configuración de notas sostenidas
        this.holdScoreRate = 100;
        this.holdScoreInterval = 100;
        this.holdPenalty = 50;
        this.holdSegmentHeight = 50 * this.arrowConfigs.scale.holds;
        
        // State tracking - Seguimiento de estado
        this.keysHeld = { left: false, down: false, up: false, right: false };
        this.activeHoldNotes = [null, null, null, null];
        
        this.setupInputHandlers();
    }

    // Input setup
    setupKeyBindings() {
        this.keyBindings = {
            left: [
                this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
                this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A)
            ],
            down: [
                this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
                this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S)
            ],
            up: [
                this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
                this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W)
            ],
            right: [
                this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
                this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
            ]
        };
    }

    // Game constants
    directions = ['left', 'down', 'up', 'right'];
    holdColors = ['purple', 'blue', 'green', 'red'];

    // Arrow positioning and animation configuration
    arrowConfigs = {
        playerStatic: [
            { x: 795, y: 100 }, // Left
            { x: 899, y: 100 }, // Down
            { x: 999, y: 100 }, // Up
            { x: 1100, y: 100 } // Right
        ],
        enemyStatic: [
            { x: 99, y: 100 }, // Left
            { x: 199, y: 100 }, // Down
            { x: 299, y: 100 }, // Up
            { x: 399, y: 100 } // Right
        ],
        playerNotes: [
            { x: 820, y: 0 }, // Left
            { x: 920, y: 0 }, // Down
            { x: 1020, y: 0 }, // Up
            { x: 1120, y: 0 } // Right
        ],
        enemyNotes: [
            { x: 125, y: 0 }, // Left
            { x: 225, y: 0 }, // Down
            { x: 325, y: 0 }, // Up
            { x: 425, y: 0 } // Right
        ],
        playerConfirm: [
            { x: 820, y: 120 }, // Left
            { x: 920, y: 120 }, // Down
            { x: 1020, y: 120 }, // Up
            { x: 1120, y: 120 } // Right
        ],
        playerPress: [
            { x: 820, y: 120 }, // Left
            { x: 920, y: 120 }, // Down
            { x: 1020, y: 120 }, // Up
            { x: 1120, y: 120 } // Right
        ],
        enemyConfirm: [
            { x: 125, y: 125 }, // Left
            { x: 225, y: 125 }, // Down
            { x: 325, y: 125 }, // Up
            { x: 425, y: 125 } // Right
        ],
        enemyPress: [
            { x: 125, y: 120 }, // Left
            { x: 225, y: 120 }, // Down
            { x: 325, y: 120 }, // Up
            { x: 425, y: 120 } // Right
        ],
        scale: {
            static: 0.68,
            notes: 0.68,
            holds: 0.68,
            confirm: 0.58,
            press: 0.68
        },
        confirmHoldTime: 103 // 103ms
    };

    configureRatingManager() {
        this.ratingManager.configure({
            positions: {
                rating: { x: null, y: 300 }, // Centered horizontally, 300px from top
                comboNumbers: {
                    x: 0,
                    y: 50,
                    spacing: 30,
                    scale: 0.5,
                    rotation: 0
                }
            }
        });
    }

    loadNotes(songData, bpm, speed) {
        console.log("loadNotes llamado con:", songData);
        
        this.songNotes = [];
        
        if (!songData) {
            console.error("No se proporcionaron datos de la canción");
            return;
        }
        
        this.bpm = bpm || songData.bpm || (songData.song && songData.song.bpm) || 100;
        this.speed = speed || songData.speed || (songData.song && songData.song.speed) || 1;
        
        this.crochet = (60 / this.bpm) * 1000;
        this.stepCrochet = this.crochet / 4;
        this.safeZoneOffset = Math.floor(this.safeFrames / 60 * 1000);
        
        console.log("Cargando canción con BPM:", this.bpm, "y velocidad:", this.speed);

        let notesArray;
        if (songData.notes && Array.isArray(songData.notes)) {
            notesArray = songData.notes;
            console.log("Formato detectado: Psych Engine (objeto con propiedad notes)");
        } else if (songData.song && songData.song.notes && Array.isArray(songData.song.notes)) {
            notesArray = songData.song.notes;
            console.log("Formato detectado: FNF original (objeto song con propiedad notes)");
        } else if (Array.isArray(songData)) {
            notesArray = songData;
            console.log("Formato detectado: Array directo de secciones");
        } else {
            console.error("Formato de datos no reconocido:", songData);
            return;
        }

        notesArray.forEach((section, sectionIndex) => {
            if (section.sectionNotes && Array.isArray(section.sectionNotes)) {
                section.sectionNotes.forEach(noteData => {
                    const strumTime = noteData[0];
                    let noteDirection = noteData[1];
                    const sustainLength = noteData[2] || 0;
                    
                    if (typeof noteDirection !== 'number') return;
                    
                    // Lógica corregida para determinar si es nota del jugador
                    let isPlayerNote;
                    if (section.mustHitSection) {
                        // En secciones mustHitSection=true: 0-3 son del jugador, 4-7 del enemigo
                        isPlayerNote = noteDirection < 4;
                    } else {
                        // En secciones mustHitSection=false: 4-7 son del jugador, 0-3 del enemigo
                        isPlayerNote = noteDirection >= 4;
                        noteDirection = noteDirection % 4; // Convertir a 0-3
                    }
                    
                    // Validar dirección
                    if (noteDirection < 0 || noteDirection > 3) {
                        console.error("Dirección de nota inválida:", noteData[1], "en sección:", sectionIndex);
                        return;
                    }
                    
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
                        holdEndPassed: false
                    });
                });
            }
        });
        
        this.songNotes.sort((a, b) => a.strumTime - b.strumTime);
        
        const playerNotes = this.songNotes.filter(note => note.isPlayerNote).length;
        const enemyNotes = this.songNotes.filter(note => !note.isPlayerNote).length;
        
        console.log("Total de notas cargadas:", this.songNotes.length);
        console.log("Notas del jugador:", playerNotes);
        console.log("Notas del enemigo:", enemyNotes);
    }
    
    createPlayerArrows() {
        this.playerArrows = [];
        for (let i = 0; i < 4; i++) {
            const pos = this.arrowConfigs.playerStatic[i];
            const direction = this.directions[i];
            const arrow = this.scene.add.sprite(pos.x, pos.y, 'noteStrumline', `static${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`);
            arrow.setScale(this.arrowConfigs.scale.static);
            arrow.direction = direction;
            arrow.directionIndex = i;
            arrow.originalX = pos.x;
            arrow.originalY = pos.y;
            this.playerArrows.push(arrow);
        }
    }
    
    createEnemyArrows() {
        this.enemyArrows = [];
        for (let i = 0; i < 4; i++) {
            const pos = this.arrowConfigs.enemyStatic[i];
            const direction = this.directions[i];
            const arrow = this.scene.add.sprite(pos.x, pos.y, 'noteStrumline', `static${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`);
            arrow.setScale(this.arrowConfigs.scale.static);
            arrow.direction = direction;
            arrow.directionIndex = i;
            arrow.originalX = pos.x;
            arrow.originalY = pos.y;
            this.enemyArrows.push(arrow);
        }
    }
    
    setupInputHandlers() {
        this.keyPressCallbacks = [];
        this.keyReleaseCallbacks = [];
        
        this.directions.forEach((direction, index) => {
            const keys = this.keyBindings[direction];
            
            const pressHandler = () => {
                if (!this.keysHeld[direction]) {  // Only trigger if not already held
                    this.keysHeld[direction] = true;
                    const pressPos = this.arrowConfigs.playerPress[index];
                    const arrow = this.playerArrows[index];
                    
                    arrow.x = pressPos.x;
                    arrow.y = pressPos.y;
                    arrow.setTexture('noteStrumline', `press${direction.charAt(0).toUpperCase() + direction.slice(1)}0003`);
                    arrow.setScale(this.arrowConfigs.scale.press);
                    this.checkNoteHit(index);
                }
            };
            
            const releaseHandler = () => {
                this.keysHeld[direction] = false;
                const arrow = this.playerArrows[index];
                
                if (!this.activeHoldNotes[index]) {
                    arrow.x = arrow.originalX;
                    arrow.y = arrow.originalY;
                    arrow.setTexture('noteStrumline', `static${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`);
                    arrow.setScale(this.arrowConfigs.scale.static);
                }
                
                if (this.activeHoldNotes[index]) {
                    const holdNote = this.activeHoldNotes[index];
                    const currentTime = this.scene.songPosition;
                    const holdEndTime = holdNote.strumTime + holdNote.sustainLength;
                    
                    if (currentTime < holdEndTime - this.safeZoneOffset) {
                        this.score -= this.holdPenalty;
                        holdNote.holdReleased = true;
                        
                        if (holdNote.holdSprites) {
                            holdNote.holdSprites.forEach(sprite => {
                                if (sprite?.active) sprite.destroy();
                            });
                        }
                        
                        this.ratingManager.recordMiss();
                    }
                    
                    this.activeHoldNotes[index] = null;
                }
            };
            
            // Add handlers for both arrow keys and WASD
            keys.forEach(key => {
                key.on('down', pressHandler);
                key.on('up', releaseHandler);
                
                this.keyPressCallbacks.push({ key, callback: pressHandler });
                this.keyReleaseCallbacks.push({ key, callback: releaseHandler });
            });
        });
    }
    
    checkNoteHit(directionIndex) {
        const currentTime = this.scene.songPosition;
        let closestNote = null;
        let closestTime = Infinity;
        
        for (const note of this.songNotes) {
            if (note.isPlayerNote && note.noteDirection === directionIndex && 
                !note.wasHit && !note.tooLate && note.spawned) {
                
                const timeDiff = Math.abs(note.strumTime - currentTime);
                
                if (timeDiff < closestTime && timeDiff <= this.safeZoneOffset) {
                    closestNote = note;
                    closestTime = timeDiff;
                }
            }
        }
        
        if (closestNote) {
            this.hitNote(closestNote, closestTime);
        }
    }
    
    hitNote(note, timeDiff) {
        note.wasHit = true;
        const direction = this.directions[note.noteDirection];
        const arrow = this.playerArrows[note.noteDirection];
        const confirmPos = this.arrowConfigs.playerConfirm[note.noteDirection];
        
        arrow.x = confirmPos.x;
        arrow.y = confirmPos.y;
        arrow.setTexture('noteStrumline', `confirm${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`);
        arrow.setScale(this.arrowConfigs.scale.confirm);
        
        if (!note.isHoldNote) {
            this.scene.time.delayedCall(this.arrowConfigs.confirmHoldTime, () => {
                if (!this.keysHeld[direction]) {
                    arrow.x = arrow.originalX;
                    arrow.y = arrow.originalY;
                    arrow.setTexture('noteStrumline', `static${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`);
                    arrow.setScale(this.arrowConfigs.scale.static);
                }
            });
        }
        
        if (note.sprite?.active) {
            note.sprite.destroy();
            note.sprite = null;
        }
        
        if (note.isHoldNote) {
            note.isBeingHeld = true;
            this.activeHoldNotes[note.noteDirection] = note;
            note.holdScoreTime = this.scene.songPosition;
        }
        
        this.notesHit++;
        
        // Usar nuevo RatingManager
        const rating = this.ratingManager.recordHit(timeDiff);
        this.combo = this.ratingManager.combo;
        this.maxCombo = this.ratingManager.maxCombo;
    }
    
    missNote(note) {
        note.tooLate = true;
        this.notesMissed++;
        
        if (note.sprite?.active) {
            note.sprite.destroy();
            note.sprite = null;
        }
        
        if (note.holdSprites) {
            note.holdSprites.forEach(sprite => {
                if (sprite?.active) sprite.destroy();
            });
            note.holdSprites = [];
        }
        
        // Usar nuevo RatingManager
        this.ratingManager.recordMiss();
        this.combo = this.ratingManager.combo;
    }
    
    spawnNote(note) {        
        const isPlayer = note.isPlayerNote;
        const directionIndex = note.noteDirection;
        const direction = this.directions[directionIndex];
        const holdColor = this.holdColors[directionIndex];
        const posConfig = isPlayer ? this.arrowConfigs.playerNotes : this.arrowConfigs.enemyNotes;
        
        // Validación de configuraciones
        if (!posConfig || !posConfig[directionIndex]) {
            console.error('Configuración de posición no válida:', {isPlayer, directionIndex});
            return;
        }
        
        const pos = posConfig[directionIndex];
        
        const noteSprite = this.scene.add.sprite(
            pos.x, 
            pos.y - 1000,
            'notes', 
            `note${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`
        );
        noteSprite.setScale(this.arrowConfigs.scale.notes);
        note.sprite = noteSprite;
        note.spawned = true;
        
        if (note.isHoldNote) {
            note.holdSprites = [];
            const holdDuration = note.sustainLength;
            const pixelsPerMs = 0.45 * this.speed;
            const holdLength = holdDuration * pixelsPerMs;
            const numPieces = Math.max(1, Math.ceil(holdLength / this.holdSegmentHeight));
            
            for (let i = 0; i < numPieces; i++) {
                const holdPiece = this.scene.add.sprite(
                    pos.x,
                    pos.y - 1000 + 50 + (i * this.holdSegmentHeight),
                    'NOTE_hold_assets',
                    `${holdColor} hold piece0000`
                );
                holdPiece.setScale(this.arrowConfigs.scale.holds);
                holdPiece.setOrigin(0.5, 0);
                note.holdSprites.push(holdPiece);
            }
            
            const holdEnd = this.scene.add.sprite(
                pos.x,
                pos.y - 1000 + 50 + (numPieces * this.holdSegmentHeight),
                'NOTE_hold_assets',
                `${holdColor} hold end0000`
            );
            holdEnd.setScale(this.arrowConfigs.scale.holds);
            holdEnd.setOrigin(0.5, 0);
            note.holdSprites.push(holdEnd);
        }
        
        if (isPlayer) {
            this.playerNotes.push(note);
        } else {
            this.enemyNotes.push(note);
        }
    }
    
    update(songPosition) {
        const currentTime = songPosition;
        const spawnTime = 2000 * this.speed;
        
        for (const note of this.songNotes) {
            if (!note.spawned && note.strumTime <= currentTime + spawnTime) {
                this.spawnNote(note);
            }
            
            if (note.spawned) {
                const timeDiff = note.strumTime - currentTime;
                
                if (note.sprite?.active) {
                    note.sprite.y = this.calculateNoteY(note, timeDiff);
                }
                
                if (note.holdSprites) {
                    const baseY = note.sprite?.y ?? this.calculateNoteY(note, timeDiff);
                    
                    note.holdSprites.forEach((sprite, i) => {
                        if (sprite?.active) {
                            if (i < note.holdSprites.length - 1) {
                                sprite.y = baseY + 50 + (i * this.holdSegmentHeight);
                            } else {
                                sprite.y = baseY + 50 + ((note.holdSprites.length - 1) * this.holdSegmentHeight);
                            }
                        }
                    });
                }
                
                if (note.isPlayerNote) {
                    note.canBeHit = Math.abs(timeDiff) <= this.safeZoneOffset;
                    
                    if (timeDiff < -this.safeZoneOffset && !note.wasHit && !note.tooLate) {
                        this.missNote(note);
                    }
                } else {
                    // Only auto-hit if it's specifically an enemy note
                    if (Math.abs(timeDiff) <= 10 && !note.wasHit) {
                        this.autoHitEnemyNote(note);
                    }
                    
                    // Handle enemy hold notes separately
                    if (note.isHoldNote && note.wasHit && note.enemyHoldActive) {
                        this.updateEnemyHoldNote(note, currentTime);
                    }
                }
                
                if (note.isHoldNote && note.wasHit && !note.holdReleased) {
                    this.updateHoldNote(note, currentTime);
                }
                
                if (timeDiff < -1000) {
                    this.cleanUpNote(note);
                }
            }
        }
        
        this.playerNotes = this.playerNotes.filter(note => 
            (note.sprite?.active) || 
            (note.holdSprites?.some(sprite => sprite?.active))
        );
        
        this.enemyNotes = this.enemyNotes.filter(note => 
            (note.sprite?.active) || 
            (note.holdSprites?.some(sprite => sprite?.active))
        );
    }
    
    updateHoldNote(note, currentTime) {
        const holdEndTime = note.strumTime + note.sustainLength;
        const directionIndex = note.noteDirection;
        const direction = this.directions[directionIndex];
    
        // Only handle player notes in this method
        if (!note.isPlayerNote) return;
    
        if (currentTime <= holdEndTime) {
            const arrow = this.playerArrows[directionIndex];
            const confirmPos = this.arrowConfigs.playerConfirm[directionIndex];
            
            // Only animate player arrows
            if (note.isPlayerNote) {
                arrow.x = confirmPos.x;
                arrow.y = confirmPos.y;
                arrow.setTexture('noteStrumline', `confirm${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`);
                arrow.setScale(this.arrowConfigs.scale.confirm);
            }
    
            if (note.isPlayerNote && currentTime - note.holdScoreTime >= this.holdScoreInterval) {
                this.score += this.holdScoreRate;
                note.holdScoreTime = currentTime;
            }
    
            // Clean up hold segments
            if (note.holdSprites && note.holdSprites.length > 0) {
                const holdProgress = (currentTime - note.strumTime) / note.sustainLength;
                const segmentsToDestroy = Math.floor(holdProgress * note.holdSprites.length);
    
                for (let i = 0; i < segmentsToDestroy; i++) {
                    if (note.holdSprites[i]?.active) {
                        note.holdSprites[i].destroy();
                        note.holdSprites[i] = null;
                    }
                }
            }
        } else {
            // Hold note finished
            this.cleanUpNote(note);
            if (note.isPlayerNote) {
                const arrow = this.playerArrows[directionIndex];
                arrow.x = arrow.originalX;
                arrow.y = arrow.originalY;
                arrow.setTexture('noteStrumline', `static${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`);
                arrow.setScale(this.arrowConfigs.scale.static);
                this.activeHoldNotes[directionIndex] = null;
            }
        }
    }
    
    cleanUpNote(note) {
        // Limpiar sprite principal de la nota
        if (note.sprite?.active) {
            note.sprite.destroy();
            note.sprite = null;
        }
        
        // Limpiar todos los segmentos de hold note
        if (note.holdSprites) {
            note.holdSprites.forEach((sprite, index) => {
                if (sprite?.active) {
                    sprite.destroy();
                    note.holdSprites[index] = null;
                }
            });
            note.holdSprites = note.holdSprites.filter(sprite => sprite !== null);
        }
    
        // Marcar la nota como completamente limpiada
        note.wasHit = true;
        note.isBeingHeld = false;
        note.holdReleased = true;
    }
    
    autoHitEnemyNote(note) {
        if (note.isPlayerNote) {
            console.error("Attempted to auto-hit a player note!");
            return;
        }

        note.wasHit = true;
        const direction = this.directions[note.noteDirection];
        const arrow = this.enemyArrows[note.noteDirection];
        const confirmPos = this.arrowConfigs.enemyConfirm[note.noteDirection];
        
        arrow.x = confirmPos.x;
        arrow.y = confirmPos.y;
        arrow.setTexture('noteStrumline', `confirm${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`);
        arrow.setScale(this.arrowConfigs.scale.confirm);
        
        if (!note.isHoldNote) {
            this.scene.time.delayedCall(this.arrowConfigs.confirmHoldTime, () => {
                arrow.x = arrow.originalX;
                arrow.y = arrow.originalY;
                arrow.setTexture('noteStrumline', `static${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`);
                arrow.setScale(this.arrowConfigs.scale.static);
            });
        }
        
        if (note.sprite?.active) {
            note.sprite.destroy();
            note.sprite = null;
        }
        
        if (note.isHoldNote) {
            note.isBeingHeld = true;
            // Track enemy hold notes separately from player hold notes
            note.enemyHoldActive = true;
        }
    }

    updateEnemyHoldNote(note, currentTime) {
        const holdEndTime = note.strumTime + note.sustainLength;
        const directionIndex = note.noteDirection;
        const direction = this.directions[directionIndex];
    
        if (currentTime <= holdEndTime) {
            const arrow = this.enemyArrows[directionIndex];
            const confirmPos = this.arrowConfigs.enemyConfirm[directionIndex];
            
            arrow.x = confirmPos.x;
            arrow.y = confirmPos.y;
            arrow.setTexture('noteStrumline', `confirm${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`);
            arrow.setScale(this.arrowConfigs.scale.confirm);
    
            // Clean up passed hold segments
            if (note.holdSprites && note.holdSprites.length > 0) {
                const scrollSpeed = 0.45 * this.speed;
                const holdProgress = (currentTime - note.strumTime) / note.sustainLength;
                const segmentsToDestroy = Math.floor(holdProgress * note.holdSprites.length);
    
                for (let i = 0; i < segmentsToDestroy; i++) {
                    if (note.holdSprites[i]?.active) {
                        note.holdSprites[i].destroy();
                        note.holdSprites[i] = null;
                    }
                }
            }
        } else {
            // Hold note finished
            this.cleanUpNote(note);
            const arrow = this.enemyArrows[directionIndex];
            arrow.x = arrow.originalX;
            arrow.y = arrow.originalY;
            arrow.setTexture('noteStrumline', `static${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`);
            arrow.setScale(this.arrowConfigs.scale.static);
            note.enemyHoldActive = false;
        }
    }
    
    calculateNoteY(note, timeDiff) {
        const directionIndex = note.noteDirection;
        const targetY = note.isPlayerNote ? 
            this.arrowConfigs.playerStatic[directionIndex].y : 
            this.arrowConfigs.enemyStatic[directionIndex].y;
        
        const scrollSpeed = 0.45 * this.speed;
        const yOffset = timeDiff * scrollSpeed;
        
        return targetY + yOffset;
    }
    
    getScore() { return this.score; }
    getCombo() { return this.combo; }
    getMaxCombo() { return this.maxCombo; }
    getNotesHit() { return this.notesHit; }
    getNotesMissed() { return this.notesMissed; }
    getAccuracy() {
        return this.ratingManager.getResults().accuracy;
    }
    
    cleanup() {
        this.playerNotes.forEach(note => {
            if (note.sprite?.active) {
                note.sprite.destroy();
            }
            
            if (note.holdSprites) {
                note.holdSprites.forEach(sprite => {
                    if (sprite?.active) {
                        sprite.destroy();
                    }
                });
            }
        });
        
        this.enemyNotes.forEach(note => {
            if (note.sprite?.active) {
                note.sprite.destroy();
            }
            
            if (note.holdSprites) {
                note.holdSprites.forEach(sprite => {
                    if (sprite?.active) {
                        sprite.destroy();
                    }
                });
            }
        });
        
        this.playerArrows.forEach(arrow => {
            if (arrow?.active) {
                arrow.destroy();
            }
        });
        
        this.enemyArrows.forEach(arrow => {
            if (arrow?.active) {
                arrow.destroy();
            }
        });
        
        this.keyPressCallbacks.forEach(({ key, callback }) => {
            key.off('down', callback);
        });
        
        this.keyReleaseCallbacks.forEach(({ key, callback }) => {
            key.off('up', callback);
        });
        
        this.playerArrows = [];
        this.enemyArrows = [];
        this.playerNotes = [];
        this.enemyNotes = [];
        this.songNotes = [];
        this.keyPressCallbacks = [];
        this.keyReleaseCallbacks = [];
        this.activeHoldNotes = [null, null, null, null];
        
        // Limpiar RatingManager
        this.ratingManager.reset();
        
        console.log("NotesController cleanup complete");
    }
}