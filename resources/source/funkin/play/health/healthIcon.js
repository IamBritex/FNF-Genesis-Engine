/**
 * HealthIcon.js
 * Gestiona un único icono de personaje (visuales, animación de 'bop', estados).
 */
export class HealthIcon {

    /**
     * @param {Phaser.Scene} scene
     * @param {string} iconName
     * @param {boolean} flipX
     * @param {boolean} isPixel
     * @param {string} sessionId
     */
    constructor(scene, iconName, flipX, isPixel = false, sessionId) {
        this.scene = scene;
        this.iconName = iconName || 'face';
        this.flipX = flipX;
        this.isPixel = isPixel; 
        this.sessionId = sessionId;

        this.sprite = null;
        this.frameCount = 1;
        
        // Animación de Bop
        this.bpm = 100;
        this.minScale = 1.0; 
        this.maxScale = 1.2; 
        this.currentScale = 1.0;
        this.lastBeatTime = 0;
    }

    static preload(scene, iconName, sessionId) {
        iconName = iconName || 'face';
        const key = `icon-${iconName}_${sessionId}`;
        
        if (!scene.textures.exists(key) && !scene.load.isLoading()) {
            scene.load.image(key, `public/images/characters/icons/${iconName}.png`);
            
            // Fallback 404
            scene.load.once(`loaderror-image-${key}`, () => {
                const faceKey = `icon-face_${sessionId}`;
                if (!scene.textures.exists(faceKey)) {
                    scene.load.image(faceKey, 'public/images/characters/icons/face.png');
                }
            });
        }
    }

    create(x, y) {
        let key = `icon-${this.iconName}_${this.sessionId}`;
        if (!this.scene.textures.exists(key)) {
            key = `icon-face_${this.sessionId}`;
        }

        const texture = this.scene.textures.get(key);
        
        // Auto-detectar Pixel Art (si es pequeño < 250px de ancho)
        if (texture?.source?.[0]?.width && texture.source[0].width < 250) {
            this.isPixel = true;
        }

        if (this.isPixel && texture) {
            texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
        }

        // Crear Sprite
        this.sprite = this.scene.add.sprite(x, y, key);
        this.sprite.setOrigin(0.5).setFlipX(this.flipX);
        
        // Configurar frames (Normal / Losing)
        this._processIconFrames(key);
        
        // Auto-Escalado para estandarizar tamaño visual
        const stdWidth = 150;
        const frameWidth = this.sprite.frame.width || stdWidth;
        let baseScale = (frameWidth > 0 && frameWidth < stdWidth) ? (stdWidth / frameWidth) : 1.0;

        if (this.isPixel) baseScale *= 1.2; 

        this.minScale = baseScale;
        this.maxScale = baseScale * 1.2;
        this.currentScale = this.minScale;
        
        this.sprite.setScale(this.currentScale);
        return this.sprite;
    }

    _processIconFrames(key) {
        const texture = this.scene.textures.get(key);
        if (!texture) return;
        
        // Usar el frame base para calcular dimensiones
        const baseFrame = texture.get(0) || texture.frames['__BASE'];
        if (!baseFrame) return;

        // Limpiar frames previos para evitar duplicados en reinicios
        if (texture.has('normal')) texture.remove('normal');
        if (texture.has('losing')) texture.remove('losing');

        // Si es ancho (width > height * 1.5), asumir que tiene 2 estados
        if (baseFrame.width > baseFrame.height * 1.5) {
            const w = Math.floor(baseFrame.width / 2);
            texture.add('normal', 0, 0, 0, w, baseFrame.height);
            texture.add('losing', 0, w, 0, w, baseFrame.height);
            this.frameCount = 2;
        } else {
            texture.add('normal', 0, 0, 0, baseFrame.width, baseFrame.height);
            this.frameCount = 1;
        }
    }

    updateIconState(isLosing) {
        if (!this.sprite || !this.sprite.active) return;
        
        const frameName = (this.frameCount > 1 && isLosing) ? 'losing' : 'normal';
        if (this.sprite.texture.has(frameName)) {
            this.sprite.setFrame(frameName);
        }
    }

    updateBeatBounce(currentTime, delta) {
        if (!this.sprite || !this.sprite.active) return;

        const beatMs = (60 / this.bpm) * 1000;
        if (!beatMs) return;

        const currentBeat = Math.floor(currentTime / beatMs);
        const lastBeat = Math.floor(this.lastBeatTime / beatMs);

        // Detectar nuevo beat
        if (currentBeat > lastBeat) {
            this.currentScale = this.maxScale; 
            this.lastBeatTime = currentTime;
        }

        // Interpolación de regreso al tamaño normal (elasticidad)
        this.currentScale = Phaser.Math.Linear(
            this.currentScale,
            this.minScale,
            1 - Math.exp(-(delta / 1000) * 9)
        );
        
        this.sprite.setScale(this.currentScale);
    }
    
    // Setters/Getters utilitarios
    set x(val) { if (this.sprite) this.sprite.x = val; }
    get x() { return this.sprite ? this.sprite.x : 0; }
    
    setAlpha(val) { if (this.sprite) this.sprite.setAlpha(val); }
    setDepth(val) { if (this.sprite) this.sprite.setDepth(val); }
    
    destroy() { 
        if (this.sprite) {
            if (window.gsap) gsap.killTweensOf(this.sprite);
            this.sprite.destroy();
            this.sprite = null;
        }
        this.scene = null;
    }
}