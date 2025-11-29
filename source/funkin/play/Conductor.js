/**
 * source/funkin/play/Conductor.js
 * Un gestor de ritmo (BPM) para sincronizar eventos.
 *
 * [MODIFICADO] Versión Híbrida:
 * - Modo Activo (para StageEditor): Usa start(), stop() y update(delta).
 * - Modo Pasivo (para PlayScene): Usa updateFromSong(songPosition).
 */
export class Conductor {

    /**
     * @param {number} bpm - Los Beats Por Minuto.
     */
    constructor(bpm) {
        this.bpm = bpm || 130;
        
        /**
         * Duración de un beat (negra) en milisegundos.
         * @type {number}
         */
        this.crochet = (60 / this.bpm) * 1000;
        
        /**
         * Duración de un step (semicorchea) en milisegundos.
         * @type {number}
         */
        this.stepCrochet = this.crochet / 4;

        /**
         * Posición actual de la "canción" en milisegundos.
         * (Usado solo por el modo Activo/Editor)
         * @type {number}
         */
        this.songPosition = 0;
        
        /**
         * Indica si el conductor está activo (solo para modo Editor).
         * @type {boolean}
         */
        this.isPlaying = false;
        
        /** @type {number} */
        this.lastBeat = 0;
        /** @type {number} */
        this.lastStep = 0;

        /**
         * Almacén de callbacks para eventos.
         * @type {Map<string, Array<{fn: Function, ctx: any}>>}
         */
        this.callbacks = new Map();
        this.callbacks.set('beat', []);
        this.callbacks.set('step', []);
    }

    /**
     * Inicia el conductor (Modo Activo/Editor).
     * Resetea el tiempo y activa el 'update'.
     */
    start() {
        this.isPlaying = true;
        this.songPosition = 0;
        this.lastBeat = 0;
        this.lastStep = 0;
        console.log(`[Conductor] Iniciado (Modo Activo) a ${this.bpm} BPM.`);
    }

    /**
     * [CORREGIDO] Detiene el conductor.
     * Ahora solo detiene el 'update' (isPlaying = false).
     * NO limpia los callbacks (los listeners).
     */
    stop() {
        this.isPlaying = false;
        console.log(`[Conductor] Detenido.`);
    }

    /**
     * Registra un callback para un evento ('beat' o 'step').
     * @param {string} event El nombre del evento ('beat' o 'step').
     * @param {Function} callback La función a llamar.
     * @param {any} context El contexto 'this' para la función.
     */
    on(event, callback, context) {
        if (this.callbacks.has(event)) {
            this.callbacks.get(event).push({ fn: callback, ctx: context || this });
        }
    }

    /**
     * Elimina un callback registrado.
     * @param {string} event El nombre del evento.
     * @param {Function} callback La función a eliminar.
     * @param {any} context El contexto.
     */
    off(event, callback, context) {
        if (this.callbacks.has(event)) {
            const list = this.callbacks.get(event);
            const contextToUse = context || this;
            const index = list.findIndex(cb => cb.fn === callback && cb.ctx === contextToUse);
            if (index > -1) {
                list.splice(index, 1);
            }
        }
    }

    /**
     * Emite un evento, llamando a todos los callbacks registrados.
     * @param {string} event El nombre del evento.
     * @param {...any} args Argumentos para pasar al callback.
     */
    emit(event, ...args) {
        if (this.callbacks.has(event)) {
            [...this.callbacks.get(event)].forEach(cb => {
                cb.fn.apply(cb.ctx, args);
            });
        }
    }

    /**
     * Lógica centralizada para emitir beats.
     * @param {number} position El tiempo actual a comprobar.
     */
    checkBeats(position) {
        if (position < 0) return;

        const oldStep = this.lastStep;
        const newStep = Math.floor(position / this.stepCrochet);

        if (newStep > oldStep) {
            this.lastStep = newStep;
            this.emit('step', this.lastStep);

            const oldBeat = this.lastBeat;
            const newBeat = Math.floor(newStep / 4);
            
            if (newBeat > oldBeat) {
                this.lastBeat = newBeat;
                this.emit('beat', this.lastBeat);
            }
        }
    }

    /**
     * Actualiza el conductor (Modo Activo/Editor).
     * @param {number} delta El tiempo en milisegundos desde el último fotograma.
     */
    update(delta) {
        if (!this.isPlaying) return;

        this.songPosition += delta;
        this.checkBeats(this.songPosition);
    }
    
    /**
     * Actualiza el conductor (Modo Pasivo/PlayScene).
     * @param {number} songPosition El tiempo actual de la canción en ms.
     */
    updateFromSong(songPosition) {
        this.songPosition = songPosition;
        this.checkBeats(this.songPosition);
    }
}