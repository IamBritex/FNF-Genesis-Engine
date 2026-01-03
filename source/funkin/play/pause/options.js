/**
 * options.js
 * Configuración y lógica del menú de pausa.
 */

export const PauseConfig = {
    title: "PAUSED",
    music: "public/music/breakfast.ogg",
    options: [
        {
            name: "Resume",
            action: "resume"
        },
        {
            name: "Restart Song",
            action: "restart"
        },
        {
            name: "Exit to Menu",
            action: "exit"
        }
    ]
};

export class PauseOptionsHandler {
    /**
     * Ejecuta la acción seleccionada.
     * @param {string} action - El ID de la acción.
     * @param {Phaser.Scene} playScene - Referencia a PlayScene (padre).
     * @param {Phaser.Scene} pauseScene - Referencia a PauseScene (actual).
     */
    static execute(action, playScene, pauseScene) {
        console.log(`[PauseOptions] Ejecutando: ${action}`);

        switch (action) {
            case "resume":
                pauseScene.resumeGame();
                break;

            case "restart":
                // Reinicia la PlayScene, asegurando que la pausa se limpie primero
                if (pauseScene.pauseMusic) pauseScene.pauseMusic.stop();
                pauseScene.scene.stop();

                playScene.scene.restart(playScene.initData);
                break;

            case "exit":
                // Llama al método de limpieza de PauseScene en lugar de llamar directo a PlayScene
                pauseScene.exitToMainMenu();
                break;

            default:
                console.warn(`Acción desconocida: ${action}`);
                break;
        }
    }
}