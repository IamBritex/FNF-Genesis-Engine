import { Score } from "../../judgments/Score.js";
import { PopUpManager } from "../../judgments/PopUpManager.js";
import { Countdown } from "../../countDown.js";
import { TimeBar } from "../timeBar.js";
import { FunWaiting } from "../FunWaiting.js";
import { PlayEvents } from "../../PlayEvents.js";

/**
 * PlayHUDManager.js
 * Gestiona la capa visual superior (HUD) y coordina la visibilidad de los componentes de UI.
 */
export class PlayHUDManager {
    /**
     * @param {Phaser.Scene} scene - La instancia de PlayScene.
     */
    constructor(scene) {
        this.scene = scene;

        this.scoreManager = null;
        this.popUpManager = null;
        this.countdown = null;
        this.timeBar = null;
        this.healthBar = null;
        this.ratingText = null;
        this.funWaiting = null;
    }

    /**
     * Inicializa los componentes de la interfaz.
     * @param {import('../../camera/Camera.js').CameraManager} cameraManager 
     */
    create(cameraManager) {
        this.funWaiting = new FunWaiting(this.scene, cameraManager);
        this.funWaiting.createOverlay();

        this.scoreManager = new Score(this.scene);
        this.popUpManager = new PopUpManager(this.scene, cameraManager);
        this.countdown = new Countdown(this.scene, cameraManager);

        this.timeBar = new TimeBar(this.scene);
        this.timeBar.create();
        if (this.timeBar.container) {
            cameraManager.assignToUI(this.timeBar.container);
            this.timeBar.container.setAlpha(0); // Asegurar que no parpadee antes de tiempo
        }

        this.setupEventListeners();
    }

    /**
     * Configura los escuchas de eventos rítmicos y de estado.
     */
    setupEventListeners() {
        this.scene.events.on(PlayEvents.SONG_LOADING_COMPLETE, this.onLoadingComplete, this);
        this.scene.events.on(PlayEvents.SONG_START, this.onSongStart, this);
        this.scene.events.on(PlayEvents.HEALTH_CHANGED, this.onHealthChange, this);
    }

    /**
     * Activa los componentes cuando el proceso de carga ha finalizado.
     * @param {object} data - Contiene las referencias a componentes inyectados (healthBar, ratingText).
     */
    onLoadingComplete(data) {
        if (data && data.healthBar) {
            this.healthBar = data.healthBar;
            if (this.healthBar.container && this.scene.cameraManager) {
                this.scene.cameraManager.assignToUI(this.healthBar.container);
                this.healthBar.container.setDepth(150);
            }
        }

        // Inyectar RatingText generado en PlaySceneLoad
        if (data && data.ratingText) {
            this.ratingText = data.ratingText;
        }

        // Finalizar la pantalla de espera
        if (this.funWaiting) {
            this.funWaiting.startFadeOut(null, 500);
        }
    }

    /**
     * Se ejecuta cuando el audio de la canción comienza.
     * @param {object} data - Payload con la duración total de la canción.
     */
    onSongStart(data) {
        if (this.timeBar) {
            this.timeBar.setTotalDuration(data.duration || 0);
        }
        
        // Mostrar elementos de HUD con una transición suave
        if (this.healthBar) this.healthBar.show(250);
        if (this.ratingText) this.ratingText.show(250);
    }

    /**
     * Actualiza el valor de la salud en la barra.
     */
    onHealthChange(data) {
        if (this.healthBar) {
            this.healthBar.setHealth(data.value);
        }
    }

    /**
     * Loop de actualización para elementos visuales animados y barras de progreso.
     */
    update(songPosition, delta) {
        if (this.timeBar) {
            this.timeBar.update(songPosition);
        }
        
        if (this.healthBar) {
            this.healthBar.updateHealth(delta / 1000); 
            this.healthBar.updateBeatBounce(songPosition, delta);
        }
    }

    /**
     * Ejecuta la secuencia de cuenta regresiva previa al inicio.
     */
    startCountdown(beatLengthMs, callback) {
        if (this.countdown) {
            this.countdown.performCountdown(beatLengthMs, callback);
        } else {
            callback();
        }
    }

    /**
     * Limpia eventos y destruye instancias para liberar memoria.
     */
    destroy() {
        this.scene.events.off(PlayEvents.SONG_LOADING_COMPLETE, this.onLoadingComplete, this);
        this.scene.events.off(PlayEvents.SONG_START, this.onSongStart, this);
        this.scene.events.off(PlayEvents.HEALTH_CHANGED, this.onHealthChange, this);

        if (this.scoreManager) this.scoreManager.destroy();
        if (this.popUpManager) this.popUpManager.shutdown();
        if (this.countdown) this.countdown.stop();
        if (this.timeBar) this.timeBar.destroy();
        if (this.healthBar) this.healthBar.destroy();
        if (this.ratingText) this.ratingText.destroy();
        if (this.funWaiting) this.funWaiting.destroy();

        this.scene = null;
    }
}