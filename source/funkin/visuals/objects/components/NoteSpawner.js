export class NoteSpawner {
    constructor(scene, notesController) {
        this.scene = scene;
        this.notesController = notesController;
        this.songNotes = [];
        this.speed = 1;
        this.holdSegmentHeight = 32 * this.notesController.arrowConfigs.scale.holds;
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

                    let isPlayerNote;
                    if (section.mustHitSection) {
                        isPlayerNote = noteDirection < 4;
                        noteDirection = noteDirection % 4;
                    } else {
                        isPlayerNote = noteDirection >= 4;
                        noteDirection = noteDirection % 4;
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
                            holdEndPassed: false
                        });
                    }
                });
            }
        });
        
        this.songNotes.sort((a, b) => a.strumTime - b.strumTime);
        
        return this.songNotes;
    }

    spawnNote(note) {
        const isPlayer = note.isPlayerNote;
        const directionIndex = note.noteDirection;
        const direction = this.notesController.directions[directionIndex];
        const holdColor = this.notesController.holdColors[directionIndex];
        const pos = isPlayer ? 
            this.notesController.arrowConfigs.playerNotes[directionIndex] : 
            this.notesController.arrowConfigs.enemyNotes[directionIndex];
        
        if (!pos) {
            console.error('Configuración de posición no válida:', {isPlayer, directionIndex});
            return;
        }
        
        const currentTime = this.scene.songPosition;
        const timeDiff = note.strumTime - currentTime;
        const targetY = isPlayer ? 
            this.notesController.arrowConfigs.playerStatic[directionIndex].y : 
            this.notesController.arrowConfigs.enemyStatic[directionIndex].y;
        const scrollSpeed = 0.45 * this.speed;
        const initialY = targetY + (timeDiff * scrollSpeed);
        
        const frameKey = `note${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`;
        
        const noteSprite = this.scene.add.sprite(pos.x, initialY, 'notes', frameKey);
        noteSprite.setScale(this.notesController.arrowConfigs.scale.notes);
        noteSprite.setDepth(115);
        noteSprite.setName(`Note_${direction}_${note.strumTime}`);
        
        if (this.scene.cameraController) {
            this.scene.cameraController.addToUILayer(noteSprite);
        }
        
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
            
            const holdContainer = this.scene.add.container(pos.x, initialY);
            holdContainer.setDepth(noteSprite.depth - 1);
            holdContainer.setName(`HoldNote_${direction}_${note.strumTime}`);
            
            for (let i = 0; i < numPieces; i++) {
                const segmentY = i * this.holdSegmentHeight;
                const pieceFrame = `${holdColor} hold piece0000`;

                const holdPiece = this.scene.add.sprite(0, segmentY, 'NOTE_hold_assets', pieceFrame)
                    .setOrigin(0.5, 0)
                    .setScale(this.notesController.arrowConfigs.scale.holds);
                
                holdContainer.add(holdPiece);
                note.holdSprites.push(holdPiece);
            }
            
            const endY = numPieces * this.holdSegmentHeight;
            const holdEnd = this.scene.add.sprite(0, endY, 'NOTE_hold_assets', `${holdColor} hold end0000`)
                .setOrigin(0.5, 0)
                .setScale(this.notesController.arrowConfigs.scale.holds);
            
            holdContainer.add(holdEnd);
            note.holdSprites.push(holdEnd);
            
            note.holdContainer = holdContainer;
            
            if (this.scene.cameraController) {
                holdContainer.setScrollFactor(0);
                this.scene.cameraController.addToUILayer(holdContainer);
                
                holdContainer.each(sprite => {
                    if (sprite.setScrollFactor) {
                        sprite.setScrollFactor(0);
                    }
                });
            }
        }

        note.sprite = noteSprite;
        note.spawned = true;
    }

    cleanUpNote(note) {
        if (note.sprite?.active) {
            note.sprite.destroy();
            note.sprite = null;
        }
        
        if (note.holdSprites) {
            note.holdSprites.forEach(sprite => {
                if (sprite?.active) {
                    sprite.destroy();
                }
            });
            note.holdSprites = [];
        }
        
        if (note.holdContainer?.active) {
            note.holdContainer.destroy();
            note.holdContainer = null;
        }
        
        if (note.isHoldNote) {
            note.isBeingHeld = false;
            note.enemyHoldActive = false;
            note.holdReleased = true;
            note.holdEndPassed = true;
        }
        
        note.wasHit = true;
        note.tooLate = true;
    }

    calculateNoteY(note, timeDiff) {
        const directionIndex = note.noteDirection;
        const targetY = note.isPlayerNote ? 
            this.notesController.arrowConfigs.playerStatic[directionIndex].y : 
            this.notesController.arrowConfigs.enemyStatic[directionIndex].y;
        
        const scrollSpeed = (0.45 * this.speed) * (this.bpm / 100);
        const yOffset = timeDiff * scrollSpeed;
        
        return targetY + yOffset;
    }

    cleanup() {
        this.songNotes.forEach(note => {
            this.cleanUpNote(note);
        });
        this.songNotes = [];
    }
}