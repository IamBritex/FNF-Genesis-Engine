import RenderizeAlphabet from '../../utils/RenderizeAlphabet.js';

export default class Labels {
    /**
     * Crea y renderiza el contenedor de la etiqueta (Label) de la opción.
     * @param {Phaser.Scene} scene - La escena actual.
     * @param {Object} opt - Datos de la opción.
     * @returns {HTMLElement} El elemento div que contiene el canvas del texto.
     */
    static create(scene, opt) {
        const labelContainer = document.createElement('div');
        labelContainer.style.flex = '1';
        labelContainer.style.display = 'flex';
        labelContainer.style.alignItems = 'center';
        labelContainer.style.overflow = 'visible';

        const labelCanvas = document.createElement('canvas');
        labelCanvas.height = 45;
        labelCanvas.style.height = '35px';
        labelCanvas.style.width = 'auto';

        RenderizeAlphabet.drawText(scene, labelCanvas, opt.label.toUpperCase(), 0.7);

        labelContainer.appendChild(labelCanvas);
        return labelContainer;
    }
}