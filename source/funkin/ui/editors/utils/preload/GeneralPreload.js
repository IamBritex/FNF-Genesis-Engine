/**
 * source/funkin/ui/editors/utils/preload/GeneralPreload.js
 * Clase estática para gestionar la precarga de recursos comunes del editor.
 */
export default class GeneralPreload {
    /**
     * Carga los assets básicos (imágenes, sonidos, estilos) en la escena dada.
     * @param {Phaser.Scene} scene La escena que está realizando el preload.
     */
    static preload(scene) {
        scene.load.image('menuDesat', 'public/images/menu/bg/menuDesat.png');
        scene.load.audio('clickDown', 'public/sounds/editor/ClickDown.ogg');
        scene.load.audio('clickUp', 'public/sounds/editor/ClickUp.ogg');
        scene.load.audio('undo', 'public/sounds/editor/undo.ogg');
        scene.load.audio('chartEditorLoop', 'public/music/chartEditorLoop.ogg');

        // CSS Global
        scene.load.text('css_global', 'source/funkin/ui/editors/GUI/global.css');

        // [NUEVO] Templates HTML para los Paneles Dock (Izquierda y Derecha)
        // Usamos load.text porque ModularWindow espera un string HTML para parsearlo.
        scene.load.text('html_dock_left', 'source/funkin/ui/editors/GUI/spanish/window1_template.html');
        scene.load.text('html_dock_right', 'source/funkin/ui/editors/GUI/spanish/window2_template.html');
    }
}