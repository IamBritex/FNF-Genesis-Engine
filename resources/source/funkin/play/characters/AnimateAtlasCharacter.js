import { CharacterSing } from "./CharacterSing.js";

export class AnimateAtlasCharacter extends Phaser.GameObjects.Sprite {
    /**
     * @param {Phaser.Scene} scene
     * @param {number} baseX 
     * @param {number} baseY 
     * @param {string} textureKey
     * @param {object} charJson
     */
    constructor(scene, baseX, baseY, textureKey, charJson) {
        super(scene, baseX, baseY, textureKey);
        
        // Añadir a la escena si esta es válida
        if (scene && scene.add) {
            scene.add.existing(this);
        }

        this.charJson = charJson;
        this.textureKey = textureKey;
        
        this.baseX = baseX;
        this.baseY = baseY;

        this.animOffsets = new Map();
        this.danceIdle = false;
        this.isDancing = false;
        this.specialAnim = false;
        
        this.charScale = charJson.scale || 1;

        // Módulo de lógica de canto
        this.singHandler = new CharacterSing(this, 4);

        this.setOrigin(0, 0); 
        this.setScale(this.charScale);
        
        this._parseConfig();
        
        // Intentar bailar solo si estamos activos
        if (this.active) {
            this.dance(true);
        }
    }

    _parseConfig() {
        if (!this.charJson) return;

        const duration = this.charJson.sing_duration || 4;
        this.singHandler.setDuration(duration);

        if (this.charJson.flip_x) this.setFlipX(true);

        if (this.charJson.animations) {
            this.charJson.animations.forEach(anim => {
                if (anim.offsets) {
                    this.addOffset(anim.anim, anim.offsets[0], anim.offsets[1]);
                }
            });
        }

        // [SEGURIDAD] Verificar scene y anims antes de consultar
        if (this.scene && this.scene.anims) {
            const hasIdle = this.scene.anims.exists(`${this.textureKey}_idle`);
            this.danceIdle = hasIdle;
        } else {
            this.danceIdle = false;
        }
    }

    addOffset(name, x, y) {
        this.animOffsets.set(name, [x, y]);
    }

    /**
     * Reproduce una animación aplicando offsets.
     */
    playAnim(animName, ignoreIfPlaying = false, startFrame = 0) {
        // [CORRECCIÓN CRÍTICA] Verificar que la escena y el sprite sigan vivos
        // Esto evita el error "Cannot read properties of undefined (reading 'anims')"
        if (!this.scene || !this.scene.anims || !this.active) return;

        const fullAnimKey = `${this.textureKey}_${animName}`;
        
        if (!this.scene.anims.exists(fullAnimKey)) {
            // Fallback: Si intenta cantar y no hay anim, ignorar silenciosamente
            // para no romper el flujo del juego
            return;
        }

        this.play({ key: fullAnimKey, startFrame: startFrame }, ignoreIfPlaying);
        
        const offsets = this.animOffsets.get(animName) || [0, 0];
        this.x = this.baseX + (offsets[0] * this.charScale);
        this.y = this.baseY + (offsets[1] * this.charScale);
    }

    /**
     * Ejecuta el baile (Idle o Left/Right).
     * @param {boolean} force - Fuerza la animación ignorando el estado de canto.
     */
    dance(force = false) {
        // [SEGURIDAD]
        if (!this.scene || !this.active) return;

        // Verificar si existe al menos una animación de baile compatible
        // Usamos this.scene con seguridad gracias al check anterior
        if (!this.danceIdle && !this.scene.anims.exists(`${this.textureKey}_danceLeft`)) return;
        
        // Si hay animación especial y no forzamos, salimos
        if (this.specialAnim && !force) return;

        // Delegar al SingHandler: ¿Debemos mantener la nota?
        if (!force && this.singHandler.shouldHold()) {
            return;
        }

        const ignoreIfPlaying = !force; 

        if (this.danceIdle) {
            this.playAnim('idle', ignoreIfPlaying);
        } else {
            // Alternar pies
            this.isDancing = !this.isDancing;
            const step = this.isDancing ? 'danceRight' : 'danceLeft';
            this.playAnim(step, ignoreIfPlaying);
        }
    }

    /**
     * Orden para cantar una nota.
     */
    sing(direction, miss = false) {
        if (!this.active) return;
        this.specialAnim = false;
        this.singHandler.sing(direction, miss);
    }

    /**
     * Evento de beat recibido desde Characters.js.
     */
    onBeat(beat) {
        // [SEGURIDAD] Si el sprite fue destruido (por un reinicio o cambio de escena), no hacer nada
        if (!this.scene || !this.active) return;

        // Actualizar temporizadores de hold
        this.singHandler.onBeat();
        // Intentar bailar
        this.dance();
    }
}