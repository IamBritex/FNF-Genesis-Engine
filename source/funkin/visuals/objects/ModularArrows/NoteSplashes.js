export class NoteSplashes {
    /**
     * @param {Phaser.Scene} scene - Escena de Phaser
     * @param {NotesController} notesController - Controlador de notas
     * @param {number} [offsetX=62] - Desplazamiento horizontal (píxeles)
     * @param {number} [offsetY=72] - Desplazamiento vertical (píxeles)
     */
    constructor(scene, notesController, offsetX = 362, offsetY = 372) {
        this.scene = scene;
        this.notesController = notesController;
        // Asignar offsets correctamente
        this.offsetX = offsetX;
        this.offsetY = offsetY;
        this.splashPool = new Map();
                
        // Initialize immediately if textures are already loaded
        if (this.scene.textures.exists('noteSplashes')) {
            this._ensureAnimations();
        }
    }

    /**
     * Crea las animaciones para los NoteSplashes.
     * @private
     */
    _ensureAnimations() {
        try {
            const colors = ['purple', 'blue', 'green', 'red'];
            const frames = this.scene.textures.get('noteSplashes').getFrameNames();
                        
            if (!frames || frames.length === 0) {
                throw new Error('No frames found in noteSplashes texture atlas');
            }

            colors.forEach((color) => {
                // Match frames with exact spacing and case for both impact types
                const impact1Frames = frames.filter(frame => 
                    frame.startsWith(`note impact 1  ${color}`)
                );
                
                const impact2Frames = frames.filter(frame => 
                    frame.startsWith(`note impact 2  ${color}`)
                );
                
                if (impact1Frames.length === 0 && impact2Frames.length === 0) {
                    console.warn(`[NoteSplashes] No frames found for color ${color}`);
                    return;
                }

                // Sort frames by their frame number
                const sortByFrameNumber = (a, b) => {
                    const numA = parseInt(a.match(/\d+$/)?.[0] || 0);
                    const numB = parseInt(b.match(/\d+$/)?.[0] || 0);
                    return numA - numB;
                };

                // Sort the arrays separately
                const sortedImpact1 = [...impact1Frames].sort(sortByFrameNumber);
                const sortedImpact2 = [...impact2Frames].sort(sortByFrameNumber);

                // Create animations for each impact type if frames exist
                if (sortedImpact1.length > 0) {
                    const key1 = `splash1-${color}`;
                    if (!this.scene.anims.exists(key1)) {
                        this.scene.anims.create({
                            key: key1,
                            frames: this.scene.anims.generateFrameNames('noteSplashes', {
                                frames: sortedImpact1
                            }),
                            frameRate: 24,
                            repeat: 0,
                            hideOnComplete: true
                        });
                    }
                }

                if (sortedImpact2.length > 0) {
                    const key2 = `splash2-${color}`;
                    if (!this.scene.anims.exists(key2)) {
                        this.scene.anims.create({
                            key: key2,
                            frames: this.scene.anims.generateFrameNames('noteSplashes', {
                                frames: sortedImpact2
                            }),
                            frameRate: 24,
                            repeat: 0,
                            hideOnComplete: true
                        });
                    }
                }
            });

        } catch (error) {
            console.error("[NoteSplashes] Error setting up animations:", error);
            const frames = this.scene.textures.get('noteSplashes').getFrameNames();
            console.log("[NoteSplashes] Available frames:", frames);
        }
    }

    /**
     * Muestra un NoteSplash en la dirección especificada.
     * @param {number} direction - Dirección del splash
     * @param {string} color - Color del splash (purple, blue, green, red)
     */
    showSplash(direction, color) {
        if (!this.scene || !this.notesController) return;

        const strumlinePos = this.notesController.getStrumlinePositions(true)[direction];
        if (!strumlinePos) return;

        let splash = this._getSplashFromPool(color);
        
        // Asegurarse de que cualquier animación previa se detenga
        if (splash.anims) {
            splash.removeAllListeners('animationcomplete');
            splash.stop();
        }
        
        // Aplicar los offsets correctamente
        splash.setPosition(
            strumlinePos.x - this.offsetX,  // Usar this.offsetX
            strumlinePos.y - this.offsetY   // Usar this.offsetY
        );
        
        // Reset properties
        splash.setVisible(true);
        splash.setActive(true);
        splash.setAlpha(1);
        splash.setScale(1);
        
        // Elegir aleatoriamente entre impacto 1 y 2
        const impactType = Math.random() < 0.5 ? 1 : 2;
        const animKey = `splash${impactType}-${color}`;
        
        // Play animation
        splash.play(animKey);
        
        // Cleanup cuando termine la animación
        splash.once('animationcomplete', () => {
            this._returnSplashToPool(splash, color);
        });
    }

    /**
     * Obtiene un sprite de splash del pool o crea uno nuevo si es necesario.
     * @param {string} color - Color del splash
     * @returns {Phaser.GameObjects.Sprite} - Sprite del splash
     * @private
     */
    _getSplashFromPool(color) {
        if (!this.splashPool.has(color)) {
            this.splashPool.set(color, []);
        }

        const pool = this.splashPool.get(color);
        let splash = pool.find(s => !s.visible);

        if (!splash) {
            splash = this.scene.add.sprite(0, 0, 'noteSplashes');
            splash.setDepth(1000);
            // Asegurarse de que el nuevo sprite comience limpio
            splash.setVisible(false);
            splash.setActive(false);
            splash.setAlpha(0);
            
            // Agregar el splash a la cámara UI
            if (this.scene.cameraController) {
                this.scene.cameraController.addToUILayer(splash);
            }
            
            pool.push(splash);
        }

        return splash;
    }

    /**
     * Devuelve un sprite de splash al pool para su reutilización.
     * @param {Phaser.GameObjects.Sprite} splash - Sprite del splash
     * @param {string} color - Color del splash
     * @private
     */
    _returnSplashToPool(splash, color) {
        if (!this.splashPool.has(color)) return;
        
        // Asegurarse de que la animación se detenga completamente
        splash.removeAllListeners('animationcomplete');
        splash.stop();
        
        // Reset del sprite
        splash.setVisible(false);
        splash.setActive(false);
        splash.setAlpha(0);
        
        // Asegurarse de que el sprite vuelva a su estado inicial
        splash.setScale(1);
    }

    /**
     * Limpia el pool de splashes y destruye los sprites.
     */
    cleanup() {
        this.splashPool.forEach(pool => {
            pool.forEach(splash => {
                splash.destroy();
            });
        });
        this.splashPool.clear();
    }
}
