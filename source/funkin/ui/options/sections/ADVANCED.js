export default class AdvancedSection {
    constructor(scene, domElement) {
        this.scene = scene;
        this.domElement = domElement;
    }

    init() {
        // 1. CHECKBOXES
        const checkboxes = this.domElement.node.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(chk => {
            chk.addEventListener('change', (e) => {
                console.log(`[Advanced] ${e.target.id}: ${e.target.checked}`);
            });
        });

        // 2. BOTÓN CLEAR CACHE
        const btnClear = this.domElement.node.querySelector('#btn-clear-cache');
        if (btnClear) {
            btnClear.addEventListener('click', () => {
                console.log("[Advanced] Clearing Asset Cache...");
                const originalText = btnClear.innerText;
                btnClear.innerText = "DONE!";
                setTimeout(() => { btnClear.innerText = originalText; }, 1000);
            });
        }

        // 3. DROPDOWNS
        const selects = this.domElement.node.querySelectorAll('select');
        selects.forEach(sel => {
            sel.addEventListener('change', (e) => {
                console.log(`[Advanced] ${e.target.id}: ${e.target.value}`);
            });
        });
    }
}