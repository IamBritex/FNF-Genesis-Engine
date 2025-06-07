export default class AltAnimation {
    constructor(scene) {
        this.scene = scene;
        this.characters = scene.characters;
        this.timer = null;
        this.originalAnim = null;
        this.targetCharacter = null;
        this.isDestroyed = false;
    }

    async define(characterType, animation, duration) {
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
            this.characters.playAnimation(this.targetCharacter, animation);

            // Configurar el timer para volver a la animación idle
            if (duration > 0) {
                this.timer = this.scene.time.delayedCall(duration, () => {
                    const char = this.characters.loadedCharacters.get(this.targetCharacter);
                    if (char) {
                        // Forzar el regreso a idle y actualizar el tiempo de la última animación
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
        
        // Verificar que el personaje y la animación existan antes de intentar restaurarla
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