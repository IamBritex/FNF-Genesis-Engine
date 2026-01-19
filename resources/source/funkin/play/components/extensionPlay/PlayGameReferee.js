/**
 * source/funkin/play/components/extensionPlay/PlayGameReferee.js
 * Lógica de reglas del juego: Victoria, Derrota, Playlist.
 */
export class PlayGameReferee {
    constructor(scene) {
        this.scene = scene;
    }

    /**
     * Verifica condiciones de muerte
     */
    checkVitality() {
        if (!this.scene.hud.healthBar) return;

        // Si la salud es 0 o menos, Game Over (puedes expandir esto para muerte real)
        if (this.scene.hud.healthBar.value <= 0) {
            // Aquí iría la lógica de GameOverScene
            console.log("GAME OVER"); 
            // this.scene.startGameOver(); 
        }
    }

    /**
     * Maneja el fin de la canción
     */
    onSongComplete() {
        if (this.scene.scriptHandler) {
            this.scene.scriptHandler.call('onSongEnd');
        }

        // Lógica para Freeplay (Salir al menú)
        if (!this.scene.initData.isStoryMode) {
            this.exitToMenu();
            return;
        }

        // Lógica para Story Mode (Siguiente canción)
        const currentIndex = this.scene.initData?.currentSongIndex || 0;
        const nextIndex = currentIndex + 1;

        if (nextIndex >= this.scene.initData.playlistSongIds.length) {
            // Fin de la semana
            this.exitToMenu();
            return;
        }

        // Cargar siguiente canción
        const nextSongId = this.scene.initData.playlistSongIds[nextIndex];
        this.scene.initData.currentSongIndex = nextIndex;
        this.scene.initData.targetSongId = nextSongId;
        this.scene.initData.deathCounter = this.scene.deathCounter;
        
        this.scene.restart(this.scene.initData);
    }

    exitToMenu() {
        // Detener música antes de salir
        if (this.scene.songAudio) {
            if (this.scene.songAudio.inst) this.scene.songAudio.inst.stop();
            if (this.scene.songAudio.voices) {
                this.scene.songAudio.voices.forEach(v => v && v.stop());
            }
        }

        const nextSceneKey = this.scene.initData?.isStoryMode ? "StoryModeScene" : "FreeplayScene";
        this.scene.scene.stop('PauseScene');
        this.scene.scene.start(nextSceneKey);
    }
}