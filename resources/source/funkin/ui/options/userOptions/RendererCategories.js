import RenderizeAlphabet from '../utils/RenderizeAlphabet.js';
import RendererPreview from './RendererPreview.js';
import DescriptionLOL from './DescriptionLOL.js';
import RenderizeCheckbox from '../utils/RenderizeCheckbox.js';

// --- IMPORTACIÓN DE MÓDULOS ---
import Labels from './modules/Labels.js';
import Inputs from './modules/Inputs.js';

export default class RendererCategories {

    static updateListener = null;

    static render(scene, htmlElement, options) {
        // Limpieza del listener previo
        if (this.updateListener) {
            scene.events.off('update', this.updateListener);
            this.updateListener = null;
        }

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
        const activeCheckboxes = []; 

        options.forEach((opt, index) => {
            if (!opt || !opt.label) return;

            // Z-Index Descendente para corregir solapamiento de márgenes negativos
            const zIndexValue = options.length - index;

            // --- HEADER ---
            if (opt.type === 'header') {
                const headerContainer = document.createElement('div');
                headerContainer.style.width = '100%';
                headerContainer.style.display = 'flex';
                headerContainer.style.justifyContent = 'center'; 
                headerContainer.style.padding = '30px 0 15px 0'; 
                headerContainer.style.pointerEvents = 'none'; 
                headerContainer.style.position = 'relative';
                headerContainer.style.zIndex = zIndexValue;
                
                const headerCanvas = document.createElement('canvas');
                headerCanvas.height = 55; 
                headerCanvas.style.height = '100%'; 
                headerCanvas.style.width = 'auto'; 
                headerCanvas.style.filter = 'drop-shadow(0 4px 4px rgba(0,0,0,0.5))';

                RenderizeAlphabet.drawText(scene, headerCanvas, opt.label.toUpperCase(), 0.85);

                headerContainer.appendChild(headerCanvas);
                optionsDiv.appendChild(headerContainer);
                return; 
            }
            
            // --- SPACER ---
            if (opt.type === 'spacer') {
                const spacer = document.createElement('div');
                spacer.style.height = '40px'; 
                spacer.style.width = '100%';
                spacer.style.pointerEvents = 'none';
                spacer.style.position = 'relative';
                spacer.style.zIndex = zIndexValue;
                optionsDiv.appendChild(spacer);
                return;
            }

            // --- OPCIÓN ---
            const row = document.createElement('div');
            row.className = 'option-item';
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.style.alignItems = 'center'; 
            row.style.padding = '10px 15px';
            row.style.overflow = 'visible';
            row.style.position = 'relative';
            row.style.zIndex = zIndexValue;
            
            // Callback centralizado para selección
            const onSelectCallback = () => {
                const allRows = optionsDiv.querySelectorAll('.option-item');
                allRows.forEach(r => r.classList.remove('selected'));
                row.classList.add('selected');
                RendererPreview.render(htmlElement, opt);
                DescriptionLOL.render(htmlElement, opt, 'en');
            };

            if (!firstSelectableFound) {
                // Seleccionar el primero automáticamente sin disparar sonido/animaciones extra
                row.classList.add('selected');
                RendererPreview.render(htmlElement, opt);
                DescriptionLOL.render(htmlElement, opt, 'en');
                firstSelectableFound = true;
            }

            // 1. Crear LABEL usando el módulo
            const labelEl = Labels.create(scene, opt);
            row.appendChild(labelEl);
            
            // 2. Crear VALUE/INPUT usando el módulo
            const inputEl = Inputs.create({
                scene: scene,
                opt: opt,
                activeCheckboxes: activeCheckboxes,
                onSelect: onSelectCallback
            });
            row.appendChild(inputEl);

            // 3. Asignar click global a la fila (para selección simple)
            row.onclick = onSelectCallback;

            optionsDiv.appendChild(row);
        });

        // Iniciar loop de animación si hay checkboxes activos
        if (activeCheckboxes.length > 0) {
            this._startCheckboxLoop(scene, activeCheckboxes);
        }
    }

    static _startCheckboxLoop(scene, items) {
        let frameTimer = 0;
        const msPerFrame = 1000 / 24; 

        this.updateListener = (time, delta) => {
            frameTimer += delta;

            if (frameTimer > msPerFrame) {
                frameTimer -= msPerFrame;
                
                items.forEach(item => {
                    if (!item.canvas.isConnected) return;

                    RenderizeCheckbox.draw(
                        scene, 
                        item.canvas, 
                        item.isChecked, 
                        item.animFrame
                    );

                    if (item.isChecked) {
                        item.animFrame++;
                    } else {
                        item.animFrame = 0;
                    }
                });
            }
        };

        scene.events.on('update', this.updateListener);
        scene.events.once('shutdown', () => {
            if (this.updateListener) {
                scene.events.off('update', this.updateListener);
                this.updateListener = null;
            }
        });
    }
}