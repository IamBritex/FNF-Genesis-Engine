export class SMCharacters {
    constructor(scene) {
        this.scene = scene;
        // Las posiciones base Y se mantienen fijas.
        // X ahora se calculará dinámicamente en getCharactersData.
        this.baseYPositions = [80, 100, 80]; 
    }

    getCharactersData(weekData) {
        const charactersToRender = [];

        if (!weekData || !weekData.weekCharacters || !Array.isArray(weekData.weekCharacters)) {
            return charactersToRender;
        }

        const screenWidth = this.scene.scale.width;
        // Offsets estimados para sprites estándar (ajusta si tus sprites son muy diferentes)
        const leftOffset = 140;
        const rightOffset = 450; 
        
        weekData.weekCharacters.forEach((characterName, index) => {
            if (!characterName || characterName === '') return;
            
            const characterDataKey = `${characterName}Data`;
            const characterTextureKey = characterName;

            const hasTexture = this.scene.textures.exists(characterTextureKey);
            const hasData = this.scene.cache.json.exists(characterDataKey);

            if (!hasTexture || !hasData) {
                console.warn(`SMCharacters: Faltan recursos para ${characterName}.`);
                return;
            }

            try {
                const charJSON = this.scene.cache.json.get(characterDataKey);
                const characterData = { 
                    ...charJSON, 
                    image: characterTextureKey 
                };

                // --- CÁLCULO DE POSICIONES X DINÁMICAS ---
                let posX = 0;
                
                if (index === 0) {
                    // ENEMIGO: Desde la izquierda
                    posX = leftOffset;
                } 
                else if (index === 1) {
                    // JUGADOR: Centro de la escena
                    // Centramos asumiendo un ancho promedio para que quede estético
                    posX = (screenWidth / 2) - 150; 
                } 
                else if (index === 2) {
                    // GF: Desde la derecha
                    // Ancho pantalla - Offset para que no se salga
                    posX = screenWidth - rightOffset;
                }
                else {
                    // Fallback para personajes extra
                    posX = screenWidth / 2;
                }

                // Posición Y basada en el índice o fallback
                const posY = this.baseYPositions[index] !== undefined ? this.baseYPositions[index] : 400;

                charactersToRender.push({
                    x: posX,
                    y: posY,
                    data: characterData
                });
            } catch (error) {
                console.error(`SMCharacters: Error procesando ${characterName}:`, error);
            }
        });

        return charactersToRender;
    }
}