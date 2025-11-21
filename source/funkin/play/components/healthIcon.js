/**
 * HealthIcon.js
 * Maneja la APARIENCIA de un solo ícono de vida.
 * Carga su propia textura, maneja sus fotogramas y su animación de "bop".
 */
export class HealthIcon {

    /**
     * @param {Phaser.Scene} scene - La escena de Phaser.
     * @param {string} iconName - El nombre del ícono (ej. "bf", "dad").
     * @param {boolean} flipX - Si el sprite debe estar volteado horizontalmente.
     * @param {boolean} isPixel - Si es un ícono pixel art (forzado).
     */
    constructor(scene, iconName, flipX, isPixel = false) {
        this.scene = scene;
        this.iconName = iconName || 'face';
        this.flipX = flipX;
        this.isPixel = isPixel; 
        this.sprite = null;
        this.frameCount = 1;
        this.isDefault = false;

        // Propiedades para el "Bopping"
        this.bpm = 100;
        this.minIconScale = 1.0; 
        this.maxIconScale = 1.2; 
        this.curIconScale = this.minIconScale;
        this.lastBeatTime = 0;
    }

    /**
     * Carga de forma estática los íconos necesarios.
     */
    static preload(scene, iconName) {
        iconName = iconName || 'face';
        const iconKey = 'icon-' + iconName;
        const path = `public/images/characters/icons/${iconName}.png`;

        if (scene.textures.exists(iconKey) || scene.load.isLoading()) {
            return;
        }

        scene.load.image(iconKey, path);

        scene.load.once(`loaderror-image-${iconKey}`, () => {
            if (!scene.textures.exists('icon-face')) {
                scene.load.image('icon-face', 'public/images/characters/icons/face.png');
            }
        });
    }

    /**
     * Crea el sprite en la escena.
     */
    create(x, y) {
        let textureKey = 'icon-' + this.iconName;

        if (!this.scene.textures.exists(textureKey)) {
            textureKey = 'icon-face';
            this.isDefault = true;
        }

        const texture = this.scene.textures.get(textureKey);
        
        // --- [NUEVO] Auto-detectar Pixel Art por tamaño ---
        // Si el ancho total de la imagen es pequeño (ej. < 250px),
        // asumimos que es un ícono pixel art (usualmente 32x32 o 64x32).
        if (texture && texture.source && texture.source[0]) {
            if (texture.source[0].width < 250) {
                this.isPixel = true;
            }
        }

        // --- Aplicar filtro si es Pixel Art ---
        if (this.isPixel) {
            if (texture) {
                texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
            }
        }

        this.sprite = this.scene.add.sprite(x, y, textureKey);
        this.sprite.setOrigin(0.5).setFlipX(this.flipX);
        
        this._processIconFrames(textureKey);
        
        // --- [NUEVO] Lógica de Auto-Escalado ---
        // Queremos que visualmente tenga un tamaño consistente (~150px de ancho por frame).
        const standardFrameWidth = 150;
        
        // Obtenemos el ancho del frame actual
        const currentFrameWidth = this.sprite.frame.width;

        if (currentFrameWidth < standardFrameWidth) {
             // Calcular cuánto escalar para llegar al tamaño estándar
             const scaleFactor = standardFrameWidth / currentFrameWidth;
             
             // Ajustar las escalas base
             this.minIconScale = scaleFactor;
             this.maxIconScale = scaleFactor * 1.2; // Mantener el 'bop' relativo
        } else {
             // Valores por defecto para íconos HD
             this.minIconScale = 1.0;
             this.maxIconScale = 1.2;
        }

        // Aplicar la escala inicial calculada
        this.curIconScale = this.minIconScale;
        this.sprite.setScale(this.curIconScale);
        
        return this.sprite;
    }

    /**
     * Revisa la textura y la divide en fotogramas 'normal' y 'losing' si es ancha.
     */
    _processIconFrames(iconKey) {
        const texture = this.scene.textures.get(iconKey);
        if (!texture) return;
        
        const frame = texture.get(0);

        // Limpiar frames previos si existen para evitar duplicados al recargar
        if (texture.has('normal')) texture.remove('normal');
        if (texture.has('losing')) texture.remove('losing');

        if (frame.width > frame.height * 1.5) {
            const frameWidth = Math.floor(frame.width / 2);
            texture.add('normal', 0, 0, 0, frameWidth, frame.height);
            texture.add('losing', 0, frameWidth, 0, frameWidth, frame.height);
            this.frameCount = 2;
        } else {
            texture.add('normal', 0, 0, 0, frame.width, frame.height);
            this.frameCount = 1;
        }
    }

    updateIconState(isLosing) {
        if (!this.sprite) return;
        
        if (this.frameCount > 1 && isLosing) {
            this.sprite.setFrame('losing');
        } else {
            this.sprite.setFrame('normal');
        }
    }

    updateBeatBounce(currentTime, delta) {
        if (!this.sprite) return;

        const beatTime = (60 / this.bpm) * 1000;
        if (!beatTime) return;

        const currentBeat = Math.floor(currentTime / beatTime);
        const lastBeat = Math.floor(this.lastBeatTime / beatTime);

        if (currentBeat > lastBeat) {
            this.curIconScale = this.maxIconScale; 
            this.lastBeatTime = currentTime;
        }

        this._updateIconScale(delta / 1000);
    }

    _updateIconScale(elapsed) {
        this.curIconScale = Phaser.Math.Linear(
            this.curIconScale,      
            this.minIconScale,      
            1 - Math.exp(-elapsed * 9) 
        );
        
        this.sprite.setScale(this.curIconScale);
    }
    
    setAlpha(val) { if (this.sprite) this.sprite.setAlpha(val); }
    setDepth(val) { if (this.sprite) this.sprite.setDepth(val); }
    
    setScale(val) { 
        this.minIconScale = val;
        if (this.sprite && this.curIconScale < val) {
            this.sprite.setScale(val); 
        }
    }
    
    destroy() { 
        // Detener cualquier tween de GSAP asociado a este sprite
        if (this.sprite) {
            gsap.killTweensOf(this.sprite);
            this.sprite.destroy(); 
        }
    }
    
    set x(val) { if (this.sprite) this.sprite.x = val; }
    get x() { return this.sprite ? this.sprite.x : 0; }
}