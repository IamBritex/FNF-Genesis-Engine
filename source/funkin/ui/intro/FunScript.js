/**
 * Clase FunScript
 * Maneja el Easter Egg "Konami Code": Inputs, Música Secreta y Shaders.
 * Ruta: source/funkin/ui/intro/FunScript.js
 */
export default class FunScript {
    /**
     * @param {Phaser.Scene} scene - La escena principal.
     * @param {Object} sprites - Referencia a los sprites { gf, logo }.
     * @param {Object} boopController - Referencia al controlador de BPM.
     */
    constructor(scene, sprites, boopController) {
        this.scene = scene;
        this.sprites = sprites;
        this.boopController = boopController;

        // Estado interno
        this.active = false;
        this.secretMusic = null;
        
        // CAMBIO: Usamos un Buffer (Array) en lugar de un índice simple.
        // Esto almacena las últimas teclas presionadas.
        this.inputBuffer = []; 
        this.beatCounter = 0;
        this.hueOffset = 0;

        // Secuencia: Izq, Der, Izq, Der, Arriba, Abajo, Arriba, Abajo
        this.sequence = [
            Phaser.Input.Keyboard.KeyCodes.LEFT,
            Phaser.Input.Keyboard.KeyCodes.RIGHT,
            Phaser.Input.Keyboard.KeyCodes.LEFT,
            Phaser.Input.Keyboard.KeyCodes.RIGHT,
            Phaser.Input.Keyboard.KeyCodes.UP,
            Phaser.Input.Keyboard.KeyCodes.DOWN,
            Phaser.Input.Keyboard.KeyCodes.UP,
            Phaser.Input.Keyboard.KeyCodes.DOWN
        ];

        this._listener = null;
    }

    /** Inicia la escucha de teclas */
    start() {
        if (this._listener) return;
        this._listener = (event) => this.checkInput(event.keyCode);
        this.scene.input.keyboard.on('keydown', this._listener);
    }

    /** * Procesa el input del usuario usando un Buffer deslizante.
     * Esto permite que el código funcione incluso si te equivocas antes de completarlo.
     */
    checkInput(keyCode) {
        if (this.active) return; // Si ya está activo, ignoramos inputs

        // 1. Añadimos la tecla actual al final del historial (buffer)
        this.inputBuffer.push(keyCode);

        // 2. Si el historial es más largo que la secuencia, borramos la tecla más vieja
        if (this.inputBuffer.length > this.sequence.length) {
            this.inputBuffer.shift();
        }

        // 3. Comprobamos si el historial actual COINCIDE exactamente con la secuencia
        if (this.checkBufferMatch()) {
            this.activateSecretMode();
            this.inputBuffer = []; // Limpiamos para evitar activaciones dobles
        }
    }

    /** Verifica si el contenido del buffer es idéntico a la secuencia requerida */
    checkBufferMatch() {
        if (this.inputBuffer.length !== this.sequence.length) return false;
        
        for (let i = 0; i < this.sequence.length; i++) {
            if (this.inputBuffer[i] !== this.sequence[i]) {
                return false;
            }
        }
        return true;
    }

    /** Activa la lógica secreta: Música, BPM y Shaders */
    activateSecretMode() {
        console.log("[FunScript] ¡Código Secreto Activado!");
        this.active = true;

        // 1. Efectos Visuales y Sonoros
        this.scene.cameras.main.flash(1000, 255, 255, 255);
        this.scene.sound.play("confirm", { volume: 0.7 });

        // 2. Manejo de Música
        this.scene.sound.stopAll();
        this.secretMusic = this.scene.sound.add("girlfriendsRingtone", { loop: true, volume: 0 });
        this.secretMusic.play();
        this.scene.tweens.add({ targets: this.secretMusic, volume: 1.0, duration: 4000 });

        // 3. Acelerar BPM (Girlfriends Ringtone es 160 BPM)
        if (this.boopController) this.boopController.setBPM(160);

        // 4. Inicializar y Aplicar Shader
        this.applyShader();
    }

    applyShader() {
        if (this.scene.game.renderer.type !== Phaser.WEBGL) return;

        const pipelineName = 'RainbowShader';
        
        if (!this.scene.renderer.pipelines.has(pipelineName)) {
            const fragShader = this.scene.cache.text.get('rainbowShader');
            
            if (!fragShader) {
                console.error("[FunScript] No se encontró el shader en cache. Verifica la clave en introDance.js");
                return;
            }

            // Clase de Pipeline Dinámico
            class RainbowPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
                constructor(game) {
                    super({
                        game: game,
                        renderTarget: true,
                        fragShader: fragShader
                    });
                }
                onPreRender() {
                    // Actualiza la variable uniforme uTime con el valor del registro
                    this.set1f('uTime', this.game.registry.get('hueOffset') || 0);
                }
            }

            this.scene.renderer.pipelines.addPostPipeline(pipelineName, RainbowPipeline);
        }

        // Aplicar a los sprites
        if (this.sprites.gf) this.sprites.gf.setPostPipeline(pipelineName);
        if (this.sprites.logo) this.sprites.logo.setPostPipeline(pipelineName);
    }

    /** Llamado por la escena principal en cada Beat */
    beatHit() {
        if (!this.active) return;

        this.beatCounter++;

        // Cambiar color cada 4 beats
        if (this.beatCounter % 4 === 0) {
            this.hueOffset += 0.125; // Desplazamiento de color
            this.scene.registry.set('hueOffset', this.hueOffset);
        }
    }

    /** Limpieza total al salir de la escena o apagar el script */
    shutdown() {
        // Detener escucha de teclado
        if (this._listener) {
            this.scene.input.keyboard.off('keydown', this._listener);
            this._listener = null;
        }

        // Detener música secreta si está sonando
        if (this.secretMusic) {
            this.secretMusic.stop();
            this.secretMusic = null;
        }

        // Remover Pipeline de los sprites (opcional, Phaser lo limpia al destruir sprites)
        if (this.active && this.scene.renderer.type === Phaser.WEBGL) {
             const pipelineName = 'RainbowShader';
             if (this.sprites.gf) this.sprites.gf.removePostPipeline(pipelineName);
             if (this.sprites.logo) this.sprites.logo.removePostPipeline(pipelineName);
        }

        this.active = false;
        this.inputBuffer = []; // Limpiar buffer
        this.beatCounter = 0;
        this.hueOffset = 0;
    }
}