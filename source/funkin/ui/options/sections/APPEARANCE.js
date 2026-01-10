import CheckboxRenderer from "../CheckboxRenderer.js";
import SaveUserPreferences from "../SaveUserPreferences.js";

export default class AppearanceSection {
    constructor(scene, domElement) {
        this.scene = scene;
        this.domElement = domElement;
    }

    init() {
        // 1. SLIDERS
        const sliders = this.domElement.node.querySelectorAll('.genesis-slider');
        const updateSliderGradient = (slider) => {
            const val = slider.value;
            const min = slider.min || 0;
            const max = slider.max || 100;
            const percentage = ((val - min) / (max - min)) * 100;
            slider.style.background = `linear-gradient(90deg, #ff9900 ${percentage}%, #ffffff ${percentage}%)`;
        };

        sliders.forEach(slider => {
            // Inicializar visualmente (el valor ya lo puso OptionHTMLBuilder)
            updateSliderGradient(slider);

            slider.addEventListener('input', (e) => {
                const val = e.target.value;
                const displayId = e.target.id.replace('opt-', 'disp-');
                // Intenta encontrar el display por ID generado o por el ID específico si existe
                const display = this.domElement.node.querySelector(`#${displayId}`) || this.domElement.node.querySelector(`#disp-${e.target.id}`);

                if (display) {
                    const suffix = e.target.getAttribute('data-suffix') || '%';
                    display.innerText = `${val}${suffix}`;
                }
                updateSliderGradient(e.target);

                // Guardar valor numérico
                SaveUserPreferences.set(e.target.id, parseFloat(val));
            });
        });

        // 2. LOGICA DE SUB-OPCIONES (Judge Counter)
        const judgeCheckbox = this.domElement.node.querySelector('#opt-judge-counter');
        const judgeSubOptions = this.domElement.node.querySelector('#judge-sub-options');

        if (judgeCheckbox && judgeSubOptions) {
            const toggleSubOptions = () => {
                if (judgeCheckbox.checked) {
                    judgeSubOptions.style.display = 'block';
                } else {
                    judgeSubOptions.style.display = 'none';
                }
            };

            // Ejecutar al inicio para sincronizar con el estado guardado
            toggleSubOptions();

            judgeCheckbox.addEventListener('change', () => {
                toggleSubOptions();
                if (judgeCheckbox.checked) CheckboxRenderer.playAnimation(this.scene, judgeCheckbox.nextElementSibling);
                else CheckboxRenderer.playReverseAnimation(this.scene, judgeCheckbox.nextElementSibling);

                SaveUserPreferences.set('opt-judge-counter', judgeCheckbox.checked);
            });
        }

        // 3. BOTÓN ADJUST JUDGE (Acción, no guarda estado)
        const btnAdjust = this.domElement.node.querySelector('#btn-adjust-judge');
        if (btnAdjust) {
            btnAdjust.addEventListener('click', () => {
                console.log("[Options] Switching to Judge Editor Scene...");
            });
        }

        // 4. Otros Inputs
        const inputs = this.domElement.node.querySelectorAll('select, input[type="checkbox"]');
        inputs.forEach(input => {
            if (input.id === 'opt-judge-counter') return; // Ya manejado arriba
            input.addEventListener('change', (e) => {
                const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
                console.log(`[Appearance] Setting Changed: ${e.target.id} -> ${val}`);
                SaveUserPreferences.set(e.target.id, val);
            });
        });
    }
}