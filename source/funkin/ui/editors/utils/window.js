/**
 * source/funkin/ui/editors/window.js
 * Un sistema de ventanas modulares HTML/CSS para Phaser.
 */
export class ModularWindow {
    
    static openPopups = [];

    static initGlobalListeners() {
        if (ModularWindow._listenersInitialized) return;
        ModularWindow._listenersInitialized = true;

        window.addEventListener('beforeunload', () => {
            ModularWindow.openPopups.forEach(popup => {
                if (popup && !popup.closed) {
                    popup.close();
                }
            });
            ModularWindow.openPopups = [];
        });
    }

    constructor(scene, config) {
        ModularWindow.initGlobalListeners();

        this.scene = scene;
        this.config = this.applyDefaults(config);
        
        this.domElement = null;
        this.windowElement = null; 
        
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.windowStartX = 0;
        this.windowStartY = 0;
        this.dragTopLimit = 30; 
        
        this.onDestroy = null; 
        
        this.originalParent = null;
        this.popupWindow = null;

        this.createWindow();
        this.addListeners();
        
        if (this.config.move) {
            this.addDragListeners();
        }

        try {
            // Reproducir sonido de apertura si existe
            if (this.scene.cache.audio.exists('editorOpen')) {
                this.scene.sound.play('editorOpen');
            }
        } catch (e) {
            console.warn("No se pudo reproducir el sonido 'editorOpen'.");
        }
    }

    applyDefaults(config) {
        return {
            width: config.width || 400,
            height: config.height !== undefined ? config.height : 300,
            x: config.x !== undefined ? config.x : null,
            y: config.y !== undefined ? config.y : null,
            title: config.title || 'Ventana',
            close: config.close || false,
            maximize: config.maximize || false,
            minimize: config.minimize || false,
            popup: config.popup || false, 
            overlay: config.overlay || false,
            move: config.move || false,
            content: config.content || (() => { return ''; }),
            styleOfContent: config.styleOfContent || (() => { return ''; })
        };
    }

    createWindow() {
        const sceneWidth = this.scene.scale.width;
        const sceneHeight = this.scene.scale.height;

        const initialTop = this.config.y !== null ? this.config.y : (sceneHeight - (this.config.height === 'auto' ? 300 : this.config.height)) / 2;
        const initialLeft = this.config.x !== null ? this.config.x : (sceneWidth - this.config.width) / 2;
        const heightStyle = this.config.height === 'auto' ? '' : `height: ${this.config.height}px;`;

        // Overlay fijo para cubrir toda la pantalla
        const overlayStyle = this.config.overlay ? `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(5px);
            -webkit-backdrop-filter: blur(5px);
            z-index: 10; /* Overlay debajo de la ventana */
            pointer-events: auto;
        ` : '';

        // La ventana tiene un z-index mayor que el overlay
        const windowZIndex = 'z-index: 20;';

        const containerStyle = `width: ${sceneWidth}px; height: ${sceneHeight}px; pointer-events: none;`;

        // Rutas de iconos corregidas: public/images/ui/editors/
        const iconPath = "public/images/ui/editors";
        
        const html = `
            <div class="modular-window-container" id="window-${this.scene.sys.sceneKey}" style="${containerStyle}">
                ${this.config.overlay ? `<div class="modular-window-overlay" style="${overlayStyle}"></div>` : ''}

                <div class="modular-window" style="width: ${this.config.width}px; ${heightStyle} top: ${initialTop}px; left: ${initialLeft}px; ${windowZIndex}">
                    
                    <div class="window-title-bar" style="cursor: ${this.config.move ? 'grab' : 'default'};">
                        <span class="window-title">${this.config.title}</span>
                        <div class="window-buttons">
                            ${this.config.popup ? `<button class="window-btn" data-action="popup" title="Abrir en nueva ventana"><img src="${iconPath}/open_in_new.svg" alt="Pop"></button>` : ''}
                            ${this.config.minimize ? `<button class="window-btn" data-action="minimize"><img src="${iconPath}/minimize.png" alt="_"></button>` : ''}
                            ${this.config.maximize ? `<button class="window-btn" data-action="maximize"><img src="${iconPath}/maximize.png" alt="[]"></button>` : ''}
                            ${this.config.close ? `<button class="window-btn close" data-action="close"><img src="${iconPath}/close.png" alt="X"></button>` : ''}
                        </div>
                    </div>
                    
                    <div class="window-content">
                        <style>
                            ${this.config.styleOfContent()}
                        </style>
                        ${this.config.content()}
                    </div>
                </div>
            </div>
        `;

        this.domElement = this.scene.add.dom(0, 0).setOrigin(0, 0).createFromHTML(html);
        this.domElement.setPerspective(800);
        this.windowElement = this.domElement.node.querySelector('.modular-window');
        
        // Evitar propagación de eventos al juego
        const stopPropagation = (e) => e.stopPropagation();
        this.windowElement.addEventListener('mousedown', stopPropagation);
        this.windowElement.addEventListener('wheel', stopPropagation);
        this.windowElement.addEventListener('pointerdown', stopPropagation);

        if (this.config.overlay) {
            const overlay = this.domElement.node.querySelector('.modular-window-overlay');
            if (overlay) {
                overlay.addEventListener('mousedown', stopPropagation);
                overlay.addEventListener('wheel', stopPropagation);
                overlay.addEventListener('pointerdown', stopPropagation);
            }
        }
    }

    addListeners() {
        if (!this.domElement) return;
        this.bindWindowButtons(this.domElement.node);
    }

    bindWindowButtons(container) {
        const buttons = container.querySelectorAll('.window-btn');
        buttons.forEach(button => {
            const newBtn = button.cloneNode(true);
            button.parentNode.replaceChild(newBtn, button);

            newBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = e.currentTarget.dataset.action;
                switch(action) {
                    case 'close': 
                        if (this.popupWindow && !this.popupWindow.closed) this.popupWindow.close();
                        else this.destroy(); 
                        break;
                    case 'maximize': console.log('Acción: Maximizar (no implementado)'); break;
                    case 'minimize': this.toggleMinimize(); break;
                    case 'popup': this.openInPopup(); break;
                }
            });
        });
    }

    openInPopup() {
        const w = this.config.width || 800;
        const h = (this.config.height === 'auto' || !this.config.height) ? 600 : this.config.height;
        
        this.originalParent = this.windowElement.parentNode;

        const specs = `width=${w},height=${h},menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes,alwaysOnTop=yes,frame=false`;
        this.popupWindow = window.open("", "_blank", specs);
        
        if (!this.popupWindow) return;

        ModularWindow.openPopups.push(this.popupWindow);

        const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'));
        styles.forEach(styleNode => {
            this.popupWindow.document.head.appendChild(styleNode.cloneNode(true));
        });

        const electronStyle = this.popupWindow.document.createElement('style');
        electronStyle.innerHTML = `
            .window-title-bar {
                -webkit-app-region: drag; 
                cursor: default; 
                padding-top: 5px; 
            }
            .window-buttons, .window-btn {
                -webkit-app-region: no-drag;
                cursor: pointer;
            }
        `;
        this.popupWindow.document.head.appendChild(electronStyle);

        const newBody = this.popupWindow.document.body;
        newBody.style.backgroundColor = '#2a1836';
        newBody.style.margin = '0';
        newBody.style.height = '100%';
        newBody.style.overflow = 'hidden';
        newBody.style.display = 'flex';
        newBody.style.flexDirection = 'column';

        const content = this.windowElement.querySelector('.window-content');
        const titleBar = this.windowElement.querySelector('.window-title-bar');
        
        const buttonsToHide = titleBar.querySelectorAll('.window-btn:not(.close)');
        buttonsToHide.forEach(btn => btn.style.display = 'none');

        newBody.appendChild(titleBar);
        newBody.appendChild(content);

        content.style.height = '100%';
        content.style.borderRadius = '0';
        titleBar.style.borderRadius = '0';
        titleBar.style.cursor = 'default'; 

        this.domElement.setVisible(false);

        this.popupWindow.addEventListener('beforeunload', () => {
            const idx = ModularWindow.openPopups.indexOf(this.popupWindow);
            if (idx > -1) ModularWindow.openPopups.splice(idx, 1);

            buttonsToHide.forEach(btn => btn.style.display = 'block');

            content.style.height = ''; 
            content.style.borderRadius = '';
            titleBar.style.borderRadius = '';
            titleBar.style.cursor = this.config.move ? 'grab' : 'default';

            if (this.originalParent && this.windowElement) {
                this.windowElement.appendChild(titleBar);
                this.windowElement.appendChild(content);
                
                this.domElement.setVisible(true);
                this.bindWindowButtons(this.windowElement);
            }
            
            this.popupWindow = null;
        });
    }

    toggleMinimize() {
        const content = this.windowElement.querySelector('.window-content');
        const isMinimized = content.style.display === 'none';
        if (isMinimized) {
            content.style.display = 'block'; 
            this.windowElement.style.height = this.config.height !== 'auto' ? `${this.config.height}px` : 'auto';
        } else {
            content.style.display = 'none';
            this.windowElement.style.height = 'auto'; 
        }
    }

    addDragListeners() {
        const titleBar = this.domElement.node.querySelector('.window-title-bar');
        if (!titleBar) return;

        const onDragStart = (e) => {
            if (e.button !== 0) return;
            e.preventDefault(); 
            this.isDragging = true;
            this.dragStartX = e.clientX;
            this.dragStartY = e.clientY;
            this.windowStartX = parseFloat(this.windowElement.style.left);
            this.windowStartY = parseFloat(this.windowElement.style.top);
            titleBar.style.cursor = 'grabbing';
            document.body.style.userSelect = 'none';
        };

        const onDragMove = (e) => {
            if (!this.isDragging) return;
            const dx = e.clientX - this.dragStartX;
            const dy = e.clientY - this.dragStartY;
            let newX = this.windowStartX + dx;
            let newY = this.windowStartY + dy;

            const screenWidth = this.scene.scale.width;
            const screenHeight = this.scene.scale.height;
            const windowWidth = this.windowElement.offsetWidth;
            const windowHeight = this.windowElement.offsetHeight;

            newX = Math.max(0, Math.min(newX, screenWidth - windowWidth));
            newY = Math.max(this.dragTopLimit, Math.min(newY, screenHeight - windowHeight));

            this.windowElement.style.left = `${newX}px`;
            this.windowElement.style.top = `${newY}px`;
        };

        const onDragEnd = (e) => {
            if (this.isDragging) {
                this.isDragging = false;
                titleBar.style.cursor = 'grab';
                document.body.style.userSelect = 'auto';
            }
        };
        
        titleBar.addEventListener('mousedown', onDragStart);
        window.addEventListener('mousemove', onDragMove);
        window.addEventListener('mouseup', onDragEnd);

        this.dragListeners = { onDragStart, onDragMove, onDragEnd };
    }

    destroy() {
        if (this.popupWindow && !this.popupWindow.closed) {
            this.popupWindow.close(); 
        }

        if (this.domElement) {
            try { 
                if (this.scene.cache.audio.exists('editorClose')) {
                    this.scene.sound.play('editorClose'); 
                }
            } catch (e) {}

            if (this.config.move && this.dragListeners && this.domElement.node) {
                const titleBar = this.domElement.node.querySelector('.window-title-bar');
                if (titleBar) titleBar.removeEventListener('mousedown', this.dragListeners.onDragStart);
                window.removeEventListener('mousemove', this.dragListeners.onDragMove);
                window.removeEventListener('mouseup', this.dragListeners.onDragEnd);
            }
            
            this.domElement.destroy();
            this.domElement = null;

            if (this.onDestroy) this.onDestroy();
        }
    }

    static getWindowCSS() {
        const scrollTrackColor = '#4a2c66'; 
        const scrollThumbColor = '#7a4fcf'; 
        const scrollThumbBorder = '#4a2c66'; 

        return `
            .modular-window-container { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 9000; }
            .modular-window {
                position: absolute; background-color: #4a2c66; border: 2px solid #7a4fcf; border-radius: 8px;
                box-shadow: 0 5px 20px rgba(0,0,0,0.5); display: flex; flex-direction: column; font-family: Arial, sans-serif;
                pointer-events: auto; resize: none; max-width: 90vw; max-height: 90vh; overflow: hidden;
            }
            .window-title-bar {
                background-color: #663399; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center;
                border-top-left-radius: 6px; border-top-right-radius: 6px; user-select: none; flex-shrink: 0;
            }
            .window-title { color: white; font-weight: bold; pointer-events: none; }
            .window-buttons { display: flex; }
            .window-btn {
                background: transparent; border: none; width: 20px; height: 20px; margin-left: 8px; border-radius: 4px; cursor: pointer; padding: 5px;
            }
            .window-btn img { width: 100%; height: 100%; display: block; pointer-events: none; }
            .window-btn.close:hover { background-color: #e64a4a; }
            .window-btn.not(.close):hover { background-color: #999; }
            
            .window-content {
                padding: 15px; flex-grow: 1; min-height: 0; overflow-y: auto; overflow-x: hidden; color: white; background-color: #4a2c66;
                border-bottom-left-radius: 6px; border-bottom-right-radius: 6px; position: relative;
            }
            .window-content::-webkit-scrollbar { width: 10px; }
            .window-content::-webkit-scrollbar-track { background: ${scrollTrackColor}; border-bottom-right-radius: 6px; }
            .window-content::-webkit-scrollbar-thumb { background-color: ${scrollThumbColor}; border-radius: 4px; border: 2px solid ${scrollThumbBorder}; }
            .window-content::-webkit-scrollbar-thumb:hover { background-color: #8b63d6; }
        `;
    }
}