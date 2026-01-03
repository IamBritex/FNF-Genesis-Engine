import OptionsCategories from "../../../funkin/ui/options/OptionsCategories.js";
import OptionsCentral from "../../../funkin/ui/options/OptionsCentral.js";
import OptionsPreview from "../../../funkin/ui/options/OptionsPreview.js";
import bgParallax from "./bgParallax.js";

export class OptionsScene extends Phaser.Scene {
    constructor() {
        super({ key: 'OptionsScene' });
        this.categoriesUI = null;
        this.centralUI = null;
        this.previewUI = null;
        this.parallax = null;
    }

    preload() {
        OptionsCategories.preload(this);
        OptionsCentral.preload(this);
        OptionsPreview.preload(this);
        bgParallax.preloadAssets(this);
    }

    create() {
        // 1. Fondo y Stage
        this.parallax = new bgParallax(this);
        this.parallax.init();

        // 2. Definir la función de cambio de categoría
        const onCategoryChange = (categoryName) => {
            if (this.centralUI) this.centralUI.updateTitle(categoryName);
            if (this.previewUI) this.previewUI.updateTitle(categoryName);
            // "esto que es, quien puso este log" - lol
            console.log("Categoría cambiada a: " + categoryName);
        };

        // 3. Crear instancias de UI
        this.categoriesUI = new OptionsCategories(this, onCategoryChange);
        this.centralUI = new OptionsCentral(this);
        this.previewUI = new OptionsPreview(this);

        // 4. Crear elementos DOM
        const optionsLeftDOM = this.categoriesUI.create(150, this.scale.height / 2);
        const optionsCenterDOM = this.centralUI.create(this.scale.width / 2, this.scale.height / 2);
        const optionsPreviewDOM = this.previewUI.create(this.scale.width - 150, this.scale.height / 2);

        // --- EL FIX AQUÍ ---
        // Obtenemos la primera categoría y forzamos la actualización manual
        // para que no aparezca vacío al iniciar.
        const firstCategory = this.categoriesUI.categories[0];
        if (firstCategory) {
            onCategoryChange(firstCategory);
            // Marcamos visualmente en el menú de la izquierda que la primera está seleccionada
            if (this.categoriesUI.updateSelection) {
                this.categoriesUI.updateSelection(0);
            }
        }

        // Tweens de entrada
        this.tweens.add({ targets: optionsLeftDOM, x: { from: -200, to: 150 }, alpha: { from: 0, to: 1 }, duration: 800, ease: 'Back.out' });
        this.tweens.add({ targets: optionsCenterDOM, y: { from: -200, to: this.scale.height / 2 }, alpha: { from: 0, to: 1 }, duration: 700, ease: 'Back.out' });
        this.tweens.add({ targets: optionsPreviewDOM, x: { from: 1270, to: this.scale.width - 150 }, alpha: { from: 0, to: 1 }, duration: 800, ease: 'Back.out' });

        this.input.keyboard.on('keydown-ESCAPE', () => {
            this.scene.start('MainMenuScene');
        });
    }

    update(time, delta) {
        if (this.parallax) {
            this.parallax.update();
        }
    }
}

game.scene.add('OptionsScene', OptionsScene, false);