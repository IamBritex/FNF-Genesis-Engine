import { PlayEvents } from "../../PlayEvents.js";

/**
 * PlayGameReferee.js
 * Árbitro del juego. Monitorea las condiciones de victoria y derrota.
 * [ACTUALIZADO] Muerte basada estrictamente en eventos de Salud <= 0.
 */
export class PlayGameReferee {

    /**
     * @param {Phaser.Scene} scene
     */
    constructor(scene) {
        this.scene = scene;
        this.isDead = false;
        
        // Escuchar cambios de salud directamente desde Score.js
        this.scene.events.on(PlayEvents.HEALTH_CHANGED, this.checkHealthStatus, this);
    }

    /**
     * Evalúa si el jugador ha muerto basado en la salud actual.
     * @param {object} data - { value, max }
     */
    checkHealthStatus(data) {
        if (this.isDead || !this.scene.sys.isActive()) return;

        // La muerte ocurre SOLO si la salud llega a 0 (o menos)
        if (data.value <= 0) {
            this.triggerGameOver();
        }
    }

    triggerGameOver() {
        this.isDead = true;
        
        // Detener música y conductores
        if (this.scene.conductor) this.scene.conductor.stop();
        if (this.scene.sound) this.scene.sound.stopAll();

        // Pausar personajes si es posible
        if (this.scene.charactersHandler) {
            const boyfriend = this.scene.charactersHandler.boyfriend;
            if (boyfriend && boyfriend.anims) {
                boyfriend.anims.stop();
            }
        }

        console.log("[PlayGameReferee] Salud agotada. Game Over.");
        this.scene.events.emit(PlayEvents.GAME_OVER);
    }

    destroy() {
        this.scene.events.off(PlayEvents.HEALTH_CHANGED, this.checkHealthStatus, this);
        this.scene = null;
    }
}