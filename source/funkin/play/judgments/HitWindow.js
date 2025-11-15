/**
 * HitWindow.js
 * Define las ventanas de tiempo (en milisegundos) para juzgar las notas.
 * [MODIFICADO] Basado en el sistema PBOT1 (Points Based On Timing 1) de Scoring.hx.
 */

// --- [NUEVO] Constantes del sistema de puntuación PBOT1 (de Scoring.hx) ---
export const HitWindow = {
    
    // --- PUNTUACIÓN (PBOT1) ---
    PBOT1_MAX_SCORE: 500,
    PBOT1_SCORING_OFFSET: 54.99,
    PBOT1_SCORING_SLOPE: 0.080,
    PBOT1_MIN_SCORE: 9.0,
    PBOT1_MISS_SCORE: -100,
    PBOT1_PERFECT_THRESHOLD: 5.0, // 5ms para puntuación perfecta

    // --- VENTANAS DE JUICIO (PBOT1) ---
    // Límites absolutos para cada juicio (deben ir del más pequeño al más grande)
    SICK_WINDOW_MS: 45.0,   // ~45ms
    GOOD_WINDOW_MS: 90.0,   // ~90ms
    BAD_WINDOW_MS:  135.0,  // ~135ms
    SHIT_WINDOW_MS: 160.0,  // ~160ms (Esta es la ventana total de "un lado")

    /** * Rango máximo en el que una pulsación de tecla buscará una nota
     * para juzgar (incluyendo para registrar un 'miss' por pulsar mal).
     * Ajustado a la ventana 'SHIT'.
     */
    MAX_JUDGE_RANGE_MS: 160.0,

    /** Margen extra para miss automático (si NO se presiona nada) */
    MISS_OFFSET_MS: 50, // (Se mantiene de tu versión anterior)

    /**
     * Juzga una nota basada en la diferencia de tiempo.
     * @param {number} timeDiff - Diferencia en ms (tiempo_real - tiempo_nota).
     * @returns {string} El juicio ('sick', 'good', 'bad', 'shit', 'miss').
     */
    judge(timeDiff) {
        // Math.abs() hace que la ventana sea simétrica
        const absTimeDiff = Math.abs(timeDiff);

        // El orden es importante: del más estricto (sick) al más amplio (shit)
        if (absTimeDiff <= HitWindow.SICK_WINDOW_MS) return 'sick';
        if (absTimeDiff <= HitWindow.GOOD_WINDOW_MS) return 'good';
        if (absTimeDiff <= HitWindow.BAD_WINDOW_MS) return 'bad';
        if (absTimeDiff <= HitWindow.SHIT_WINDOW_MS) return 'shit';
        
        return 'miss';
    },

    // --- [NUEVA FUNCIÓN] ---
    /**
     * Calcula la puntuación de una nota basada en el tiempo (PBOT1).
     * Portado de scoreNotePBOT1 en Scoring.hx.
     * @param {number} msTiming - Diferencia en ms (tiempo_real - tiempo_nota).
     * @returns {number} La puntuación.
     */
    scoreNote(msTiming) {
        const absTiming = Math.abs(msTiming);

        if (absTiming > HitWindow.SHIT_WINDOW_MS) {
            return HitWindow.PBOT1_MISS_SCORE;
        }
        if (absTiming < HitWindow.PBOT1_PERFECT_THRESHOLD) {
            return HitWindow.PBOT1_MAX_SCORE;
        }

        // Ecuación Sigmoid de Scoring.hx
        const factor = 1.0 - (1.0 / (1.0 + Math.exp(-HitWindow.PBOT1_SCORING_SLOPE * (absTiming - HitWindow.PBOT1_SCORING_OFFSET))));
        const score = Math.floor(HitWindow.PBOT1_MAX_SCORE * factor + HitWindow.PBOT1_MIN_SCORE);

        return score;
    },
    // --- [FIN DE NUEVA FUNCIÓN] ---


    /**
     * Verifica si una nota ya está demasiado tarde para ser golpeada (miss pasivo).
     * @param {number} timeDiff - Diferencia en ms (tiempo_real - tiempo_nota).
     * @returns {boolean} True si la nota se considera perdida por tiempo.
     */
    isTooLate(timeDiff) {
        // timeDiff debe ser positivo (tiempo_real > tiempo_nota)
        return timeDiff > HitWindow.SHIT_WINDOW_MS;
    },

     /**
      * Verifica si una nota ya pasó su ventana y un margen adicional (miss pasivo).
      * @param {number} timeDiff - Diferencia en ms (tiempo_real - tiempo_nota).
      * @returns {boolean} True si la nota debe considerarse miss automáticamente.
      */
     isLongMiss(timeDiff) {
        // timeDiff debe ser positivo (tiempo_real > tiempo_nota)
        return timeDiff > HitWindow.SHIT_WINDOW_MS + HitWindow.MISS_OFFSET_MS;
     }
};
// [CORRECCIÓN] Se eliminó el '}' extra que causaba un error
Object.freeze(HitWindow);