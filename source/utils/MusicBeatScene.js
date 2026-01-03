// source/utils/MusicBeatScene.js
export default class MusicBeatScene extends Phaser.Scene {
    constructor(key) {
        super(key);
        this.curStep = 0;
        this.curBeat = 0;
        this.curDecBeat = 0;
    }

    create() {
        // Lógica base para todas las escenas (ej: transiciones)
        console.log(`[MusicBeatScene] Created: ${this.scene.key}`);
    }

    update(time, delta) {
        // Aquí iría la lógica del Conductor de música si la tuvieras
        // Conductor.update(time, delta);
    }

    // Helper para cambiar de escena rápido
    switchState(nextStateKey) {
        // Aquí podrías meter transiciones negras (Fade Out)
        this.scene.start(nextStateKey);
    }
}