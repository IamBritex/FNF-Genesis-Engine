/**
 * source/funkin/ui/editors/utils/window.js
 * Motor de Ventanas Modulares (V9 - Zero-Size Wrapper Fix).
 */
export class ModularWindow {

    static openPopups = [];
    static _listenersInitialized = false;

    static initGlobalListeners() {
        if (ModularWindow._listenersInitialized) return;
        ModularWindow._listenersInitialized = true;
        window.addEventListener('beforeunload', () => {
            ModularWindow.openPopups.forEach(p => !p.closed && p.close());
            ModularWindow.openPopups = [];
        });
    }

    constructor(scene, htmlContentOrConfig) {
        ModularWindow.initGlobalListeners();
        this.scene = scene;

        this.onDragStart = null;
        this.onDragMove = null;
        this.onDragEnd = null;

        let htmlContent = '';
        let configOverride = {};

        if (typeof htmlContentOrConfig === 'string') {
            htmlContent = htmlContentOrConfig;
        } else if (typeof htmlContentOrConfig === 'object') {
            configOverride = htmlContentOrConfig;
            htmlContent = typeof htmlContentOrConfig.content === 'function' 
                ? htmlContentOrConfig.content() 
                : (htmlContentOrConfig.content || '');
        }

        if (!htmlContent.includes('global.css')) {
            const globalLink = '<link rel="stylesheet" href="source/funkin/ui/editors/GUI/global.css">';
            htmlContent = htmlContent.includes('</head>') 
                ? htmlContent.replace('</head>', `${globalLink}\n</head>`) 
                : `<head>${globalLink}</head>` + htmlContent;
        }
        
        this.htmlContent = htmlContent;
        const parser = new DOMParser();
        this.doc = parser.parseFromString(this.htmlContent, 'text/html');
        this.config = { ...this._parseConfig(this.doc), ...configOverride };

        this.domElement = null;
        this.windowNode = null;
        this.popupWindow = null;
        this.onDestroy = null;

        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.scaleFactors = { x: 1, y: 1 };
        
        this.isMinimized = false;
        this.originalHeight = 'auto';
        this.isDocked = false; 

        this._createDOM();

        try {
            if (this.scene.cache.audio.exists('editorOpen')) this.scene.sound.play('editorOpen');
        } catch (e) { }
    }

    _parseConfig(doc) {
        const config = { width: 400, height: 'auto', draggable: true, overlay: false, popup: false, minimize: true, close: true, title: 'Ventana' };
        const getMeta = (n) => doc.querySelector(`meta[name="${n}"]`)?.getAttribute('content') || '';
        
        getMeta('viewport').split(',').forEach(p => {
            const [k, v] = p.split('=').map(s => s.trim());
            if (k === 'width') config.width = parseInt(v);
            if (k === 'height') config.height = parseInt(v);
        });

        getMeta('window').split(',').forEach(p => {
            const [k, v] = p.split('=').map(s => s.trim());
            if (['draggable','popup','overlay','minimize','close'].includes(k)) config[k] = (v === 'true');
            if (k === 'title') config.title = v;
        });
        
        const t = doc.querySelector('title');
        if (t && !config.title) config.title = t.textContent;
        return config;
    }

    _createDOM() {
        this.domElement = this.scene.add.dom(0, 0).createElement('div');
        this.domElement.setOrigin(0, 0);
        
        // [FIX CRÍTICO] Tamaño 0x0 para no bloquear clics en otras áreas
        // overflow: visible permite que la ventana se vea aunque el contenedor sea 0x0
        this.domElement.node.style.cssText = `
            width: 0px; 
            height: 0px; 
            overflow: visible;
            pointer-events: none !important; 
            position: absolute; 
            top: 0; 
            left: 0;
            z-index: 10;
        `;

        const styles = Array.from(this.doc.querySelectorAll('style')).map(s => s.outerHTML).join('');
        const links = Array.from(this.doc.querySelectorAll('link')).map(l => l.outerHTML).join('');
        
        if (!this.doc.querySelector('.modular-window')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'modular-window';
            
            // La ventana interna SÍ recibe eventos
            wrapper.style.cssText = 'pointer-events: auto !important; position: absolute;';
            
            wrapper.innerHTML = `
                <div class="window-header window-drag-handle">
                    <span class="window-title">${this.config.title}</span>
                    <div class="window-controls"></div>
                </div>
                <div class="window-content">${this.doc.body ? this.doc.body.innerHTML : ''}</div>
            `;
            
            this.domElement.node.innerHTML = links + styles;
            this.domElement.node.appendChild(wrapper);
            this.windowNode = wrapper;
        } else {
            this.domElement.node.innerHTML = links + styles + this.doc.body.innerHTML;
            this.windowNode = this.domElement.node.querySelector('.modular-window');
            if (this.windowNode) {
                this.windowNode.style.pointerEvents = 'auto';
                this.windowNode.style.position = 'absolute';
            }
        }

        if (this.windowNode) {
            if (this.config.width) this.windowNode.style.width = `${this.config.width}px`;
            if (this.config.height) {
                this.windowNode.style.height = (this.config.height === 'auto') ? 'auto' : `${this.config.height}px`;
            }
            this.originalHeight = this.windowNode.style.height || 'auto';
            this._injectControls();
        }

        if (this.config.overlay) {
            const ov = document.createElement('div');
            ov.className = 'modular-overlay';
            // El overlay debe ocupar toda la pantalla, así que lo forzamos fuera del flujo 0x0
            ov.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; pointer-events: auto; background: rgba(0,0,0,0.7);';
            this.domElement.node.insertBefore(ov, this.domElement.node.firstChild);
        }

        this._runScripts();
        this._attachListeners();
    }

    _injectControls() {
        if (!this.windowNode) return;
        const header = this.windowNode.querySelector('.window-header');
        if (!header) return;

        let c = header.querySelector('.window-controls');
        if (!c) {
            c = document.createElement('div');
            c.className = 'window-controls';
            header.appendChild(c);
        }
        c.innerHTML = ''; 

        if (this.config.minimize) {
            const b = document.createElement('button');
            b.className = 'win-btn minimize';
            b.innerHTML = `<img src="public/images/ui/editors/minimize.svg" alt="_">`;
            b.onclick = (e) => { e.stopPropagation(); this.toggleMinimize(b); };
            c.appendChild(b);
        }
        if (this.config.close) {
            const b = document.createElement('button');
            b.className = 'win-btn close';
            b.innerHTML = `<img src="public/images/ui/editors/close.svg" alt="X">`;
            b.onclick = (e) => { e.stopPropagation(); this.destroy(); };
            c.appendChild(b);
        }
    }

    toggleMinimize(btn) {
        this.isMinimized = !this.isMinimized;
        const content = this.windowNode.querySelector('.window-content');
        if (this.isMinimized) {
            this.originalHeight = this.windowNode.style.height || `${this.windowNode.offsetHeight}px`;
            this.windowNode.classList.add('minimized');
            if(content) content.style.display = 'none';
            this.windowNode.style.height = '35px';
        } else {
            this.windowNode.classList.remove('minimized');
            if(content) content.style.display = 'flex';
            this.windowNode.style.height = this.originalHeight;
        }
    }

    _runScripts() {
        this.doc.querySelectorAll('script').forEach(s => {
            const ns = document.createElement('script');
            ns.textContent = s.textContent;
            this.domElement.node.appendChild(ns);
        });
    }

    _attachListeners() {
        const root = this.domElement.node;
        if (this.config.draggable && this.windowNode) {
            const handle = this.windowNode.querySelector('.window-drag-handle') || this.windowNode.querySelector('.window-header');
            if (handle) {
                this._boundDragStart = this._onDragStart.bind(this);
                this._boundDragMove = this._onDragMove.bind(this);
                this._boundDragEnd = this._onDragEnd.bind(this);
                handle.addEventListener('mousedown', this._boundDragStart);
                window.addEventListener('mousemove', this._boundDragMove);
                window.addEventListener('mouseup', this._boundDragEnd);
            }
        }
        if (this.windowNode) {
            // Traer al frente al hacer clic
            this.windowNode.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                // Subir z-index temporalmente para estar encima de otras ventanas
                this.windowNode.style.zIndex = '1001';
            });
            this.windowNode.addEventListener('wheel', e => e.stopPropagation());
        }
    }

    _onDragStart(e) {
        if (['BUTTON', 'A', 'INPUT', 'IMG', 'TEXTAREA'].includes(e.target.tagName)) return;

        if (this.onDragStart) this.onDragStart(e);
        if (this.isDocked) return;

        this.isDragging = true;
        const rect = this.windowNode.getBoundingClientRect();
        
        // Al usar container 0x0, el parentRect siempre está en 0,0 visualmente si el canvas no tiene margin
        // Pero calculamos igual por si acaso
        const parentRect = this.windowNode.parentElement.getBoundingClientRect();
        
        this.scaleFactors.x = parentRect.width > 0 ? parentRect.width / this.scene.scale.width : 1;
        this.scaleFactors.y = parentRect.height > 0 ? parentRect.height / this.scene.scale.height : 1;
        
        // Si el contenedor es 0x0, asumimos escala 1 para evitar divisiones por cero
        if (this.domElement.node.offsetWidth === 0) {
             this.scaleFactors.x = 1;
             this.scaleFactors.y = 1;
        }

        this.dragOffset.x = e.clientX - rect.left;
        this.dragOffset.y = e.clientY - rect.top;

        this.windowNode.style.transform = 'none';
        this.windowNode.style.margin = '0';
        
        // Coordenadas absolutas
        // Como el padre es 0x0 y está en top:0 left:0, la posición CSS es prácticamente la posición visual
        const logicLeft = (rect.left - parentRect.left) / this.scaleFactors.x;
        const logicTop = (rect.top - parentRect.top) / this.scaleFactors.y;
        
        this.windowNode.style.left = `${logicLeft}px`;
        this.windowNode.style.top = `${logicTop}px`;
        this.windowNode.style.zIndex = '1001'; // Traer al frente
    }

    _onDragMove(e) {
        if (!this.isDragging || !this.windowNode) return;
        e.preventDefault();

        const parentRect = this.windowNode.parentElement.getBoundingClientRect();
        const mouseRelX = e.clientX - parentRect.left;
        const mouseRelY = e.clientY - parentRect.top;

        const logicX = (mouseRelX - this.dragOffset.x) / this.scaleFactors.x;
        const logicY = (mouseRelY - this.dragOffset.y) / this.scaleFactors.y;

        this.windowNode.style.left = `${logicX}px`;
        this.windowNode.style.top = `${logicY}px`;

        if (this.onDragMove) this.onDragMove(e, logicX, logicY);
    }

    _onDragEnd(e) {
        if (this.isDragging) {
            this.isDragging = false;
            if (this.windowNode) this.windowNode.style.zIndex = '100'; // Restaurar nivel normal
            if (this.onDragEnd) this.onDragEnd(e);
        }
    }

    openInPopup() { /* ... */ }
    
    destroy() {
        if (this.popupWindow && !this.popupWindow.closed) this.popupWindow.close();
        if (this._boundDragMove) {
            window.removeEventListener('mousemove', this._boundDragMove);
            window.removeEventListener('mouseup', this._boundDragEnd);
        }
        if (this.domElement) this.domElement.destroy();
        if (this.onDestroy) this.onDestroy();
    }
}