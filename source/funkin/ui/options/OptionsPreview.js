import Alphabet from "../../../utils/Alphabet.js";
import AlphabetCanvasRenderer from "./AlphabetCanvasRenderer.js";

export default class OptionsPreview {
    constructor(scene) {
        this.scene = scene;
        this.domElement = null;
        this.currentAlphabet = null;
        this.retryCount = 0;
    }

    static preload(scene) {
        scene.load.html('optionsPreview', 'public/ui/menu/options/options_preview.html');
    }

    create(x, y) {
        this.domElement = this.scene.add.dom(x, y).createFromCache('optionsPreview');

        // Esperar un momento para asegurar renderizado DOM
        this.scene.time.delayedCall(100, () => {
            this.updateTitle("PREVIEW");
        });

        return this.domElement;
    }

    updateTitle(text) {
        if (!this.domElement) return;

        const canvas = this.domElement.node.querySelector('#preview-title-canvas');

        // Retry si el DOM aún no está listo
        if (canvas && canvas.clientWidth === 0 && this.retryCount < 10) {
            this.retryCount++;
            this.scene.time.delayedCall(50, () => this.updateTitle(text));
            return;
        }
        this.retryCount = 0;

        if (!canvas) return;

        // Limpiar anterior
        if (this.currentAlphabet) {
            this.currentAlphabet.destroy();
            this.currentAlphabet = null;
        }

        try {
            // --- AQUI ESTA LA MAGIA DEL TAMAÑO ---
            // Aumentamos la resolución interna para que quepa el texto grande
            canvas.width = 450;
            canvas.height = 110;

            // Crear Alphabet (bold = true para estilo Menu)
            this.currentAlphabet = new Alphabet(this.scene, 0, 0, text, true);

            // Forzar calculo de posiciones
            if (this.currentAlphabet.update) this.currentAlphabet.update();

            // Renderizar con escala GRANDE (0.9)
            // Esto asegura que se usen los sprites detallados y se vea igual al de la izquierda
            AlphabetCanvasRenderer.render(this.scene, this.currentAlphabet, canvas, 0, 'center', 0.9);

            this.currentAlphabet.setVisible(false);
            canvas.style.display = 'block';

        } catch (e) {
            console.error("[OptionsPreview] Render Error:", e);
            canvas.style.display = 'none';
        }
    }

    updateImage(imagePath) {
        if (!this.domElement) return;
        const imgEl = this.domElement.node.querySelector('#preview-image');

        if (imgEl) {
            const targetSrc = imagePath ? imagePath : "public/images/menu/options/under-construction.png";
            if (!imgEl.src.endsWith(targetSrc)) {
                imgEl.src = targetSrc;
            }
        }
    }
}