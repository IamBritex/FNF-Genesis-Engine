import { ModularWindow } from '../../utils/window.js';

export class WelcomeWindow {
    constructor(scene) {
        this.scene = scene;
        this.windowInstance = null;
        this.rightAside = null; 
        this.loadStageCallback = scene.loadStageMethod || null;

        const config = {
            width: 800,
            height: 500,
            title: 'Bienvenida - Genesis Engine',
            close: true,
            content: this.createContent.bind(this),
            styleOfContent: this.createStyles.bind(this)
        };
        
        this.windowInstance = new ModularWindow(this.scene, config);
        this.windowInstance.onDestroy = () => {
            if (scene.onWelcomeWindowClose) scene.onWelcomeWindowClose();
        };

        if (this.windowInstance.domElement) {
            this.rightAside = this.windowInstance.domElement.node.querySelector('.welcome-aside-right');
            // Inicializar listado
            this.initStageList();
        }
    }

    get domElement() { return this.windowInstance.domElement; }

    createContent() {
        const template = this.scene.cache.text.get('html_welcome');
        // Placeholder mientras carga
        return template.replace('%STAGE_LIST%', '<div class="stage-list-loading">Cargando escenarios...</div>');
    }

    async initStageList() {
        if (!this.rightAside) return;

        try {
            // Pedir lista de archivos a C++ (path relativo a dist/)
            const files = await Genesis.file.list('public/data/stages');
            
            const jsonFiles = files
                .filter(f => f.endsWith('.json'))
                .map(f => f.replace('.json', ''))
                .sort();

            let html = '';
            if (jsonFiles.length === 0) {
                html = '<div class="stage-list-empty">No se encontraron escenarios en public/data/stages.</div>';
            } else {
                html = '<ul class="stage-list">';
                jsonFiles.forEach(name => {
                    html += `<li class="stage-item" data-stage="${name}">${name}</li>`;
                });
                html += '</ul>';
            }
            
            // Reemplazar contenido en el contenedor de lista
            // Asumimos que el template tiene un contenedor donde iba %STAGE_LIST%
            // Si el template envolvió %STAGE_LIST% en un div, lo buscamos.
            // Si no, reemplazamos el contenido del rightAside (cuidado con borrar botones).
            
            // Mejor estrategia: Buscar el placeholder que pusimos
            const loader = this.rightAside.querySelector('.stage-list-loading');
            if (loader) {
                loader.outerHTML = html;
                this.addContentListeners(); // Re-aplicar listeners a los nuevos items
            } else {
                // Fallback si el template estructura es diferente
                // Re-render completo de la lista
                this.showStageListView(html);
            }

        } catch (e) {
            console.error("Error listando stages:", e);
            const loader = this.rightAside.querySelector('.stage-list-loading');
            if (loader) loader.textContent = "Error al cargar lista.";
        }
    }

    createStyles() {
        return this.scene.cache.text.get('css_welcome') + `
            .stage-list-loading, .stage-list-empty {
                color: #aaa; padding: 20px; text-align: center; font-style: italic;
            }
            .stage-list {
                list-style: none; padding: 0; margin: 0;
                max-height: 300px; overflow-y: auto;
            }
            .stage-item {
                padding: 10px; border-bottom: 1px solid #444; cursor: pointer;
                transition: background 0.2s;
            }
            .stage-item:hover { background: rgba(102, 51, 153, 0.3); color: #fff; }
        `;
    }

    addContentListeners() {
        if (!this.rightAside) return;

        const newStageBtn = this.rightAside.querySelector('.new-stage-btn');
        if (newStageBtn) {
            // Clonar nodo para eliminar listeners antiguos duplicados si se llama varias veces
            const newBtn = newStageBtn.cloneNode(true);
            newStageBtn.parentNode.replaceChild(newBtn, newStageBtn);
            newBtn.addEventListener('click', () => {
                if (this.scene.editorMethods) this.scene.editorMethods.requestNewScene();
                this.destroy();
            });
        }
        
        const stageItems = this.rightAside.querySelectorAll('.stage-item');
        stageItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const stageName = e.target.dataset.stage;
                if (this.loadStageCallback) this.loadStageCallback(stageName);
                this.destroy(); 
            });
        });
    }

    showStageListView(listHTML) {
        // Usado si queremos forzar la vista de lista
        // Esto asume que el template original tiene botones fijos que no queremos borrar
        // Por simplicidad, inyectamos el HTML generado donde corresponde
        const listContainer = this.rightAside.querySelector('.stage-list-container') || this.rightAside; 
        // Si tu HTML template no tiene un contenedor especifico, esto podria borrar botones.
        // Asumiré que el template tiene un div claro para la lista.
    }

    destroy() {
        if (this.windowInstance) this.windowInstance.destroy();
    }
}