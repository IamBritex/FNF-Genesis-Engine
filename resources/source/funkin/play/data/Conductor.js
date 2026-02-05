/**
 * Conductor.js
 * Gestor de ritmo (BPM) para sincronizar eventos musicales.
 */
export class Conductor {

    /**
     * @param {number} bpm - Beats Por Minuto iniciales.
     */
    constructor(bpm) {
        this.bpm = bpm || 100;
        this.crochet = (60 / this.bpm) * 1000;
        this.stepCrochet = this.crochet / 4;
        this.songPosition = 0;
        
        this.isPlaying = false;
        
        this.lastBeat = 0;
        this.lastStep = 0;

        this.callbacks = new Map();
        this.callbacks.set('beat', []);
        this.callbacks.set('step', []);
    }

    /**
     * Inicia el conductor en modo activo.
     */
    start() {
        this.isPlaying = true;
        this.songPosition = 0;
        this.lastBeat = 0;
        this.lastStep = 0;
    }

    stop() {
        this.isPlaying = false;
    }

    on(event, callback, context) {
        if (this.callbacks.has(event)) {
            this.callbacks.get(event).push({ fn: callback, ctx: context || this });
        }
    }

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

    emit(event, ...args) {
        if (this.callbacks.has(event)) {
            [...this.callbacks.get(event)].forEach(cb => {
                cb.fn.apply(cb.ctx, args);
            });
        }
    }

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

    update(delta) {
        if (!this.isPlaying) return;
        this.songPosition += delta;
        this.checkBeats(this.songPosition);
    }
    
    updateFromSong(songPosition) {
        this.songPosition = songPosition;
        this.checkBeats(this.songPosition);
    }
}