/**
 * Utilidades para manejar atlas de texturas con rotación
 * Especialmente útil para atlas creados con TexturePacker o herramientas similares
 */
export class TextureAtlasUtils {
    /**
     * Parsea los datos de un frame desde XML y calcula las dimensiones correctas
     * @param {Element} subTexture - Elemento XML SubTexture
     * @returns {Object} Datos del frame procesados
     */
    static parseFrameData(subTexture) {
        const isRotated = subTexture.getAttribute('rotated') === 'true';
        const width = parseInt(subTexture.getAttribute('width') || '0');
        const height = parseInt(subTexture.getAttribute('height') || '0');
        const x = parseInt(subTexture.getAttribute('x') || '0');
        const y = parseInt(subTexture.getAttribute('y') || '0');
        const frameX = parseInt(subTexture.getAttribute('frameX') || '0');
        const frameY = parseInt(subTexture.getAttribute('frameY') || '0');
        const frameWidth = parseInt(subTexture.getAttribute('frameWidth') || width);
        const frameHeight = parseInt(subTexture.getAttribute('frameHeight') || height);

        return {
            name: subTexture.getAttribute('name'),
            isRotated,
            // Dimensiones en el atlas (como están almacenadas)
            atlasWidth: width,
            atlasHeight: height,
            // Dimensiones reales después de aplicar rotación
            realWidth: isRotated ? height : width,
            realHeight: isRotated ? width : height,
            // Posición en el atlas
            x,
            y,
            // Offsets para posicionamiento en el frame original
            frameX,
            frameY,
            frameWidth,
            frameHeight
        };
    }

    /**
     * Aplica rotación y posicionamiento correcto a un sprite según los datos del frame
     * @param {Phaser.GameObjects.Sprite} sprite - Sprite de Phaser
     * @param {Object} frameData - Datos del frame obtenidos de parseFrameData
     * @param {number} baseX - Posición X base
     * @param {number} baseY - Posición Y base
     * @param {number} scale - Escala a aplicar
     */
    static applySpriteTransform(sprite, frameData, baseX, baseY, scale = 1) {
        // Resetear transformaciones previas para evitar acumulación
        sprite.setOrigin(0, 0);
        sprite.setRotation(0);
        sprite.setScale(1);
        
        if (frameData.isRotated) {
            // La imagen en el atlas está rotada 90° CCW, rotamos 90° CW para restaurar
            sprite.setOrigin(0.5, 0.5);
            sprite.setRotation(Math.PI / 2); // 90° clockwise
            
            // Las dimensiones se intercambian al rotar
            sprite.setDisplaySize(
                frameData.realWidth * scale,
                frameData.realHeight * scale
            );

            // Posicionar considerando la rotación y origen centrado
            sprite.setPosition(
                baseX + frameData.frameX + (frameData.realWidth * scale) / 2,
                baseY + frameData.frameY + (frameData.realHeight * scale) / 2
            );
        } else {
            // No rotada, usar configuración normal
            sprite.setOrigin(0, 0);
            sprite.setRotation(0);
            sprite.setDisplaySize(
                frameData.realWidth * scale,
                frameData.realHeight * scale
            );

            // Posicionar normalmente con offsets del frame
            sprite.setPosition(
                baseX + frameData.frameX,
                baseY + frameData.frameY
            );
        }
    }

    /**
     * Extrae todos los frames de un atlas XML
     * @param {XMLDocument} xmlData - Documento XML del atlas
     * @returns {Map} Mapa de nombre de frame -> datos del frame
     */
    static extractAllFrames(xmlData) {
        const frames = new Map();
        const subTextures = xmlData.getElementsByTagName('SubTexture');
        
        for (let i = 0; i < subTextures.length; i++) {
            const subTexture = subTextures[i];
            const frameData = this.parseFrameData(subTexture);
            frames.set(frameData.name, frameData);
        }
        
        return frames;
    }

    /**
     * Crea animaciones de Phaser respetando la rotación de frames
     * @param {Phaser.Scene} scene - Escena de Phaser
     * @param {string} animKey - Clave de la animación
     * @param {string} textureKey - Clave de la textura
     * @param {Array<string>} frameNames - Nombres de los frames para la animación
     * @param {number} frameRate - Velocidad de la animación
     * @param {boolean} repeat - Si la animación debe repetirse
     * @returns {boolean} True si la animación se creó exitosamente
     */
    static createRotationAwareAnimation(scene, animKey, textureKey, frameNames, frameRate = 24, repeat = false) {
        if (scene.anims.exists(animKey)) {
            return true;
        }

        try {
            const frames = frameNames.map(frameName => ({
                key: textureKey,
                frame: frameName
            }));

            scene.anims.create({
                key: animKey,
                frames: frames,
                frameRate: frameRate,
                repeat: repeat ? -1 : 0,
                hideOnComplete: !repeat
            });

            return true;
        } catch (error) {
            console.error(`[TextureAtlasUtils] Error creating animation ${animKey}:`, error);
            return false;
        }
    }

    /**
     * Obtiene los datos de frame específico desde un XML atlas
     * @param {XMLDocument} xmlData - Documento XML del atlas
     * @param {string} frameName - Nombre del frame a buscar
     * @returns {Object|null} Datos del frame o null si no se encuentra
     */
    static getFrameData(xmlData, frameName) {
        const subTextures = xmlData.getElementsByTagName('SubTexture');
        
        for (let i = 0; i < subTextures.length; i++) {
            const subTexture = subTextures[i];
            if (subTexture.getAttribute('name') === frameName) {
                return this.parseFrameData(subTexture);
            }
        }
        
        return null;
    }

    /**
     * Verifica si un atlas contiene frames rotados
     * @param {XMLDocument} xmlData - Documento XML del atlas
     * @returns {boolean} True si contiene al menos un frame rotado
     */
    static hasRotatedFrames(xmlData) {
        const subTextures = xmlData.getElementsByTagName('SubTexture');
        
        for (let i = 0; i < subTextures.length; i++) {
            if (subTextures[i].getAttribute('rotated') === 'true') {
                return true;
            }
        }
        
        return false;
    }
}
