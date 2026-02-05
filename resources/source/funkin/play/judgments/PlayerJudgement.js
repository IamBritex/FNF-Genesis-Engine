import { HitWindow } from './HitWindow.js';

/**
 * PlayerJudgement.js
 * Lógica estática para procesar el input del jugador y encontrar la nota objetivo.
 */
export class PlayerJudgement {

    /**
     * Busca la mejor nota válida para golpear en una dirección dada.
     * @param {number} direction - Dirección del input (0-3).
     * @param {number} songPosition - Tiempo actual de la canción.
     * @param {Phaser.GameObjects.Group} playerNotesGroup - Grupo de notas del jugador.
     * @returns {object} { note, rating, timeDiff } o nulos si no hay nota.
     */
    static judgeInput(direction, songPosition, playerNotesGroup) {
        let bestNote = null;
        let bestTimeDiff = Infinity;

        playerNotesGroup.getChildren().forEach(noteSprite => {
            // Ignorar notas inactivas, ya golpeadas o perdidas
            if (!noteSprite.active || !noteSprite.noteData || noteSprite.noteData.wasHit || noteSprite.noteData.tooLate) return;

            if (noteSprite.noteDirection === direction) {
                const timeDiff = songPosition - noteSprite.strumTime;
                const absTimeDiff = Math.abs(timeDiff);

                // Si está dentro de la ventana máxima de hit
                if (absTimeDiff <= HitWindow.MAX_JUDGE_RANGE_MS) {
                    // Priorizar la nota más cercana en tiempo (menor timeDiff)
                    if (bestNote === null || absTimeDiff < bestTimeDiff) {
                        bestNote = noteSprite;
                        bestTimeDiff = absTimeDiff;
                    }
                }
            }
        });

        if (bestNote) {
            const finalTimeDiff = songPosition - bestNote.strumTime;
            const rating = HitWindow.judge(finalTimeDiff);
            return { note: bestNote, rating: rating, timeDiff: finalTimeDiff };
        }

        return { note: null, rating: null, timeDiff: null };
    }

    /**
     * Revisa todas las notas para detectar cuáles se han pasado de tiempo (Miss).
     * @param {number} songPosition 
     * @param {Phaser.GameObjects.Group} playerNotesGroup 
     * @param {object} activeHolds 
     * @returns {Array} Lista de objetos { noteSprite, noteData, timeDiff } que son Miss.
     */
    static checkMisses(songPosition, playerNotesGroup, activeHolds) {
        const missedResults = [];

        // 1. Revisar notas normales y cabezas de hold
        playerNotesGroup.getChildren().forEach(noteSprite => {
            if (!noteSprite.active || !noteSprite.noteData || noteSprite.noteData.wasHit || noteSprite.noteData.tooLate) return;

            const timeDiff = songPosition - noteSprite.noteData.strumTime;
            if (HitWindow.isLongMiss(timeDiff)) {
                missedResults.push({ noteSprite: noteSprite, noteData: null, timeDiff: timeDiff });
            }
        });

        // 2. Revisar colas de sustain que no se están manteniendo
        for (const direction in activeHolds) {
            const noteData = activeHolds[direction]?.noteData;
            if (noteData && !noteData.tooLate && !noteData.isBeingHeld) {
                const timeDiff = songPosition - noteData.strumTime;
                // Si soltó el hold demasiado tiempo
                if (HitWindow.isLongMiss(timeDiff)) {
                    missedResults.push({ noteSprite: null, noteData: noteData, timeDiff: timeDiff });
                }
            }
        }
        return missedResults;
    }
}