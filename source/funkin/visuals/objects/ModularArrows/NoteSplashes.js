export class NoteSplashes {
    /**
     * @param {Phaser.Scene} scene - Escena de Phaser
     * @param {NotesController} notesController - Controlador de notas
     * @param {number} [offsetX=0] - Desplazamiento horizontal (píxeles)
     * @param {number} [offsetY=0] - Desplazamiento vertical (píxeles)
     */
    constructor(scene, notesController, offsetX = 0, offsetY = 0) {
        this.scene = scene;
        this.notesController = notesController;
        this.offsetX = offsetX; // Ajuste horizontal
        this.offsetY = offsetY; // Ajuste vertical
        this.animationsReady = false;
        this.pendingSplashes = []; // Splashes en espera

        // Esperar a que la escena esté lista
        this.scene.events.once('create', () => {
            this._ensureAnimations();
        });
    }

    /**
     * Crea las animaciones para los NoteSplashes.
     * @private
     */
    _ensureAnimations() {
        const colors = ['purple', 'blue', 'green', 'red'];
        let animationsCreated = 0;
        const totalAnimations = colors.length;

        colors.forEach(color => {
            const trimmedColor = color.trim();
            const animKey = `notesplash_${trimmedColor}`;
            
            // Si la animación ya existe, saltar
            if (this.scene.anims.exists(animKey)) {
                animationsCreated++;
                if (animationsCreated === totalAnimations) {
                    this._onAnimationsReady();
                }
                return;
            }

            // Verificar si la textura existe
            const texture = this.scene.textures.get('noteSplashes');
            if (!texture) {
                console.error('[NoteSplashes] Texture "noteSplashes" not found');
                return;
            }

            // Generar frames con el formato exacto del XML
            const frames = [];
            for (let i = 0; i <= 3; i++) {
                // NOTA: 2 espacios después del "1" (ej: "note impact 1  blue0000")
                const frameKey = `note impact 1  ${trimmedColor}${i.toString().padStart(4, '0')}`;
                
                // Verificar si el frame existe en la textura
                if (!texture.has(frameKey)) {
                    console.error(`[NoteSplashes] Frame "${frameKey}" not found in texture atlas`);
                    console.log('[NoteSplashes] Available frames:', texture.getFrameNames());
                    return;
                }
                
                frames.push({
                    key: 'noteSplashes',
                    frame: frameKey
                });
            }

            // Crear la animación con manejo de errores
            try {
                this.scene.anims.create({
                    key: animKey,
                    frames: frames,
                    frameRate: 24,
                    repeat: 0,
                    hideOnComplete: true
                });
                
                console.log(`[NoteSplashes] Animation created: ${animKey}`);
                animationsCreated++;
                
                // Si todas las animaciones están listas
                if (animationsCreated === totalAnimations) {
                    this._onAnimationsReady();
                }
            } catch (error) {
                console.error(`[NoteSplashes] Error creating animation ${animKey}:`, error);
            }
        });
    }

    /**
     * Se ejecuta cuando todas las animaciones están listas.
     * @private
     */
    _onAnimationsReady() {
        this.animationsReady = true;
        console.log('[NoteSplashes] All animations ready!');
        
        // Procesar splashes en espera
        while (this.pendingSplashes.length > 0) {
            const splash = this.pendingSplashes.shift();
            this._showSplashNow(splash.directionIndex, splash.color);
        }
    }

    /**
     * Muestra un NoteSplash en la dirección especificada.
     * @param {number} directionIndex - Índice de dirección (0-3)
     * @param {string} color - Color del splash (purple, blue, green, red)
     */
    showSplash(directionIndex, color) {
        if (!this.animationsReady) {
            console.log('[NoteSplashes] Animations not ready yet, queuing splash...');
            this.pendingSplashes.push({ directionIndex, color });
            return;
        }
        
        this._showSplashNow(directionIndex, color);
    }

    /**
     * Muestra el NoteSplash inmediatamente.
     * @param {number} directionIndex - Índice de dirección (0-3)
     * @param {string} color - Color del splash
     * @private
     */
    _showSplashNow(directionIndex, color) {
        if (directionIndex === undefined || color === undefined) {
            console.error('[NoteSplashes] Invalid arguments:', directionIndex, color);
            return;
        }

        const trimmedColor = color.trim();
        const animKey = `notesplash_${trimmedColor}`;

        // Verificar si la animación existe
        if (!this.scene.anims.exists(animKey)) {
            console.error(`[NoteSplashes] Animation "${animKey}" does not exist`);
            return;
        }

        // Obtener posición desde NotesController
        const positions = this.notesController.getStrumlinePositions(true);
        if (!positions || !positions[directionIndex]) {
            console.error('[NoteSplashes] Invalid direction index or positions not available');
            return;
        }

        const pos = positions[directionIndex];
        const firstFrameKey = `note impact 1  ${trimmedColor}0000`;

        // Verificar textura y frame
        const texture = this.scene.textures.get('noteSplashes');
        if (!texture || !texture.has(firstFrameKey)) {
            console.error(`[NoteSplashes] Texture or frame "${firstFrameKey}" not found`);
            return;
        }

        // Crear el sprite con los ajustes de posición (offsetX y offsetY)
        const splash = this.scene.add.sprite(
            pos.x + this.offsetX,  // Posición X ajustada
            pos.y + this.offsetY,  // Posición Y ajustada
            'noteSplashes',
            firstFrameKey
        );
        splash.setOrigin(0.5, 0.5);
        splash.setDepth(200);
        splash.setScale(0.9);

        // Verificar si la animación es válida
        const anim = this.scene.anims.get(animKey);
        if (!anim || anim.frames.length === 0) {
            console.error(`[NoteSplashes] Animation "${animKey}" is invalid`, anim);
            splash.destroy();
            return;
        }

        // Reproducir la animación con manejo de errores
        try {
            splash.on('animationcomplete', () => {
                splash.destroy(); // Eliminar el sprite al terminar
            });
            
            splash.anims.play(animKey); // Iniciar animación
        } catch (error) {
            console.error(`[NoteSplashes] Error playing animation "${animKey}":`, error);
            splash.destroy();
        }
    }

    /**
     * Ajusta la posición de los NoteSplashes.
     * @param {number} offsetX - Desplazamiento horizontal (píxeles)
     * @param {number} offsetY - Desplazamiento vertical (píxeles)
     */
    setPositionOffset(offsetX, offsetY) {
        this.offsetX = offsetX + 30;
        this.offsetY = offsetY + 30;
        console.log(`[NoteSplashes] Position offset set to X:${offsetX}, Y:${offsetY}`);
    }
}