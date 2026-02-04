import RenderizeAlphabet from '../utils/RenderizeAlphabet.js';
import RendererPreview from './RendererPreview.js';
import DescriptionLOL from './DescriptionLOL.js';

export default class RendererCategories {

    /**
     * Renderiza la lista de opciones dentro de la categoría seleccionada.
     * @param {Phaser.Scene} scene - Escena actual (necesaria para texturas).
     * @param {HTMLElement} htmlElement - Elemento raíz del HTML.
     * @param {Array} options - Lista de opciones a renderizar.
     */
    static render(scene, htmlElement, options) {
        const optionsDiv = htmlElement.node.querySelector('.section-options');
        if (!optionsDiv) return;
        
        optionsDiv.innerHTML = '';

        if (!options || options.length === 0) {
            optionsDiv.innerHTML = '<div style="opacity:0.5; padding:20px; font-family: vcr, monospace;">Esta categoría está vacía</div>';
            RendererPreview.render(htmlElement, null);
            DescriptionLOL.render(htmlElement, null);
            return;
        }

        let firstSelectableFound = false;

        options.forEach((opt) => {
            // --- 1. HEADER (Visual, Centrado, Alphabet) ---
            if (opt.type === 'header') {
                const headerContainer = document.createElement('div');
                headerContainer.style.width = '100%';
                headerContainer.style.display = 'flex';
                headerContainer.style.justifyContent = 'center'; 
                headerContainer.style.padding = '30px 0 15px 0'; 
                headerContainer.style.pointerEvents = 'none'; 
                headerContainer.style.position = 'relative';
                headerContainer.style.overflow = 'visible';
                headerContainer.style.zIndex = '5';
                
                const headerCanvas = document.createElement('canvas');
                headerCanvas.height = 55; 
                headerCanvas.style.height = '100%'; 
                headerCanvas.style.width = 'auto'; 
                headerCanvas.style.filter = 'drop-shadow(0 4px 4px rgba(0,0,0,0.5))';

                // Renderizar texto del Header (Escala un poco mayor)
                RenderizeAlphabet.drawText(scene, headerCanvas, opt.label.toUpperCase(), 0.85);

                headerContainer.appendChild(headerCanvas);
                optionsDiv.appendChild(headerContainer);
                return; 
            }
            
            // --- 2. SPACER (Separador Invisible) ---
            if (opt.type === 'spacer') {
                const spacer = document.createElement('div');
                spacer.className = 'option-spacer';
                spacer.style.height = '40px'; 
                spacer.style.width = '100%';
                spacer.style.pointerEvents = 'none';
                
                optionsDiv.appendChild(spacer);
                return;
            }

            // --- 3. OPCIÓN INTERACTIVA ---
            const row = document.createElement('div');
            row.className = 'option-item';
            
            // Layout Flexbox: Extremos separados (Izquierda Label, Derecha Valor)
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.style.alignItems = 'center';
            row.style.padding = '10px 15px';
            
            // Auto-seleccionar el primero válido
            if (!firstSelectableFound) {
                row.classList.add('selected');
                RendererPreview.render(htmlElement, opt);
                DescriptionLOL.render(htmlElement, opt, 'en');
                firstSelectableFound = true;
            }

            // A. LABEL (Izquierda) -> AHORA ES UN CANVAS CON ALPHABET
            const labelContainer = document.createElement('div');
            labelContainer.style.flex = '1';
            labelContainer.style.display = 'flex';
            labelContainer.style.alignItems = 'center';
            labelContainer.style.justifyContent = 'flex-start';
            labelContainer.style.overflow = 'visible'; // Permitir sombras o efectos fuera

            const labelCanvas = document.createElement('canvas');
            labelCanvas.height = 45; // Altura fija base
            labelCanvas.style.height = '35px'; // Altura visual ajustada (más pequeña que headers)
            labelCanvas.style.width = 'auto'; 
            
            // Renderizar el Label usando Alphabet (Escala 0.7 para que quepa bien)
            RenderizeAlphabet.drawText(scene, labelCanvas, opt.label.toUpperCase(), 0.7);
            
            labelContainer.appendChild(labelCanvas);
            row.appendChild(labelContainer);
            
            // B. VALUE/KEYBINDS (Derecha)
            const valueContainer = document.createElement('div');
            valueContainer.className = 'option-value';
            valueContainer.style.display = 'flex';
            valueContainer.style.alignItems = 'center';
            valueContainer.style.justifyContent = 'flex-end'; 
            valueContainer.style.gap = '10px';

            if (opt.type === 'keybind' && Array.isArray(opt.default)) {
                // --- MODO TABLA PARA KEYBINDS ---
                const keys = [...opt.default];
                if (keys.length < 2) keys.push(null); 

                keys.forEach((key) => {
                    const keyCell = document.createElement('div');
                    keyCell.style.width = '100px'; 
                    keyCell.style.height = '40px';
                    keyCell.style.display = 'flex';
                    keyCell.style.alignItems = 'center';
                    keyCell.style.justifyContent = 'center';
                    
                    keyCell.style.background = 'rgba(0,0,0,0.4)';
                    keyCell.style.border = '2px solid rgba(255,255,255,0.1)';
                    keyCell.style.borderRadius = '8px';
                    keyCell.style.fontFamily = 'vcr, monospace'; 
                    keyCell.style.fontSize = '18px';
                    keyCell.style.color = key ? '#ffffff' : 'rgba(255,255,255,0.2)';
                    keyCell.textContent = key ? key : '---';
                    keyCell.style.boxShadow = 'inset 0 0 10px rgba(0,0,0,0.5)';

                    valueContainer.appendChild(keyCell);
                });
            } else {
                // --- MODO TEXTO NORMAL (VCR Font) ---
                valueContainer.textContent = this._formatValue(opt);
                valueContainer.style.fontFamily = 'vcr, monospace';
                valueContainer.style.fontSize = '22px'; // Texto valor un poco más grande
                valueContainer.style.color = '#DDDDDD';
            }

            row.appendChild(valueContainer);

            // Click Event
            row.onclick = () => {
                const allRows = optionsDiv.querySelectorAll('.option-item');
                allRows.forEach(r => r.classList.remove('selected'));
                
                row.classList.add('selected');
                
                RendererPreview.render(htmlElement, opt);
                DescriptionLOL.render(htmlElement, opt, 'en');
            };

            optionsDiv.appendChild(row);
        });
    }

    /**
     * Helper para formatear valores simples.
     */
    static _formatValue(opt) {
        if (opt.type === 'keybind') {
            if (Array.isArray(opt.default)) {
                const keys = opt.default.filter(k => k !== null && k !== undefined);
                return `Keys: ${keys.join(', ')}`;
            }
            if (opt.default) return `Key: ${opt.default}`;
            return '---';
        }
        
        if (opt.type === 'checkbox') return opt.default ? 'ON' : 'OFF';
        if (opt.type === 'slider') return `${opt.default}${opt.suffix || ''}`;
        if (opt.type === 'select') {
            if (Array.isArray(opt.options)) {
                const selected = opt.options.find(o => o.val === opt.default);
                return selected ? selected.text : opt.default;
            }
            return opt.default;
        }
        
        return opt.default;
    }
}