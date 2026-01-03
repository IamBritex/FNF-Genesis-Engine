/**
 * source/funkin/ui/editors/components/UI/navBar/ExecuteModule.js
 * Clase encargada de interpretar y ejecutar los comandos del menú de navegación.
 */
export class ExecuteModule {
    /**
     * @param {import('../../../Editor.js').Editor} scene La escena principal del editor.
     */
    constructor(scene) {
        this.scene = scene;
    }

    /**
     * Ejecuta la acción correspondiente al módulo y método indicados.
     * @param {string} module El nombre del módulo (ej: 'Navigation', 'View').
     * @param {string} method El método específico (ej: 'exit', 'resetZoom').
     * @param {any} [value] Valor opcional (si se requiere).
     */
    execute(module, method, value) {
        console.log(`[ExecuteModule] Procesando comando: ${module}.${method}`);

        switch (`${module}.${method}`) {
            // --- NAVEGACIÓN ---
            case 'Navigation.exit':
                this.scene.returnToMenu();
                break;

            // --- VISTA / CÁMARA ---
            case 'View.resetZoom':
                // Restablecer variables de la cámara en la escena
                this.scene.baseZoom = 1.0;
                this.scene.baseScrollX = 0;
                this.scene.baseScrollY = 0;

                if (this.scene.toastManager) {
                    this.scene.toastManager.show("Vista", "Cámara restablecida");
                }
                break;

            // --- AYUDA ---
            case 'Help.about':
                if (this.scene.toastManager) {
                    this.scene.toastManager.show("Acerca de", "Genesis Engine v1.0");
                }
                break;

            // --- PROYECTO ---
            case 'Project.save':
                if (this.scene.toastManager) {
                    this.scene.toastManager.show("Guardar", "Pronto disponible...");
                }
                break;

            default:
                console.warn(`[ExecuteModule] No se encontró el comando: ${module}.${method}`);
                break;
        }
    }
}