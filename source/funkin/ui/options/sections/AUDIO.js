import SaveUserPreferences from "../SaveUserPreferences.js";

export default class AudioSection {
    constructor(scene, domElement) {
        this.scene = scene;
        this.domElement = domElement;
    }

    init() {
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
                const displayId = `disp-${e.target.id}`;
                const display = this.domElement.node.querySelector(`#${displayId}`);
                if (display) {
                    const suffix = e.target.getAttribute('data-suffix') || '';
                    display.innerText = `${val}${suffix}`;
                }
                updateSliderGradient(e.target);
                SaveUserPreferences.set(e.target.id, parseFloat(val));
            });
        });

        const btnOffsetStart = this.domElement.node.querySelector('#btn-offset-start');
        if (btnOffsetStart) {
            btnOffsetStart.addEventListener('click', () => {
                console.log("[Options] Start Latency Calibration");
            });
        }
    }
}