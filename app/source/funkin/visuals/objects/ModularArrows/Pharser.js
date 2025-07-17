export class Pharser {
    /**
     * Parsea los datos de la canción y devuelve un array de notas normalizadas.
     * @param {object|array} songData - Datos de la canción (Psych, Kade, FNF, etc)
     * @returns {Array} Array de objetos nota normalizados
     */
    static parseNotes(songData) {
        let notesArray;
        if (songData.notes && Array.isArray(songData.notes)) {
            notesArray = songData.notes;
            // Psych Engine
        } else if (songData.song && songData.song.notes && Array.isArray(songData.song.notes)) {
            notesArray = songData.song.notes;
            // FNF original
        } else if (Array.isArray(songData)) {
            notesArray = songData;
            // Array directo de secciones
        } else {
            console.error("Formato de datos no reconocido:", songData);
            return [];
        }

        const parsedNotes = [];
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
                        parsedNotes.push({
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
                            holdSegmentsDestroyed: 0, // AÑADIR ESTA PROPIEDAD
                            holdEndPassed: false
                        });
                    }
                });
            }
        });

        // Ordenar por tiempo
        parsedNotes.sort((a, b) => a.strumTime - b.strumTime);

        return parsedNotes;
    }
}