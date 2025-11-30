import { NoteSpawner } from "./NoteSpawner.js";
import { Strumline } from "./Strumline.js";
import { SustainNote } from "./SustainNote.js";

/**
 * BaseNotesHandler.js
 * Clase base abstracta que maneja la lógica visual y de movimiento compartida
 * entre las notas del jugador y del enemigo.
 */
export class BaseNotesHandler {
    constructor(scene, notesData, strumlines, config) {
        this.scene = scene;
        this.notesData = notesData; // Array de notas filtradas para este handler
        this.strums = strumlines;   // Array de Strumlines (flechas fijas)
        this.noteSkin = config.noteSkin;
        
        this.sessionId = config.sessionId;
        this.scrollSpeed = config.scrollSpeed;
        this.bpm = config.bpm;
        // La escala se usará como fallback o para cálculos internos.
        this.noteScale = config.noteScale || 0.7; 
        this.noteOffsetX = config.noteOffsetX || 0;
        
        // Grupos visuales
        this.notesGroup = this.scene.add.group();
        this.holdGroup = this.scene.add.group();
        
        // Contenedor principal UI (para añadir las notas visualmente)
        this.parentContainer = config.parentContainer;

        this.spawnLeadTime = 2000 / (config.speed || 1);
        
        // Referencia a personajes (se setea después)
        this.charactersHandler = null;
        
        // Holds activos
        this.activeHolds = { 0: null, 1: null, 2: null, 3: null };
    }

    setCharactersHandler(handler) {
        this.charactersHandler = handler;
    }

    /**
     * Ciclo principal de actualización visual.
     */
    update(songPosition) {
        this.spawnNotesInRange(songPosition);
        this.updateNotePositions(songPosition);
        this.updateActiveHolds(songPosition);
    }

    /**
     * Genera los sprites de las notas cuando entran en rango visible.
     */
    spawnNotesInRange(songPosition) {
        const scrollSpeedValue = this.scrollSpeed; 

        for (const noteData of this.notesData) {
            if (noteData.spawned || 
                noteData.strumTime > songPosition + this.spawnLeadTime || 
                noteData.strumTime < songPosition - 1500) {
                continue;
            }

            noteData.spawned = true;

            // Crear Sprite de Nota
            const noteSprite = NoteSpawner.spawnNoteSprite(
                this.scene,
                noteData,
                this.noteSkin, 
                this.strums,
                this.noteOffsetX
            );

            if (!noteSprite) continue;

            this.notesGroup.add(noteSprite);
            if (this.parentContainer) this.parentContainer.add(noteSprite);
            
            noteSprite.setVisible(true);
            this.calculateInitialNotePosition(noteSprite, songPosition);

            // Crear Sprite de Sustain (Hold)
            if (noteData.isHoldNote) {
                const holdContainer = SustainNote.spawnHoldSprites(
                    this.scene,
                    noteData,
                    this.noteSkin,
                    noteSprite,
                    scrollSpeedValue
                );

                if (holdContainer) {
                    noteData.holdSpriteRef = holdContainer;
                    this.holdGroup.add(holdContainer);
                    if (this.parentContainer) this.parentContainer.add(holdContainer);
                }
            }
        }
    }

    calculateInitialNotePosition(noteSprite, songPosition) {
        const noteData = noteSprite.noteData;
        const targetStrum = this.strums[noteData.noteDirection];
        if (!targetStrum) return;

        // Recuperar los offsets del skin guardados en el sprite (o 0 si no existen)
        const skinOffsets = noteSprite.skinOffsets || { x: 0, y: 0 };

        const targetY = targetStrum.y;
        const timeDiff = noteData.strumTime - songPosition;
        
        // [MODIFICADO] Sumar skinOffsets.y
        noteSprite.y = targetY + timeDiff * this.scrollSpeed + skinOffsets.y;

        const strumWidth = targetStrum.width || 150 * this.noteScale;
        // [MODIFICADO] Sumar skinOffsets.x
        // Nota: strumWidth/2 intenta centrar la nota, si tus offsets ya consideran el centro, ajusta esto.
        noteSprite.x = targetStrum.x + strumWidth / 2 + this.noteOffsetX + skinOffsets.x;
    }

    updateNotePositions(songPosition) {
        // Mover Notas
        this.notesGroup.getChildren().forEach((noteSprite) => {
            if (!noteSprite.active || !noteSprite.noteData) return;
            
            const noteData = noteSprite.noteData;
            const targetStrum = this.strums[noteData.noteDirection];
            // Recuperar offsets dinámicamente
            const skinOffsets = noteSprite.skinOffsets || { x: 0, y: 0 };

            const targetY = targetStrum.y;
            const timeDiff = noteData.strumTime - songPosition;
            
            // [MODIFICADO] Aplicar offsets en cada frame
            const newY = targetY + timeDiff * this.scrollSpeed + skinOffsets.y;
            const strumWidth = targetStrum.width || 150 * this.noteScale;
            const newX = targetStrum.x + strumWidth / 2 + this.noteOffsetX + skinOffsets.x;

            noteSprite.setPosition(newX, newY);
        });

        // Mover Holds
        this.holdGroup.getChildren().forEach((holdContainer) => {
            if (!holdContainer.active || !holdContainer.noteData) return;
            
            // Para los holds, usamos la posición de la nota base como referencia,
            // pero si la nota ya no existe (fue golpeada), necesitamos calcularlo igual.
            // Generalmente el Hold sigue la misma lógica de X,Y que la nota.
            
            const noteData = holdContainer.noteData;
            const targetStrum = this.strums[noteData.noteDirection];
            
            // Si tenemos referencia al sprite de la nota principal y offsets, usarlos
            // Pero NoteSpawner no guarda offsets en el holdContainer directamente por defecto.
            // Asumimos que el hold debe alinearse al centro del strum.
            // Si quieres aplicar offsets al hold también, deberías pasarlos o leerlos del skin aquí.
            // Por ahora, alineamos al strum center standard.
            
            const targetY = targetStrum.y;
            const timeDiff = noteData.strumTime - songPosition;

            // Los holds suelen tener sus propios ajustes en SustainNote.js, 
            // pero su posición base (cabeza) debe coincidir.
            // Si tus offsets de 'notes' mueven la cabeza, deberías mover el hold también.
            
            // Intentamos leer offsets si la nota padre los tiene, o 0.
            // (Esto requiere que SustainNote guarde offsets o que los leamos del skin de nuevo).
            // Para simplificar, usaremos los offsets de la nota si están disponibles en la referencia noteData.spriteRef (si existe)
            // Ojo: noteData.spriteRef a veces se borra al hacer hit.
            
            // Solución robusta: Leer offsets de la nota del skin si están disponibles en this.noteSkin
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

    updateActiveHolds(songPosition) {
        this.holdGroup.getChildren().forEach((holdContainer) => {
            if (!holdContainer.active || !holdContainer.noteData) return;

            const noteData = holdContainer.noteData;
            if (!noteData.isBeingHeld || noteData.holdEndPassed) return;

            const targetStrum = this.strums[noteData.noteDirection];
            const strumCenterY = targetStrum.y;
            const holdSprites = holdContainer.holdSprites || [];

            // Lógica de recorte visual de la nota larga
            for (let i = noteData.holdSegmentsDestroyed || 0; i < holdSprites.length; i++) {
                const piece = holdSprites[i];
                if (!piece || !piece.active) continue;

                // Ajuste de posición visual relativa
                const pieceTopWorldY = holdContainer.y + piece.y - 24;
                
                // UpScroll check
                const crossedCenter = pieceTopWorldY <= strumCenterY + 3;

                if (crossedCenter) {
                    piece.destroy();
                    holdSprites[i] = null;
                    noteData.holdSegmentsDestroyed = i + 1;

                    if (i === holdSprites.length - 1) {
                        noteData.holdPassed = true;
                        this.onHoldFinished(noteData); // Hook para subclases
                    }
                } else {
                    break;
                }
            }
        });
    }
    
    // Métodos a sobrescribir o utilitarios
    onHoldFinished(noteData) {
        // Implementado en subclases si es necesario
    }

    destroy() {
        this.notesGroup.clear(true, true);
        this.notesGroup.destroy();
        this.holdGroup.clear(true, true);
        this.holdGroup.destroy();
        this.strums = []; // Referencias externas, no destruir aquí
        this.notesData = [];
    }
}