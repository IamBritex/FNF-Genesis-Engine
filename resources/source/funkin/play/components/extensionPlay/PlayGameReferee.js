import { PlayEvents } from "../../PlayEvents.js";

/**
 * PlayGameReferee.js
 * Árbitro del juego. Decide si ganas o pierdes basándose en eventos.
 */
export class PlayGameReferee {
    constructor(scene) {
        this.scene = scene;
        this.isDead = false;

        // Escuchar eventos vitales
        this.scene.events.on(PlayEvents.HEALTH_CHANGED, this.onHealthChanged, this);
        this.scene.events.on(PlayEvents.SONG_COMPLETE, this.onSongComplete, this);
    }

    /**
     * Reacciona a cambios de salud.
     * @param {object} data { value, max }
     */
    onHealthChanged(data) {
        if (this.isDead) return;

        // Si la salud llega a 0, emitimos GAME OVER
        if (data.value <= 0) {
            this.isDead = true;
            console.log("[Referee] Health depleted. Game Over.");
            this.scene.events.emit(PlayEvents.GAME_OVER);
        }
    }

    /**
     * Reacciona cuando termina el audio de la canción.
     */
    onSongComplete() {
        if (this.isDead) return;

        // Lógica de transición (Historia vs Freeplay)
        // Emitimos la intención de salir o continuar
        const isStory = this.scene.initData?.isStoryMode;
        
        if (!isStory) {
            this.scene.events.emit(PlayEvents.EXIT_TO_MENU);
            return;
        }

        // Lógica de Modo Historia
        const currentIndex = this.scene.initData?.currentSongIndex || 0;
        const nextIndex = currentIndex + 1;
        const playlist = this.scene.initData?.playlistSongIds || [];

        if (nextIndex >= playlist.length) {
            // Fin de la semana
            this.scene.events.emit(PlayEvents.EXIT_TO_MENU);
        } else {
            // Siguiente canción (Emitimos reinicio con nuevos datos)
            // Nota: Aquí PlayScene manejará la lógica de reinicio al escuchar RESTART_SONG
            // con parámetros modificados, o un evento específico NEXT_SONG.
            // Por simplicidad en este refactor, manipulamos data y pedimos restart.
            
            this.scene.initData.currentSongIndex = nextIndex;
            this.scene.initData.targetSongId = playlist[nextIndex];
            
            this.scene.events.emit(PlayEvents.RESTART_SONG, { newData: this.scene.initData });
        }
    }

    destroy() {
        this.scene.events.off(PlayEvents.HEALTH_CHANGED, this.onHealthChanged, this);
        this.scene.events.off(PlayEvents.SONG_COMPLETE, this.onSongComplete, this);
        this.scene = null;
    }
}