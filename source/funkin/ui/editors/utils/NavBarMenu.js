/**
 * source/funkin/ui/editors/utils/NavBarMenu.js
 * Un sistema de menú híbrido que soporta:
 * 1. Barra clásica de botones (StageEditor, AnimationEditor).
 * 2. Menú Hamburguesa + Widgets (ChartEditor).
 */
export default class NavBarMenu {
    constructor(scene) {
        this.scene = scene;
        this.domElement = null;
        this.activeDropdown = null;
        this.activeDropdownButton = null;
        this.boundOnGlobalClick = this.onGlobalClick.bind(this);
    }

    create(config) {
        // Altura base, pero ahora el CSS se encarga de la posición real
        const navHeight = 40; 

        // Contenedor principal flex
        let html = `<nav class="navbar-menu" style="height: ${navHeight}px;">`;
        
        // --- TIPO A: Menú Hamburguesa (Chart Editor) ---
        if (config.mainMenu) {
            html += `
                <div class="navbar-button-wrapper hamburger-wrapper">
                    <button class="navbar-button hamburger-btn">
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>
                    </button>
                    <div class="navbar-dropdown hamburger-dropdown" style="display: none;">
                        ${this._generateMenuItemsHTML(config.mainMenu)}
                    </div>
                </div>
            `;
        }

        // --- TIPO B: Widgets Personalizados (Metrónomo, etc.) ---
        if (config.widgets) {
            config.widgets.forEach(widget => {
                html += `<div class="navbar-widget">${widget.html}</div>`;
            });
        }

        // --- TIPO C: Botones Clásicos (Stage Editor / Compatibilidad) ---
        if (config.buttons) {
            config.buttons.forEach((btn) => {
                // Alineación
                const alignStyle = btn.align === 'right' ? 'style="margin-left: auto;"' : '';
                html += `<div class="navbar-button-wrapper" ${alignStyle}>`;
                
                // Contenido del botón (Texto o Imagen)
                let buttonContent = '';
                let buttonClass = 'navbar-button';
                
                if (btn.name.startsWith('img:')) {
                    const imgPath = btn.name.substring(4);
                    buttonContent = `<img src="${imgPath}" alt="icon" class="navbar-button-icon">`;
                    buttonClass += ' navbar-button-is-icon';
                } else {
                    buttonContent = btn.name;
                }
                html += `  <button class="${buttonClass}">${buttonContent}</button>`;
                
                // Dropdown Clásico
                if (btn.items && btn.items.length > 0) {
                    // Alineación del dropdown si el botón está a la derecha
                    const dropdownAlignClass = btn.align === 'right' ? 'align-right' : '';
                    
                    html += `  <div class="navbar-dropdown ${dropdownAlignClass}" style="display: none;">`;
                    html += this._generateMenuItemsHTML(btn.items); 
                    html += `  </div>`;
                }
                html += `</div>`;
            });
        }

        html += `</nav>`;

        this.domElement = this.scene.add.dom(0, 0).setOrigin(0, 0).createFromHTML(html);
        this.domElement.node.style.width = "100%";
        
        if (this.scene.setAsHUDElement) {
            this.scene.setAsHUDElement(this.domElement);
        }
        
        this.addStyles();
        this.addListeners();
        
        document.addEventListener('mousedown', this.boundOnGlobalClick, true);
    }

    _generateMenuItemsHTML(items) {
        let html = '';
        items.forEach(item => {
            if (item.name === 'line') {
                html += `<div class="navbar-divider"></div>`;
            } else if (item.items && item.items.length > 0) {
                // Submenú recursivo
                html += `<div class="navbar-item has-submenu">
                            <span>${item.name}</span>
                            <span class="submenu-arrow">&gt;</span>
                            <div class="navbar-submenu">
                                ${this._generateMenuItemsHTML(item.items)}
                            </div>
                         </div>`;
            } else {
                html += `<a class="navbar-item" 
                            data-module="${item.module || ''}" 
                            data-method="${item.method || ''}">
                            ${item.name}
                        </a>`;
            }
        });
        return html;
    }

    addStyles() {
        const style = document.createElement('style');
        style.innerHTML = `
            .navbar-menu {
                position: fixed; top: 0; left: 0; width: 100%;
                display: flex; align-items: center;
                background-color: #1e1e1e; color: #fff;
                font-family: "VCR", monospace; z-index: 10000;
                box-shadow: 0 2px 5px rgba(0,0,0,0.5);
                padding: 0 10px; box-sizing: border-box;
            }
            
            /* Wrapper relativo para que los dropdowns se posicionen respecto al botón */
            .navbar-button-wrapper { 
                position: relative; 
                margin-right: 5px; 
                height: 100%; 
                display: flex; 
                align-items: center;
            }

            /* --- Botones --- */
            .navbar-button, .hamburger-btn {
                background: none; border: none; color: #fff; cursor: pointer;
                /* [CORRECCIÓN] Padding más gordo para que se vean mejor */
                padding: 0 20px; 
                height: 100%; 
                font-family: inherit; font-size: 14px;
                border-radius: 4px;
                display: flex; align-items: center; justify-content: center;
                transition: background-color 0.1s;
            }
            .hamburger-btn {
                padding: 5px 18px; /* Específico para el icono */
            }
            .navbar-button:hover, .navbar-button.active,
            .hamburger-btn:hover, .hamburger-btn.active { 
                background-color: #333; 
            }
            .navbar-button-is-icon { padding: 0 12px; }
            .navbar-button-icon { width: 18px; height: 18px; filter: invert(1); }

            /* --- Dropdowns Principales --- */
            .navbar-dropdown {
                position: absolute; 
                /* [CORRECCIÓN] top: 100% asegura que empiece justo donde termina el navbar */
                top: 100%; 
                left: 0; 
                background-color: #2a2a2a;
                border: 1px solid #444; min-width: 180px;
                box-shadow: 0 4px 8px rgba(0,0,0,0.4); 
                z-index: 11000;
                border-radius: 0 0 4px 4px; /* Bordes redondeados solo abajo */
            }
            /* Alineación a la derecha si es necesario */
            .navbar-dropdown.align-right {
                left: auto;
                right: 0;
            }

            /* --- Items --- */
            .navbar-item {
                display: block; padding: 10px 18px; /* Un poco más de aire */
                color: #eee; text-decoration: none;
                cursor: pointer; font-size: 14px; line-height: 1.2;
            }
            .navbar-item:hover { background-color: #663399; color: #fff; }
            .navbar-divider { height: 1px; background: #444; margin: 4px 0; }

            /* --- Submenús (Dropdowns anidados) --- */
            /* [CORRECCIÓN] position: relative en el padre es vital */
            .navbar-item.has-submenu {
                position: relative;
                display: flex; justify-content: space-between; align-items: center;
            }
            .submenu-arrow { margin-left: 10px; font-size: 10px; }
            
            .navbar-submenu {
                display: none; 
                position: absolute; 
                left: 100%; /* Justo al lado derecho */
                top: -1px; /* Alineado con el borde superior (-1px por el borde) */
                min-width: 150px; 
                background-color: #2a2a2a; 
                border: 1px solid #444;
                box-shadow: 2px 2px 5px rgba(0,0,0,0.3); 
                z-index: 12000;
            }
            .navbar-item.has-submenu:hover > .navbar-submenu { display: block; }

            /* --- Widgets (Metrónomo) --- */
            .navbar-widget {
                display: flex; align-items: center; margin-left: 20px;
                background-color: #252525; border-radius: 4px; padding: 4px 10px;
                border: 1px solid #333;
                height: 28px; /* Altura fija para centrado bonito */
            }
            .mix-editor-toolbar-metronome {
                display: flex; align-items: center; gap: 10px; font-family: sans-serif; font-size: 12px;
            }
            .metronome-icon { color: #888; display: flex; align-items: center; }
            
            .bpm-input {
                background: transparent; border: none; color: #4db6ac; 
                font-weight: bold; width: 40px; text-align: right;
                font-family: inherit; font-size: 13px;
            }
            .bpm-input:focus { outline: 1px solid #4db6ac; background: #333; }
            .bpm-label { color: #666; margin-left: 2px; font-size: 11px; }
            
            .time-sig-val { color: #ccc; font-weight: bold; cursor: pointer; }
            .separator { color: #555; margin: 0 2px; }
        `;
        this.domElement.node.appendChild(style);
    }

    addListeners() {
        const node = this.domElement.node;

        // 1. Botones (Hamburguesa Y Clásicos)
        const buttons = node.querySelectorAll('.navbar-button, .hamburger-btn');
        buttons.forEach(button => {
            // Buscar el dropdown hermano
            const wrapper = button.closest('.navbar-button-wrapper');
            const dropdown = wrapper ? wrapper.querySelector('.navbar-dropdown') : null;
            
            if (!dropdown) return;

            button.addEventListener('mousedown', (e) => {
                e.preventDefault(); 
                e.stopPropagation();
                
                if (this.activeDropdown === dropdown) {
                    this.hideDropdown();
                } else {
                    this.showDropdown(dropdown, button);
                }
            });

            // Hover (solo para botones clásicos de texto, opcional)
            button.addEventListener('mouseenter', () => {
                if (this.activeDropdown && this.activeDropdown !== dropdown) {
                    this.showDropdown(dropdown, button);
                }
            });
        });

        // 2. Items del menú
        const items = node.querySelectorAll('.navbar-item');
        items.forEach(item => {
            // Si tiene submenú, no hacemos click action
            if (item.classList.contains('has-submenu')) return;

            item.addEventListener('mousedown', (e) => {
                e.preventDefault(); 
                e.stopPropagation();
                
                const { module, method } = item.dataset;
                if(module && method) {
                    this.scene.executeModule(module, method);
                }
                this.hideDropdown();
            });
        });

        // 3. Inputs (BPM)
        const bpmInput = node.querySelector('.bpm-input');
        if (bpmInput) {
            bpmInput.addEventListener('keydown', (e) => e.stopPropagation());
            bpmInput.addEventListener('change', (e) => {
                const newBpm = parseInt(e.target.value);
                if (!isNaN(newBpm) && newBpm > 0) {
                    this.scene.executeModule('Edit', 'changeBPM', newBpm);
                }
            });
        }
    }

    onGlobalClick(e) {
        if (this.activeDropdown && !this.domElement.node.contains(e.target)) {
            this.hideDropdown();
        }
    }

    showDropdown(dropdownNode, buttonNode) {
        this.hideDropdown(); 
        dropdownNode.style.display = 'block';
        buttonNode.classList.add('active');
        this.activeDropdown = dropdownNode;
        this.activeDropdownButton = buttonNode;
    }

    hideDropdown() {
        if (this.activeDropdown) {
            this.activeDropdown.style.display = 'none';
        }
        if (this.activeDropdownButton) {
            this.activeDropdownButton.classList.remove('active');
        }
        this.activeDropdown = null;
        this.activeDropdownButton = null;
    }

    // --- [MÉTODO RESTAURADO PARA StageEditor] ---
    updateSubmenuItems(menuName, itemName, newItems) {
        if (!this.domElement) return;

        // 1. Encontrar el menú padre (ej. "Archivo")
        const allButtons = Array.from(this.domElement.node.querySelectorAll('.navbar-button'));
        const menuButton = allButtons.find(btn => btn.textContent.trim() === menuName);
        
        if (!menuButton) return;
        const wrapper = menuButton.closest('.navbar-button-wrapper');
        const dropdown = wrapper.querySelector('.navbar-dropdown');

        // 2. Encontrar el item "Cargar Reciente" dentro del dropdown
        const allItems = Array.from(dropdown.querySelectorAll('.navbar-item'));
        const targetItem = allItems.find(el => {
            const text = Array.from(el.childNodes)
                .filter(node => node.nodeType === Node.TEXT_NODE)
                .map(node => node.textContent.trim())
                .join('');
            return text === itemName;
        });

        if (targetItem) {
            // 3. Crear estructura de submenú
            const container = document.createElement('div');
            container.className = 'navbar-item has-submenu';
            // [FIX] Añadimos position relative aquí también inline por seguridad, aunque el CSS ya lo tiene
            container.style.position = 'relative'; 
            
            container.innerHTML = `
                <span>${itemName}</span>
                <span class="submenu-arrow">&gt;</span>
                <div class="navbar-submenu">
                    ${this._generateMenuItemsHTML(newItems)}
                </div>
            `;
            
            targetItem.parentNode.replaceChild(container, targetItem);
            
            // 4. Re-asignar listeners a los nuevos items
            const newLinks = container.querySelectorAll('.navbar-submenu .navbar-item');
            newLinks.forEach(link => {
                link.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const { module, method } = link.dataset;
                    if(module && method) {
                        this.scene.executeModule(module, method);
                    }
                    this.hideDropdown();
                });
            });
        }
    }

    destroy() {
        if (this.domElement) this.domElement.destroy();
        document.removeEventListener('mousedown', this.boundOnGlobalClick, true);
    }
}