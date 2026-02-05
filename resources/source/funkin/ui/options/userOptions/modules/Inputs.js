
export default class Inputs {
    /**
     * Crea el contenedor de valores/inputs para la opción.
     */
    static create({ scene, opt, activeCheckboxes, onSelect }) {
        const valueContainer = document.createElement('div');
        valueContainer.className = 'option-value';
        
        valueContainer.style.position = 'relative'; 
        valueContainer.style.display = 'flex';
        valueContainer.style.alignItems = 'center';
        valueContainer.style.justifyContent = 'flex-end';
        
        valueContainer.style.minWidth = '80px'; 
        valueContainer.style.height = '40px'; 

        // --- CHECKBOX ---
        if (opt.type === 'checkbox') {
            const canvasBox = document.createElement('canvas');

            canvasBox.width = 160;
            canvasBox.height = 250;

            canvasBox.style.position = 'absolute';
            canvasBox.style.width = '80px';
            canvasBox.style.height = '125px';
            
            canvasBox.style.left = '50%';
            canvasBox.style.top = '50%';
            canvasBox.style.transform = 'translate(-50%, -50%) translateY(-35px)';
            
            canvasBox.style.opacity = '1';
            canvasBox.style.filter = 'none';
            canvasBox.style.pointerEvents = 'auto';
            canvasBox.style.cursor = 'pointer';
            canvasBox.style.zIndex = '10';

            const checkboxState = {
                canvas: canvasBox,
                isChecked: opt.default,
                animFrame: opt.default ? 999 : 0
            };
            activeCheckboxes.push(checkboxState);

            valueContainer.appendChild(canvasBox);

            // --- EVENTO CLICK CON SONIDOS Y PARPADEO ---
            canvasBox.onclick = (e) => {
                e.stopPropagation();
                if (onSelect) onSelect();

                // Cambiar valor
                opt.default = !opt.default;
                checkboxState.isChecked = opt.default;
                checkboxState.animFrame = 0; // Reiniciar animación del sprite

                // Lógica de Audio y FX Visual
                if (checkboxState.isChecked) {
                    // ACTIVADO (TRUE)
                    scene.sound.play('confirmMenu');

                    // Efecto de Parpadeo (Blink) rápido
                    let blinkCount = 0;
                    const maxBlinks = 8; // Cantidad de cambios (on/off)
                    const speed = 60; // Velocidad en ms

                    // Limpiamos cualquier intervalo previo si el usuario clickea muy rápido
                    if (canvasBox.blinkInterval) clearInterval(canvasBox.blinkInterval);

                    canvasBox.blinkInterval = setInterval(() => {
                        // Toggle Opacidad 0 <-> 1
                        canvasBox.style.opacity = (canvasBox.style.opacity === '1') ? '0' : '1';
                        blinkCount++;

                        if (blinkCount >= maxBlinks) {
                            clearInterval(canvasBox.blinkInterval);
                            canvasBox.style.opacity = '1'; // Asegurar visible al final
                            canvasBox.blinkInterval = null;
                        }
                    }, speed);

                } else {
                    // DESACTIVADO (FALSE)
                    scene.sound.play('cancelMenu');
                    
                    // Si estaba parpadeando, lo detenemos y lo dejamos visible
                    if (canvasBox.blinkInterval) {
                        clearInterval(canvasBox.blinkInterval);
                        canvasBox.style.opacity = '1';
                        canvasBox.blinkInterval = null;
                    }
                }
            };

        } 
        // --- SLIDER ---
        else if (opt.type === 'slider') {
            valueContainer.style.gap = '15px'; 

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
                opt.default = parseFloat(slider.value);
            };

            valueContainer.appendChild(slider);
            valueContainer.appendChild(sliderLabel);
        } 
        // --- KEYBIND ---
        else if (opt.type === 'keybind' && Array.isArray(opt.default)) {
            valueContainer.style.gap = '15px';
            
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
        } 
        // --- DEFAULT ---
        else {
            valueContainer.textContent = this._formatValue(opt);
            valueContainer.style.fontFamily = 'vcr, monospace';
            valueContainer.style.fontSize = '22px';
        }

        return valueContainer;
    }

    static _formatValue(opt) {
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