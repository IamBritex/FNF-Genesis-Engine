import SaveUserPreferences from "../SaveUserPreferences.js";

export default class AccessibilitySection {
    constructor(scene, domElement) {
        this.scene = scene;
        this.domElement = domElement;
    }

    init() {
        // 1. Checkboxes
        const checkboxes = this.domElement.node.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(chk => {
            chk.addEventListener('change', (e) => {
                const id = e.target.id;
                const enabled = e.target.checked;
                console.log(`[Accessibility] ${id}: ${enabled ? 'ALLOWED' : 'PREVENTED'}`);
                SaveUserPreferences.set(id, enabled);
            });
        });

        // 2. Dropdown (Colorblind)
        const colorSelect = this.domElement.node.querySelector('#opt-colorblind');
        if (colorSelect) {
            colorSelect.addEventListener('change', (e) => {
                const filter = e.target.value;
                console.log(`[Accessibility] Color Filter set to: ${filter.toUpperCase()}`);
                SaveUserPreferences.set(e.target.id, filter);
            });
        }
    }
}