/**
 * Clase IntroDanceBoop
 * Se encarga exclusivamente de la lógica de ritmo (BPM) y la alternancia (Left/Right).
 * Ruta: source/funkin/ui/intro/introDanceBoop.js
 */
export default class IntroDanceBoop {
    /**
     * @param {Phaser.Scene} scene - Referencia a la escena para usar el Time.addEvent
     * @param {number} bpm - Beats por minuto iniciales (Default: 100)
     */
    constructor(scene, bpm = 100) {
        this.scene = scene;
        this.bpm = bpm;
        this.danceLeft = false; // Variable para alternar el baile
        this.beatTimer = null;  // Referencia al temporizador de Phaser
        this.onBeatCallback = null; // Función que se llamará cada beat
    }

    /**
     * Inicia el ciclo de beats.
     * @param {Function} callback - Función a ejecutar en cada beat. Recibe (danceLeft).
     */
    start(callback) {
        this.onBeatCallback = callback;
        const beatDuration = (60 / this.bpm) * 1000;

        // Ejecutar el primer beat inmediatamente (beat 0)
        this.beatHit();

        // Configurar el timer cíclico para los siguientes beats
        this.beatTimer = this.scene.time.addEvent({
            delay: beatDuration,
            callback: this.beatHit,
            callbackScope: this,
            loop: true
        });
    }

    /**
     * Lógica interna que se ejecuta cada vez que el timer cumple el tiempo del beat.
     */
    beatHit() {
        // Alternar dirección
        this.danceLeft = !this.danceLeft;

        // Notificar a la escena o a quien esté escuchando
        if (this.onBeatCallback) {
            this.onBeatCallback(this.danceLeft);
        }
    }

    /**
     * Detiene el ritmo y limpia la memoria.
     */
    stop() {
        if (this.beatTimer) {
            this.beatTimer.remove();
            this.beatTimer = null;
        }
        this.danceLeft = false;
    }

    /**
     * Permite cambiar el BPM en caliente si fuera necesario.
     */
    setBPM(newBpm) {
        this.bpm = newBpm;
        if (this.beatTimer) {
            this.stop();
            // Reinicia con el nuevo callback existente
            this.start(this.onBeatCallback);
        }
    }
}