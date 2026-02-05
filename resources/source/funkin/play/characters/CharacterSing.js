import { NoteDirection } from "../notes/NoteDirection.js";

/**
 * CharacterSing.js
 * Maneja la lógica de cuánto tiempo mantener una nota cantada.
 */
export class CharacterSing {
    /**
     * @param {import('./AnimateAtlasCharacter.js').AnimateAtlasCharacter} character 
     * @param {number} duration - Duración en beats.
     */
    constructor(character, duration = 4) {
        this.character = character;
        this.singDuration = duration;
        this.holdTimer = 0;
    }

    setDuration(duration) {
        this.singDuration = duration;
    }

    sing(direction, miss = false) {
        if (!this.character || !this.character.active) return;

        const dirName = NoteDirection.getNameUpper(direction);
        const suffix = miss ? 'miss' : '';
        const animName = `sing${dirName}${suffix}`;

        this.holdTimer = 0;
        
        // force = false para que si spamea la misma nota, reinicie la animación
        if (typeof this.character.playAnim === 'function') {
            this.character.playAnim(animName, false);
        }
    }

    onBeat() {
        if (!this.character || !this.character.active) return;

        if (this.isSinging()) {
            this.holdTimer++;
            // Si superamos la duración, forzamos volver a idle
            if (this.holdTimer >= this.singDuration) {
                if (typeof this.character.dance === 'function') {
                    this.character.dance(true); 
                }
            }
        } else {
            this.holdTimer = 0;
        }
    }

    isSinging() {
        // [CORRECCIÓN] Validación de seguridad: Verificar que character y anims existan
        if (!this.character || !this.character.anims) return false;

        const currentAnim = this.character.anims.currentAnim;
        return currentAnim && currentAnim.key && currentAnim.key.includes('sing');
    }

    shouldHold() {
        return this.isSinging() && this.holdTimer < this.singDuration;
    }
}