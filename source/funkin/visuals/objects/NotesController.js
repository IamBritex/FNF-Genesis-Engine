import { RatingManager } from './RatingManager.js'
import { NoteSpawner } from './ModularArrows/Notes.js'
import { HoldNotes } from './ModularArrows/HoldNotes.js';
import { Pharser } from './ModularArrows/Pharser.js';
import { StrumlinesNotes } from './ModularArrows/StrumlinesNotes.js';

export class NotesController {
    constructor(scene) {
        this.scene = scene;
        // --- Define offsets antes de crear StrumlinesNotes ---
        this.offsets = {
            static: { x: 0, y: 0 },
            press: { x: 28, y: 28 },
            confirm: { x: 11, y: 12 },
            note: { x: 21, y: 0 },
            hold: { x: 68, y: 30 }
        };

        this.initialized = false;
        this.bpm = 100;
        this.speed = 1;
        this.safeFrames = 15;
        this.safeZoneOffset = (this.safeFrames / 60) * 1000;
        this.songNotes = [];
        this.playerNotes = [];
        this.enemyNotes = [];
        this.notesHit = 0;
        this.notesMissed = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.score = 0;

        this.ratingManager = new RatingManager(scene);
        this.configureRatingManager();

        this.setupKeyBindings();
        this.keysHeld = { left: false, down: false, up: false, right: false };
        this.events = new Phaser.Events.EventEmitter();

        this.holdScoreRate = 100;
        this.holdScoreInterval = 100;
        this.holdPenalty = 50;

        this.activeHoldNotes = [null, null, null, null];
        this.activeEnemyHoldNotes = [null, null, null, null]; // Nuevo array para notas enemigas

        this.noteVisibilityConfig = {
            spawnOffset: 2000,
            despawnOffset: 1000,
            holdNoteDespawnDelay: 500
        };

        this.currentBPM = 100;

        this.missSounds = [
            'missnote1',
            'missnote2',
            'missnote3'
        ];

        this.healthConfig = {
            hitGain: 0.023,
            missLoss: 0.05,
            holdGain: 0.023/10,
            holdRate: 60
        };

        this.noteSpawner = new NoteSpawner(scene, this);
        this.holdNotes = new HoldNotes(scene, this);
        this.strumlines = new StrumlinesNotes(scene, this);

        this.lastSingTime = {
            player: 0,
            enemy: 0
        };

        this.enemyHeldDirections = new Map();

        this.botEnabled = false;
        this.botKey = this.scene.input.keyboard.addKey('B');
        this.botKey.on('down', this.toggleBot, this);

        this.botReactionTime = 16; // ms
        this.lastBotHitTime = 0;

        this.uiElements = [];
    }

    // Input setup
    async setupKeyBindings() {
        // Lee directamente de localStorage
        const leftKey = localStorage.getItem('CONTROLS.NOTES.LEFT') || 'LEFT';
        const downKey = localStorage.getItem('CONTROLS.NOTES.DOWN') || 'DOWN';
        const upKey = localStorage.getItem('CONTROLS.NOTES.UP') || 'UP';
        const rightKey = localStorage.getItem('CONTROLS.NOTES.RIGHT') || 'RIGHT';

        // Crear los keyCodes dinámicamente
        this.keyBindings = {
            left: [
                this.scene.input.keyboard.addKey(
                    Phaser.Input.Keyboard.KeyCodes[leftKey.toUpperCase()] || Phaser.Input.Keyboard.KeyCodes.LEFT
                ),
            ],
            down: [
                this.scene.input.keyboard.addKey(
                    Phaser.Input.Keyboard.KeyCodes[downKey.toUpperCase()] || Phaser.Input.Keyboard.KeyCodes.DOWN
                ),
            ],
            up: [
                this.scene.input.keyboard.addKey(
                    Phaser.Input.Keyboard.KeyCodes[upKey.toUpperCase()] || Phaser.Input.Keyboard.KeyCodes.UP
                ),
            ],
            right: [
                this.scene.input.keyboard.addKey(
                    Phaser.Input.Keyboard.KeyCodes[rightKey.toUpperCase()] || Phaser.Input.Keyboard.KeyCodes.RIGHT
                ),
            ]
        };
    }

    directions = ['left', 'down', 'up', 'right'];
    holdColors = ['purple', 'blue', 'green', 'red'];

    configureRatingManager() {
        this.ratingManager.configure({
            positions: {
                rating: { x: null, y: 300 },
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
        this.songNotes = Pharser.parseNotes(songData);

        this.bpm = bpm || songData.bpm || (songData.song && songData.song.bpm) || 100;
        this.speed = speed || songData.speed || (songData.song && songData.song.speed) || 1;
        this.crochet = (60 / this.bpm) * 1000;
        this.stepCrochet = this.crochet / 4;
        this.safeZoneOffset = Math.floor(this.safeFrames / 60 * 1000);

        const playerNotes = this.songNotes.filter(note => note.isPlayerNote).length;
        const enemyNotes = this.songNotes.filter(note => !note.isPlayerNote).length;
        console.log("Total notes loaded:", this.songNotes.length);
        console.log("Player notes:", playerNotes);
        console.log("Enemy notes:", enemyNotes);
    }
    
    setupInputHandlers() {
        if (!this.initialized) {
            console.log('NotesController initialized');
            return;
        }

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
                if (!this.initialized || !this.strumlines.playerStrumline[index] || this.scene.isPaused()) return;
                const arrow = this.strumlines.playerStrumline[index];

                if (!this.keysHeld[direction]) {
                    this.keysHeld[direction] = true;

                    if (!arrow || !arrow.active) {
                        console.warn(`Arrow ${direction} no está disponible`);
                        return;
                    }

                    // Calcula posición de "press" y "confirm"
                    const pos = this.getStrumlinePositions(true)[index];
                    const pressOffset = this.offsets.press;
                    const confirmOffset = this.offsets.confirm;
                    const pressPos = { x: pos.x + (pressOffset.x || 0), y: pos.y + (pressOffset.y || 0) };
                    const confirmPos = { x: pos.x + (confirmOffset.x || 0), y: pos.y + (confirmOffset.y || 0) };

                    // ¿Hay nota presionable?
                    let hasHittableNote = false;
                    const currentTime = this.scene.songPosition;
                    for (const note of this.songNotes) {
                        if (
                            note.isPlayerNote &&
                            note.noteDirection === index &&
                            !note.wasHit &&
                            !note.tooLate &&
                            note.spawned
                        ) {
                            const timeDiff = note.strumTime - currentTime;
                            if (Math.abs(timeDiff) <= this.safeZoneOffset) {
                                hasHittableNote = true;
                                break;
                            }
                        }
                    }

                    if (hasHittableNote) {
                        arrow.x = confirmPos.x;
                        arrow.y = confirmPos.y;
                        arrow.setTexture('noteStrumline', `confirm${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`);
                        arrow.setScale(this.strumlines.defaultScale.confirm);

                        this.checkNoteHit(index);
                    } else {
                        arrow.x = pressPos.x;
                        arrow.y = pressPos.y;
                        arrow.setTexture('noteStrumline', `press${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`);
                        arrow.setScale(this.strumlines.defaultScale.press);

                        // GHOST TAPPING: Si está desactivado, cuenta como miss si presionas sin nota
                        const ghostTapping = localStorage.getItem('GAMEPLAY.NOTE SETTINGS.GHOST TAPPING');
                        if (ghostTapping === 'false') {
                            // Crear un "fake note" para el miss visual y lógica
                            this.missNote({
                                isPlayerNote: true,
                                noteDirection: index,
                                wasHit: false,
                                tooLate: false,
                                spawned: true,
                                isHoldNote: false,
                                sprite: null
                            });
                        }
                    }
                }
            };

            const releaseHandler = () => {
                if (!this.initialized || !this.strumlines.playerStrumline[index] || this.scene.isPaused()) return;

                this.keysHeld[direction] = false;
                const arrow = this.strumlines.playerStrumline[index];

                if (!arrow || !arrow.active || typeof arrow.originalX === 'undefined') {
                    console.warn(`Arrow ${direction} no está disponible o no tiene posición original`);
                    return;
                }

                arrow.x = arrow.originalX;
                arrow.y = arrow.originalY;
                arrow.setTexture('noteStrumline', `static${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`);
                arrow.setScale(this.strumlines.defaultScale.static);

                this.events.emit('noteReleased', {
                    direction: index,
                    isPlayerNote: true
                });

                if (this.activeHoldNotes[index]) {
                    const holdNote = this.activeHoldNotes[index];
                    const currentTime = this.scene.songPosition;
                    const holdEndTime = holdNote.strumTime + holdNote.sustainLength;

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
        let closestTimeDiff = Infinity;

        for (const note of this.songNotes) {
            if (
                note.isPlayerNote &&
                note.noteDirection === directionIndex &&
                !note.wasHit &&
                !note.tooLate &&
                note.spawned
            ) {
                const timeDiff = note.strumTime - currentTime;
                if (Math.abs(timeDiff) <= this.safeZoneOffset && Math.abs(timeDiff) < Math.abs(closestTimeDiff)) {
                    closestNote = note;
                    closestTimeDiff = timeDiff;
                }
            }
        }

        if (closestNote) {
            this.hitNote(closestNote, closestTimeDiff);
        }
    }
    
    // Modifica hitNote para usar strumlines
    hitNote(note, timeDiff) {
        note.wasHit = true;
        const direction = this.directions[note.noteDirection];
        const arrow = this.strumlines.playerStrumline[note.noteDirection];
        const pos = this.getStrumlinePositions(true)[note.noteDirection];
        const confirmOffset = this.offsets.confirm;
        const confirmPos = { x: pos.x + (confirmOffset.x || 0), y: pos.y + (confirmOffset.y || 0) };

        arrow.x = confirmPos.x;
        arrow.y = confirmPos.y;
        arrow.setTexture('noteStrumline', `confirm${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`);
        arrow.setScale(this.strumlines.defaultScale.confirm);

        this.events.emit('strumlineStateChange', {
            direction: note.noteDirection,
            isPlayerNote: note.isPlayerNote,
            state: 'confirm'
        });

        if (!note.isHoldNote) {
            this.scene.time.delayedCall(103, () => {
                if (!this.keysHeld[direction]) {
                    arrow.x = arrow.originalX;
                    arrow.y = arrow.originalY;
                    arrow.setTexture('noteStrumline', `static${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`);
                    arrow.setScale(this.strumlines.defaultScale.static);
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
            note.lastHoldHealthTime = this.scene.songPosition;
        }
        
        this.notesHit++;
        // BOTPLAY: Forzar rating perfecto si el bot está activo
        let rating;
        if (this.botEnabled) {
            rating = this.ratingManager.recordHit(0); // 0 ms de diferencia = SICK
        } else {
            rating = this.ratingManager.recordHit(timeDiff);
        }
        this.combo = this.ratingManager.combo;
        this.maxCombo = this.ratingManager.maxCombo;

        if (this.scene.healthBar) {
            this.scene.healthBar.heal(this.healthConfig.hitGain);
        }

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
    
    async init() {
        if (this.initialized) {
            console.warn('NotesController already initialized');
            return;
        }

        try {
            // --- Crear strumlines y agregarlas a la UI ---
            await this.strumlines.createPlayerStrumline();
            this.strumlines.createEnemyStrumline();

            // Aplica visuales especiales a las strumlines enemigas desde el inicio
            if (this.enemyStrumlineVisuals) {
                this.strumlines.enemyStrumline.forEach(arrow => {
                    if (arrow) {
                        arrow.setScale(this.enemyStrumlineVisuals.scale);
                        arrow.setAlpha(this.enemyStrumlineVisuals.alpha);
                    }
                });
            }

            // Agregar flechas a la capa UI usando cameraController
            if (this.scene.cameraController) {
                // Player strumline
                this.strumlines.playerStrumline.forEach(arrow => {
                    if (arrow) {
                        this.scene.cameraController.addToUILayer(arrow);
                        arrow.setScale(this.strumlines.defaultScale.static); // <-- Fuerza la escala después de añadir a la UI
                    }
                });
                // Enemy strumline
                this.strumlines.enemyStrumline.forEach(arrow => {
                    if (arrow) {
                        this.scene.cameraController.addToUILayer(arrow);
                        // Mantén la escala especial si aplica
                        const scale = this.enemyStrumlineVisuals
                            ? this.strumlines.defaultScale.static * this.enemyStrumlineVisuals.scale
                            : this.strumlines.defaultScale.static;
                        arrow.setScale(scale);
                    }
                });
                // Forzar actualización de capas
                this.scene.cameraController._setupCameraLayers();
            }

            // Guardar referencias para PlayState (para _setupUICameraElements)
            this.uiElements = [
                ...this.strumlines.playerStrumline,
                ...this.strumlines.enemyStrumline
            ];

            this.setupInputHandlers();
            this.initialized = true;
            console.log('NotesController initialized successfully');
        } catch (error) {
            console.error('Error initializing NotesController:', error);
            throw error;
        }
    }
    
    update(songPosition) {
        // No actualizar si el juego está pausado
        if (this.scene.isPaused()) return;
        
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
                
            if ((!note.isHoldNote && timeDiff < -1000) || 
                (note.isHoldNote && 
                 !isHoldActive && 
                 currentTime > note.strumTime + note.sustainLength + 500)) {
                this.cleanUpNote(note);
                return false;
            }
            return true;
        });

        // Actualizar notas visibles y posiciones usando NoteSpawner
        this.noteSpawner.updateNotes(this.songNotes, currentTime, this.speed, this.currentBPM);

        // Lógica de spawn
        for (const note of this.songNotes) {
            if (!note.spawned && note.strumTime <= currentTime + spawnTime) {
                this.spawnNote(note);
                note.spawned = true;
            }
        }
        
        // Handle player notes
        for (const note of this.songNotes) {
            if (note.isPlayerNote) {
                const timeDiff = note.strumTime - currentTime;
                note.canBeHit = Math.abs(timeDiff) <= this.safeZoneOffset;

                if (!note.wasHit && !note.tooLate && timeDiff < -this.safeZoneOffset) {
                    this.missNote(note);
                }
            } else {
                // CPU: acierta solo cuando está en la ventana perfecta
                const timeDiff = note.strumTime - currentTime;
                if (!note.wasHit && Math.abs(timeDiff) <= this.safeZoneOffset && timeDiff <= 0) {
                    this.playEnemyNote(note);
                }
            }
        }

        // Actualizar hold notes activas para ambos lados
        this.updateActiveHoldNotes(currentTime);

        const time = this.scene.time.now;
        const floatOffset = Math.sin(time / 500) * 1000;

        this.strumlines.playerStrumline.forEach(arrow => {
            if (arrow && typeof arrow.baseY === 'number') {
                arrow.y = arrow.baseY + floatOffset;
            }
        })

        this.strumlines.enemyStrumline.forEach(arrow => {
            if (arrow && typeof arrow.baseY === 'number') {
                arrow.y = arrow.baseY + floatOffset;
            }
        })

        // Añadir lógica del bot antes del update normal
        if (this.botEnabled) {
            this.updateBot(songPosition);
        }
    }

    // Nuevo método para actualizar hold notes activas
    updateActiveHoldNotes(currentTime) {
        // Actualizar hold notes del jugador
        for (let i = 0; i < this.activeHoldNotes.length; i++) {
            const note = this.activeHoldNotes[i];
            if (note && note.isPlayerNote && !note.cleanedUp) {
                this.holdNotes.updateHoldNote(note, currentTime);
                
                // Si la nota fue limpiada durante la actualización, removerla
                if (note.cleanedUp) {
                    this.activeHoldNotes[i] = null;
                }
            }
        }

        // Actualizar hold notes del enemigo
        for (let i = 0; i < this.activeEnemyHoldNotes.length; i++) {
            const note = this.activeEnemyHoldNotes[i];
            if (note && !note.isPlayerNote && !note.cleanedUp) {
                this.holdNotes.updateEnemyHoldNote(note, currentTime);
                
                // Si la nota fue limpiada durante la actualización, removerla
                if (note.cleanedUp) {
                    this.activeEnemyHoldNotes[i] = null;
                }
            }
        }
    }

    updateBot(currentTime) {
        // El bot debe presionar la nota exactamente cuando strumTime == currentTime (en la línea de golpeo)
        for (let dirIndex = 0; dirIndex < this.directions.length; dirIndex++) {
            const direction = this.directions[dirIndex];

            // Buscar la nota más cercana para esta dirección
            let closestNote = null;
            let closestTimeDiff = Infinity;

            for (const note of this.songNotes) {
                if (
                    note.isPlayerNote &&
                    note.noteDirection === dirIndex &&
                    !note.wasHit &&
                    !note.tooLate &&
                    note.spawned
                ) {
                    const timeDiff = note.strumTime - currentTime;
                    // Solo considerar la nota si está exactamente en la línea de golpeo (±1 frame de margen)
                    if (
                        Math.abs(timeDiff) <= (1000 / 60) // 1 frame de margen (16.66ms)
                        && Math.abs(timeDiff) < Math.abs(closestTimeDiff)
                    ) {
                        closestNote = note;
                        closestTimeDiff = timeDiff;
                    }
                }
            }

            // Presionar la tecla SOLO cuando la nota está en la línea de golpeo
            if (closestNote && Math.abs(closestTimeDiff) <= (1000 / 60)) {
                if (!this.keysHeld[direction]) {
                    this.keysHeld[direction] = true;
                    this.checkNoteHit(dirIndex);
                    this.lastBotHitTime = currentTime;
                }
            } else {
                // Si no hay nota presionable y la tecla está presionada, soltarla
                if (this.keysHeld[direction]) {
                    this.keysHeld[direction] = false;
                }
            }

            // Para notas hold, mantener presionada la tecla mientras dure la nota
            for (const note of this.songNotes) {
                if (
                    note.isPlayerNote &&
                    note.isHoldNote &&
                    note.noteDirection === dirIndex &&
                    note.wasHit &&
                    !note.holdReleased
                ) {
                    const holdEnd = note.strumTime + note.sustainLength;
                    if (currentTime < holdEnd - this.safeZoneOffset) {
                        this.keysHeld[direction] = true;
                    } else {
                        this.keysHeld[direction] = false;
                    }
                }
            }
        }
    }

    cleanUpNote(note) {
        // Limpiar de los arreglos activos
        if (note.isPlayerNote) {
            this.activeHoldNotes[note.noteDirection] = null;
        } else {
            this.activeEnemyHoldNotes[note.noteDirection] = null;
        }
        
        this.noteSpawner.cleanUpNote(note);
    }

    toggleBot() {
        this.botEnabled = !this.botEnabled;
        console.log(`Bot ${this.botEnabled ? 'enabled' : 'disabled'}`);
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
        this.noteSpawner.cleanup();
        this.playerNotes = [];
        this.enemyNotes = [];
        this.songNotes = [];
        this.keyPressCallbacks = [];
        this.keyReleaseCallbacks = [];
        this.activeHoldNotes = [null, null, null, null];
        this.activeEnemyHoldNotes = [null, null, null, null];

        if (this.ratingManager) this.ratingManager.reset();
        if (this.strumlines) this.strumlines.destroyStrumlines();

        // Limpiar referencias UI
        this.uiElements = [];

        console.log("NotesController cleanup complete");
    }

    updateEnemyNotes(songPosition) {
        const currentTime = songPosition;
        
        this.songNotes.forEach(note => {
            if (!note.isPlayerNote && !note.wasHit && note.spawned) {
                // La CPU acierta la nota en cuanto aparece en pantalla
                this.playEnemyNote(note);
            }
        });
    }

    // En el método playEnemyNote, simplificar y asegurar que siempre golpee las notas
    playEnemyNote(note) {
        note.wasHit = true;
        const direction = this.directions[note.noteDirection];
        const arrow = this.strumlines.enemyStrumline[note.noteDirection];
        const pos = this.getStrumlinePositions(false)[note.noteDirection];
        const confirmOffset = this.offsets.confirm;
        const confirmPos = { x: pos.x + (confirmOffset.x || 0), y: pos.y + (confirmOffset.y || 0) };

        if (note.sprite?.active) {
            note.sprite.destroy();
            note.sprite = null;
        }

        const enemy = this.scene.characters?.loadedCharacters.get(this.scene.characters.currentEnemy);

        const singAnims = {
            0: "singLEFT",
            1: "singDOWN",
            2: "singUP",
            3: "singRIGHT"
        };

        this.events.emit('strumlineStateChange', {
            direction: note.noteDirection,
            isPlayerNote: false,
            state: 'confirm',
            sustainNote: note.isHoldNote,
            perfect: true,
            animation: singAnims[note.noteDirection]
        });

        // --- Mantener escala y opacidad especial ---
        const enemyVisuals = this.enemyStrumlineVisuals;
        const scaleConfirm = this.strumlines.defaultScale.confirm * (enemyVisuals ? enemyVisuals.scale : 1);
        const scaleStatic = this.strumlines.defaultScale.static * (enemyVisuals ? enemyVisuals.scale : 1);
        const alpha = enemyVisuals ? enemyVisuals.alpha : 1;

        if (arrow) {
            arrow.x = confirmPos.x;
            arrow.y = confirmPos.y;
            arrow.setTexture('noteStrumline', `confirm${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`);
            arrow.setScale(scaleConfirm);
            arrow.setAlpha(alpha);

            this.scene.time.delayedCall(103, () => {
                if (!note.isHoldNote) {
                    arrow.x = arrow.originalX;
                    arrow.y = arrow.originalY;
                    arrow.setTexture('noteStrumline', `static${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`);
                    // Mantener SIEMPRE la escala y alpha especial
                    arrow.setScale(scaleStatic);
                    arrow.setAlpha(alpha);
                }
            });
        }

        if (note.isHoldNote) {
            note.isBeingHeld = true;
            note.enemyHoldActive = true;
            this.activeEnemyHoldNotes[note.noteDirection] = note;
            note.holdScoreTime = this.scene.songPosition;
            note.lastHoldHealthTime = this.scene.songPosition;
        }

        // --- EMITIR EL EVENTO PARA LUA ---
        if (this.scene.events && typeof this.scene.events.emit === 'function') {
            this.scene.events.emit('enemyNoteHit', note);
        }
    }
    
    // Debe estar aquí, fuera del constructor:
    getStrumlinePositions(isPlayer = true) {
        const arrowWidth = 64;
        const separation = 110;
        const staticOffset = this.offsets.static;
        let baseX, baseY;

        // Leer desde localStorage
        const middleScroll = localStorage.getItem('GAMEPLAY.NOTE SETTINGS.MIDDLESCROLL') === 'true';
        const downScroll = localStorage.getItem('GAMEPLAY.NOTE SETTINGS.DOWNSCROLL') === 'true';
        const opponentNotes = localStorage.getItem('GAMEPLAY.NOTE SETTINGS.OPPONENT NOTES') === 'true';

        // Calcular baseY según downscroll
        if (downScroll) {
            baseY = this.scene.cameras.main.height - arrowWidth - 120;
        } else {
            baseY = 40;
        }

        if (isPlayer) {
            if (middleScroll) {
                const totalWidth = (separation * (this.directions.length - 1)) + arrowWidth;
                baseX = 400;
            } else {
                baseX = 780;
            }
            return this.directions.map((_, i) => ({
                x: baseX + (separation * i) + (staticOffset.x || 0),
                y: baseY + (staticOffset.y || 0)
            }));
        } else {
            // Enemy strumlines: si middleScroll, solo cambia escala y opacidad, NO la posición X
            const enemyScale = middleScroll ? 0.8 : 1;
            // Si opponentNotes es false, alpha = 0
            let enemyAlpha = !opponentNotes ? 0 : (middleScroll ? 0.5 : 1);
            const enemySeparation = separation * (middleScroll ? 0.7 : 1);
            baseX = 40; // Siempre a la izquierda

            this.enemyStrumlineVisuals = { scale: enemyScale, alpha: enemyAlpha };

            let enemyBaseY;
            if (middleScroll && !downScroll) {
                enemyBaseY = (this.scene.cameras.main.height / 2) - 200;
            } else if (middleScroll && downScroll) {
                enemyBaseY = this.scene.cameras.main.height / 2 - arrowWidth + 200;
            } else if (downScroll) {
                enemyBaseY = this.scene.cameras.main.height - arrowWidth - 120;
            } else {
                enemyBaseY = baseY;
            }

            return this.directions.map((_, i) => ({
                x: baseX + (enemySeparation * i) + (staticOffset.x || 0),
                y: enemyBaseY + (staticOffset.y || 0)
            }));
        }
    }

    disableInputs() {
        // Desactiva los handlers de input
        if (this.keyPressCallbacks) {
            this.keyPressCallbacks.forEach(({ key, callback }) => key.off('down', callback));
        }
        if (this.keyReleaseCallbacks) {
            this.keyReleaseCallbacks.forEach(({ key, callback }) => key.off('up', callback));
        }
    }

    enableInputs() {
        // Vuelve a activar los handlers de input
        this.setupInputHandlers();
    }
}
