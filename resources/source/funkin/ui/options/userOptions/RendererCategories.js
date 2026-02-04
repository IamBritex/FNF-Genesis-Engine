import RenderizeAlphabet from '../utils/RenderizeAlphabet.js';
import RendererPreview from './RendererPreview.js';
import DescriptionLOL from './DescriptionLOL.js';

export default class RendererCategories {

    /**
     * Renderiza la lista de opciones dentro de la categoría seleccionada.
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
            // Validación: Si no hay label, saltamos esta opción
            if (!opt || !opt.label) {
                return;
            }

            // --- 1. HEADER (Visual) ---
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
                headerCanvas.style.overflow = 'visible';
                headerCanvas.style.filter = 'drop-shadow(0 4px 4px rgba(0,0,0,0.5))';

                RenderizeAlphabet.drawText(scene, headerCanvas, opt.label.toUpperCase(), 0.85);

                headerContainer.appendChild(headerCanvas);
                optionsDiv.appendChild(headerContainer);
                return; 
            }
            
            // --- 2. SPACER ---
            if (opt.type === 'spacer') {
                const spacer = document.createElement('div');
                spacer.style.height = '40px'; 
                spacer.style.width = '100%';
                spacer.style.pointerEvents = 'none';
                optionsDiv.appendChild(spacer);
                return;
            }

            // --- 3. OPCIÓN INTERACTIVA ---
            const row = document.createElement('div');
            row.className = 'option-item';
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.style.alignItems = 'center';
            row.style.padding = '10px 15px';
            row.style.overflow = 'visible';
            
            if (!firstSelectableFound) {
                row.classList.add('selected');
                RendererPreview.render(htmlElement, opt);
                DescriptionLOL.render(htmlElement, opt, 'en');
                firstSelectableFound = true;
            }

            // A. LABEL (Alphabet Canvas)
            const labelContainer = document.createElement('div');
            labelContainer.style.flex = '1';
            labelContainer.style.display = 'flex';
            labelContainer.style.alignItems = 'center';
            labelContainer.style.overflow = 'visible'; 

            const labelCanvas = document.createElement('canvas');
            labelCanvas.height = 45; 
            labelCanvas.style.height = '35px'; 
            labelCanvas.style.width = 'auto'; 
            labelCanvas.style.overflow = 'visible';
            
            RenderizeAlphabet.drawText(scene, labelCanvas, opt.label.toUpperCase(), 0.7);
            
            labelContainer.appendChild(labelCanvas);
            row.appendChild(labelContainer);
            
            // B. VALUE / INPUTS (Derecha)
            const valueContainer = document.createElement('div');
            valueContainer.className = 'option-value';
            valueContainer.style.display = 'flex';
            valueContainer.style.alignItems = 'center';
            valueContainer.style.justifyContent = 'flex-end'; 
            valueContainer.style.gap = '15px';

            // --- RENDERIZADO POR TIPO DE INPUT ---
            if (opt.type === 'slider') {
                const sliderLabel = document.createElement('span');
                sliderLabel.style.fontFamily = 'vcr, monospace';
                sliderLabel.style.fontSize = '20px';
                sliderLabel.style.minWidth = '50px';
                sliderLabel.style.textAlign = 'right';
                sliderLabel.textContent = `${opt.default}${opt.suffix || ''}`;

                const slider = document.createElement('input');
                slider.type = 'range';
                slider.min = opt.min || 0;
                slider.max = opt.max || 100;
                slider.step = opt.step || 1;
                slider.value = opt.default;
                slider.className = 'option-slider-input';

                slider.oninput = () => {
                    sliderLabel.textContent = `${slider.value}${opt.suffix || ''}`;
                };

                valueContainer.appendChild(slider);
                valueContainer.appendChild(sliderLabel);

            } else if (opt.type === 'keybind' && Array.isArray(opt.default)) {
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
                    keyCell.textContent = key ? key : '---';
                    valueContainer.appendChild(keyCell);
                });
            } else {
                valueContainer.textContent = this._formatValue(opt);
                valueContainer.style.fontFamily = 'vcr, monospace';
                valueContainer.style.fontSize = '22px';
            }

            row.appendChild(valueContainer);

            row.onclick = (e) => {
                const allRows = optionsDiv.querySelectorAll('.option-item');
                allRows.forEach(r => r.classList.remove('selected'));
                row.classList.add('selected');
                RendererPreview.render(htmlElement, opt);
                DescriptionLOL.render(htmlElement, opt, 'en');
            };

            optionsDiv.appendChild(row);
        });
    }

    static _formatValue(opt) {
        if (opt.type === 'checkbox') return opt.default ? 'ON' : 'OFF';
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