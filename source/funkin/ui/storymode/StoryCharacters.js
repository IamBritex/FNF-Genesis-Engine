// ====== ARCHIVO: StoryCharacters.js ======
export class Character extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y, characterData) {
        // Asegúrate de usar la clave de textura correcta (puede ser solo 'characterName')
        super(scene, x, y, characterData.image || characterName); // Ajusta si characterData no tiene 'image'
        scene.add.existing(this);

        this.characterName = characterData.image || characterName; // Guarda el nombre base

        this.setScale(characterData.scale || 1)
            .setFlipX(characterData.flipX || false)
            .setDepth(101); // Asegura que esté sobre el fondo (depth 100)

        this.setupRotations(characterData);
        this.setupAnimations(scene, characterData);

        this.isAnimationPlaying = false;
    }

    setupRotations(data) {
        this.globalRotation = data.globalRotation || 0;
        this.idleRotation = data.idleRotation || 0;
        this.confirmRotation = data.confirmRotation || 0;
        
        if (this.globalRotation) {
            this.setRotation(Phaser.Math.DegToRad(this.globalRotation));
        }
    }

    setupAnimations(scene, data) {
        this.idleAnim = data.idle_anim;
        this.confirmAnim = data.confirm_anim;

        // Crear animaciones si no existen
        if (this.idleAnim && !scene.anims.exists(this.idleAnim)) {
            this.createAnimation(scene, this.idleAnim, true); // true para loop
        }
        if (this.confirmAnim && !scene.anims.exists(this.confirmAnim)) {
             this.createAnimation(scene, this.confirmAnim, false); // false para no loop
        }

        // Reproducir idle si existe
        if (this.idleAnim && scene.anims.exists(this.idleAnim)) {
            this.play(this.idleAnim);
            this.applyRotation(this.idleRotation);
        }
    }

    createAnimation(scene, animKey, loop = false) {
        const frames = scene.textures.get(this.texture.key) // Usa la textura actual del sprite
            .getFrameNames()
            .filter(frame => frame.startsWith(animKey))
            .sort((a, b) => {
                const numA = parseInt(a.match(/\d+$/)?.[0] || '0'); // Extrae número al final
                const numB = parseInt(b.match(/\d+$/)?.[0] || '0');
                return numA - numB;
            });

        if (frames.length > 0) {
            scene.anims.create({
                key: animKey,
                frames: frames.map(frame => ({ key: this.texture.key, frame })),
                frameRate: 24,
                repeat: loop ? -1 : 0
            });
        } else {
             console.warn(`No frames found for animation key: ${animKey} on texture ${this.texture.key}`);
        }
    }

    applyRotation(rotation) {
        if (rotation) {
            this.setRotation(Phaser.Math.DegToRad(rotation));
        } else {
             this.resetRotation(); // Volver a la global si no hay específica
        }
    }

    playConfirmAnim() {
        if (this.confirmAnim && this.scene.anims.exists(this.confirmAnim)) {
            this.applyRotation(this.confirmRotation);
            this.play(this.confirmAnim);
            this.isAnimationPlaying = true;

            this.once('animationcomplete', () => {
                if (this.idleAnim && this.scene.anims.exists(this.idleAnim)) {
                    this.play(this.idleAnim);
                    this.applyRotation(this.idleRotation); // Volver a rotación idle
                } else {
                     this.resetRotation();
                }
                this.isAnimationPlaying = false;
            });
        }
    }

    resetRotation() {
        this.setRotation(this.globalRotation ? Phaser.Math.DegToRad(this.globalRotation) : 0);
    }
}