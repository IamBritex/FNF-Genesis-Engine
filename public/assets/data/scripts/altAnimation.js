export default class AltAnimation {
    constructor(scene) {
        this.scene = scene;
        this.characters = scene.characters;
        this.timer = null;
        this.originalAnim = null;
        this.targetCharacter = null;
        this.isDestroyed = false;
    }

    /**
     * Permite llamar a define usando un objeto de parámetros (params)
     * Ejemplo: script.define({ characterType: "player1", animation: "hey", duration: 2200 })
     */
    async define(paramsOrCharacterType, animation, duration) {
        let characterType, anim, dur;
        // Si el primer argumento es un objeto, extrae los parámetros
        if (typeof paramsOrCharacterType === "object" && paramsOrCharacterType !== null) {
            characterType = paramsOrCharacterType.characterType;
            anim = paramsOrCharacterType.animation;
            dur = paramsOrCharacterType.duration;
        } else {
            characterType = paramsOrCharacterType;
            anim = animation;
            dur = duration;
        }

        // Guardar la referencia al personaje objetivo
        switch(characterType) {
            case 'player1':
                this.targetCharacter = this.scene.songData.song.player1;
                break;
            case 'player2':
                this.targetCharacter = this.scene.songData.song.player2;
                break;
            case 'gf':
                this.targetCharacter = this.scene.songData.song.gfVersion;
                break;
            default:
                console.warn(`Invalid character type: ${characterType}`);
                return;
        }

        if (!this.targetCharacter) {
            console.warn(`Character not found for type: ${characterType}`);
            return;
        }

        const character = this.characters.loadedCharacters.get(this.targetCharacter);
        if (character) {
            // Guardar la animación actual
            this.originalAnim = character.currentAnimation;
            
            // Cambiar a la nueva animación
            this.characters.playAnimation(this.targetCharacter, anim);

            // Configurar el timer para volver a la animación idle
            if (dur > 0) {
                this.timer = this.scene.time.delayedCall(dur, () => {
                    const char = this.characters.loadedCharacters.get(this.targetCharacter);
                    if (char) {
                        char.lastAnimationTime = 0;
                        this.characters.playAnimation(this.targetCharacter, "idle", true);
                    }
                });
            }
        }
    }

    cleanup() {
        if (this.isDestroyed) return;
        
        if (this.timer) {
            this.timer.remove();
            this.timer = null;
        }
        
        if (this.targetCharacter && this.originalAnim && this.characters?.loadedCharacters) {
            const character = this.characters.loadedCharacters.get(this.targetCharacter);
            if (character && character.sprite && character.sprite.scene) {
                try {
                    this.characters.playAnimation(this.targetCharacter, this.originalAnim);
                } catch (error) {
                    console.warn('Error restoring original animation:', error);
                }
            }
        }
    }

    destroy() {
        if (!this.isDestroyed) {
            this.cleanup();
            this.isDestroyed = true;
            this.scene = null;
            this.characters = null;
            this.originalAnim = null;
            this.targetCharacter = null;
        }
    }
}