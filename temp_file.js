class CharacterEditor extends Phaser.Scene {
    constructor() {
        super({ key: 'CharacterEditorState' });
        this.gameCamera = null;
        this.hudCamera = null;
        this.backspaceCooldown = false;
        
        // Variables para el personaje
        this.currentCharacter = null;
        this.characterAnimations = [];
        this.characterSprite = null;
        this.currentAnimation = 'idle';
        
        // Mapeo de animaciones sing
        this.singAnimations = {
            idle: null,
            singLEFT: null,
            singDOWN: null,
            singUP: null,
            singRIGHT: null,
            singLEFTmiss: null,
            singDOWNmiss: null,
            singUPmiss: null,
            singRIGHTmiss: null
        };
        
        // UI Elements
        this.animationBlocks = [];
        this.animationContainer = null;
        this.frameInfoText = null;
        
        // Sistema de ventanas modales
        this.modalWindows = {};
        this.windowZIndex = 3000; // Aumentar profundidad para estar sobre el nav
        
        // Variables para arrastre manual
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.draggedWindow = null;
        
        // Variables para modo fantasma y movimiento libre
        this.isGhostMode = false;
        this.ghostSprite = null;
        this.characterDragging = false;
        
        // Variables para bloquear interacción con gameCamera
        this.modalInteractionActive = false;
        this.loadingText = null;
        
        // Variables para sistema de input personalizado
        this.activeInput = null;
        this.inputBackspaceBlocked = false;
        
        // Variables para animación mapping state
        this.currentAnimationSelection = null;
        this.usedAnimations = new Set();
    }

    preload() {
        // Sonidos
        this.load.audio('selectSound', 'public/assets/audio/sounds/scrollMenu.ogg');
        this.load.audio('confirmSound', 'public/assets/audio/sounds/confirmMenu.ogg');
        this.load.audio('cancelSound', 'public/assets/audio/sounds/cancelMenu.ogg');

        // Cargar el stage.json como template base
        this.loadDefaultStageTemplate();
    }

    create() {
        const { width, height } = this.scale;

        // ⭐ Configurar cámara principal para el juego (objetos del escenario)
        this.gameCamera = this.cameras.main;
        this.gameCamera.setBounds(-4000, -4000, 8000, 8000);
        this.gameCamera.setZoom(1);

        // ⭐ Crear cámara separada para el HUD
        this.hudCamera = this.cameras.add(0, 0, width, height);
        this.hudCamera.setScroll(0, 0);

        // Las imágenes del stage se cargarán desde loadDefaultStageTemplate()
        // y se crearán en createStageObjects()

        // Crear UI del HUD (visible solo en hudCamera)
        this.createHUD();

        // Crear input files para spritesheets
        this.createCharacterFileInputs();

        // Sonidos
        this.selectSound = this.sound.add('selectSound');
        this.confirmSound = this.sound.add('confirmSound');
        this.cancelSound = this.sound.add('cancelSound');

        // Input handlers
        this.setupInputHandlers();
    }

    createHUD() {
        const { width, height } = this.scale;

        // ===== NAV BAR MORADO (más pequeño) =====
        const navBar = this.add.rectangle(width / 2, 15, width, 30, 0x663399, 0.9);
        navBar.setStrokeStyle(1, 0xFFFFFF);
        navBar.setDepth(5500); // Depth muy alto para estar sobre todos los modales
        this.gameCamera.ignore(navBar);

        // ===== MENÚ FILE (más pegado a la izquierda) =====
        const fileBtn = this.add.rectangle(35, 15, 50, 20, 0x4A2C66, 0.8);
        fileBtn.setStrokeStyle(1, 0xFFFFFF);
        fileBtn.setInteractive();
        fileBtn.setDepth(2800);
        this.gameCamera.ignore(fileBtn);

        const fileBtnText = this.add.text(35, 15, 'File', {
            fontSize: '12px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
        fileBtnText.setDepth(5501);
        this.gameCamera.ignore(fileBtnText);

        // Menú desplegable File (inicialmente oculto)
        this.createFileDropdown(35, 35);

        fileBtn.on('pointerdown', (pointer) => {
            console.log('🖱️ File button clicked!');
            pointer.event.stopPropagation(); // Evitar que el evento global cierre el dropdown
            this.toggleFileDropdown();
        });

        // ===== MENÚ PANELS (ajustado) =====
        const panelsBtn = this.add.rectangle(100, 15, 60, 20, 0x4A2C66, 0.8);
        panelsBtn.setStrokeStyle(1, 0xFFFFFF);
        panelsBtn.setInteractive();
        panelsBtn.setDepth(2800);
        this.gameCamera.ignore(panelsBtn);

        const panelsBtnText = this.add.text(100, 15, 'Panels', {
            fontSize: '12px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
        panelsBtnText.setDepth(5501);
        this.gameCamera.ignore(panelsBtnText);

        // Menú desplegable Panels
        this.createPanelsDropdown(100, 35);

        panelsBtn.on('pointerdown', (pointer) => {
            pointer.event.stopPropagation(); // Evitar que el evento global cierre el dropdown
            this.togglePanelsDropdown();
        });

        // ===== MENÚ CONFIG (nuevo) =====
        const configBtn = this.add.rectangle(175, 15, 60, 20, 0x4A2C66, 0.8);
        configBtn.setStrokeStyle(1, 0xFFFFFF);
        configBtn.setInteractive();
        configBtn.setDepth(2800);
        this.gameCamera.ignore(configBtn);

        const configBtnText = this.add.text(175, 15, 'Config', {
            fontSize: '12px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
        configBtnText.setDepth(5501);
        this.gameCamera.ignore(configBtnText);

        // Menú desplegable Config
        this.createConfigDropdown(175, 35);

        configBtn.on('pointerdown', (pointer) => {
            pointer.event.stopPropagation();
            this.toggleConfigDropdown();
        });

        // ===== MENÚ HELP (nuevo) =====
        const helpBtn = this.add.rectangle(250, 15, 50, 20, 0x4A2C66, 0.8);
        helpBtn.setStrokeStyle(1, 0xFFFFFF);
        helpBtn.setInteractive();
        helpBtn.setDepth(2800);
        this.gameCamera.ignore(helpBtn);

        const helpBtnText = this.add.text(250, 15, 'Help', {
            fontSize: '12px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
        helpBtnText.setDepth(5501);
        this.gameCamera.ignore(helpBtnText);

        helpBtn.on('pointerdown', (pointer) => {
            pointer.event.stopPropagation();
            this.showModal('characterHelp');
        });

        // Info de controles
        const controlsInfo = this.add.text(width / 2, height - 30, 'BACKSPACE: Return to Editors Menu', {
            fontSize: '16px',
            fill: '#FFFF00',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
        controlsInfo.setDepth(5501);
        this.gameCamera.ignore(controlsInfo);

        // Info de cámara (ajustada para el nav más pequeño)
        this.cameraInfoText = this.add.text(250, 15, 'Camera: (0, 0) | Zoom: 1.0', {
            fontSize: '10px',
            fill: '#00FF00',
            fontFamily: 'Arial'
        }).setOrigin(0, 0.5);
        this.cameraInfoText.setDepth(5501);
        this.gameCamera.ignore(this.cameraInfoText);

        // Crear ventanas modales (inicialmente ocultas)
        this.createModalWindows();
    }

    // ===== SISTEMA DE MENÚS DESPLEGABLES =====
    createFileDropdown(x, y) {
        console.log('🎯 Creating File dropdown at position:', x, y);
        this.fileDropdown = this.add.container(x, y);
        this.fileDropdown.setDepth(2950);
        this.fileDropdown.setVisible(false);
        this.gameCamera.ignore(this.fileDropdown);

        // Background del dropdown (más pequeño) - agregar primero
        const dropdownBg = this.add.rectangle(0, 30, 120, 70, 0x2D1B3D, 0.95);
        dropdownBg.setStrokeStyle(1, 0xFFFFFF);
        dropdownBg.setInteractive(); // Hacer interactivo para capturar clics
        this.fileDropdown.add(dropdownBg);

        // Prevenir que clics dentro del dropdown lo cierren
        dropdownBg.on('pointerdown', (pointer) => {
            pointer.event.stopPropagation();
        });

        // Opciones del menú
        const options = [
            { text: 'Add Spritesheet', action: () => this.openCharacterLoader() },
            { text: 'Save JSON', action: () => this.saveCharacterJSON() },
            { text: 'Save All (ZIP)', action: () => this.saveAllAsZip() }
        ];

        options.forEach((option, index) => {
            const optionBtn = this.add.rectangle(0, (index * 20) + 8, 110, 18, 0x4A2C66, 0.8);
            optionBtn.setStrokeStyle(1, 0x9966CC);
            optionBtn.setInteractive();

            const optionText = this.add.text(0, (index * 20) + 8, option.text, {
                fontSize: '10px',
                fill: '#FFFFFF',
                fontFamily: 'Arial'
            }).setOrigin(0.5);

            optionBtn.on('pointerdown', (pointer) => {
                pointer.event.stopPropagation(); // Prevenir cierre automático
                option.action();
                this.hideFileDropdown();
            });

            this.fileDropdown.add([optionBtn, optionText]);
        });
        
        console.log('✅ File dropdown created successfully');
    }

    createPanelsDropdown(x, y) {
        this.panelsDropdown = this.add.container(x, y);
        this.panelsDropdown.setDepth(2950);
        this.panelsDropdown.setVisible(false);
        this.gameCamera.ignore(this.panelsDropdown);

        // Background del dropdown (más grande para 4 opciones) - agregar primero
        const dropdownBg = this.add.rectangle(0, 50, 150, 120, 0x2D1B3D, 0.95);
        dropdownBg.setStrokeStyle(1, 0xFFFFFF);
        dropdownBg.setInteractive(); // Hacer interactivo para capturar clics
        this.panelsDropdown.add(dropdownBg);

        // Prevenir que clics dentro del dropdown lo cierren
        dropdownBg.on('pointerdown', (pointer) => {
            pointer.event.stopPropagation();
        });

        // Opciones del menú
        const panels = [
            { text: 'Animation Player', key: 'animationPlayer' },
            { text: 'Character Animations', key: 'characterAnimations' },
            { text: 'Sing Animation Mapping', key: 'singMapping' },
            { text: 'Character Properties', key: 'characterProperties' }
        ];

        panels.forEach((panel, index) => {
            const panelBtn = this.add.rectangle(0, (index * 25) + 12, 140, 20, 0x4A2C66, 0.8);
            panelBtn.setStrokeStyle(1, 0x9966CC);
            panelBtn.setInteractive();

            const panelText = this.add.text(0, (index * 25) + 12, panel.text, {
                fontSize: '10px',
                fill: '#FFFFFF',
                fontFamily: 'Arial'
            }).setOrigin(0.5);

            panelBtn.on('pointerdown', (pointer) => {
                pointer.event.stopPropagation(); // Prevenir cierre automático
                this.toggleModalWindow(panel.key);
                this.hidePanelsDropdown();
            });

            this.panelsDropdown.add([panelBtn, panelText]);
        });
    }

    createConfigDropdown(x, y) {
        this.configDropdown = this.add.container(x, y);
        this.configDropdown.setDepth(2950);
        this.configDropdown.setVisible(false);
        this.gameCamera.ignore(this.configDropdown);

        // Background del dropdown (más grande para más opciones)
        const dropdownBg = this.add.rectangle(0, 50, 150, 120, 0x2D1B3D, 0.95);
        dropdownBg.setStrokeStyle(1, 0xFFFFFF);
        dropdownBg.setInteractive();
        this.configDropdown.add(dropdownBg);

        // Prevenir que clics dentro del dropdown lo cierren
        dropdownBg.on('pointerdown', (pointer) => {
            pointer.event.stopPropagation();
        });

        // Opciones del menú
        const configOptions = [
            { text: 'Keyboard Shortcuts', action: () => this.toggleModalWindow('keyboardShortcuts') },
            { text: 'Customize Shortcuts', action: () => this.toggleModalWindow('customizeShortcuts') },
            { text: 'Reset Camera (R)', action: () => this.resetCamera() },
            { text: 'Toggle Ghost Mode', action: () => this.toggleGhostMode() }
        ];

        configOptions.forEach((option, index) => {
            const optionBtn = this.add.rectangle(0, 12 + (index * 25), 140, 20, 0x4A2C66, 0.8);
            optionBtn.setStrokeStyle(1, 0x9966CC);
            optionBtn.setInteractive();

            const optionText = this.add.text(0, 12 + (index * 25), option.text, {
                fontSize: '10px',
                fill: '#FFFFFF',
                fontFamily: 'Arial'
            }).setOrigin(0.5);

            optionBtn.on('pointerdown', (pointer) => {
                pointer.event.stopPropagation();
                this.hideConfigDropdown();
                option.action();
            });

            this.configDropdown.add([optionBtn, optionText]);
        });
    }

    toggleFileDropdown() {
        console.log('🔄 toggleFileDropdown called, current visible:', this.fileDropdown ? this.fileDropdown.visible : 'dropdown not created');
        if (this.fileDropdown && this.fileDropdown.visible) {
            this.hideFileDropdown();
        } else {
            this.showFileDropdown();
        }
    }

    showFileDropdown() {
        console.log('👁️ showFileDropdown called');
        if (this.fileDropdown) {
            this.fileDropdown.setVisible(true);
            this.hidePanelsDropdown(); // Cerrar el otro menú
        } else {
            console.error('❌ fileDropdown not found!');
        }
    }

    hideFileDropdown() {
        console.log('🙈 hideFileDropdown called');
        if (this.fileDropdown) {
            this.fileDropdown.setVisible(false);
        }
    }

    togglePanelsDropdown() {
        if (this.panelsDropdown.visible) {
            this.hidePanelsDropdown();
        } else {
            this.showPanelsDropdown();
        }
    }

    showPanelsDropdown() {
        this.panelsDropdown.setVisible(true);
        this.hideFileDropdown(); // Cerrar el otro menú
    }

    hidePanelsDropdown() {
        this.panelsDropdown.setVisible(false);
    }

    toggleConfigDropdown() {
        if (this.configDropdown.visible) {
            this.hideConfigDropdown();
        } else {
            this.showConfigDropdown();
        }
    }

    showConfigDropdown() {
        this.configDropdown.setVisible(true);
        this.hideFileDropdown(); // Cerrar otros menús
        this.hidePanelsDropdown();
    }

    hideConfigDropdown() {
        this.configDropdown.setVisible(false);
    }

    // ===== SISTEMA DE VENTANAS MODALES =====
    createModalWindows() {
        this.createAnimationPlayerModal();
        this.createCharacterAnimationsModal();
        this.createSingMappingModal();
        this.createCharacterPropertiesModal();
        this.createKeyboardShortcutsModal();
        this.createCustomizeShortcutsModal();
        this.createCharacterHelpModal();
    }

    showModal(key) {
        if (this.modalWindows[key]) {
            this.modalWindows[key].setVisible(true);
            this.modalWindows[key].setDepth(this.windowZIndex++);
        }
    }

    createAnimationPlayerModal() {
        const { width, height } = this.scale;
        
        // Crear ventana modal
        const modal = this.add.container(width - 300, height - 200);
        modal.setDepth(this.windowZIndex);
        modal.setVisible(false);
        this.gameCamera.ignore(modal);

        // Panel principal
        const panel = this.add.rectangle(0, 0, 280, 160, 0x111111, 0.95);
        panel.setInteractive();
        
        // Bloquear interacción con gameCamera cuando se hace click en el modal
        panel.on('pointerdown', (pointer) => {
            this.modalInteractionActive = true;
            pointer.event.stopPropagation();
        });

        // Barra de título
        const titleBar = this.add.rectangle(0, -65, 280, 30, 0x006600, 0.9);
        titleBar.setInteractive();

        // Sistema de arrastre manual
        titleBar.on('pointerdown', (pointer) => {
            if (pointer.button === 0) {
                this.isDragging = true;
                this.draggedWindow = modal;
                this.dragStartX = pointer.x;
                this.dragStartY = pointer.y;
                this.input.setDefaultCursor('grabbing');
                
                // Traer ventana al frente
                modal.setDepth(this.windowZIndex++);
            }
        });

        const titleText = this.add.text(-120, -65, 'ANIMATION PLAYER', {
            fontSize: '12px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0, 0.5);

        // Botones de control de ventana
        const minimizeBtn = this.add.rectangle(110, -65, 20, 20, 0x666600, 0.8);
        minimizeBtn.setInteractive();
        
        const minimizeText = this.add.text(110, -65, '_', {
            fontSize: '12px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        const closeBtn = this.add.rectangle(130, -65, 20, 20, 0xFF0000, 0.8);
        closeBtn.setInteractive();
        
        const closeText = this.add.text(130, -65, 'X', {
            fontSize: '10px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Contenido de la ventana
        this.frameInfoText = this.add.text(0, -30, 'Frame: 0 / 0', {
            fontSize: '12px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Botones de control
        const playBtn = this.add.rectangle(-50, 10, 60, 25, 0x00AA00, 0.8);
        playBtn.setInteractive();
        
        const playBtnText = this.add.text(-50, 10, 'PLAY', {
            fontSize: '10px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        const stopBtn = this.add.rectangle(50, 10, 60, 25, 0xAA0000, 0.8);
        stopBtn.setInteractive();
        
        const stopBtnText = this.add.text(50, 10, 'STOP', {
            fontSize: '10px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Event handlers
        playBtn.on('pointerdown', () => this.playCurrentAnimation());
        stopBtn.on('pointerdown', () => this.stopCurrentAnimation());
        
        minimizeBtn.on('pointerdown', () => {
            modal.setVisible(false);
        });
        
        closeBtn.on('pointerdown', () => {
            modal.setVisible(false);
        });

        // Agregar elementos a la ventana
        modal.add([panel, titleBar, titleText, minimizeBtn, minimizeText, closeBtn, closeText, 
                   this.frameInfoText, playBtn, playBtnText, stopBtn, stopBtnText]);

        this.modalWindows.animationPlayer = modal;
    }

    createCharacterAnimationsModal() {
        const { width, height } = this.scale;
        
        const modal = this.add.container(100, height / 2);
        modal.setDepth(this.windowZIndex);
        modal.setVisible(false);
        this.gameCamera.ignore(modal);

        // Panel principal
        const panel = this.add.rectangle(0, 0, 220, 400, 0x000000, 0.95);
        panel.setInteractive();
        
        // Bloquear interacción con gameCamera cuando se hace click en el modal
        panel.on('pointerdown', (pointer) => {
            this.modalInteractionActive = true;
            pointer.event.stopPropagation();
        });

        // Barra de título
        const titleBar = this.add.rectangle(0, -185, 220, 30, 0x666600, 0.9);
        titleBar.setInteractive();

        // Sistema de arrastre manual
        titleBar.on('pointerdown', (pointer) => {
            if (pointer.button === 0) {
                this.isDragging = true;
                this.draggedWindow = modal;
                this.dragStartX = pointer.x;
                this.dragStartY = pointer.y;
                this.input.setDefaultCursor('grabbing');
                
                // Traer ventana al frente
                modal.setDepth(this.windowZIndex++);
            }
        });

        const titleText = this.add.text(-90, -185, 'CHARACTER ANIMATIONS', {
            fontSize: '11px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0, 0.5);

        // Botones de control
        const minimizeBtn = this.add.rectangle(80, -185, 20, 20, 0x666600, 0.8);
        minimizeBtn.setInteractive();
        
        const minimizeText = this.add.text(80, -185, '_', {
            fontSize: '12px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        const closeBtn = this.add.rectangle(100, -185, 20, 20, 0xFF0000, 0.8);
        closeBtn.setInteractive();
        
        const closeText = this.add.text(100, -185, 'X', {
            fontSize: '10px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Contenedor para animaciones (sin máscara por ahora)
        this.animationContainer = this.add.container(0, -20);
        
        // Variables para scroll
        this.animationScrollY = 0;
        this.maxAnimationScroll = 0;

        // Event handlers
        minimizeBtn.on('pointerdown', () => {
            modal.setVisible(false);
        });
        
        closeBtn.on('pointerdown', () => {
            modal.setVisible(false);
        });

        modal.add([panel, titleBar, titleText, minimizeBtn, minimizeText, closeBtn, closeText, this.animationContainer]);
        
        // Agregar scroll wheel para el contenedor de animaciones
        modal.setInteractive(new Phaser.Geom.Rectangle(-110, -200, 220, 380), Phaser.Geom.Rectangle.Contains);
        modal.on('wheel', (pointer, deltaX, deltaY) => {
            this.scrollAnimationContainer(deltaY);
        });
        
        // Asegurar que el HUD ignore el modal
        this.gameCamera.ignore(modal);
        
        this.modalWindows.characterAnimations = modal;
    }

    createSingMappingModal() {
        const { width, height } = this.scale;
        
        const modal = this.add.container(width - 200, height / 2);
        modal.setDepth(this.windowZIndex);
        modal.setVisible(false);
        this.gameCamera.ignore(modal);

        // Panel principal
        const panel = this.add.rectangle(0, 0, 320, 400, 0x000000, 0.95);
        panel.setInteractive();
        
        // Bloquear interacción con gameCamera cuando se hace click en el modal
        panel.on('pointerdown', (pointer) => {
            this.modalInteractionActive = true;
            pointer.event.stopPropagation();
        });

        // Barra de título
        const titleBar = this.add.rectangle(0, -185, 320, 30, 0x003366, 0.9);
        titleBar.setInteractive();

        // Sistema de arrastre manual
        titleBar.on('pointerdown', (pointer) => {
            if (pointer.button === 0) {
                this.isDragging = true;
                this.draggedWindow = modal;
                this.dragStartX = pointer.x;
                this.dragStartY = pointer.y;
                this.input.setDefaultCursor('grabbing');
                
                // Traer ventana al frente
                modal.setDepth(this.windowZIndex++);
            }
        });

        const titleText = this.add.text(-130, -185, 'SING ANIMATION MAPPING', {
            fontSize: '11px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0, 0.5);

        // Botones de control
        const minimizeBtn = this.add.rectangle(130, -185, 20, 20, 0x666600, 0.8);
        minimizeBtn.setInteractive();
        
        const minimizeText = this.add.text(130, -185, '_', {
            fontSize: '12px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        const closeBtn = this.add.rectangle(150, -185, 20, 20, 0xFF0000, 0.8);
        closeBtn.setInteractive();
        
        const closeText = this.add.text(150, -185, 'X', {
            fontSize: '10px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Event handlers
        minimizeBtn.on('pointerdown', () => {
            modal.setVisible(false);
        });
        
        closeBtn.on('pointerdown', () => {
            modal.setVisible(false);
        });

        modal.add([panel, titleBar, titleText, minimizeBtn, minimizeText, closeBtn, closeText]);
        
        // Crear botones de sing mapping dentro de la ventana
        this.createSingMappingButtonsInModal(modal);
        
        // Asegurar que el HUD ignore el modal
        this.gameCamera.ignore(modal);
        
        this.modalWindows.singMapping = modal;
    }

    createCharacterPropertiesModal() {
        const { width, height } = this.scale;
        
        const modal = this.add.container(50, height - 250);
        modal.setDepth(this.windowZIndex);
        modal.setVisible(false);
        this.gameCamera.ignore(modal);

        // Panel principal
        const panel = this.add.rectangle(0, 0, 250, 400, 0x1A1A1A, 0.95);
        panel.setInteractive();
        
        // Bloquear interacción con gameCamera cuando se hace click en el modal
        panel.on('pointerdown', (pointer) => {
            this.modalInteractionActive = true;
            pointer.event.stopPropagation();
        });

        // Barra de título
        const titleBar = this.add.rectangle(0, -185, 250, 30, 0x4A2C66, 0.9);
        titleBar.setInteractive();

        // Sistema de arrastre manual
        titleBar.on('pointerdown', (pointer) => {
            if (pointer.button === 0) { // Solo botón izquierdo
                this.isDragging = true;
                this.draggedWindow = modal;
                this.dragStartX = pointer.x;
                this.dragStartY = pointer.y;
                this.input.setDefaultCursor('move');
                
                // Traer al frente
                modal.setDepth(this.windowZIndex++);
            }
        });

        const titleText = this.add.text(-90, -185, 'CHARACTER PROPERTIES', {
            fontSize: '11px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0, 0.5);

        // Botones de control
        const minimizeBtn = this.add.rectangle(100, -185, 20, 20, 0x666600, 0.8);
        minimizeBtn.setInteractive();
        
        const minimizeText = this.add.text(100, -185, '_', {
            fontSize: '12px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        const closeBtn = this.add.rectangle(120, -185, 20, 20, 0xFF0000, 0.8);
        closeBtn.setInteractive();
        
        const closeText = this.add.text(120, -185, 'X', {
            fontSize: '10px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Event handlers para botones
        minimizeBtn.on('pointerdown', () => {
            modal.setVisible(false);
        });
        
        closeBtn.on('pointerdown', () => {
            modal.setVisible(false);
        });

        // Contenedor para propiedades
        this.propertiesContainer = this.add.container(0, -80);
        this.createCharacterPropertyControls();

        modal.add([panel, titleBar, titleText, minimizeBtn, minimizeText, closeBtn, closeText, this.propertiesContainer]);
        this.gameCamera.ignore(modal);
        
        this.modalWindows.characterProperties = modal;
    }

    createKeyboardShortcutsModal() {
        const { width, height } = this.scale;
        
        const modal = this.add.container(width / 2, height / 2);
        modal.setDepth(this.windowZIndex);
        modal.setVisible(false);
        this.gameCamera.ignore(modal);

        // Panel principal
        const panel = this.add.rectangle(0, 0, 400, 350, 0x1A1A1A, 0.95);
        panel.setInteractive();
        
        // Bloquear interacción con gameCamera cuando se hace click en el modal
        panel.on('pointerdown', (pointer) => {
            this.modalInteractionActive = true;
            pointer.event.stopPropagation();
        });

        // Barra de título
        const titleBar = this.add.rectangle(0, -160, 400, 30, 0x4A2C66, 0.9);
        titleBar.setInteractive();

        // Sistema de arrastre manual
        titleBar.on('pointerdown', (pointer) => {
            if (pointer.button === 0) {
                this.isDragging = true;
                this.draggedWindow = modal;
                this.dragStartX = pointer.x;
                this.dragStartY = pointer.y;
                this.input.setDefaultCursor('move');
                modal.setDepth(this.windowZIndex++);
                pointer.event.stopPropagation();
            }
        });

        const titleText = this.add.text(-150, -160, 'KEYBOARD SHORTCUTS', {
            fontSize: '12px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0, 0.5);

        // Botón de cerrar
        const closeBtn = this.add.rectangle(180, -160, 20, 20, 0xFF0000, 0.8);
        closeBtn.setInteractive();
        
        const closeText = this.add.text(180, -160, 'X', {
            fontSize: '10px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        closeBtn.on('pointerdown', () => {
            modal.setVisible(false);
        });

        // Contenido de atajos actualizado
        const shortcutsText = this.add.text(0, -70, `KEYBOARD SHORTCUTS:

• BACKSPACE - Return to Editors Menu
• R - Reset Camera Position and Zoom
• Middle Mouse Button - Move Camera Around
• Mouse Wheel - Zoom In/Out
• Left Click on Character - Move Character (Free Mode)
• G - Toggle Ghost Mode
• F1 - Show Help Dialog
• F2 - Quick Save Character JSON
• F3 - Quick Load Character (Open File Dialog)
• SPACE - Play/Stop Current Animation
• TAB - Switch Between Animation Panels
• ESC - Close Current Modal Window
• DELETE - Remove Selected Animation (when applicable)

Camera Controls:
• Arrow Keys - Fine Camera Movement
• SHIFT + Arrow Keys - Fast Camera Movement
• CTRL + R - Reset All Settings
• CTRL + S - Save Character Data

Note: Some shortcuts may be disabled when typing in input fields.`, {
            fontSize: '9px',
            fill: '#FFFFFF',
            fontFamily: 'Arial',
            align: 'left',
            wordWrap: { width: 350 }
        }).setOrigin(0.5, 0.5);

        modal.add([panel, titleBar, titleText, closeBtn, closeText, shortcutsText]);
        this.gameCamera.ignore(modal);
        
        this.modalWindows.keyboardShortcuts = modal;
    }

    createCustomizeShortcutsModal() {
        const { width, height } = this.scale;
        
        const modal = this.add.container(width / 2 + 50, height / 2);
        modal.setDepth(this.windowZIndex);
        modal.setVisible(false);
        this.gameCamera.ignore(modal);

        // Panel principal
        const panel = this.add.rectangle(0, 0, 450, 400, 0x1A1A1A, 0.95);
        panel.setInteractive();
        
        // Bloquear interacción con gameCamera cuando se hace click en el modal
        panel.on('pointerdown', (pointer) => {
            this.modalInteractionActive = true;
            pointer.event.stopPropagation();
        });

        // Barra de título
        const titleBar = this.add.rectangle(0, -185, 450, 30, 0x4A2C66, 0.9);
        titleBar.setInteractive();

        // Sistema de arrastre manual
        titleBar.on('pointerdown', (pointer) => {
            if (pointer.button === 0) {
                this.isDragging = true;
                this.draggedWindow = modal;
                this.dragStartX = pointer.x;
                this.dragStartY = pointer.y;
                this.input.setDefaultCursor('move');
                modal.setDepth(this.windowZIndex++);
                pointer.event.stopPropagation();
            }
        });

        const titleText = this.add.text(-200, -185, 'CUSTOMIZE SHORTCUTS', {
            fontSize: '12px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0, 0.5);

        // Botón de cerrar
        const closeBtn = this.add.rectangle(205, -185, 20, 20, 0xFF0000, 0.8);
        closeBtn.setInteractive();
        
        const closeText = this.add.text(205, -185, 'X', {
            fontSize: '10px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        closeBtn.on('pointerdown', () => {
            modal.setVisible(false);
        });

        // Contenido de personalización
        const customizeText = this.add.text(0, -120, `CUSTOMIZE KEYBOARD SHORTCUTS:

Click on any shortcut below to reassign it to a different key.
Press ESC to cancel reassignment.

Reset Camera: [R]              Toggle Ghost: [G]
Quick Save: [F2]               Quick Load: [F3]
Play/Stop Animation: [SPACE]   Show Help: [F1]
Switch Panels: [TAB]           Close Modal: [ESC]

[Reset to Defaults]   [Save Changes]   [Cancel]

Note: Some system shortcuts like BACKSPACE cannot be changed.`, {
            fontSize: '9px',
            fill: '#FFFFFF',
            fontFamily: 'Arial',
            align: 'center',
            wordWrap: { width: 400 }
        }).setOrigin(0.5, 0.5);

        modal.add([panel, titleBar, titleText, closeBtn, closeText, customizeText]);
        this.gameCamera.ignore(modal);
        
        this.modalWindows.customizeShortcuts = modal;
    }

    createCharacterHelpModal() {
        const { width, height } = this.scale;
        
        const modal = this.add.container(width / 2, height / 2);
        modal.setDepth(this.windowZIndex);
        modal.setVisible(false);
        this.gameCamera.ignore(modal);

        // Panel principal
        const panel = this.add.rectangle(0, 0, 500, 450, 0x1A1A1A, 0.95);
        panel.setInteractive();
        
        // Bloquear interacción con gameCamera cuando se hace click en el modal
        panel.on('pointerdown', (pointer) => {
            this.modalInteractionActive = true;
            pointer.event.stopPropagation();
        });

        // Barra de título
        const titleBar = this.add.rectangle(0, -210, 500, 30, 0x4A2C66, 0.9);
        titleBar.setInteractive();

        // Sistema de arrastre manual
        titleBar.on('pointerdown', (pointer) => {
            if (pointer.button === 0) {
                this.isDragging = true;
                this.draggedWindow = modal;
                this.dragStartX = pointer.x;
                this.dragStartY = pointer.y;
                this.input.setDefaultCursor('move');
                modal.setDepth(this.windowZIndex++);
                pointer.event.stopPropagation();
            }
        });

        const titleText = this.add.text(-220, -210, 'CHARACTER EDITOR HELP', {
            fontSize: '12px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0, 0.5);

        // Botón de cerrar
        const closeBtn = this.add.rectangle(230, -210, 20, 20, 0xFF0000, 0.8);
        closeBtn.setInteractive();
        
        const closeText = this.add.text(230, -210, 'X', {
            fontSize: '10px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        closeBtn.on('pointerdown', () => {
            modal.setVisible(false);
        });

        // Contenido de ayuda
        const helpText = this.add.text(0, -90, `FRIDAY NIGHT FUNKIN' CHARACTER EDITOR

GETTING STARTED:
1. Click File > Add Spritesheet to load character files (.png and .xml)
2. Use Animation Player to control playback
3. Set up Sing Animation Mapping for gameplay
4. Adjust Character Properties (position, scale, etc.)
5. Save your character as JSON when finished

PANELS OVERVIEW:
• Animation Player: Play/stop animations and see frame info
• Character Animations: Browse and select available animations
• Sing Animation Mapping: Assign animations to game directions
• Character Properties: Modify position, scale, and other settings

WORKFLOW TIPS:
• Use Ghost Mode to see original position while editing
• Camera controls help you navigate around large characters
• Drag windows around to organize your workspace
• Use keyboard shortcuts for faster workflow

SING MAPPING:
This is crucial for gameplay! Assign animations to:
- idle: Default standing animation
- singLEFT/RIGHT/UP/DOWN: Arrow key press animations
- singLEFTmiss/etc: Miss animations (optional)

The Character Editor automatically generates Friday Night Funkin'
compatible JSON files with proper animation mappings.`, {
            fontSize: '9px',
            fill: '#FFFFFF',
            fontFamily: 'Arial',
            align: 'left',
            wordWrap: { width: 450 }
        }).setOrigin(0.5, 0.5);

        modal.add([panel, titleBar, titleText, closeBtn, closeText, helpText]);
        this.gameCamera.ignore(modal);
        
        this.modalWindows.characterHelp = modal;
    }

    createCharacterPropertyControls() {
        if (!this.propertiesContainer) return;
        
        // Limpiar controles anteriores
        this.propertiesContainer.removeAll(true);
        
        let yOffset = -40;
        
        // === FLIP X CONTROL ===
        const flipXLabel = this.add.text(-100, yOffset, 'Flip X:', {
            fontSize: '12px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0, 0.5);

        const flipXCheckbox = this.add.rectangle(50, yOffset, 20, 20, 0x333333, 0.8);
        flipXCheckbox.setStrokeStyle(1, 0xFFFFFF);
        flipXCheckbox.setInteractive();

        const flipXCheckmark = this.add.text(50, yOffset, '✓', {
            fontSize: '14px',
            fill: '#00FF00',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
        flipXCheckmark.setVisible(this.currentCharacter?.flip_x === true);

        flipXCheckbox.on('pointerdown', () => {
            if (this.currentCharacter) {
                this.currentCharacter.flip_x = !this.currentCharacter.flip_x;
                flipXCheckmark.setVisible(this.currentCharacter.flip_x);
                
                // Aplicar cambio al sprite
                if (this.characterSprite) {
                    this.characterSprite.setFlipX(this.currentCharacter.flip_x);
                }
                this.confirmSound.play();
            }
        });

        this.propertiesContainer.add([flipXLabel, flipXCheckbox, flipXCheckmark]);
        yOffset += 40;

        // === SCALE CONTROL ===
        const scaleLabel = this.add.text(-100, yOffset, 'Scale:', {
            fontSize: '12px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0, 0.5);

        // Input personalizado para scale
        const scaleInputBg = this.add.rectangle(20, yOffset, 60, 25, 0xFFFFFF, 1.0);
        scaleInputBg.setStrokeStyle(2, 0x999999);
        scaleInputBg.setInteractive();

        const scaleValue = this.currentCharacter?.scale || 1;
        const scaleInputText = this.add.text(20, yOffset - 5, scaleValue.toString(), {
            fontSize: '12px',
            fill: '#000000',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Sistema de input personalizado
        scaleInputBg.on('pointerdown', () => {
            this.activateCustomInput(scaleInputBg, scaleInputText, 'scale');
        });

        scaleInputText.on('pointerdown', () => {
            this.activateCustomInput(scaleInputBg, scaleInputText, 'scale');
        });

        this.propertiesContainer.add([scaleLabel, scaleInputBg, scaleInputText]);
        yOffset += 40;

        // === GHOST MODE CONTROL ===
        const ghostLabel = this.add.text(-100, yOffset, 'Ghost Mode:', {
            fontSize: '12px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0, 0.5);

        const ghostBtn = this.add.rectangle(30, yOffset, 80, 25, this.isGhostMode ? 0x66FF66 : 0x666666, 0.8);
        ghostBtn.setStrokeStyle(1, 0xFFFFFF);
        ghostBtn.setInteractive();

        const ghostBtnText = this.add.text(30, yOffset, this.isGhostMode ? 'ON' : 'OFF', {
            fontSize: '10px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        ghostBtn.on('pointerdown', () => {
            this.toggleGhostMode();
            // Actualizar el panel después de cambiar el modo
            this.updateCharacterPropertiesPanel();
        });

        this.propertiesContainer.add([ghostLabel, ghostBtn, ghostBtnText]);
    }

    activateCustomInput(inputBg, inputText, property) {
        if (this.activeInput) return; // Ya hay un input activo
        
        this.activeInput = {
            bg: inputBg,
            text: inputText,
            property: property,
            originalValue: inputText.text,
            currentValue: inputText.text
        };
        
        // Cambiar apariencia para mostrar que está activo
        inputBg.setStrokeStyle(3, 0x00FF00);
        inputText.setText(this.activeInput.currentValue + '|'); // Cursor visual
        
        // Bloquear BACKSPACE global
        this.inputBackspaceBlocked = true;
        
        // Setup keyboard input
        this.setupCustomInputKeyboard();
    }

    setupCustomInputKeyboard() {
        if (!this.activeInput) return;
        
        // Limpiar listeners previos
        this.input.keyboard.removeAllListeners();
        
        // Setup nuevos listeners para input
        this.input.keyboard.on('keydown', (event) => {
            if (!this.activeInput) return;
            
            if (event.code === 'Enter' || event.code === 'NumpadEnter') {
                this.finishCustomInput();
            } else if (event.code === 'Escape') {
                this.cancelCustomInput();
            } else if (event.code === 'Backspace') {
                this.activeInput.currentValue = this.activeInput.currentValue.slice(0, -1);
                this.activeInput.text.setText(this.activeInput.currentValue + '|');
            } else if (event.key.length === 1) {
                // Solo números y punto decimal para scale
                if (this.activeInput.property === 'scale') {
                    if (/[0-9.]/.test(event.key)) {
                        this.activeInput.currentValue += event.key;
                        this.activeInput.text.setText(this.activeInput.currentValue + '|');
                    }
                }
            }
        });
        
        // Click fuera para confirmar
        this.input.on('pointerdown', (pointer) => {
            if (this.activeInput) {
                const bounds = this.activeInput.bg.getBounds();
                if (!bounds.contains(pointer.x, pointer.y)) {
                    this.finishCustomInput();
                }
            }
        });
    }

    finishCustomInput() {
        if (!this.activeInput) return;
        
        const newValue = parseFloat(this.activeInput.currentValue) || 1;
        
        // Aplicar el nuevo valor
        if (this.activeInput.property === 'scale' && this.currentCharacter) {
            this.currentCharacter.scale = Math.max(0.1, Math.min(5.0, newValue)); // Clamp entre 0.1 y 5.0
            if (this.characterSprite) {
                this.characterSprite.setScale(this.currentCharacter.scale);
            }
        }
        
        // Restaurar apariencia
        this.activeInput.bg.setStrokeStyle(2, 0x999999);
        this.activeInput.text.setText(this.currentCharacter?.scale?.toString() || '1');
        
        this.deactivateCustomInput();
    }

    cancelCustomInput() {
        if (!this.activeInput) return;
        
        // Restaurar valor original
        this.activeInput.bg.setStrokeStyle(2, 0x999999);
        this.activeInput.text.setText(this.activeInput.originalValue);
        
        this.deactivateCustomInput();
    }

    deactivateCustomInput() {
        this.activeInput = null;
        this.inputBackspaceBlocked = false;
        
        // Restaurar input handlers normales
        this.setupInputHandlers();
    }

    cancelAnimationSelection() {
