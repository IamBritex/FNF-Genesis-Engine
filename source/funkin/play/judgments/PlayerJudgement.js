import { HitWindow } from './HitWindow.js';

/**
 * PlayerJudgement.js
 * Módulo estático responsable de la lógica de juicio del jugador.
 * Contiene la lógica que se extrajo de NotesHandler.
 */
export class PlayerJudgement {

    /**
     * Busca y juzga la mejor nota posible cuando el jugador presiona una tecla.
     * @param {number} direction - La dirección presionada (0-3).
     * @param {number} songPosition - El tiempo actual de la canción.
     * @param {Phaser.GameObjects.Group} playerNotesGroup - El grupo de notas del jugador.
     * @returns {{note: Phaser.GameObjects.Sprite | null, rating: string | null, timeDiff: number | null}}
     */
    static judgeInput(direction, songPosition, playerNotesGroup) {
        let bestNote = null;
        let bestTimeDiff = Infinity; 

        // 1. Encontrar la nota "juzgable" más cercana
        playerNotesGroup.getChildren().forEach(noteSprite => {
            if (!noteSprite.active || !noteSprite.noteData || noteSprite.noteData.wasHit || noteSprite.noteData.tooLate) return; 
            
            if (noteSprite.noteDirection === direction) {
                const timeDiff = songPosition - noteSprite.strumTime;
                const absTimeDiff = Math.abs(timeDiff);

                // Solo considera notas dentro de la ventana de juicio
                if (absTimeDiff <= HitWindow.MAX_JUDGE_RANGE_MS) { 
                    if (bestNote === null || absTimeDiff < bestTimeDiff) { 
                        bestNote = noteSprite; 
                        bestTimeDiff = absTimeDiff; 
                    }
                }
            }
        });

        // 2. Si se encontró una nota, calificarla
        if (bestNote) {
            const finalTimeDiff = songPosition - bestNote.strumTime;
            const rating = HitWindow.judge(finalTimeDiff); 
            return { note: bestNote, rating: rating, timeDiff: finalTimeDiff };
        }
        
        // No se encontró ninguna nota válida
        return { note: null, rating: null, timeDiff: null };
    }

    /**
     * Revisa todas las notas activas para ver si alguna ya se pasó (miss).
     * @param {number} songPosition - El tiempo actual de la canción.
     * @param {Phaser.GameObjects.Group} playerNotesGroup - El grupo de notas del jugador.
     * @param {object} activeHolds - El objeto de holds activos del NotesHandler.
     * @returns {Array<{noteSprite: Phaser.GameObjects.Sprite | null, noteData: object | null, timeDiff: number}>}
     */
    static checkMisses(songPosition, playerNotesGroup, activeHolds) {
        const missedNotes = [];

        // 1. Revisar notas normales (cabezas)
        playerNotesGroup.getChildren().forEach(noteSprite => {
            if (!noteSprite.active || !noteSprite.noteData || noteSprite.noteData.wasHit || noteSprite.noteData.tooLate) return; 
            
            const noteData = noteSprite.noteData;
            const timeDiff = songPosition - noteData.strumTime; 
            
            if (HitWindow.isLongMiss(timeDiff)) {
                missedNotes.push({ noteSprite: noteSprite, noteData: null, timeDiff: timeDiff });
            }
        });

        // 2. Revisar notas 'hold' que no están siendo presionadas
         for (const direction in activeHolds) {
             const noteData = activeHolds[direction]?.noteData;
             if (noteData && !noteData.tooLate && !noteData.isBeingHeld) {
                  const timeDiff = songPosition - noteData.strumTime; 
                  if (HitWindow.isLongMiss(timeDiff)) {
                      missedNotes.push({ noteSprite: null, noteData: noteData, timeDiff: timeDiff });
                  }
             }
         }
         
         return missedNotes;
    }
}