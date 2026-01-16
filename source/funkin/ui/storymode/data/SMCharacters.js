export class SMCharacters {
    constructor(scene) {
        this.scene = scene;
        // Posiciones estándar (x, y). Asegúrate que 'y: 260' esté dentro de la pantalla visible.
        // La pantalla suele ser 1280x720. El fondo está centrado.
        this.positions = [ 
            { x: 140, y: 80 }, // Posición izquierda (Dad) - Ajustada para ser visible
            { x: 480, y: 100 }, // Posición centro (BF)
            { x: 890, y: 80 }  // Posición derecha (GF)
        ];
    }

    getCharactersData(weekData) {
        const charactersToRender = [];

        if (!weekData || !weekData.weekCharacters || !Array.isArray(weekData.weekCharacters)) {
            return charactersToRender;
        }

        weekData.weekCharacters.forEach((characterName, index) => {
            if (!characterName || characterName === '') return;
            
            const characterDataKey = `${characterName}Data`;
            const characterTextureKey = characterName;

            // Verificaciones de seguridad
            const hasTexture = this.scene.textures.exists(characterTextureKey);
            const hasData = this.scene.cache.json.exists(characterDataKey);

            if (!hasTexture || !hasData) {
                console.warn(`SMCharacters: Faltan recursos para ${characterName}. Texture: ${hasTexture}, JSON: ${hasData}`);
                return;
            }

            try {
                const charJSON = this.scene.cache.json.get(characterDataKey);
                const characterData = { 
                    ...charJSON, 
                    image: characterTextureKey 
                };

                // Usar posiciones por defecto si el índice excede el array
                const pos = this.positions[index] || { x: 640, y: 400 };

                charactersToRender.push({
                    x: pos.x,
                    y: pos.y,
                    data: characterData
                });
            } catch (error) {
                console.error(`SMCharacters: Error procesando ${characterName}:`, error);
            }
        });

        return charactersToRender;
    }
}