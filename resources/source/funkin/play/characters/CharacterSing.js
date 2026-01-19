import { NoteDirection } from "../notes/NoteDirection.js";

/**
 * CharacterSing.js
 * Maneja la lógica de canto, tiempos de hold y retorno a idle.
 */
export class CharacterSing {
    /**
     * @param {import('./AnimateAtlasCharacter.js').AnimateAtlasCharacter} character - El personaje que canta.
     * @param {number} duration - Duración inicial del hold en beats.
     */
    constructor(character, duration = 4) {
        this.character = character;
        this.singDuration = duration;
        this.holdTimer = 0;
    }

    /**
     * Actualiza la duración si cambia en el JSON/Config.
     */
    setDuration(duration) {
        this.singDuration = duration;
    }

    /**
     * Ejecuta la lógica para cantar una nota.
     * @param {number} direction - Dirección (0-3).
     * @param {boolean} miss - Si es una nota fallada.
     */
    sing(direction, miss = false) {
        if (!this.character.active) return;

        // Construir nombre de animación (ej: singLEFT, singUPmiss)
        const dirName = NoteDirection.getNameUpper(direction);
        const suffix = miss ? 'miss' : '';
        const animName = `sing${dirName}${suffix}`;

        // Reiniciar timer
        this.holdTimer = 0;
        
        // Ordenar al personaje reproducir la animación (force = false para reiniciar si es la misma)
        this.character.playAnim(animName, false);
    }

    /**
     * Se llama en cada beat para procesar el tiempo de hold.
     */
    onBeat() {
        if (!this.character.active) return;

        if (this.isSinging()) {
            this.holdTimer++;

            // Si se cumplió el tiempo de hold, forzar regreso a Idle
            if (this.holdTimer >= this.singDuration) {
                this.character.dance(true); // force = true
            }
        } else {
            // Si no está cantando, resetear y bailar al ritmo normal
            this.holdTimer = 0;
            this.character.dance(); 
        }
    }

    /**
     * Verifica si la animación actual del personaje es de canto.
     */
    isSinging() {
        const currentAnim = this.character.anims.currentAnim;
        return currentAnim && currentAnim.key.includes('sing');
    }

    /**
     * Indica si el personaje debe mantener la nota (bloqueando el baile normal).
     */
    shouldHold() {
        return this.isSinging() && this.holdTimer < this.singDuration;
    }
}