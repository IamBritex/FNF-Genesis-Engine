/**
 * Maneja la reproducción de la música de fondo (Inst) en el menú.
 */
export class PreviewPlayer {
    constructor(scene) {
        this.scene = scene;
        this.currentSongId = null;
        this.music = null;
        this.playTimer = null;
    }

    /**
     * Intenta reproducir la instrumental de la canción seleccionada.
     * Usa un delay (debounce) para no cargar audio si el usuario hace scroll rápido.
     */
    playMusic(songName, delay = 500) {
        // Detener timer anterior si existe
        if (this.playTimer) {
            this.playTimer.remove();
        }

        // Si es la misma canción, no hacemos nada
        if (this.currentSongId === songName) return;

        this.currentSongId = songName;

        // Esperar un poco antes de cargar/reproducir
        this.playTimer = this.scene.time.delayedCall(delay, () => {
            this._startAudio(songName);
        });
    }

    _startAudio(songName) {
        // Detener música del menú principal si sigue sonando
        const menuMusic = this.scene.sound.get('freakyMenu');
        if (menuMusic && menuMusic.isPlaying) {
            menuMusic.stop();
        }

        // Detener preview anterior
        if (this.music) {
            this.music.stop();
        }

        // En una implementación real, aquí cargarías dinámicamente el audio
        // this.scene.load.audio(...)
        // Por ahora, asumimos que se gestionará la carga o streaming.
        // FNF Web suele usar streaming o carga previa limitada.
        
        console.log(`[PreviewPlayer] Playing Inst for: ${songName}`);
        // TODO: Implementar carga dinámica de Inst.ogg
    }

    stop() {
        if (this.playTimer) this.playTimer.remove();
        if (this.music) this.music.stop();
    }
}