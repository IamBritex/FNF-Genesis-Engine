import Alphabet from "../../../utils/Alphabet.js";
import AlphabetCanvasRenderer from "./AlphabetCanvasRenderer.js";

export default class OptionsCategories {
    /**
     * @param {Phaser.Scene} scene 
     * @param {Function} onSelectCallback - Funcion que se ejecuta al cambiar categoria
     */
    constructor(scene, onSelectCallback) {
        this.scene = scene;
        this.onSelectCallback = onSelectCallback; // Guardamos el callback
        this.domElement = null;
        this.curSelected = 0;
        this.alphabetInstances = [];
        this.categories = ["GENERAL", "GAMEPLAY", "CONTROLS", "AUDIO", "APPEARANCE", "PERFORMANCE", "ADVANCED", "ACCESSIBILITY", "DATA", "PROFILE"];
    }

    static preload(scene) {
        scene.load.html('optionsForm', 'public/ui/menu/options/options_categories.html');
        scene.load.atlas('bold', 'public/assets/images/UI/bold.png', 'public/assets/images/UI/bold.json');
        scene.load.atlas('alphabet', 'public/assets/images/UI/bold.png', 'public/assets/images/UI/bold.json');
        scene.load.atlasXML('optionsTitle', 'public/assets/images/states/MainMenuState/options/menu_options.png', 'public/assets/images/states/MainMenuState/options/menu_options.xml');
    }

    create(x, y) {
        this.domElement = this.scene.add.dom(x, y).createFromCache('optionsForm');

        this.scene.time.delayedCall(200, () => {
            const titleCanvas = this.domElement.node.querySelector('#options-title-canvas');
            if (titleCanvas) {
                this.startInternalCanvasAnimation(titleCanvas, 'optionsTitle', 'options basic', 8);
            }
            this.setupCategoriesCanvas();
        });

        return this.domElement;
    }

    setupCategoriesCanvas() {
        let maxCategoryWidth = 0;
        const tempRenderList = [];

        this.categories.forEach((catName, index) => {
            const alphabetGroup = new Alphabet(this.scene, 0, 0, catName, true);
            alphabetGroup.setVisible(false);
            this.alphabetInstances.push(alphabetGroup);

            let currentWidth = 0;
            if (alphabetGroup.letters.length > 0) {
                const last = alphabetGroup.letters[alphabetGroup.letters.length - 1];
                currentWidth = last.x + (last.width * (last.scaleX || 1));
            }
            if (currentWidth > maxCategoryWidth) maxCategoryWidth = currentWidth;

            tempRenderList.push({ group: alphabetGroup, index: index });
        });

        const canvasResWidth = 500;
        let uniformScale = Math.min(1.1, canvasResWidth / maxCategoryWidth);
        const maxHeightScale = 80 / 70;
        if (uniformScale > maxHeightScale) uniformScale = maxHeightScale * 0.9;

        tempRenderList.forEach(item => {
            const canvasEl = this.domElement.node.querySelector(`#cat-canvas-${item.index}`);
            const btnEl = this.domElement.node.querySelector(`#cat-btn-${item.index}`);

            if (canvasEl) {
                AlphabetCanvasRenderer.render(this.scene, item.group, canvasEl, 0, 'left', uniformScale);
            }

            // --- AQUI AGREGAMOS LA INTERACTIVIDAD ---
            if (btnEl) {
                // 1. Click Listener
                btnEl.addEventListener('click', () => {
                    this.selectCategory(item.index);
                });

                // 2. Marcar el inicial
                if (item.index === this.curSelected) {
                    btnEl.classList.add('active');
                }
            }
        });
    }

    /**
     * Cambia la categoría seleccionada, actualiza visuales y avisa a la escena.
     * @param {number} index - Nuevo índice
     */
    selectCategory(index) {
        if (index === this.curSelected) return; // Ya estamos aqui

        // Sonido de scroll (Opcional, si tienes el asset cargado)
        // if(this.scene.sound.get('scrollMenu')) this.scene.sound.play('scrollMenu');

        this.curSelected = index;
        this.updateVisualSelection();

        // Ejecutar el callback para avisar a OptionsScene
        if (this.onSelectCallback) {
            const catName = this.categories[this.curSelected];
            this.onSelectCallback(catName, this.curSelected);
        }
    }

    updateVisualSelection() {
        // Quitamos 'active' de todos y lo ponemos solo en el seleccionado
        const allBtns = this.domElement.node.querySelectorAll('.opt-cat-btn');
        allBtns.forEach((btn, idx) => {
            if (idx === this.curSelected) {
                btn.classList.add('active');
                // Auto-scroll para que el seleccionado siempre sea visible
                btn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                btn.classList.remove('active');
            }
        });
    }

    // ... (startInternalCanvasAnimation sigue igual)
    startInternalCanvasAnimation(canvasElement, textureKey, prefix, maxFrames) {
        const ctx = canvasElement.getContext('2d');
        const texture = this.scene.textures.get(textureKey);
        if (!texture || texture.key === '__MISSING') return;
        const sourceImage = texture.getSourceImage();
        const frames = [];
        for (let i = 0; i <= maxFrames; i++) {
            const name = `${prefix}000${i}`;
            const frameData = texture.get(name);
            if (frameData && frameData.name !== '__MISSING') frames.push(frameData);
        }
        if (frames.length === 0) return;
        let currentIndex = 0;
        this.scene.time.addEvent({
            delay: 41, loop: true,
            callback: () => {
                const f = frames[currentIndex];
                ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
                ctx.drawImage(sourceImage, f.cutX, f.cutY, f.width, f.height, 0, 0, canvasElement.width, canvasElement.height);
                currentIndex++;
                if (currentIndex >= frames.length) currentIndex = 0;
            }
        });
    }
}