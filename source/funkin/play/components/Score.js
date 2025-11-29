import { HitWindow } from "../judgments/HitWindow.js";

/**
 * Score.js
 * Nuevo módulo para manejar toda la lógica de puntuación,
 * aciertos, fallos y precisión.
 * Actúa como el 'ratingManager'.
 */
export class Score {
    
    /**
     * @param {Phaser.Scene} scene La escena de PlayScene
     */
    constructor(scene) {
        this.scene = scene;

        // El gestor de eventos para que RatingText escuche
        this.events = new Phaser.Events.EventEmitter();

        // Propiedades de puntuación
        this.score = 0;
        this.misses = 0;
        this.hits = 0;
    }

    /**
     * Procesa un acierto. Llamado por NotesHandler.
     * @param {string} rating ('sick', 'good', 'bad', 'shit')
     * @param {number} timeDiff (El timeDiff exacto del golpe)
     */
    processHit(rating, timeDiff) {
        // 1. Calcular puntuación usando la lógica de HitWindow
        const scoreAmount = HitWindow.scoreNote(timeDiff);

        // 2. Contar aciertos y fallos (para precisión)
        if (rating === 'shit') {
            // 'shit' cuenta como fallo para la precisión
            this.misses++;
            this.events.emit('noteMiss');
        } else {
            this.hits++;
            this.events.emit('noteHit');
        }
        
        // 3. Actualizar puntuación
        this.score += scoreAmount;
        if (this.score < 0) this.score = 0; // No permitir puntuación negativa

        // 4. Emitir evento para que RatingText actualice
        this.events.emit('scoreChanged');
    }

    /**
     * Procesa un fallo. Llamado por NotesHandler.
     */
    processMiss() {
        this.misses++;
        
        // Penalizar la puntuación
        this.score += HitWindow.PBOT1_MISS_SCORE; 
        if (this.score < 0) this.score = 0; // No permitir puntuación negativa

        // Emitir eventos
        this.events.emit('noteMiss');
        this.events.emit('scoreChanged');
    }

    /**
     * Calcula la precisión (0 a 1). Requerido por RatingText.
     */
    calculateAccuracy() {
        const totalJudged = this.hits + this.misses;
        if (totalJudged === 0) return 0;
        
        // Precisión simple basada en aciertos vs total
        return this.hits / totalJudged;
    }

    /**
     * Limpia el gestor de eventos.
     */
    destroy() {
        if (this.events) {
            this.events.destroy();
        }
        this.scene = null;
    }
}