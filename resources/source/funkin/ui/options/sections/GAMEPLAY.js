import SaveUserPreferences from "../SaveUserPreferences.js";

export default class GameplaySection {
    constructor(scene, domElement) {
        this.scene = scene;
        this.domElement = domElement;
    }

    init() {
        const inputs = this.domElement.node.querySelectorAll('select, input[type="checkbox"]');
        inputs.forEach(input => {
            input.addEventListener('change', (e) => {
                const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
                console.log(`[Gameplay] ${e.target.id}: ${val}`);

                // Guardar preferencia
                SaveUserPreferences.set(e.target.id, val);
            });
        });
    }
}