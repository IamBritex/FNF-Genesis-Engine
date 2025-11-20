import { PropertiesWindow } from '../PropertiesWindow.js'; 

/**
 * Muestra u oculta la ventana de propiedades.
 * @param {import('../../StageEditor.js').StageEditor} scene La escena principal del editor.
 */
export function togglePropertiesWindow(scene) {
    if (scene.propertiesWindow) {
        scene.propertiesWindow.destroy();
    } else {
        scene.propertiesWindow = new PropertiesWindow(scene, scene.elementsManager, scene.stageCharacters);
        scene.setAsHUDElement(scene.propertiesWindow.domElement);
        
        scene.propertiesWindow.onDestroy = () => {
            scene.propertiesWindow = null;
            console.log("Ventana de propiedades cerrada.");
        };
    }
}