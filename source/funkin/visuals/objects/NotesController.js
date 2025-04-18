import { RatingManager } from './RatingManager.js'

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
                        console.warn("Dirección de nota inválida:", noteData[1], "en sección:", sectionIndex);
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
                arrow.setDepth(10);
                arrow.direction = direction;
                arrow.directionIndex = i;
                arrow.originalX = pos.x;
                arrow.originalY = pos.y;
                
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
            const arrow = this.scene.add.sprite(pos.x, pos.y, 'noteStrumline', `static${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`);
            arrow.setScale(this.arrowConfigs.scale.static);
            arrow.setDepth(10); // Mayor profundidad que los personajes
            arrow.direction = direction;
            arrow.directionIndex = i;
            arrow.originalX = pos.x;
            arrow.originalY = pos.y;
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

        // Emitir evento para reproducir la animación de fallo
        this.events.emit('noteMiss', {
            direction: note.noteDirection,
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
        const isPlayer = note.isPlayerNote;
        const directionIndex = note.noteDirection;
        const direction = this.directions[directionIndex];
        const holdColor = this.holdColors[directionIndex];
        const posConfig = isPlayer ? this.arrowConfigs.playerNotes : this.arrowConfigs.enemyNotes;
        
        if (!posConfig || !posConfig[directionIndex]) {
            console.error('Configuración de posición no válida:', {isPlayer, directionIndex});
            return;
        }
        
        const pos = posConfig[directionIndex];
        const currentTime = this.scene.songPosition;
        const timeDiff = note.strumTime - currentTime;
        const scrollSpeed = 0.45 * this.speed;
        const targetY = isPlayer ? 
            this.arrowConfigs.playerStatic[directionIndex].y : 
            this.arrowConfigs.enemyStatic[directionIndex].y;
        const initialY = targetY + (timeDiff * scrollSpeed);
        
        // Crear nota principal
        const noteSprite = this.scene.add.sprite(
            pos.x, 
            initialY,
            'notes', 
            `note${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`
        );
        noteSprite.setScale(this.arrowConfigs.scale.notes);
        noteSprite.setDepth(15); // Notes above everything
        note.sprite = noteSprite;
        note.spawned = true;
        
        // IMPORTANTE: Verificar texturas antes de crear notas largas
        if (note.isHoldNote) {
            if (!this.scene.textures.exists('NOTE_hold_assets')) {
                console.error('ERROR: Textura de hold notes no encontrada!');
                return;
            }

            const holdDuration = note.sustainLength;
            const pixelsPerMs = 0.45 * this.speed;
            const holdLength = holdDuration * pixelsPerMs;
            const numPieces = Math.max(1, Math.ceil(holdLength / this.holdSegmentHeight));
            
            note.holdSprites = [];
            
            // Modified hold segment creation
            for (let i = 0; i < numPieces; i++) {
                const segmentY = initialY + (i * this.holdSegmentHeight); // Removed +50 offset
                const pieceFrame = `${holdColor} hold piece0000`;

                const holdPiece = this.scene.add.sprite(
                    pos.x,
                    segmentY,
                    'NOTE_hold_assets',
                    pieceFrame
                );
                
                // Enhanced visibility settings
                holdPiece.setScale(this.arrowConfigs.scale.holds);
                holdPiece.setOrigin(0.5, 0);
                holdPiece.setDepth(14); // Hold notes slightly below regular notes
                holdPiece.setAlpha(1);
                holdPiece.setVisible(true);
                holdPiece.setActive(true);
                holdPiece.segmentIndex = i;
                holdPiece.setPipeline('TextureTintPipeline');
                
                note.holdSprites.push(holdPiece);
            }
            
            // End piece with corrected positioning
            const endY = initialY + (numPieces * this.holdSegmentHeight);
            const holdEnd = this.scene.add.sprite(
                pos.x,
                endY,
                'NOTE_hold_assets',
                `${holdColor} hold end0000`
            );
            
            holdEnd.setScale(this.arrowConfigs.scale.holds);
            holdEnd.setOrigin(0.5, 0);
            holdEnd.setDepth(14); // Hold notes slightly below regular notes
            holdEnd.setAlpha(1);
            holdEnd.setVisible(true);
            holdEnd.setActive(true);
            holdEnd.segmentIndex = numPieces;
            holdEnd.setPipeline('TextureTintPipeline');
            
            note.holdSprites.push(holdEnd);
            note.totalHoldSegments = note.holdSprites.length;
            note.holdVisible = true;
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
        
        const visibleNotes = this.songNotes.filter(note => 
            !note.wasHit || 
            (note.isHoldNote && (currentTime <= note.strumTime + note.sustainLength + 500)) ||
            (note.strumTime >= currentTime - 1000 && note.strumTime <= currentTime + spawnTime)
        );

        for (const note of visibleNotes) {
            if (!note.spawned && note.strumTime <= currentTime + spawnTime) {
                this.spawnNote(note);
            }
            
            if (note.spawned) {
                const timeDiff = note.strumTime - currentTime;
                
                if (note.sprite?.active) {
                    const noteY = this.calculateNoteY(note, timeDiff);
                    note.sprite.y = noteY;
                    
                    // Added hold note position updates
                    if (note.isHoldNote && note.holdSprites) {
                        note.holdSprites.forEach((sprite, i) => {
                            if (sprite?.active) {
                                sprite.y = noteY + (i * this.holdSegmentHeight);
                                sprite.setVisible(true);
                                sprite.setAlpha(1);
                            }
                        });
                    }
                }
                
                if (note.isPlayerNote) {
                    note.canBeHit = Math.abs(timeDiff) <= this.safeZoneOffset;
                    
                    if (timeDiff < -this.safeZoneOffset && !note.wasHit && !note.tooLate) {
                        this.missNote(note);
                    }
                    
                    if (note.isHoldNote && note.wasHit) {
                        this.updateHoldNote(note, currentTime);
                    }
                } else {
                    if (Math.abs(timeDiff) <= 10 && !note.wasHit) {
                        this.autoHitEnemyNote(note);
                    }
                    
                    if (note.isHoldNote && note.wasHit && note.enemyHoldActive) {
                        this.updateEnemyHoldNote(note, currentTime);
                    }
                }
                
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

        if (!note.isPlayerNote) return;

        // Calcular la posición base Y de la nota
        const timeDiff = note.strumTime - currentTime;
        const baseY = this.arrowConfigs.playerStatic[directionIndex].y + (timeDiff * (0.45 * this.speed) * (this.currentBPM / 100));

        // Destruir segmentos progresivamente según el avance de la nota
        if (note.holdSprites && note.holdSprites.length > 0) {
            const elapsedTime = currentTime - note.strumTime;
            const totalDuration = note.sustainLength;
            const progressRatio = Math.max(0, Math.min(1, elapsedTime / totalDuration));
            const segmentsToDestroy = Math.floor(progressRatio * note.holdSprites.length);

            let allDestroyed = true;
            note.holdSprites.forEach((sprite, i) => {
                if (sprite && sprite.active) {
                    allDestroyed = false;
                    // Actualizar posición
                    sprite.y = baseY + (i * this.holdSegmentHeight);
                    // Destruir si corresponde
                    if (i < segmentsToDestroy) {
                        sprite.destroy();
                        note.holdSprites[i] = null;
                    }
                }
            });

            // Si todos los segmentos han sido destruidos, termina la nota
            if (allDestroyed || note.holdSprites.every(s => !s)) {
                this.cleanUpNote(note);
                if (this.activeHoldNotes[directionIndex] === note) {
                    this.activeHoldNotes[directionIndex] = null;
                }
                return;
            }
        }

        if (note.isBeingHeld && key) {
            this.events.emit('sustainHold', {
                direction: directionIndex,
                isPlayerNote: true,
                animation: `sing${direction.toUpperCase()}`,
                isHolding: true
            });

            const confirmPos = this.arrowConfigs.playerConfirm[directionIndex];
            arrow.setPosition(confirmPos.x, confirmPos.y)
                .setTexture('noteStrumline', `confirm${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`)
                .setScale(this.arrowConfigs.scale.confirm);

            if (currentTime - note.holdScoreTime >= this.holdScoreInterval) {
                this.score += this.holdScoreRate;
                note.holdScoreTime = currentTime;
            }

            if (currentTime - note.lastHoldHealthTime >= this.healthConfig.holdRate) {
                if (this.scene.healthBar) {
                    this.scene.healthBar.heal(this.healthConfig.holdGain);
                }
                note.lastHoldHealthTime = currentTime;
            }
        } else {
            this.events.emit('sustainHold', {
                direction: directionIndex,
                isPlayerNote: true,
                animation: `sing${direction.toUpperCase()}`,
                isHolding: false
            });

            if (!this.keysHeld[direction]) {
                arrow.setPosition(arrow.originalX, arrow.originalY)
                    .setTexture('noteStrumline', `static${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`)
                    .setScale(this.arrowConfigs.scale.static);
            }

            if (!note.holdReleased && currentTime < holdEndTime - this.safeZoneOffset) {
                note.holdReleased = true;
                if (this.scene.healthBar) {
                    this.scene.healthBar.damage(this.healthConfig.missLoss);
                }
                this.ratingManager.recordMiss();
            }
        }
    }
    
    cleanUpNote(note) {
        if (note.sprite?.active) {
            note.sprite.destroy();
            note.sprite = null;
        }
        
        // IMPORTANTE: Solo limpiar las hold notes cuando la nota realmente termina
        if (note.holdSprites && note.wasHit && note.isHoldNote) {
            note.holdSprites.forEach(sprite => {
                if (sprite?.active) {
                    sprite.destroy();
                }
            });
            note.holdSprites = [];
        }

        note.wasHit = true;
        note.isBeingHeld = false;
        note.holdReleased = true;
        
        const dirIndex = note.noteDirection;
        if (this.activeHoldNotes[dirIndex] === note) {
            this.activeHoldNotes[dirIndex] = null;
        }

        // En NotesController donde manejas el fin de una nota confirmed
        this.events.emit('noteEnd', {
            direction: note.noteDirection,
            isPlayerNote: note.isPlayerNote
        });
    }
    
    autoHitEnemyNote(note) {
        if (note.isPlayerNote) return;

        note.wasHit = true;
        const direction = this.directions[note.noteDirection];
        const arrow = this.enemyArrows[note.noteDirection];
        const confirmPos = this.arrowConfigs.enemyConfirm[note.noteDirection];
        
        arrow.x = confirmPos.x;
        arrow.y = confirmPos.y;
        arrow.setTexture('noteStrumline', `confirm${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`);
        arrow.setScale(this.arrowConfigs.scale.confirm);
        
        // Emitir evento de cambio a confirm
        this.events.emit('strumlineStateChange', {
            direction: note.noteDirection,
            isPlayerNote: false,
            state: 'confirm'
        });

        // Emitir evento para que el enemigo anime
        this.events.emit('cpuNoteHit', {
            direction: note.noteDirection,
            isPlayerNote: false,
            strumTime: note.strumTime
        });

        if (note.sprite?.active) {
            note.sprite.destroy();
            note.sprite = null;
        }
        
        if (!note.isHoldNote) {
            this.scene.time.delayedCall(this.arrowConfigs.confirmHoldTime, () => {
                if (arrow.active) {
                    arrow.x = arrow.originalX;
                    arrow.y = arrow.originalY;
                    arrow.setTexture('noteStrumline', `static${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`);
                    arrow.setScale(this.arrowConfigs.scale.static);
                    
                    // Emitir evento de cambio a static
                    this.events.emit('strumlineStateChange', {
                        direction: note.noteDirection,
                        isPlayerNote: false,
                        state: 'static'
                    });
                }
            });
        } else {
            note.isBeingHeld = true;
            note.enemyHoldActive = true;
        }
    }

    updateEnemyHoldNote(note, currentTime) {
        const holdEndTime = note.strumTime + note.sustainLength;
        const directionIndex = note.noteDirection;
        const direction = this.directions[directionIndex];
        const arrow = this.enemyArrows[directionIndex];
        const targetY = this.arrowConfigs.enemyStatic[directionIndex].y;

        const timeDiff = note.strumTime - currentTime;
        const scrollSpeed = 0.45 * this.speed;
        
        if (note.holdSprites && note.holdSprites.length > 0) {
            const elapsedTime = currentTime - note.strumTime;
            const totalDuration = note.sustainLength;
            const progressRatio = Math.max(0, Math.min(1, elapsedTime / totalDuration));
            const segmentsToDestroy = Math.floor(progressRatio * note.holdSprites.length);
            
            const baseY = targetY + (timeDiff * scrollSpeed);
            
            let allDestroyed = true;
            note.holdSprites.forEach((sprite, i) => {
                if (sprite?.active) {
                    allDestroyed = false;
                    
                    if (i < segmentsToDestroy || baseY + (i * this.holdSegmentHeight) <= targetY) {
                        sprite.destroy();
                        note.holdSprites[i] = null;
                    } else {
                        sprite.y = baseY + 50 + (i * this.holdSegmentHeight);
                    }
                }
            });
            
            if (allDestroyed) {
                this.cleanUpNote(note);
                note.enemyHoldActive = false;
                
                arrow.x = arrow.originalX;
                arrow.y = arrow.originalY;
                arrow.setTexture('noteStrumline', `static${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`);
                arrow.setScale(this.arrowConfigs.scale.static);
                return;
            }
        }

        if (note.enemyHoldActive) {
            const confirmPos = this.arrowConfigs.enemyConfirm[directionIndex];
            arrow.x = confirmPos.x;
            arrow.y = confirmPos.y;
            arrow.setTexture('noteStrumline', `confirm${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`);
            arrow.setScale(this.arrowConfigs.scale.confirm);
        }

        if (currentTime >= holdEndTime) {
            this.cleanUpNote(note);
            note.enemyHoldActive = false;
            
            arrow.x = arrow.originalX;
            arrow.y = arrow.originalY;
            arrow.setTexture('noteStrumline', `static${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`);
            arrow.setScale(this.arrowConfigs.scale.static);
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

    updateEnemyNotes(songPosition) {
        this.enemyNotes.forEach(note => {
            if (!note.wasHit && !note.tooLate && songPosition >= note.strumTime) {
                this.playEnemyNote(note);
            }
        });
    }

    playEnemyNote(note) {
        note.wasHit = true;
        const direction = this.directions[note.noteDirection];
        const arrow = this.enemyArrows[note.noteDirection];
        const confirmPos = this.arrowConfigs.enemyConfirm[note.noteDirection];

        if (arrow) {
            arrow.x = confirmPos.x;
            arrow.y = confirmPos.y;
            arrow.setTexture('noteStrumline', `confirm${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`);
            arrow.setScale(this.arrowConfigs.scale.confirm);

            // Asegurarse de que la animación de confirmación se restablezca
            this.scene.time.delayedCall(this.arrowConfigs.confirmHoldTime, () => {
                if (arrow.active) {
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
            note.enemyHoldActive = true;
        }

        // Emitir evento para la animación del enemigo
        this.events.emit('cpuNoteHit', {
            direction: note.noteDirection,
            isPlayerNote: false,
            strumTime: note.strumTime
        });
    }

    handleNoteRelease(noteData) {
        const arrow = this.playerArrows[noteData];
        const direction = this.directions[noteData];
        const activeSustainNote = this.activeHoldNotes[noteData];

        this.keysHeld[direction] = false;

        if (arrow) {
            arrow.x = arrow.originalX;
            arrow.y = arrow.originalY;
            arrow.setTexture('noteStrumline', `static${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`);
            arrow.setScale(this.arrowConfigs.scale.static);
        }

        if (activeSustainNote) {
            activeSustainNote.isBeingHeld = false;
            const currentTime = this.scene.songPosition;
            const holdEndTime = activeSustainNote.strumTime + activeSustainNote.sustainLength;

            if (currentTime < holdEndTime - this.safeZoneOffset && !activeSustainNote.holdReleased) {
                activeSustainNote.holdReleased = true;
                this.ratingManager.recordMiss();
            }
        }
    }

    updateScrollSpeed(bpm) {
        this.currentBPM = bpm;
        this.speed = this.currentBPM / 100; // Base speed normalized to 100 BPM
    }

    // Método helper para suscribirse a eventos
    on(event, fn) {
        this.events.on(event, fn);
    }

    // Add this method to handle note release
    onNoteRelease(note) {
        this.events.emit('noteRelease', {
            direction: note.noteDirection,
            isPlayerNote: note.isPlayerNote
        });
    }

    handleCPUNote(note) {
        // Emit cpuNoteHit event
        this.events.emit('cpuNoteHit', {
            direction: note.direction,
            isPlayerNote: false,
            strumTime: note.strumTime
        });
    }

    async init() {
        try {
            // Limpiar handlers previos si existen
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

            // Reset arrays
            this.keyPressCallbacks = [];
            this.keyReleaseCallbacks = [];
            
            // Crear las flechas
            await this.createPlayerArrows();
            await this.createEnemyArrows();
            
            // Marcar como inicializado
            this.initialized = true;
            
            console.log('NotesController initialized successfully');
            return true;
        } catch (error) {
            console.error('Error initializing NotesController:', error);
            return false;
        }
    }
}