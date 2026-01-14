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
        
        // Buffer de entrada (historial de teclas)
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

    /** Procesa el input del usuario usando un Buffer deslizante. */
    checkInput(keyCode) {
        if (this.active) return; // Si ya está activo, ignoramos inputs

        this.inputBuffer.push(keyCode);

        if (this.inputBuffer.length > this.sequence.length) {
            this.inputBuffer.shift();
        }

        if (this.checkBufferMatch()) {
            this.activateSecretMode();
            this.inputBuffer = [];
        }
    }

    /** Verifica si el contenido del buffer coincide con la secuencia */
    checkBufferMatch() {
        if (this.inputBuffer.length !== this.sequence.length) return false;
        
        for (let i = 0; i < this.sequence.length; i++) {
            if (this.inputBuffer[i] !== this.sequence[i]) {
                return false;
            }
        }
        return true;
    }

    /** Activa la lógica secreta */
    activateSecretMode() {
        console.log("[FunScript] ¡Código Secreto Activado!");
        this.active = true;

        // 1. PRIMERO detenemos cualquier música anterior (FreakyMenu, etc.)
        this.scene.sound.stopAll();

        // 2. AHORA reproducimos la confirmación (ya no se cortará)
        this.scene.sound.play("confirm", { volume: 1.0 });
        this.scene.cameras.main.flash(1000, 255, 255, 255);

        // 3. Inicializar Shader INMEDIATAMENTE
        this.hueOffset = 0.125;
        this.scene.registry.set('hueOffset', this.hueOffset);
        this.applyShader();

        // 4. Iniciar Música Secreta (con Fade In)
        this.secretMusic = this.scene.sound.add("girlfriendsRingtone", { loop: true, volume: 0 });
        this.secretMusic.play();
        this.scene.tweens.add({ targets: this.secretMusic, volume: 1.0, duration: 4000 });

        // 5. Acelerar BPM y reiniciar contadores
        if (this.boopController) this.boopController.setBPM(160);
        this.beatCounter = 0;
    }

    applyShader() {
        if (this.scene.game.renderer.type !== Phaser.WEBGL) return;

        const pipelineName = 'RainbowShader';
        
        if (!this.scene.renderer.pipelines.has(pipelineName)) {
            const fragShader = this.scene.cache.text.get('rainbowShader');
            
            if (!fragShader) {
                console.error("[FunScript] No se encontró el shader en cache.");
                return;
            }

            class RainbowPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
                constructor(game) {
                    super({
                        game: game,
                        renderTarget: true,
                        fragShader: fragShader
                    });
                }
                onPreRender() {
                    this.set1f('uTime', this.game.registry.get('hueOffset') || 0);
                }
            }

            this.scene.renderer.pipelines.addPostPipeline(pipelineName, RainbowPipeline);
        }

        if (this.sprites.gf) this.sprites.gf.setPostPipeline(pipelineName);
        if (this.sprites.logo) this.sprites.logo.setPostPipeline(pipelineName);
    }

    /** Llamado por la escena principal en cada Beat */
    beatHit() {
        if (!this.active) return;

        this.beatCounter++;

        if (this.beatCounter % 4 === 0) {
            this.hueOffset += 0.125;
            this.scene.registry.set('hueOffset', this.hueOffset);
        }
    }

    /** * Limpieza total.
     * [MODIFICADO] Ahora hace FadeOut si la música está sonando.
     */
    shutdown() {
        // Detener escucha de teclado
        if (this._listener) {
            this.scene.input.keyboard.off('keydown', this._listener);
            this._listener = null;
        }

        // Manejo de la música con FadeOut para la transición
        if (this.secretMusic) {
            if (this.secretMusic.isPlaying) {
                // Si está sonando, hacemos fadeout suave de 700ms
                this.scene.tweens.add({
                    targets: this.secretMusic,
                    volume: 0,
                    duration: 700,
                    onComplete: () => {
                        // Detener solo cuando termine el fade (si el objeto aún existe)
                        if (this.secretMusic) {
                            this.secretMusic.stop();
                            this.secretMusic = null;
                        }
                    }
                });
            } else {
                this.secretMusic.stop();
            }
            
            // Desvinculamos la referencia inmediatamente para que futuras llamadas a shutdown
            // (como la destrucción de la escena) no interfieran con el tween.
            this.secretMusic = null; 
        }

        // Limpieza de Shaders
        if (this.active && this.scene.renderer.type === Phaser.WEBGL) {
             const pipelineName = 'RainbowShader';
             if (this.sprites.gf) this.sprites.gf.removePostPipeline(pipelineName);
             if (this.sprites.logo) this.sprites.logo.removePostPipeline(pipelineName);
        }

        this.active = false;
        this.inputBuffer = [];
        this.beatCounter = 0;
        this.hueOffset = 0;
    }
}