import { ModularWindow } from '../../utils/window.js';

export class CharacterSelectorWindow {

    constructor(scene, onSelectCallback, onDestroyCallback) {
        this.scene = scene;
        this.onSelectCallback = onSelectCallback;
        this.onDestroy = onDestroyCallback || null;
        this.windowInstance = null;

        const config = {
            width: 550,
            height: 450,
            title: 'Seleccionar Personaje',
            close: true,
            overlay: true,
            move: true,
            content: this.createContent.bind(this),
            styleOfContent: this.createStyles.bind(this)
        };

        this.windowInstance = new ModularWindow(this.scene, config);
        if (this.windowInstance) {
            this.windowInstance.onDestroy = () => {
                if (this.onDestroy) this.onDestroy();
            };
        }

        // Iniciamos la carga automática al abrir la ventana
        this.loadCharactersFromFolder();
    }

    get domElement() { return this.windowInstance.domElement; }

    createContent() {
        // Estructura inicial con mensaje de carga
        return `
            <div class="char-selector-container">
                <div id="char-grid" class="char-selector-grid">
                    <div style="color: #aaa; padding: 20px; text-align: center;">
                        Cargando personajes...
                    </div>
                </div>
            </div>
        `;
    }

    createStyles() {
        // Reutilizamos y aseguramos los estilos del grid
        return `
            .char-selector-container {
                height: 100%;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }
            .char-selector-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
                gap: 10px;
                overflow-y: auto;
                padding: 10px;
                height: 100%;
            }
            .char-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                background: #4a2c66;
                border: 2px solid #663399;
                border-radius: 6px;
                padding: 10px;
                cursor: pointer;
                transition: transform 0.1s, background-color 0.2s;
            }
            .char-item:hover {
                background-color: #7a4fcf;
                transform: translateY(-2px);
            }
            .char-icon-container {
                width: 70px;
                height: 70px;
                background: #222;
                overflow: hidden;
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 1px solid #000;
            }
            .char-icon-img {
                max-width: 100%;
                max-height: 100%;
                image-rendering: pixelated;
            }
            .char-name {
                font-size: 12px;
                color: #fff;
                margin-top: 8px;
                text-align: center;
                word-break: break-word;
                font-family: 'VCR', sans-serif;
                line-height: 1.2;
            }
        `;
    }

    async loadCharactersFromFolder() {
        const gridContainer = this.windowInstance.domElement.node.querySelector('#char-grid');
        if (!gridContainer) return;

        try {
            // 1. Listar archivos usando la API de Genesis
            const files = await Genesis.file.list('public/data/characters');
            
            // Filtrar solo los JSON
            const jsonFiles = files.filter(f => f.endsWith('.json'));

            if (jsonFiles.length === 0) {
                gridContainer.innerHTML = '<div style="padding:20px; text-align:center;">No se encontraron personajes en public/data/characters</div>';
                return;
            }

            // Limpiar mensaje de carga
            gridContainer.innerHTML = '';

            // 2. Procesar cada personaje
            // Usamos Promise.all para cargar los datos de los iconos en paralelo
            const charPromises = jsonFiles.map(async (filename) => {
                const name = filename.replace('.json', '');
                let iconName = name; // Por defecto el icono se llama igual

                try {
                    // Leemos el JSON para obtener el 'healthicon' real
                    const response = await fetch(`public/data/characters/${filename}`);
                    const data = await response.json();
                    if (data.healthicon) iconName = data.healthicon;
                } catch (e) {
                    console.warn(`Error leyendo metadata de ${name}`, e);
                }

                return { name, iconName };
            });

            const characters = await Promise.all(charPromises);

            // Ordenar alfabéticamente
            characters.sort((a, b) => a.name.localeCompare(b.name));

            // 3. Generar HTML de las tarjetas
            characters.forEach(char => {
                const card = document.createElement('div');
                card.className = 'char-item';
                
                // Ruta del icono
                const iconPath = `public/images/characters/icons/${char.iconName}.png`;
                
                card.innerHTML = `
                    <div class="char-icon-container">
                        <img src="${iconPath}" class="char-icon-img" onerror="this.src='public/images/characters/icons/face.png'">
                    </div>
                    <div class="char-name">${char.name}</div>
                `;

                // Listener de selección
                card.addEventListener('click', () => {
                    this.selectCharacter(char.name, char.iconName);
                });

                gridContainer.appendChild(card);
            });

        } catch (error) {
            console.error("Error cargando lista de personajes:", error);
            gridContainer.innerHTML = `<div style="color:#ff5555; padding:20px;">Error al cargar: ${error.message}</div>`;
        }
    }

    selectCharacter(filename, iconName) {
        if (this.onSelectCallback) {
            const iconPath = `public/images/characters/icons/${iconName}.png`;
            
            this.onSelectCallback({ 
                name: filename, 
                iconName: iconName, 
                iconPath: iconPath 
            });
        }
        this.windowInstance.destroy();
    }
}