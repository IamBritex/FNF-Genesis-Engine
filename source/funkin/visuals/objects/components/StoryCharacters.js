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
        // Primero configurar la animación idle si existe
        if (data.idle_anim) {
            this.createAnimation(scene, data.idle_anim);
            if (scene.anims.exists(data.idle_anim)) {
                this.play(data.idle_anim);
                this.applyRotation(this.idleRotation);
            }
        }

        // Luego configurar la animación de confirmación
        if (data.confirm_anim) {
            this.createAnimation(scene, data.confirm_anim);
        }

        this.confirmAnim = data.confirm_anim;

        // Asegurarse de que la animación idle se reproduce
        if (data.idle_anim && scene.anims.exists(data.idle_anim)) {
            this.play(data.idle_anim);
        }
    }

    createAnimation(scene, animKey) {
        const frames = scene.textures.get(this.texture.key)
            .getFrameNames()
            .filter(frame => frame.startsWith(animKey))
            .sort((a, b) => {
                // Extraer números de los nombres de frame para ordenar correctamente
                const numA = parseInt(a.replace(/[^\d]/g, ''));
                const numB = parseInt(b.replace(/[^\d]/g, ''));
                return numA - numB;
            });

        if (frames.length > 0) {
            const isIdle = animKey.toLowerCase().includes('idle');
            
            scene.anims.create({
                key: animKey,
                frames: frames.map(frame => ({ key: this.texture.key, frame })),
                frameRate: 24,
                repeat: isIdle ? -1 : 0  // -1 para loop infinito en idles
            });

            console.log(`Animation created: ${animKey}, Frames: ${frames.length}, Loop: ${isIdle}`);
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
            
            // Guardar la animación idle para restaurarla después
            const idleAnim = this.anims.currentAnim?.key.toLowerCase().includes('idle') 
                ? this.anims.currentAnim.key 
                : null;

            this.play(this.confirmAnim);
            this.isAnimationPlaying = true;

            // Restaurar la animación idle cuando termine la confirmación
            this.once('animationcomplete', () => {
                if (idleAnim) {
                    this.play(idleAnim);
                }
                this.isAnimationPlaying = false;
            });
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