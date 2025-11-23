export default class NavBarMenu {
    constructor(scene) {
        this.scene = scene;
        this.domElement = null; // El elemento DOM de Phaser
        this.activeDropdown = null; // El nodo DOM del dropdown activo
        this.activeDropdownButton = null; // El nodo DOM del botón activo
        
        // Referencia al listener para poder eliminarlo después
        this.boundOnGlobalClick = this.onGlobalClick.bind(this);
    }

    create(config) {
        const navHeight = 30; // Altura de la barra

        // 1. Construir el string HTML para la barra y los menús
        let html = `<nav class="navbar-menu" style="height: ${navHeight}px;">`;
        
        config.buttons.forEach((btn) => {
            
            // --- INICIO DE MODIFICACIÓN: ALIGN RIGHT ---
            const alignStyle = btn.align === 'right' ? 'style="margin-left: auto;"' : '';
            html += `<div class="navbar-button-wrapper" ${alignStyle}>`;
            // --- FIN DE MODIFICACIÓN ---
            
            // --- INICIO DE MODIFICACIÓN: BOTÓN DE IMAGEN ---
            let buttonContent = '';
            let buttonClass = 'navbar-button';
            
            if (btn.name.startsWith('img:')) {
                const imgPath = btn.name.substring(4);
                buttonContent = `<img src="${imgPath}" alt="icon" class="navbar-button-icon">`;
                buttonClass += ' navbar-button-is-icon'; // Clase para estilo de ícono
            } else {
                buttonContent = btn.name;
            }
            html += `  <button class="${buttonClass}">${buttonContent}</button>`;
            // --- FIN DE MODIFICACIÓN ---
            
            
            // Crear el dropdown (inicialmente oculto)
            if (btn.items && btn.items.length > 0) {
                // --- INICIO DE MODIFICACIÓN: dropdown align right ---
                // Si el botón está alineado a la derecha, el dropdown también debe alinearse.
                const dropdownStyle = btn.align === 'right' ? 'style="display: none; top: 30px; left: auto; right: 0;"' : `style="display: none; top: ${navHeight}px;"`;
                html += `  <div class="navbar-dropdown" ${dropdownStyle}>`;
                // --- FIN DE MODIFICACIÓN ---
                
                btn.items.forEach((item) => {
                    if (item.name === 'line') {
                        // Es una línea divisora
                        html += `    <div class="navbar-divider"></div>`;
                    
                    } else if (item.items && item.items.length > 0) {
                        // Es un item con submenú
                        html += `<div class="navbar-item has-submenu">
                                    <span>${item.name}</span>
                                    <span class="submenu-arrow">&gt;</span>
                                    <div class="navbar-submenu">`;
                        
                        // Añadir los items al submenú
                        item.items.forEach(subItem => {
                            if (subItem.name === 'line') {
                                html += `<div class="navbar-divider"></div>`;
                            } else {
                                html += `<a class="navbar-item" 
                                            data-module="${subItem.module || ''}" 
                                            data-method="${subItem.method || ''}">
                                            ${subItem.name}
                                        </a>`;
                            }
                        });
                        html += `   </div>
                                 </div>`;
                    } else {
                        // Es un item clickable normal
                        html += `    <a class="navbar-item" 
                                       data-module="${item.module || ''}" 
                                       data-method="${item.method || ''}">
                                       ${item.name}
                                    </a>`;
                    }
                });

                html += `  </div>`;
            }
            html += `</div>`;
        });
        html += `</nav>`;

        // 2. Crear el elemento DOM de Phaser
        this.domElement = this.scene.add.dom(0, 0)
            .setOrigin(0, 0)
            .createFromHTML(html);

        // 3. Establecer propiedades del contenedor DOM
        this.domElement.node.style.width = "100%";
        this.scene.setAsHUDElement(this.domElement);
        
        // 4. Inyectar los estilos CSS
        this.addStyles();

        // 5. Añadir los listeners de eventos
        this.addListeners();

        // 6. Añadir listener global para cerrar el menú al hacer click fuera
        document.addEventListener('mousedown', this.boundOnGlobalClick, true);
    }

    /**
     * Inyecta el CSS necesario en el nodo DOM.
     */
    addStyles() {
        const style = document.createElement('style');
        style.innerHTML = `
            .navbar-menu {
                position: fixed; top: 0; left: 0;
                width: 100%; display: flex; flex-direction: row;
                background-color: #663399; /* Color de la barra */
                font-family: "VCR", monospace;
                z-index: 10000;
                box-sizing: border-box;
                padding-left: 10px; /* buttonSpacing */
                /* Añadido padding-right para el botón de config */
                padding-right: 10px; 
            }
            .navbar-button-wrapper {
                position: relative; /* Contexto para el dropdown */
                margin-right: 10px; /* buttonSpacing */
            }
            .navbar-button {
                width: 100px; /* buttonWidth */
                height: 30px; /* navHeight */
                background-color: #4a2c66; /* button originalColor */
                color: #FFFFFF;
                border: none;
                font-size: 18px;
                font-family: inherit;
                cursor: pointer;
                text-align: center;
                padding: 0;
            }
            .navbar-button:hover, 
            .navbar-button.active {
                background-color: #7a4fcf; /* button hoverColor */
            }

            /* --- ESTILOS NUEVOS PARA BOTÓN DE ÍCONO --- */
            .navbar-button.navbar-button-is-icon {
                width: 40px; /* Ancho más pequeño para botones de ícono */
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .navbar-button-icon {
                width: 18px;
                height: 18px;
                /* Invertir color para que sea blanco (si es un SVG simple) */
                filter: invert(1); 
            }
            /* --- FIN DE ESTILOS NUEVOS --- */

            .navbar-dropdown {
                position: absolute;
                left: 0;
                top: 30px; /* Asegurado */
                min-width: 150px; /* dropdownWidth (buttonWidth * 1.5) */
                background-color: #7a4fcf; /* dropdownColor */
                border: 2px solid #4a2c66;
                z-index: 11000; /* Por encima de la barra */
                box-shadow: 0 3px 5px rgba(0,0,0,0.3);
            }
            .navbar-item {
                display: block;
                height: 30px; /* itemHeight */
                line-height: 30px;
                padding: 0 10px;
                font-size: 16px;
                color: #FFFFFF;
                text-decoration: none;
                cursor: pointer;
                white-space: nowrap;
            }
            .navbar-item:hover {
                background-color: #8a6fdf; /* item hoverColor */
            }
            .navbar-divider {
                height: 1px;
                background-color: #4a2c66; /* Color oscuro de la paleta */
                margin: 4px 8px; /* Margen vertical y horizontal */
                border: none;
            }

            /* --- [ESTILOS NUEVOS PARA SUBMENÚ] --- */
            .navbar-item.has-submenu {
                position: relative; /* Contexto para el submenu */
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: default; /* No es clickable directamente */
            }
            .submenu-arrow {
                margin-left: 10px;
                font-size: 12px;
            }
            .navbar-submenu {
                display: none; /* Oculto por defecto */
                position: absolute;
                left: 100%; /* Posicionado a la derecha */
                top: -2px; /* Alineado con el borde superior del padre */
                min-width: 150px;
                background-color: #7a4fcf; /* Mismo color que el dropdown */
                border: 2px solid #4a2c66;
                z-index: 12000; /* Por encima de su padre */
                box-shadow: 3px 3px 5px rgba(0,0,0,0.3);
            }
            .navbar-item.has-submenu:hover > .navbar-submenu {
                display: block; /* Mostrar al hacer hover */
            }
            /* Estilos para los items dentro del submenú */
            .navbar-submenu .navbar-item {
                height: 30px;
                line-height: 30px;
            }
            .navbar-submenu .navbar-item:hover {
                background-color: #8a6fdf;
            }
            .navbar-submenu .navbar-divider {
                height: 1px;
                background-color: #4a2c66;
                margin: 4px 8px;
                border: none;
            }
            /* --- [FIN DE ESTILOS NUEVOS] --- */
        `;
        this.domElement.node.appendChild(style);
    }

    /**
     * Añade los listeners de click y hover a los botones y items.
     */
    addListeners() {
        const node = this.domElement.node;
        if (!node) return;

        const buttons = node.querySelectorAll('.navbar-button');
        
        buttons.forEach(button => {
            const dropdown = button.nextElementSibling; // El .navbar-dropdown
            if (!dropdown) return; // Botón sin dropdown

            // Lógica de click para abrir/cerrar
            button.addEventListener('mousedown', (e) => {
                e.preventDefault(); 
                e.stopPropagation();
                
                if (this.activeDropdown === dropdown) {
                    this.hideDropdown();
                } else {
                    this.showDropdown(dropdown, button);
                }
            });

            // Lógica de hover para cambiar de menú (si ya hay uno abierto)
            button.addEventListener('mouseenter', () => {
                if (this.activeDropdown && this.activeDropdown !== dropdown) {
                    this.showDropdown(dropdown, button);
                }
            });
        });

        // Lógica de click para los items del menú
        const items = node.querySelectorAll('a.navbar-item');
        items.forEach(item => {
            item.addEventListener('mousedown', (e) => {
                e.preventDefault(); 
                e.stopPropagation();
                
                const { module, method } = item.dataset;
                if(module && method) {
                    this.scene.executeModule(module, method);
                }
                this.hideDropdown(); // Ocultar todo al hacer click
            });
        });
    }

    /**
     * Se activa con cualquier click en el documento.
     * Cierra el dropdown si el click fue fuera de la barra de navegación.
     */
    onGlobalClick(e) {
        if (this.activeDropdown && !this.domElement.node.contains(e.target)) {
            this.hideDropdown();
        }
    }

    /**
     * Muestra un dropdown específico y oculta el anterior.
     */
    showDropdown(dropdownNode, buttonNode) {
        this.hideDropdown(); // Oculta el que esté activo

        dropdownNode.style.display = 'block';
        buttonNode.classList.add('active');
        
        this.activeDropdown = dropdownNode;
        this.activeDropdownButton = buttonNode;
    }

    /**
     * Oculta el dropdown activo.
     */
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

    isDropdownActive() {
        return this.activeDropdown !== null;
    }

    getActiveDropdown() {
        return this.activeDropdown;
    }

    updateSubmenuItems(menuName, itemName, newItems) {
        if (!this.domElement) return;

        // Buscar el item que coincida con el texto itemName
        const allItems = Array.from(this.domElement.node.querySelectorAll('.navbar-item'));
        const targetItem = allItems.find(el => {
            const text = Array.from(el.childNodes)
                .filter(node => node.nodeType === Node.TEXT_NODE)
                .map(node => node.textContent.trim())
                .join('');
            return text === itemName;
        });

        if (targetItem) {
            // Creamos un nuevo elemento div para reemplazar al targetItem con estructura de submenu
            const wrapper = document.createElement('div');
            wrapper.className = 'navbar-item has-submenu';
            wrapper.innerHTML = `
                <span>${itemName}</span>
                <span class="submenu-arrow">&gt;</span>
                <div class="navbar-submenu">
                    ${newItems.map(item => {
                         if (item.name === 'line') return '<div class="navbar-divider"></div>';
                         return `<a class="navbar-item" data-module="${item.module || ''}" data-method="${item.method || ''}">${item.name}</a>`;
                    }).join('')}
                </div>
            `;
            
            // Reemplazar en el DOM
            targetItem.parentNode.replaceChild(wrapper, targetItem);
            
            // Añadir listeners a los nuevos items
            const newLinks = wrapper.querySelectorAll('.navbar-submenu .navbar-item');
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

    /**
     * Limpia el elemento DOM y los listeners globales.
     */
    destroy() {
        if (this.domElement) {
            this.domElement.destroy();
            this.domElement = null;
        }

        if (this.boundOnGlobalClick) {
            document.removeEventListener('mousedown', this.boundOnGlobalClick, true);
            this.boundOnGlobalClick = null;
        }
    }
}