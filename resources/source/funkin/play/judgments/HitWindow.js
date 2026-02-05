/**
 * HitWindow.js
 * Define las ventanas de tiempo (timing windows) y el cálculo de puntuación.
 * Basado en el sistema PBOT1 (Points Based On Timing).
 */
export const HitWindow = {
    // --- Configuración de Puntuación (PBOT1) ---
    PBOT1_MAX_SCORE: 500,
    PBOT1_SCORING_OFFSET: 54.99,
    PBOT1_SCORING_SLOPE: 0.080,
    PBOT1_MIN_SCORE: 9.0,
    PBOT1_MISS_SCORE: -100,
    PBOT1_PERFECT_THRESHOLD: 5.0,

    // --- Ventanas de Juicio (ms) ---
    SICK_WINDOW_MS: 45.0,
    GOOD_WINDOW_MS: 90.0,
    BAD_WINDOW_MS: 135.0,
    SHIT_WINDOW_MS: 160.0,
    MAX_JUDGE_RANGE_MS: 160.0,
    MISS_OFFSET_MS: 50, // Tolerancia extra antes de declarar MISS

    /**
     * Determina la calificación (rating) basada en la diferencia de tiempo.
     * @param {number} timeDiff - Diferencia en ms entre el input y la nota.
     * @returns {string} 'sick', 'good', 'bad', 'shit' o 'miss'.
     */
    judge(timeDiff) {
        const absTimeDiff = Math.abs(timeDiff);
        if (absTimeDiff <= HitWindow.SICK_WINDOW_MS) return 'sick';
        if (absTimeDiff <= HitWindow.GOOD_WINDOW_MS) return 'good';
        if (absTimeDiff <= HitWindow.BAD_WINDOW_MS) return 'bad';
        if (absTimeDiff <= HitWindow.SHIT_WINDOW_MS) return 'shit';
        return 'miss';
    },

    /**
     * Calcula la puntuación exacta basada en la precisión.
     * @param {number} msTiming - Diferencia de tiempo absoluta.
     * @returns {number} Puntuación calculada.
     */
    scoreNote(msTiming) {
        const absTiming = Math.abs(msTiming);
        if (absTiming > HitWindow.SHIT_WINDOW_MS) return HitWindow.PBOT1_MISS_SCORE;
        if (absTiming < HitWindow.PBOT1_PERFECT_THRESHOLD) return HitWindow.PBOT1_MAX_SCORE;

        const factor = 1.0 - (1.0 / (1.0 + Math.exp(-HitWindow.PBOT1_SCORING_SLOPE * (absTiming - HitWindow.PBOT1_SCORING_OFFSET))));
        return Math.floor(HitWindow.PBOT1_MAX_SCORE * factor + HitWindow.PBOT1_MIN_SCORE);
    },

    /**
     * Verifica si una nota ya pasó su tiempo de vida útil.
     * @param {number} timeDiff - Diferencia de tiempo (Positivo = nota ya pasó).
     */
    isLongMiss(timeDiff) {
        return timeDiff > HitWindow.SHIT_WINDOW_MS + HitWindow.MISS_OFFSET_MS;
    }
};

Object.freeze(HitWindow);