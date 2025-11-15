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
     */
    constructor(scene, iconName, flipX, chartData) {
        this.scene = scene;
        this.iconName = iconName || 'face';
        this.flipX = flipX;
        this.sprite = null;
        this.frameCount = 1;
        this.isDefault = false;

        // --- [NUEVO] Propiedades para el "Bopping" ---
        this.bpm = 100;
        this.minIconScale = 0.9;
        this.maxIconScale = 1.0; 
        this.curIconScale = this.minIconScale;
        this.lastBeatTime = 0;
        // --- [FIN NUEVO] ---
    }

    /**
     * Carga de forma estática los íconos necesarios.
     * PlayState debe llamar a esto en preload().
     * @param {Phaser.Scene} scene
     * @param {string} iconName
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
            console.warn(`Failed to load icon: ${iconName}. Will use default 'face.png'.`);
            if (!scene.textures.exists('icon-face')) {
                scene.load.image('icon-face', 'public/images/characters/icons/face.png');
            }
        });
    }

    /**
     * Crea el sprite en la escena.
     * @param {number} x - Posición X.
     * @param {number} y - Posición Y.
     */
    create(x, y) {
        let textureKey = 'icon-' + this.iconName;

        if (!this.scene.textures.exists(textureKey)) {
            textureKey = 'icon-face';
            this.isDefault = true;
        }

        this.sprite = this.scene.add.sprite(x, y, textureKey);
        this.sprite.setOrigin(0.5).setFlipX(this.flipX);
        
        this._processIconFrames(textureKey);
        
        // --- [NUEVO] ---
        // Aplicar la escala inicial
        this.sprite.setScale(this.minIconScale);
        // --- [FIN NUEVO] ---
        
        return this.sprite;
    }

    /**
     * Revisa la textura y la divide en fotogramas 'normal' y 'losing' si es ancha.
     * @param {string} iconKey - La clave de textura a procesar.
     */
    _processIconFrames(iconKey) {
        const texture = this.scene.textures.get(iconKey);
        if (!texture) return;
        
        const frame = texture.get(0);

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

    /**
     * Actualiza el fotograma del ícono basado en si está perdiendo.
     * @param {boolean} isLosing - Si el ícono debe mostrar el estado 'losing'.
     */
    updateIconState(isLosing) {
        if (!this.sprite) return;
        
        if (this.frameCount > 1 && isLosing) {
            this.sprite.setFrame('losing');
        } else {
            this.sprite.setFrame('normal');
        }
    }

    // --- [NUEVO] Métodos de "Bopping" (Lógica de Haxe) ---

    /**
     * Esta función es llamada por HealthBar.js en cada 'update'.
     * Decide si es momento de hacer "bop" o de interpolar hacia abajo.
     * @param {number} currentTime - El songPosition actual.
     * @param {number} delta - El delta time (en ms) del frame.
     */
    updateBeatBounce(currentTime, delta) {
        if (!this.sprite) return;

        const beatTime = (60 / this.bpm) * 1000;
        if (!beatTime) return; // Evitar división por cero si bpm es 0

        const currentBeat = Math.floor(currentTime / beatTime);
        const lastBeat = Math.floor(this.lastBeatTime / beatTime);

        // Si hemos cruzado un beat, ¡haz "bop"!
        if (currentBeat > lastBeat) {
            this.curIconScale = this.maxIconScale; // Inicia el salto
            this.lastBeatTime = currentTime;
        }

        // Interpola (suaviza) la escala de vuelta a la normalidad en cada frame
        this._updateIconScale(delta / 1000); // (delta en segundos)
    }

    /**
     * Interpola suavemente la escala actual de vuelta a 'minIconScale'.
     * [cite_start](Equivalente a lerpIconSize en Haxe [cite: 479, 486])
     * @param {number} elapsed - El tiempo transcurrido en segundos.
     */
    _updateIconScale(elapsed) {
        // Usamos la fórmula de interpolación de Haxe/Flixel (lerp)
        // 1 - Math.exp(-elapsed * N) es la forma de hacerlo en Phaser.
        // El '9' es la "nitidez" de la interpolación.
        this.curIconScale = Phaser.Math.Linear(
            this.curIconScale,      // Desde (escala actual)
            this.minIconScale,      // Hacia (escala base)
            1 - Math.exp(-elapsed * 9) // Factor de interpolación
        );
        
        this.sprite.setScale(this.curIconScale);
    }
    
    // --- [FIN NUEVO] ---


    // --- Métodos de Ayuda (Passthrough) ---

    setAlpha(val) { 
        if (this.sprite) this.sprite.setAlpha(val); 
    }
    setDepth(val) { 
        if (this.sprite) this.sprite.setDepth(val); 
    }
    
    /**
     * Establece la escala base (mínima) del ícono.
     * @param {number} val - La escala base (ej. 1.0)
     */
    setScale(val) { 
        this.minIconScale = val;
        if (this.sprite && this.curIconScale < val) {
            this.sprite.setScale(val); 
        }
    }
    
    destroy() { 
        if (this.sprite) {
            this.sprite.destroy(); 
        }
        const iconKey = 'icon-' + this.iconName;
        if (this.scene && this.scene.textures.exists(iconKey)) {
            this.scene.textures.remove(iconKey);
        }
    }
    
    set x(val) { 
        if (this.sprite) this.sprite.x = val; 
    }
    get x() { 
        return this.sprite ? this.sprite.x : 0; 
    }
}