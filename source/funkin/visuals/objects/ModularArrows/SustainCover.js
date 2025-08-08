import { TextureAtlasUtils } from '../../../../utils/TextureAtlasUtils.js';

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
        this.animationsCreated = false;
        
        // Sistema de prevención de duplicados
        this.activeCoversByDirection = new Map(); // Tracks active covers per direction
        this.lastCoverTime = new Map(); // Tracks last cover time per direction
        this.coverCooldown = 100; // Minimum time between covers (ms)
        
        // Verificar si las texturas están disponibles
        this.texturesAvailable = this.colors.some(color => 
            this.scene.textures.exists(`holdCover${color}`)
        );
        
        if (!this.texturesAvailable) {
            console.warn('[SustainCover] No holdCover textures found, covers will be disabled');
        }
    }

    /**
     * Crea las animaciones para los covers
     * @private
     */
    _ensureAnimations() {
        // Verificar si las animaciones ya se crearon para evitar recrearlas
        if (this.animationsCreated) return;
        
        try {
            this.colors.forEach((color) => {
                const textureKey = `holdCover${color}`;
                
                // Verificar si la textura existe
                if (!this.scene.textures.exists(textureKey)) {
                    console.warn(`[SustainCover] Texture not found: ${textureKey}`);
                    return;
                }

                const texture = this.scene.textures.get(textureKey);
                const allCoverFrames = texture.getFrameNames();
                
                if (!allCoverFrames || allCoverFrames.length === 0) {
                    console.warn(`[SustainCover] No frames found for texture: ${textureKey}`);
                    return;
                }

                // Intentar obtener XML, si no existe, usar frames básicos
                const xmlData = this.scene.cache.xml.get(textureKey);
                
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

                // Crear animaciones simples si no hay XML
                const createSimpleAnim = (frames, type) => {
                    if (frames.length === 0) return;
                    
                    const key = `holdCover${type}-${color.toLowerCase()}`;
                    if (!this.scene.anims.exists(key)) {
                        this.scene.anims.create({
                            key,
                            frames: this.scene.anims.generateFrameNames(textureKey, {
                                frames: frames
                            }),
                            frameRate: 24,
                            repeat: 0,
                            hideOnComplete: true
                        });
                        console.log(`[SustainCover] Created simple animation: ${key}`);
                    }
                };

                // Crear animaciones complejas con XML si está disponible
                const createComplexAnim = (frames, type) => {
                    if (frames.length === 0 || !xmlData) return;
                    
                    const key = `holdCover${type}-${color.toLowerCase()}`;
                    if (!this.scene.anims.exists(key)) {
                        const processedFrames = frames.map(frameName => {
                            const subTextures = xmlData.getElementsByTagName('SubTexture');
                            for (let i = 0; i < subTextures.length; i++) {
                                const subTexture = subTextures[i];
                                if (subTexture.getAttribute('name') === frameName) {
                                    return {
                                        key: textureKey,
                                        frame: frameName
                                    };
                                }
                            }
                            return null;
                        }).filter(f => f !== null);

                        if (processedFrames.length > 0) {
                            // Usar la utilidad para crear animaciones que respeten la rotación
                            TextureAtlasUtils.createRotationAwareAnimation(
                                this.scene,
                                key,
                                textureKey,
                                processedFrames.map(f => f.frame),
                                24,
                                false
                            );
                            console.log(`[SustainCover] Created rotation-aware animation: ${key}`);
                        }
                    }
                };

                // Crear animaciones dependiendo de si hay XML o no
                if (xmlData) {
                    if (startFrames.length > 0) createComplexAnim(startFrames, 'Start');
                    if (coverFrames.length > 0) createComplexAnim(coverFrames, '');
                    if (endFrames.length > 0) createComplexAnim(endFrames, 'End');
                } else {
                    // Fallback a animaciones simples
                    if (startFrames.length > 0) createSimpleAnim(startFrames, 'Start');
                    if (coverFrames.length > 0) createSimpleAnim(coverFrames, '');
                    if (endFrames.length > 0) createSimpleAnim(endFrames, 'End');
                }
            });
            
            this.animationsCreated = true;
            console.log('[SustainCover] Animations setup completed');
            
        } catch (error) {
            console.error("[SustainCover] Error setting up animations:", error);
            this.animationsCreated = false;
        }
    }

    /**
     * Muestra una animación de cover
     * @param {number} direction - Dirección de la nota (0-3)
     * @param {string} type - Tipo de cover ('start', 'cover', 'end')
     */
    showCover(direction, type = 'cover') {
        // Si no hay texturas disponibles, salir silenciosamente
        if (!this.texturesAvailable) {
            return;
        }

        // Prevenir covers duplicados
        const currentTime = this.scene.time.now;
        const lastTime = this.lastCoverTime.get(direction) || 0;
        
        if (currentTime - lastTime < this.coverCooldown) {
            console.log(`[SustainCover] Cover cooldown active for direction ${direction}, skipping`);
            return;
        }

        // Limpiar cualquier cover activo previo en esta dirección
        const activeCovers = this.activeCoversByDirection.get(direction) || [];
        activeCovers.forEach(cover => {
            if (cover && cover.active) {
                console.log(`[SustainCover] Cleaning up previous active cover for direction ${direction}`);
                this._returnCoverToPool(cover, this.colors[direction]);
            }
        });
        this.activeCoversByDirection.set(direction, []);

        this.lastCoverTime.set(direction, currentTime);

        const strumlinePos = this.notesController.getStrumlinePositions(true)[direction];
        if (!strumlinePos) return;

        const color = this.colors[direction];
        const textureKey = `holdCover${color}`;
        
        // Verificar que la textura específica existe
        if (!this.scene.textures.exists(textureKey)) {
            return;
        }

        // Asegurar que las animaciones están creadas
        this._ensureAnimations();

        let cover = this._getCoverFromPool(color);
        const animKey = `holdCover${type === 'start' ? 'Start' : type === 'end' ? 'End' : ''}-${color.toLowerCase()}`;

        // Verificar si la animación existe
        if (!this.scene.anims.exists(animKey)) {
            console.warn(`[SustainCover] Animation not found: ${animKey}`);
            this._returnCoverToPool(cover, color);
            return;
        }

        // Registrar el cover como activo
        const activeCoversArray = this.activeCoversByDirection.get(direction) || [];
        activeCoversArray.push(cover);
        this.activeCoversByDirection.set(direction, activeCoversArray);

        // Configurar el sprite con posición inicial
        cover.setVisible(true);
        cover.setActive(true);
        cover.setAlpha(1);
        
        // Aplicar posición inicial antes de iniciar la animación
        const baseX = strumlinePos.x - this.offsetX;
        const baseY = strumlinePos.y - this.offsetY;
        
        // Aplicar offset adicional para covers normales (ESTOS VALORES SE USARÁN EN _applyFrameTransform)
        this.currentCoverType = type; // Guardar el tipo para usar en _applyFrameTransform
        
        // Posición inicial (será ajustada por _applyFrameTransform si hay XML)
        cover.setPosition(baseX, baseY);

        // Aplicar escala inicial basada en el tipo
        let initialScale = this.defaultScale;
        if (type === 'cover') {
            initialScale = this.defaultScale * 0.6; // Reducir escala para covers normales
        }
        cover.setScale(initialScale);

        // Reproducir la animación
        cover.play(animKey);

        // Limpiar listeners previos
        cover.removeAllListeners('animationupdate');
        cover.removeAllListeners('animationcomplete');
        cover.removeAllListeners('animationstart');

        // Configurar transformación inicial inmediatamente
        const xmlData = this.scene.cache.xml.get(textureKey);
        if (xmlData) {
            // Aplicar transformación al primer frame inmediatamente
            this._applyFrameTransform(cover, xmlData, baseX, baseY);
            
            // Manejar actualizaciones de frame
            cover.on('animationupdate', () => {
                this._applyFrameTransform(cover, xmlData, baseX, baseY);
            });

            // También aplicar en el inicio de animación
            cover.on('animationstart', () => {
                this._applyFrameTransform(cover, xmlData, baseX, baseY);
            });
        } else {
            // Sin XML, asegurar que se mantiene la escala y posición
            const targetScale = type === 'cover' ? this.defaultScale * 0.6 : this.defaultScale;
            const targetX = type === 'cover' ? baseX + 55 : baseX; // Usar los mismos valores
            const targetY = type === 'cover' ? baseY + 60 : baseY; // Usar los mismos valores
            
            cover.on('animationupdate', () => {
                if (cover.scaleX !== targetScale || cover.scaleY !== targetScale) {
                    cover.setScale(targetScale);
                }
                if (cover.x !== targetX || cover.y !== targetY) {
                    cover.setPosition(targetX, targetY);
                }
            });
        }

        cover.once('animationcomplete', () => {
            cover.removeAllListeners('animationupdate');
            this.currentCoverType = null; // Limpiar el tipo guardado
            
            // Remover de la lista de covers activos
            const activeCoversArray = this.activeCoversByDirection.get(direction) || [];
            const index = activeCoversArray.indexOf(cover);
            if (index > -1) {
                activeCoversArray.splice(index, 1);
                this.activeCoversByDirection.set(direction, activeCoversArray);
            }
            
            this._returnCoverToPool(cover, color);
        });
    }

    /**
     * Aplica la transformación correcta a un frame específico
     * @private
     */
    _applyFrameTransform(cover, xmlData, baseX, baseY) {
        const currentFrame = cover.anims?.currentFrame;
        if (!currentFrame) return;

        // Determinar la escala y offset según el tipo de frame
        let scale = this.defaultScale;
        let offsetX = baseX;
        let offsetY = baseY;
        const frameName = currentFrame.frame.name;
        
        // Modificar escala y offset solo para frames holdCover normales (no Start ni End)
        // O usar el tipo guardado si está disponible
        const isCoverType = (frameName.includes('holdCover') && 
            !frameName.includes('holdCoverStart') && 
            !frameName.includes('holdCoverEnd')) || this.currentCoverType === 'cover';
            
        if (isCoverType) {
            scale = this.defaultScale * 0.6; // Reducir escala a 60%
            // AQUÍ PUEDES CAMBIAR LOS VALORES DE OFFSET QUE SÍ SE APLICARÁN
            offsetX = baseX + 60; // Usar los mismos valores que pusiste arriba
            offsetY = baseY + 60; // Usar los mismos valores que pusiste arriba
        }

        if (xmlData) {
            // Buscar datos del frame usando la utilidad
            const frameData = TextureAtlasUtils.getFrameData(xmlData, currentFrame.frame.name);
            
            if (frameData) {
                // Aplicar transformación usando la utilidad con la escala y offset apropiados
                TextureAtlasUtils.applySpriteTransform(
                    cover,
                    frameData,
                    offsetX,
                    offsetY,
                    scale
                );
                
                console.log(`[SustainCover] Applied transform to frame: ${frameName}, scale: ${scale}, offset: (${offsetX}, ${offsetY}), rotated: ${frameData.isRotated}`);
            } else {
                // Fallback si no se encuentra el frame en XML
                cover.setPosition(offsetX, offsetY);
                cover.setScale(scale);
                console.log(`[SustainCover] Applied fallback transform to frame: ${frameName}, scale: ${scale}, offset: (${offsetX}, ${offsetY})`);
            }
        } else {
            // Sin XML, aplicar transformación directa
            cover.setPosition(offsetX, offsetY);
            cover.setScale(scale);
            console.log(`[SustainCover] Applied direct transform to frame: ${frameName}, scale: ${scale}, offset: (${offsetX}, ${offsetY}) (no XML)`);
        }
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
            const textureKey = `holdCover${color}`;
            
            // Verificar que la textura existe antes de crear el sprite
            if (!this.scene.textures.exists(textureKey)) {
                console.warn(`[SustainCover] Cannot create sprite, texture not found: ${textureKey}`);
                // Crear un sprite vacío como fallback
                cover = this.scene.add.sprite(0, 0);
                cover.setVisible(false);
            } else {
                cover = this.scene.add.sprite(0, 0, textureKey);
            }
            
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

        // Limpiar todos los listeners
        cover.removeAllListeners('animationcomplete');
        cover.removeAllListeners('animationupdate');
        cover.removeAllListeners('animationstart');
        
        // Detener animación completamente
        if (cover.anims) {
            cover.stop();
            cover.anims.currentFrame = null;
        }
        
        // Reset completo del sprite a estado inicial
        cover.setVisible(false);
        cover.setActive(false);
        cover.setAlpha(0);
        cover.setScale(1);
        cover.setRotation(0);
        cover.setOrigin(0, 0);
        cover.setPosition(0, 0);
        cover.setDisplaySize(cover.width, cover.height); // Resetear tamaño a original
        
        console.log(`[SustainCover] Sprite returned to pool and reset`);
    }

    /**
     * Limpia todos los recursos
     */
    cleanup() {
        // Limpiar covers activos
        this.activeCoversByDirection.forEach((covers, direction) => {
            covers.forEach(cover => {
                if (cover && cover.active) {
                    cover.destroy();
                }
            });
        });
        this.activeCoversByDirection.clear();
        this.lastCoverTime.clear();
        
        // Limpiar pool
        this.coverPool.forEach(pool => {
            pool.forEach(cover => {
                cover.destroy();
            });
        });
        this.coverPool.clear();
    }
}

/* 
 Bien, tengo que decir esto de una vez por todas, no me siento bien, no estoy bien y simplemente
 no quiero dejar ni rastro de quien soy en este mundo, soy un idiota, un bastardo, tal y como dijo Moxie,
 no soy nadie, y tiene toda la razon, y esto no lo escribo solo por eso, por el tema de unirme a codename,
 eso es lo de menos, mi chica me ah dejado, y no se que hacer, no quiero seguir aqui, quiero segruir siendo yo,
 quiero ser... no lo se, simplemente estoy tramando algo. Siendo honesto, no creo que ni las terapias, ni
 los medicamentos controlados que me han recetado me esten funcionando, el medicamento para dormir me ayudo un poco
 anoche, pero fuerda de eso no me hace efecto como es el esperado, ese medicamento, solo quiero intentar matarme una vez mas
 antes lo habia intentado, pero no funciono, esta vez lo intentare de nuevo, se que funcionara y tengo la certeza de que si,
 antes lo habia intentado un martes en el dia, mi madre me vio y me salvo, pero ahora lo hare en la noche
 donde todos esten dormidos, donde no tenga oportunidad de salvarme, no quiero seguir aqui y eso lo eh pensado desde hace tiempo
 simplemente crei que era divertido el serle infiel a mi novia, y sabia que esto pasaria, pero digo, la vida es una, y yo
 por mi parte, llevo bastantes dias intentado quitar y  acabar con mi vida, me le acercare a kari algun dia
 si es que me lo permite, la abrazare y le dire que la extrañe aun que ya no seamos nada, estare una semana como si nada
 seguire reprimiento esto que siento, lo seguire reprimiendo, no quiero que nadie note que estoy mal, y si me rechaza
 el abrazo o algo asi, entonces seguire normal, no me alterare, o eso quiero aparentar, despues de eso seguire una semana
 una semana "normal", y despues de esa semana, a la siguiente, me intentare matar, el martes en la noche, el miercoles espero poder estar muerto
 espero poder estar sin vida, tengo demasiados problemas economicos y simplemente, ahhh... odio esto, se que quiero un futuro
 y se que si me lo propongo lo puedo conseguir, pero, simplemente... no se, ya no quiero seguir vivo 
*/