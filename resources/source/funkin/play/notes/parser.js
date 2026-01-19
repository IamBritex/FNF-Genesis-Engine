/**
 * parser.js
 * Módulo para parsear los datos de notas del chart (formato Psych Engine).
 */
export class Parser { // Renombrado a Parser (Mayúscula inicial)
    /**
     * Parsea los datos de notas del chart (formato Psych Engine).
     * @param {object} chartData - El objeto de datos extraído por ChartDataHandler.
     * @returns {Array} Array de objetos nota normalizados, o [] si falla.
     */
    static parseNotes(chartData) {
        // 1. Verificar que chartData y chartData.notes existan y sean válidos
        if (!chartData || !chartData.notes || !Array.isArray(chartData.notes)) {
            console.error("Parser.parseNotes: chartData.notes no es un array válido.", chartData);
            return [];
        }

        // 2. Obtener directamente el array de secciones de notas
        const notesArray = chartData.notes;

        const parsedNotes = [];
        notesArray.forEach((section, sectionIndex) => {
            // 3. Verificar que la sección y sus notas sean válidas
            if (section && section.sectionNotes && Array.isArray(section.sectionNotes)) {
                section.sectionNotes.forEach(noteData => {
                    // Verificar que noteData sea un array con al menos 2 elementos
                    if (!Array.isArray(noteData) || noteData.length < 2) return;

                    const strumTime = noteData[0];
                    let noteDirection = noteData[1];
                    const sustainLength = noteData[2] || 0;
                    
                    // Asegurarse de que strumTime y noteDirection sean números
                    if (typeof strumTime !== 'number' || typeof noteDirection !== 'number') return;

                    // 4. Lógica de Psych Engine para determinar a quién pertenece la nota
                    let isPlayerNote;
                    // 'mustHitSection' indica si la sección le pertenece al jugador
                    if (section.mustHitSection) {
                        // Sección del jugador: 0-3 jugador, 4-7 enemigo (se mapea a 0-3)
                        isPlayerNote = noteDirection < 4;
                        noteDirection = noteDirection % 4; // Mapea 4-7 a 0-3
                    } else {
                        // Sección del enemigo: 0-3 enemigo, 4-7 jugador (se mapea a 0-3)
                        isPlayerNote = noteDirection >= 4;
                        noteDirection = noteDirection % 4; // Mapea 4-7 a 0-3
                    }

                    // 5. Validar que la dirección final esté en rango 0-3
                    if (noteDirection >= 0 && noteDirection <= 3) {
                        parsedNotes.push({
                            strumTime,
                            noteDirection,
                            sustainLength,
                            isPlayerNote,
                            sectionIndex, // Mantenemos el índice de la sección original
                            // Estado inicial de la nota
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

        // 6. Ordenar las notas por tiempo para procesarlas correctamente
        parsedNotes.sort((a, b) => a.strumTime - b.strumTime);

        console.log(`Parser.parseNotes: Parseadas ${parsedNotes.length} notas.`);
        return parsedNotes;
    }
}