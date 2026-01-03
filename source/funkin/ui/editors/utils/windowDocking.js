/**
 * source/funkin/ui/editors/utils/windowDocking.js
 * Extensión para ModularWindow que gestiona el acoplamiento (Docking).
 */
export class DockingExtension {
    /**
     * @param {import('./window.js').ModularWindow} windowInstance La ventana a controlar.
     */
    constructor(windowInstance) {
        this.win = windowInstance;
        this.scene = windowInstance.scene;

        this.isDocked = false;
        this.snapThreshold = 50; // Distancia en px para activar el snap

        // Referencia a la caja fantasma (compartida o creada)
        this.ghostBox = null;

        // Configuración de layout actual (cuando está dockeada)
        this.currentDockConfig = null;

        // Inicializar listeners del sistema de docking
        this._initGhostBox();
    }

    _initGhostBox() {
        // Buscamos si ya existe una ghostbox en la escena (singleton visual)
        let ghost = document.getElementById('dock-ghost-box');

        if (!ghost) {
            ghost = document.createElement('div');
            ghost.id = 'dock-ghost-box';
            // Estilos de la caja morada (pointer-events: none es CRÍTICO)
            ghost.style.cssText = `
                position: absolute;
                background-color: rgba(100, 50, 150, 0.4); 
                border: 2px solid #663399;
                pointer-events: none !important;
                display: none;
                z-index: 9000;
                border-radius: 0;
                transition: all 0.1s ease-out;
            `;
            // Insertar en el padre del canvas para compartir coordenadas con las ventanas
            this.scene.game.canvas.parentNode.appendChild(ghost);
        }
        this.ghostBox = ghost;
    }

    /**
     * Fuerza a la ventana a acoplarse en una posición específica.
     * @param {object} config { x, y, width, height, align }
     */
    dock(config) {
        if (!this.win.windowNode) return;

        this.currentDockConfig = config;
        this.isDocked = true;
        this.win.isDocked = true; // Sincronizar flag con la clase padre

        const node = this.win.windowNode;

        // --- APLICAR ESTILOS DE DOCKING ---
        // Z-Index 50: Debajo del Navbar (10000) pero sobre el juego
        // pointer-events: auto: Vital para que la ventana funcione
        node.style.cssText = `
            width: ${config.width}px !important;
            height: ${config.height}px !important;
            top: ${config.y}px !important;
            left: ${config.x}px !important;
            position: absolute !important;
            margin: 0 !important;
            transform: none !important;
            box-shadow: none !important;
            border-top: none !important;
            border-radius: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            z-index: 50 !important; 
            background-color: #1e1e1e !important;
            pointer-events: auto !important;
        `;

        // Bordes cosméticos
        if (config.align === 'left') {
            node.style.borderLeft = 'none';
            node.style.borderRight = '2px solid #444';
        } else if (config.align === 'right') {
            node.style.borderRight = 'none';
            node.style.borderLeft = '2px solid #444';
        }

        // Asignar al HUD si es necesario
        if (this.scene.cameraManager) {
            this.scene.cameraManager.assignToHUD(this.win.domElement);
        }

        // Inyectar controles (aunque estén ocultos o modificados en modo dock)
        this.win._injectControls();

        // Preparar detección de "arrancar" (Undock)
        this._setupUndockTrigger();
    }

    /**
     * Prepara el evento para desacoplar al arrastrar.
     */
    _setupUndockTrigger() {
        // Usamos el hook onDragStart de ModularWindow
        this.win.onDragStart = (e) => {
            if (this.isDocked) {
                this._startUndockDetection(e);
            }
        };

        // Hooks para cuando YA estamos flotando (mostrar zona de dock)
        this.win.onDragMove = (e, x, y) => this._checkDockZones(e);
        this.win.onDragEnd = () => this._applyPendingDock();
    }

    _startUndockDetection(e) {
        const startX = e.clientX;
        const startY = e.clientY;
        const rect = this.win.windowNode.getBoundingClientRect();

        // Guardar offset del clic relativo a la ventana para que no salte
        const clickOffset = {
            x: startX - rect.left,
            y: startY - rect.top
        };

        const onMouseMove = (ev) => {
            const dx = ev.clientX - startX;
            const dy = ev.clientY - startY;
            // Umbral de 10px para evitar desacoplar por clic accidental
            if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
                this.undock(ev, clickOffset);
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

    /**
     * Convierte la ventana de Docked a Flotante sin saltos visuales.
     */
    undock(e, clickOffset) {
        console.log(`[Docking] Desacoplando ventana`);
        this.isDocked = false;
        this.win.isDocked = false;

        const node = this.win.windowNode;
        const floatW = this.win.config.width || 300;
        const floatH = 500;

        // 1. CÁLCULO DE POSICIÓN RELATIVA (Fix Teletransporte)
        const parentRect = node.parentElement.getBoundingClientRect();
        const currentRect = node.getBoundingClientRect(); // Posición visual real

        // Factor de escala (Zoom del navegador o ScaleManager)
        const scaleX = parentRect.width / this.scene.scale.width;
        const scaleY = parentRect.height / this.scene.scale.height;

        // Posición CSS necesaria = (Pos Visual - Pos Padre) / Escala
        const cssLeft = (currentRect.left - parentRect.left) / (scaleX || 1);
        const cssTop = (currentRect.top - parentRect.top) / (scaleY || 1);

        // 2. APLICAR ESTILOS DE FLOTANTE
        node.style.cssText = ''; // Limpiar !important del dock
        node.style.width = `${floatW}px`;
        node.style.height = `${floatH}px`;
        node.style.position = 'absolute';
        node.style.zIndex = '1000'; // Traer al frente
        node.style.backgroundColor = '#1e1e1e';
        node.style.border = '1px solid #663399';
        node.style.borderRadius = '6px';
        node.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
        node.style.display = 'flex';
        node.style.flexDirection = 'column';
        node.style.pointerEvents = 'auto'; // Asegurar interacción

        // Aplicar coordenadas calculadas
        node.style.left = `${cssLeft}px`;
        node.style.top = `${cssTop}px`;

        // Asegurar botones
        this.win._injectControls();

        // 3. TRANSFERIR ARRASTRE
        // Llamamos manualmente al inicio de drag de ModularWindow para que siga al mouse sin soltar
        this.win._onDragStart(e);
    }

    _checkDockZones(e) {
        const mouseX = e.clientX;
        const containerRect = this.scene.game.canvas.parentNode.getBoundingClientRect();

        const leftLimit = containerRect.left + this.snapThreshold;
        const rightLimit = containerRect.right - this.snapThreshold;

        // Usamos dimensiones del layout global (hardcodeadas o pasadas, aquí asumimos estándar)
        const navHeight = 30;
        const bottomHeight = 45;
        const dockWidth = 300;
        const gameH = this.scene.game.config.height;

        let zone = null;

        // Zona Izquierda
        if (mouseX < leftLimit) {
            zone = {
                cssLeft: '0px',
                cssTop: `${(navHeight / gameH) * 100}%`,
                cssWidth: `${(dockWidth / this.scene.game.config.width) * 100}%`,
                cssHeight: `calc(100% - ${((navHeight + bottomHeight) / gameH) * 100}%)`,
                logic: { x: 0, y: navHeight, width: dockWidth, height: gameH - navHeight - bottomHeight, align: 'left' }
            };
        }
        // Zona Derecha
        else if (mouseX > rightLimit) {
            zone = {
                cssLeft: 'auto',
                cssRight: '0px',
                cssTop: `${(navHeight / gameH) * 100}%`,
                cssWidth: `${(dockWidth / this.scene.game.config.width) * 100}%`,
                cssHeight: `calc(100% - ${((navHeight + bottomHeight) / gameH) * 100}%)`,
                logic: { x: this.scene.game.config.width - dockWidth, y: navHeight, width: dockWidth, height: gameH - navHeight - bottomHeight, align: 'right' }
            };
        }

        if (zone) {
            this.ghostBox.style.display = 'block';
            this.ghostBox.style.left = zone.cssLeft;
            this.ghostBox.style.right = zone.cssRight || 'auto';
            this.ghostBox.style.top = zone.cssTop;
            this.ghostBox.style.width = zone.cssWidth;
            this.ghostBox.style.height = zone.cssHeight;

            this.pendingDock = zone.logic;
        } else {
            this.ghostBox.style.display = 'none';
            this.pendingDock = null;
        }
    }

    _applyPendingDock() {
        this.ghostBox.style.display = 'none';
        if (this.pendingDock) {
            this.dock(this.pendingDock);
            this.pendingDock = null;
        }
    }
}