export class Character extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y, characterData) {
        super(scene, x, y, characterData.image);
        scene.add.existing(this);

        this.setScale(characterData.scale || 1)
            .setFlipX(characterData.flipX || false)
            .setDepth(2);

        this.setupRotations(characterData);
        this.setupAnimations(scene, characterData);

        // Nueva propiedad para rastrear si la animación está en curso
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
        [data.idle_anim, data.confirm_anim].forEach(anim => {
            if (anim && !scene.anims.exists(anim)) {
                this.createAnimation(scene, anim);
            }
        });

        if (scene.anims.exists(data.idle_anim)) {
            this.play(data.idle_anim);
            this.applyRotation(this.idleRotation);
        }

        this.confirmAnim = data.confirm_anim;
    }

    createAnimation(scene, animKey) {
        const frames = scene.textures.get(this.texture.key)
            .getFrameNames()
            .filter(frame => frame.startsWith(animKey))
            .sort();

        if (frames.length > 0) {
            scene.anims.create({
                key: animKey,
                frames: frames.map(frame => ({ key: this.texture.key, frame })),
                frameRate: 24,
                repeat: animKey.includes("Idle") ? -1 : 0
            });
        }
    }

    applyRotation(rotation) {
        if (rotation) {
            this.setRotation(Phaser.Math.DegToRad(rotation));
        }
    }

    playConfirmAnim() {
        if (this.confirmAnim && this.scene.anims.exists(this.confirmAnim)) {
            this.applyRotation(this.confirmRotation);
            this.play(this.confirmAnim);
            this.isAnimationPlaying = true; // Marcar que la animación está en curso
        }
    }

    stopAnimation() {
        this.anims.stop();
        this.isAnimationPlaying = false; // Marcar que la animación se detuvo
    }

    resetRotation() {
        this.setRotation(this.globalRotation !== 0 ? Phaser.Math.DegToRad(this.globalRotation) : 0);
    }
}