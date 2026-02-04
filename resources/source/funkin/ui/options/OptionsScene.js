import bgParallax from "./bgParallax.js";
import HTMLMenu from "./HTMLMenu.js";
import Alphabet from "../../../utils/Alphabet.js";

export class OptionsScene extends Phaser.Scene {
    constructor() {
        super({ key: 'OptionsScene' });
        this.categoriesUI = null;
        this.centralUI = null;
        this.previewUI = null;
        this.parallax = null;
        this.inputHandler = null;
    }

    preload() {
        bgParallax.preloadAssets(this);
        HTMLMenu.preloadAssets(this);
        
        Alphabet.load(this);
        this.load.atlasXML(
            'optionsIcons', 
            'public/images/menu/options/OptionsButtonsIcons.png', 
            'public/images/menu/options/OptionsButtonsIcons.xml'
        );

        // --- NUEVO: Cargar sonido del menú ---
        this.load.audio('scrollMenu', 'public/sounds/scrollMenu.ogg');
    }

    create() {
        Alphabet.createAtlas(this);

        this.parallax = new bgParallax(this);
        this.parallax.init();

        this.htmlMenu = new HTMLMenu(this);
        this.htmlMenu.init();
    }

    update(time, delta) {
        if (this.parallax) {
            this.parallax.update();
        }
    }
}

game.scene.add('OptionsScene', OptionsScene, true);