import { ModularWindow } from '../../utils/window.js';

export class LoadAnimationWindow {
    /**
     * @param {Phaser.Scene} scene La escena del AnimationEditor.
     * @param {Function} onLoadCallback Callback que recibe los datos cargados.
     */
    constructor(scene, onLoadCallback) {
        this.scene = scene;
        this.onLoadCallback = onLoadCallback;
        this.windowInstance = null;
        
        // Detectar entorno usando la API de Genesis
        this.isDesktop = window.Genesis && window.Genesis.env === 'DESKTOP';

        const config = {
            width: 750,
            height: 480,
            title: 'Gestor de Animaciones',
            close: false, // No se puede cerrar sin elegir, a menos que use el botón del nav
            overlay: true,
            move: false, // NO DRAGGEABLE
            content: this.createContent.bind(this),
            styleOfContent: this.createStyles.bind(this)
        };

        this.windowInstance = new ModularWindow(this.scene, config);
        
        // Asegurar que esté en el HUD
        if (this.scene.setAsHUDElement) {
            this.scene.setAsHUDElement(this.windowInstance.domElement);
        }

        this.initLogic();
    }

    createContent() {
        // Si es web, ocultamos el aside (display: none en CSS no basta si queremos limpiar el DOM)
        const asideClass = this.isDesktop ? 'load-aside' : 'load-aside hidden';
        
        // Contenido de la lista (solo Desktop)
        const desktopList = `
            <div class="file-browser-header">
                <h3>Personajes Existentes</h3>
                <button class="refresh-btn" id="btn-refresh">↻</button>
            </div>
            <div class="file-list-container" id="file-list-container">
                <div class="loading-msg">Cargando archivos...</div>
            </div>
        `;

        // Contenido de creación / subida (Web y Desktop)
        const uploadSection = `
            <div class="actions-container">
                <div class="action-box">
                    <h4>Crear Nuevo Personaje</h4>
                    <p>Importar Spritesheet (PNG + XML)</p>
                    <button class="action-btn" id="btn-create-new">Importar Atlas</button>
                    <input type="file" id="input-new-atlas" multiple accept=".png,.xml" style="display: none;">
                </div>
                
                ${!this.isDesktop ? `
                <div class="action-box">
                    <h4>Abrir Existente (Web)</h4>
                    <p>Subir .json, .png y .xml</p>
                    <button class="action-btn" id="btn-web-open">Subir Archivos</button>
                    <input type="file" id="input-web-open" multiple accept=".json,.png,.xml" style="display: none;">
                </div>
                ` : ''}
            </div>
        `;

        return `
            <div class="load-anim-container">
                <aside class="${asideClass}">
                    <h3>Recientes</h3>
                    <ul class="recent-list" id="recent-list">
                        <li class="list-placeholder">Cargando...</li>
                    </ul>
                </aside>
                <main class="load-main">
                    ${this.isDesktop ? desktopList : ''}
                    ${uploadSection}
                </main>
            </div>
        `;
    }

    createStyles() {
        return `
            .load-anim-container { display: flex; height: 100%; font-family: 'VCR', sans-serif; color: white; }
            
            /* Sidebar */
            .load-aside {
                width: 200px; background-color: #4a2c66; border-right: 2px solid #663399;
                display: flex; flex-direction: column; padding: 10px; flex-shrink: 0;
            }
            .load-aside.hidden { display: none; }
            
            .load-aside h3 { margin: 0 0 10px 0; border-bottom: 1px solid #7a4fcf; padding-bottom: 5px; font-size: 14px; color: #e8daff; }
            .recent-list { list-style: none; padding: 0; margin: 0; overflow-y: auto; max-height: 350px; }
            .recent-item { 
                padding: 8px; cursor: pointer; font-size: 12px; border-bottom: 1px solid #5a3c76; 
                white-space: nowrap; overflow: hidden; text-overflow: ellipsis; 
            }
            .recent-item:hover { background-color: #7a4fcf; color: white; }
            
            /* Main Content */
            .load-main { flex: 1; background-color: #2e1247; display: flex; flex-direction: column; padding: 15px; gap: 15px; overflow: hidden; }
            
            /* File Browser (Desktop) */
            .file-browser-header { display: flex; justify-content: space-between; align-items: center; }
            .file-list-container { 
                flex: 1; border: 2px solid #663399; background: #222; overflow-y: auto; 
                display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 10px; padding: 10px;
                min-height: 200px;
            }
            .file-card {
                background: #4a2c66; border: 1px solid #663399; border-radius: 4px; padding: 10px;
                display: flex; flex-direction: column; align-items: center; cursor: pointer; transition: transform 0.1s;
            }
            .file-card:hover { background: #7a4fcf; transform: translateY(-2px); }
            .file-icon { width: 40px; height: 40px; margin-bottom: 5px; opacity: 0.8; }
            .file-name { font-size: 12px; text-align: center; word-break: break-word; }

            /* Action Buttons Area */
            .actions-container { display: flex; gap: 15px; height: 120px; }
            .action-box {
                flex: 1; background: #3a2250; border: 1px solid #663399; border-radius: 6px;
                padding: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;
            }
            .action-box h4 { margin: 0 0 5px 0; font-size: 14px; color: #fff; }
            .action-box p { margin: 0 0 10px 0; font-size: 11px; color: #aaa; }
            .action-btn {
                background-color: #663399; color: white; border: none; padding: 8px 16px; 
                border-radius: 4px; cursor: pointer; font-family: 'VCR', sans-serif; font-size: 14px;
            }
            .action-btn:hover { background-color: #7a4fcf; }
        `;
    }

    initLogic() {
        // 1. Lógica de "Crear Nuevo" (Común para ambos)
        const btnNew = this.windowInstance.domElement.node.querySelector('#btn-create-new');
        const inputNew = this.windowInstance.domElement.node.querySelector('#input-new-atlas');
        
        if (btnNew && inputNew) {
            btnNew.addEventListener('click', () => inputNew.click());
            inputNew.addEventListener('change', (e) => this.handleNewAtlas(e.target.files));
        }

        if (this.isDesktop) {
            this.loadRecents();
            this.loadDesktopFiles();
            const refreshBtn = this.windowInstance.domElement.node.querySelector('#btn-refresh');
            if (refreshBtn) refreshBtn.addEventListener('click', () => this.loadDesktopFiles());
        } else {
            // Lógica Web Open
            const btnWeb = this.windowInstance.domElement.node.querySelector('#btn-web-open');
            const inputWeb = this.windowInstance.domElement.node.querySelector('#input-web-open');
            if (btnWeb && inputWeb) {
                btnWeb.addEventListener('click', () => inputWeb.click());
                inputWeb.addEventListener('change', (e) => this.handleWebOpen(e.target.files));
            }
        }
    }

    // --- HANDLERS ---

    handleNewAtlas(fileList) {
        const files = Array.from(fileList);
        const png = files.find(f => f.name.endsWith('.png'));
        const xml = files.find(f => f.name.endsWith('.xml'));

        if (!png || !xml) {
            // Usar un alert simple si el ToastManager no es accesible aquí (aunque debería pasarse)
            console.warn("Falta PNG o XML"); 
            return;
        }

        const data = {
            mode: 'new',
            name: xml.name.replace('.xml', ''), // Nombre temporal basado en el archivo
            pngUrl: URL.createObjectURL(png),
            xmlUrl: URL.createObjectURL(xml)
        };

        this.finish(data);
    }

    handleWebOpen(fileList) {
        const files = Array.from(fileList);
        const json = files.find(f => f.name.endsWith('.json'));
        const png = files.find(f => f.name.endsWith('.png'));
        const xml = files.find(f => f.name.endsWith('.xml'));

        if (!json || !png || !xml) {
            console.warn("Faltan archivos (.json, .png, .xml)");
            return;
        }

        const data = {
            mode: 'web_existing',
            name: json.name.replace('.json', ''),
            jsonFile: json,
            jsonUrl: URL.createObjectURL(json),
            pngUrl: URL.createObjectURL(png),
            xmlUrl: URL.createObjectURL(xml)
        };

        this.finish(data);
    }

    // --- DESKTOP LOGIC ---

    async loadDesktopFiles() {
        const container = this.windowInstance.domElement.node.querySelector('#file-list-container');
        if (!container) return;
        container.innerHTML = '<div class="loading-msg">Buscando...</div>';

        try {
            const files = await Genesis.file.list('public/data/characters');
            const jsonFiles = files.filter(f => f.endsWith('.json'));
            
            container.innerHTML = '';
            if (jsonFiles.length === 0) {
                container.innerHTML = '<div class="loading-msg">Carpeta vacía.</div>';
                return;
            }

            jsonFiles.forEach(file => {
                const name = file.replace('.json', '');
                const card = document.createElement('div');
                card.className = 'file-card';
                card.innerHTML = `
                    <img src="public/images/ui/editors/file_json.svg" class="file-icon" onerror="this.style.display='none'">
                    <span class="file-name">${name}</span>
                `;
                card.addEventListener('click', () => {
                    this.finish({ mode: 'desktop_existing', name: name });
                    this.addToRecents(name);
                });
                container.appendChild(card);
            });
        } catch (e) {
            container.innerHTML = `<div class="loading-msg error">${e.message}</div>`;
        }
    }

    async loadRecents() {
        const list = this.windowInstance.domElement.node.querySelector('#recent-list');
        if (!list) return;
        const recents = await Genesis.storage.load('AnimationEditor_Recents') || [];
        list.innerHTML = '';
        if (recents.length === 0) {
            list.innerHTML = '<li class="list-placeholder">Sin historial</li>';
            return;
        }
        recents.forEach(name => {
            const li = document.createElement('li');
            li.className = 'recent-item';
            li.textContent = name;
            li.addEventListener('click', () => this.finish({ mode: 'desktop_existing', name: name }));
            list.appendChild(li);
        });
    }

    async addToRecents(name) {
        let recents = await Genesis.storage.load('AnimationEditor_Recents') || [];
        recents = recents.filter(r => r !== name);
        recents.unshift(name);
        Genesis.storage.save('AnimationEditor_Recents', recents.slice(0, 10));
    }

    finish(data) {
        if (this.onLoadCallback) this.onLoadCallback(data);
        this.windowInstance.destroy();
    }
}