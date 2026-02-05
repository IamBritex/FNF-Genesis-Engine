import { HitWindow } from "./HitWindow.js";
import { PlayEvents } from "../PlayEvents.js";

/**
 * Score.js
 * Gestiona el estado de la partida: Puntuación, Salud, Misses y Precisión.
 * Actúa como la fuente de verdad (Source of Truth) del estado del juego.
 */
export class Score {

    /**
     * @param {Phaser.Scene} scene - Referencia a PlayScene.
     */
    constructor(scene) {
        this.scene = scene;

        this.score = 0;
        this.misses = 0;
        this.hits = 0;
        this.totalPlayed = 0;
        this.accuracyPoints = 0;
        
        this.health = 1.0;
        this.maxHealth = 2.0;

        this.ACCURACY_WEIGHTS = {
            'sick': 1.0,
            'good': 0.75,
            'bad':  0.5,
            'shit': 0.0
        };

        this.HEAL_SICK = 0.04;
        this.HEAL_GOOD = 0.02;
        this.HEAL_BAD = 0.005;
        this.HEAL_SHIT = -0.02;
        this.DAMAGE_MISS = 0.1;

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.scene.events.on(PlayEvents.NOTE_HIT, this.onNoteHit, this);
        this.scene.events.on(PlayEvents.NOTE_MISS, this.onNoteMiss, this);
    }

    /**
     * @param {object} data - { note, rating, timeDiff, isPlayer }
     */
    onNoteHit(data) {
        if (!data.isPlayer) return;

        const rating = data.rating;
        const timeDiff = data.timeDiff;

        const scoreAmount = HitWindow.scoreNote(timeDiff);
        this.score += scoreAmount;

        this.hits++;
        this.totalPlayed++;

        const weight = this.ACCURACY_WEIGHTS[rating] !== undefined ? this.ACCURACY_WEIGHTS[rating] : 0;
        this.accuracyPoints += weight;

        if (rating === 'shit') {
            this.misses++;
        }

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
     * @param {object} data - { note, isPlayer }
     */
    onNoteMiss(data) {
        if (!data.isPlayer) return;

        this.misses++;
        this.totalPlayed++;
        
        this.accuracyPoints += 0;
        this.score += HitWindow.PBOT1_MISS_SCORE;
        
        this.changeHealth(-this.DAMAGE_MISS);
        this.emitScoreChange();
    }

    changeHealth(amount) {
        this.health = Phaser.Math.Clamp(this.health + amount, 0, this.maxHealth);

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