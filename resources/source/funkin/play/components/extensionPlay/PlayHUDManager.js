import { Score } from "../../judgments/Score.js";
import { PopUpManager } from "../../judgments/PopUpManager.js";
import { Countdown } from "../../countDown.js";
import { TimeBar } from "../timeBar.js";
import { FunWaiting } from "../FunWaiting.js";
import { RatingText } from "../../judgments/RatingText.js";
import { PlayEvents } from "../../PlayEvents.js";

export class PlayHUDManager {
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

    create(cameraManager) {
        this.funWaiting = new FunWaiting(this.scene, cameraManager);
        this.funWaiting.createOverlay();

        this.scoreManager = new Score(this.scene);
        this.popUpManager = new PopUpManager(this.scene, cameraManager);
        this.countdown = new Countdown(this.scene, cameraManager);

        this.timeBar = new TimeBar(this.scene);
        this.timeBar.create();
        cameraManager.assignToUI(this.timeBar.container);

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.scene.events.on(PlayEvents.SONG_LOADING_COMPLETE, this.onLoadingComplete, this);
        this.scene.events.on(PlayEvents.SONG_START, this.onSongStart, this);
        this.scene.events.on(PlayEvents.HEALTH_CHANGED, this.onHealthChange, this);
    }

    /**
     * Recibe los componentes generados tardíamente (HealthBar, RatingText)
     * y oculta la pantalla de carga.
     * @param {object} data - { healthBar, ratingText }
     */
    onLoadingComplete(data) {
        // [FIX] Inyección de dependencias por evento
        if (data && data.healthBar) {
            this.healthBar = data.healthBar;
            // Asegurar profundidad y cámara correcta si no se hizo antes
            if (this.healthBar.container && this.scene.cameraManager) {
                this.healthBar.container.setDepth(1);
                this.scene.cameraManager.assignToUI(this.healthBar.container);
            }
        }

        if (data && data.ratingText) {
            this.ratingText = data.ratingText;
        }

        // Iniciar transición de salida
        if (this.funWaiting) {
            this.funWaiting.startFadeOut(null, 500);
        }
    }

    onSongStart(data) {
        if (this.timeBar) this.timeBar.setTotalDuration(data.duration || 0);
        
        if (this.healthBar) this.healthBar.show(250);
        if (this.ratingText) this.ratingText.show(250);
    }

    onHealthChange(data) {
        if (this.healthBar) {
            this.healthBar.setHealth(data.value);
        }
    }

    update(songPosition, delta) {
        if (this.timeBar) this.timeBar.update(songPosition);
        
        if (this.healthBar) {
            this.healthBar.updateHealth(delta / 1000); 
            this.healthBar.updateBeatBounce(songPosition, delta);
        }
    }

    startCountdown(beatLengthMs, callback) {
        if (this.countdown) {
            this.countdown.performCountdown(beatLengthMs, callback);
        } else {
            callback();
        }
    }

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
    }
}