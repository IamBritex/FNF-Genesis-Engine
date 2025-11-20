import { exitEditor } from '../input/shortCuts.js';
import { toggleBoundingBox } from '../camera/CamerasBoxes.js';
import { togglePropertiesWindow } from '../window/properties/toogle.js';
import { EditorSettingsWindow } from '../window/EditorSettingsWindow.js'; // Importar ventana de settings

/**
 * Clase que actúa como el "controlador" para la barra de navegación.
 * Recibe eventos de la NavBar y los delega a los sistemas correspondientes.
 */
export class NavMethods {

    /**
     * @param {import('../StageEditor.js').StageEditor} scene La instancia de la escena StageEditor.
     */
    constructor(scene) {
        this.scene = scene;
    }

    /**
     * Función central que recibe los clics de la barra de navegación.
     * @param {string} module El módulo (ej. 'Stage', 'History')
     * @param {string} method El método (ej. 'save', 'undo')
     */
    execute(module, method) {
        console.log(`executeModule llamado: module="${module}", method="${method}"`);
        
        const scene = this.scene;
        
        if (module === 'Stage' && method.startsWith('loadRecent-')) {
            const stageName = method.replace('loadRecent-', '');
            scene.editorMethods.requestLoadRecent(stageName);
            return;
        }

        switch (`${module}.${method}`) {
            // --- Métodos de EditorMethods ---
            case 'Stage.new':
                scene.editorMethods.requestNewScene();
                break;
            case 'Stage.load':
                scene.editorMethods.requestNewScene(); // Reutilizamos el flujo de "Nueva Escena"
                break;
            case 'View.toggleFloor':
                scene.editorMethods.toggleFloor();
                break;

            // --- Métodos de Módulos Específicos ---
            case 'Stage.save':
                scene.saveManager.save();
                break;
            case 'Stage.saveEhh':
                scene.saveAsManager.saveAsZip();
                break;
            case 'Navigation.exit':
                exitEditor(scene);
                break;
            case 'View.toggleBoundingBox':
                toggleBoundingBox(scene.elementsManager);
                break;
            case 'Window.toggleProperties':
                togglePropertiesWindow(scene);
                break;
            
            // --- Casos de Auto-Guardado ---
            case 'Stage.setAutoSave-0':
                scene.saveManager.setAutoSave(0);
                break;
            case 'Stage.setAutoSave-5':
                scene.saveManager.setAutoSave(5);
                break;
            case 'Stage.setAutoSave-10':
                scene.saveManager.setAutoSave(10);
                break;
            case 'Stage.setAutoSave-15':
                scene.saveManager.setAutoSave(15);
                break;

            // --- Métodos de Instancias de Escena ---
            case 'History.undo':
                if (scene.actionHistory) scene.actionHistory.undo();
                break;
            case 'History.redo':
                if (scene.actionHistory) scene.actionHistory.redo();
                break;
            
            case 'Test.toggle':
                if (scene.testManager) scene.testManager.toggle();
                break;
                
            case 'Cameras.cameraFields':
                scene.isCamBoxVisible = !scene.isCamBoxVisible;
                if (scene.camerasBoxes) {
                    scene.camerasBoxes.setVisible(scene.isCamBoxVisible);
                }
                break;
                
            // --- Casos de Edición ---
            case 'Edit.duplicate':
                if (scene.clipboard) scene.clipboard.duplicateSelectedElement();
                break;
            case 'Edit.copy':
                if (scene.clipboard) scene.clipboard.copySelectedElement();
                break;
            case 'Edit.paste':
                if (scene.clipboard) scene.clipboard.pasteFromClipboard();
                break;
            case 'Edit.find':
                if (scene.editorMethods) scene.editorMethods.openFindWindow();
                break;
                
            // --- Casos de Ayuda ---
            case 'Help.commands':
                if (scene.editorMethods) scene.editorMethods.openKeybindingsWindow();
                break;
            case 'Help.documentation':
                if (scene.editorMethods) scene.editorMethods.openDocumentation();
                break;
            case 'Help.youtube':
                if (scene.editorMethods) scene.editorMethods.openYoutube();
                break;
            case 'Help.about':
                scene.toastManager.show("Acerca de", "FNF Genesis Engine Editor");
                break;
                
            // --- CONFIGURACIÓN ---
            case 'Settings.editorPrefs':
                if (scene.settingsWindow) {
                    scene.settingsWindow.windowInstance.destroy();
                }
                // Abrir la ventana de configuración pasándole la config global
                scene.settingsWindow = new EditorSettingsWindow(scene, scene.globalConfig);
                
                // Limpiar referencia al cerrar
                scene.settingsWindow.windowInstance.onDestroy = () => {
                    scene.settingsWindow = null;
                };
                break;
            
            default: 
                console.warn(`NavBar: Método desconocido '${module}.${method}'`);
        }
    }
}