import Alphabet from "../../../utils/Alphabet.js";
import AlphabetCanvasRenderer from "./AlphabetCanvasRenderer.js";
import CheckboxRenderer from "./CheckboxRenderer.js";

// Lógica específica
import ProfileSection from "./sections/PROFILE.js";

// Constructor de HTML Modular
import OptionHTMLBuilder from "./utils/OptionHTMLBuilder.js";

export default class OptionsCentral {
    constructor(scene) {
        this.scene = scene;
        this.domElement = null;
        this.currentTitleGroup = null;
        this.optionsData = null; // Aquí se guarda el options.json
        this.currentProfileLogic = null; // Instancia de la lógica de perfil
    }

    static preload(scene) {
        // Cargar Layouts HTML
        scene.load.html('optionsCentral', 'public/ui/menu/options/options_central_config.html');
        scene.load.html('genericSection', 'public/ui/menu/options/generic_section.html');
        scene.load.html('profileSection', 'public/ui/menu/options/sections/PROFILE.html');

        // Cargar Datos JSON
        scene.load.json('optionsData', 'public/data/ui/options.json');

        // Assets UI
        scene.load.atlasXML('checkboxAnim', 'public/assets/images/states/OptionsState/checkboxThingie.png', 'public/assets/images/states/OptionsState/checkboxThingie.xml');
    }

    create(x, y) {
        // 1. Inyectar estilos CSS globales
        this.injectCSS();

        // 2. Crear DOM principal
        this.domElement = this.scene.add.dom(x, y).createFromCache('optionsCentral');

        // 3. Obtener datos del JSON
        this.optionsData = this.scene.cache.json.get('optionsData');

        return this.domElement;
    }

    updateTitle(text) {
        // Limpiar lógica de sección anterior (si existe)
        if (this.currentProfileLogic) {
            this.currentProfileLogic = null;
        }

        // Pequeño delay para transición suave
        this.scene.time.delayedCall(50, () => {
            // Renderizar Título con Alphabet
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

            // Cargar el contenido de la sección
            this.loadSectionHTML(text);
        });
    }

    loadSectionHTML(categoryName) {
        const contentContainer = this.domElement.node.querySelector('.config-content');
        if (!contentContainer) return;

        // --- CASO 1: PERFIL (DASHBOARD ESPECIAL) ---
        if (categoryName === "PROFILE") {
            contentContainer.innerHTML = this.scene.cache.html.get('profileSection');
            // Instanciar lógica específica del perfil
            this.currentProfileLogic = new ProfileSection(this.scene, this.domElement);
            this.currentProfileLogic.init();
            return;
        }

        // --- CASO 2: SECCIÓN GENÉRICA (JSON) ---
        if (this.optionsData && this.optionsData[categoryName]) {
            // A. Cargar molde vacío
            contentContainer.innerHTML = this.scene.cache.html.get('genericSection');
            const listContainer = contentContainer.querySelector('#generated-content');

            // B. Construir HTML usando el Builder
            const sectionData = this.optionsData[categoryName];
            listContainer.innerHTML = OptionHTMLBuilder.buildSection(sectionData);

            // C. Renderizar elementos visuales (Alphabets y Checkboxes estáticos)
            this.renderInternalLabels();
            this.setupCustomCheckboxes();

            // D. Activar interactividad (Sliders, botones, etc.)
            this.attachDynamicListeners(sectionData);

        } else {
            contentContainer.innerHTML = `<p style="color:white; opacity:0.5; text-align:center; margin-top:50px;">Section Data Not Found in JSON</p>`;
        }
    }

    // --- LISTENER MANAGER (Da vida al HTML generado) ---
    attachDynamicListeners(sectionData) {
        // Función recursiva para procesar items y sub-items
        const processItems = (items) => {
            items.forEach(item => {
                const el = this.domElement.node.querySelector(`#${item.id}`);

                // Si es un grupo, procesar sus hijos recursivamente
                if (item.type === 'sub_group') {
                    if (item.items) processItems(item.items);
                    return;
                }

                if (!el) return; // Si no encuentra el elemento en el DOM, saltar

                // -- SLIDERS --
                if (item.type === 'slider') {
                    this.updateSliderGradient(el); // Color inicial

                    el.addEventListener('input', (e) => {
                        const val = e.target.value;
                        const disp = this.domElement.node.querySelector(`#disp-${item.id}`);
                        if (disp) disp.innerText = `${val}${item.suffix || ''}`;
                        this.updateSliderGradient(e.target);
                    });

                    el.addEventListener('change', (e) => {
                        console.log(`[Option] Slider ${item.id}: ${e.target.value}`);
                        // TODO: Play sound logic (item.sound)
                    });
                }

                // -- CHECKBOXES --
                else if (item.type === 'checkbox') {
                    el.addEventListener('change', (e) => {
                        console.log(`[Option] Checkbox ${item.id}: ${e.target.checked}`);

                        // Animación visual
                        if (e.target.checked) CheckboxRenderer.playAnimation(this.scene, el.nextElementSibling);
                        else CheckboxRenderer.playReverseAnimation(this.scene, el.nextElementSibling);

                        // Mostrar/Ocultar Sub-Opciones
                        if (item.hasSubOptions) {
                            // En el builder, asignamos id="{id}-subs" al div contenedor, o un ID especifico
                            // Fix para Judge Counter que usa un ID especial en el JSON o Builder
                            const subGroup = this.domElement.node.querySelector(`#${item.id}-subs`) || this.domElement.node.querySelector('#judge-sub-options');
                            if (subGroup) subGroup.style.display = e.target.checked ? 'block' : 'none';
                        }
                    });
                }

                // -- SELECTS / NUMBERS --
                else if (item.type === 'select' || item.type === 'number') {
                    el.addEventListener('change', (e) => {
                        console.log(`[Option] Changed ${item.id}: ${e.target.value}`);
                    });
                }

                // -- ACTIONS (BUTTONS) --
                else if (item.type === 'action') {
                    el.addEventListener('click', () => {
                        console.log(`[Option] Action Clicked: ${item.id}`);
                        if (item.id === 'btn-reset-save') this.handleResetButton(el);
                    });
                }

                // -- KEYBINDS --
                else if (item.type === 'keybind') {
                    this.initKeybindLogic(el, item.id);
                }
            });
        };

        processItems(sectionData);
    }

    // --- HELPERS ---

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
            // Volver a RESET si no confirma en 3 seg
            setTimeout(() => { if (btn.innerText === "SURE?") btn.innerText = "RESET"; }, 3000);
        } else if (btn.innerText === "SURE?") {
            btn.innerText = "DELETED";
            btn.disabled = true;
            btn.style.opacity = "0.5";
            console.warn("SAVE DATA DELETED");
        }
    }

    initKeybindLogic(el, actionName) {
        const caps = this.domElement.node.querySelectorAll(`[data-bind-action="${actionName}"]`);
        caps.forEach(cap => {
            cap.addEventListener('click', (e) => {
                console.log("Binding key for: " + actionName);
                // Aquí conectarías con tu sistema de input real
            });
        });
    }

    renderInternalLabels() {
        const labels = this.domElement.node.querySelectorAll('.opt-label-canvas,.subtitle-canvas');
        labels.forEach(canvas => {
            const textToRender = canvas.getAttribute('data-text');
            if (textToRender) {
                const tempAlphabet = new Alphabet(this.scene, 0, 0, textToRender, true);
                tempAlphabet.setVisible(false);

                // "quien puso esto tan chiquito lol, vamos a darle tamaño"
                const customScaleAttr = canvas.getAttribute('data-scale');
                let finalScale = 1.4; // Escala base aumentada para que sean más grandes

                if (customScaleAttr && customScaleAttr !== 'auto') {
                    finalScale = parseFloat(customScaleAttr);
                }

                const alignAttr = canvas.getAttribute('data-align') || 'left';

                // Renderizamos con la nueva escala
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
            if (input) {
                CheckboxRenderer.renderStatic(this.scene, canvas, input.checked);
            }
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
            console.log("[OptionsCentral] CSS injected successfully.");
        }
    }
}