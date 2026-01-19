import SaveUserPreferences from "../SaveUserPreferences.js";

export default class PerformanceSection {
    constructor(scene, domElement) {
        this.scene = scene;
        this.domElement = domElement;
    }

    init() {
        // 1. Resolution Scale
        const resSelect = this.domElement.node.querySelector('#opt-res-scale');
        if (resSelect) {
            resSelect.addEventListener('change', (e) => {
                console.log(`[Performance] Resolution Scale set to: ${e.target.value}x`);
                SaveUserPreferences.set(e.target.id, e.target.value);
            });
        }

        // 2. FPS Cap (INPUT NUMERICO)
        const fpsInput = this.domElement.node.querySelector('#opt-fps-cap');
        if (fpsInput) {
            fpsInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
            });

            fpsInput.addEventListener('change', (e) => {
                let val = parseInt(e.target.value);
                if (isNaN(val) || val < 30) val = 60;
                e.target.value = val;
                console.log(`[Performance] FPS Cap set to: ${val}`);

                SaveUserPreferences.set(e.target.id, val);
            });
        }

        // 3. CHECKBOXES
        const checkboxes = this.domElement.node.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(chk => {
            chk.addEventListener('change', (e) => {
                console.log(`[Performance] ${e.target.id} changed to: ${e.target.checked}`);
                SaveUserPreferences.set(e.target.id, e.target.checked);
            });
        });
    }
}