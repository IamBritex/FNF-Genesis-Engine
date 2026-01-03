import { ModularWindow } from '../utils/window.js';

export class WindowManager {
    constructor(scene) {
        this.scene = scene;
        this.windows = [];
        this.ghostBox = null;
        this.snapThreshold = 50; 

        this.layout = {
            navHeight: 30,
            bottomHeight: 45,
            dockWidth: 300
        };

        this.init();
    }

    init() {
        const htmlLeft = this.scene.cache.text.get('html_dock_left');
        const htmlRight = this.scene.cache.text.get('html_dock_right');

        if (!htmlLeft || !htmlRight) {
            console.error("WindowManager: Faltan templates HTML.");
            return;
        }

        this.createGhostBox();

        const screenW = this.scene.game.config.width;
        const screenH = this.scene.game.config.height;
        const dockHeight = screenH - this.layout.navHeight - this.layout.bottomHeight;

        const winLeft = new ModularWindow(this.scene, htmlLeft);
        const winRight = new ModularWindow(this.scene, htmlRight);

        // --- DOCKING INICIAL ---
        this.dockWindow(winLeft, { x: 0, y: this.layout.navHeight, width: this.layout.dockWidth, height: dockHeight, align: 'left' });
        this.dockWindow(winRight, { x: screenW - this.layout.dockWidth, y: this.layout.navHeight, width: this.layout.dockWidth, height: dockHeight, align: 'right' });

        this.windows.push(winLeft, winRight);
    }

    createGhostBox() {
        const div = document.createElement('div');
        div.id = 'dock-ghost-box';
        // Z-Index 9000 (Debajo del Navbar)
        div.style.cssText = `
            position: absolute;
            background-color: rgba(100, 50, 150, 0.4); 
            border: 2px solid #663399;
            pointer-events: none;
            display: none;
            z-index: 9000;
            border-radius: 0;
            transition: all 0.1s ease-out;
        `;
        this.scene.game.canvas.parentNode.appendChild(div);
        this.ghostBox = div;

        this.scene.events.once('shutdown', () => { if (this.ghostBox) this.ghostBox.remove(); });
    }

    dockWindow(win, layout) {
        if (!win.windowNode) return;
        const node = win.windowNode;

        // Z-Index 40: Base para docking
        node.style.cssText = `
            width: ${layout.width}px !important;
            height: ${layout.height}px !important;
            top: ${layout.y}px !important;
            left: ${layout.x}px !important;
            position: absolute !important;
            margin: 0 !important;
            transform: none !important;
            box-shadow: none !important;
            border-top: none !important;
            border-radius: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            z-index: 40 !important; 
            background-color: #1e1e1e !important;
            pointer-events: auto !important;
        `;

        if (layout.align === 'left') {
            node.style.borderLeft = 'none';
            node.style.borderRight = '2px solid #444';
        } else {
            node.style.borderRight = 'none';
            node.style.borderLeft = '2px solid #444';
        }

        if (this.scene.cameraManager) this.scene.cameraManager.assignToHUD(win.domElement);

        win.isDocked = true;
        this.setupInteractions(win);
    }

    setupInteractions(win) {
        win.onDragStart = (e) => {
            if (win.isDocked) this.startUndockDetection(win, e);
        };
        win.onDragMove = (e, x, y) => this.checkDockZones(e, x, y, win);
        win.onDragEnd = () => this.applyDocking(win);
    }

    startUndockDetection(win, e) {
        const startX = e.clientX;
        const startY = e.clientY;
        
        // Offset dentro de la ventana para que el mouse no salte al centro
        const rect = win.windowNode.getBoundingClientRect();
        const clickOffset = {
            x: startX - rect.left,
            y: startY - rect.top
        };

        const onMouseMove = (ev) => {
            const dx = ev.clientX - startX;
            const dy = ev.clientY - startY;
            if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
                this.undock(win, ev, clickOffset);
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
            }
        };
        const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    }

    undock(win, e, clickOffset) {
        console.log(`Undocking: ${win.config.title}`);
        win.isDocked = false;
        
        const node = win.windowNode;
        const floatW = win.config.width || 300;
        const floatH = 500;

        // 1. Obtener la posición visual actual en la pantalla
        const currentRect = node.getBoundingClientRect();
        
        // 2. Obtener el rectángulo del padre (que ahora es 0x0 pero su top-left es vital)
        const parentRect = node.parentElement.getBoundingClientRect();
        
        // 3. Como el padre es 0x0, scale es irrelevante o 1, pero usamos la escala de la escena por si acaso
        // En DOM normal scale es 1.
        
        // Posición visual absoluta
        const visualX = currentRect.left;
        const visualY = currentRect.top;
        
        // Ajuste relativo al padre (que está en 0,0 de la escena)
        const cssLeft = visualX - parentRect.left;
        const cssTop = visualY - parentRect.top;

        node.style.cssText = ''; 
        node.style.width = `${floatW}px`;
        node.style.height = `${floatH}px`;
        node.style.position = 'absolute';
        node.style.zIndex = '1000'; 
        node.style.backgroundColor = '#1e1e1e';
        node.style.border = '1px solid #663399';
        node.style.borderRadius = '6px';
        node.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
        node.style.display = 'flex';
        node.style.flexDirection = 'column';
        node.style.pointerEvents = 'auto';

        // Aplicar la posición calculada para que no salte
        node.style.left = `${cssLeft}px`;
        node.style.top = `${cssTop}px`;

        this.injectControls(win);

        // Pasar el control al arrastre
        win._onDragStart(e);
    }

    checkDockZones(e, x, y, win) {
        const mouseX = e.clientX; 
        const containerRect = this.scene.game.canvas.parentNode.getBoundingClientRect();
        
        const leftLimit = containerRect.left + this.snapThreshold;
        const rightLimit = containerRect.right - this.snapThreshold;

        const { navHeight, bottomHeight, dockWidth } = this.layout;
        const gameH = this.scene.game.config.height;
        const dockHeight = gameH - navHeight - bottomHeight;

        let zone = null;

        if (mouseX < leftLimit) {
            zone = { 
                cssLeft: '0px', cssTop: `${(navHeight / gameH) * 100}%`, 
                cssWidth: `${(dockWidth / this.scene.game.config.width) * 100}%`, 
                cssHeight: `calc(100% - ${((navHeight + bottomHeight) / gameH) * 100}%)`,
                logic: { x: 0, y: navHeight, w: dockWidth, h: dockHeight, align: 'left' }
            };
        } else if (mouseX > rightLimit) {
            zone = { 
                cssLeft: 'auto', cssRight: '0px', cssTop: `${(navHeight / gameH) * 100}%`, 
                cssWidth: `${(dockWidth / this.scene.game.config.width) * 100}%`, 
                cssHeight: `calc(100% - ${((navHeight + bottomHeight) / gameH) * 100}%)`,
                logic: { x: this.scene.game.config.width - dockWidth, y: navHeight, w: dockWidth, h: dockHeight, align: 'right' }
            };
        }

        if (zone) {
            this.ghostBox.style.display = 'block';
            this.ghostBox.style.left = zone.cssLeft;
            this.ghostBox.style.right = zone.cssRight || 'auto';
            this.ghostBox.style.top = zone.cssTop;
            this.ghostBox.style.width = zone.cssWidth;
            this.ghostBox.style.height = zone.cssHeight;
            win.pendingDock = zone.logic;
        } else {
            this.ghostBox.style.display = 'none';
            win.pendingDock = null;
        }
    }

    applyDocking(win) {
        this.ghostBox.style.display = 'none';
        if (win.pendingDock) {
            this.dockWindow(win, {
                x: win.pendingDock.x, y: win.pendingDock.y,
                width: win.pendingDock.w, height: win.pendingDock.h, align: win.pendingDock.align
            });
            win.pendingDock = null;
        }
    }

    injectControls(win) {
        let container = win.windowNode.querySelector('.window-controls');
        if (!container) {
            container = document.createElement('div');
            container.className = 'window-controls';
            const header = win.windowNode.querySelector('.window-header');
            if (header) header.appendChild(container);
        }
        container.innerHTML = '';

        const minBtn = document.createElement('button');
        minBtn.className = 'win-btn minimize';
        minBtn.innerHTML = `<img src="public/images/ui/editors/minimize.svg" width="12">`;
        minBtn.onclick = (e) => { e.stopPropagation(); win.toggleMinimize(minBtn); };

        const closeBtn = document.createElement('button');
        closeBtn.className = 'win-btn close';
        closeBtn.innerHTML = `<img src="public/images/ui/editors/close.svg" width="12">`;
        closeBtn.onclick = (e) => { e.stopPropagation(); win.destroy(); };

        container.appendChild(minBtn);
        container.appendChild(closeBtn);
    }
}