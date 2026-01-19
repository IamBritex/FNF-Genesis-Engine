/**
 * MainMenuOptions.js
 * Configuración estática y carga de recursos para el Menú Principal.
 */
export class MainMenuOptions {

    /**
     * Precarga los atlas necesarios para el menú.
     * @param {Phaser.Scene} scene - La escena actual.
     */
    static preload(scene) {
        const path = 'public/images/menu/mainmenu/';
        scene.load.atlasXML('storymode', `${path}storymode.png`, `${path}storymode.xml`);
        scene.load.atlasXML('freeplay', `${path}freeplay.png`, `${path}freeplay.xml`);
        scene.load.atlasXML('options', `${path}options.png`, `${path}options.xml`);
        scene.load.atlasXML('multiplayer', `${path}multiplayer.png`, `${path}multiplayer.xml`);
        scene.load.atlasXML('credits', `${path}credits.png`, `${path}credits.xml`);
    }

    /**
     * Devuelve la configuración de datos para los sprites del menú basada en el tamaño de pantalla.
     * @param {number} width - Ancho del juego.
     * @param {number} height - Alto del juego.
     */
    static getSpriteData(width, height) {
        const frameRate = 24;
        const spacing = 160;
        const startY = height / 2 - (spacing * (5 - 1)) / 2;
        const centerX = width / 2;
        const itemX = centerX + 35;
        const bgScrollFactor = 0.10;

        return {
            bg: { x: centerX, y: height / 2, scale: 1.2, scrollFactor: bgScrollFactor, depth: 1 },
            flash: { x: centerX, y: height / 2, scale: 1.2, scrollFactor: bgScrollFactor, depth: 2 },
            items: [
                {
                    id: 'storymode', texture: 'storymode', scene: 'StoryModeScene',
                    x: itemX, y: startY, origin: { x: 0.5, y: 0.5 }, depth: 10, scrollFactor: { x: 1, y: 0.4 },
                    animations: [
                        { name: 'storymode idle', anim: 'idle', fps: frameRate, loop: true, indices: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
                        { name: 'storymode selected', anim: 'selected', fps: frameRate, loop: true, indices: [0, 1, 2] }
                    ]
                },
                {
                    id: 'freeplay', texture: 'freeplay', scene: 'FreeplayScene',
                    x: itemX, y: startY + spacing, origin: { x: 0.5, y: 0.5 }, depth: 10, scrollFactor: { x: 1, y: 0.4 },
                    animations: [
                        { name: 'freeplay idle', anim: 'idle', fps: frameRate, loop: true },
                        { name: 'freeplay selected', anim: 'selected', fps: frameRate, loop: true }
                    ]
                },
                {
                    id: 'multiplayer', texture: 'multiplayer', scene: 'RoomsScene',
                    x: itemX, y: startY + (spacing * 2), origin: { x: 0.5, y: 0.5 }, depth: 10, scrollFactor: { x: 1, y: 0.4 },
                    animations: [
                        { name: 'multiplayer basic', anim: 'idle', fps: frameRate, loop: true },
                        { name: 'multiplayer white', anim: 'selected', fps: frameRate, loop: true }
                    ]
                },
                {
                    id: 'options', texture: 'options', scene: 'OptionsScene',
                    x: itemX, y: startY + (spacing * 3), origin: { x: 0.5, y: 0.5 }, depth: 10, scrollFactor: { x: 1, y: 0.4 },
                    animations: [
                        { name: 'options idle', anim: 'idle', fps: frameRate, loop: true },
                        { name: 'options selected', anim: 'selected', fps: frameRate, loop: true }
                    ]
                },
                {
                    id: 'credits', texture: 'credits', scene: 'CreditsScene',
                    x: itemX, y: startY + (spacing * 4), origin: { x: 0.5, y: 0.5 }, depth: 10, scrollFactor: { x: 1, y: 0.4 },
                    animations: [
                        { name: 'credits idle', anim: 'idle', fps: frameRate, loop: true },
                        { name: 'credits selected', anim: 'selected', fps: frameRate, loop: true }
                    ]
                }
            ]
        };
    }
}