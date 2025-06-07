export default class ShadowSprites {
    constructor(scene) {
        this.scene = scene;
        this.currentColor = null;
        this.shadowSprites = new Map();
        this.updateCallback = null;
    }

    async init() {
        if (this.scene.characters) {
            const currentChars = [
                this.scene.characters.currentEnemy,
                this.scene.characters.currentPlayer,
                this.scene.characters.currentGF
            ].filter(Boolean);

            currentChars.forEach(charId => {
                const character = this.scene.characters.loadedCharacters.get(charId);
                if (character?.sprite) {
                    // Create shadow sprite
                    const shadowSprite = this.scene.add.sprite(0, 0, character.sprite.texture.key);
                    shadowSprite.setFrame(character.sprite.frame.name);
                    shadowSprite.setOrigin(character.sprite.originX, character.sprite.originY);
                    shadowSprite.setScale(character.sprite.scaleX, character.sprite.scaleY);
                    shadowSprite.setVisible(false);
                    // Set depth +1 higher than character
                    shadowSprite.setDepth(character.sprite.depth + 1);

                    // Add to game layer
                    if (this.scene.cameraController) {
                        this.scene.cameraController.addToGameLayer(shadowSprite);
                    }

                    this.shadowSprites.set(charId, shadowSprite);
                }
            });

            // Crear update callback
            this.updateCallback = () => {
                this.shadowSprites.forEach((shadowSprite, charId) => {
                    const character = this.scene.characters.loadedCharacters.get(charId);
                    if (character?.sprite && shadowSprite.visible) {
                        this.updateShadow(character.sprite, shadowSprite);
                    }
                });
            };

            // Añadir al update loop de la escena
            this.scene.events.on('update', this.updateCallback);
        }
    }

    updateShadow(originalSprite, shadowSprite) {
        if (!shadowSprite || !originalSprite) return;

        shadowSprite.x = originalSprite.x;
        shadowSprite.y = originalSprite.y;
        shadowSprite.angle = originalSprite.angle;
        shadowSprite.flipX = originalSprite.flipX;
        shadowSprite.flipY = originalSprite.flipY;
        shadowSprite.setFrame(originalSprite.frame.name);
        shadowSprite.setScale(originalSprite.scaleX, originalSprite.scaleY);
        shadowSprite.setOrigin(originalSprite.originX, originalSprite.originY);
        // Mantener la profundidad siempre 1 más que el original
        shadowSprite.setDepth(originalSprite.depth + 1);
    }

    async define(...inputs) {
        const [color, targetPlayer] = inputs;

        if (!color) {
            // Hide all shadows if no color provided
            this.shadowSprites.forEach(sprite => sprite.setVisible(false));
            return;
        }

        // Convert color from hex to number
        const colorNum = parseInt(color.replace('#', ''), 16);

        let charactersToUpdate = [];
        if (!targetPlayer) {
            if (this.scene.characters) {
                charactersToUpdate = [
                    this.scene.characters.currentEnemy,
                    this.scene.characters.currentPlayer,
                    this.scene.characters.currentGF
                ].filter(Boolean);
            }
        } else {
            switch(targetPlayer) {
                case '1': 
                    charactersToUpdate = [this.scene.characters?.currentPlayer].filter(Boolean);
                    break;
                case '2':
                    charactersToUpdate = [this.scene.characters?.currentEnemy].filter(Boolean);
                    break;
                case 'gf':
                    charactersToUpdate = [this.scene.characters?.currentGF].filter(Boolean);
                    break;
            }
        }

        // Update shadows
        charactersToUpdate.forEach(charId => {
            const character = this.scene.characters?.loadedCharacters?.get(charId);
            const shadowSprite = this.shadowSprites.get(charId);
            
            if (character?.sprite && shadowSprite) {
                shadowSprite.setVisible(true);
                shadowSprite.setTint(colorNum);
                shadowSprite.setAlpha(1);
                this.updateShadow(character.sprite, shadowSprite);
            }
        });
    }

    cleanup() {
        // Remover el update callback
        if (this.updateCallback) {
            this.scene.events.off('update', this.updateCallback);
            this.updateCallback = null;
        }

        this.shadowSprites.forEach(sprite => sprite.destroy());
        this.shadowSprites.clear();
    }
}