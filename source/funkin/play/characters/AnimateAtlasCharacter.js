import { CharacterSing } from "./CharacterSing.js";
// Asumimos que CharacterPositioner ya existe por el paso anterior
// import { CharacterPositioner } from "./CharacterPositioner.js"; 

export class AnimateAtlasCharacter extends Phaser.GameObjects.Sprite {
    /**
     * @param {Phaser.Scene} scene
     * @param {number} baseX - Posición base X (calculada externamente o por Positioner).
     * @param {number} baseY - Posición base Y (calculada externamente o por Positioner).
     * @param {string} textureKey
     * @param {object} charJson
     */
    constructor(scene, baseX, baseY, textureKey, charJson) {
        super(scene, baseX, baseY, textureKey);
        scene.add.existing(this);

        this.charJson = charJson;
        this.textureKey = textureKey;
        
        this.baseX = baseX;
        this.baseY = baseY;

        this.animOffsets = new Map();
        this.danceIdle = false;
        this.isDancing = false;
        this.specialAnim = false;
        
        this.charScale = charJson.scale || 1;

        // --- Inicializar Módulo de Canto ---
        this.singHandler = new CharacterSing(this, 4);

        // Configuración
        this.setOrigin(0, 0); 
        this.setScale(this.charScale);
        
        this._parseConfig();

        // Iniciar
        this.dance();
    }

    _parseConfig() {
        if (!this.charJson) return;

        // Pasar duración al módulo de canto
        const duration = this.charJson.sing_duration || 4;
        this.singHandler.setDuration(duration);

        if (this.charJson.flip_x) {
            this.setFlipX(true);
        }

        if (this.charJson.animations) {
            this.charJson.animations.forEach(anim => {
                if (anim.offsets) {
                    this.addOffset(anim.anim, anim.offsets[0], anim.offsets[1]);
                }
            });
        }

        const hasIdle = this.scene.anims.exists(`${this.textureKey}_idle`);
        this.danceIdle = hasIdle;
    }

    addOffset(name, x, y) {
        this.animOffsets.set(name, [x, y]);
    }

    playAnim(animName, ignoreIfPlaying = false, startFrame = 0) {
        const fullAnimKey = `${this.textureKey}_${animName}`;
        
        if (!this.scene.anims.exists(fullAnimKey)) {
            // Fallback delegado: si intenta cantar y falla, baila.
            if (animName.startsWith('sing')) {
                return this.dance(true);
            }
            return;
        }

        this.play({ key: fullAnimKey, startFrame: startFrame }, ignoreIfPlaying);
        
        const offsets = this.animOffsets.get(animName) || [0, 0];
        
        this.x = this.baseX + (offsets[0] * this.charScale);
        this.y = this.baseY + (offsets[1] * this.charScale);
    }

    dance(force = false) {
        if (!this.danceIdle && !this.scene.anims.exists(`${this.textureKey}_danceLeft`)) return;
        
        if (this.specialAnim && !force) return;

        // [MODIFICADO] Delegamos la decisión de "mantener nota" al módulo Sing
        if (!force && this.singHandler.shouldHold()) {
            return;
        }

        const ignoreIfPlaying = !force; 

        if (this.danceIdle) {
            this.playAnim('idle', ignoreIfPlaying);
        } else {
            this.isDancing = !this.isDancing;
            const step = this.isDancing ? 'danceRight' : 'danceLeft';
            this.playAnim(step, ignoreIfPlaying);
        }
    }

    /**
     * Delega el canto al módulo CharacterSing.
     */
    sing(direction, miss = false) {
        this.specialAnim = false;
        this.singHandler.sing(direction, miss);
    }

    /**
     * Delega el evento beat al módulo CharacterSing.
     */
    onBeat(beat) {
        this.singHandler.onBeat();
    }
}