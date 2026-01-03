import { ModularWindow } from '../../utils/window.js';

export class WelcomeWindow {
    constructor(scene) {
        this.scene = scene;
        this.windowInstance = null;
        this.loadStageCallback = scene.loadStageMethod || null;

        // 1. Obtener HTML desde caché
        const htmlContent = this.scene.cache.text.get('html_welcome');
        if (!htmlContent) {
            console.error("WelcomeWindow: html_welcome no cargado.");
            return;
        }

        // 2. Instanciar ventana (El HTML define el overlay y la estructura)
        this.windowInstance = new ModularWindow(this.scene, htmlContent);

        // 3. Callback de cierre
        this.windowInstance.onDestroy = () => {
            if (scene.onWelcomeWindowClose) scene.onWelcomeWindowClose();
        };

        // 4. Lógica dinámica (rellenar listas)
        if (this.windowInstance.domElement) {
            this.initLogic();
        }
    }

    get domElement() { return this.windowInstance.domElement; }

    initLogic() {
        const root = this.windowInstance.domElement.node;

        // Botón "+"
        const newBtn = root.querySelector('.new-stage-btn');
        if (newBtn) {
            newBtn.addEventListener('click', () => {
                if (this.scene.editorMethods) this.scene.editorMethods.requestNewScene();
                this.destroy();
            });
        }

        // Cargar lista
        this.populateStageList(root);
    }

    async populateStageList(root) {
        const container = root.querySelector('#stage-list-root');
        if (!container) return;

        try {
            const files = await Genesis.file.list('public/data/stages');
            const stages = files.filter(f => f.endsWith('.json')).map(f => f.replace('.json', '')).sort();

            if (stages.length === 0) {
                container.innerHTML = '<div style="padding:20px;text-align:center;color:#aaa;">Vacío</div>';
                return;
            }

            let html = '';
            stages.forEach(name => {
                html += `<div class="stage-entry" data-stage="${name}">${name}</div>`;
            });
            container.innerHTML = html;

            // Listeners
            container.querySelectorAll('.stage-entry').forEach(entry => {
                entry.addEventListener('click', (e) => {
                    const name = e.target.dataset.stage;
                    if (this.loadStageCallback) this.loadStageCallback(name);
                    this.destroy();
                });
            });

        } catch (e) {
            container.innerHTML = '<div style="color:red;padding:10px;">Error leyendo carpeta</div>';
        }
    }

    destroy() {
        if (this.windowInstance) this.windowInstance.destroy();
    }
}