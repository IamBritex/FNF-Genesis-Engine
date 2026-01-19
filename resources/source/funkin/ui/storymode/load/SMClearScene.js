import { SMData } from "../data/SMData.js";
import { SMDataFlow } from "../data/SMDataFlow.js";

export class SMClearScene {
    constructor(scene) {
        this.scene = scene;
    }

    /**
     * Limpia completamente la escena y sus componentes.
     * @param {Object} references - Objeto con referencias al handler y otros componentes.
     * @returns {Object} Nuevas instancias limpias de smData y dataFlow.
     */
    cleanup(references) {
        // 1. Destruir el manejador visual
        if (references.handler) {
            references.handler.destroy();
            references.handler = null;
        }

        // 2. Limpiar eventos de input
        this.scene.input.off('pointerdown');
        this.scene.input.off('pointerup');
        this.scene.input.off('wheel');

        // 3. Matar todos los tweens activos
        this.scene.tweens.killAll();

        // 4. Resetear el loader
        this.scene.load.reset();

        // 5. Reiniciar los datos (Factory reset)
        // Esto asegura que al volver a entrar no haya basura de la sesión anterior
        const newData = new SMData();
        const newFlow = new SMDataFlow(this.scene, newData);

        return { smData: newData, dataFlow: newFlow };
    }
}