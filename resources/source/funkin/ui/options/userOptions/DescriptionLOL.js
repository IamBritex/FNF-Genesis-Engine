export default class DescriptionLOL {
    /**
     * Renderiza la descripción de la opción en el contenedor inferior.
     * Utiliza estilos definidos en CSS para fuente VCR y centrado.
     * @param {HTMLElement} htmlElement - El elemento raíz del menú.
     * @param {Object} optionData - Datos completos de la opción seleccionada.
     * @param {string} lang - Código de idioma ('en', 'es', 'pt'). Default 'en'.
     */
    static render(htmlElement, optionData, lang = 'en') {
        const container = htmlElement.node.querySelector('.description-box');
        if (!container) return;

        // Limpiar
        container.innerHTML = '';

        if (!optionData) {
            // Mensaje por defecto si no hay opción seleccionada
            const placeholder = document.createElement('div');
            placeholder.className = 'desc-text';
            placeholder.style.opacity = '0.5';
            placeholder.textContent = "SELECT AN OPTION";
            container.appendChild(placeholder);
            return;
        }

        // 1. Título (Label de la opción)
        const titleDiv = document.createElement('div');
        titleDiv.className = 'desc-title';
        titleDiv.textContent = optionData.label || '';
        container.appendChild(titleDiv);

        // 2. Texto descriptivo
        const textDiv = document.createElement('div');
        textDiv.className = 'desc-text';

        let descriptionText = "No description available.";

        if (optionData.meta && optionData.meta.desc) {
            // Prioridad: Idioma solicitado > Inglés > Primer idioma disponible
            if (optionData.meta.desc[lang]) {
                descriptionText = optionData.meta.desc[lang];
            } else if (optionData.meta.desc['en']) {
                descriptionText = optionData.meta.desc['en'];
            } else {
                const keys = Object.keys(optionData.meta.desc);
                if (keys.length > 0) descriptionText = optionData.meta.desc[keys[0]];
            }
        }

        // Procesar saltos de línea si los hubiera (opcional, pero útil)
        textDiv.innerHTML = descriptionText.replace(/\n/g, '<br>');
        
        container.appendChild(textDiv);
    }
}