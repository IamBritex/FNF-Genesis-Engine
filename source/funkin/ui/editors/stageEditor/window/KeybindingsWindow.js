import { ModularWindow } from '../../utils/window.js';

export class KeybindingsWindow {
    constructor(scene) {
        this.scene = scene;
        this.preferencesManager = scene.preferencesManager;
        this.windowInstance = null;
        this.onDestroy = null;
        
        this.currentKeymap = JSON.parse(JSON.stringify(this.preferencesManager.getKeymap()));
        this.listeningButton = null;

        const config = {
            width: 550,
            height: 600,
            title: 'Comandos (Atajos de Teclado)',
            close: true,
            maximize: true,
            minimize: true,
            move: true,
            overlay: true,
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
        const template = this.scene.cache.text.get('html_keybinds');
        return template.replace('%TABLE_ROWS%', this.createTableRows());
    }
    
    createTableRows() {
        return Object.entries(this.currentKeymap).map(([action, binding]) => {
            return `
                <tr>
                    <td class="keybind-action">${binding.description}</td>
                    <td class="keybind-key">
                        <button class="keybind-btn-set" data-action="${action}">
                            ${this.formatKey(binding)}
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    formatKey(binding) {
        let parts = [];
        if (binding.ctrl) parts.push('Ctrl');
        if (binding.alt) parts.push('Alt');
        if (binding.shift) parts.push('Shift');
        parts.push(binding.key.charAt(0).toUpperCase() + binding.key.slice(1));
        return parts.join(' + ');
    }

    createStyles() {
        return this.scene.cache.text.get('css_keybinds');
    }

    addListeners() {
        const node = this.windowInstance.domElement.node;

        node.querySelectorAll('.keybind-btn-set').forEach(button => {
            button.addEventListener('click', (e) => {
                this.startListening(e.currentTarget);
            });
        });
        
        node.querySelector('#keybind-save').addEventListener('click', () => {
            this.preferencesManager.saveKeybindings(this.currentKeymap);
            this.scene.toastManager.show("Atajos Guardados", "Se aplicarán al reiniciar la escena.");
            this.windowInstance.destroy();
        });
        
        node.querySelector('#keybind-reset').addEventListener('click', () => {
            this.currentKeymap = this.preferencesManager.getDefaultKeymap();
            this.refreshTable();
            this.scene.toastManager.show("Atajos Restablecidos", "Presiona Guardar para aplicar.");
        });
        
        this.keyListener = (e) => this.onKeyCapture(e);
        document.addEventListener('keydown', this.keyListener, true);
        
        const originalOnDestroy = this.windowInstance.onDestroy;
        this.windowInstance.onDestroy = () => {
            document.removeEventListener('keydown', this.keyListener, true);
            if (originalOnDestroy) originalOnDestroy();
        };
    }
    
    startListening(button) {
        if (this.listeningButton) {
            this.listeningButton.textContent = this.formatKey(this.currentKeymap[this.listeningButton.dataset.action]);
            this.listeningButton.classList.remove('listening');
        }
        this.listeningButton = button;
        this.listeningButton.textContent = 'Presiona una tecla...';
        this.listeningButton.classList.add('listening');
    }
    
    onKeyCapture(e) {
        if (!this.listeningButton) return;
        
        e.preventDefault();
        e.stopPropagation();

        if (e.key === 'Control' || e.key === 'Shift' || e.key === 'Alt') return;

        const action = this.listeningButton.dataset.action;
        const newBinding = {
            key: e.key,
            ctrl: e.ctrlKey,
            shift: e.shiftKey,
            alt: e.altKey,
            description: this.currentKeymap[action].description
        };
        
        this.currentKeymap[action] = newBinding;
        
        this.listeningButton.textContent = this.formatKey(newBinding);
        this.listeningButton.classList.remove('listening');
        this.listeningButton = null;
    }
    
    refreshTable() {
        const tbody = this.windowInstance.domElement.node.querySelector('tbody');
        tbody.innerHTML = this.createTableRows();
        tbody.querySelectorAll('.keybind-btn-set').forEach(button => {
            button.addEventListener('click', (e) => {
                this.startListening(e.currentTarget);
            });
        });
    }
}