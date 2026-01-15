/**
 * source/funkin/play/components/extensionPlay/PlayHUDManager.js
 * Gestor visual de la Interfaz de Usuario (HUD).
 */
import { Score } from "../../judgments/Score.js";
import { PopUpManager } from "../../judgments/PopUpManager.js";
import { Countdown } from "../../countDown.js";
import { TimeBar } from "../timeBar.js";
import { FunWaiting } from "../FunWaiting.js";
import { RatingText } from "../../judgments/RatingText.js";

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
    }

    onAssetsLoaded(cameraManager) {
        if (this.healthBar && this.healthBar.container) {
            this.healthBar.container.setDepth(1);
            cameraManager.assignToUI(this.healthBar.container);
        }

        this.ratingText = new RatingText(this.scene, this.scoreManager);
        if (this.ratingText.container) {
            cameraManager.assignToUI(this.ratingText.container);
            this.ratingText.container.setDepth(101);
        }
        
        if (this.funWaiting) {
            this.funWaiting.startFadeOut(() => {
                this.scene.isWaitingOnLoad = false;
                this.scene.startGameLogic();
            }, 500);
        }
    }

    update(songPosition, delta) {
        if (this.timeBar) this.timeBar.update(songPosition);
        
        if (this.healthBar) {
            this.healthBar.updateHealth(delta / 1000);
            this.healthBar.updateBeatBounce(songPosition, delta);
        }
    }

    damage(amount) {
        if (this.healthBar) this.healthBar.damage(amount);
    }

    heal(amount) {
        if (this.healthBar) this.healthBar.heal(amount);
    }

    setTotalTime(duration) {
        if (this.timeBar) this.timeBar.setTotalDuration(duration);
        
        // [MODIFICADO] Aparecer HealthBar y RatingText al ritmo
        if (this.healthBar && typeof this.healthBar.show === 'function') {
            this.healthBar.show(250);
        }
        if (this.ratingText && typeof this.ratingText.show === 'function') {
            this.ratingText.show(250);
        }
    }

    startCountdown(beatLengthMs, callback) {
        if (this.countdown) {
            this.countdown.performCountdown(beatLengthMs, callback);
        } else {
            callback();
        }
    }
}