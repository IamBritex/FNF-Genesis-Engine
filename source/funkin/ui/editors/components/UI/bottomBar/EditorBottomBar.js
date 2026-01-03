/**
 * source/funkin/ui/editors/components/UI/bottomBar/EditorBottomBar.js
 * Barra inferior estilo DaVinci Resolve.
 * Usa SVGs en línea para garantizar que los iconos SIEMPRE se vean.
 */
export class EditorBottomBar {
    constructor(scene) {
        this.scene = scene;
        this.domElement = null;
        this.activeId = null;

        // DEFINICIÓN DE ICONOS (Código SVG directo, sin archivos externos)
        this.editorsList = [
            {
                name: 'Stage',
                id: 'stage',
                // Icono de Capas / Escenario
                svg: `<svg viewBox="0 0 24 24"><path d="M11.99 18.54l-7.37-5.73L3 14.07l9 7 9-7-1.63-1.27-7.38 5.74zM12 16l7.36-5.73L21 9l-9-7-9 7 1.63 1.27L12 16z"/></svg>`
            },
            {
                name: 'Animation',
                id: 'anim',
                // Icono de Película / Animación
                svg: `<svg viewBox="0 0 24 24"><path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/></svg>`
            },
            {
                name: 'Chart',
                id: 'chart',
                // Icono de Nota Musical / Chart
                svg: `<svg viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>`
            }
        ];
    }

    create(initialId, onSelectCallback) {
        this.activeId = initialId;

        // 1. Construir HTML de los botones
        let buttonsHTML = '';
        this.editorsList.forEach(btn => {
            const isActive = btn.id === this.activeId;
            const activeClass = isActive ? 'active' : '';

            buttonsHTML += `
                <div class="davinci-btn ${activeClass}" data-id="${btn.id}">
                    <div class="davinci-icon">
                        ${btn.svg} </div>
                    <span class="davinci-text">${btn.name}</span>
                </div>
            `;
        });

        // 2. CSS + HTML Estructural
        // Nota: Agregamos fill: currentColor para que el icono tome el color del texto
        const fullHTML = `
        <style>
            .davinci-bar-container {
                width: 1280px; 
                height: 45px;
                background-color: #1e1e1e; /* Gris DaVinci */
                border-top: 1px solid #333;
                display: flex;
                flex-direction: row;
                justify-content: center;
                align-items: center;
                gap: 5px;
                font-family: 'VCR', sans-serif;
                pointer-events: auto;
                user-select: none;
                box-shadow: 0 -4px 12px rgba(0,0,0,0.5);
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }

            .davinci-btn {
                height: 100%;
                min-width: 130px;
                padding: 0 15px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                cursor: pointer;
                color: #777; /* Color inactivo */
                background-color: transparent;
                transition: all 0.2s ease;
                border-bottom: 3px solid transparent;
                position: relative;
            }

            .davinci-btn:hover {
                background-color: #2a2a2a;
                color: #bbb;
            }

            .davinci-btn.active {
                color: #fff; /* Blanco brillante activo */
                background-color: #252525;
                border-bottom: 3px solid #663399; /* Borde Morado */
            }

            /* Estilo para los SVGs */
            .davinci-icon {
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .davinci-icon svg {
                width: 18px;
                height: 18px;
                fill: currentColor; /* IMPORTANTE: El icono hereda el color del texto */
                opacity: 0.8;
                transition: transform 0.2s;
            }

            .davinci-btn.active .davinci-icon svg {
                opacity: 1;
                filter: drop-shadow(0 0 2px rgba(255,255,255,0.3));
            }

            .davinci-text {
                font-size: 13px;
                font-weight: bold;
                letter-spacing: 0.5px;
                text-transform: uppercase;
                margin-top: 2px; /* Ajuste visual */
            }
        </style>
        
        <div class="davinci-bar-container">
            ${buttonsHTML}
        </div>
        `;

        // 3. Crear el DOM en Phaser
        this.domElement = this.scene.add.dom(640, 720).createFromHTML(fullHTML);
        this.domElement.setOrigin(0.5, 1);

        // 4. Lógica de Eventos
        this.domElement.addListener('mousedown');
        this.domElement.on('mousedown', (e) => {
            const btn = e.target.closest('.davinci-btn');
            if (btn) {
                e.preventDefault();
                e.stopPropagation();

                const id = btn.getAttribute('data-id');
                if (this.activeId !== id) {
                    this.setActive(id);
                    if (onSelectCallback) onSelectCallback(id);
                }
            }
        });

        if (this.scene.cameraManager) {
            this.scene.cameraManager.assignToHUD(this.domElement);
        }
    }

    setActive(id) {
        this.activeId = id;
        if (!this.domElement) return;

        const container = this.domElement.node.querySelector('.davinci-bar-container');
        if (container) {
            const btns = container.querySelectorAll('.davinci-btn');
            btns.forEach(btn => {
                if (btn.getAttribute('data-id') === id) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }
    }

    destroy() {
        if (this.domElement) {
            this.domElement.destroy();
        }
    }
}