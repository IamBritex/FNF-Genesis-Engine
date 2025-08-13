class CharacterEditor extends Phaser.Scene {
    constructor() {
        super({ key: 'CharacterEditorState' });
        
        // Constantes
        this.DEPTHS = {
            BACKGROUND: 1,
            NAV_BUTTONS: 2800,
            DROPDOWNS: 2850,
            DROPDOWNS_HIGH: 2950,
            MODALS: 3000,
            NAV_BAR: 5500,
            UI_TEXT: 5501,
            OFFSET_INFO: 5502,
            SELECTORS: 6500,
            SHORTCUTS: 7000
        };
        
        this.COLORS = {
            PRIMARY: 0x4A2C66,
            SECONDARY: 0x2D1B3D,
            NAV_BAR: 0x663399,
            SUCCESS: 0x00AA00,
            ERROR: 0xFF3333,
            WARNING: 0x666600
        };
        
        // Cámaras
        this.gameCamera = null;
        this.hudCamera = null;
        
        // Variables del personaje
        this.currentCharacter = null;
        this.characterAnimations = [];
        this.characterSprite = null;
        this.characterContainer = null;
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
        this.windowZIndex = 3000;
        this.minimizedWindows = {}; // Estado de ventanas minimizadas
        this.windowOriginalHeights = {}; // Alturas originales de las ventanas
        
        // Variables para arrastre de ventanas
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.draggedWindow = null;
        
        // Variables para modo fantasma
        this.isGhostMode = false;
        this.ghostSprite = null;
        
        // Control de cámara
        this.isCameraDragging = false;
        this.cameraDragStartX = 0;
        this.cameraDragStartY = 0;
        
        // Variables para offset/tween de personaje
        this.currentCharacterTween = null;
        
        // Sistema de temas
        this.currentTheme = 'light'; // light o dark
        
        // Sistema de undo
        this.undoHistory = [];
        this.maxUndoSteps = 10;
        
        // Sonidos (se inicializarán en create)
        this.selectSound = null;
        this.confirmSound = null;
        this.cancelSound = null;
        this.clickDownSound = null;
        this.clickUpSound = null;
        this.openWindowSound = null;
        this.exitWindowSound = null;
        this.undoSound = null;
    }
    
    // Función auxiliar para cambiar cursor tanto en Phaser como CSS
    setCursor(cursorType) {
        this.input.setDefaultCursor(cursorType);
        if (this.game.canvas) {
            // Mapear tipos de cursor a los cursores personalizados
            const cursorMap = {
                'default': 'default',
                'pointer': 'pointer', 
                'grab': 'grab',
                'grabbing': 'grabbing',
                'move': 'grabbing', // Usar grabbing para move también
                'text': 'text',
                'wait': 'wait',
                'not-allowed': 'notAllowed'
            };
            
            const mappedCursor = cursorMap[cursorType] || 'default';
            
            // Aplicar cursor personalizado usando las rutas del Script.js
            const cursorPath = `public/assets/images/cursor/cursor-${mappedCursor === 'default' ? 'default' : 
                mappedCursor === 'pointer' ? 'pointer' :
                mappedCursor === 'grab' ? 'grabbing' :
                mappedCursor === 'grabbing' ? 'grabbing' :
                mappedCursor === 'text' ? 'text' :
                mappedCursor === 'wait' ? 'hourglass' :
                mappedCursor === 'notAllowed' ? 'cross' : 'default'}.png`;
            
            this.game.canvas.style.cursor = `url("${cursorPath}"), ${cursorType}`;
        }
    }

    preload() {
        // Sonidos básicos
        this.load.audio('selectSound', 'public/assets/audio/sounds/scrollMenu.ogg');
        this.load.audio('confirmSound', 'public/assets/audio/sounds/confirmMenu.ogg');
        this.load.audio('cancelSound', 'public/assets/audio/sounds/cancelMenu.ogg');
        
        // Sonidos del editor
        this.load.audio('clickDownEditor', 'public/assets/audio/sounds/editor/ClickDown.ogg');
        this.load.audio('clickUpEditor', 'public/assets/audio/sounds/editor/ClickUp.ogg');
        this.load.audio('openWindowEditor', 'public/assets/audio/sounds/editor/openWindow.ogg');
        this.load.audio('exitWindowEditor', 'public/assets/audio/sounds/editor/exitWindow.ogg');
        this.load.audio('undoSound', 'public/assets/audio/sounds/editor/undo.ogg');
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

        // Crear patrón de ajedrez como fondo
        this.createCheckerboardPattern();

        // Crear UI del HUD (visible solo en hudCamera)
        this.createHUD();

        // Crear input files para spritesheets
        this.createCharacterFileInputs();

        // Sonidos
        this.selectSound = this.sound.add('selectSound');
        this.confirmSound = this.sound.add('confirmSound');
        this.cancelSound = this.sound.add('cancelSound');
        this.clickDownSound = this.sound.add('clickDownEditor');
        this.clickUpSound = this.sound.add('clickUpEditor');
        this.openWindowSound = this.sound.add('openWindowEditor');
        this.exitWindowSound = this.sound.add('exitWindowEditor');
        this.undoSound = this.sound.add('undoSound');

        // Input handlers
        this.setupInputHandlers();
    }

    createHUD() {
        const { width, height } = this.scale;

        // Nav bar sin alpha
        const navBar = this.add.rectangle(width / 2, 15, width, 30, this.COLORS.NAV_BAR);
        navBar.setStrokeStyle(1, 0xFFFFFF);
        navBar.setDepth(this.DEPTHS.NAV_BAR);
        this.gameCamera.ignore(navBar);

        // Crear botones de navegación
        this.createNavButtons();

        // Info de offset en la esquina inferior derecha
        this.offsetInfoText = this.add.text(width - 10, height - 10, '', {
            fontSize: '22px',
            fill: '#FFFFFF',
            fontFamily: 'VCR',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(1, 1);
        this.offsetInfoText.setDepth(this.DEPTHS.OFFSET_INFO);
        this.gameCamera.ignore(this.offsetInfoText);

        // Crear ventanas modales
        this.createModalWindows();
    }

    // ==========================================
    // CHECKERBOARD PATTERN
    // ==========================================

    createCheckerboardPattern() {
        // Verificar si la textura ya existe para evitar errores al re-entrar
        if (this.textures.exists('checkerboardPattern')) {
            // Si ya existe, solo crear el sprite
            this.checkerboardSprite = this.add.tileSprite(-4000, -4000, 8000, 8000, 'checkerboardPattern');
            this.checkerboardSprite.setOrigin(0, 0);
            this.checkerboardSprite.setDepth(this.DEPTHS.BACKGROUND);
            this.hudCamera.ignore(this.checkerboardSprite);
            return;
        }
        
        // Optimizado: Crear una sola textura de patrón y repetirla
        const squareSize = 10;
        const patternSize = squareSize * 2; // Patrón de 2x2 cuadros = 20x20 pixels
        
        // Crear canvas para el patrón base
        const canvas = document.createElement('canvas');
        canvas.width = patternSize;
        canvas.height = patternSize;
        const ctx = canvas.getContext('2d');
        
        // Dibujar el patrón de ajedrez en el canvas
        ctx.fillStyle = '#FFFFFF'; // Blanco
        ctx.fillRect(0, 0, squareSize, squareSize); // Top-left
        ctx.fillRect(squareSize, squareSize, squareSize, squareSize); // Bottom-right
        
        ctx.fillStyle = '#CCCCCC'; // Gris
        ctx.fillRect(squareSize, 0, squareSize, squareSize); // Top-right
        ctx.fillRect(0, squareSize, squareSize, squareSize); // Bottom-left
        
        // Crear textura de Phaser desde el canvas
        this.textures.addCanvas('checkerboardPattern', canvas);
        
        // Crear un solo sprite con la textura y configurar repetición mediante tileScale
        this.checkerboardSprite = this.add.tileSprite(-4000, -4000, 8000, 8000, 'checkerboardPattern');
        this.checkerboardSprite.setOrigin(0, 0);
        this.checkerboardSprite.setDepth(this.DEPTHS.BACKGROUND);
        
        // Asegurar que la HUD camera ignore el sprite
        this.hudCamera.ignore(this.checkerboardSprite);        
    }

    // Helper method para crear botones
    createButton(x, y, width, height, text, color = this.COLORS.PRIMARY, textColor = '#FFFFFF') {
        const button = this.add.rectangle(x, y, width, height, color, 0.8);
        button.setStrokeStyle(1, 0xFFFFFF);
        button.setInteractive();
        
        const buttonText = this.add.text(x, y, text, {
            fontSize: '12px',
            fill: textColor,
            fontFamily: 'Arial'
        }).setOrigin(0.5);
        
        // Agregar efectos de hover
        button.on('pointerover', () => {
            this.setCursor('pointer');
            button.setFillStyle(color, 1.0); // Aumentar opacidad en hover
        });
        
        button.on('pointerout', () => {
            this.setCursor('default');
            button.setFillStyle(color, 0.8); // Volver a opacidad normal
        });
        
        return { button, text: buttonText };
    }

    // ==========================================
    // UI CREATION METHODS
    // ==========================================

    createNavButtons() {
        // File button
        const fileElements = this.createButton(35, 15, 50, 20, 'File');
        fileElements.button.setDepth(this.DEPTHS.NAV_BUTTONS);
        fileElements.text.setDepth(this.DEPTHS.UI_TEXT);
        this.gameCamera.ignore([fileElements.button, fileElements.text]);

        this.createFileDropdown(35, 35);

        fileElements.button.on('pointerdown', (pointer) => {
            pointer.event.stopPropagation();
            this.toggleFileDropdown();
        });

        // Panels button
        const panelsElements = this.createButton(100, 15, 60, 20, 'Panels');
        panelsElements.button.setDepth(this.DEPTHS.NAV_BUTTONS);
        panelsElements.text.setDepth(this.DEPTHS.UI_TEXT);
        this.gameCamera.ignore([panelsElements.button, panelsElements.text]);

        this.createPanelsDropdown(100, 35);

        panelsElements.button.on('pointerdown', (pointer) => {
            pointer.event.stopPropagation();
            this.togglePanelsDropdown();
        });


        // Config button
        const configElements = this.createButton(170, 15, 60, 20, 'Config');
        configElements.button.setDepth(this.DEPTHS.NAV_BUTTONS);
        configElements.text.setDepth(this.DEPTHS.UI_TEXT);
        this.gameCamera.ignore([configElements.button, configElements.text]);

        this.createConfigDropdown(170, 35);

        configElements.button.on('pointerdown', (pointer) => {
            pointer.event.stopPropagation();
            this.toggleConfigDropdown();
        });
    }

    // ==========================================
    // DROPDOWN MENUS
    // ==========================================

    createFileDropdown(x, y) {
        this.fileDropdown = this.add.container(x, y);
        this.fileDropdown.setDepth(2950);
        this.fileDropdown.setVisible(false);
        this.gameCamera.ignore(this.fileDropdown);

        // Background del dropdown
        const dropdownBg = this.add.rectangle(10, 30, 150, 70, 0x2D1B3D, 0.95);
        dropdownBg.setStrokeStyle(1, 0xFFFFFF);
        dropdownBg.setInteractive();
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
            const optionBtn = this.add.rectangle(25, (index * 20) + 8, 110, 15, 0x4A2C66, 1);
            optionBtn.setStrokeStyle(1, 0x9966CC);
            optionBtn.setInteractive();

            const optionText = this.add.text(25, (index * 20) + 8, option.text, {
                fontSize: '10px',
                fill: '#FFFFFF',
                fontFamily: 'Arial'
            }).setOrigin(0.5);

            // Hover effects
            optionBtn.on('pointerover', () => {
                this.setCursor('pointer');
                optionBtn.setFillStyle(0x663399, 1); // Color más claro en hover
            });
            
            optionBtn.on('pointerout', () => {
                this.setCursor('default');
                optionBtn.setFillStyle(0x4A2C66, 1); // Color original
            });

            optionBtn.on('pointerdown', (pointer) => {
                pointer.event.stopPropagation();
                option.action();
                this.hideFileDropdown();
            });

            this.fileDropdown.add([optionBtn, optionText]);
        });
    }

    createPanelsDropdown(x, y) {
        this.panelsDropdown = this.add.container(x, y);
        this.panelsDropdown.setDepth(2850); // Por debajo del nav (que está en 5500)
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

            // Hover effects
            panelBtn.on('pointerover', () => {
                this.setCursor('pointer');
                panelBtn.setFillStyle(0x663399, 1); // Color más claro en hover
            });
            
            panelBtn.on('pointerout', () => {
                this.setCursor('default');
                panelBtn.setFillStyle(0x4A2C66, 0.8); // Color original
            });

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
        this.configDropdown.setDepth(2850); // Por debajo del nav
        this.configDropdown.setVisible(false);
        this.gameCamera.ignore(this.configDropdown);

        // Background del dropdown (más grande para dos opciones)
        const dropdownBg = this.add.rectangle(0, 10, 120, 70, 0x2D1B3D, 0.95);
        dropdownBg.setStrokeStyle(1, 0xFFFFFF);
        dropdownBg.setInteractive(); // Hacer interactivo para capturar clics
        this.configDropdown.add(dropdownBg);

        // Prevenir que clics dentro del dropdown lo cierren
        dropdownBg.on('pointerdown', (pointer) => {
            pointer.event.stopPropagation();
        });

        // Opciones del menú
        const configs = [
            { text: 'Shortcuts', action: () => this.showShortcutsModal() },
            { text: 'Themes', action: () => this.toggleModalWindow('themeSettings') }
        ];

        configs.forEach((config, index) => {
            const configBtn = this.add.rectangle(0, (index * 25) + 12, 110, 20, 0x4A2C66, 0.8);
            configBtn.setStrokeStyle(1, 0x9966CC);
            configBtn.setInteractive();

            const configText = this.add.text(0, (index * 25) + 12, config.text, {
                fontSize: '10px',
                fill: '#FFFFFF',
                fontFamily: 'Arial'
            }).setOrigin(0.5);

            // Hover effects
            configBtn.on('pointerover', () => {
                this.setCursor('pointer');
                configBtn.setFillStyle(0x663399, 1); // Color más claro en hover
            });
            
            configBtn.on('pointerout', () => {
                this.setCursor('default');
                configBtn.setFillStyle(0x4A2C66, 0.8); // Color original
            });

            configBtn.on('pointerdown', (pointer) => {
                pointer.event.stopPropagation(); // Prevenir cierre automático

                config.action(); // Ejecutar la acción directamente
                this.hideConfigDropdown();
            });

            this.configDropdown.add([configBtn, configText]);
        });
    }

    toggleFileDropdown() {
        if (this.fileDropdown && this.fileDropdown.visible) {
            this.hideFileDropdown();
        } else {
            this.showFileDropdown();
        }
    }

    showFileDropdown() {
        if (this.fileDropdown) {
            this.fileDropdown.setVisible(true);
            this.hidePanelsDropdown();
            this.hideConfigDropdown();
        }
    }

    hideFileDropdown() {
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
        this.hideConfigDropdown(); // Cerrar el menú config
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
        this.hideFileDropdown(); // Cerrar el menú file
        this.hidePanelsDropdown(); // Cerrar el menú panels
    }

    hideConfigDropdown() {
        this.configDropdown.setVisible(false);
    }

    // ==========================================
    // THEME SYSTEM
    // ==========================================

    createThemeSettingsModal() {
        const { width, height } = this.scale;
        
        const modal = this.add.container(width / 2, height / 2);
        modal.setDepth(this.windowZIndex);
        modal.setVisible(false);
        this.gameCamera.ignore(modal);

        // Panel principal
        const panel = this.add.rectangle(0, 0, 300, 180, 0x1A1A1A);

        // Barra de título
        const titleBar = this.add.rectangle(0, -75, 300, 30, 0x0066CC);
        titleBar.setInteractive();

        // Hover effects para la barra de título
        titleBar.on('pointerover', () => {
            this.setCursor('grab');
            titleBar.setFillStyle(0x0088FF); // Color más claro en hover
        });
        
        titleBar.on('pointerout', () => {
            if (!this.isDragging) {
                this.setCursor('default');
                titleBar.setFillStyle(0x0066CC); // Color original
            }
        });

        // Sistema de arrastre manual
        titleBar.on('pointerdown', (pointer) => {
            if (pointer.button === 0) {
                this.isDragging = true;
                this.draggedWindow = modal;
                this.dragStartX = pointer.x;
                this.dragStartY = pointer.y;
                this.setCursor('grabbing');
                
                // Traer ventana al frente
                modal.setDepth(this.windowZIndex++);
            }
        });

        const titleText = this.add.text(-130, -75, 'THEME SETTINGS', {
            fontSize: '14px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0, 0.5);

        // Botón de cerrar
        const closeBtn = this.add.rectangle(130, -75, 25, 25, 0xFF0000);
        closeBtn.setInteractive();
        
        const closeText = this.add.text(130, -75, 'X', {
            fontSize: '12px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Hover effects para botón de cerrar
        closeBtn.on('pointerover', () => {
            this.setCursor('pointer');
            closeBtn.setFillStyle(0xFF4444); // Color más claro en hover
        });
        
        closeBtn.on('pointerout', () => {
            this.setCursor('default');
            closeBtn.setFillStyle(0xFF0000); // Color original
        });

        closeBtn.on('pointerdown', () => {
            this.toggleModalWindow('themeSettings');
        });

        // Título de sección
        const sectionTitle = this.add.text(0, -40, 'Select Theme:', {
            fontSize: '16px',
            fill: '#00CCFF',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Opciones de tema
        const themes = [
            { text: 'Light Theme', value: 'light' },
            { text: 'Dark Theme', value: 'dark' }
        ];

        // Array para almacenar todos los elementos de temas
        const themeElements = [];

        themes.forEach((theme, index) => {
            const yPos = -5 + (index * 40);
            
            // Botón del tema
            const themeBtn = this.add.rectangle(0, yPos, 200, 30, 0x4A2C66);
            themeBtn.setStrokeStyle(2, this.currentTheme === theme.value ? 0x00FF00 : 0x9966CC);
            themeBtn.setInteractive();

            const themeText = this.add.text(-70, yPos, theme.text, {
                fontSize: '12px',
                fill: '#FFFFFF',
                fontFamily: 'Arial'
            }).setOrigin(0, 0.5);

            // Checkbox visual
            const checkbox = this.add.rectangle(70, yPos, 16, 16, 0x333333);
            checkbox.setStrokeStyle(1, 0xFFFFFF);

            // Checkmark
            const checkmark = this.add.text(70, yPos, '✓', {
                fontSize: '12px',
                fill: '#00FF00',
                fontFamily: 'Arial'
            }).setOrigin(0.5);
            checkmark.setVisible(this.currentTheme === theme.value);

            // Event handler
            themeBtn.on('pointerdown', () => {
                this.setTheme(theme.value);
                this.updateThemeModalCheckboxes();
            });

            // Agregar elementos al array
            themeElements.push(themeBtn, themeText, checkbox, checkmark);
        });

        // Agregar todos los elementos al modal de una vez
        modal.add([panel, titleBar, titleText, closeBtn, closeText, sectionTitle, ...themeElements]);
        
        // Asegurar que la gameCamera ignore todos los elementos del modal
        this.gameCamera.ignore(modal);
        
        this.modalWindows.themeSettings = modal;
    }

    updateThemeModalCheckboxes() {
        if (!this.modalWindows.themeSettings) return;
        
        const modal = this.modalWindows.themeSettings;
        
        // Actualizar bordes de botones y checkmarks
        modal.list.forEach((element) => {
            // Si es un rectángulo de botón de tema (200x30)
            if (element.type === 'Rectangle' && element.width === 200 && element.height === 30) {
                const index = element.y === -5 ? 0 : 1; // Light = -5, Dark = 35
                const themeValue = index === 0 ? 'light' : 'dark';
                element.setStrokeStyle(2, this.currentTheme === themeValue ? 0x00FF00 : 0x9966CC);
            }
            
            // Si es un checkmark
            if (element.type === 'Text' && element.text === '✓') {
                const index = element.y === -5 ? 0 : 1;
                const themeValue = index === 0 ? 'light' : 'dark';
                element.setVisible(this.currentTheme === themeValue);
            }
        });
    }

    setTheme(theme) {
        this.currentTheme = theme;
        this.applyTheme();
    }

    applyTheme() {
        // Actualizar colores del patrón de ajedrez basado en el tema
        this.updateCheckerboardTheme();
    }

    updateCheckerboardTheme() {
        if (!this.checkerboardSprite) return;

        // Crear nuevo patrón basado en el tema
        const squareSize = 10;
        const patternSize = squareSize * 2;
        
        const canvas = document.createElement('canvas');
        canvas.width = patternSize;
        canvas.height = patternSize;
        const ctx = canvas.getContext('2d');
        
        if (this.currentTheme === 'dark') {
            // Tema oscuro
            ctx.fillStyle = '#191919'; // Gris muy oscuro
            ctx.fillRect(0, 0, squareSize, squareSize);
            ctx.fillRect(squareSize, squareSize, squareSize, squareSize);
            
            ctx.fillStyle = '#0F0F0F'; // Más oscuro
            ctx.fillRect(squareSize, 0, squareSize, squareSize);
            ctx.fillRect(0, squareSize, squareSize, squareSize);
        } else {
            // Tema claro (por defecto)
            ctx.fillStyle = '#FFFFFF'; // Blanco
            ctx.fillRect(0, 0, squareSize, squareSize);
            ctx.fillRect(squareSize, squareSize, squareSize, squareSize);
            
            ctx.fillStyle = '#CCCCCC'; // Gris claro
            ctx.fillRect(squareSize, 0, squareSize, squareSize);
            ctx.fillRect(0, squareSize, squareSize, squareSize);
        }
        
        // Actualizar textura
        if (this.textures.exists('checkerboardPattern')) {
            this.textures.remove('checkerboardPattern');
        }
        this.textures.addCanvas('checkerboardPattern', canvas);
        this.checkerboardSprite.setTexture('checkerboardPattern');
    }

    // ==========================================
    // MODAL WINDOWS
    // ==========================================

    createModalWindows() {
        this.createAnimationPlayerModal();
        this.createCharacterAnimationsModal();
        this.createSingMappingModal();
        this.createCharacterPropertiesModal();
        this.createThemeSettingsModal(); // Crear modal de temas
    }

    createAnimationPlayerModal() {
        const { width, height } = this.scale;
        
        // Crear ventana modal
        const modal = this.add.container(width - 300, height - 200);
        modal.setDepth(this.windowZIndex);
        modal.setVisible(false);
        this.gameCamera.ignore(modal);

        // Panel principal
        const panel = this.add.rectangle(0, 0, 280, 160, 0x111111);

        // Barra de título
        const titleBar = this.add.rectangle(0, -65, 280, 30, 0x0066CC);
        titleBar.setInteractive();

        // Sistema de arrastre manual
        titleBar.on('pointerdown', (pointer) => {
            if (pointer.button === 0) {
                this.isDragging = true;
                this.draggedWindow = modal;
                this.dragStartX = pointer.x;
                this.dragStartY = pointer.y;
                this.setCursor('grabbing');
                
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
        const minimizeBtn = this.add.rectangle(110, -65, 20, 20, 0x666600);
        minimizeBtn.setInteractive();
        
        const minimizeText = this.add.text(110, -65, '_', {
            fontSize: '12px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        const closeBtn = this.add.rectangle(130, -65, 20, 20, 0xFF0000);
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
        const playBtn = this.add.rectangle(-50, 10, 60, 25, 0x00AA00);
        playBtn.setInteractive();
        
        const playBtnText = this.add.text(-50, 10, 'PLAY', {
            fontSize: '10px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        const stopBtn = this.add.rectangle(50, 10, 60, 25, 0xAA0000);
        stopBtn.setInteractive();
        
        const stopBtnText = this.add.text(50, 10, 'STOP', {
            fontSize: '10px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Event handlers
        playBtn.on('pointerdown', () => {
            this.playCurrentAnimation();
        });
        
        stopBtn.on('pointerdown', () => {
            this.stopCurrentAnimation();
        });
        
        minimizeBtn.on('pointerdown', () => {
            this.toggleMinimizeWindow('animationPlayer');
        });
        
        closeBtn.on('pointerdown', () => {
            this.toggleModalWindow('animationPlayer');
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

        // Panel principal sin alpha
        const panel = this.add.rectangle(0, 0, 220, 400, 0x000000);

        // Barra de título
        const titleBar = this.add.rectangle(0, -185, 220, 30, 0x0066CC);
        titleBar.setInteractive();

        // Sistema de arrastre manual
        titleBar.on('pointerdown', (pointer) => {
            if (pointer.button === 0) {
                this.isDragging = true;
                this.draggedWindow = modal;
                this.dragStartX = pointer.x;
                this.dragStartY = pointer.y;
                this.setCursor('grabbing');
                
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
        const minimizeBtn = this.add.rectangle(80, -185, 20, 20, 0x666600);
        minimizeBtn.setInteractive();
        
        const minimizeText = this.add.text(80, -185, '_', {
            fontSize: '12px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        const closeBtn = this.add.rectangle(100, -185, 20, 20, 0xFF0000);
        closeBtn.setInteractive();
        
        const closeText = this.add.text(100, -185, 'X', {
            fontSize: '10px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Contenedor para animaciones sin máscara
        this.animationContainer = this.add.container(0, -140);
        
        // Variables para scroll
        this.animationScrollY = 0;
        this.maxAnimationScroll = 0;

        // Event handlers
        minimizeBtn.on('pointerdown', () => {
            modal.setVisible(false);
        });
        
        closeBtn.on('pointerdown', () => {
            this.toggleModalWindow('characterAnimations');
        });

        modal.add([panel, titleBar, titleText, minimizeBtn, minimizeText, closeBtn, closeText, this.animationContainer]);
        
        // Modificar específicamente el minimize button para characterAnimations
        minimizeBtn.off('pointerdown'); // Remover el listener anterior
        minimizeBtn.off('pointerup'); // Remover el listener anterior
        minimizeBtn.on('pointerdown', () => {
            this.toggleMinimizeWindow('characterAnimations');
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

        // Panel principal sin alpha
        const panel = this.add.rectangle(0, 0, 320, 400, 0x000000);

        // Barra de título
        const titleBar = this.add.rectangle(0, -185, 320, 30, 0x0066CC);
        titleBar.setInteractive();

        // Sistema de arrastre manual
        titleBar.on('pointerdown', (pointer) => {
            if (pointer.button === 0) {
                this.isDragging = true;
                this.draggedWindow = modal;
                this.dragStartX = pointer.x;
                this.dragStartY = pointer.y;
                this.setCursor('grabbing');
                
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
        const minimizeBtn = this.add.rectangle(130, -185, 20, 20, 0x666600);
        minimizeBtn.setInteractive();
        
        const minimizeText = this.add.text(130, -185, '_', {
            fontSize: '12px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        const closeBtn = this.add.rectangle(150, -185, 20, 20, 0xFF0000);
        closeBtn.setInteractive();
        
        const closeText = this.add.text(150, -185, 'X', {
            fontSize: '10px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Event handlers
        minimizeBtn.on('pointerdown', () => {
            this.toggleMinimizeWindow('singMapping');
        });
        
        closeBtn.on('pointerdown', () => {
            this.toggleModalWindow('singMapping');
        });

        modal.add([panel, titleBar, titleText, minimizeBtn, minimizeText, closeBtn, closeText]);
        
        // Crear botones de sing mapping dentro de la ventana sin máscara
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

        // Panel principal sin alpha
        const panel = this.add.rectangle(0, 0, 250, 400, 0x1A1A1A);

        // Barra de título
        const titleBar = this.add.rectangle(0, -185, 250, 30, 0x0066CC);
        titleBar.setInteractive();

        // Sistema de arrastre manual
        titleBar.on('pointerdown', (pointer) => {
            if (pointer.button === 0) { // Solo botón izquierdo
                this.isDragging = true;
                this.draggedWindow = modal;
                this.dragStartX = pointer.x;
                this.dragStartY = pointer.y;
                this.setCursor('move');
                
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
        const minimizeBtn = this.add.rectangle(100, -185, 20, 20, 0x666600);
        minimizeBtn.setInteractive();
        
        const minimizeText = this.add.text(100, -185, '_', {
            fontSize: '12px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        const closeBtn = this.add.rectangle(120, -185, 20, 20, 0xFF0000);
        closeBtn.setInteractive();
        
        const closeText = this.add.text(120, -185, 'X', {
            fontSize: '10px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Event handlers para botones
        minimizeBtn.on('pointerdown', () => {
            this.toggleMinimizeWindow('characterProperties');
        });
        
        closeBtn.on('pointerdown', () => {
            this.toggleModalWindow('characterProperties');
        });

        // Contenedor para propiedades sin scroll
        this.propertiesContainer = this.add.container(0, -60);
        this.createCharacterPropertyControls();

        // Calcular altura dinámica según controles
        let controlsHeight = this.propertiesContainer.list.length * 32 + 40; // 32px por control, 40px margen
        controlsHeight = Math.max(controlsHeight, 120); // Altura mínima
        panel.height = controlsHeight;
        panel.setSize(250, controlsHeight);
        titleBar.y = -controlsHeight / 2 + 15;
        titleText.y = -controlsHeight / 2 + 15;
        minimizeBtn.y = -controlsHeight / 2 + 15;
        minimizeText.y = -controlsHeight / 2 + 15;
        closeBtn.y = -controlsHeight / 2 + 15;
        closeText.y = -controlsHeight / 2 + 15;

        modal.setInteractive(new Phaser.Geom.Rectangle(-125, -controlsHeight / 2, 250, controlsHeight), Phaser.Geom.Rectangle.Contains);

        modal.add([panel, titleBar, titleText, minimizeBtn, minimizeText, closeBtn, closeText, this.propertiesContainer]);
        this.gameCamera.ignore(modal);
        this.modalWindows.characterProperties = modal;
    }

    createCharacterPropertyControls() {
        if (!this.propertiesContainer) return;
        
        // Limpiar controles anteriores
        this.propertiesContainer.removeAll(true);
        
        let yOffset = -40; // Comenzar más arriba para mejor centrado
        
        // === FLIP X CONTROL ===
        const flipXLabel = this.add.text(-80, yOffset, 'Flip X:', {
            fontSize: '12px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0, 0.5);

        const flipXCheckbox = this.add.rectangle(40, yOffset, 20, 20, 0x333333);
        flipXCheckbox.setStrokeStyle(1, 0xFFFFFF);
        flipXCheckbox.setInteractive();

        const flipXCheckmark = this.add.text(40, yOffset, '✓', {
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
            }
        });

        this.propertiesContainer.add([flipXLabel, flipXCheckbox, flipXCheckmark]);
        yOffset += 35;

        // === SCALE CONTROL ===
        const scaleLabel = this.add.text(-80, yOffset, 'Scale:', {
            fontSize: '12px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0, 0.5);

        const scaleDecBtn = this.add.rectangle(0, yOffset, 25, 20, 0xFF6666);
        scaleDecBtn.setStrokeStyle(1, 0xFFFFFF);
        scaleDecBtn.setInteractive();

        const scaleDecText = this.add.text(0, yOffset, '-', {
            fontSize: '14px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        const scaleValue = this.add.text(40, yOffset, (this.currentCharacter?.scale || 1.0).toFixed(1), {
            fontSize: '12px',
            fill: '#FFFF00',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        const scaleIncBtn = this.add.rectangle(80, yOffset, 25, 20, 0x66FF66);
        scaleIncBtn.setStrokeStyle(1, 0xFFFFFF);
        scaleIncBtn.setInteractive();

        const scaleIncText = this.add.text(80, yOffset, '+', {
            fontSize: '14px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Event handlers para scale
        scaleDecBtn.on('pointerdown', () => {
            if (this.currentCharacter) {
                this.currentCharacter.scale = Math.max(0.1, (this.currentCharacter.scale || 1.0) - 0.1);
                scaleValue.setText(this.currentCharacter.scale.toFixed(1));
                
                if (this.characterSprite) {
                    this.characterSprite.setScale(this.currentCharacter.scale);
                }
            }
        });

        scaleIncBtn.on('pointerdown', () => {
            if (this.currentCharacter) {
                this.currentCharacter.scale = Math.min(3.0, (this.currentCharacter.scale || 1.0) + 0.1);
                scaleValue.setText(this.currentCharacter.scale.toFixed(1));
                
                if (this.characterSprite) {
                    this.characterSprite.setScale(this.currentCharacter.scale);
                }
            }
        });
        
        this.propertiesContainer.add([scaleLabel, scaleDecBtn, scaleDecText, scaleValue, scaleIncBtn, scaleIncText]);
        yOffset += 35;

        // === ADD ONION CONTROL ===
        const ghostLabel = this.add.text(-80, yOffset, 'Add Onion:', {
            fontSize: '12px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0, 0.5);

        const ghostCheckbox = this.add.rectangle(40, yOffset, 20, 20, 0x333333);
        ghostCheckbox.setStrokeStyle(1, 0xFFFFFF);
        ghostCheckbox.setInteractive();

        const ghostCheckmark = this.add.text(40, yOffset, '🧅', {
            fontSize: '12px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
        ghostCheckmark.setVisible(this.isGhostMode);

        ghostCheckbox.on('pointerdown', () => {
            this.toggleGhostMode();
            ghostCheckmark.setVisible(this.isGhostMode);
        });
        
        this.propertiesContainer.add([ghostLabel, ghostCheckbox, ghostCheckmark]);
        yOffset += 40;

        // === MOVEMENT INFO ===
        const movementInfo = this.add.text(-80, yOffset, 'MOVEMENT:\nArrows: Move character\nShift+Arrows: Fine adjust\nClick+Drag: Free move', {
            fontSize: '10px',
            fill: '#AAAAAA',
            fontFamily: 'Arial',
            align: 'left',
            lineSpacing: 2
        }).setOrigin(0, 0);

        this.propertiesContainer.add([movementInfo]);
        
        // Calcular scroll máximo
        this.maxPropertiesScroll = Math.max(0, yOffset + 80 - 300);
    }

    // Método para scroll del contenedor de propiedades
    // scrollPropertiesContainer removed: modal now adapts size to content
    updateCharacterPropertiesPanel() {
        if (this.currentCharacter && this.propertiesContainer) {
            this.createCharacterPropertyControls();
        }
    }

    toggleGhostMode() {
        if (!this.currentCharacter || !this.characterSprite) return;

        if (this.isGhostMode) {
            // Eliminar sprite fantasma
            if (this.ghostSprite) {
                this.ghostSprite.destroy();
                this.ghostSprite = null;
            }
            this.isGhostMode = false;
        } else {
            // Crear sprite fantasma en gameCamera
            this.ghostSprite = this.add.sprite(
                this.characterSprite.x, 
                this.characterSprite.y, 
                this.characterSprite.texture.key
            );
            
            // Configurar fantasma para gameCamera
            this.ghostSprite.setOrigin(this.characterSprite.originX, this.characterSprite.originY);
            this.ghostSprite.setScale(this.characterSprite.scaleX, this.characterSprite.scaleY);
            this.ghostSprite.setFlipX(this.characterSprite.flipX);
            this.ghostSprite.setDepth(5); // Capa fantasma: 5
            this.ghostSprite.setTint(0x0099FF);
            this.ghostSprite.setAlpha(0.5);
            
            // Asegurar que el fantasma esté en gameCamera (no en hudCamera)
            this.hudCamera.ignore(this.ghostSprite);
            
            // Establecer capa del sprite original
            this.characterSprite.setDepth(10); // Capa spritesheet: 10
            
            // Copiar la animación actual
            if (this.characterSprite.anims.currentAnim) {
                this.ghostSprite.play(this.characterSprite.anims.currentAnim.key);
                this.ghostSprite.anims.pause();
            }
            
            this.isGhostMode = true;
        }
        
        // Actualizar checkbox visual si existe
        this.updateCharacterPropertiesPanel();
    }

    toggleModalWindow(key) {
        if (this.modalWindows[key]) {
            const modal = this.modalWindows[key];
            const wasVisible = modal.visible;
            modal.setVisible(!modal.visible);
            
            if (modal.visible) {
                // Traer al frente
                modal.setDepth(this.windowZIndex++);
                
                // Reproducir sonido de apertura de ventana
                if (this.openWindowSound) {
                    this.openWindowSound.play();
                }
            } else {
                // Reproducir sonido de cierre de ventana
                if (this.exitWindowSound) {
                    this.exitWindowSound.play();
                }
            }
        }
    }

    toggleMinimizeWindow(key) {
        if (!this.modalWindows[key]) return;
        
        const modal = this.modalWindows[key];
        const isMinimized = this.minimizedWindows[key] || false;
        
        if (isMinimized) {
            // Restaurar ventana
            this.restoreWindow(key);
        } else {
            // Minimizar ventana
            this.minimizeWindow(key);
        }
    }
    
    minimizeWindow(key) {
        const modal = this.modalWindows[key];
        if (!modal) return;
        
        // Ocultar todos los elementos excepto el título
        modal.list.forEach((element, index) => {
            // Solo mantener visible: panel (0), titleBar (1), titleText (2), minimizeBtn (3), minimizeText (4), closeBtn (5), closeText (6)
            if (index > 6) {
                element.setVisible(false);
            }
        });
        
        // Cambiar el panel principal para que solo muestre la barra de título
        const panel = modal.list[0]; // El panel principal es el primer elemento
        const titleBar = modal.list[1]; // La barra de título es el segundo elemento
        
        if (panel && titleBar) {
            // Guardar altura original si no se ha guardado
            if (!this.windowOriginalHeights[key]) {
                this.windowOriginalHeights[key] = panel.height;
            }
            
            // Cambiar el panel para que solo tenga la altura de la barra de título
            panel.setSize(panel.width, 30);
            panel.y = titleBar.y; // Ajustar posición del panel
        }
        
        this.minimizedWindows[key] = true;
    }
    
    restoreWindow(key) {
        const modal = this.modalWindows[key];
        if (!modal) return;
        
        // Mostrar todos los elementos
        modal.list.forEach(element => {
            element.setVisible(true);
        });
        
        // Restaurar el panel principal a su tamaño original
        const panel = modal.list[0];
        if (panel && this.windowOriginalHeights[key]) {
            panel.setSize(panel.width, this.windowOriginalHeights[key]);
            panel.y = 0; // Volver a la posición original
        }
        
        this.minimizedWindows[key] = false;
    }

    createSingMappingButtonsInModal(modal) {
        // Crear contenedor simple para los botones sin máscara
        this.singMappingContainer = this.add.container(0, -50);
        
        // Variables para scroll del sing mapping
        this.singScrollY = 0;
        this.maxSingScroll = 0;
        
        // Array de animaciones sing (inicializar si no existe)
        if (!this.customSingAnimations) {
            this.customSingAnimations = ['idle', 'singLEFT', 'singDOWN', 'singUP', 'singRIGHT', 'singLEFTmiss', 'singDOWNmiss', 'singUPmiss', 'singRIGHTmiss'];
            // Asegurar que todas las animaciones personalizadas estén en singAnimations
            this.customSingAnimations.forEach(animKey => {
                if (!(animKey in this.singAnimations)) {
                    this.singAnimations[animKey] = null;
                }
            });
        }
        
        this.updateSingMappingButtons();
        
        modal.add([this.singMappingContainer]);
    }

    updateSingMappingButtons() {
        if (!this.singMappingContainer) return;
        
        // Limpiar botones anteriores
        this.singMappingContainer.removeAll(true);
        
        let yOffset = -100;
        
        this.customSingAnimations.forEach((singKey, index) => {
            // Botón principal (sin depth individual ya que está en container)
            const btn = this.add.rectangle(0, yOffset, 280, 25, 0x0066CC);
            btn.setStrokeStyle(1, 0xFFFFFF);
            btn.setInteractive();

            const btnText = this.add.text(-120, yOffset, singKey, {
                fontSize: '10px',
                fill: '#FFFFFF',
                fontFamily: 'Arial'
            }).setOrigin(0, 0.5);

            // Verificar si ya existe un mapeo para esta animación
            const mappedAnimation = this.singAnimations[singKey];
            const assignedText = this.add.text(80, yOffset, mappedAnimation || 'None', {
                fontSize: '9px',
                fill: mappedAnimation ? '#00FF00' : '#FF6666',
                fontFamily: 'Arial'
            }).setOrigin(0, 0.5);

            // Botón para eliminar animación personalizada (creado después pero con posición específica)
            let deleteBtn, deleteText;
            if (!['idle', 'singLEFT', 'singDOWN', 'singUP', 'singRIGHT'].includes(singKey)) {
                deleteBtn = this.add.rectangle(130, yOffset, 20, 20, 0xFF0000);
                deleteBtn.setStrokeStyle(1, 0xFFFFFF);
                deleteBtn.setInteractive();

                deleteText = this.add.text(130, yOffset, 'X', {
                    fontSize: '8px',
                    fill: '#FFFFFF',
                    fontFamily: 'Arial'
                }).setOrigin(0.5);

                deleteBtn.on('pointerdown', () => {
                    this.removeCustomSingAnimation(singKey);
                });                
            }

            // Event handler para asignar animación
            btn.on('pointerdown', () => {
                this.openAnimationSelector(singKey, assignedText);
            });
            
            // Agregar elementos al contenedor en el orden correcto
            if (deleteBtn && deleteText) {
                this.singMappingContainer.add([btn, btnText, assignedText, deleteBtn, deleteText]);
            } else {
                this.singMappingContainer.add([btn, btnText, assignedText]);
            }
            yOffset += 30;
        });
        
        // Botón "+" para agregar nueva animación
        const addBtn = this.add.rectangle(0, yOffset, 280, 25, 0x00AA00);
        addBtn.setStrokeStyle(1, 0xFFFFFF);
        addBtn.setInteractive();

        const addText = this.add.text(0, yOffset, '+ ADD CUSTOM ANIMATION', {
            fontSize: '10px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        addBtn.on('pointerdown', () => {
            this.openCustomAnimationDialog();
        });

        this.singMappingContainer.add([addBtn, addText]);
        
        // Ajustar tamaño de la ventana modal al contenido
        this.adjustSingMappingModalSize(this.customSingAnimations.length + 1); // +1 para el botón "+"
    }

    adjustSingMappingModalSize(itemCount) {
        const modal = this.modalWindows.singMapping;
        if (!modal) return;
        
        // Calcular altura basada en el contenido
        const minHeight = 80; // Altura mínima (header + padding)
        const itemHeight = 30; // Altura por elemento
        const padding = 40; // Padding extra
        const newHeight = Math.max(minHeight, (itemCount * itemHeight) + padding);
        
        // Obtener el panel principal (primer elemento en el modal)
        const panel = modal.getAt(0);
        if (panel) {
            panel.height = newHeight;
            panel.setSize(320, newHeight);
        }
        
        // Ajustar posición de la barra de título
        const titleBar = modal.getAt(1);
        if (titleBar) {
            titleBar.y = -(newHeight / 2) + 15;
        }
        
        // Ajustar posición del texto del título
        const titleText = modal.getAt(2);
        if (titleText) {
            titleText.y = -(newHeight / 2) + 15;
        }
        
        // Ajustar botones de la ventana
        const minimizeBtn = modal.getAt(3);
        const minimizeText = modal.getAt(4);
        const closeBtn = modal.getAt(5);
        const closeText = modal.getAt(6);
        
        if (minimizeBtn) minimizeBtn.y = -(newHeight / 2) + 15;
        if (minimizeText) minimizeText.y = -(newHeight / 2) + 15;
        if (closeBtn) closeBtn.y = -(newHeight / 2) + 15;
        if (closeText) closeText.y = -(newHeight / 2) + 15;
    }

    removeCustomSingAnimation(animKey) {
        const index = this.customSingAnimations.indexOf(animKey);
        if (index > -1) {
            this.customSingAnimations.splice(index, 1);
            // También eliminar el mapeo si existe
            if (this.singAnimations[animKey]) {
                delete this.singAnimations[animKey];
            }
            this.updateSingMappingButtons();
            this.confirmSound.play();
        }
    }

    openCustomAnimationDialog() {
        const animName = prompt('Enter custom animation name:');
        if (animName && animName.trim() && !this.customSingAnimations.includes(animName.trim())) {
            const trimmedName = animName.trim();
            this.customSingAnimations.push(trimmedName);
            // Inicializar el mapeo como null para la nueva animación
            this.singAnimations[trimmedName] = null;
            this.updateSingMappingButtons();
            this.confirmSound.play();
        }
    }

    async saveAllAsZip() {
        if (!this.currentCharacter) {
            this.showErrorMessage('No character loaded to save');
            return;
        }

        // Crear un ZIP virtual con JSZip
        try {
            // Para este ejemplo, simularemos la funcionalidad
            // En una implementación real necesitarías importar JSZip
            const jsonData = this.generateCharacterJSONData(this.currentCharacter.name, this.currentCharacter.animations);
            
            // Simular creación de ZIP
            const zipContent = {
                [`${this.currentCharacter.name}.json`]: JSON.stringify(jsonData, null, 2),
                [`${this.currentCharacter.name}.png`]: 'PNG file would be here',
                [`${this.currentCharacter.name}.xml`]: 'XML file would be here'
            };
            
            this.showErrorMessage('ZIP functionality requires JSZip library implementation');
            
        } catch (error) {
            this.showErrorMessage('Error creating ZIP file');
        }
    }

    setupInputHandlers() {
        // Regresar al EditorsState
        this.input.keyboard.on('keydown-BACKSPACE', () => {
            this.returnToEditorsState();
        });

        // === SHORTCUTS DE CONTROL DE ANIMACIONES ===
        
        // Q → Animación anterior
        this.input.keyboard.on('keydown-Q', () => {
            this.playPreviousAnimation();
        });

        // E → Siguiente animación
        this.input.keyboard.on('keydown-E', () => {
            this.playNextAnimation();
        });

        // Enter → Repetir animación actual
        this.input.keyboard.on('keydown-ENTER', () => {
            this.playCurrentAnimation();
        });

        // Espacio → Reproducir animación idle
        this.input.keyboard.on('keydown-SPACE', () => {
            this.playIdleAnimation();
        });

        // R → Resetear cámara
        this.input.keyboard.on('keydown-R', () => {
            this.resetCamera();
        });

        // F → Voltear personaje en el eje X
        this.input.keyboard.on('keydown-F', () => {
            this.flipCharacterX();
        });

        // === SHORTCUTS DE MOVIMIENTO DE OFFSETS ===
        
        // Flechas → Mover offsets 5px
        this.input.keyboard.on('keydown-LEFT', (event) => {
            if (!event.shiftKey && !event.ctrlKey) {
                this.moveCharacterOffset(-5, 0);
            }
        });

        this.input.keyboard.on('keydown-RIGHT', (event) => {
            if (!event.shiftKey && !event.ctrlKey) {
                this.moveCharacterOffset(5, 0);
            }
        });

        this.input.keyboard.on('keydown-UP', (event) => {
            if (!event.shiftKey && !event.ctrlKey) {
                this.moveCharacterOffset(0, -5);
            }
        });

        this.input.keyboard.on('keydown-DOWN', (event) => {
            if (!event.shiftKey && !event.ctrlKey) {
                this.moveCharacterOffset(0, 5);
            }
        });

        // Shift + Flechas → Mover offsets 10px
        this.input.keyboard.on('keydown-LEFT', (event) => {
            if (event.shiftKey && !event.ctrlKey) {
                this.moveCharacterOffset(-10, 0);
            }
        });

        this.input.keyboard.on('keydown-RIGHT', (event) => {
            if (event.shiftKey && !event.ctrlKey) {
                this.moveCharacterOffset(10, 0);
            }
        });

        this.input.keyboard.on('keydown-UP', (event) => {
            if (event.shiftKey && !event.ctrlKey) {
                this.moveCharacterOffset(0, -10);
            }
        });

        this.input.keyboard.on('keydown-DOWN', (event) => {
            if (event.shiftKey && !event.ctrlKey) {
                this.moveCharacterOffset(0, 10);
            }
        });

        // Ctrl + Flechas → Mover offsets 1px
        this.input.keyboard.on('keydown-LEFT', (event) => {
            if (event.ctrlKey && !event.shiftKey) {
                this.moveCharacterOffset(-1, 0);
            }
        });

        this.input.keyboard.on('keydown-RIGHT', (event) => {
            if (event.ctrlKey && !event.shiftKey) {
                this.moveCharacterOffset(1, 0);
            }
        });

        this.input.keyboard.on('keydown-UP', (event) => {
            if (event.ctrlKey && !event.shiftKey) {
                this.moveCharacterOffset(0, -1);
            }
        });

        this.input.keyboard.on('keydown-DOWN', (event) => {
            if (event.ctrlKey && !event.shiftKey) {
                this.moveCharacterOffset(0, 1);
            }
        });

        // === SHORTCUTS DE GUARDADO ===
        
        // Esc → Guardar datos en JSON
        this.input.keyboard.on('keydown-ESC', (event) => {
            if (!event.ctrlKey && !event.shiftKey) {
                this.saveCharacterJSON();
            }
        });

        // Ctrl + Esc → Guardar archivo TXT con offsets
        this.input.keyboard.on('keydown-ESC', (event) => {
            if (event.ctrlKey && !event.shiftKey) {
                this.saveOffsetsAsTXT();
            }
        });

        // Shift + Esc → Guardar ZIP con XML, PNG y JSON del personaje
        this.input.keyboard.on('keydown-ESC', (event) => {
            if (event.shiftKey && !event.ctrlKey) {
                this.saveAllAsZip();
            }
        });

        // === SHORTCUTS DE UNDO ===
        
        // Ctrl + Z → Undo (retroceder 1 paso)
        this.input.keyboard.on('keydown-Z', (event) => {
            if (event.ctrlKey && !event.shiftKey) {
                this.performUndo();
            }
        });

        // === SONIDOS GLOBALES DE CLICK ===
        
        // Click down en cualquier parte
        this.input.on('pointerdown', (pointer) => {
            if (this.clickDownSound) {
                this.clickDownSound.play();
            }
        });

        // Click up en cualquier parte
        this.input.on('pointerup', (pointer) => {
            if (this.clickUpSound) {
                this.clickUpSound.play();
            }
        });

        // Mouse wheel para zoom (solo gameCamera, no en modales)
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            // Verificar si hay modales abiertos
            if (this.isModalOpen) return;
            
            // Verificar si el mouse está sobre alguna ventana modal visible
            let isOverModal = false;
            for (const modalKey in this.modalWindows) {
                const modal = this.modalWindows[modalKey];
                if (modal && modal.visible) {
                    // Verificar si el pointer está dentro de los bounds del modal
                    const modalBounds = modal.getBounds();
                    if (modalBounds.contains(pointer.x, pointer.y)) {
                        isOverModal = true;
                        break;
                    }
                }
            }
            
            // Solo aplicar zoom si no está sobre una modal
            if (!isOverModal) {
                const zoomChange = deltaY > 0 ? -0.1 : 0.1;
                const newZoom = Phaser.Math.Clamp(this.gameCamera.zoom + zoomChange, 0.2, 3.0);
                this.gameCamera.setZoom(newZoom);
            }
        });

        // Drag de cámara con botón del medio
        this.input.on('pointerdown', (pointer) => {
            if (pointer.button === 1) { // Middle mouse button
                this.isCameraDragging = true;
                this.cameraDragStartX = pointer.x;
                this.cameraDragStartY = pointer.y;
                this.setCursor('grabbing');
            }
        });

        this.input.on('pointermove', (pointer) => {
            // Arrastre de ventanas modales
            if (this.isDragging && this.draggedWindow) {
                const deltaX = pointer.x - this.dragStartX;
                const deltaY = pointer.y - this.dragStartY;
                
                // Calcular nueva posición
                const newX = this.draggedWindow.x + deltaX;
                const newY = this.draggedWindow.y + deltaY;
                
                // Obtener dimensiones de la pantalla
                const { width, height } = this.scale;
                
                // Límites para el modal (considerando el tamaño del modal)
                const modalWidth = 200; // Ancho aproximado del modal
                const modalHeight = 200; // Alto aproximado del modal
                const navBarHeight = 30; // Altura del nav bar
                
                // Aplicar límites
                const minX = modalWidth / 2;
                const maxX = width - modalWidth / 2;
                const minY = navBarHeight + modalHeight / 2;
                const maxY = height - modalHeight / 2;
                
                // Clamp la posición dentro de los límites
                this.draggedWindow.x = Phaser.Math.Clamp(newX, minX, maxX);
                this.draggedWindow.y = Phaser.Math.Clamp(newY, minY, maxY);
                
                this.dragStartX = pointer.x;
                this.dragStartY = pointer.y;
                return; // Salir temprano para evitar que otros arrastres interfieran
            }

            // Arrastre de cámara con botón medio
            if (this.isCameraDragging) {
                const deltaX = pointer.x - this.cameraDragStartX;
                const deltaY = pointer.y - this.cameraDragStartY;

                this.gameCamera.scrollX -= deltaX / this.gameCamera.zoom;
                this.gameCamera.scrollY -= deltaY / this.gameCamera.zoom;

                this.cameraDragStartX = pointer.x;
                this.cameraDragStartY = pointer.y;
                return; // Salir temprano
            }
            
            // Movimiento libre del personaje
            if (this.characterDragging && this.characterSprite) {
                const deltaX = pointer.worldX - this.characterDragStartX;
                const deltaY = pointer.worldY - this.characterDragStartY;
                
                this.characterSprite.x += deltaX;
                this.characterSprite.y += deltaY;
                
                this.characterDragStartX = pointer.worldX;
                this.characterDragStartY = pointer.worldY;
                
                // Actualizar posición base y calcular offset automáticamente
                if (this.currentCharacter) {
                    const originalX = this.currentCharacter.basePosition?.x || 0;
                    const originalY = this.currentCharacter.basePosition?.y || 0;
                    
                    // Calcular offset de la posición actual vs posición original
                    const offsetX = this.characterSprite.x - originalX;
                    const offsetY = this.characterSprite.y - originalY;
                    
                    // Si tenemos una animación actual, actualizar su offset
                    if (this.currentAnimation && this.currentCharacter.animations) {
                        const currentAnimGroup = this.currentCharacter.animations[this.currentAnimation];
                        if (currentAnimGroup && currentAnimGroup.length > 0) {
                            // Actualizar el offset de la animación actual
                            currentAnimGroup.forEach(frame => {
                                frame.offsetX = offsetX;
                                frame.offsetY = offsetY;
                            });
                            
                            // Actualizar la información del offset en pantalla
                            this.updateOffsetInfo();
                        }
                    }
                }
                return;
            }
        });

        this.input.on('pointerup', (pointer) => {
            if (pointer.button === 1) { // Middle mouse button
                this.isCameraDragging = false;
                this.setCursor('default');
            }
        });

        // ===== SISTEMA DE ARRASTRE MANUAL PARA VENTANAS =====
        this.input.on('pointerdown', (pointer) => {
            if (pointer.button === 0) { // Left mouse button
                // Verificar si se hizo clic en el personaje para movimiento libre
                if (this.characterSprite && this.characterSprite.getBounds().contains(pointer.worldX, pointer.worldY)) {
                    this.characterDragging = true;
                    this.characterDragStartX = pointer.worldX;
                    this.characterDragStartY = pointer.worldY;
                    this.setCursor('move');
                    return; // No procesar otros eventos si estamos arrastrando el personaje
                }
                
                // Cerrar dropdowns solo si el clic no fue interceptado por stopPropagation
                // (es decir, si hiciste clic fuera de los dropdowns y botones)
                this.time.delayedCall(10, () => {
                    // Pequeño delay para permitir que stopPropagation funcione
                    if (!pointer.event.defaultPrevented) {
                        this.hideFileDropdown();
                        this.hidePanelsDropdown();
                    }
                });
            }
        });

        this.input.on('pointerup', (pointer) => {
            if (pointer.button === 1) { // Middle mouse button
                this.isCameraDragging = false;
                this.input.setDefaultCursor('default');
            }
            
            if (pointer.button === 0) {
                // Terminar arrastre del personaje
                if (this.characterDragging) {
                    this.characterDragging = false;
                    this.setCursor('default');
                }
                
                // Terminar arrastre de ventanas
                if (this.isDragging) {
                    this.isDragging = false;
                    this.draggedWindow = null;
                    this.setCursor('default');
                }
            }
        });
    }

    updateOffsetInfo() {
        if (!this.offsetInfoText) return;

        // Si no hay personaje cargado, no mostrar nada
        if (!this.currentCharacter) {
            this.offsetInfoText.setText('');
            return;
        }

        // Si hay una animación seleccionada, mostrar su offset
        if (this.currentAnimation && this.currentCharacter && this.currentCharacter.animations) {
            // Las animaciones en CharacterEditor son un objeto, no un array
            const animationGroup = this.currentCharacter.animations[this.currentAnimation];
            if (animationGroup && Array.isArray(animationGroup) && animationGroup.length > 0) {
                // Obtener el offset del primer frame de la animación
                const frame = animationGroup[0];
                const offsetX = Math.round(frame.offsetX || 0);
                const offsetY = Math.round(frame.offsetY || 0);
                this.offsetInfoText.setText(`Offset: [${offsetX}, ${offsetY}]`);
            } else {
                this.offsetInfoText.setText('Offset: [0, 0]');
            }
        } else {
            // Si hay personaje pero no hay animación seleccionada
            this.offsetInfoText.setText('Offset: [0, 0]');
        }
    }

    showLoadingMessage() {
        if (this.offsetInfoText) {
            this.offsetInfoText.setText('Loading...');
        }
    }

    resetCamera() {
        this.gameCamera.scrollX = 0;
        this.gameCamera.scrollY = 0;
        this.gameCamera.setZoom(1);
        this.confirmSound.play();
    }

    // === MÉTODOS AUXILIARES PARA SHORTCUTS ===

    playPreviousAnimation() {
        if (!this.currentCharacter || !this.characterAnimations || this.characterAnimations.length === 0) return;
        
        const currentIndex = this.characterAnimations.indexOf(this.currentAnimation);
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : this.characterAnimations.length - 1;
        const prevAnimation = this.characterAnimations[prevIndex];
        
        this.playCharacterAnimation(prevAnimation);
        this.selectSound.play();
    }

    playNextAnimation() {
        if (!this.currentCharacter || !this.characterAnimations || this.characterAnimations.length === 0) return;
        
        const currentIndex = this.characterAnimations.indexOf(this.currentAnimation);
        const nextIndex = (currentIndex + 1) % this.characterAnimations.length;
        const nextAnimation = this.characterAnimations[nextIndex];
        
        this.playCharacterAnimation(nextAnimation);
        this.selectSound.play();
    }

    playIdleAnimation() {
        if (!this.currentCharacter) return;
        
        // Buscar animación idle
        const idleAnimation = this.characterAnimations?.find(anim => 
            anim.toLowerCase().includes('idle') || anim === 'idle'
        ) || this.characterAnimations?.[0]; // Si no hay idle, usar la primera animación
        
        if (idleAnimation) {
            this.playCharacterAnimation(idleAnimation);
            this.confirmSound.play();
        }
    }

    flipCharacterX() {
        if (!this.currentCharacter || !this.characterSprite) return;
        
        // Toggle flip X
        this.currentCharacter.flip_x = !this.currentCharacter.flip_x;
        this.characterSprite.setFlipX(this.currentCharacter.flip_x);
        
        this.confirmSound.play();
        
        // Actualizar panel de propiedades si está abierto
        this.updateCharacterPropertiesPanel();
    }

    moveCharacterOffset(deltaX, deltaY) {
        if (!this.currentCharacter || !this.characterSprite || !this.currentAnimation) return;
        
        // Guardar estado antes de hacer cambios
        this.saveUndoState();
        
        // Mover el sprite directamente
        this.characterSprite.x += deltaX;
        this.characterSprite.y += deltaY;
        
        // Actualizar offset en los datos del personaje
        const animationGroup = this.currentCharacter.animations[this.currentAnimation];
        if (animationGroup && Array.isArray(animationGroup) && animationGroup.length > 0) {
            animationGroup.forEach(frame => {
                frame.offsetX = (frame.offsetX || 0) + deltaX;
                frame.offsetY = (frame.offsetY || 0) + deltaY;
            });
        }
        
        // Actualizar información del offset en pantalla
        this.updateOffsetInfo();
        
        // Reproducir sonido de selección
        this.selectSound.play();
    }

    saveOffsetsAsTXT() {
        if (!this.currentCharacter) {
            this.showErrorMessage('No character loaded');
            return;
        }

        try {
            let offsetsData = `Character Offsets: ${this.currentCharacter.name || 'Unknown'}\n`;
            offsetsData += `Generated: ${new Date().toISOString()}\n\n`;

            // Generar datos de offsets para cada animación
            for (const animName in this.currentCharacter.animations) {
                const animationGroup = this.currentCharacter.animations[animName];
                if (animationGroup && Array.isArray(animationGroup) && animationGroup.length > 0) {
                    const frame = animationGroup[0]; // Tomar el primer frame como referencia
                    const offsetX = Math.round(frame.offsetX || 0);
                    const offsetY = Math.round(frame.offsetY || 0);
                    offsetsData += `${animName}: [${offsetX}, ${offsetY}]\n`;
                }
            }

            // Crear y descargar archivo TXT
            const blob = new Blob([offsetsData], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${this.currentCharacter.name || 'character'}_offsets.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.confirmSound.play();
            this.showSuccessToast('Offsets saved as TXT');
        } catch (error) {
            console.error('Error saving offsets:', error);
            this.showErrorMessage('Error saving offsets file');
        }
    }

    // === SISTEMA DE UNDO ===

    saveUndoState() {
        if (!this.currentCharacter) return;
        
        // Crear una copia profunda del estado actual del personaje
        const undoState = {
            characterData: JSON.parse(JSON.stringify(this.currentCharacter)),
            timestamp: Date.now()
        };
        
        // Agregar al historial
        this.undoHistory.push(undoState);
        
        // Mantener solo los últimos maxUndoSteps
        if (this.undoHistory.length > this.maxUndoSteps) {
            this.undoHistory.shift();
        }
    }

    performUndo() {
        if (this.undoHistory.length === 0) {
            this.showErrorMessage('No hay acciones para deshacer');
            return;
        }

        // Obtener el último estado
        const lastState = this.undoHistory.pop();
        
        if (lastState && lastState.characterData) {
            // Restaurar el estado del personaje
            this.currentCharacter = lastState.characterData;
            
            // Actualizar la UI y el sprite
            this.updateCharacterFromUndoState();
            
            // Reproducir sonido de undo
            if (this.undoSound) {
                this.undoSound.play();
            }
            
            this.showSuccessToast('Acción deshecha');
        }
    }

    updateCharacterFromUndoState() {
        if (!this.currentCharacter) return;
        
        // Actualizar sprite del personaje
        if (this.characterSprite) {
            // Aplicar posición y flip
            if (this.currentCharacter.basePosition) {
                this.characterSprite.x = this.currentCharacter.basePosition.x;
                this.characterSprite.y = this.currentCharacter.basePosition.y;
            }
            
            if (this.currentCharacter.flip_x !== undefined) {
                this.characterSprite.setFlipX(this.currentCharacter.flip_x);
            }
        }
        
        // Actualizar lista de animaciones
        if (this.currentCharacter.animations) {
            this.characterAnimations = Object.keys(this.currentCharacter.animations);
            this.updateAnimationList();
        }
        
        // Actualizar información de offset
        this.updateOffsetInfo();
        
        // Actualizar paneles si están abiertos
        this.updateCharacterPropertiesPanel();
        this.updateSingMappingButtons();
    }

    returnToEditorsState() {
        this.cancelSound.play();
        
        // Transición de regreso al EditorsState
        this.time.delayedCall(200, () => {
            this.scene.get('TransitionScene').startTransition('EditorsState');
        });
    }

    update() {
        // Actualizar info de offset solo si hay un personaje cargado
        if (this.currentCharacter) {
            this.updateOffsetInfo();
        }
    }

    // Método de limpieza al salir de la escena
    shutdown() {
        // Limpiar event listeners y recursos si es necesario
        this.isCameraDragging = false;
        
        // Limpiar contenedor del personaje
        if (this.characterContainer) {
            this.characterContainer.destroy();
            this.characterContainer = null;
        }
        
        // Limpiar sprite del personaje
        if (this.characterSprite) {
            this.characterSprite.destroy();
            this.characterSprite = null;
        }
        
        // Limpiar tween del personaje
        if (this.currentCharacterTween) {
            this.currentCharacterTween.kill();
            this.currentCharacterTween = null;
        }
        
        // Limpiar texto de offset
        if (this.offsetInfoText) {
            this.offsetInfoText.destroy();
            this.offsetInfoText = null;
        }
        
        // Limpiar patrón de ajedrez optimizado
        if (this.checkerboardSprite) {
            this.checkerboardSprite.destroy();
            this.checkerboardSprite = null;
        }
        
        // Limpiar textura del patrón
        if (this.textures.exists('checkerboardPattern')) {
            this.textures.remove('checkerboardPattern');
        }
    }

    // Sistema de carga de personajes
    async loadDefaultStageTemplate() {
        try {
            const response = await fetch('public/assets/data/stages/stage.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const stageData = await response.json();
            
            if (stageData && stageData.stage && Array.isArray(stageData.stage)) {
                await this.preloadStageTextures(stageData.stage);
            }
        } catch (error) {
            // Silently handle stage template loading errors
        }
    }

    async preloadStageTextures(imageElements) {
        for (const element of imageElements) {
            if (element.type === 'image' && element.namePath) {
                const textureKey = `stage_${element.namePath}`;
                const imagePath = `public/assets/images/stages/stage/${element.namePath}.png`;
                
                try {
                    // Cargar la imagen de manera asíncrona
                    this.load.image(textureKey, imagePath);
                } catch (error) {
                    // Skip failed texture loads
                }
            }
        }
        
        // Iniciar la carga y esperar a que termine
        this.load.start();
        
        // Cuando termine la carga, crear los objetos del stage
        this.load.once('complete', () => {
            this.createStageObjects(imageElements);
        });
    }

    createStageObjects(imageElements) {
        imageElements.forEach((element, index) => {
            const textureKey = `stage_${element.namePath}`;
            
            if (!this.textures.exists(textureKey)) {
                return;
            }
            
            // Crear el objeto de imagen usando el mismo sistema que StageEditor
            const [x = 0, y = 0] = Array.isArray(element.position) ? element.position : [0, 0];
            
            const stageObject = this.add.image(x, y, textureKey);
            stageObject.setOrigin(0, 0);
            stageObject.setScale(element.scale || 1.0);
            stageObject.setAlpha(element.opacity ?? 1.0);
            
            // Usar el layer original del JSON para mantener orden correcto
            const originalLayer = element.layer || (index + 1);
            stageObject.setDepth(originalLayer);
            stageObject.setVisible(element.visible !== false);
            
            // Configurar datos del objeto
            stageObject.setData('type', 'stageObject');
            stageObject.setData('imageKey', textureKey);
            stageObject.setData('imageName', element.namePath);
            stageObject.setData('layer', originalLayer);
            stageObject.setData('baseX', stageObject.x);
            stageObject.setData('baseY', stageObject.y);
            stageObject.setData('isTemplate', true);
            stageObject.setData('originalAlpha', element.opacity ?? 1.0);
            
            // Hacer que el HUD ignore los objetos del stage
            this.hudCamera.ignore(stageObject);
        });
    }

    // Carga de archivos de personajes
    createCharacterFileInputs() {
        // Input para imagen del personaje
        this.characterImageInput = document.createElement('input');
        this.characterImageInput.type = 'file';
        this.characterImageInput.accept = 'image/*';
        this.characterImageInput.style.display = 'none';
        document.body.appendChild(this.characterImageInput);

        // Input para XML del personaje
        this.characterXMLInput = document.createElement('input');
        this.characterXMLInput.type = 'file';
        this.characterXMLInput.accept = '.xml,text/xml';
        this.characterXMLInput.style.display = 'none';
        document.body.appendChild(this.characterXMLInput);
    }

    openCharacterLoader() {
        this.createCharacterLoaderModal();
    }

    createCharacterLoaderModal() {
        const { width, height } = this.scale;

        // Modal container
        this.characterModal = this.add.container(width / 2, height / 2);
        this.characterModal.setDepth(6000);

        // Background semi-transparente
        const modalOverlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.8);
        modalOverlay.setInteractive();

        // Panel del modal
        const modalPanel = this.add.rectangle(0, 0, 500, 400, 0x222222);

        // Título
        const title = this.add.text(0, -170, 'ADD CHARACTER SPRITESHEET', {
            fontSize: '18px',
            fill: '#00CCFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Área de drag & drop
        const dropArea = this.add.rectangle(0, -50, 450, 200, 0x333333);
        dropArea.setInteractive();

        // Texto principal del drag & drop
        const dropText = this.add.text(0, -80, 'DRAG XML AND PNG OR CLICK FOR BROWSER', {
            fontSize: '16px',
            fill: '#CCCCCC',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Estados de archivos
        this.selectedFiles = {
            image: null,
            xml: null
        };

        // Textos de estado
        const fileStatus = this.add.text(0, -20, 'No files selected', {
            fontSize: '12px',
            fill: '#999999',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Configurar drag & drop
        this.setupDragAndDrop(dropArea, dropText, fileStatus);

        // Click para browser
        dropArea.on('pointerdown', () => {
            this.openFileBrowser();
        });

        // Botones
        const loadBtn = this.add.rectangle(-80, 140, 120, 35, 0x00AA00);
        loadBtn.setInteractive();

        const loadBtnText = this.add.text(-80, 140, 'LOAD CHARACTER', {
            fontSize: '12px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        const cancelBtn = this.add.rectangle(80, 140, 120, 35, 0xFF3333);
        cancelBtn.setInteractive();

        const cancelBtnText = this.add.text(80, 140, 'CANCEL', {
            fontSize: '12px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Event handlers
        loadBtn.on('pointerdown', async () => {
            if (this.selectedFiles.image && this.selectedFiles.xml) {
                // Usar el nombre del archivo PNG sin extensión, o el valor del input si está especificado
                const imageName = this.selectedFiles.image.name.replace(/\.[^/.]+$/, ''); // Quitar extensión
                const characterName = imageName;
                
                // Verificar si ya hay un personaje cargado
                if (this.currentCharacter) {
                    this.showCharacterReplaceWarning(characterName);
                } else {
                    await this.tryCreateCharacter(this.selectedFiles.image, this.selectedFiles.xml, characterName);
                    this.closeCharacterModal();
                }
            } else {
                this.showErrorMessage('Please select both PNG and XML files');
            }
        });

        cancelBtn.on('pointerdown', () => {
            this.closeCharacterModal();
        });

        // Agregar elementos al modal
        this.characterModal.add([
            modalOverlay, modalPanel, title, dropArea, dropText, 
            fileStatus, loadBtn, loadBtnText, cancelBtn, cancelBtnText
        ]);

        // Referencias para cleanup
        this.characterModal.fileStatus = fileStatus;
        this.characterModal.dropText = dropText;

        // Ignorar por game camera
        this.gameCamera.ignore(this.characterModal);

        // Deshabilitar wheel mientras está abierto
        this.isModalOpen = true;
    }

    setupDragAndDrop(dropArea, dropText, fileStatus) {
        // Configurar eventos de drag & drop
        dropArea.setInteractive();
        
        // Prevenir comportamiento por defecto del navegador
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.dom?.addEventListener?.(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        // Visual feedback durante drag
        dropArea.on('dragenter', () => {
            dropArea.setFillStyle(0x444444);
            dropText.setText('DROP FILES HERE');
        });

        dropArea.on('dragleave', () => {
            dropArea.setFillStyle(0x333333);
            dropText.setText('DRAG XML AND PNG OR CLICK FOR BROWSER');
        });

        // Manejar drop
        dropArea.on('drop', (event) => {
            const files = event.dataTransfer?.files;
            if (files && files.length > 0) {
                this.handleDroppedFiles(files, fileStatus);
            }
            dropArea.setFillStyle(0x333333);
            dropText.setText('DRAG XML AND PNG OR CLICK FOR BROWSER');
        });
    }

    handleDroppedFiles(files, fileStatus) {
        let imageFile = null;
        let xmlFile = null;

        // Procesar archivos droppeados
        for (let file of files) {
            const extension = file.name.split('.').pop().toLowerCase();
            
            if (extension === 'png' || extension === 'jpg' || extension === 'jpeg') {
                imageFile = file;
            } else if (extension === 'xml') {
                xmlFile = file;
            }
        }

        // Actualizar estado
        if (imageFile) {
            this.selectedFiles.image = imageFile;
        }
        if (xmlFile) {
            this.selectedFiles.xml = xmlFile;
        }

        // Actualizar interfaz
        this.updateFileStatus(fileStatus);
    }

    openFileBrowser() {
        // Crear input temporal para seleccionar archivos
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.multiple = true;
        fileInput.accept = '.png,.jpg,.jpeg,.xml';
        
        fileInput.onchange = (event) => {
            if (event.target.files.length > 0) {
                this.handleDroppedFiles(event.target.files, this.characterModal.fileStatus);
            }
        };
        
        fileInput.click();
    }

    updateFileStatus(fileStatus) {
        const { image, xml } = this.selectedFiles;
        let statusText = '';
        
        if (image && xml) {
            statusText = `✓ ${image.name} & ${xml.name}`;
            fileStatus.setFill('#00FF00');
        } else if (image) {
            statusText = `✓ ${image.name} (need XML)`;
            fileStatus.setFill('#FFFF00');
        } else if (xml) {
            statusText = `✓ ${xml.name} (need PNG)`;
            fileStatus.setFill('#FFFF00');
        } else {
            statusText = 'No files selected';
            fileStatus.setFill('#999999');
        }
        
        fileStatus.setText(statusText);
    }

    showCharacterReplaceWarning(newCharacterName) {
        // Crear modal de confirmación
        const { width, height } = this.scale;
        
        this.warningModal = this.add.container(width / 2, height / 2);
        this.warningModal.setDepth(7000);

        // Background
        const warningOverlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.9);
        warningOverlay.setInteractive();

        // Panel
        const warningPanel = this.add.rectangle(0, 0, 600, 300, 0x333333);

        // Título
        const warningTitle = this.add.text(0, -100, 'WARNING!', {
            fontSize: '24px',
            fill: '#FF3333',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Mensaje
        const warningText = this.add.text(0, -40, 
            "Are you sure? Your progress could be lost forever,\nthat's a lot of time!", {
            fontSize: '16px',
            fill: '#FFFFFF',
            fontFamily: 'Arial',
            align: 'center'
        }).setOrigin(0.5);

        // Botones
        const sureBtn = this.add.rectangle(-150, 60, 120, 40, 0xFF3333);
        sureBtn.setInteractive();
        
        const sureBtnText = this.add.text(-150, 60, 'SURE!', {
            fontSize: '14px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        const saveBtn = this.add.rectangle(0, 60, 120, 40, 0x00AA00);
        saveBtn.setInteractive();
        
        const saveBtnText = this.add.text(0, 60, 'SAVE & LOAD', {
            fontSize: '12px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        const backBtn = this.add.rectangle(150, 60, 120, 40, 0x666666);
        backBtn.setInteractive();
        
        const backBtnText = this.add.text(150, 60, "NO, LET'S GO BACK", {
            fontSize: '10px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Event handlers
        sureBtn.on('pointerdown', async () => {
            await this.tryCreateCharacter(this.selectedFiles.image, this.selectedFiles.xml, newCharacterName);
            this.closeWarningModal();
            this.closeCharacterModal();
        });

        saveBtn.on('pointerdown', () => {
            this.saveCurrentCharacter();
            this.tryCreateCharacter(this.selectedFiles.image, this.selectedFiles.xml, newCharacterName);
            this.closeWarningModal();
            this.closeCharacterModal();
        });

        backBtn.on('pointerdown', () => {
            this.closeWarningModal();
        });

        // Agregar al modal
        this.warningModal.add([
            warningOverlay, warningPanel, warningTitle, warningText,
            sureBtn, sureBtnText, saveBtn, saveBtnText, backBtn, backBtnText
        ]);

        this.gameCamera.ignore(this.warningModal);
    }

    closeWarningModal() {
        if (this.warningModal) {
            this.warningModal.destroy();
            this.warningModal = null;
        }
    }

    showErrorMessage(message) {
        // Mostrar mensaje de error temporal
        const errorText = this.add.text(this.scale.width / 2, 100, message, {
            fontSize: '16px',
            fill: '#FF3333',
            fontFamily: 'Arial',
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setDepth(8000);

        this.gameCamera.ignore(errorText);

        // Remover después de 3 segundos
        this.time.delayedCall(3000, () => {
            errorText.destroy();
        });
    }

    closeCharacterModal() {
        if (this.characterModal) {
            // Limpiar input DOM
            if (this.characterModal.nameInput) {
                document.body.removeChild(this.characterModal.nameInput);
            }
            
            this.characterModal.destroy();
            this.characterModal = null;
        }

        // Reset estado
        this.selectedFiles = { image: null, xml: null };
        this.isModalOpen = false;
    }

    saveCurrentCharacter() {
        if (this.currentCharacter) {
            this.saveCharacterJSON();
        }
    }

    async tryCreateCharacter(imageFile, xmlFile, characterName) {
        if (!imageFile || !xmlFile) return;

        try {
            // Mostrar mensaje de carga
            this.showLoadingMessage();
            
            // Leer archivos
            const imageDataURL = await this.readFileAsDataURL(imageFile);
            const xmlText = await this.readFileAsText(xmlFile);
            
            // Parsear XML y crear personaje
            const xmlFrames = this.parseCharacterXML(xmlText);
            await this.createCharacterObject(imageDataURL, characterName, xmlFrames);
            
            // Actualizar la información del offset en pantalla
            this.updateOffsetInfo();
            
            this.closeCharacterModal();
            this.confirmSound.play();
            
        } catch (error) {
            this.showErrorMessage('Error loading character files');
        }
    }

    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    parseCharacterXML(xmlText) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        const animations = [];

        // Buscar elementos SubTexture (formato común para personajes de FNF)
        const frameElements = xmlDoc.querySelectorAll('SubTexture');
        
        frameElements.forEach((element, index) => {
            const name = element.getAttribute('name') || `frame_${index}`;
            const x = parseInt(element.getAttribute('x') || '0');
            const y = parseInt(element.getAttribute('y') || '0');
            const width = parseInt(element.getAttribute('width') || '0');
            const height = parseInt(element.getAttribute('height') || '0');

            if (width > 0 && height > 0) {
                animations.push({
                    name: name,
                    x: x,
                    y: y,
                    width: width,
                    height: height,
                    frameX: parseInt(element.getAttribute('frameX') || '0'),
                    frameY: parseInt(element.getAttribute('frameY') || '0'),
                    frameWidth: parseInt(element.getAttribute('frameWidth') || width),
                    frameHeight: parseInt(element.getAttribute('frameHeight') || height),
                    offsetX: 0, // Inicializar offset en 0
                    offsetY: 0  // Inicializar offset en 0
                });
            }
        });

        // Agrupar animaciones por nombre base
        const animationGroups = this.groupAnimationsByName(animations);
        
        return animationGroups;
    }

    groupAnimationsByName(frames) {
        const groups = {};
        
        frames.forEach(frame => {
            // Extraer el nombre base de la animación (sin números)
            let baseName = frame.name.replace(/\s*\d+$/g, '').trim();
            
            if (!groups[baseName]) {
                groups[baseName] = [];
            }
            groups[baseName].push(frame);
        });
        
        return groups;
    }

    async createCharacterObject(imageDataURL, characterName, animationGroups) {
        const timestamp = Date.now();
        const characterKey = `character_${characterName}_${timestamp}`;

        try {
            // Cargar la imagen base
            const response = await fetch(imageDataURL);
            const blob = await response.blob();
            const imageBitmap = await createImageBitmap(blob);

            // Crear canvas para la imagen completa
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            canvas.width = imageBitmap.width;
            canvas.height = imageBitmap.height;
            ctx.drawImage(imageBitmap, 0, 0);

            // Agregar la textura principal
            this.textures.addCanvas(characterKey, canvas);

            // Crear frames individuales para cada animación
            Object.keys(animationGroups).forEach((animName, animIndex) => {
                const frames = animationGroups[animName];
                frames.forEach((frame, frameIndex) => {
                    const frameKey = `${characterKey}_${animName}_${frameIndex}`;
                    this.createCharacterFrame(characterKey, frameKey, frame);
                });
            });

            // Crear el sprite del personaje
            this.createCharacterSprite(characterKey, characterName, animationGroups);
            
            // Actualizar lista de animaciones
            this.characterAnimations = Object.keys(animationGroups);
            this.updateAnimationList();

            imageBitmap.close();

        } catch (error) {
            throw error;
        }
    }

    createCharacterFrame(baseKey, frameKey, frameData) {
        const baseTexture = this.textures.get(baseKey);
        if (!baseTexture) return;

        // Crear frame individual
        const frameCanvas = document.createElement('canvas');
        const frameCtx = frameCanvas.getContext('2d');
        frameCanvas.width = frameData.width;
        frameCanvas.height = frameData.height;

        // Copiar la porción de imagen correspondiente
        frameCtx.drawImage(
            baseTexture.source[0].image,
            frameData.x, frameData.y, frameData.width, frameData.height,
            0, 0, frameData.width, frameData.height
        );

        this.textures.addCanvas(frameKey, frameCanvas);
    }

    createCharacterSprite(characterKey, characterName, animationGroups) {
        // Remover personaje anterior si existe
        if (this.characterSprite) {
            this.characterSprite.destroy();
        }

        // Crear animaciones de Phaser para cada grupo
        Object.keys(animationGroups).forEach((animName) => {
            const frames = animationGroups[animName];
            const frameKeys = [];
            
            // Recopilar todas las texturas de frames
            frames.forEach((frame, frameIndex) => {
                const frameKey = `${characterKey}_${animName}_${frameIndex}`;
                frameKeys.push({ key: frameKey });
            });

            // Crear animación de Phaser
            const animKey = `anim_${characterKey}_${animName}`;
            if (!this.anims.exists(animKey)) {
                this.anims.create({
                    key: animKey,
                    frames: frameKeys,
                    frameRate: 24,
                    repeat: animName.toLowerCase().includes('idle') ? -1 : 0
                });
            }
        });

        // Usar la primera animación disponible
        const firstAnimName = Object.keys(animationGroups)[0];
        const firstFrameKey = `${characterKey}_${firstAnimName}_0`;

        // Crear contenedor para el personaje (como en Characters.js)
        this.characterContainer = this.add.container(0, 0);
        this.characterContainer.setDepth(10); // Capa spritesheet: 10
        
        // Crear sprite dentro del contenedor
        this.characterSprite = this.add.sprite(0, 0, firstFrameKey);
        this.characterSprite.setOrigin(0, 0); // Origen en 0,0 para compatibilidad con Characters.js
        this.characterSprite.setScale(1);
        this.characterSprite.setDepth(10); // Capa spritesheet: 10
        
        // Agregar sprite al contenedor
        this.characterContainer.add(this.characterSprite);

        // Configurar datos del personaje
        this.characterSprite.setData('characterKey', characterKey);
        this.characterSprite.setData('characterName', characterName);
        this.characterSprite.setData('animationGroups', animationGroups);
        this.characterSprite.setData('currentAnimation', firstAnimName);

        // Actualizar la animación actual del editor
        this.currentAnimation = firstAnimName;

        // Hacer que el HUD ignore el contenedor y sprite
        this.hudCamera.ignore(this.characterContainer);
        this.hudCamera.ignore(this.characterSprite);

        // Configurar listeners para actualizar frame info
        this.characterSprite.on('animationstart', () => {
            this.updateFrameInfo();
        });

        this.characterSprite.on('animationupdate', () => {
            this.updateFrameInfo();
        });

        this.characterSprite.on('animationcomplete', () => {
            this.updateFrameInfo();
        });

        // Guardar referencia
        this.currentCharacter = {
            key: characterKey,
            name: characterName,
            animations: animationGroups,
            sprite: this.characterSprite,
            flip_x: false,
            scale: 1.0,
            basePosition: {
                x: this.characterSprite.x,
                y: this.characterSprite.y
            }
        };
        
        // Actualizar panel de propiedades si está abierto
        this.updateCharacterPropertiesPanel();
    }

    // Reproductor de animaciones
    playCurrentAnimation() {
        if (!this.characterSprite || !this.currentAnimation || !this.currentCharacter) {
            this.showErrorMessage('No character or animation selected');
            return;
        }

        // Aplicar offsets ANTES de reproducir la animación
        this.applyOffsetsToCharacter(this.currentAnimation);

        // Reproducir la animación actual usando el sistema de Phaser
        const animKey = `anim_${this.currentCharacter.key}_${this.currentAnimation}`;
        
        if (this.anims.exists(animKey)) {
            this.characterSprite.play(animKey);
            this.updateFrameInfo();
        } else {
            // Intentar buscar animaciones disponibles que contengan el nombre
            const availableAnimKeys = Object.keys(this.anims.anims.entries);
            const matchingKeys = availableAnimKeys.filter(key => key.includes(this.currentAnimation));
            
            if (matchingKeys.length > 0) {
                const correctKey = matchingKeys[0];
                this.characterSprite.play(correctKey);
                this.updateFrameInfo();
            } else {
                this.showErrorMessage(`Animation ${this.currentAnimation} not found`);
            }
        }
    }

    stopCurrentAnimation() {
        if (this.characterSprite) {
            this.characterSprite.stop();
            this.updateFrameInfo();
        }
    }

    updateFrameInfo() {
        if (!this.frameInfoText || !this.characterSprite) return;

        const sprite = this.characterSprite;
        
        if (sprite.anims && sprite.anims.currentAnim && sprite.anims.isPlaying) {
            // Si hay una animación reproduciéndose
            const currentAnim = sprite.anims.currentAnim;
            const totalFrames = currentAnim.frames.length;
            
            // Obtener el índice del frame actual de manera más segura
            let currentFrameIndex = 1; // Default a 1
            
            if (sprite.anims.currentFrame && typeof sprite.anims.currentFrame.index === 'number') {
                currentFrameIndex = sprite.anims.currentFrame.index + 1;
            } else if (typeof sprite.anims.frameIndex === 'number' && !isNaN(sprite.anims.frameIndex)) {
                currentFrameIndex = sprite.anims.frameIndex + 1;
            }
            
            // Asegurar que los valores son válidos
            currentFrameIndex = Math.max(1, Math.min(currentFrameIndex, totalFrames));
            
            this.frameInfoText.setText(`Frame: ${currentFrameIndex} / ${totalFrames}`);
        } else {
            // Si no hay animación, mostrar frame estático
            if (this.currentCharacter && this.currentAnimation) {
                const animationGroups = this.currentCharacter.animations;
                const frames = animationGroups[this.currentAnimation];
                if (frames && frames.length > 0) {
                    this.frameInfoText.setText(`Frame: 1 / ${frames.length}`);
                } else {
                    this.frameInfoText.setText('Frame: 1 / 1');
                }
            } else {
                this.frameInfoText.setText('Frame: 0 / 0');
            }
        }
    }

    // Guardado de JSON
    saveCharacterJSON() {
        if (!this.currentCharacter) {
            this.showErrorMessage('No character loaded to save');
            return;
        }

        const jsonData = this.generateCharacterJSONData(this.currentCharacter.name, this.currentCharacter.animations);
        
        // Crear blob y descargar
        const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.currentCharacter.name}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Mostrar toast de éxito
        this.showSuccessToast(`Character JSON exported successfully: ${this.currentCharacter.name}.json`);
    }

    generateCharacterJSONData(characterName, animationGroups) {
        const characterData = {
            animations: [],
            no_antialiasing: false,
            image: `characters/${characterName}`, // Sin extensión y sin toUpperCase
            healthicon: characterName.toLowerCase(),
            flip_x: this.currentCharacter?.flip_x || false,
            healthbar_colors: [49, 176, 209],
            sing_duration: 4,
            scale: this.currentCharacter?.scale || 1,
            _editor_isPlayer: false
        };

        // Generar animaciones basadas en los grupos encontrados - COMPATIBILIDAD CON Characters.js
        Object.keys(animationGroups).forEach((animName) => {
            const frames = animationGroups[animName];
            
            // Buscar si esta animación tiene un mapping asignado
            let mappedAnimName = animName; // Por defecto usar el nombre original
            
            // Revisar el singAnimations mapping
            Object.keys(this.singAnimations).forEach(singKey => {
                if (this.singAnimations[singKey] === animName) {
                    mappedAnimName = singKey; // Usar el nombre del mapping (ej: "singRIGHTmiss")
                }
            });
            
            // Generar indices para compatibilidad con Characters.js
            const indices = [];
            if (frames.length > 1) {
                // Si hay múltiples frames, crear indices secuenciales
                for (let i = 0; i < frames.length; i++) {
                    indices.push(i);
                }
            }
            
            const animData = {
                offsets: [
                    Math.round(frames[0]?.offsetX || 0), 
                    Math.round(frames[0]?.offsetY || 0)
                ], // Formato [x, y] compatible con Characters.js
                anim: mappedAnimName, // Usar nombre del mapping si existe
                fps: 24,
                name: frames[0].name.replace(/\s*\d+$/, ''), // Nombre base sin números del XML
                indices: indices, // Indices para compatibilidad con Characters.js
                loop: false
            };

            // Ajustar propiedades específicas para animaciones conocidas
            if (mappedAnimName.toLowerCase().includes('idle')) {
                animData.loop = true;
            }

            characterData.animations.push(animData);
        });

        return characterData;
    }

    // Sistema de animaciones
    updateAnimationList() {
        // Limpiar bloques anteriores
        this.animationContainer.removeAll(true);
        this.animationBlocks = [];

        if (!this.currentCharacter || !this.currentCharacter.animations) return;

        let yOffset = 0;
        const animationNames = Object.keys(this.currentCharacter.animations);
        
        animationNames.forEach((animName, index) => {
            // Crear bloque de animación con posición ajustada para el modal
            const animBlock = this.add.rectangle(0, yOffset, 160, 25, 0x333333);
            animBlock.setStrokeStyle(1, 0xFFFFFF);
            animBlock.setInteractive();

            const animText = this.add.text(0, yOffset, animName, {
                fontSize: '10px',
                fill: '#FFFFFF',
                fontFamily: 'Arial'
            }).setOrigin(0.5);

            // Event handler para cambiar animación
            animBlock.on('pointerdown', () => {
                this.playCharacterAnimation(animName);
                this.highlightAnimationBlock(index);
            });
            
            animBlock.on('pointerover', () => {
                animBlock.setFillStyle(0x555555);
            });

            animBlock.on('pointerout', () => {
                animBlock.setFillStyle(0x333333);
            });

            this.animationContainer.add([animBlock, animText]);
            this.animationBlocks.push({ block: animBlock, text: animText });

            yOffset += 30;
        });
        
        // Ajustar tamaño de la ventana modal al contenido
        this.adjustCharacterAnimationsModalSize(animationNames.length);
    }

    adjustCharacterAnimationsModalSize(animationCount) {
        const modal = this.modalWindows.characterAnimations;
        if (!modal) return;
        
        // Calcular altura basada en el contenido
        const minHeight = 80; // Altura mínima (header + padding)
        const itemHeight = 30; // Altura por animación
        const padding = 40; // Padding extra
        const newHeight = Math.max(minHeight, (animationCount * itemHeight) + padding);
        
        // Obtener el panel principal (primer elemento en el modal)
        const panel = modal.getAt(0);
        if (panel) {
            panel.height = newHeight;
            panel.setSize(220, newHeight);
        }
        
        // Ajustar posición de la barra de título
        const titleBar = modal.getAt(1);
        if (titleBar) {
            titleBar.y = -(newHeight / 2) + 15;
        }
        
        // Ajustar posición del texto del título
        const titleText = modal.getAt(2);
        if (titleText) {
            titleText.y = -(newHeight / 2) + 15;
        }
        
        // Ajustar botones de la ventana
        const minimizeBtn = modal.getAt(3);
        const minimizeText = modal.getAt(4);
        const closeBtn = modal.getAt(5);
        const closeText = modal.getAt(6);
        
        if (minimizeBtn) minimizeBtn.y = -(newHeight / 2) + 15;
        if (minimizeText) minimizeText.y = -(newHeight / 2) + 15;
        if (closeBtn) closeBtn.y = -(newHeight / 2) + 15;
        if (closeText) closeText.y = -(newHeight / 2) + 15;
    }

    highlightAnimationBlock(index) {
        this.animationBlocks.forEach((block, i) => {
            if (i === index) {
                block.block.setFillStyle(0x00AA00);
                block.text.setFill('#FFFF00');
            } else {
                block.block.setFillStyle(0x333333);
                block.text.setFill('#FFFFFF');
            }
        });
    }

    playCharacterAnimation(animationName) {
        if (!this.currentCharacter || !this.characterSprite) return;

        const animationGroups = this.currentCharacter.animations;
        if (!animationGroups[animationName]) return;

        this.currentAnimation = animationName;
        this.characterSprite.setData('currentAnimation', animationName);

        // Aplicar offsets ANTES de reproducir la animación
        this.applyOffsetsToCharacter(animationName);

        // Reproducir usando el sistema de animaciones de Phaser
        const animKey = `anim_${this.currentCharacter.key}_${animationName}`;
        
        if (this.anims.exists(animKey)) {
            this.characterSprite.play(animKey);
            this.updateFrameInfo();
        } else {
            // Intentar buscar animaciones disponibles que contengan el nombre
            const availableAnimKeys = Object.keys(this.anims.anims.entries);
            const matchingKeys = availableAnimKeys.filter(key => key.includes(animationName));
            
            if (matchingKeys.length > 0) {
                const correctKey = matchingKeys[0];
                this.characterSprite.play(correctKey);
                this.updateFrameInfo();
            } else {
                // Fallback al método anterior
                const characterKey = this.currentCharacter.key;
                const frameKey = `${characterKey}_${animationName}_0`;
                
                if (this.textures.exists(frameKey)) {
                    this.characterSprite.setTexture(frameKey);
                    this.updateFrameInfo();
                }
            }
        }
        
        // Actualizar la información del offset en pantalla
        this.updateOffsetInfo();
    }

    // Aplicación de offsets compatible con Characters.js
    applyOffsetsToCharacter(animationName) {
        if (!this.currentCharacter || !this.characterSprite) return;

        const animationGroups = this.currentCharacter.animations;
        if (!animationGroups[animationName]) return;

        // Limpiar tween anterior si existe
        if (this.currentCharacterTween) {
            this.currentCharacterTween.kill();
            this.currentCharacterTween = null;
        }

        // Obtener la posición base del personaje
        const baseX = this.currentCharacter.basePosition?.x || 0;
        const baseY = this.currentCharacter.basePosition?.y || 0;

        // Obtener los offsets de la animación (primer frame)
        const frames = animationGroups[animationName];
        if (!frames || frames.length === 0) return;

        const firstFrame = frames[0];
        const offsetX = firstFrame.offsetX || 0;
        const offsetY = firstFrame.offsetY || 0;

        // Aplicar offsets como desplazamientos relativos usando GSAP (igual que Characters.js)
        this.currentCharacterTween = gsap.to(this.characterSprite, {
            x: baseX + offsetX,  // posición base + offset
            y: baseY + offsetY,  // posición base + offset
            duration: 0,
            ease: 'none',
            overwrite: 'auto'
        });
    }

    openAnimationSelector(singKey, assignedText) {
        if (!this.currentCharacter) {
            this.showErrorMessage('Load a character first');
            return;
        }

        // Crear modal con scroll para seleccionar animación
        const { width, height } = this.scale;
        
        const selectorModal = this.add.container(width / 2, height / 2);
        selectorModal.setDepth(6500); // Depth muy alto para estar sobre todo
        
        const bg = this.add.rectangle(0, 0, 300, 400, 0x000000, 0.9);
        bg.setInteractive();
        
        const title = this.add.text(0, -180, `Assign ${singKey}`, {
            fontSize: '16px',
            fill: '#FFFF00',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
        
        // Contenedor simple para las animaciones (sin máscara por ahora)
        const animContainer = this.add.container(0, -50);
        
        // Filtrar animaciones: excluir las que ya están asignadas
        const assignedAnimations = Object.values(this.singAnimations).filter(anim => anim !== null);
        const availableAnimations = this.characterAnimations.filter(animName => 
            !assignedAnimations.includes(animName)
        );
        
        // Variables para scroll del selector
        let selectorScrollY = 0;
        const maxSelectorScroll = Math.max(0, (availableAnimations.length * 30) - 260);
        
        const updateSelectorScroll = () => {
            animContainer.setY(-50 - selectorScrollY);
        };
        
        let yPos = -100;
        availableAnimations.forEach((animName) => {
            const animBtn = this.add.rectangle(0, yPos, 250, 25, 0x333333, 0.8);
            animBtn.setInteractive();
            
            const animText = this.add.text(0, yPos, animName, {
                fontSize: '12px',
                fill: '#FFFFFF',
                fontFamily: 'Arial'
            }).setOrigin(0.5);
            
            animBtn.on('pointerdown', () => {
                this.singAnimations[singKey] = animName;
                assignedText.setText(animName);
                assignedText.setFill('#00FF00');
                selectorModal.destroy();
                this.confirmSound.play();
            });

            animBtn.on('pointerover', () => {
                animBtn.setFillStyle(0x555555);
            });

            animBtn.on('pointerout', () => {
                animBtn.setFillStyle(0x333333);
            });

            animContainer.add([animBtn, animText]);
            yPos += 30;
        });
        
        // Mostrar mensaje si no hay animaciones disponibles
        if (availableAnimations.length === 0) {
            const noAnimsText = this.add.text(0, -50, 'No available animations\n(all are assigned)', {
                fontSize: '12px',
                fill: '#FF6666',
                fontFamily: 'Arial',
                align: 'center'
            }).setOrigin(0.5);
            animContainer.add(noAnimsText);
        }
        
        // Botón para cerrar
        const closeBtn = this.add.rectangle(0, 170, 100, 30, 0xFF0000, 0.8);
        closeBtn.setInteractive();
        
        const closeText = this.add.text(0, 170, 'Cancel', {
            fontSize: '12px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
        
        closeBtn.on('pointerdown', () => {
            selectorModal.destroy();
            this.cancelSound.play();
        });
        
        // Agregar scroll wheel
        bg.on('wheel', (pointer, deltaX, deltaY) => {
            const scrollSpeed = 30;
            selectorScrollY += deltaY > 0 ? scrollSpeed : -scrollSpeed;
            selectorScrollY = Phaser.Math.Clamp(selectorScrollY, 0, maxSelectorScroll);
            updateSelectorScroll();
        });
        
        selectorModal.add([bg, title, animContainer, closeBtn, closeText]);
        this.gameCamera.ignore(selectorModal);
        updateSelectorScroll();
    }

    showShortcutsModal() {
        const { width, height } = this.scale;
        
        const shortcutsModal = this.add.container(width / 2, height / 2);
        shortcutsModal.setDepth(7000); // Depth muy alto para estar sobre todo
        
        // Panel principal más grande para la tabla
        const panel = this.add.rectangle(0, 0, 500, 450, 0x1A1A1A);
        
        // Barra de título
        const titleBar = this.add.rectangle(0, -210, 500, 30, 0x0066CC);
        titleBar.setInteractive();
        
        // Sistema de arrastre manual
        titleBar.on('pointerdown', (pointer) => {
            if (pointer.button === 0) {
                this.isDragging = true;
                this.draggedWindow = shortcutsModal;
                this.dragStartX = pointer.x;
                this.dragStartY = pointer.y;
                this.setCursor('grabbing');
                
                // Traer ventana al frente
                shortcutsModal.setDepth(this.windowZIndex++);
            }
        });
        
        const titleText = this.add.text(-230, -210, 'CHARACTER EDITOR - SHORTCUTS', {
            fontSize: '14px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0, 0.5);
        
        // Botón de cerrar
        const closeBtn = this.add.rectangle(230, -210, 25, 25, 0xFF0000);
        closeBtn.setStrokeStyle(1, 0xFFFFFF);
        closeBtn.setInteractive();
        
        const closeText = this.add.text(230, -210, 'X', {
            fontSize: '12px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
        
        // Header de la tabla
        const headerText = this.add.text(0, -170, 'Keys                                          Action', {
            fontSize: '13px',
            fill: '#00CCFF',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        // Línea divisoria
        const dividerLine = this.add.rectangle(0, -155, 450, 2, 0x00CCFF);
        
        // Datos de la tabla
        const shortcuts = [
            ['Q', 'Previous Animation'],
            ['E', 'Next Animation'],
            ['Enter', 'Repeat Current Animation'],
            ['Space', 'Play Idle Animation'],
            ['R', 'Reset Camera'],
            ['F', 'Flip Character X'],
            ['Arrow', 'Move Offsets 5px'],
            ['Shift + Arrow', 'Move Offsets 10px'],
            ['Ctrl + Arrow', 'Move Offsets 1px'],
            ['Ctrl + Z', 'Undo Last Change (max 10)'],
            ['Esc', 'Save Data as JSON'],
            ['Ctrl + Esc', 'Save Offsets as TXT'],
            ['Shift + Esc', 'Save All as ZIP'],
            ['Backspace', 'Return to Editors State'],
            ['Mouse Wheel', 'Camera Zoom'],
            ['Middle Button + Drag', 'Move Camera'],
            ['Click + Drag', 'Move Character Freely']
        ];

        // Agregar elementos base al modal
        shortcutsModal.add([panel, titleBar, titleText, closeBtn, closeText, headerText, dividerLine]);
        
        // Renderizar filas de la tabla
        let yPos = -135;
        shortcuts.forEach((row) => {
            const keyText = this.add.text(-200, yPos, row[0], {
                fontSize: '11px',
                fill: '#FFFF00',
                fontFamily: 'Arial',
                fontStyle: 'bold'
            }).setOrigin(0, 0.5);
            
            const actionText = this.add.text(50, yPos, row[1], {
                fontSize: '11px',
                fill: '#CCCCCC',
                fontFamily: 'Arial'
            }).setOrigin(0, 0.5);
            
            shortcutsModal.add([keyText, actionText]);
            yPos += 20;
        });
        
        closeBtn.on('pointerdown', () => {
            shortcutsModal.destroy();
        });
        
        this.gameCamera.ignore(shortcutsModal);
        
        // Agregar referencia para poder moverla
        this.shortcutsModal = shortcutsModal;
    }

    showSuccessToast(message) {
        const { width, height } = this.scale;

        // Posicionar en la esquina inferior izquierda
        const toastContainer = this.add.container(200, height - 60);
        toastContainer.setDepth(6000); // Más alto que el nav bar para estar encima de todo

        const bg = this.add.rectangle(0, 0, 350, 50, 0x00AA00, 0.9);
        bg.setStrokeStyle(2, 0xFFFFFF);

        const text = this.add.text(0, 0, message, {
            fontSize: '12px',
            fill: '#FFFFFF',
            fontFamily: 'Arial',
            align: 'center',
            wordWrap: { width: 330 }
        }).setOrigin(0.5);

        toastContainer.add([bg, text]);
        this.gameCamera.ignore(toastContainer);

        // Animación de entrada desde abajo
        toastContainer.setAlpha(0);
        toastContainer.y = height + 50; // Empezar fuera de la pantalla
        
        this.tweens.add({
            targets: toastContainer,
            alpha: 1,
            y: height - 60,
            duration: 300,
            ease: 'Back.easeOut'
        });

        // Auto-destruir después de 2 segundos con animación
        this.time.delayedCall(2000, () => {
            if (toastContainer) {
                this.tweens.add({
                    targets: toastContainer,
                    alpha: 0,
                    y: height + 50,
                    duration: 200,
                    ease: 'Power2.easeIn',
                    onComplete: () => toastContainer.destroy()
                });
            }
        });

        // Reproducir sonido de confirmación
        if (this.confirmSound) {
            this.confirmSound.play();
        }
    }

    showErrorMessage(message) {
        const { width, height } = this.scale;

        const errorContainer = this.add.container(width / 2, height / 2);

        const bg = this.add.rectangle(0, 0, 400, 100, 0xFF0000, 0.8);
        bg.setStrokeStyle(2, 0xFFFFFF);

        const text = this.add.text(0, 0, message, {
            fontSize: '16px',
            fill: '#FFFFFF',
            fontFamily: 'Arial',
            align: 'center',
            wordWrap: { width: 380 }
        }).setOrigin(0.5);

        errorContainer.add([bg, text]);
        this.gameCamera.ignore(errorContainer);

        // Auto-destruir después de 3 segundos
        this.time.delayedCall(3000, () => {
            if (errorContainer) errorContainer.destroy();
        });
    }

    // Compatibilidad con Characters.js
    async testWithCharactersJS() {
        if (!this.currentCharacter) {
            this.showErrorMessage('No character loaded to test');
            return;
        }

        try {
            // Generar datos compatibles con Characters.js
            const characterData = this.generateCharacterJSONData(this.currentCharacter.name, this.currentCharacter.animations);
            
            // Simular el proceso de creación de Characters.js
            await this.simulateCharactersJSCreation(characterData);
            
            this.showSuccessToast('Character is compatible with Characters.js!\nCheck console for details.');
            
        } catch (error) {
            console.error('Compatibility test failed:', error);
            this.showErrorMessage('Character is NOT compatible with Characters.js. Check console for details.');
        }
    }

    async simulateCharactersJSCreation(characterData) {
        // Verificar estructura requerida por Characters.js
        const requiredFields = ['animations', 'image', 'scale'];
        const missingFields = requiredFields.filter(field => !characterData.hasOwnProperty(field));
        
        if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }
        
        // Verificar estructura de animaciones
        if (!Array.isArray(characterData.animations) || characterData.animations.length === 0) {
            throw new Error('No animations found or animations is not an array');
        }
        
        // Verificar cada animación
        characterData.animations.forEach((animation, index) => {
            const requiredAnimFields = ['anim', 'name', 'offsets'];
            const missingAnimFields = requiredAnimFields.filter(field => !animation.hasOwnProperty(field));
            
            if (missingAnimFields.length > 0) {
                throw new Error(`Animation ${index} missing fields: ${missingAnimFields.join(', ')}`);
            }
            
            // Verificar que offsets sea un array de 2 elementos
            if (!Array.isArray(animation.offsets) || animation.offsets.length !== 2) {
                throw new Error(`Animation ${animation.anim} has invalid offsets format. Expected [x, y] array.`);
            }
            
            // Verificar que los offsets sean desplazamientos relativos razonables
            const [offsetX, offsetY] = animation.offsets;
            if (Math.abs(offsetX) > 1000 || Math.abs(offsetY) > 1000) {
                console.warn(`⚠️ Animation "${animation.anim}" has very large offsets - may be absolute coordinates instead of relative offsets`);
            }
        });
    }

    // Método para cargar un personaje existente desde Characters.js (para testing)
    async loadExistingCharacter(characterId) {
        try {
            const response = await fetch(`public/assets/data/characters/${characterId}.json`);
            if (!response.ok) {
                throw new Error(`Character ${characterId} not found`);
            }
            
            const characterData = await response.json();
            await this.convertCharactersJSToEditor(characterData, characterId);
            this.showSuccessToast(`Loaded existing character: ${characterId}`);
            
        } catch (error) {
            console.error('Failed to load existing character:', error);
            this.showErrorMessage(`Failed to load character: ${characterId}`);
        }
    }

    async convertCharactersJSToEditor(characterData, characterId) {
        try {
            const textureKey = `character_${characterId}`;
            const imagePath = characterData.image.replace('characters/', '');
            const spritePath = `public/assets/images/characters/${imagePath}.png`;
            const atlasPath = `public/assets/images/characters/${imagePath}.xml`;
            
            this.showLoadingMessage();
            await this.loadCharacterTextures(textureKey, spritePath, atlasPath);
            
            // Convertir animaciones al formato del editor
            const animationGroups = {};
            
            characterData.animations.forEach(animation => {
                const groupName = animation.anim;
                
                if (!animationGroups[groupName]) {
                    animationGroups[groupName] = [];
                }
                
                // Convertir offsets del formato [x, y] al formato del editor
                const [offsetX, offsetY] = animation.offsets || [0, 0];
                const frame = {
                    name: animation.name,
                    x: 0,
                    y: 0,
                    width: 100, // Valores placeholder
                    height: 100,
                    frameX: 0,
                    frameY: 0,
                    frameWidth: 100,
                    frameHeight: 100,
                    offsetX: offsetX,
                    offsetY: offsetY
                };
                
                animationGroups[groupName].push(frame);
            });
            
            // Crear el sprite del personaje usando el sistema existente
            this.createCharacterSprite(textureKey, characterId, animationGroups);
            
            // Configurar las propiedades del personaje
            this.currentCharacter.flip_x = characterData.flip_x || false;
            this.currentCharacter.scale = characterData.scale || 1.0;
            
            // Aplicar las propiedades al sprite
            if (this.characterSprite) {
                this.characterSprite.setFlipX(this.currentCharacter.flip_x);
                this.characterSprite.setScale(this.currentCharacter.scale);
            }
            
            // Actualizar las animaciones disponibles
            this.characterAnimations = Object.keys(animationGroups);
            this.updateAnimationList();
            
            // Actualizar panel de propiedades
            this.updateCharacterPropertiesPanel();
            
            // Actualizar offset info
            this.updateOffsetInfo();
            
            console.log('✓ Character successfully converted to editor format');
            
        } catch (error) {
            console.error('Failed to convert character:', error);
            throw error;
        }
    }
    
    async loadCharacterTextures(textureKey, spritePath, atlasPath) {
        return new Promise((resolve, reject) => {
            // Primero intentar cargar con el loader de Phaser
            this.load.atlas(textureKey, spritePath, atlasPath);
            
            this.load.once('complete', () => {
                resolve();
            });
            
            this.load.once('loaderror', (event) => {
                console.warn('Failed to load with atlas, trying without atlas...');
                // Si falla, intentar cargar solo la imagen
                this.load.image(textureKey, spritePath);
                
                this.load.once('complete', () => {
                    resolve();
                });
                
                this.load.once('loaderror', () => {
                    reject(new Error(`Failed to load character textures: ${textureKey}`));
                });
                
                this.load.start();
            });
            
            this.load.start();
        });
    }

    showImportConfirmation(characterData, characterName) {
        const { width, height } = this.scale;
        
        const confirmModal = this.add.container(width / 2, height / 2);
        confirmModal.setDepth(7000);
        
        // Background
        const bg = this.add.rectangle(0, 0, 500, 300, 0x000000, 0.9);
        bg.setStrokeStyle(2, 0x00CCFF);
        bg.setInteractive();
        
        // Título
        const title = this.add.text(0, -120, 'IMPORT CHARACTER JSON', {
            fontSize: '18px',
            fill: '#00CCFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
        
        // Info del personaje
        const infoText = this.add.text(0, -60, 
            `Character: ${characterName}\n` +
            `Animations: ${characterData.animations.length}\n` +
            `Image: ${characterData.image}\n` +
            `Scale: ${characterData.scale || 1}`, {
            fontSize: '14px',
            fill: '#FFFFFF',
            fontFamily: 'Arial',
            align: 'center'
        }).setOrigin(0.5);
        
        // Warning si hay personaje cargado
        let warningText = null;
        if (this.currentCharacter) {
            warningText = this.add.text(0, 20, 'WARNING: This will replace the current character!', {
                fontSize: '12px',
                fill: '#FF6666',
                fontFamily: 'Arial'
            }).setOrigin(0.5);
        }
        
        // Botones
        const importBtn = this.add.rectangle(-100, 100, 120, 35, 0x00AA00);
        importBtn.setStrokeStyle(2, 0xFFFFFF);
        importBtn.setInteractive();
        
        const importText = this.add.text(-100, 100, 'IMPORT', {
            fontSize: '14px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
        
        const cancelBtn = this.add.rectangle(100, 100, 120, 35, 0xFF3333);
        cancelBtn.setStrokeStyle(2, 0xFFFFFF);
        cancelBtn.setInteractive();
        
        const cancelText = this.add.text(100, 100, 'CANCEL', {
            fontSize: '14px',
            fill: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
        
        // Event handlers
        importBtn.on('pointerdown', async () => {
            try {
                await this.convertCharactersJSToEditor(characterData, characterName);
                this.showSuccessToast(`Character "${characterName}" imported successfully!`);
                confirmModal.destroy();
            } catch (error) {
                console.error('Import failed:', error);
                this.showErrorMessage('Failed to import character. Check console for details.');
                confirmModal.destroy();
            }
        });
        
        cancelBtn.on('pointerdown', () => {
            confirmModal.destroy();
        });
        
        // Agregar elementos
        const elements = [bg, title, infoText, importBtn, importText, cancelBtn, cancelText];
        if (warningText) elements.push(warningText);
        
        confirmModal.add(elements);
        this.gameCamera.ignore(confirmModal);
    }
}

// Registrar la escena
if (typeof game !== 'undefined') {
    game.scene.add('CharacterEditorState', CharacterEditor);
}
