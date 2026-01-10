import OptionsCategories from "../../../funkin/ui/options/OptionsCategories.js";
import OptionsCentral from "../../../funkin/ui/options/OptionsCentral.js";
import OptionsPreview from "../../../funkin/ui/options/OptionsPreview.js";
import bgParallax from "./bgParallax.js";
import SaveUserPreferences from "./SaveUserPreferences.js";
import OptionInput from "./utils/OptionInput.js";

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
        this.load.audio('scrollSound', 'public/sounds/scrollMenu.ogg');
        this.load.audio('cancelSound', 'public/sounds/cancelMenu.ogg');
        this.load.audio('confirmSound', 'public/sounds/confirmMenu.ogg');

        OptionsCategories.preload(this);
        OptionsCentral.preload(this);
        OptionsPreview.preload(this);
        bgParallax.preloadAssets(this);
    }

    create() {
        SaveUserPreferences.init();

        this.parallax = new bgParallax(this);
        this.parallax.init();

        const onCategoryChange = (categoryName) => {
            if (this.centralUI) this.centralUI.updateTitle(categoryName);
            if (this.previewUI) this.previewUI.updateTitle(categoryName);
        };

        this.categoriesUI = new OptionsCategories(this, onCategoryChange);
        this.centralUI = new OptionsCentral(this);
        this.previewUI = new OptionsPreview(this);

        const optionsLeftDOM = this.categoriesUI.create(50, this.scale.height / 2);
        const optionsCenterDOM = this.centralUI.create(this.scale.width / 2, this.scale.height / 2);
        const optionsPreviewDOM = this.previewUI.create(this.scale.width - 150, this.scale.height / 2);

        this.inputHandler = new OptionInput(this, this.categoriesUI, this.centralUI);

        const firstCategory = this.categoriesUI.categories[0];
        if (firstCategory) {
            onCategoryChange(firstCategory);
            if (this.categoriesUI.updateSelection) {
                this.categoriesUI.updateSelection(0);
            }
        }

        this.tweens.add({ targets: optionsLeftDOM, x: { from: -200, to: 50 }, alpha: { from: 0, to: 1 }, duration: 800, ease: 'Back.out' });
        this.tweens.add({ targets: optionsCenterDOM, y: { from: -200, to: this.scale.height / 2 }, alpha: { from: 0, to: 1 }, duration: 700, ease: 'Back.out' });
        this.tweens.add({ targets: optionsPreviewDOM, x: { from: 1270, to: this.scale.width - 150 }, alpha: { from: 0, to: 1 }, duration: 800, ease: 'Back.out' });
    }

    update(time, delta) {
        if (this.parallax) {
            this.parallax.update();
        }
        if (this.inputHandler) {
            this.inputHandler.update();
        }
    }

    // Limpieza importante para eventos globales (document.addEventListener)
    shutdown() {
        if (this.inputHandler) {
            this.inputHandler.destroy();
            this.inputHandler = null;
        }
    }
}

game.scene.add('OptionsScene', OptionsScene, false);