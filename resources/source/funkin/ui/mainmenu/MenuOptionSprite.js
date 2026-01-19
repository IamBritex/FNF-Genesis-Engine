/**
 * Átomo: MenuOptionSprite
 * Representa un elemento interactivo individual del Menú Principal.
 * Encapsula su propia configuración, posición y generación de animaciones.
 */
export class MenuOptionSprite extends Phaser.GameObjects.Sprite {
    /**
     * @param {Phaser.Scene} scene - La escena a la que pertenece.
     * @param {Object} data - Datos de configuración (texture, animations, coords, etc).
     */
    constructor(scene, data) {
        super(scene, data.x, data.y, data.texture);
        
        this.targetScene = data.scene;

        this.setOrigin(data.origin.x, data.origin.y);
        this.setScrollFactor(data.scrollFactor.x, data.scrollFactor.y);
        this.setDepth(data.depth);

        this.setupAnimations(data.animations);

        scene.add.existing(this);
    }

    /**
     * Genera las animaciones automáticamente basándose en los datos proporcionados.
     * @param {Array} animationsData - Lista de configuraciones de animación.
     */
    setupAnimations(animationsData) {
        if (!animationsData) return;

        const textureKey = this.texture.key;
        const allFrames = this.scene.textures.get(textureKey).getFrameNames();

        animationsData.forEach(animData => {
            const animKey = `${textureKey}_${animData.anim}`;

            if (this.scene.anims.exists(animKey)) return;

            let frames = [];

            if (animData.indices && animData.indices.length > 0) {
                frames = animData.indices.map(i => {
                    const padded = String(i).padStart(4, '0');
                    return allFrames.find(f => f.startsWith(`${animData.name}${padded}`));
                }).filter(Boolean);
            } else {
                frames = allFrames.filter(f => f.startsWith(animData.name)).sort();
            }

            if (frames.length > 0) {
                this.scene.anims.create({
                    key: animKey,
                    frames: frames.map(f => ({ key: textureKey, frame: f })),
                    frameRate: animData.fps,
                    repeat: animData.loop ? -1 : 0
                });
            }
        });
    }
}