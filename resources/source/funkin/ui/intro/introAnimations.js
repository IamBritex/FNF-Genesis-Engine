/**
 * Clase IntroAnimations
 * Se encarga de la creación de sprites y la lógica de animación visual
 * (GF bailando, Logo rebotando, Título parpadeando).
 */
export default class IntroAnimations {
    /**
     * @param {Phaser.Scene} scene - La escena principal.
     */
    constructor(scene) {
        this.scene = scene;
        
        // Referencias públicas a los sprites para que otros módulos (Transition/FunScript) las usen
        this.gf = null;
        this.logo = null;
        this.enterLogo = null;
    }

    /**
     * Inicializa los assets, crea las animaciones y posiciona los sprites.
     */
    create() {
        // 1. Definir índices para el baile de GF
        const leftIndices = [30, ...Array.from({ length: 15 }, (_, i) => i)];
        const rightIndices = Array.from({ length: 15 }, (_, i) => i + 15);

        // 2. Crear Animaciones en el registro de Phaser
        this._createAnimByIndices("gfDanceLeft", "gfDance", "gfDance", leftIndices, 24, false);
        this._createAnimByIndices("gfDanceRight", "gfDance", "gfDance", rightIndices, 24, false);
        this._createAnim("logoBumpin", "logo bumpin", "logoBumpin", 24, false);
        this._createAnim("enterIdle", "Press Enter to Begin", "titleEnter", 24, true);
        this._createAnim("enterPressed", "ENTER PRESSED", "titleEnter", 24, false);

        // 3. Crear y Posicionar Sprites
        this.gf = this.scene.add.sprite(560, 50, "gfDance").setOrigin(0, 0);
        this.logo = this.scene.add.sprite(-165, -140, "logoBumpin").setOrigin(0, 0).setScale(1.07);
        this.enterLogo = this.scene.add.sprite(600, 620, "titleEnter").setOrigin(0.5, 0.5);

        // 4. Estado inicial
        if (this.scene.anims.exists("enterIdle")) {
            this.enterLogo.play("enterIdle");
        }
    }

    /**
     * Se llama en cada beat para actualizar los visuales.
     * @param {boolean} danceLeft - Indica la dirección del baile.
     */
    beatHit(danceLeft) {
        if (this.gf && this.scene.anims.exists("gfDanceLeft") && this.scene.anims.exists("gfDanceRight")) {
            this.gf.play(danceLeft ? "gfDanceRight" : "gfDanceLeft", true);
        }

        if (this.logo && this.scene.anims.exists("logoBumpin")) {
            this.logo.play("logoBumpin", true);
        }
    }

    // --- MÉTODOS PRIVADOS DE AYUDA ---

    _createAnim(key, prefix, textureKey, fps, loop) {
        if (this.scene.anims.exists(key)) return;
        
        const texture = this.scene.textures.get(textureKey);
        const frames = texture.getFrameNames()
            .filter(name => name.startsWith(prefix))
            .map(name => ({ key: textureKey, frame: name }))
            .sort((a, b) => (a.frame > b.frame ? 1 : -1));

        if (frames.length > 0) {
            this.scene.anims.create({ key, frames, frameRate: fps, repeat: loop ? -1 : 0 });
        }
    }

    _createAnimByIndices(key, prefix, textureKey, indices, fps, loop) {
        if (this.scene.anims.exists(key)) return;

        const texture = this.scene.textures.get(textureKey);
        const allFrames = texture.getFrameNames().filter(name => name.startsWith(prefix)).sort();
        
        const animFrames = indices
            .map(i => (i < allFrames.length ? { key: textureKey, frame: allFrames[i] } : null))
            .filter(f => f);

        if (animFrames.length > 0) {
            this.scene.anims.create({ key, frames: animFrames, frameRate: fps, repeat: loop ? -1 : 0 });
        }
    }
}