import Alphabet from "../../../utils/Alphabet.js";
import AlphabetCanvasRenderer from "./AlphabetCanvasRenderer.js";

export default class OptionsCategories {
    /**
     * @param {Phaser.Scene} scene 
     * @param {Function} onSelectCallback - Funcion que se ejecuta al cambiar categoria
     */
    constructor(scene, onSelectCallback) {
        this.scene = scene;
        this.onSelectCallback = onSelectCallback;
        this.domElement = null;
        this.curSelected = 0;
        this.alphabetInstances = [];

        // Categorías disponibles
        this.categories = [
            "GENERAL", "GAMEPLAY", "CONTROLS", "AUDIO",
            "APPEARANCE", "PERFORMANCE", "ADVANCED", "ACCESSIBILITY", "DATA", "PROFILE"
        ];
    }

    static preload(scene) {
        // Carga el HTML y los assets necesarios para el renderer
        scene.load.html('optionsCategories', 'public/ui/menu/options/options_categories.html');
        scene.load.atlasXML('optionsTitle', 'public/assets/images/states/MainMenuState/options/menu_options.png', 'public/assets/images/states/MainMenuState/options/menu_options.xml');
    }

    create(x, y) {
        // 1. Crear el elemento DOM a partir del HTML
        this.domElement = this.scene.add.dom(x, y).createFromCache('optionsCategories');
        this.domElement.setOrigin(0, 0.5); // Alinear a la izquierda verticalmente centrado

        // 2. Renderizar los Alphabets en los Canvas (con pequeño delay para asegurar DOM listo)
        this.scene.time.delayedCall(50, () => {
            // Animación del título de opciones (si existe en el HTML)
            const titleCanvas = this.domElement.node.querySelector('#options-title-canvas');
            if (titleCanvas) {
                this.startInternalCanvasAnimation(titleCanvas, 'optionsTitle', 'options basic', 8);
            }

            // Renderizar las categorías
            this.setupCategoriesCanvas();

            // Seleccionar el primero visualmente
            this.updateSelection(0);
        });

        return this.domElement;
    }

    setupCategoriesCanvas() {
        let maxCategoryWidth = 0;
        const tempRenderList = [];

        // 1. Preparar instancias de Alphabet (Lógica Phaser)
        this.categories.forEach((catName, index) => {
            const alphabetGroup = new Alphabet(this.scene, 0, 0, catName, true);
            alphabetGroup.setVisible(false); // Oculto, solo lo usamos para renderizar al canvas
            this.alphabetInstances.push(alphabetGroup);

            // Calcular ancho para escalado uniforme (opcional)
            let currentWidth = 0;
            if (alphabetGroup.letters.length > 0) {
                const last = alphabetGroup.letters[alphabetGroup.letters.length - 1];
                currentWidth = last.x + (last.width * (last.scaleX || 1));
            }
            if (currentWidth > maxCategoryWidth) maxCategoryWidth = currentWidth;

            tempRenderList.push({ group: alphabetGroup, index: index });
        });

        // Calculo de escala (ajusta canvasResWidth según tu CSS)
        const canvasResWidth = 400;
        let uniformScale = Math.min(1.0, canvasResWidth / maxCategoryWidth);
        if (uniformScale < 0.6) uniformScale = 0.6; // Evitar que sean muy pequeños

        // 2. Renderizar al DOM
        tempRenderList.forEach(item => {
            const canvasEl = this.domElement.node.querySelector(`#cat-canvas-${item.index}`);
            const btnEl = this.domElement.node.querySelector(`#cat-btn-${item.index}`);

            if (canvasEl) {
                // AQUÍ OCURRE LA MAGIA: Renderizamos el Alphabet de Phaser dentro del Canvas HTML
                AlphabetCanvasRenderer.render(this.scene, item.group, canvasEl, 0, 'left', uniformScale);
            }

            if (btnEl) {
                // Click Listener para ratón
                btnEl.addEventListener('click', () => {
                    this.updateSelection(item.index);
                    if (this.scene.sound.get('scrollSound')) this.scene.sound.play('scrollSound');
                });
            }
        });
    }

    // --- MÉTODOS DE CONTROL (Conectados con OptionInput.js) ---

    changeSelection(diff) {
        let next = this.curSelected + diff;
        if (next >= this.categories.length) next = 0;
        if (next < 0) next = this.categories.length - 1;

        this.updateSelection(next);
    }

    updateSelection(index) {
        if (!this.domElement) return;

        this.curSelected = index;

        // Actualizar clases CSS 'active'
        const allBtns = this.domElement.node.querySelectorAll('.opt-cat-btn');
        allBtns.forEach((btn, idx) => {
            if (idx === this.curSelected) {
                btn.classList.add('active');
                btn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                btn.classList.remove('active');
            }
        });

        // Ejecutar callback para actualizar OptionsCentral
        if (this.onSelectCallback) {
            this.onSelectCallback(this.categories[index]);
        }
    }

    setFocus(focused) {
        // Efecto visual cuando sales/entras al panel de categorías
        if (this.domElement) {
            this.domElement.node.style.opacity = focused ? "1" : "0.4";
            this.domElement.node.style.pointerEvents = focused ? "auto" : "none";
        }
    }

    // --- UTILIDADES GRÁFICAS ---

    startInternalCanvasAnimation(canvasElement, textureKey, prefix, maxFrames) {
        const ctx = canvasElement.getContext('2d');
        const texture = this.scene.textures.get(textureKey);
        if (!texture || texture.key === '__MISSING') return;

        const sourceImage = texture.getSourceImage();
        const frames = [];

        // Recopilar frames del atlas XML/JSON
        for (let i = 0; i <= maxFrames; i++) {
            // Ajusta el nombre del frame según tu XML (ej: 'options basic0000', 'options basic0001')
            const name = `${prefix}000${i}`;
            const frameData = texture.get(name);
            if (frameData && frameData.name !== '__MISSING') frames.push(frameData);
        }

        if (frames.length === 0) return;

        let currentIndex = 0;
        // Timer de Phaser para la animación
        this.scene.time.addEvent({
            delay: 41, // ~24 fps
            loop: true,
            callback: () => {
                const f = frames[currentIndex];
                ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);

                // Dibujar frame actual
                ctx.drawImage(
                    sourceImage,
                    f.cutX, f.cutY, f.width, f.height,
                    0, 0, canvasElement.width, canvasElement.height
                );

                currentIndex++;
                if (currentIndex >= frames.length) currentIndex = 0;
            }
        });
    }
}