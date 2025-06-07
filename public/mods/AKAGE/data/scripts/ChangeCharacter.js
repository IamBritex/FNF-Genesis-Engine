export default class ChangeCharacter {
    constructor(scene) {
        this.scene = scene;
        this.loadedData = new Map();
        this.modPath = '/public/mods/AKAGE';
    }

    async loadCharacterData(character) {
        // Check cache first
        if (this.loadedData.has(character)) {
            return this.loadedData.get(character);
        }

        const characterPath = `${this.modPath}/data/characters/${character}.json`;
        const response = await fetch(characterPath);
        if (!response.ok) throw new Error(`Character data not found at ${characterPath}`);
        const data = await response.json();
        this.loadedData.set(character, data);
        return data;
    }

    async loadTexture(character, characterData) {
        const textureKey = `character_${character}`;
        if (this.scene.textures.exists(textureKey)) return textureKey;

        const spritesPath = {
            texture: `${this.modPath}/images/${characterData.image}.png`,
            atlas: `${this.modPath}/images/${characterData.image}.xml`
        };

        return new Promise((resolve, reject) => {
            this.scene.load.atlasXML(textureKey, spritesPath.texture, spritesPath.atlas);
            this.scene.load.once('complete', () => resolve(textureKey));
            this.scene.load.once('loaderror', reject);
            this.scene.load.start();
        });
    }

    async define(...inputs) {
        const [player, character] = inputs;

        if (!player) {
            console.log('ChangeCharacter: Missing player value');
            return;
        }

        if (player !== 1 && player !== 2 && player !== 'gf') {
            console.log('ChangeCharacter: Invalid player value', player);
            return;
        }

        try {
            if (!this.scene.characters) {
                console.error('Characters manager not found in scene');
                return;
            }

            // Si character es null, ocultar el sprite actual pero mantener referencia
            if (character === null) {
                const currentId = this._getCurrentCharacterId(player);
                const currentChar = this.scene.characters.loadedCharacters.get(currentId);
                
                if (currentChar?.sprite) {
                    currentChar.sprite.setVisible(false);
                    console.log(`Character ${currentId} hidden`);
                }
                
                // Actualizar referencias para que la cámara lo ignore
                this._updateCharacterReferences(player, currentId, true);
                return;
            }

            // Cargar nuevo personaje
            const [characterData] = await Promise.all([
                this.loadCharacterData(character),
                this.loadTexture(character, await this.loadCharacterData(character))
            ]).catch(error => {
                console.error(`Failed to load character resources:`, error);
                return [null];
            });

            if (!characterData) return;

            // Limpiar personaje anterior
            const oldCharacterId = this._getCurrentCharacterId(player);
            if (oldCharacterId) {
                const oldCharacter = this.scene.characters.loadedCharacters.get(oldCharacterId);
                if (oldCharacter?.sprite) {
                    oldCharacter.sprite.destroy();
                    this.scene.characters.loadedCharacters.delete(oldCharacterId);
                }
            }

            // Crear nuevo personaje
            const newCharacterInfo = await this.scene.characters.createCharacter(character, player === 1);
            
            if (!newCharacterInfo) {
                console.error(`Failed to create character: ${character}`);
                return;
            }

            // Añadir a la capa de juego
            if (this.scene.cameraController && newCharacterInfo.sprite) {
                this.scene.cameraController.addToGameLayer(newCharacterInfo.sprite);
            }

            // Actualizar referencias e iconos
            this._updateCharacterReferences(player, character, false);
            this._updateHealthBarIcon(player, character, characterData);

            console.log(`Character changed:`, {
                from: oldCharacterId,
                to: character,
                player: player,
                isVisible: true
            });

        } catch (error) {
            console.error('Error in ChangeCharacter:', error);
        }
    }

    _getCurrentCharacterId(player) {
        switch(player) {
            case 1: return this.scene.characters.currentPlayer;
            case 2: return this.scene.characters.currentEnemy;
            case 'gf': return this.scene.characters.currentGF;
            default: return null;
        }
    }

    _updateCharacterReferences(player, characterId, isHidden) {
        // Only update character references
        switch(player) {
            case 1:
                this.scene.characters.currentPlayer = characterId;
                this.scene.characters.playerVisible = !isHidden;
                break;
            case 2:
                this.scene.characters.currentEnemy = characterId;
                this.scene.characters.enemyVisible = !isHidden;
                break;
            case 'gf':
                this.scene.characters.currentGF = characterId;
                this.scene.characters.gfVisible = !isHidden;
                break;
        }

        // Let camera controller handle focus through its own update logic
        if (this.scene.cameraController) {
            this.scene.cameraController.updateCameraPosition();
        }
    }

    _updateHealthBarIcon(player, character, characterData) {
        if (!this.scene.healthBar) return;
        if (player !== 1 && player !== 2) return;

        // Si es null, mantener el icono actual
        if (character === null) return;

        const iconName = characterData.healthicon || character;
        const iconKey = `icon-${iconName}`;

        // Cargar nueva textura de icono y procesar frames
        if (!this.scene.textures.exists(iconKey)) {
            this.scene.load.image(iconKey, `${this.modPath}/images/characters/icons/${iconName}.png`);
            this.scene.load.once('complete', () => {
                const texture = this.scene.textures.get(iconKey);
                const frame = texture.get(0);
                
                // Procesar los frames del icono como lo hace HealthBar
                if (frame.width > frame.height * 1.5 && texture.frameTotal <= 1) {
                    const frameWidth = Math.floor(frame.width / 2);
                    texture.add('__BASE', 0, 0, 0, frame.width, frame.height);
                    texture.add(0, 0, 0, 0, frameWidth, frame.height);
                    texture.add(1, 0, frameWidth, 0, frameWidth, frame.height);
                }

                this._setHealthBarIcon(player, iconKey, characterData);
            });
            this.scene.load.start();
        } else {
            this._setHealthBarIcon(player, iconKey, characterData);
        }
    }

    _setHealthBarIcon(player, iconKey, characterData) {
        const icon = player === 1 ? this.scene.healthBar.p1Icon : this.scene.healthBar.p2Icon;
        if (!icon) return;

        icon.setTexture(iconKey);

        // Actualizar color de la barra si está definido
        if (characterData.healthbar_colors) {
            const [r, g, b] = characterData.healthbar_colors;
            const color = Phaser.Display.Color.GetColor(r, g, b);
            if (player === 1) {
                this.scene.healthBar.config.colors.p1 = color;
            } else {
                this.scene.healthBar.config.colors.p2 = color;
            }
            this.scene.healthBar.updateBar();
        }
    }

    cleanup() {
        this.loadedData.clear();
    }
}