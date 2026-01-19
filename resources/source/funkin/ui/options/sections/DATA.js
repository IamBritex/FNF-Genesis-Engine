import SaveUserPreferences from "../SaveUserPreferences.js";

export default class DataSection {
    constructor(scene, domElement) {
        this.scene = scene;
        this.domElement = domElement;
    }

    init() {
        // 1. Clear Cache
        const btnClear = this.domElement.node.querySelector('#btn-clear-cache');
        if (btnClear) {
            btnClear.addEventListener('click', () => {
                console.log("[Data] Clearing GPU Texture Cache...");
                // Aquí iría tu lógica real de limpieza: this.scene.renderer.textureManager.clear()...

                const originalText = btnClear.innerText;
                btnClear.innerText = "CLEARED!";
                btnClear.style.backgroundColor = "#81c784";
                setTimeout(() => {
                    btnClear.innerText = originalText;
                    btnClear.style.backgroundColor = "";
                }, 1000);
            });
        }

        // 2. Reset Save Data
        const btnReset = this.domElement.node.querySelector('#btn-reset-save');
        let resetConfirmStage = 0;

        if (btnReset) {
            btnReset.addEventListener('click', () => {
                if (resetConfirmStage === 0) {
                    btnReset.innerText = "SURE?";
                    resetConfirmStage = 1;
                    setTimeout(() => {
                        if (resetConfirmStage === 1) {
                            btnReset.innerText = "RESET";
                            resetConfirmStage = 0;
                        }
                    }, 3000);
                } else {
                    console.warn("[Data] DELETING ALL SAVE DATA...");
                    localStorage.clear(); // Ojo: esto borra TODO, incluyendo preferencias.
                    // Si solo quieres borrar progreso: SaveUserPreferences.resetProgress() (si lo implementas)

                    btnReset.innerText = "DELETED";
                    btnReset.disabled = true;
                    btnReset.style.opacity = "0.5";

                    // Recargar página para evitar conflictos
                    setTimeout(() => window.location.reload(), 1000);
                }
            });
        }

        // 3. Match Replays
        const replayCheck = this.domElement.node.querySelector('#opt-replays');
        if (replayCheck) {
            replayCheck.addEventListener('change', (e) => {
                console.log(`[Data] Auto-Save Replays: ${e.target.checked}`);
                SaveUserPreferences.set('opt-replays', e.target.checked);
            });
        }
    }
}