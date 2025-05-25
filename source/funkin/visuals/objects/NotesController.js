import { RatingManager } from './RatingManager.js'
import { NoteSpawner } from './components/NoteSpawner.js';

export class NotesController {
    constructor(scene) {
        this.scene = scene;
        this.initialized = false;
        
        // Core game properties
        this.bpm = 100;
        this.speed = 1;
        this.safeFrames = 10;
        this.safeZoneOffset = Math.floor(this.safeFrames / 60 * 1000);
        
        // Arrow sprite groups
        this.playerArrows = [];
        this.enemyArrows = [];
        
        // Note tracking arrays
        this.songNotes = [];
        this.playerNotes = [];
        this.enemyNotes = [];
        
        // Game statistics
        this.notesHit = 0;
        this.notesMissed = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.score = 0;
        
        // Rating system initialization
        this.ratingManager = new RatingManager(scene);
        this.configureRatingManager();

        // Input configuration
        this.setupKeyBindings();
        this.keysHeld = { left: false, down: false, up: false, right: false };
        
        // Events
        this.events = new Phaser.Events.EventEmitter();
        
        // Hold note configuration
        this.holdScoreRate = 100;
        this.holdScoreInterval = 100;
        this.holdPenalty = 50;
        // Cambia el valor a 32 para juntar más los segmentos
        this.holdSegmentHeight = 32 * this.arrowConfigs.scale.holds;
        
        // State tracking
        this.activeHoldNotes = [null, null, null, null];
        
        // Agregar configuración de visibilidad
        this.noteVisibilityConfig = {
            spawnOffset: 2000,
            despawnOffset: 1000,
            holdNoteDespawnDelay: 500
        };

        this.currentBPM = 100;

        // Añadir array de sonidos de fallo
        this.missSounds = [
            'missnote1',
            'missnote2',
            'missnote3'
        ];

        // Configuración de salud
        this.healthConfig = {
            hitGain: 0.023,      // Ganancia de salud al acertar
            missLoss: 0.05,      // Pérdida de salud al fallar
            holdGain: 0.023/10,  // Ganancia de salud por mantener (más pequeña que el hit)
            holdRate: 60         // Frecuencia de actualización para hold notes (ms)
        };

        this.noteSpawner = new NoteSpawner(scene, this);

        // Añadir lastSingTime al constructor
        this.lastSingTime = {
            player: 0,
            enemy: 0
        };

        // Añadir Map para direcciones sostenidas
        this.enemyHeldDirections = new Map();
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

                    // Fix para notas duo y direcciones inválidas
                    let isPlayerNote;
                    if (section.mustHitSection) {
                        // Si es sección del jugador: 0-3 jugador, 4-7 enemigo
                        isPlayerNote = noteDirection < 4;
                        noteDirection = noteDirection % 4; // Convertir 4-7 a 0-3
                    } else {
                        // Si es sección del enemigo: 0-3 enemigo, 4-7 jugador 
                        isPlayerNote = noteDirection >= 4;
                        noteDirection = noteDirection % 4; // Convertir 4-7 a 0-3
                    }

                    // Validar que la dirección esté en rango 0-3
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
                            holdEndPassed: false
                        });
                    }
                });
            }
        });
        
        this.songNotes.sort((a, b) => a.strumTime - b.strumTime);
        
        const playerNotes = this.songNotes.filter(note => note.isPlayerNote).length;
        const enemyNotes = this.songNotes.filter(note => !note.isPlayerNote).length;
        
        console.log("Total notes loaded:", this.songNotes.length);
        console.log("Player notes:", playerNotes);
        console.log("Enemy notes:", enemyNotes);
    }
    
    async createPlayerArrows() {
        this.playerArrows = [];
        return new Promise(resolve => {
            for (let i = 0; i < 4; i++) {
                const pos = this.arrowConfigs.playerStatic[i];
                const direction = this.directions[i];
                const arrow = this.scene.add.sprite(pos.x, pos.y, 'noteStrumline', 
                    `static${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`);
                
                arrow.setScale(this.arrowConfigs.scale.static);
                arrow.setDepth(110);
                arrow.direction = direction;
                arrow.directionIndex = i;
                arrow.originalX = pos.x;
                arrow.originalY = pos.y;
                arrow.setName(`PlayerArrow_${direction}`); // Añadir nombre para identificación
                
                // Asignar a la capa UI
                if (this.scene.cameraController) {
                    this.scene.cameraController.addToUILayer(arrow);
                }
                
                this.playerArrows[i] = arrow;
            }
            resolve();
        });
    }
    
    createEnemyArrows() {
        this.enemyArrows = [];
        for (let i = 0; i < 4; i++) {
            const pos = this.arrowConfigs.enemyStatic[i];
            const direction = this.directions[i];
            const arrow = this.scene.add.sprite(pos.x, pos.y, 'noteStrumline', 
                `static${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`);
            
            arrow.setScale(this.arrowConfigs.scale.static);
            arrow.setDepth(110);
            arrow.direction = direction;
            arrow.directionIndex = i;
            arrow.originalX = pos.x;
            arrow.originalY = pos.y;
            arrow.setName(`EnemyArrow_${direction}`); // Añadir nombre para identificación
            
            // Asignar a la capa UI
            if (this.scene.cameraController) {
                this.scene.cameraController.addToUILayer(arrow);
            }
            
            this.enemyArrows.push(arrow);
        }
    }
    
    setupInputHandlers() {
        if (!this.initialized) {
            console.warn('NotesController not initialized yet');
            return;
        }

        // Limpiar handlers previos
        if (this.keyPressCallbacks) {
            this.keyPressCallbacks.forEach(({ key, callback }) => {
                key.off('down', callback);
            });
        }
        if (this.keyReleaseCallbacks) {
            this.keyReleaseCallbacks.forEach(({ key, callback }) => {
                key.off('up', callback);
            });
        }

        this.keyPressCallbacks = [];
        this.keyReleaseCallbacks = [];
        
        this.directions.forEach((direction, index) => {
            const keys = this.keyBindings[direction];
            
            const pressHandler = () => {
                if (!this.initialized || !this.playerArrows[index]) return;
                if (!this.keysHeld[direction]) {
                    this.keysHeld[direction] = true;
                    const arrow = this.playerArrows[index];
                    
                    // Verificar si arrow existe
                    if (!arrow || !arrow.active) {
                        console.warn(`Arrow ${direction} no está disponible`);
                        return;
                    }

                    const pressPos = this.arrowConfigs.playerPress[index];
                    
                    // Verificar si hay una nota para golpear
                    const hasHittableNote = this.songNotes.some(note => 
                        note.isPlayerNote && 
                        note.noteDirection === index && 
                        !note.wasHit && 
                        !note.tooLate && 
                        note.spawned && 
                        Math.abs(note.strumTime - this.scene.songPosition) <= this.safeZoneOffset
                    );

                    // Asegurarse de que las posiciones existen
                    if (pressPos && typeof pressPos.x === 'number' && typeof pressPos.y === 'number') {
                        arrow.x = pressPos.x;
                        arrow.y = pressPos.y;
                        
                        // Usar textura diferente según si hay nota o no
                        if (hasHittableNote) {
                            arrow.setTexture('noteStrumline', `confirm${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`);
                            arrow.setScale(this.arrowConfigs.scale.confirm);
                            this.checkNoteHit(index);
                        } else {
                            arrow.setTexture('noteStrumline', `press${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`);
                            arrow.setScale(this.arrowConfigs.scale.press);
                        }
                    }
                }
            };
            
            const releaseHandler = () => {
                if (!this.initialized || !this.playerArrows[index]) return;
                this.keysHeld[direction] = false;
                const arrow = this.playerArrows[index];
                
                // Verificar si arrow existe y tiene las propiedades necesarias
                if (!arrow || !arrow.active || typeof arrow.originalX === 'undefined') {
                    console.warn(`Arrow ${direction} no está disponible o no tiene posición original`);
                    return;
                }

                // Volver al estado static
                arrow.x = arrow.originalX;
                arrow.y = arrow.originalY;
                arrow.setTexture('noteStrumline', `static${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`);
                arrow.setScale(this.arrowConfigs.scale.static);

                // Emitir evento de noteReleased
                this.events.emit('noteReleased', {
                    direction: index,
                    isPlayerNote: true
                });
                
                if (this.activeHoldNotes[index]) {
                    const holdNote = this.activeHoldNotes[index];
                    const currentTime = this.scene.songPosition;
                    const holdEndTime = holdNote.strumTime + holdNote.sustainLength;
                    
                    // Marcar la nota como no sostenida
                    holdNote.isBeingHeld = false;
                    
                    if (currentTime < holdEndTime - this.safeZoneOffset) {
                        this.score -= this.holdPenalty;
                        holdNote.holdReleased = true;
                        
                        this.ratingManager.recordMiss();
                    }
                }
            };
            
            keys.forEach(key => {
                if (key) {
                    key.on('down', pressHandler);
                    key.on('up', releaseHandler);
                    
                    this.keyPressCallbacks.push({ key, callback: pressHandler });
                    this.keyReleaseCallbacks.push({ key, callback: releaseHandler });
                }
            });
        });

        console.log('Input handlers setup complete');
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
        
        // Emitir evento de cambio a confirm
        this.events.emit('strumlineStateChange', {
            direction: note.noteDirection,
            isPlayerNote: note.isPlayerNote,
            state: 'confirm'
        });
        
        if (!note.isHoldNote) {
            this.scene.time.delayedCall(this.arrowConfigs.confirmHoldTime, () => {
                if (!this.keysHeld[direction]) {
                    arrow.x = arrow.originalX;
                    arrow.y = arrow.originalY;
                    arrow.setTexture('noteStrumline', `static${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`);
                    arrow.setScale(this.arrowConfigs.scale.static);
                    
                    // Emitir evento de cambio a static
                    this.events.emit('strumlineStateChange', {
                        direction: note.noteDirection,
                        isPlayerNote: note.isPlayerNote,
                        state: 'static'
                    });
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
            note.lastHoldHealthTime = this.scene.songPosition; // Nuevo: para control de salud en hold
        }
        
        this.notesHit++;
        const rating = this.ratingManager.recordHit(timeDiff);
        this.combo = this.ratingManager.combo;
        this.maxCombo = this.ratingManager.maxCombo;

        // Añadir ganancia de salud
        if (this.scene.healthBar) {
            this.scene.healthBar.heal(this.healthConfig.hitGain);
        }

        // Emitir evento de nota golpeada
        this.events.emit('noteHit', {
            direction: note.noteDirection,
            isPlayerNote: true,
            timeDiff: timeDiff,
            rating: rating
        });

        // Actualizar tiempo de canto del jugador y posición de la cámara
        if (this.scene.cameraController) {
            this.lastSingTime.player = this.scene.time.now;
            
            if (this.scene.characters?.loadedCharacters) {
                const player = this.scene.characters.loadedCharacters.get(this.scene.characters.currentPlayer);
                if (player?.data) {
                    this.scene.cameraController.updateCameraPosition(player.data);
                }
            }
        }
    }
    
    missNote(note) {
        note.tooLate = true;
        this.notesMissed++;
        
        // Reproducir un sonido de fallo aleatorio
        const randomSound = this.missSounds[Math.floor(Math.random() * this.missSounds.length)];
        if (this.scene.cache.audio.exists(randomSound)) {
            this.scene.sound.play(randomSound, { volume: 0.5 });
        }

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

        // Definir las animaciones de fallo según la dirección
        const missAnims = {
            0: "singLEFTmiss",
            1: "singDOWNmiss",
            2: "singUPmiss",
            3: "singRIGHTmiss"
        };

        // Emitir evento strumlineStateChange para la animación de fallo
        this.events.emit('strumlineStateChange', {
            direction: note.noteDirection,
            isPlayerNote: true,
            state: 'miss',
            animation: missAnims[note.noteDirection]
        });
        
        // Usar RatingManager para registrar el fallo
        this.ratingManager.recordMiss();
        this.combo = this.ratingManager.combo;

        // Añadir pérdida de salud
        if (this.scene.healthBar) {
            this.scene.healthBar.damage(this.healthConfig.missLoss);
        }
    }
    
    spawnNote(note) {        
        this.noteSpawner.spawnNote(note);
    }

    getAllNotes() {
        return this.songNotes.filter(note => 
            note.spawned && 
            (!note.wasHit || (note.isHoldNote && !note.holdEndPassed))
        );
    }
    
    update(songPosition) {
        const currentTime = songPosition;
        const spawnTime = 2000 * this.speed;
        
        // Limpiar notas que ya no son necesarias
        this.songNotes = this.songNotes.filter(note => {
            const timeDiff = note.strumTime - currentTime;
            const isHoldActive = note.isHoldNote && 
                note.wasHit && 
                currentTime <= note.strumTime + note.sustainLength;
            const isInTimeWindow = note.strumTime >= currentTime - 1000 && 
                note.strumTime <= currentTime + spawnTime;
                
            // Solo limpiar si:
            // 1. No es una nota hold y está muy lejos
            // 2. Es una nota hold que ya terminó completamente
            if ((!note.isHoldNote && timeDiff < -1000) || 
                (note.isHoldNote && 
                 !isHoldActive && 
                 currentTime > note.strumTime + note.sustainLength + 500)) {
                this.cleanUpNote(note);
                return false;
            }
            return true;
        });

        // Actualizar notas visibles
        const visibleNotes = this.songNotes.filter(note => {
            const timeDiff = note.strumTime - currentTime;
            return (
                !note.wasHit || 
                (note.isHoldNote && 
                 note.wasHit && 
                 currentTime <= note.strumTime + note.sustainLength) ||
                timeDiff > -1000
            );
        });

        for (const note of visibleNotes) {
            // Spawn new notes
            if (!note.spawned && note.strumTime <= currentTime + spawnTime) {
                this.spawnNote(note);
                note.spawned = true;
            }
            
            if (note.spawned) {
                const timeDiff = note.strumTime - currentTime;
                
                // Update note position
                if (note.sprite?.active) {
                    const noteY = this.calculateNoteY(note, timeDiff);
                    note.sprite.y = noteY;
                    
                    // Update hold note position
                    if (note.isHoldNote && note.holdContainer?.active) {
                        note.holdContainer.y = noteY;
                        
                        // Actualizar visibilidad de los segmentos de hold note
                        if (note.wasHit && note.holdSprites) {
                            const elapsedTime = currentTime - note.strumTime;
                            const totalDuration = note.sustainLength;
                            const progressRatio = Math.max(0, Math.min(1, elapsedTime / totalDuration));
                            const segmentsToDestroy = Math.floor(progressRatio * note.holdSprites.length);

                            note.holdSprites.forEach((sprite, i) => {
                                if (sprite?.active) {
                                    if (i < segmentsToDestroy) {
                                        sprite.destroy();
                                        note.holdSprites[i] = null;
                                    }
                                }
                            });
                        }
                    }
                }
                
                // Handle player notes
                if (note.isPlayerNote) {
                    note.canBeHit = Math.abs(timeDiff) <= this.safeZoneOffset;
                    
                    if (timeDiff < -this.safeZoneOffset && !note.wasHit && !note.tooLate) {
                        this.missNote(note);
                    }
                    
                    if (note.isHoldNote && note.wasHit) {
                        this.updateHoldNote(note, currentTime);
                    }
                } else {
                    // Handle CPU notes
                    if (Math.abs(timeDiff) <= 10 && !note.wasHit) {
                        this.playEnemyNote(note);
                    }
                    
                    if (note.isHoldNote && note.wasHit && note.enemyHoldActive) {
                        this.updateEnemyHoldNote(note, currentTime);
                    }
                }
                
                // Clean up notes that are too far past
                if ((timeDiff < -1000 && !note.isHoldNote) || 
                    (note.isHoldNote && currentTime > note.strumTime + note.sustainLength + 1000)) {
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
        const arrow = this.playerArrows[directionIndex];
        const key = this.keysHeld[direction];
        const targetY = this.arrowConfigs.playerStatic[directionIndex].y;
        const scrollSpeed = 0.45 * this.speed;

        if (!note.isPlayerNote) return;

        if (note.holdSprites && note.holdSprites.length > 0 && note.holdContainer) {
            // Calcular posición base
            const elapsedTime = currentTime - note.strumTime;
            const noteY = targetY + (elapsedTime * -scrollSpeed);
            note.holdContainer.y = noteY;

            // Si la nota está siendo presionada
            if (note.isBeingHeld && key) {
                // Destruir segmentos solo cuando están siendo presionados
                note.holdSprites.forEach((sprite, i) => {
                    if (sprite && sprite.active) {
                        const spriteGlobalY = note.holdContainer.y + sprite.y;
                        if (spriteGlobalY <= targetY) {
                            sprite.destroy();
                            note.holdSprites[i] = null;
                        }
                    }
                });

                // Mantener flecha en estado de confirmación
                const confirmPos = this.arrowConfigs.playerConfirm[directionIndex];
                arrow.setPosition(confirmPos.x, confirmPos.y)
                    .setTexture('noteStrumline', `confirm${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`)
                    .setScale(this.arrowConfigs.scale.confirm);

                // Puntuación mientras se mantiene presionada
                if (currentTime - note.holdScoreTime >= this.holdScoreInterval) {
                    this.score += this.holdScoreRate;
                    note.holdScoreTime = currentTime;
                    
                    if (currentTime - note.lastHoldHealthTime >= this.healthConfig.holdRate) {
                        if (this.scene.healthBar) {
                            this.scene.healthBar.heal(this.healthConfig.holdGain);
                        }
                        note.lastHoldHealthTime = currentTime;
                    }
                }

                // Mientras la nota está siendo presionada, mantener idleTimer en 0
                const character = this.scene.characters?.loadedCharacters.get(this.scene.characters?.currentPlayer);
                if (character) {
                    character.idleTimer = 0;
                }
            } else {
                // Si no está siendo presionada, solo actualizar posición y seguir subiendo
                if (!note.holdReleased && currentTime < holdEndTime - this.safeZoneOffset) {
                    note.holdReleased = true;
                    if (this.scene.healthBar) {
                        this.scene.healthBar.damage(this.healthConfig.missLoss);
                    }
                    this.ratingManager.recordMiss();
                }
            }

            // Verificar si la nota debe ser limpiada
            const hasActiveSprites = note.holdSprites.some(sprite => sprite && sprite.active);
            if (!hasActiveSprites || currentTime >= holdEndTime) {
                this.cleanUpNote(note);
                if (this.activeHoldNotes[directionIndex] === note) {
                    this.activeHoldNotes[directionIndex] = null;
                }
            }
        }
    }
    
    updateEnemyHoldNote(note, currentTime) {
        const holdEndTime = note.strumTime + note.sustainLength;
        const directionIndex = note.noteDirection;
        const direction = this.directions[directionIndex];
        const arrow = this.enemyArrows[directionIndex];
        const targetY = this.arrowConfigs.enemyStatic[directionIndex].y;
        const scrollSpeed = 0.45 * this.speed;

        if (note.holdSprites && note.holdSprites.length > 0 && note.holdContainer) {
            // Calcular posición base
            const elapsedTime = currentTime - note.strumTime;
            const noteY = targetY + (elapsedTime * -scrollSpeed);
            note.holdContainer.y = noteY;

            // Si la nota está activa (siendo "presionada" por la CPU)
            if (note.enemyHoldActive) {
                // Destruir segmentos que pasan el strumline
                note.holdSprites.forEach((sprite, i) => {
                    if (sprite && sprite.active) {
                        const spriteGlobalY = note.holdContainer.y + sprite.y;
                        if (spriteGlobalY <= targetY) {
                            sprite.destroy();
                            note.holdSprites[i] = null;
                        }
                    }
                });

                // Mantener flecha en estado de confirmación
                const confirmPos = this.arrowConfigs.enemyConfirm[directionIndex];
                arrow.setPosition(confirmPos.x, confirmPos.y)
                    .setTexture('noteStrumline', `confirm${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`)
                    .setScale(this.arrowConfigs.scale.confirm);

                // Emitir evento de sustain
                this.events.emit('sustainHold', {
                    isPlayerNote: false,
                    isHolding: true,
                    direction: note.direction,
                    animation: note.animation
                });

                const character = this.scene.characters?.loadedCharacters.get(this.scene.characters?.currentEnemy);
                if (character) {
                    character.idleTimer = 0;
                }

                // Para notas sostenidas del enemigo, mantener el idleTimer en 0
                this.scene.time.addEvent({
                    delay: 16,
                    repeat: Math.floor(note.sustainLength / 16),
                    callback: () => {
                        if (character && note.enemyHoldActive) {
                            character.idleTimer = 0;
                        }
                    }
                });
            } else {
                // Si no está activa, solo seguir subiendo
                if (currentTime >= holdEndTime) {
                    this.cleanUpNote(note);
                    
                    arrow.x = arrow.originalX;
                    arrow.y = arrow.originalY;
                    arrow.setTexture('noteStrumline', `static${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`);
                    arrow.setScale(this.arrowConfigs.scale.static);
                }
            }

            // Verificar si la nota debe ser limpiada
            const hasActiveSprites = note.holdSprites.some(sprite => sprite && sprite.active);
            if (!hasActiveSprites || currentTime >= holdEndTime) {
                this.cleanUpNote(note);
                note.enemyHoldActive = false;
                
                arrow.x = arrow.originalX;
                arrow.y = arrow.originalY;
                arrow.setTexture('noteStrumline', `static${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`);
                arrow.setScale(this.arrowConfigs.scale.static);
            }
        }
    }
    
    calculateNoteY(note, timeDiff) {
        const directionIndex = note.noteDirection;
        const targetY = note.isPlayerNote ? 
            this.arrowConfigs.playerStatic[directionIndex].y : 
            this.arrowConfigs.enemyStatic[directionIndex].y;
        
        // Use BPM-based scrolling
        const scrollSpeed = (0.45 * this.speed) * (this.currentBPM / 100);
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
        // Initialize arrays if they don't exist
        this.playerNotes = this.playerNotes || [];
        this.enemyNotes = this.enemyNotes || [];
        this.playerArrows = this.playerArrows || [];
        this.enemyArrows = this.enemyArrows || [];
        this.keyPressCallbacks = this.keyPressCallbacks || [];
        this.keyReleaseCallbacks = this.keyReleaseCallbacks || [];

        // Clean up player notes
        this.playerNotes.forEach(note => {
            if (note?.sprite?.active) {
                note.sprite.destroy();
            }
            
            if (note?.holdSprites) {
                note.holdSprites.forEach(sprite => {
                    if (sprite?.active) {
                        sprite.destroy();
                    }
                });
            }
        });
        
        // Clean up enemy notes
        this.enemyNotes.forEach(note => {
            if (note?.sprite?.active) {
                note.sprite.destroy();
            }
            
            if (note?.holdSprites) {
                note.holdSprites.forEach(sprite => {
                    if (sprite?.active) {
                        sprite.destroy();
                    }
                });
            }
        });
        
        // Clean up arrows
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
        
        // Clean up key callbacks
        this.keyPressCallbacks.forEach(({ key, callback }) => {
            if (key?.off) {
                key.off('down', callback);
            }
        });
        
        this.keyReleaseCallbacks.forEach(({ key, callback }) => {
            if (key?.off) {
                key.off('up', callback);
            }
        });
        
        // Reset arrays
        this.playerArrows = [];
        this.enemyArrows = [];
        this.playerNotes = [];
        this.enemyNotes = [];
        this.songNotes = [];
        this.keyPressCallbacks = [];
        this.keyReleaseCallbacks = [];
        this.activeHoldNotes = [null, null, null, null];
        
        // Clean up rating manager if it exists
        if (this.ratingManager) {
            this.ratingManager.reset();
        }
        
        console.log("NotesController cleanup complete");
    }

    updateEnemyNotes(songPosition) {
        const currentTime = songPosition;
        
        this.songNotes.forEach(note => {
            // Cambiamos la condición para que procese las notas del enemigo
            if (!note.isPlayerNote && !note.wasHit && note.spawned) {
                // Reducimos la ventana de tiempo para que golpee las notas más precisamente
                if (Math.abs(currentTime - note.strumTime) <= 10) {
                    this.playEnemyNote(note);
                }
            }
        });
    }

    // En el método playEnemyNote, simplificar y asegurar que siempre golpee las notas
    playEnemyNote(note) {
        note.wasHit = true;
        const direction = this.directions[note.noteDirection];
        const arrow = this.enemyArrows[note.noteDirection];
        const confirmPos = this.arrowConfigs.enemyConfirm[note.noteDirection];

        // Destruir sprite de la nota inmediatamente
        if (note.sprite?.active) {
            note.sprite.destroy();
            note.sprite = null;
        }

        // Obtener el personaje enemigo
        const enemy = this.scene.characters?.loadedCharacters.get(this.scene.characters.currentEnemy);

        // Emitir evento de animación de canto
        const singAnims = {
            0: "singLEFT",
            1: "singDOWN",
            2: "singUP",
            3: "singRIGHT"
        };

        // Emitir strumlineStateChange con la animación correspondiente
        this.events.emit('strumlineStateChange', {
            direction: note.noteDirection,
            isPlayerNote: false,
            state: 'confirm',
            sustainNote: note.isHoldNote,
            perfect: true,
            animation: singAnims[note.noteDirection]
        });

        if (arrow) {
            // Animar la flecha
            arrow.x = confirmPos.x;
            arrow.y = confirmPos.y;
            arrow.setTexture('noteStrumline', `confirm${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`);
            arrow.setScale(this.arrowConfigs.scale.confirm);

            // Volver a estado normal después de la animación
            this.scene.time.delayedCall(this.arrowConfigs.confirmHoldTime, () => {
                if (arrow.active && !note.enemyHoldActive) {
                    arrow.x = this.arrowConfigs.enemyStatic[note.noteDirection].x;
                    arrow.y = this.arrowConfigs.enemyStatic[note.noteDirection].y;
                    arrow.setTexture('noteStrumline', `static${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`);
                    arrow.setScale(this.arrowConfigs.scale.static);
                }
            });
        }

        if (enemy) {
            // Resetear cualquier timer de idle existente
            if (enemy.idleTimer !== undefined) {
                enemy.idleTimer = 0;
            }

            // Calcular el tiempo de retorno a idle basado en el BPM
            const bpm = this.scene.songData?.song?.bpm || 100;
            const beatTime = (60 / bpm) * 1000;

            if (note.isHoldNote) {
                note.enemyHoldActive = true;
                note.holdReleased = false;

                // Para notas sostenidas, mantener la animación hasta que termine
                this.scene.time.delayedCall(note.sustainLength, () => {
                    note.enemyHoldActive = false;
                    this.cleanUpNote(note);
                    
                    if (arrow && arrow.active) {
                        arrow.x = this.arrowConfigs.enemyStatic[note.noteDirection].x;
                        arrow.y = this.arrowConfigs.enemyStatic[note.noteDirection].y;
                        arrow.setTexture('noteStrumline', `static${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`);
                        arrow.setScale(this.arrowConfigs.scale.static);
                    }

                    // Programar el retorno a idle después de la nota sostenida
                    if (enemy && enemy.idleTimer !== undefined) {
                        enemy.idleTimer = 0;
                        this.scene.time.delayedCall(beatTime, () => {
                            this.events.emit('strumlineStateChange', {
                                direction: note.noteDirection,
                                isPlayerNote: false,
                                state: 'static'
                            });
                        });
                    }
                });
            } else {
                // Para notas normales
                this.scene.time.delayedCall(beatTime, () => {
                    if (enemy && enemy.idleTimer !== undefined) {
                        enemy.idleTimer = 0;
                        this.events.emit('strumlineStateChange', {
                            direction: note.noteDirection,
                            isPlayerNote: false,
                            state: 'static'
                        });
                    }
                });
                
                this.cleanUpNote(note);
            }
        }

        // Actualizar posición de la cámara
        if (this.scene.cameraController && enemy?.data) {
            this.scene.cameraController.updateCameraPosition(enemy.data);
        }
    }

    // En el método hitNote, añadir después de registrar el hit:
    // hitNote(note, timeDiff) {
    //     // ... código existente ...

    //     // Actualizar posición de la cámara cuando el jugador canta
    //     if (this.scene.characters?.loadedCharacters) {
    //         const player = this.scene.characters.loadedCharacters.get(this.scene.characters.currentPlayer);
    //         if (player?.data) {
    //             this.scene.cameraController?.updateCameraPosition(player.data);
    //         }
    //     }

    //     // ... resto del código existente ...
    // }

    // En el método playEnemyNote, añadir después de registrar el hit:
    // playEnemyNote(note) {
    //     // ... código existente ...

    //     // Actualizar posición de la cámara cuando el enemigo canta
    //     if (this.scene.characters?.loadedCharacters) {
    //         const enemy = this.scene.characters.loadedCharacters.get(this.scene.characters.currentEnemy);
    //         if (enemy?.data) {
    //             this.scene.cameraController?.updateCameraPosition(enemy.data);
    //         }
    //     }

    //     // ... resto del código existente ...
    // }

    // Añadir después del constructor
    async init() {
        if (this.initialized) {
            console.warn('NotesController already initialized');
            return;
        }

        try {
            // Crear flechas del jugador y enemigo
            await this.createPlayerArrows();
            this.createEnemyArrows();
            
            // Configurar manejadores de entrada
            this.setupInputHandlers();
            
            this.initialized = true;
            console.log('NotesController initialized successfully');
        } catch (error) {
            console.error('Error initializing NotesController:', error);
            throw error;
        }
    }

    // Add this method to the NotesController class
    cleanUpNote(note) {
        // Clean up main sprite
        if (note.sprite?.active) {
            note.sprite.destroy();
            note.sprite = null;
        }
        
        // Clean up hold sprites
        if (note.holdSprites) {
            note.holdSprites.forEach(sprite => {
                if (sprite?.active) {
                    sprite.destroy();
                }
            });
            note.holdSprites = [];
        }
        
        // Clean up hold container
        if (note.holdContainer?.active) {
            note.holdContainer.destroy();
            note.holdContainer = null;
        }
        
        // Reset hold state
        if (note.isHoldNote) {
            note.isBeingHeld = false;
            note.enemyHoldActive = false;
            note.holdReleased = true;
            note.holdEndPassed = true;
        }
        
        // Mark note as completely processed
        note.wasHit = true;
        note.tooLate = true;
    }
}