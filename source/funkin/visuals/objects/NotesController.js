import { RatingManager } from './RatingManager.js'
import { NoteSpawner } from './ModularArrows/Notes.js'
import { HoldNotes } from './ModularArrows/HoldNotes.js';
import { Pharser } from './ModularArrows/Pharser.js';
import { StrumlinesNotes } from './ModularArrows/StrumlinesNotes.js';
import { NoteSplashes } from './ModularArrows/NoteSplashes.js';

/**
 * Main controller for handling note gameplay logic
 */
export class NotesController {
    /**
     * @param {Phaser.Scene} scene - The phaser scene instance 
     */
    constructor(scene) {
        this.scene = scene;
        this.offsets = {
            static: { x: 0, y: 0 },
            press: { x: 28, y: 28 },
            confirm: { x: 11, y: 12 },
            note: { x: 21, y: 0 },
            hold: { x: 74, y: 30 }
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
        this.activeEnemyHoldNotes = [null, null, null, null];

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
        this.noteSplashes = new NoteSplashes(scene, this, 62, 72);

        this.lastSingTime = {
            player: 0,
            enemy: 0
        };

        this.enemyHeldDirections = new Map();

        this.botEnabled = false;
        this.botKey = this.scene.input.keyboard.addKey('B');
        this.botKey.on('down', this.toggleBot, this);
        this.botReactionTime = 16;
        this.lastBotHitTime = 0;

        this.uiElements = [];
    }

    /**
     * Sets up keyboard bindings from localStorage
     */
    async setupKeyBindings() {
        const leftKey = localStorage.getItem('CONTROLS.NOTES.LEFT') || 'LEFT';
        const downKey = localStorage.getItem('CONTROLS.NOTES.DOWN') || 'DOWN';
        const upKey = localStorage.getItem('CONTROLS.NOTES.UP') || 'UP';
        const rightKey = localStorage.getItem('CONTROLS.NOTES.RIGHT') || 'RIGHT';

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
                    rotation: 0
                }
            }
        });
    }

    /**
     * Loads notes from song data
     * @param {Object} songData - The song data containing notes 
     * @param {number} bpm - Option BPM override
     * @param {number} speed - Optional speed override
     */
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
    
    /**
     *  Sets up input handlers for note controls
     */
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

                    const pos = this.getStrumlinePositions(true)[index];
                    const pressOffset = this.offsets.press;
                    const confirmOffset = this.offsets.confirm;
                    const pressPos = { x: pos.x + (pressOffset.x || 0), y: pos.y + (pressOffset.y || 0) };
                    const confirmPos = { x: pos.x + (confirmOffset.x || 0), y: pos.y + (confirmOffset.y || 0) };

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

                        const ghostTapping = localStorage.getItem('GAMEPLAY.NOTE SETTINGS.GHOST TAPPING');
                        if (ghostTapping === 'false') {
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

    /**
     * Check for note hits in a specific direction
     * @param {number} directionIndex - The direction index to check 
     */
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
    
    /**
     * Handles a successful note hit
     * @param {Object} note - The note tat was hit
     * @param {number} timeDiff - The time difference between the note and the current timing
     */
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

        if (note.isHoldNote) {
            if (!this.activeHoldNotes[note.noteDirection]) {
                this.activeHoldNotes[note.noteDirection] = note;
                note.isBeingHeld = true;
                note.holdReleased = false;
            }
            if (note.sprite?.active) {
                note.sprite.destroy();
                note.sprite = null;
            }
        } else {
            if (note.sprite?.active) {
                note.sprite.destroy();
                note.sprite = null;
            }
        }

        this.notesHit++;
        let rating;
        if (this.botEnabled) {
            rating = this.ratingManager.recordHit(0);
        } else {
            rating = this.ratingManager.recordHit(timeDiff);
        }
        this.combo = this.ratingManager.combo;
        this.maxCombo = this.ratingManager.maxCombo;

        if (rating === 'sick' && note.isPlayerNote) {
            const color = this.holdColors[note.noteDirection];
            this.noteSplashes.showSplash(note.noteDirection, color);
        }

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
    
    /**
     * Handles a missed note
     * @param {Object} note - The note that was missed
     */
    missNote(note) {
        note.tooLate = true;
        this.notesMissed++;
        
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

        const missAnims = {
            0: "singLEFTmiss",
            1: "singDOWNmiss",
            2: "singUPmiss",
            3: "singRIGHTmiss"
        };

        this.events.emit('strumlineStateChange', {
            direction: note.noteDirection,
            isPlayerNote: true,
            state: 'miss',
            animation: missAnims[note.noteDirection]
        });
        
        this.ratingManager.recordMiss();
        this.combo = this.ratingManager.combo;

        if (this.scene.healthBar) {
            this.scene.healthBar.damage(this.healthConfig.missLoss);
        }
    }
    
    /** 
    * Spawns a note in the game
    * @param {Object} note - The note object to spawn
    */
    spawnNote(note) {        
        this.noteSpawner.spawnNote(note);
    }

    /**
     * Gets all active notes
     * @returns {Array} Array of active notes
     */
    getAllNotes() {
        return this.songNotes.filter(note => 
            note.spawned && 
            (!note.wasHit || (note.isHoldNote && !note.holdEndPassed))
        );
    }
    
    /** 
    * Initializes the NotesController 
    */
    async init() {
        if (this.initialized) {
            console.warn('NotesController already initialized');
            return;
        }

        try {
            await this.strumlines.createPlayerStrumline();
            this.strumlines.createEnemyStrumline();

            if (this.enemyStrumlineVisuals) {
                this.strumlines.enemyStrumline.forEach(arrow => {
                    if (arrow) {
                        arrow.setScale(this.enemyStrumlineVisuals.scale);
                        arrow.setAlpha(this.enemyStrumlineVisuals.alpha);
                    }
                });
            }

            if (this.scene.cameraController) {
                this.strumlines.playerStrumline.forEach(arrow => {
                    if (arrow) {
                        this.scene.cameraController.addToUILayer(arrow);
                        arrow.setScale(this.strumlines.defaultScale.static); // <-- Fuerza la escala después de añadir a la UI
                    }
                });
                this.strumlines.enemyStrumline.forEach(arrow => {
                    if (arrow) {
                        this.scene.cameraController.addToUILayer(arrow);
                        const scale = this.enemyStrumlineVisuals
                            ? this.strumlines.defaultScale.static * this.enemyStrumlineVisuals.scale
                            : this.strumlines.defaultScale.static;
                        arrow.setScale(scale);
                    }
                });
                this.scene.cameraController._setupCameraLayers();
            }

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

    /**
     * Updates the NotesController
     * @param {number} songPosition - Current song position in milliseconds
     */
    update(songPosition) {
        if (this.scene.isPaused()) return;
        
        const currentTime = songPosition;
        const spawnTime = 2000 * this.speed;
        
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

        this.noteSpawner.updateNotes(this.songNotes, currentTime, this.speed, this.currentBPM);

        for (const note of this.songNotes) {
            if (!note.spawned && note.strumTime <= currentTime + spawnTime) {
                this.spawnNote(note);
                note.spawned = true;
            }
        }
        
        for (const note of this.songNotes) {
            if (note.isPlayerNote) {
                const timeDiff = note.strumTime - currentTime;
                note.canBeHit = Math.abs(timeDiff) <= this.safeZoneOffset;

                if (!note.wasHit && !note.tooLate && timeDiff < -this.safeZoneOffset) {
                    this.missNote(note);
                }
            } else {
                const timeDiff = note.strumTime - currentTime;
                if (!note.wasHit && Math.abs(timeDiff) <= this.safeZoneOffset && timeDiff <= 0) {
                    this.playEnemyNote(note);
                }
            }
        }

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

        if (this.botEnabled) {
            this.updateBot(songPosition);
        }
    }

    /**
     * Updates active hold notes
     * @param {number} currentTime - Current song position in milliseconds
     */
    updateActiveHoldNotes(currentTime) {
        for (let i = 0; i < this.activeHoldNotes.length; i++) {
            const note = this.activeHoldNotes[i];
            if (note && note.isPlayerNote && !note.cleanedUp) {
                this.holdNotes.updateHoldNote(note, currentTime);
                
                if (note.cleanedUp) {
                    this.activeHoldNotes[i] = null;
                }
            }
        }

        for (let i = 0; i < this.activeEnemyHoldNotes.length; i++) {
            const note = this.activeEnemyHoldNotes[i];
            if (note && !note.isPlayerNote && !note.cleanedUp) {
                this.holdNotes.updateEnemyHoldNote(note, currentTime);
                
                if (note.cleanedUp) {
                    this.activeEnemyHoldNotes[i] = null;
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
            const direction = this.directions[dirIndex];

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
                    if (
                        Math.abs(timeDiff) <= (1000 / 60) &&
                        Math.abs(timeDiff) < Math.abs(closestTimeDiff)
                    ) {
                        closestNote = note;
                        closestTimeDiff = timeDiff;
                    }
                }
            }

            const holdNote = this.activeHoldNotes[dirIndex];
            if (
                holdNote &&
                holdNote.isHoldNote &&
                holdNote.isBeingHeld &&
                !holdNote.holdEndPassed
            ) {
                this.keysHeld[direction] = true;
            } else if (closestNote && Math.abs(closestTimeDiff) <= (1000 / 60)) {
                if (!this.keysHeld[direction]) {
                    this.keysHeld[direction] = true;
                    this.checkNoteHit(dirIndex);
                    this.lastBotHitTime = currentTime;
                }
            } else {
                if (!holdNote || holdNote.holdEndPassed) {
                    this.keysHeld[direction] = false;
                }
            }
        }
    }

    /**
     * Handles enemy note hits
     * @param {Object} note - The note begin hit ny the enemy
     */
    playEnemyNote(note) {
        note.wasHit = true;
        const direction = this.directions[note.noteDirection];
        const arrow = this.strumlines.enemyStrumline[note.noteDirection];
        const pos = this.getStrumlinePositions(false)[note.noteDirection];
        const confirmOffset = this.offsets.confirm;
        const confirmPos = { x: pos.x + (confirmOffset.x || 0), y: pos.y + (confirmOffset.y || 0) };

        if (note.isHoldNote) {
            if (!this.activeEnemyHoldNotes[note.noteDirection]) {
                this.activeEnemyHoldNotes[note.noteDirection] = note;
                note.isBeingHeld = true;
                note.holdReleased = false;
            }
            if (note.sprite?.active) {
                note.sprite.destroy();
                note.sprite = null;
            }
        } else {
            if (note.sprite?.active) {
                note.sprite.destroy();
                note.sprite = null;
            }
        }

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
                arrow.x = arrow.originalX;
                arrow.y = arrow.originalY;
                arrow.setTexture('noteStrumline', `static${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`);
                arrow.setScale(scaleStatic);
                arrow.setAlpha(alpha);
            });
        }

        if (this.scene.events && typeof this.scene.events.emit === 'function') {
            this.scene.events.emit('enemyNoteHit', note);
        }
    }

    /**
     * Clean up a note after it has been hit or missed
     * @param {Object} note - The note to clean up
     */
    cleanUpNote(note) {
        this.noteSpawner.cleanUpNote(note);
        note.cleanedUp = true;
    }

    /**
     * Toggle bot mode
     */
    toggleBot() {
        this.botEnabled = !this.botEnabled;
        console.log(`Bot ${this.botEnabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Gets current score, combo, max combo, notes hit, notes missed, and accuracy
     * @returns {number} Current score
     * @returns {number} Current combo
     * @returns {number} Maximum combo
     * @returns {number} Notes hit count
     * @returns {number} Notes missed count
     * @returns {number} Current accuracy percentage
     */
    getScore() { return this.score; }
    getCombo() { return this.combo; }
    getMaxCombo() { return this.maxCombo; }
    getNotesHit() { return this.notesHit; }
    getNotesMissed() { return this.notesMissed; }
    getAccuracy() {
        return this.ratingManager.getResults().accuracy;
    }
    
    /**
     * Cleans up all resources
     */
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

        this.uiElements = [];

        console.log("NotesController cleanup complete");
    }

    /**
     * Updates enemy notes
     * @param {number} songPosition - Current song position in milliseconds
     */
    updateEnemyNotes(songPosition) {
        const currentTime = songPosition;
        
        this.songNotes.forEach(note => {
            if (!note.isPlayerNote && !note.wasHit && note.spawned) {
                this.playEnemyNote(note);
            }
        });
    }

    /**
     * Updates ememy notes
     * @param {number} songPosition - Current song position in milliseconds
     */
    playEnemyNote(note) {
        note.wasHit = true;
        const direction = this.directions[note.noteDirection];
        const arrow = this.strumlines.enemyStrumline[note.noteDirection];
        const pos = this.getStrumlinePositions(false)[note.noteDirection];
        const confirmOffset = this.offsets.confirm;
        const confirmPos = { x: pos.x + (confirmOffset.x || 0), y: pos.y + (confirmOffset.y || 0) };

        if (note.isHoldNote) {
            if (!this.activeEnemyHoldNotes[note.noteDirection]) {
                this.activeEnemyHoldNotes[note.noteDirection] = note;
                note.isBeingHeld = true;
                note.holdReleased = false;
            }
            if (note.sprite?.active) {
                note.sprite.destroy();
                note.sprite = null;
            }
        } else {
            if (note.sprite?.active) {
                note.sprite.destroy();
                note.sprite = null;
            }
        }

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
                arrow.x = arrow.originalX;
                arrow.y = arrow.originalY;
                arrow.setTexture('noteStrumline', `static${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`);
                arrow.setScale(scaleStatic);
                arrow.setAlpha(alpha);
            });
        }

        if (this.scene.events && typeof this.scene.events.emit === 'function') {
            this.scene.events.emit('enemyNoteHit', note);
        }
    }
    
    /**
     * Get strumline positions
     * @param {boolean} isPlayer - Whether to get positions for player or enemy posiitons
     * @return {Array} Array of positions objects
     */
    getStrumlinePositions(isPlayer = true) {
        const arrowWidth = 64;
        const separation = 110;
        const staticOffset = this.offsets.static;
        let baseX, baseY;

        const middleScroll = localStorage.getItem('GAMEPLAY.NOTE SETTINGS.MIDDLESCROLL') === 'true';
        const downScroll = localStorage.getItem('GAMEPLAY.NOTE SETTINGS.DOWNSCROLL') === 'true';
        const opponentNotes = localStorage.getItem('GAMEPLAY.NOTE SETTINGS.OPPONENT NOTES') === 'true';

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
            const enemyScale = middleScroll ? 0.8 : 1;
            let enemyAlpha = !opponentNotes ? 0 : (middleScroll ? 0.5 : 1);
            const enemySeparation = separation * (middleScroll ? 0.7 : 1);
            baseX = 40;

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

    /**
     * Disables input handlers
     */
    disableInputs() {
        if (this.keyPressCallbacks) {
            this.keyPressCallbacks.forEach(({ key, callback }) => key.off('down', callback));
        }
        if (this.keyReleaseCallbacks) {
            this.keyReleaseCallbacks.forEach(({ key, callback }) => key.off('up', callback));
        }
    }

    /**
     * Enables input handlers
     */
    enableInputs() {
        this.setupInputHandlers();
    }
}
