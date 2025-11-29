import { EditorSettingsWindow } from '../../stageEditor/window/EditorSettingsWindow.js';
import { SureWindow } from '../window/Sure.js'; 

export class NavMethods {
    
    constructor(scene) {
        this.scene = scene;
    }

    execute(module, method) {
        console.log(`[NavMethods] Ejecutando: ${module}.${method}`);

        switch (`${module}.${method}`) {
            // --- NAVEGACIÓN ---
            case 'Navigation.exit':
                this.exitEditor();
                break;

            // --- CONFIGURACIÓN ---
            case 'Settings.open':
                this.openSettingsWindow();
                break;
            
            // --- HISTORIAL ---
            case 'History.undo':
                if (this.scene.history) this.scene.history.undo();
                break;

            case 'History.redo':
                if (this.scene.history) this.scene.history.redo();
                break;

            // --- ARCHIVO ---
            case 'File.new':
                this.checkUnsavedChanges(() => {
                    this.scene.promptNewCharacter();
                });
                break;

            case 'File.open': 
                this.checkUnsavedChanges(() => {
                    this.scene.openLoadWindow();
                });
                break;

            case 'File.save':
                if (this.scene.saveModule) this.scene.saveModule.save();
                break;

            case 'File.saveZip':
                if (this.scene.saveZipModule) this.scene.saveZipModule.save();
                break;

            // --- VER ---
            case 'Window.toggleProperties':
                this.scene.togglePropertiesWindow();
                break;

            case 'Window.toggleMapping':
                this.scene.toggleMappingWindow();
                break;

            // --- AYUDA (Nuevo) ---
            case 'Help.commands':
                if (this.scene.openKeybindingsWindow) {
                    this.scene.openKeybindingsWindow();
                }
                break;

            default:
                console.warn(`[NavMethods] Comando no reconocido: ${module}.${method}`);
                break;
        }
    }

    checkUnsavedChanges(actionCallback) {
        if (this.scene.currentCharacter) {
            new SureWindow(
                this.scene,
                () => { // SI
                    actionCallback();
                },
                async () => { // SI, PERO GUARDO
                    if (this.scene.saveZipModule) {
                        await this.scene.saveZipModule.save();
                        setTimeout(() => actionCallback(), 500);
                    } else {
                        actionCallback();
                    }
                },
                () => { // NO
                    // No hacer nada
                }
            );
        } else {
            actionCallback();
        }
    }

    openSettingsWindow() {
        if (this.scene.settingsWindow) {
            this.scene.settingsWindow.windowInstance.destroy();
        }
        this.scene.settingsWindow = new EditorSettingsWindow(this.scene, this.scene.globalConfig);
        this.scene.settingsWindow.windowInstance.onDestroy = () => {
            this.scene.settingsWindow = null;
        };
    }

    exitEditor() {
        this.scene.scene.start('MainMenuScene');
    }
}