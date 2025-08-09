export class StrumlinesNotes {
    constructor(scene, notesController) {
        this.scene = scene;
        this.notesController = notesController;
        this.playerStrumline = [];
        this.enemyStrumline = [];
        // Valores por defecto para escala - todos mantienen la misma escala para evitar cambios
        this.defaultScale = {
            static: 0.68,
            confirm: 0.68, // Cambiar a la misma escala para evitar cambios de tamaño
            press: 0.68
        };
        
        // Configurar listener para cambios de estado de strumline
        this.setupStrumlineStateListener();
        
        // Las animaciones se crearán cuando se creen las strumlines
        this.animationsCreated = false;
    }

    /**
     * Crea las animaciones para las strumlines
     */
    createStrumlineAnimations() {
        // Verificar que la textura existe antes de crear animaciones
        if (!this.scene.textures.exists('noteStrumline')) {
            console.warn('[StrumlinesNotes] noteStrumline texture not found, skipping animation creation');
            return;
        }

        const directions = ['Down', 'Left', 'Right', 'Up'];
        
        directions.forEach(direction => {
            // Verificar que existan los frames para confirm
            const confirmFrames = [];
            for (let i = 1; i <= 4; i++) {
                const frameName = `confirm${direction}${i.toString().padStart(4, '0')}`;
                if (this.scene.textures.get('noteStrumline').has(frameName)) {
                    confirmFrames.push(frameName);
                }
            }
            
            // Solo crear animación de confirm si hay frames
            const confirmKey = `confirm${direction}`;
            if (confirmFrames.length > 0 && !this.scene.anims.exists(confirmKey)) {
                try {
                    this.scene.anims.create({
                        key: confirmKey,
                        frames: this.scene.anims.generateFrameNames('noteStrumline', {
                            frames: confirmFrames
                        }),
                        frameRate: 24,
                        repeat: -1 // Repetir indefinidamente mientras esté activa
                    });
                } catch (error) {
                    console.warn(`[StrumlinesNotes] Failed to create confirm animation for ${direction}:`, error);
                }
            }
            
            // Verificar que existan los frames para press
            const pressFrames = [];
            for (let i = 1; i <= 4; i++) {
                const frameName = `press${direction}${i.toString().padStart(4, '0')}`;
                if (this.scene.textures.get('noteStrumline').has(frameName)) {
                    pressFrames.push(frameName);
                }
            }
            
            // Solo crear animación de press si hay frames
            const pressKey = `press${direction}`;
            if (pressFrames.length > 0 && !this.scene.anims.exists(pressKey)) {
                try {
                    this.scene.anims.create({
                        key: pressKey,
                        frames: this.scene.anims.generateFrameNames('noteStrumline', {
                            frames: pressFrames
                        }),
                        frameRate: 24,
                        repeat: 0, // Solo reproducir una vez, no en loop
                        hideOnComplete: false // Mantener visible el último frame
                    });
                } catch (error) {
                    console.warn(`[StrumlinesNotes] Failed to create press animation for ${direction}:`, error);
                }
            }
        });
        
    }

    /**
     * Configura el listener para cambios de estado de strumline
     */
    setupStrumlineStateListener() {
        this.notesController.events.on('strumlineStateChange', (data) => {
            const { direction, isPlayerNote, state } = data;
            const strumline = isPlayerNote ? this.playerStrumline : this.enemyStrumline;
            
            // Solo proceder si la strumline existe
            if (!strumline || !strumline[direction]) return;
            
            // Mapear el estado a texture key
            const directionName = this.notesController.directions[direction];
            const capitalizedDirection = directionName.charAt(0).toUpperCase() + directionName.slice(1);
            let textureKey = null;
            
            switch (state) {
                case 'confirm':
                    textureKey = `confirm${capitalizedDirection}0001`;
                    break;
                case 'press':
                    textureKey = `press${capitalizedDirection}0001`;
                    break;
                case 'static':
                default:
                    textureKey = `static${capitalizedDirection}0001`;
                    break;
            }
            
            // Actualizar el estado de la strumline
            this.updateStrumlineState(strumline, direction, state, textureKey);
        });
    }



    async createPlayerStrumline() {
        // Crear animaciones si aún no se han creado
        if (!this.animationsCreated) {
            this.createStrumlineAnimations();
            this.animationsCreated = true;
        }

        this.playerStrumline = [];
        const scale = this.defaultScale;
        for (let i = 0; i < 4; i++) {
            const pos = this.notesController.getStrumlinePositions(true)[i];
            const direction = this.notesController.directions[i];
            const frameName = `static${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`;
            const arrow = this.scene.add.sprite(pos.x, pos.y, 'noteStrumline', frameName);
            arrow.setOrigin(0, 0);
            arrow.setVisible(true);
            arrow.setAlpha(1);
            arrow.setDepth(100);
            arrow.setScale(scale.static);
            arrow.direction = direction;
            arrow.directionIndex = i;
            // Almacenar posiciones originales basadas en la posición del frame estático
            arrow.originalX = pos.x;
            arrow.originalY = pos.y;
            arrow.setName(`PlayerStrum_${direction}`);
            if (typeof arrow.setScrollFactor === 'function') arrow.setScrollFactor(0);
            this.scene.children.bringToTop(arrow);

            this.playerStrumline[i] = arrow;
        }
        return this.playerStrumline;
    }

    createEnemyStrumline() {
        // Crear animaciones si aún no se han creado
        if (!this.animationsCreated) {
            this.createStrumlineAnimations();
            this.animationsCreated = true;
        }

        this.enemyStrumline = [];
        const scale = this.defaultScale;
        // Asegúrate de que enemyStrumlineVisuals esté actualizado ANTES de crear las flechas
        this.notesController.getStrumlinePositions(false);

        const enemyVisuals = this.notesController.enemyStrumlineVisuals;
        for (let i = 0; i < 4; i++) {
            const pos = this.notesController.getStrumlinePositions(false)[i];
            const direction = this.notesController.directions[i];
            const frameName = `static${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`;
            const arrow = this.scene.add.sprite(pos.x, pos.y, 'noteStrumline', frameName);
            arrow.setOrigin(0, 0);
            arrow.setVisible(true);
            arrow.setDepth(100);
            // Aplica escala y alpha especial desde el inicio
            if (enemyVisuals) {
                arrow.setScale(scale.static);
                arrow.setAlpha(enemyVisuals.alpha);
            } else {
                arrow.setScale(scale.static);
                arrow.setAlpha(1);
            }
            arrow.direction = direction;
            arrow.directionIndex = i;
            // Almacenar posiciones originales basadas en la posición del frame estático
            arrow.originalX = pos.x;
            arrow.originalY = pos.y;
            arrow.setName(`EnemyStrum_${direction}`);
            if (typeof arrow.setScrollFactor === 'function') arrow.setScrollFactor(0);
            this.scene.children.bringToTop(arrow);
            this.enemyStrumline[i] = arrow;
        }
        return this.enemyStrumline;
    }

    updateStrumlineState(strumline, directionIndex, state, textureKey, scaleOverride) {
        const arrow = strumline[directionIndex];
        if (!arrow) return;
        
        // Mapear estado a animación
        const directionName = this.notesController.directions[directionIndex];
        const capitalizedDirection = directionName.charAt(0).toUpperCase() + directionName.slice(1);
        
        if (state === 'confirm') {
            // Reproducir animación de confirm en lugar de frame estático
            const animKey = `confirm${capitalizedDirection}`;
            if (this.scene.anims.exists(animKey)) {
                try {
                    arrow.play(animKey);
                } catch (error) {
                    console.warn(`[StrumlinesNotes] Error playing confirm animation ${animKey}:`, error);
                    // Fallback a textura estática
                    arrow.setTexture('noteStrumline', `confirm${capitalizedDirection}0001`);
                }
            } else {
                // Fallback a textura estática si no existe la animación
                arrow.setTexture('noteStrumline', `confirm${capitalizedDirection}0001`);
            }
        } else if (state === 'press') {
            // Reproducir animación de press (solo una vez)
            const animKey = `press${capitalizedDirection}`;
            if (this.scene.anims.exists(animKey)) {
                try {
                    arrow.play(animKey);
                    // Cuando termine la animación, mantener el último frame hasta que se suelte la tecla
                    arrow.once('animationcomplete', () => {
                        // Establecer el último frame de la animación de press
                        arrow.setTexture('noteStrumline', `press${capitalizedDirection}0004`);
                    });
                } catch (error) {
                    console.warn(`[StrumlinesNotes] Error playing press animation ${animKey}:`, error);
                    // Fallback a textura estática del último frame
                    arrow.setTexture('noteStrumline', `press${capitalizedDirection}0004`);
                }
            } else {
                // Fallback a textura estática si no existe la animación
                arrow.setTexture('noteStrumline', `press${capitalizedDirection}0001`);
            }
        } else {
            // Estado static - usar frame estático
            try {
                if (arrow.anims && arrow.anims.isPlaying) {
                    arrow.stop(); // Detener cualquier animación
                }
            } catch (error) {
                console.warn(`[StrumlinesNotes] Error stopping animation:`, error);
            }
            arrow.setTexture('noteStrumline', `static${capitalizedDirection}0001`);
        }
        
        // Aplicar los offsets definidos en NotesController en lugar de XML
        this.applyNotesControllerOffsets(arrow, state, directionIndex);
        
        // Mantener escala consistente - NO cambiar la escala durante hold notes
        const currentScale = this.defaultScale.static; // Usar siempre la misma escala
        arrow.setScale(currentScale);
        
        // Mantener alpha si es enemigo y hay visuales especiales
        const isEnemy = strumline === this.enemyStrumline;
        const enemyVisuals = this.notesController.enemyStrumlineVisuals;
        
        if (isEnemy && enemyVisuals) {
            arrow.setAlpha(enemyVisuals.alpha);
        } else {
            arrow.setAlpha(1);
        }
    }

    /**
     * Aplica los offsets definidos en NotesController para mantener la posición correcta
     * @param {Phaser.GameObjects.Sprite} arrow - El sprite de la strumline
     * @param {string} state - El estado actual (static, press, confirm)
     * @param {number} directionIndex - El índice de dirección (0-3)
     */
    applyNotesControllerOffsets(arrow, state, directionIndex) {
        // Obtener los offsets definidos en NotesController
        const offsets = this.notesController.offsets;
        let offsetX = 0;
        let offsetY = 0;
        
        // Aplicar offset según el estado
        switch (state) {
            case 'press':
                offsetX = offsets.press.x || 0;
                offsetY = offsets.press.y || 0;
                break;
            case 'confirm':
                offsetX = offsets.confirm.x || 0;
                offsetY = offsets.confirm.y || 0;
                break;
            case 'static':
            default:
                offsetX = offsets.static.x || 0;
                offsetY = offsets.static.y || 0;
                break;
        }
        
        // Aplicar la posición con offset
        arrow.x = arrow.originalX + offsetX;
        arrow.y = arrow.originalY + offsetY;
        
    }

    /**
     * Aplica los offsets del XML para mantener la posición visual consistente
     * @param {Phaser.GameObjects.Sprite} arrow - El sprite de la strumline
     * @param {string} state - El estado actual (static, press, confirm)
     * @param {string} capitalizedDirection - La dirección capitalizada (Down, Left, Right, Up)
     */
    applyXMLOffsets(arrow, state, capitalizedDirection) {
        // Obtener el XML data para calcular offsets
        const xmlData = this.scene.cache.xml.get('noteStrumline');
        if (!xmlData) return;

        // Determinar el frame name basado en el estado
        let frameName;
        switch (state) {
            case 'press':
                frameName = `press${capitalizedDirection}0001`;
                break;
            case 'confirm':
                frameName = `confirm${capitalizedDirection}0001`;
                break;
            case 'static':
            default:
                frameName = `static${capitalizedDirection}0001`;
                break;
        }

        // Buscar el frame específico en el XML
        const subTextures = xmlData.getElementsByTagName('SubTexture');
        let frameData = null;
        
        for (let i = 0; i < subTextures.length; i++) {
            if (subTextures[i].getAttribute('name') === frameName) {
                frameData = subTextures[i];
                break;
            }
        }

        if (frameData) {
            // Obtener los offsets del XML
            const frameX = parseInt(frameData.getAttribute('frameX') || '0');
            const frameY = parseInt(frameData.getAttribute('frameY') || '0');
            
            // Obtener los offsets del frame estático para comparación
            const staticFrameName = `static${capitalizedDirection}0001`;
            let staticFrameData = null;
            
            for (let i = 0; i < subTextures.length; i++) {
                if (subTextures[i].getAttribute('name') === staticFrameName) {
                    staticFrameData = subTextures[i];
                    break;
                }
            }
            
            if (staticFrameData) {
                const staticFrameX = parseInt(staticFrameData.getAttribute('frameX') || '0');
                const staticFrameY = parseInt(staticFrameData.getAttribute('frameY') || '0');
                
                // Calcular la diferencia de offset entre el frame actual y el estático
                const offsetDiffX = frameX - staticFrameX;
                const offsetDiffY = frameY - staticFrameY;
                
                // Aplicar el offset corrigiendo la posición para mantener consistencia visual
                // Multiplicar por la escala para ajustar apropiadamente
                const scale = arrow.scaleX;
                arrow.x = arrow.originalX - (offsetDiffX * scale);
                arrow.y = arrow.originalY - (offsetDiffY * scale);
                
                console.log(`[StrumlinesNotes] Applied XML offset for ${frameName}: offsetX=${offsetDiffX}, offsetY=${offsetDiffY}`);
            }
        }
    }

    destroyStrumlines() {
        // Limpiar listeners
        this.notesController.events.off('strumlineStateChange');
        
        // Destruir sprites
        this.playerStrumline.forEach(arrow => arrow?.destroy());
        this.enemyStrumline.forEach(arrow => arrow?.destroy());
        this.playerStrumline = [];
        this.enemyStrumline = [];
    }

    setUICameraVisible(visible) {
        if (this.scene.cameraController && this.scene.cameraController.uiCamera) {
            this.scene.cameraController.uiCamera.setVisible(visible);
        }
    }
}