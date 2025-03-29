// src/states/VolumeScene.js
export class VolumeScene extends Phaser.Scene {
    constructor() {
        super({ key: "VolumeScene", active: true }); // Escena persistente y activa
    }

    create() {
        // Inicializar el volumen global
        this.volume = 0.5; // Volumen inicial al 50%

        // Configurar las teclas para ajustar el volumen
        this.keys = this.input.keyboard.addKeys({
            plus: 'PLUS', // Tecla +
            minus: 'MINUS', // Tecla -
            numpadPlus: 'NUMPAD_ADD', // Tecla + del numpad
            numpadMinus: 'NUMPAD_SUBTRACT' // Tecla - del numpad
        });

        // Aplicar el volumen global a todos los sonidos
        this.sound.volume = this.volume;
    }

    update() {
        // Ajustar el volumen con las teclas
        if (Phaser.Input.Keyboard.JustDown(this.keys.plus) || Phaser.Input.Keyboard.JustDown(this.keys.numpadPlus)) {
            this.adjustVolume(10); // Subir el volumen en 10%
        }

        if (Phaser.Input.Keyboard.JustDown(this.keys.minus) || Phaser.Input.Keyboard.JustDown(this.keys.numpadMinus)) {
            this.adjustVolume(-10); // Bajar el volumen en 10%
        }
    }

    adjustVolume(amount) {
        // Calcular el nuevo volumen
        this.volume += amount / 100;
        this.volume = Phaser.Math.Clamp(this.volume, 0, 1); // Limitar entre 0 y 1

        // Aplicar el volumen global a todos los sonidos
        this.sound.volume = this.volume;

        console.log(`Volumen ajustado a: ${Math.round(this.volume * 100)}%`);
    }
}