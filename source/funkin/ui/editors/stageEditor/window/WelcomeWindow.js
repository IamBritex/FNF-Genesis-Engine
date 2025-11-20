import { ModularWindow } from '../../utils/window.js';

// --- Lógica de Electron ---
const isElectron = !!window.process && !!window.process.type;
let fs, path;
if (isElectron) {
    try {
        fs = require('fs');
        path = require('path');
    } catch (e) {
        console.error("Error al cargar módulos de Node:", e);
        isElectron = false;
    }
}
// --- Fin de la lógica de Electron ---

export class WelcomeWindow {
    constructor(scene) {
        this.scene = scene;
        this.windowInstance = null;
        this.rightAside = null; 
        this.loadStageCallback = scene.loadStageMethod || null;

        const config = {
            width: 800,
            height: 500,
            title: 'Bienvenida',
            close: true,
            maximize: false,
            minimize: false,
            overlay: true,
            move: false,
            content: this.createContent.bind(this),
            styleOfContent: this.createStyles.bind(this)
        };
        
        this.windowInstance = new ModularWindow(this.scene, config);

        if (this.windowInstance) {
            this.windowInstance.onDestroy = () => {
                if (scene.onWelcomeWindowClose) {
                    scene.onWelcomeWindowClose();
                }
            };
        }

        if (this.windowInstance.domElement) {
            this.rightAside = this.windowInstance.domElement.node.querySelector('.welcome-aside-right');
            this.addContentListeners();
        }
    }

    get domElement() {
        return this.windowInstance.domElement;
    }

    addContentListeners() {
        if (!this.rightAside) return;

        const newStageBtn = this.rightAside.querySelector('.new-stage-btn');
        if (newStageBtn) {
            newStageBtn.addEventListener('click', () => {
                if (this.scene.editorMethods) {
                    this.scene.editorMethods.requestNewScene();
                }
            });
        }
        
        const stageItems = this.rightAside.querySelectorAll('.stage-item');
        stageItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const stageName = e.target.dataset.stage;
                if (this.loadStageCallback) {
                    this.loadStageCallback(stageName);
                }
                this.destroy(); 
            });
        });

        const createBtn = this.rightAside.querySelector('#confirm-create-btn');
        if (createBtn) {
            createBtn.addEventListener('click', () => {
                this.createNewStage();
            });
        }
        
        const cancelBtn = this.rightAside.querySelector('#cancel-create-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.showStageListView();
            });
        }
    }

    showCreateStageView() {
        const template = this.scene.cache.text.get('html_welcome_create');
        this.rightAside.innerHTML = template;
        this.addContentListeners();
    }

    showStageListView() {
        const template = this.scene.cache.text.get('html_welcome_list');
        const html = template.replace('%STAGE_FILES%', this.getStageFilesHTML());
        this.rightAside.innerHTML = html;
        this.addContentListeners();
    }

    createNewStage() {
        const input = this.rightAside.querySelector('#new-stage-name-input');
        const newName = input.value.trim();

        if (newName.length === 0) {
            input.style.border = '1px solid #e64a4a';
            return;
        }

        if (this.loadStageCallback) {
            this.loadStageCallback(newName);
        }

        this.destroy();
    }

    createContent() {
        const template = this.scene.cache.text.get('html_welcome');
        return template.replace('%STAGE_LIST%', this.getStageFilesHTML());
    }

    getStageFilesHTML() {
        if (isElectron && fs && path) {
            try {
                const stagesPath = path.join(process.cwd(), 'public', 'data', 'stages');
                const files = fs.readdirSync(stagesPath);
                
                const jsonFiles = files
                    .filter(file => file.endsWith('.json'))
                    .map(file => file.replace('.json', ''))
                    .sort();

                if (jsonFiles.length === 0) {
                    return '<p class="stage-list-empty">No se encontraron escenarios.</p>';
                }

                return '<ul class="stage-list">' +
                       jsonFiles.map(file => `<li class="stage-item" data-stage="${file}">${file}</li>`).join('') +
                       '</ul>';

            } catch (err) {
                console.error("Error al leer el directorio de escenarios:", err);
                return `<p class="stage-list-empty" style="color: #e64a4a;">Error: ${err.message}</p>`;
            }
        } else {
            return `
                <div class="stage-list-empty">
                    <p>La carga de archivos locales no está disponible.</p>
                    <button class="stage-browse-btn">Click to browse</button>
                    <input type="file" id="stage-file-input" accept=".json" style="display: none;" />
                </div>
            `;
        }
    }

    createStyles() {
        return this.scene.cache.text.get('css_welcome');
    }

    destroy() {
        if (this.windowInstance) {
            this.windowInstance.destroy();
        }
    }
}