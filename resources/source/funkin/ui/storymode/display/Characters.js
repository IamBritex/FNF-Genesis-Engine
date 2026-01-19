export class Characters extends Phaser.GameObjects.Sprite {
    /**
     * @param {Phaser.Scene} scene 
     * @param {number} x 
     * @param {number} y 
     * @param {Object} data 
     */
    constructor(scene, x, y, data) {
        // Verificar que la textura existe
        const textureKey = data.image;
        if (!scene.textures.exists(textureKey)) {
            console.warn(`Characters.js: Textura '${textureKey}' no encontrada.`);
        }

        super(scene, x, y, textureKey);
        
        this.characterData = data;
        this.scene = scene;

        this.idleAnimKey = data.idle_anim;
        this.confirmAnimKey = data.confirm_anim;
        
        // Propiedades visuales
        this.scaleValue = typeof data.scale === 'number' ? data.scale : 1;
        this.flipX = data.flipX === true; 

        // Rotaciones
        this.globalRotation = data.globalRotation || 0;
        this.idleRotation = data.idleRotation || 0;
        this.confirmRotation = data.confirmRotation || 0;

        // --- CONFIGURACIÓN DE RENDERIZADO ---
        this.setOrigin(0, 0); // Renderizar desde la esquina superior izquierda (0,0)
        this.setScale(this.scaleValue);
        this.setFlipX(this.flipX);
        this.setDepth(400); // Profundidad alta para que se vea sobre el fondo
        this.setAlpha(1);
        
        if (this.globalRotation) {
            this.setRotation(Phaser.Math.DegToRad(this.globalRotation));
        }

        scene.add.existing(this);

        this.createAnimations();
        this.playIdle();
    }

    createAnimations() {
        if (this.idleAnimKey && !this.scene.anims.exists(this.idleAnimKey)) {
            this.createAnimationFromTexture(this.idleAnimKey, true);
        }

        if (this.confirmAnimKey && !this.scene.anims.exists(this.confirmAnimKey)) {
            this.createAnimationFromTexture(this.confirmAnimKey, false);
        }
    }

    createAnimationFromTexture(animPrefix, loop) {
        const texture = this.scene.textures.get(this.texture.key);
        if (!texture || texture.key === '__MISSING') return;

        // Filtrado manual robusto para XMLs de FNF
        const frames = texture.getFrameNames()
            .filter(frameName => frameName.startsWith(animPrefix))
            .sort((a, b) => {
                const numA = parseInt(a.match(/\d+$/)?.[0] || '0');
                const numB = parseInt(b.match(/\d+$/)?.[0] || '0');
                return numA - numB;
            });

        if (frames.length > 0) {
            this.scene.anims.create({
                key: animPrefix,
                frames: frames.map(frame => ({ key: this.texture.key, frame })),
                frameRate: 24,
                repeat: loop ? -1 : 0
            });
        } else {
            console.warn(`Characters.js: No frames encontrados para "${animPrefix}" en "${this.texture.key}"`);
        }
    }

    playIdle() {
        if (this.idleAnimKey && this.scene.anims.exists(this.idleAnimKey)) {
            this.applyRotation(this.idleRotation);
            this.play(this.idleAnimKey);
        } else {
            this.setAlpha(1); // Asegurar visibilidad si falla animación
        }
    }

    playConfirmAnim() {
        if (this.confirmAnimKey && this.scene.anims.exists(this.confirmAnimKey)) {
            this.applyRotation(this.confirmRotation);
            this.play(this.confirmAnimKey);
            
            this.once('animationcomplete', () => {
                this.playIdle();
            });
        } else {
            // Animación fallback
            this.scene.tweens.add({
                targets: this,
                alpha: 0.5,
                duration: 100,
                yoyo: true,
                repeat: 4,
                onComplete: () => { this.alpha = 1; }
            });
        }
    }

    applyRotation(rotation) {
        if (rotation) {
            this.setRotation(Phaser.Math.DegToRad(rotation));
        } else {
             this.setRotation(this.globalRotation ? Phaser.Math.DegToRad(this.globalRotation) : 0);
        }
    }
}