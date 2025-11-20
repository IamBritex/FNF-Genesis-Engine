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

export class CharacterSelectorWindow {

    constructor(scene, onSelectCallback, onDestroyCallback) {
        this.scene = scene;
        this.onSelectCallback = onSelectCallback;
        this.windowInstance = null;

        this.onDestroy = onDestroyCallback || null;

        const config = {
            width: 450,
            height: 'auto',
            title: 'Seleccionar Personaje',
            close: true,
            overlay: true,
            move: false,
            content: this.createContent.bind(this),
            styleOfContent: this.createStyles.bind(this)
        };

        this.windowInstance = new ModularWindow(this.scene, config);

        if (this.windowInstance) {
            this.windowInstance.onDestroy = () => {
                if (this.onDestroy) this.onDestroy();
            };
        }

        this.addListeners();
    }

    get domElement() {
        return this.windowInstance.domElement;
    }

    createContent() {
        if (isElectron) {
            return this.createElectronContent();
        } else {
            return this.scene.cache.text.get('html_char_web');
        }
    }

    createElectronContent() {
        const characters = this.getCharacterList();
        if (characters.length === 0) {
            return `<div class="char-selector-error">No se encontraron personajes en 
                    <code>public/data/characters</code>.</div>`;
        }

        const gridItems = characters.map(char => `
            <div class="char-item" data-name="${char.name}" data-icon="${char.iconName}" title="${char.name}">
                <div class="char-icon-container">
                    <img src="${char.iconPath}" alt="${char.name}" class="char-icon-img" 
                         onerror="this.src='public/images/characters/icons/face.png'">
                </div>
                <span class="char-name">${char.name}</span>
            </div>
        `).join('');

        const template = this.scene.cache.text.get('html_char_electron');
        return template.replace('%GRID_ITEMS%', gridItems);
    }

    addListeners() {
        if (!this.windowInstance?.domElement) return;
        const node = this.windowInstance.domElement.node;

        if (isElectron) {
            const items = node.querySelectorAll('.char-item');
            items.forEach(item => {
                item.addEventListener('click', () => {
                    const name = item.dataset.name;
                    const iconName = item.dataset.icon;
                    const iconPath = `public/images/characters/icons/${iconName}.png`;

                    if (this.onSelectCallback) {
                        this.onSelectCallback({ name, iconName, iconPath });
                    }
                    this.windowInstance.destroy();
                });
            });
        } else {
            const fileInput = node.querySelector('#char-file-input');
            fileInput.addEventListener('change', this.onFileSelected.bind(this));
        }
    }

    onFileSelected(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                const name = file.name.replace('.json', '');
                const iconName = data.healthicon || name;
                const iconPath = `public/images/characters/icons/${iconName}.png`;

                if (this.onSelectCallback) {
                    this.onSelectCallback({ name, iconName, iconPath });
                }
                this.windowInstance.destroy();

            } catch (err) {
                console.error("Error al parsear el JSON del personaje:", err);
                alert("El archivo seleccionado no es un JSON de personaje válido.");
            }
        };
        reader.readAsText(file);
    }

    getCharacterList() {
        if (!isElectron) return [];

        try {
            const dir = path.join(process.cwd(), 'public', 'data', 'characters');
            const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

            const characters = files.map(file => {
                const name = file.replace('.json', '');
                let iconName = name;
                try {
                    const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
                    iconName = data.healthicon || name;
                } catch (e) {
                    console.warn(`Error al leer JSON: ${file}`, e);
                }

                return {
                    name: name,
                    iconName: iconName,
                    iconPath: `public/images/characters/icons/${iconName}.png`
                };
            });

            return characters.sort((a, b) => a.name.localeCompare(b.name));

        } catch (err) {
            console.error("Error al leer el directorio de personajes:", err);
            return [];
        }
    }

    createStyles() {
        return this.scene.cache.text.get('css_char_selector');
    }
}