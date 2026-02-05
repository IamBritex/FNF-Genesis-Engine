import { NoteSpawner } from "./NoteSpawner.js";
import { SustainNote } from "./SustainNote.js";

/**
 * BaseNotesHandler.js
 * Clase base abstracta que maneja la lógica visual.
 * [CORREGIDO] Destrucción segura de grupos para evitar error 'i.size'.
 */
export class BaseNotesHandler {
    constructor(scene, notesData, strumlines, config) {
        this.scene = scene;
        this.notesData = notesData; 
        this.strums = strumlines;   
        this.noteSkin = config.noteSkin;
        
        this.sessionId = config.sessionId;
        this.scrollSpeed = config.scrollSpeed;
        this.bpm = config.bpm;
        this.noteScale = config.noteScale || 0.7; 
        this.noteOffsetX = config.noteOffsetX || 0;
        
        this.notesGroup = this.scene.add.group();
        this.holdGroup = this.scene.add.group();
        
        this.parentContainer = config.parentContainer;

        this.spawnLeadTime = 2000 / (config.speed || 1);
        
        this.charactersHandler = null; 
        this.activeHolds = { 0: null, 1: null, 2: null, 3: null };
    }

    setCharactersHandler(handler) {
        this.charactersHandler = handler;
    }

    update(songPosition) {
        // [FIX] Si los grupos ya fueron destruidos, no hacer nada (evita errores en shutdown)
        if (!this.notesGroup || !this.holdGroup) return;

        this.spawnNotesInRange(songPosition);
        this.updateNotePositions(songPosition);
        this.updateActiveHolds(songPosition);
    }

    spawnNotesInRange(songPosition) {
        for (const noteData of this.notesData) {
            if (noteData.spawned || 
                noteData.strumTime > songPosition + this.spawnLeadTime || 
                noteData.strumTime < songPosition - 1500) {
                continue;
            }

            noteData.spawned = true;

            const noteSprite = NoteSpawner.spawnNoteSprite(
                this.scene,
                noteData,
                this.noteSkin, 
                this.strums,
                this.noteOffsetX
            );

            if (!noteSprite) continue;

            // [FIX] Verificar que el grupo exista antes de agregar
            if (this.notesGroup && this.notesGroup.active) {
                this.notesGroup.add(noteSprite);
            }
            if (this.parentContainer) this.parentContainer.add(noteSprite);
            
            noteSprite.setVisible(true);
            this.calculateInitialNotePosition(noteSprite, songPosition);

            if (noteData.isHoldNote) {
                const holdContainer = SustainNote.spawnHoldSprites(
                    this.scene,
                    noteData,
                    this.noteSkin,
                    noteSprite,
                    this.scrollSpeed
                );

                if (holdContainer) {
                    noteData.holdSpriteRef = holdContainer;
                    // [FIX] Verificar grupo
                    if (this.holdGroup && this.holdGroup.active) {
                        this.holdGroup.add(holdContainer);
                    }
                    if (this.parentContainer) this.parentContainer.add(holdContainer);
                }
            }
        }
    }

    calculateInitialNotePosition(noteSprite, songPosition) {
        const noteData = noteSprite.noteData;
        const targetStrum = this.strums[noteData.noteDirection];
        if (!targetStrum) return;

        const skinOffsets = noteSprite.skinOffsets || { x: 0, y: 0 };
        const targetY = targetStrum.y;
        const timeDiff = noteData.strumTime - songPosition;
        
        noteSprite.y = targetY + timeDiff * this.scrollSpeed + skinOffsets.y;
        const strumWidth = targetStrum.width || 150 * this.noteScale;
        noteSprite.x = targetStrum.x + strumWidth / 2 + this.noteOffsetX + skinOffsets.x;
    }

    updateNotePositions(songPosition) {
        // [FIX] Iteración segura
        if (this.notesGroup && this.notesGroup.children) {
            this.notesGroup.getChildren().forEach((noteSprite) => {
                if (!noteSprite.active || !noteSprite.noteData) return;
                
                const noteData = noteSprite.noteData;
                const targetStrum = this.strums[noteData.noteDirection];
                const skinOffsets = noteSprite.skinOffsets || { x: 0, y: 0 };

                const targetY = targetStrum.y;
                const timeDiff = noteData.strumTime - songPosition;
                
                const newY = targetY + timeDiff * this.scrollSpeed + skinOffsets.y;
                const strumWidth = targetStrum.width || 150 * this.noteScale;
                const newX = targetStrum.x + strumWidth / 2 + this.noteOffsetX + skinOffsets.x;

                noteSprite.setPosition(newX, newY);
            });
        }

        if (this.holdGroup && this.holdGroup.children) {
            this.holdGroup.getChildren().forEach((holdContainer) => {
                if (!holdContainer.active || !holdContainer.noteData) return;
                
                const noteData = holdContainer.noteData;
                const targetStrum = this.strums[noteData.noteDirection];
                
                const targetY = targetStrum.y;
                const timeDiff = noteData.strumTime - songPosition;

                let holdOffsetX = 0;
                let holdOffsetY = 0;
                if (this.noteSkin) {
                     const skinData = this.noteSkin.getSkinData();
                     if (skinData && skinData.notes && skinData.notes.offsets) {
                         holdOffsetX = skinData.notes.offsets.x || 0;
                         holdOffsetY = skinData.notes.offsets.y || 0;
                     }
                }

                const newY = targetY + timeDiff * this.scrollSpeed + holdOffsetY;
                const strumWidth = targetStrum.width || 150 * this.noteScale;
                const newX = targetStrum.x + strumWidth / 2 + this.noteOffsetX + holdOffsetX;

                holdContainer.setPosition(newX, newY);
            });
        }
    }

    updateActiveHolds(songPosition) {
        if (!this.holdGroup || !this.holdGroup.children) return;

        this.holdGroup.getChildren().forEach((holdContainer) => {
            if (!holdContainer.active || !holdContainer.noteData) return;

            const noteData = holdContainer.noteData;
            if (!noteData.isBeingHeld || noteData.holdEndPassed) return;

            const targetStrum = this.strums[noteData.noteDirection];
            const strumCenterY = targetStrum.y;
            const holdSprites = holdContainer.holdSprites || [];

            for (let i = noteData.holdSegmentsDestroyed || 0; i < holdSprites.length; i++) {
                const piece = holdSprites[i];
                if (!piece || !piece.active) continue;

                const pieceTopWorldY = holdContainer.y + piece.y - 24;
                const crossedCenter = pieceTopWorldY <= strumCenterY + 3;

                if (crossedCenter) {
                    piece.destroy();
                    holdSprites[i] = null;
                    noteData.holdSegmentsDestroyed = i + 1;

                    if (i === holdSprites.length - 1) {
                        noteData.holdPassed = true;
                        this.onHoldFinished(noteData); 
                    }
                } else {
                    break;
                }
            }
        });
    }
    
    onHoldFinished(noteData) {}

    destroy() {
        // [FIX CRÍTICO] Usar destroy(true) en lugar de clear()+destroy().
        // destroy(true) elimina el grupo y llama a destroy() en todos sus hijos de forma segura.
        // Verificamos si existe para evitar errores si se llama múltiples veces.
        
        if (this.notesGroup) {
            this.notesGroup.destroy(true);
            this.notesGroup = null;
        }
        
        if (this.holdGroup) {
            this.holdGroup.destroy(true);
            this.holdGroup = null;
        }
        
        this.strums = []; 
        this.notesData = [];
    }
}