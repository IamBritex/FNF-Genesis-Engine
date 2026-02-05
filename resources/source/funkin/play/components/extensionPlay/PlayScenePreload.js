import { HealthBar } from "../../health/healthBar.js";
import { PopUpManager } from "../../judgments/PopUpManager.js";
import { Countdown } from "../../countDown.js";
import { TimeBar } from "../timeBar.js";

/**
 * PlayScenePreload.js
 * Encargado de cargar los recursos gráficos y de audio básicos
 * necesarios antes de que inicie la lógica principal del juego.
 */
export class PlayScenePreload {

    constructor(scene) {
        this.scene = scene;
    }

    preloadAll(sessionId) {
        // 1. UI Básica
        HealthBar.preload(this.scene, sessionId);
        TimeBar.preload(this.scene, sessionId);
        PopUpManager.preload(this.scene);
        Countdown.preload(this.scene);

        this._preloadSystemAudio();
    }

    _preloadSystemAudio() {
        const audioPath = 'public/sounds/gameplay/';
        
        // Sonidos de cuenta regresiva
        this.scene.load.audio('intro3', `${audioPath}intro3.ogg`);
        this.scene.load.audio('intro2', `${audioPath}intro2.ogg`);
        this.scene.load.audio('intro1', `${audioPath}intro1.ogg`);
        this.scene.load.audio('introGo', `${audioPath}introGo.ogg`);

        // Sonidos de interacción
        this.scene.load.audio('scrollMenu', 'public/sounds/scrollMenu.ogg');
        this.scene.load.audio('confirmMenu', 'public/sounds/confirmMenu.ogg');
        this.scene.load.audio('cancelMenu', 'public/sounds/cancelMenu.ogg');
    }
}