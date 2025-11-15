
/**
 * AssetsDriver (Clase Estática Global)
 * Gestiona la creación y animación de sprites.
 * DEBE ser inicializado en cada escena con AssetsDriver.setScene(this);
 */
class AssetsDriver {
    // Las propiedades ahora son estáticas
    static currentScene = null;
    static managedSprites = new Map();
    static tweens = new Map();

    /**
     * Establece la escena activa actual para el driver.
     * Esto DEBE llamarse en el método create() de cada escena.
     * @param {Phaser.Scene} scene La escena que se acaba de crear.
     */
    static setScene(scene) {
        // Si ya había una escena, la limpiamos por si acaso
        if (AssetsDriver.currentScene) {
            AssetsDriver.currentScene.events.off('shutdown', AssetsDriver.cleanupScene, AssetsDriver);
            AssetsDriver.cleanupScene();
        }
        
        AssetsDriver.currentScene = scene;
        
        // Escucha el evento 'shutdown' de la escena para limpiarse automáticamente
        scene.events.once('shutdown', AssetsDriver.cleanupScene, AssetsDriver);
    }

    /**
     * Crea un sprite a partir de un objeto de datos.
     * Asume que la textura ya está cargada.
     */
    static async createSpriteFromData(spriteId, data, textureKey) {
        if (AssetsDriver.managedSprites.has(spriteId)) {
            console.warn(`Sprite con ID ${spriteId} ya existe.`);
            return AssetsDriver.managedSprites.get(spriteId).sprite;
        }
        if (!AssetsDriver.currentScene) {
            throw new Error("AssetsDriver no tiene una escena activa. Llama a AssetsDriver.setScene(this) en create().");
        }

        try {
            if (!AssetsDriver.currentScene.textures.exists(textureKey)) {
                throw new Error(`La textura "${textureKey}" no fue pre-cargada.`);
            }

            const sprite = AssetsDriver.currentScene.add.sprite(0, 0, textureKey);
            const origin = data.origin || { x: 0.5, y: 0.5 };
            sprite.setOrigin(origin.x, origin.y);
            sprite.setScale(data.scale || 1);
            sprite.setFlipX(data.flipX || false);
            sprite.setDepth(data.depth || 0);

            const basePosition = { x: data.x || 0, y: data.y || 0 };

            const spriteInfo = {
                sprite: sprite,
                data: data,
                textureKey: textureKey,
                basePosition: basePosition,
                currentAnimation: null,
            };
            AssetsDriver.managedSprites.set(spriteId, spriteInfo);

            gsap.set(sprite, {
                x: basePosition.x,
                y: basePosition.y,
            });

            await AssetsDriver.setupAnimations(spriteInfo);

            if (data.initialAnimation) {
                AssetsDriver.playAnimation(spriteId, data.initialAnimation);
            }

            return sprite;

        } catch (error) {
            console.error(`Error al crear el sprite ${spriteId}:`, error);
            return null;
        }
    }

    /**
     * Configura las animaciones para un sprite (método estático).
     * @private
     */
    static async setupAnimations(spriteInfo) {
        const { data, textureKey } = spriteInfo;
        if (!data.animations || !AssetsDriver.currentScene) return;

        const createAnimationPromises = data.animations.map(animation => {
            return new Promise((resolve) => {
                const frames = AssetsDriver.currentScene.textures.get(textureKey).getFrameNames();
                let animationFrames;

                if (animation.indices?.length > 0) {
                    animationFrames = animation.indices
                        .map(index => {
                            const paddedIndex = String(index).padStart(4, "0");
                            return frames.find(frame => frame.startsWith(`${animation.name}${paddedIndex}`));
                        })
                        .filter(Boolean);
                } else {
                    animationFrames = frames.filter(frame => frame.startsWith(animation.name)).sort();
                }

                if (animationFrames.length > 0) {
                    const animKey = `${textureKey}_${animation.anim}`;
                    const frameRate = animation.fps || 24;
                    const repeatVal = animation.loop ? -1 : 0;

                    if (!AssetsDriver.currentScene.anims.exists(animKey)) {
                        AssetsDriver.currentScene.anims.create({
                            key: animKey,
                            frames: animationFrames.map(frameName => ({
                                key: textureKey,
                                frame: frameName,
                            })),
                            frameRate: frameRate,
                            repeat: repeatVal
                        });
                    }
                }
                resolve();
            });
        });

        await Promise.all(createAnimationPromises);
    }

    /**
     * Reproduce una animación en un sprite (método estático).
     */
    static playAnimation(spriteId, animName, force = false) {
        const spriteInfo = AssetsDriver.managedSprites.get(spriteId);
        if (!spriteInfo || !AssetsDriver.currentScene) return;

        const { sprite, textureKey, data } = spriteInfo;
        const animation = data.animations.find(a => a.anim === animName);
        if (!animation) {
            console.warn(`Animación ${animName} no encontrada para ${spriteId}`);
            return;
        }

        AssetsDriver.applyOffsets(spriteId, animName);

        const animKey = `${textureKey}_${animation.anim}`;
        if (AssetsDriver.currentScene.anims.exists(animKey)) {
            if (force || sprite.anims.currentAnim?.key !== animKey || !sprite.anims.isPlaying) {
                sprite.stop();
                sprite.play(animKey);
                spriteInfo.currentAnimation = animName;
            }
        }
    }

    /**
     * Aplica offsets de animación (método estático).
     */
    static applyOffsets(spriteId, animName) {
        const spriteInfo = AssetsDriver.managedSprites.get(spriteId);
        if (!spriteInfo) return;

        const { sprite, data, basePosition } = spriteInfo;
        const animation = data.animations.find(a => a.anim === animName);
        const offsets = animation?.offsets || [0, 0];
        const [offsetX, offsetY] = offsets;

        if (AssetsDriver.tweens.has(spriteId)) {
            AssetsDriver.tweens.get(spriteId).kill();
            AssetsDriver.tweens.delete(spriteId);
        }

        const tween = gsap.to(sprite, {
            x: basePosition.x + offsetX,
            y: basePosition.y + offsetY,
            duration: 0,
            ease: "none",
            overwrite: "auto",
        });
        AssetsDriver.tweens.set(spriteId, tween);
    }

    /**
     * Obtiene un sprite por ID (método estático).
     */
    static getSprite(spriteId) {
        return AssetsDriver.managedSprites.get(spriteId)?.sprite;
    }

    /**
     * Limpia los sprites y tweens de la escena actual (método estático).
     * Se llama automáticamente por el evento 'shutdown' de la escena.
     */
    static cleanupScene() {
        AssetsDriver.tweens.forEach(tween => tween.kill());
        AssetsDriver.tweens.clear();
        AssetsDriver.managedSprites.forEach(({ sprite }) => {
            if (sprite && sprite.scene) { // Comprueba que el sprite exista
                sprite.destroy();
            }
        });
        AssetsDriver.managedSprites.clear();
        AssetsDriver.currentScene = null; // Libera la referencia a la escena
        // console.log('AssetsDriver cleanup complete for scene.');
    }
}