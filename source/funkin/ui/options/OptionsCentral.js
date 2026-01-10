import Alphabet from "../../../utils/Alphabet.js";
import AlphabetCanvasRenderer from "./AlphabetCanvasRenderer.js";
import CheckboxRenderer from "./CheckboxRenderer.js";
import ProfileSection from "./sections/PROFILE.js";
import OptionHTMLBuilder from "./utils/OptionHTMLBuilder.js";
import SaveUserPreferences from "./SaveUserPreferences.js";

export default class OptionsCentral {
    constructor(scene) {
        this.scene = scene;
        this.domElement = null;
        this.currentTitleGroup = null;
        this.optionsData = null;
        this.currentProfileLogic = null;
        this.selectableItems = [];
        this.currentIndex = 0;
    }

    static preload(scene) {
        scene.load.html('optionsCentral', 'public/ui/menu/options/options_central_config.html');
        scene.load.html('genericSection', 'public/ui/menu/options/generic_section.html');
        scene.load.html('profileSection', 'public/ui/menu/options/sections/PROFILE.html');
        scene.load.json('optionsData', 'public/data/ui/options.json');
        scene.load.atlasXML('checkboxAnim', 'public/assets/images/states/OptionsState/checkboxThingie.png', 'public/assets/images/states/OptionsState/checkboxThingie.xml');
    }

    create(x, y) {
        this.injectCSS();
        this.domElement = this.scene.add.dom(x, y).createFromCache('optionsCentral');
        this.optionsData = this.scene.cache.json.get('optionsData');
        return this.domElement;
    }

    updateTitle(text) {
        if (this.currentProfileLogic) this.currentProfileLogic = null;
        this.selectableItems = [];
        this.currentIndex = 0;

        this.scene.time.delayedCall(50, () => {
            const canvasEl = this.domElement.node.querySelector('#center-title-canvas');
            if (canvasEl) {
                if (this.currentTitleGroup) {
                    this.currentTitleGroup.destroy();
                    this.currentTitleGroup = null;
                }
                this.currentTitleGroup = new Alphabet(this.scene, 0, 0, text, true);
                this.currentTitleGroup.setVisible(false);
                AlphabetCanvasRenderer.render(this.scene, this.currentTitleGroup, canvasEl, 0, 'center', 1.0);
            }
            this.loadSectionHTML(text);
        });
    }

    loadSectionHTML(categoryName) {
        const contentContainer = this.domElement.node.querySelector('.config-content');
        if (!contentContainer) return;

        if (categoryName === "PROFILE") {
            contentContainer.innerHTML = this.scene.cache.html.get('profileSection');
            this.currentProfileLogic = new ProfileSection(this.scene, this.domElement);
            this.currentProfileLogic.init();
            return;
        }

        if (this.optionsData && this.optionsData[categoryName]) {
            contentContainer.innerHTML = this.scene.cache.html.get('genericSection');
            const listContainer = contentContainer.querySelector('#generated-content');
            const sectionData = this.optionsData[categoryName];

            listContainer.innerHTML = OptionHTMLBuilder.buildSection(sectionData);

            this.renderInternalLabels();
            this.setupCustomCheckboxes();
            this.attachDynamicListeners(sectionData);
            this.buildSelectableList(sectionData);
        } else {
            contentContainer.innerHTML = `<p style="color:white; opacity:0.5; text-align:center; margin-top:50px;">Section Data Not Found in JSON</p>`;
        }
    }

    buildSelectableList(sectionData) {
        this.selectableItems = [];
        const traverse = (items) => {
            items.forEach(item => {
                if (item.type === 'sub_group') {
                    if (item.items) traverse(item.items);
                    return;
                }
                if (item.type === 'spacer' || item.type === 'header') return;

                let selector = `#${item.id}`;
                const el = this.domElement.node.querySelector(selector) || this.domElement.node.querySelector(`[data-bind-action="${item.id}"]`)?.parentElement;

                let rowDiv = el;
                while (rowDiv && !rowDiv.classList.contains('option-row')) {
                    rowDiv = rowDiv.parentElement;
                    if (rowDiv === this.domElement.node) { rowDiv = null; break; }
                }

                if (el && rowDiv && rowDiv.offsetParent !== null) {
                    const finalEl = item.type === 'keybind' ? rowDiv.querySelector('.opt-input-container') : el;
                    if (item.type === 'keybind') finalEl.classList.add('key-bind-container');

                    this.selectableItems.push({
                        id: item.id,
                        element: finalEl,
                        rowDiv: rowDiv,
                        type: item.type
                    });
                }
            });
        };
        traverse(sectionData);
    }

    // --- SELECCIÓN ---
    changeSelection(diff) {
        if (this.selectableItems.length === 0) return;
        this.clearSelection();
        this.currentIndex += diff;
        if (this.currentIndex >= this.selectableItems.length) this.currentIndex = 0;
        if (this.currentIndex < 0) this.currentIndex = this.selectableItems.length - 1;
        this.highlightSelection(this.currentIndex, true);
        this.scene.sound.play('scrollSound');
    }

    highlightSelection(index, fromKeyboard = true) {
        this.selectableItems.forEach(item => { if (item.rowDiv) item.rowDiv.classList.remove('selected-row'); });
        if (this.selectableItems[index]) {
            this.currentIndex = index;
            const item = this.selectableItems[index];
            if (fromKeyboard && item.rowDiv) {
                item.rowDiv.classList.add('selected-row');
                item.rowDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }

    clearSelection() {
        this.selectableItems.forEach(item => { if (item.rowDiv) item.rowDiv.classList.remove('selected-row'); });
        this.setVisualFocus(false, false);
    }

    getCurrentItem() { return this.selectableItems[this.currentIndex]; }

    setVisualFocus(active, fromKeyboard = true) {
        this.selectableItems.forEach(item => { if (item.rowDiv) item.rowDiv.classList.remove('focused-active'); });

        const caps = this.domElement.node.querySelectorAll('.active-cap');
        caps.forEach(c => c.classList.remove('active-cap'));

        if (active && fromKeyboard) {
            const item = this.getCurrentItem();
            if (item && item.rowDiv) {
                item.rowDiv.classList.add('focused-active');
            }
        }
    }

    // --- KEYBIND UTILS ---
    highlightKeybindCap(container, index) {
        const caps = container.querySelectorAll('.key-cap');
        caps.forEach(c => c.classList.remove('active-cap'));
        if (caps[index]) caps[index].classList.add('active-cap');
    }

    formatKeyName(code) {
        const map = {
            'ArrowUp': 'UP', 'ArrowDown': 'DOWN', 'ArrowLeft': 'LEFT', 'ArrowRight': 'RIGHT',
            'Space': 'SPACE', 'Enter': 'ENTER', 'Escape': 'ESC', 'Backspace': 'BACK',
            'ControlLeft': 'LCTRL', 'ControlRight': 'RCTRL', 'ShiftLeft': 'LSHIFT', 'ShiftRight': 'RSHIFT',
            'AltLeft': 'ALT', 'AltRight': 'ALTGR', 'Tab': 'TAB', 'CapsLock': 'CAPS',
            'Period': '.', 'Comma': ',', 'Slash': '/', 'Backslash': '\\', 'Quote': "'", 'Semicolon': ';',
            'Minus': '-', 'Equal': '=', 'BracketLeft': '[', 'BracketRight': ']'
        };
        if (map[code]) return map[code];
        if (code.startsWith('Key')) return code.replace('Key', '');
        if (code.startsWith('Digit')) return code.replace('Digit', '');
        if (code.startsWith('Numpad')) return 'Num' + code.replace('Numpad', '');
        return code.toUpperCase().substring(0, 6);
    }

    // --- LISTENERS ---
    attachDynamicListeners(sectionData) {
        const processItems = (items) => {
            items.forEach(item => {
                const el = this.domElement.node.querySelector(`#${item.id}`);
                if (item.type === 'sub_group') { if (item.items) processItems(item.items); return; }

                if (!el) return;

                if (item.type === 'slider') {
                    this.updateSliderGradient(el);
                    el.addEventListener('input', (e) => {
                        const disp = this.domElement.node.querySelector(`#disp-${item.id}`);
                        if (disp) disp.innerText = `${e.target.value}${item.suffix || ''}`;
                        this.updateSliderGradient(e.target);
                    });
                    el.addEventListener('change', (e) => {
                        SaveUserPreferences.set(item.id, parseFloat(e.target.value));
                    });
                }
                else if (item.type === 'checkbox') {
                    el.addEventListener('change', (e) => {
                        const val = e.target.checked;
                        SaveUserPreferences.set(item.id, val);
                        if (val) CheckboxRenderer.playAnimation(this.scene, el.nextElementSibling);
                        else CheckboxRenderer.playReverseAnimation(this.scene, el.nextElementSibling);
                        if (item.hasSubOptions) {
                            const subGroup = this.domElement.node.querySelector(`#${item.id}-subs`);
                            if (subGroup) {
                                subGroup.style.display = val ? 'block' : 'none';
                                this.buildSelectableList(sectionData);
                            }
                        }
                    });
                }
                else if (item.type === 'select' || item.type === 'number') {
                    el.addEventListener('change', (e) => SaveUserPreferences.set(item.id, e.target.value));
                }
                else if (item.type === 'action') {
                    el.addEventListener('click', () => { if (item.id === 'btn-reset-save') this.handleResetButton(el); });
                }
            });
        };
        processItems(sectionData);
    }

    updateSliderGradient(slider) {
        const val = slider.value;
        const min = slider.min || 0;
        const max = slider.max || 100;
        const percentage = ((val - min) / (max - min)) * 100;
        slider.style.background = `linear-gradient(90deg, #ff9900 ${percentage}%, #ffffff ${percentage}%)`;
    }

    handleResetButton(btn) {
        if (btn.innerText === "RESET") {
            btn.innerText = "SURE?";
            setTimeout(() => { if (btn.innerText === "SURE?") btn.innerText = "RESET"; }, 3000);
        } else if (btn.innerText === "SURE?") {
            localStorage.removeItem('genesis_preferences');
            btn.innerText = "DELETED";
            btn.disabled = true;
            btn.style.opacity = "0.5";
            setTimeout(() => window.location.reload(), 1000);
        }
    }

    initKeybindLogic(el, actionName) { /* Legacy stub */ }

    renderInternalLabels() {
        const labels = this.domElement.node.querySelectorAll('.opt-label-canvas,.subtitle-canvas');
        labels.forEach(canvas => {
            const textToRender = canvas.getAttribute('data-text');
            if (textToRender) {
                const tempAlphabet = new Alphabet(this.scene, 0, 0, textToRender, true);
                tempAlphabet.setVisible(false);
                const customScaleAttr = canvas.getAttribute('data-scale');
                let finalScale = (customScaleAttr && customScaleAttr !== 'auto') ? parseFloat(customScaleAttr) : 1.4;
                const alignAttr = canvas.getAttribute('data-align') || 'left';
                AlphabetCanvasRenderer.render(this.scene, tempAlphabet, canvas, 0, alignAttr, finalScale);
                tempAlphabet.destroy();
            }
        });
    }

    setupCustomCheckboxes() {
        const checkboxCanvases = this.domElement.node.querySelectorAll('.checkbox-canvas');
        checkboxCanvases.forEach(canvas => {
            const wrapper = canvas.parentElement;
            const input = wrapper.querySelector('input[type="checkbox"]');
            if (input) CheckboxRenderer.renderStatic(this.scene, canvas, input.checked);
        });
    }

    injectCSS() {
        const cssId = 'options-menu-styles';
        if (!document.getElementById(cssId)) {
            const head = document.getElementsByTagName('head')[0];
            const link = document.createElement('link');
            link.id = cssId;
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = 'public/ui/menu/options/options.css';
            link.media = 'all';
            head.appendChild(link);

            // ESTILOS OSCUROS Y ELEGANTES (Negro con transparencia)
            const style = document.createElement('style');
            style.innerHTML = `
                /* SELECCIÓN (Navegación normal) */
                .selected-row { 
                    background: rgba(0, 0, 0, 0.4); 
                    border-left: 4px solid rgba(255, 255, 255, 0.8); 
                    padding-left: 10px; 
                    transition: all 0.1s ease; 
                }
                
                /* FOCO ACTIVO (Editando) */
                .focused-active { 
                    background: rgba(0, 0, 0, 0.7) !important; 
                    border-left: 4px solid #ffffff; 
                    transform: scale(1.01); 
                }
                
                /* TECLA SELECCIONADA (En modo Keybind) */
                .active-cap { 
                    border: 2px solid rgba(255, 255, 255, 0.8) !important; 
                    color: black !important; 
                    transform: scale(1.1); 
                    box-shadow: 0 0 10px rgba(255, 255, 255, 0.2); 
                }
                
                /* ESPERANDO TECLA (Bindeando) */
                .binding { 
                    background: #444 !important; 
                    color: white !important; 
                    border-color: #888 !important; 
                    animation: pulse 0.5s infinite; 
                }
                
                @keyframes pulse { 
                    0% { opacity: 1; } 
                    50% { opacity: 0.7; } 
                    100% { opacity: 1; } 
                }
            `;
            head.appendChild(style);
        }
    }
}