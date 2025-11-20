import { ModularWindow } from '../../utils/window.js';

/**
 * Una ventana modal para buscar elementos en la escena por su nombre.
 */
export class FindWindow {

    /**
     * @param {import('../StageEditor.js').StageEditor} scene
     * @param {import('../objects/Elements.js').ElementSelector} elementsManager
     * @param {import('../camera/CameraEditor.js').CameraEditor} cameraEditor
     */
    constructor(scene, elementsManager, cameraEditor) {
        this.scene = scene;
        this.elementsManager = elementsManager;
        this.cameraEditor = cameraEditor;

        this.windowInstance = null;
        this.resultsContainer = null;
        this.searchInput = null;
        this.onDestroy = null;

        const config = {
            width: 350,
            height: 'auto',
            title: 'Encontrar Elemento',
            close: true,
            overlay: true,
            move: false,
            content: this.createContent.bind(this),
            styleOfContent: this.createStyles.bind(this)
        };

        this.windowInstance = new ModularWindow(this.scene, config);
        
        if (this.scene.setAsHUDElement) {
            this.scene.setAsHUDElement(this.windowInstance.domElement);
        }

        this.windowInstance.onDestroy = () => {
            if (this.onDestroy) this.onDestroy();
        };

        this.addListeners();
    }
    
    get domElement() {
        return this.windowInstance.domElement;
    }

    createContent() {
        return `
            <div class="find-container">
                <input type="text" id="find-search-input" placeholder="Escribe un nombre...">
                <div class="find-results">
                    <div class="find-no-match">Empieza a escribir para buscar...</div>
                </div>
            </div>
        `;
    }

    addListeners() {
        const node = this.windowInstance.domElement.node;
        this.searchInput = node.querySelector('#find-search-input');
        this.resultsContainer = node.querySelector('.find-results');

        this.searchInput.addEventListener('input', (e) => {
            this.performSearch(e.target.value);
        });
        
        // Añadir listener al contenedor de resultados para delegación de eventos
        this.resultsContainer.addEventListener('click', (e) => {
            const target = e.target.closest('.find-item');
            if (target) {
                const elementName = target.dataset.elementName;
                this.selectElement(elementName);
            }
        });

        // Auto-focus en el input
        this.searchInput.focus();
    }

    /**
     * Filtra los elementos de la escena y muestra los resultados.
     * @param {string} query El texto de búsqueda.
     */
    performSearch(query) {
        if (!query) {
            this.resultsContainer.innerHTML = '<div class="find-no-match">Empieza a escribir para buscar...</div>';
            return;
        }
        
        query = query.toLowerCase();
        const allElements = this.elementsManager.registeredElements;
        const matches = allElements.filter(el => {
            const name = el.getData('characterName') || el.texture?.key || el.type;
            return name.toLowerCase().includes(query);
        });

        if (matches.length === 1) {
            // Un solo resultado, seleccionarlo y cerrar
            this.selectElement(matches[0].name);
        } else if (matches.length > 1) {
            // Múltiples resultados, mostrar lista
            this.displayResults(matches);
        } else {
            this.resultsContainer.innerHTML = '<div class="find-no-match">No se encontraron elementos.</div>';
        }
    }

    /**
     * Muestra la lista de elementos encontrados.
     * @param {Phaser.GameObjects.GameObject[]} matches
     */
    displayResults(matches) {
        matches.sort((a, b) => a.depth - b.depth); // Ordenar por capa
        
        const html = matches.map(el => {
            const name = el.getData('characterName') || el.texture?.key || el.type;
            // Usamos 'el.name' que es el ID único asignado por ElementSelector
            return `
                <div class="find-item" data-element-name="${el.name}">
                    ${name}. Capa: ${el.depth}
                </div>`;
        }).join('');
        
        this.resultsContainer.innerHTML = html;
    }

    /**
     * Selecciona un elemento, mueve la cámara y cierra la ventana.
     * @param {string} elementName El ID único (el.name) del elemento.
     */
    selectElement(elementName) {
        const element = this.elementsManager.registeredElements.find(e => e.name === elementName);
        if (!element) return;

        if (this.cameraEditor) {
            this.cameraEditor.panToElement(element);
        }
        this.elementsManager.setSelected(element);
        
        this.windowInstance.destroy();
    }

    createStyles() {
        const colorPrimary = '#663399';
        const colorHover = '#7a4fcf';
        const colorDark = '#4a2c66';

        return `
            .find-container {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            #find-search-input {
                width: 100%;
                padding: 10px;
                font-size: 16px;
                background: #222;
                color: white;
                border: 2px solid ${colorPrimary};
                border-radius: 5px;
                box-sizing: border-box; /* Asegura que el padding no desborde */
            }
            .find-results {
                max-height: 300px;
                overflow-y: auto;
                border: 1px solid ${colorDark};
                border-radius: 5px;
            }
            .find-item {
                padding: 12px 10px;
                background: ${colorDark};
                border-bottom: 1px solid ${colorPrimary};
                cursor: pointer;
                font-size: 14px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .find-item:last-child {
                border-bottom: none;
            }
            .find-item:hover {
                background: ${colorHover};
            }
            .find-no-match {
                padding: 20px;
                text-align: center;
                color: #AAA;
            }
        `;
    }
}