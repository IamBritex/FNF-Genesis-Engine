import { BaseNotesHandler } from "../BaseNotesHandler.js";
import { Strumline } from "../Strumline.js";
import { NoteDirection } from "../NoteDirection.js";

export class EnemyNotesHandler extends BaseNotesHandler {
    constructor(scene, notesData, strumlines, config) {
        super(scene, notesData, strumlines, config);
        
        // Mapa de holds activos específicos para la lógica de CPU
        this.enemyActiveHolds = { 0: null, 1: null, 2: null, 3: null };
    }

    update(songPosition) {
        // 1. Movimiento base
        super.update(songPosition);

        // 2. Lógica de CPU (Bot)
        this.processBotLogic(songPosition);
    }

    processBotLogic(songPosition) {
        // Golpear notas nuevas
        for (const noteData of this.notesData) {
            if (noteData.spawned && !noteData.wasHit && !noteData.botProcessed) {
                if (songPosition >= noteData.strumTime) {
                    noteData.botProcessed = true;
                    this.hitEnemyNote(noteData);
                }
            }
        }

        // Soltar notas largas (holds)
        for (const direction in this.enemyActiveHolds) {
            const holdData = this.enemyActiveHolds[direction];
            if (!holdData) continue;
            
            const holdEndTime = holdData.strumTime + holdData.sustainLength;
            if (songPosition >= holdEndTime) {
                Strumline.setStaticFrame(this.strums, parseInt(direction, 10));
                this.enemyActiveHolds[direction] = null;
            }
        }
    }

    hitEnemyNote(noteData) {
        const direction = noteData.noteDirection;
        noteData.wasHit = true;

        // 1. Animación del Personaje
        if (this.charactersHandler) {
            this.charactersHandler.playSingAnimation(false, direction);
        }

        // 2. Gestión visual (eliminar nota, animación de strum)
        const noteSprite = this.findNoteSprite(noteData);
        
        if (noteData.isHoldNote) {
            Strumline.playConfirmAnimation(this.strums, direction, true);
            this.enemyActiveHolds[direction] = noteData;
            noteData.isBeingHeld = true;

            if (noteSprite) {
                this.notesGroup.remove(noteSprite, false, false);
                noteSprite.setVisible(false);
                noteData.spriteRef = noteSprite; // Guardar ref para limpieza posterior
            }
        } else {
            Strumline.playConfirmAnimation(this.strums, direction, false);
            if (noteSprite) {
                this.notesGroup.remove(noteSprite, true, true);
            }
        }

        // Voz del oponente (Si existiera lógica específica de volumen aquí)
    }

    findNoteSprite(noteData) {
        return this.notesGroup.getChildren().find(sprite => 
            sprite.noteData && 
            sprite.noteData.strumTime === noteData.strumTime && 
            sprite.noteData.noteDirection === noteData.noteDirection
        );
    }
}