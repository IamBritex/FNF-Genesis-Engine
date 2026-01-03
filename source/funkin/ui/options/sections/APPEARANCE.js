import CheckboxRenderer from "../CheckboxRenderer.js";

export default class AppearanceSection {
    constructor(scene, domElement) {
        this.scene = scene;
        this.domElement = domElement;
    }

    init() {
        // 1. SLIDER (Lane Transparency)
        const sliders = this.domElement.node.querySelectorAll('.genesis-slider');
        const updateSliderGradient = (slider) => {
            const val = slider.value;
            const min = slider.min || 0;
            const max = slider.max || 100;
            const percentage = ((val - min) / (max - min)) * 100;
            slider.style.background = `linear-gradient(90deg, #ff9900 ${percentage}%, #ffffff ${percentage}%)`;
        };
        sliders.forEach(slider => {
            updateSliderGradient(slider);
            slider.addEventListener('input', (e) => {
                const val = e.target.value;
                const displayId = e.target.id.replace('opt-', 'disp-');
                const display = this.domElement.node.querySelector(`#${displayId}`);
                if (display) display.innerText = `${val}%`;
                updateSliderGradient(e.target);
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

            toggleSubOptions();

            judgeCheckbox.addEventListener('change', () => {
                toggleSubOptions();
                if (judgeCheckbox.checked) CheckboxRenderer.playAnimation(this.scene, judgeCheckbox.nextElementSibling);
                else CheckboxRenderer.playReverseAnimation(this.scene, judgeCheckbox.nextElementSibling);
            });
        }

        // 3. BOTÓN ADJUST JUDGE
        const btnAdjust = this.domElement.node.querySelector('#btn-adjust-judge');
        if (btnAdjust) {
            btnAdjust.addEventListener('click', () => {
                console.log("[Options] Switching to Judge Editor Scene...");
            });
        }

        // 4. Otros Inputs
        const inputs = this.domElement.node.querySelectorAll('select, input[type="checkbox"]');
        inputs.forEach(input => {
            if (input.id === 'opt-judge-counter') return;
            input.addEventListener('change', (e) => {
                const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
                console.log(`[Appearance] Setting Changed: ${e.target.id} -> ${val}`);
            });
        });
    }
}