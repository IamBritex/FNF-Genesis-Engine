import { PlayEvents } from "../../PlayEvents.js";

/**
 * PlayDebug.js
 * Herramientas de depuración en tiempo real para desarrolladores.
 * Permite controlar el flujo de la canción, velocidad y visualizar estadísticas.
 * * Activación: `window.PlayDebug = true` en la consola del navegador.
 * Controles:
 * - END: Terminar canción.
 * - REPAG / AVPAG: Saltar +/- 10 segundos.
 * - INSERT / SUPR: Aumentar/Disminuir velocidad.
 * - INICIO: Restaurar velocidad normal.
 */
export class PlayDebug {
    
    /**
     * @param {Phaser.Scene} scene - La escena de juego.
     */
    constructor(scene) {
        this.scene = scene;
        this.isActive = false;
        
        // Estado de velocidad de reproducción
        this.timeScale = 1.0;

        // Registrar teclas de depuración
        this.keys = this.scene.input.keyboard.addKeys({
            end: Phaser.Input.Keyboard.KeyCodes.END,
            pageUp: Phaser.Input.Keyboard.KeyCodes.PAGE_UP,
            pageDown: Phaser.Input.Keyboard.KeyCodes.PAGE_DOWN,
            insert: Phaser.Input.Keyboard.KeyCodes.INSERT,
            home: Phaser.Input.Keyboard.KeyCodes.HOME,
            delete: Phaser.Input.Keyboard.KeyCodes.DELETE
        });

        // Habilitar flag global si no existe para facilitar acceso
        if (typeof window.PlayDebug === 'undefined') {
            window.PlayDebug = true; 
        }

        console.log("[PlayDebug] Sistema de depuración listo.");
    }

    /**
     * Loop principal de depuración. Verifica inputs y ejecuta acciones.
     */
    update() {
        // Seguridad: Solo ejecutar si la flag global está activa
        if (!window.PlayDebug) return;

        // 1. Forzar final de canción (Tecla END)
        if (Phaser.Input.Keyboard.JustDown(this.keys.end)) {
            console.log("[PlayDebug] Forzando final de canción...");
            this.scene.events.emit(PlayEvents.SONG_COMPLETE);
        }

        // 2. Salto de Tiempo (Teclas PAGE UP / PAGE DOWN)
        if (Phaser.Input.Keyboard.JustDown(this.keys.pageUp)) {
            this.skipTime(10000); // Avanzar 10s
        }
        if (Phaser.Input.Keyboard.JustDown(this.keys.pageDown)) {
            this.skipTime(-10000); // Retroceder 10s
        }

        // 3. Control de Velocidad (INSERT / DELETE / HOME)
        // Solo si el audio está cargado y listo
        if (this.scene.songAudio?.inst) {
            if (Phaser.Input.Keyboard.JustDown(this.keys.insert)) {
                this.setTimeScale(this.timeScale + 0.1);
            }
            if (Phaser.Input.Keyboard.JustDown(this.keys.delete)) {
                this.setTimeScale(this.timeScale - 0.1);
            }
            if (Phaser.Input.Keyboard.JustDown(this.keys.home)) {
                this.setTimeScale(1.0);
            }
        }
    }

    /**
     * Salta a una posición específica de la canción.
     * Sincroniza audio, conductor y notas visuales.
     * @param {number} amountMs - Cantidad de tiempo a saltar en milisegundos.
     */
    skipTime(amountMs) {
        if (!this.scene.songAudio?.inst?.isPlaying) return;

        let currentSeek = this.scene.songAudio.inst.seek;
        let newSeek = currentSeek + (amountMs / 1000);
        const duration = this.scene.songAudio.inst.duration;

        // Clampear valores dentro de la duración de la canción
        if (newSeek < 0) newSeek = 0;
        if (newSeek > duration) newSeek = duration - 0.1;

        // 1. Aplicar salto al audio (Inst y Voces)
        this.scene.songAudio.inst.setSeek(newSeek);
        if (this.scene.songAudio.voices) {
            this.scene.songAudio.voices.forEach(v => {
                if (v) v.setSeek(newSeek);
            });
        }

        // 2. Sincronizar Conductor (Lógica de ritmo)
        if (this.scene.conductor) {
            this.scene.conductor.updateFromSong(newSeek * 1000);
        }

        // 3. Sincronizar Notas Visuales (Forzar actualización inmediata)
        if (this.scene.notesHandler) {
            this.scene.notesHandler.update(newSeek * 1000);
        }

        console.log(`[PlayDebug] Salto de tiempo a: ${newSeek.toFixed(2)}s`);
    }

    /**
     * Ajusta la velocidad global del juego (Time Scale).
     * Afecta a tweens, física y pitch de audio.
     * @param {number} scale - Factor de velocidad (ej. 1.0, 0.5, 2.0).
     */
    setTimeScale(scale) {
        // Limitar rango seguro (0.1x a 5.0x)
        scale = Phaser.Math.Clamp(scale, 0.1, 5.0);
        this.timeScale = scale;

        // 1. Cambiar velocidad del motor de tiempo de Phaser (Tweens, Timers)
        if (this.scene.time) {
            this.scene.time.timeScale = this.timeScale;
        }

        // 2. Cambiar velocidad de reproducción del audio (Rate)
        if (this.scene.songAudio) {
            const setAudioRate = (sound) => {
                if (sound && sound.currentConfig) sound.setRate(this.timeScale);
            };

            setAudioRate(this.scene.songAudio.inst);
            
            if (Array.isArray(this.scene.songAudio.voices)) {
                this.scene.songAudio.voices.forEach(setAudioRate);
            }
        }

        console.log(`[PlayDebug] Velocidad establecida a: x${this.timeScale.toFixed(1)}`);
    }

    /**
     * Limpia los listeners de teclado al destruir la escena.
     */
    destroy() {
        // Phaser limpia automáticamente las teclas agregadas con addKeys al destruir la escena,
        // pero podemos nulificar la referencia por seguridad.
        this.keys = null;
        this.scene = null;
    }
}