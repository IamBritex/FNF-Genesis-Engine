import { PlayEvents } from "../../PlayEvents.js";

/**
 * PlayDebug.js
 * Sistema de depuración en tiempo real.
 * Se activa estableciendo `window.PlayDebug = true` en la consola.
 */
export class PlayDebug {
    constructor(scene) {
        this.scene = scene;
        this.isActive = false;
        
        // Estado de velocidad
        this.timeScale = 1.0;

        // Teclas
        this.keys = this.scene.input.keyboard.addKeys({
            end: Phaser.Input.Keyboard.KeyCodes.END,
            pageUp: Phaser.Input.Keyboard.KeyCodes.PAGE_UP,
            pageDown: Phaser.Input.Keyboard.KeyCodes.PAGE_DOWN,
            insert: Phaser.Input.Keyboard.KeyCodes.INSERT,
            home: Phaser.Input.Keyboard.KeyCodes.HOME,
            delete: Phaser.Input.Keyboard.KeyCodes.DELETE
        });

        // Definir variable global si no existe
        if (typeof window.PlayDebug === 'undefined') {
            window.PlayDebug = true;
        }

        console.log("[PlayDebug] Inicializado. Actívalo en consola con 'window.PlayDebug = true'");
    }

    update() {
        // Chequeo de seguridad: solo ejecutar si la variable global es true
        if (!window.PlayDebug) return;

        // 1. Terminar Canción (FIN)
        if (Phaser.Input.Keyboard.JustDown(this.keys.end)) {
            console.log("[PlayDebug] Forzando final de canción...");
            this.scene.events.emit(window.PlayEvents.SONG_COMPLETE);
        }

        // 2. Control de Tiempo (REPAG / AVPAG)
        if (Phaser.Input.Keyboard.JustDown(this.keys.pageUp)) {
            this.skipTime(10000); // +10s
        }
        if (Phaser.Input.Keyboard.JustDown(this.keys.pageDown)) {
            this.skipTime(-10000); // -10s
        }

        // 3. Control de Velocidad (INSERT / DELETE / HOME)
        // [FIX] Verificar que songAudio e inst existan antes de usar setRate
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

    skipTime(amountMs) {
        // [FIX] Verificar que songAudio, inst existan y que isPlaying sea true
        if (!this.scene.songAudio?.inst?.isPlaying) return;

        let currentSeek = this.scene.songAudio.inst.seek;
        let newSeek = currentSeek + (amountMs / 1000);
        const duration = this.scene.songAudio.inst.duration;

        // Limites
        if (newSeek < 0) newSeek = 0;
        if (newSeek > duration) newSeek = duration - 1;

        // Aplicar salto al audio
        this.scene.songAudio.inst.setSeek(newSeek);
        if (this.scene.songAudio.voices) {
            this.scene.songAudio.voices.forEach(v => {
                if (v) v.setSeek(newSeek);
            });
        }

        // Sincronizar conductor inmediatamente
        if (this.scene.conductor) {
            this.scene.conductor.updateFromSong(newSeek * 1000);
        }

        // Sincronizar notas visuales (forzar update inmediato)
        if (this.scene.notesHandler) {
            this.scene.notesHandler.update(newSeek * 1000);
        }

        console.log(`[PlayDebug] Salto de tiempo a: ${newSeek.toFixed(2)}s`);
    }

    setTimeScale(scale) {
        // Limitar rango seguro
        if (scale < 0.1) scale = 0.1;
        if (scale > 5.0) scale = 5.0;

        this.timeScale = scale;

        // 1. Cambiar velocidad del motor de física/tweens de Phaser
        if (this.scene.time) {
            this.scene.time.timeScale = this.timeScale;
        }

        // 2. Cambiar velocidad (pitch/rate) del audio
        // [FIX CRÍTICO] Verificar que inst y voices existan antes de llamar setRate()
        if (this.scene.songAudio) {
            if (this.scene.songAudio.inst && this.scene.songAudio.inst.currentConfig) {
                this.scene.songAudio.inst.setRate(this.timeScale);
            }
            if (this.scene.songAudio.voices && Array.isArray(this.scene.songAudio.voices)) {
                this.scene.songAudio.voices.forEach(v => {
                    if (v && v.currentConfig) {
                        v.setRate(this.timeScale);
                    }
                });
            }
        }

        console.log(`[PlayDebug] Velocidad establecida a: x${this.timeScale.toFixed(1)}`);
    }

    destroy() {
        // Limpiar teclas
        if (this.keys) {
            this.keys = null;
        }
    }
}