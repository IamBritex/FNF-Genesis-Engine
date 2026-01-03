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
                const displayId = e.target.id.replace('opt-vol-', 'disp-');
                const display = this.domElement.node.querySelector(`#${displayId}`);
                if (display) display.innerText = `${val}%`;
                updateSliderGradient(e.target);
            });
            slider.addEventListener('change', (e) => {
                const soundType = e.target.getAttribute('data-sound');
                if (soundType === 'miss') console.log("🔊 Play Miss Sound");
                else if (soundType === 'hit') console.log("🔊 Play Hit Sound");
                else console.log("🔊 Play Beep");
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