import { HitWindow } from "./HitWindow.js";
import { PlayEvents } from "../PlayEvents.js";

/**
 * Score.js
 * Gestiona el estado de la partida: Puntuación, Salud, Misses y Precisión.
 * Actúa como la fuente de verdad (Source of Truth) del estado del juego.
 * [ACTUALIZADO] Implementa precisión ponderada (Weighted Accuracy).
 */
export class Score {

    /**
     * @param {Phaser.Scene} scene - Referencia a PlayScene.
     */
    constructor(scene) {
        this.scene = scene;

        // --- Estado de Puntuación ---
        this.score = 0;
        this.misses = 0;
        this.hits = 0;          // Cantidad de notas acertadas
        this.totalPlayed = 0;   // Cantidad total de notas procesadas (hits + misses)
        this.accuracyPoints = 0; // Suma acumulada de la calidad de los golpes (0.0 a 1.0)
        
        // --- Estado de Salud (0.0 a 2.0, inicio en 1.0) ---
        this.health = 1.0;
        this.maxHealth = 2.0;

        // --- Configuración de Pesos de Precisión ---
        this.ACCURACY_WEIGHTS = {
            'sick': 1.0,
            'good': 0.75,
            'bad':  0.5,
            'shit': 0.0
        };

        // --- Configuración de Balance de Salud ---
        this.HEAL_SICK = 0.04;
        this.HEAL_GOOD = 0.02;
        this.HEAL_BAD = 0.005;
        this.HEAL_SHIT = -0.02; // Shit quita un poco de vida
        this.DAMAGE_MISS = 0.1; // Miss quita vida considerable

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.scene.events.on(PlayEvents.NOTE_HIT, this.onNoteHit, this);
        this.scene.events.on(PlayEvents.NOTE_MISS, this.onNoteMiss, this);
    }

    /**
     * Procesa un golpe de nota (Hit).
     * @param {object} data - { note, rating, timeDiff, isPlayer }
     */
    onNoteHit(data) {
        if (!data.isPlayer) return;

        const rating = data.rating;
        const timeDiff = data.timeDiff;

        // Calcular Puntuación Numérica
        const scoreAmount = HitWindow.scoreNote(timeDiff);
        this.score += Math.max(0, scoreAmount);

        // Actualizar Estadísticas
        this.hits++;
        this.totalPlayed++;

        // Actualizar Precisión Ponderada
        const weight = this.ACCURACY_WEIGHTS[rating] !== undefined ? this.ACCURACY_WEIGHTS[rating] : 0;
        this.accuracyPoints += weight;

        // 'shit' rompe el flujo visualmente en algunos juegos, aquí lo tratamos como hit sucio
        if (rating === 'shit') {
            this.misses++; // Opcional: contar shit como miss en el contador
        }

        // 3. Actualizar Salud
        let healthChange = 0;
        switch (rating) {
            case 'sick': healthChange = this.HEAL_SICK; break;
            case 'good': healthChange = this.HEAL_GOOD; break;
            case 'bad':  healthChange = this.HEAL_BAD; break;
            case 'shit': healthChange = this.HEAL_SHIT; break;
        }
        this.changeHealth(healthChange);

        this.emitScoreChange();
    }

    /**
     * Procesa un fallo de nota (Miss).
     * @param {object} data - { note, isPlayer }
     */
    onNoteMiss(data) {
        if (!data.isPlayer) return;

        this.misses++;
        this.totalPlayed++;
        
        // Miss cuenta como 0 en la suma de precisión
        this.accuracyPoints += -10;

        // Restar puntos
        this.score = Math.max(0, this.score + HitWindow.PBOT1_MISS_SCORE);
        
        this.changeHealth(-this.DAMAGE_MISS);
        this.emitScoreChange();
    }

    changeHealth(amount) {
        this.health = Phaser.Math.Clamp(this.health + amount, 0, this.maxHealth);

        // Notificar a componentes visuales (HealthBar) y lógicos (Referee)
        this.scene.events.emit(PlayEvents.HEALTH_CHANGED, {
            value: this.health,
            max: this.maxHealth
        });
    }

    calculateAccuracy() {
        if (this.totalPlayed === 0) return 0;
        return this.accuracyPoints / this.totalPlayed;
    }

    emitScoreChange() {
        this.scene.events.emit(PlayEvents.SCORE_CHANGED, {
            score: this.score,
            misses: this.misses,
            accuracy: this.calculateAccuracy()
        });
    }

    destroy() {
        if (this.scene) {
            this.scene.events.off(PlayEvents.NOTE_HIT, this.onNoteHit, this);
            this.scene.events.off(PlayEvents.NOTE_MISS, this.onNoteMiss, this);
        }
        this.scene = null;
    }
}