import { SongPlayer } from "../../song/SongPlayer.js";
import { ChartDataHandler } from "../../data/chartData.js";
import { PlaySceneData } from "../../data/PlaySceneData.js";

/**
 * PlaySceneCleanup.js
 * Módulo encargado de liberar recursos y limpiar la PlayScene al salir.
 */
export class PlaySceneCleanup {
    
    /**
     * Ejecuta la limpieza completa de la escena.
     * @param {Phaser.Scene} scene - La instancia de PlayScene a limpiar.
     */
    static shutdown(scene) {
        // 1. Limpieza de Inputs y Eventos
        if (scene.input) {
            scene.input.keyboard.removeAllKeys();
            scene.input.removeAllListeners();
        }
        if (scene.time) scene.time.removeAllEvents();
        if (scene.tweens) scene.tweens.killAll();

        if (window.gsap) gsap.globalTimeline.clear();

        // Limpiar handler de blur
        if (scene.onWindowBlur && scene.game && scene.game.events) {
            scene.game.events.off('blur', scene.onWindowBlur);
            scene.onWindowBlur = null;
        }

        // 2. Detener Audio
        if (scene.game && scene.game.sound) {
            scene.game.sound.stopAll();
        }

        // 3. Limpiar Loader
        if (scene.load) {
            scene.load.removeAllListeners(); 
        }
        
        // 4. Destruir Sub-Sistemas
        if (scene.scriptHandler) {
            scene.scriptHandler.destroy();
            scene.scriptHandler = null;
        }

        if (scene.scene && typeof scene.scene.stop === 'function') {
            scene.scene.stop('PauseScene');
        }

        if (scene.notesHandler) {
            scene.notesHandler.shutdown();
            scene.notesHandler = null;
        }
        if (scene.charactersHandler) {
            scene.charactersHandler.shutdown();
            scene.charactersHandler = null;
        }
        if (scene.stageHandler) {
            scene.stageHandler.shutdown();
            scene.stageHandler = null;
        }

        // 5. Destruir UI
        if (scene.children) {
            scene.children.removeAll(true);
        }

        if (scene.healthBar) { scene.healthBar.destroy(); scene.healthBar = null; }
        if (scene.timeBar) { scene.timeBar.destroy(); scene.timeBar = null; }
        if (scene.ratingText) { scene.ratingText.destroy(); scene.ratingText = null; }
        if (scene.scoreManager) { scene.scoreManager.destroy(); scene.scoreManager = null; }
        if (scene.funWaiting) { 
            if(scene.funWaiting.destroy) scene.funWaiting.destroy(); 
            scene.funWaiting = null; 
        }

        if (scene.cameraManager) {
            scene.cameraManager.shutdown(scene);
            scene.cameraManager = null;
        }

        if (scene.popUpManager) {
            scene.popUpManager.shutdown();
            scene.popUpManager = null;
        }

        if (scene.countdown) {
            scene.countdown.stop();
            scene.countdown = null;
        }

        if (scene.conductor) {
            scene.conductor.stop();
            scene.conductor = null;
        }

        // 6. Limpieza de Datos
        SongPlayer.shutdown(scene, scene.chartData, scene.songAudio);
        ChartDataHandler.shutdown(scene, scene.initData?.targetSongId, scene.initData?.DifficultyID || "normal");
        PlaySceneData.shutdown(scene);

        scene.playSessionId = null;
        scene.tempNoteSkin = null;

        console.log("[PlaySceneCleanup] Limpieza completada.");
    }
}