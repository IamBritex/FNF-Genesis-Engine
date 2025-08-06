export class SustainCover {
    /**
     * @param {Phaser.Scene} scene - Escena de Phaser
     * @param {NotesController} notesController - Controlador de notas
     * @param {number} [offsetX=62] - Desplazamiento horizontal (píxeles)
     * @param {number} [offsetY=72] - Desplazamiento vertical (píxeles)
     */
    constructor(scene, notesController, offsetX = 62, offsetY = 72) {
        this.scene = scene;
        this.notesController = notesController;
        this.offsetX = offsetX;
        this.offsetY = offsetY;
        this.coverPool = new Map();
        this.colors = ['Purple', 'Blue', 'Green', 'Red'];
        this.defaultScale = 1;
    }

    /**
     * Crea las animaciones para los covers
     * @private
     */
    _ensureAnimations() {
        try {
            this.colors.forEach((color) => {
                const texture = this.scene.textures.get(`holdCover${color}`);
                if (!texture) return;

                const allCoverFrames = texture.getFrameNames();
                const xmlData = this.scene.cache.xml.get(`holdCover${color}`);
                
                if (!xmlData) {
                    console.warn(`[SustainCover] XML not found for holdCover${color}`);
                    return;
                }

                // Obtener frames por tipo
                const startFrames = allCoverFrames.filter(frame => 
                    frame.startsWith(`holdCoverStart${color}`)
                );
                
                const coverFrames = allCoverFrames.filter(frame => 
                    frame.startsWith(`holdCover${color}`) && 
                    !frame.startsWith(`holdCoverStart${color}`) && 
                    !frame.startsWith(`holdCoverEnd${color}`)
                );
                
                const endFrames = allCoverFrames.filter(frame => 
                    frame.startsWith(`holdCoverEnd${color}`)
                );

                // Función para procesar frames
                const processFrames = (frames, type) => {
                    return frames.map(frameName => {
                        const subTextures = xmlData.getElementsByTagName('SubTexture');
                        let frameData = null;

                        for (let i = 0; i < subTextures.length; i++) {
                            const subTexture = subTextures[i];
                            if (subTexture.getAttribute('name') === frameName) {
                                const isRotated = subTexture.getAttribute('rotated') === 'true';
                                const width = parseInt(subTexture.getAttribute('width'));
                                const height = parseInt(subTexture.getAttribute('height'));
                                const frameX = parseInt(subTexture.getAttribute('frameX') || '0');
                                const frameY = parseInt(subTexture.getAttribute('frameY') || '0');

                                frameData = {
                                    key: `holdCover${color}`,
                                    frame: frameName,
                                    isRotated,
                                    realWidth: isRotated ? height : width,
                                    realHeight: isRotated ? width : height,
                                    frameX,
                                    frameY
                                };
                                break;
                            }
                        }
                        return frameData;
                    }).filter(f => f !== null);
                };

                // Crear animaciones
                const createAnim = (frames, type) => {
                    const key = `holdCover${type}-${color.toLowerCase()}`;
                    if (!this.scene.anims.exists(key)) {
                        this.scene.anims.create({
                            key,
                            frames: processFrames(frames, type),
                            frameRate: 24,
                            repeat: 0,
                            hideOnComplete: true
                        });
                    }
                };

                if (startFrames.length > 0) createAnim(startFrames, 'Start');
                if (coverFrames.length > 0) createAnim(coverFrames, '');
                if (endFrames.length > 0) createAnim(endFrames, 'End');
            });
        } catch (error) {
            console.error("[SustainCover] Error setting up animations:", error);
        }
    }

    /**
     * Muestra una animación de cover
     * @param {number} direction - Dirección de la nota (0-3)
     * @param {string} type - Tipo de cover ('start', 'cover', 'end')
     */
    showCover(direction, type = 'cover') {
        const strumlinePos = this.notesController.getStrumlinePositions(true)[direction];
        if (!strumlinePos) return;

        const color = this.colors[direction];
        let cover = this._getCoverFromPool(color);
        const animKey = `holdCover${type === 'start' ? 'Start' : type === 'end' ? 'End' : ''}-${color.toLowerCase()}`;

        if (!this.scene.anims.exists(animKey)) {
            this._ensureAnimations();
        }

        if (this.scene.anims.exists(animKey)) {
            // Configurar el sprite
            cover.setVisible(true);
            cover.setActive(true);
            cover.setAlpha(1);
            
            // Reproducir la animación
            cover.play(animKey);
            
            // Manejar la actualización de cada frame
            cover.on('animationupdate', () => {
                const frameData = cover.anims.currentFrame;
                if (!frameData) return;

                // Aplicar rotación y dimensiones
                if (frameData.isRotated) {
                    cover.setOrigin(0.5);
                    cover.setRotation(-Math.PI/2);
                    cover.setDisplaySize(
                        frameData.realWidth * this.defaultScale,
                        frameData.realHeight * this.defaultScale
                    );
                    
                    // Posicionar considerando la rotación y origen centrado
                    cover.setPosition(
                        strumlinePos.x - this.offsetX + (frameData.realWidth * this.defaultScale)/2 + frameData.frameX,
                        strumlinePos.y - this.offsetY + (frameData.realHeight * this.defaultScale)/2 + frameData.frameY
                    );
                } else {
                    cover.setOrigin(0);
                    cover.setRotation(0);
                    cover.setDisplaySize(
                        frameData.realWidth * this.defaultScale,
                        frameData.realHeight * this.defaultScale
                    );
                    
                    // Posicionar normalmente
                    cover.setPosition(
                        strumlinePos.x - this.offsetX + frameData.frameX,
                        strumlinePos.y - this.offsetY + frameData.frameY
                    );
                }
            });
        }

        cover.once('animationcomplete', () => {
            cover.off('animationupdate');
            this._returnCoverToPool(cover, color);
        });
    }

    /**
     * Obtiene un sprite del pool o crea uno nuevo
     * @private
     */
    _getCoverFromPool(color) {
        if (!this.coverPool.has(color)) {
            this.coverPool.set(color, []);
        }

        const pool = this.coverPool.get(color);
        let cover = pool.find(s => !s.visible);

        if (!cover) {
            cover = this.scene.add.sprite(0, 0, `holdCover${color}`);
            cover.setDepth(1000);
            cover.setVisible(false);
            pool.push(cover);
        }

        return cover;
    }

    /**
     * Devuelve un sprite al pool
     * @private
     */
    _returnCoverToPool(cover, color) {
        if (!this.coverPool.has(color)) return;
        
        cover.removeAllListeners('animationcomplete');
        cover.stop();
        cover.setVisible(false);
        cover.setActive(false);
        cover.setAlpha(0);
        cover.setScale(1);
    }

    /**
     * Limpia todos los recursos
     */
    cleanup() {
        this.coverPool.forEach(pool => {
            pool.forEach(cover => {
                cover.destroy();
            });
        });
        this.coverPool.clear();
    }
}