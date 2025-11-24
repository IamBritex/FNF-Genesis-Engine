/**
 * Countdown.js
 * Maneja la lógica y los visuales de la cuenta regresiva "Ready, Set, Go!".
 * Basado en la lógica de Countdown.hx.
 */

// Usamos un objeto simple para simular el enum 'CountdownStep'
const CountdownStep = {
    BEFORE: 'before',
    THREE: 'three', // Este paso sonará "intro3" pero no mostrará imagen
    TWO: 'two',     // Este paso mostrará "ready" y sonará "intro2"
    ONE: 'one',     // Este paso mostrará "set" y sonará "intro1"
    GO: 'go',       // Este paso mostrará "go" y sonará "introGo"
    AFTER: 'after'
};

export class Countdown {

    /**
     * @param {Phaser.Scene} scene - La escena (PlayState)
     * @param {import("./camera/Camera.js").CameraManager} cameraManager 
     */
    constructor(scene, cameraManager) {
        this.scene = scene;
        this.cameraManager = cameraManager;
        
        /** @type {Phaser.Time.TimerEvent} */
        this.countdownTimer = null; // El temporizador de Phaser
        
        this.countdownStep = CountdownStep.BEFORE;
        this.onCompleteCallback = null; // Función a llamar cuando termine
        
        // Almacenar tweens activos para pausarlos
        this.activeTweens = [];
    }

    /**
     * Precarga los assets necesarios para la cuenta regresiva.
     */
    static preload(scene) {
        // --- Gráficos ---
        const basePath = 'public/images/ui/countdown/funkin/';
        // scene.load.image('countdown_3', `${basePath}3.png`); 
        scene.load.image('countdown_2', `${basePath}ready.png`); // 'ready'
        scene.load.image('countdown_1', `${basePath}set.png`);   // 'set'
        scene.load.image('countdown_go', `${basePath}go.png`);

        // --- Sonidos ---
        const soundPath = 'public/sounds/gameplay/countdown/funkin/';
        scene.load.audio('intro3', `${soundPath}introTHREE.ogg`); // Sonido para '3'
        scene.load.audio('intro2', `${soundPath}introTWO.ogg`);   // Sonido para 'Ready'
        scene.load.audio('intro1', `${soundPath}introONE.ogg`);  // Sonido para 'Set'
        scene.load.audio('introGo', `${soundPath}introGO.ogg`);
    }

    /**
     * Inicia la secuencia de cuenta regresiva.
     * @param {number} beatLengthMs - La duración de un beat en milisegundos.
     * @param {function} onCompleteCallback - La función que se llamará cuando la cuenta termine.
     */
    performCountdown(beatLengthMs, onCompleteCallback) {
        this.stop(); // Detener cualquier cuenta regresiva anterior
        this.onCompleteCallback = onCompleteCallback;
        this.countdownStep = CountdownStep.BEFORE;
        
        this.countdownTimer = this.scene.time.addEvent({
            delay: beatLengthMs,
            callback: this._onBeat,
            callbackScope: this,
            repeat: 4 // Se llama 5 veces (1 inicial + 4 repeticiones)
        });
    }

    /**
     * Pausa el temporizador de la cuenta regresiva.
     * (Llamado por el menú de Pausa)
     */
    pause() {
        if (this.countdownTimer) {
            this.countdownTimer.paused = true;
        }
        // Pausar también los tweens visuales de la cuenta regresiva
        this.activeTweens.forEach(tween => {
            if (tween.isPlaying()) tween.pause();
        });
    }

    /**
     * Reanuda el temporizador de la cuenta regresiva.
     */
    resume() {
        if (this.countdownTimer) {
            this.countdownTimer.paused = false;
        }
        // Reanudar tweens visuales
        this.activeTweens.forEach(tween => {
            if (tween.isPaused()) tween.resume();
        });
    }

    /**
     * Detiene el temporizador de la cuenta regresiva.
     * NOTA: No destruye los tweens activos para permitir que el último fade-out termine (arregla el bug de "GO" pegado).
     */
    stop() {
        if (this.countdownTimer) {
            this.countdownTimer.destroy();
            this.countdownTimer = null;
        }
        // No detenemos los tweens aquí para que el último efecto visual termine naturalmente.
        // Si se necesita limpieza total (ej. salir de escena), Phaser destruirá los sprites hijos.
        this.activeTweens = [];
    }

    /**
     * Devuelve el siguiente estado de la cuenta regresiva.
     * @param {string} step - El estado actual.
     */
    _decrement(step) {
        switch (step) {
            case CountdownStep.BEFORE: return CountdownStep.THREE;
            case CountdownStep.THREE:  return CountdownStep.TWO;  
            case CountdownStep.TWO:    return CountdownStep.ONE;  
            case CountdownStep.ONE:    return CountdownStep.GO;   
            case CountdownStep.GO:     return CountdownStep.AFTER;
            default:                   return CountdownStep.AFTER;
        }
    }

    /**
     * Muestra el sprite de la cuenta regresiva (Ready, Set, Go)
     * y lo anima para que desaparezca.
     * @param {string} step - El estado actual (THREE, TWO, etc.)
     */
    _showCountdownGraphic(step) {
        let graphicKey = '';
        
        switch (step) {
            case CountdownStep.THREE: return; // No mostrar imagen para '3'
            case CountdownStep.TWO:   graphicKey = 'countdown_2'; break; // Ready
            case CountdownStep.ONE:   graphicKey = 'countdown_1'; break; // Set
            case CountdownStep.GO:    graphicKey = 'countdown_go'; break; // Go
            default: return;
        }

        if (!this.scene.textures.exists(graphicKey)) {
            console.warn(`Textura de cuenta regresiva no encontrada: ${graphicKey}`);
            return;
        }

        // Crear el sprite
        const sprite = this.scene.add.sprite(
            this.scene.cameras.main.width / 2,
            this.scene.cameras.main.height / 2,
            graphicKey
        );

        // Asignar a la cámara UI
        this.cameraManager.assignToUI(sprite);
        sprite.setOrigin(0.5, 0.5);
        sprite.setDepth(3000); // Encima de todo
        
        sprite.setScale(0.7);
        sprite.setAlpha(1);

        // Animación de aparición (Scale)
        const scaleTween = this.scene.tweens.add({
            targets: sprite,
            scale: 1,
            duration: this.countdownTimer.delay * 0.4, // 40% del beat
            ease: 'Cubic.easeOut'
        });
        this.activeTweens.push(scaleTween);

        // Animación de desvanecimiento (Alpha)
        const alphaTween = this.scene.tweens.add({
            targets: sprite,
            alpha: 0,
            duration: this.countdownTimer.delay * 0.6, // 60% del beat
            ease: 'Cubic.easeIn',
            delay: this.countdownTimer.delay * 0.4, // Empezar después de la aparición
            onComplete: () => {
                if (sprite.active) sprite.destroy();
                // Limpiar tweens del array
                this.activeTweens = this.activeTweens.filter(t => t !== scaleTween && t !== alphaTween);
            }
        });
        this.activeTweens.push(alphaTween);
    }

    /**
     * Reproduce el sonido de la cuenta regresiva.
     * @param {string} step 
     */
    _playCountdownSound(step) {
        let soundKey = '';
        switch (step) {
            case CountdownStep.THREE: soundKey = 'intro3'; break; // Suena "3"
            case CountdownStep.TWO:   soundKey = 'intro2'; break; // Suena "Ready"
            case CountdownStep.ONE:   soundKey = 'intro1'; break; // Suena "Set"
            case CountdownStep.GO:    soundKey = 'introGo'; break; // Suena "Go"
            default: return;
        }

        if (this.scene.cache.audio.has(soundKey)) {
            this.scene.sound.play(soundKey);
        }
    }


    /**
     * Se llama en cada beat de la cuenta regresiva.
     */
    _onBeat() {
        // 1. Avanzar al siguiente estado
        this.countdownStep = this._decrement(this.countdownStep);

        // 2. Mostrar el gráfico
        this._showCountdownGraphic(this.countdownStep);

        // 3. Reproducir el sonido
        this._playCountdownSound(this.countdownStep);

        // 4. Comprobar si ha terminado
        if (this.countdownStep === CountdownStep.AFTER) {
            if (this.onCompleteCallback) {
                this.onCompleteCallback(); // ¡Llamar al callback!
            }
            this.stop(); // Detener el temporizador
        }
    }
}