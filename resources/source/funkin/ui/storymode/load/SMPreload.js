export class SMPreload {
    constructor(scene) {
        this.scene = scene;
    }

    loadStaticAssets() {
        console.log("SMPreload: Loading static assets...");
        
        // Listas y UI base
        this.scene.load.text('weekList', 'public/data/ui/weeks.txt');
        this.scene.load.image('tracksLabel', 'public/images/menu/storymode/Menu_Tracks.png');
        
        // Sonidos
        this.scene.load.audio('scrollSound', 'public/sounds/scrollMenu.ogg');
        this.scene.load.audio('confirmSound', 'public/sounds/confirmMenu.ogg');
        this.scene.load.audio('cancelSound', 'public/sounds/cancelMenu.ogg');
        this.scene.load.audio("freakyMenu", "public/sounds/FreakyMenu.mp3");

        // Fuentes
        this.scene.load.font('VCR', 'public/fonts/vcr.ttf');

        // Dificultades (Estáticas por defecto)
        const difficulties = ["easy", "normal", "hard"];
        difficulties.forEach(diff => {
            this.scene.load.image(diff, `public/images/menu/storymode/difficults/${diff}.png`);
        });

        // UI Sprites
        this.scene.load.atlasXML(
            'storymenu/arrows',
            'public/images/menu/storymode/arrows.png',
            'public/images/menu/storymode/arrows.xml'
        );
    }
}