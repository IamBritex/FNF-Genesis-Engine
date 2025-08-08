class AchievementManager {
    constructor() {
        this.storageKey = 'fnf_achievements';
        this.unlockedAchievements = this.load();
    }

    // Carga los logros desbloqueados desde localStorage
    load() {
        const data = localStorage.getItem(this.storageKey);
        return data ? JSON.parse(data) : {};
    }

    // Guarda el estado actual de los logros en localStorage
    save() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.unlockedAchievements));
    }

    // Comprueba si un logro específico está desbloqueado
    isUnlocked(achievementName) {
        return this.unlockedAchievements[achievementName] === true;
    }

    // Marca un logro como desbloqueado y lo guarda
    unlock(achievementName) {
        if (!this.isUnlocked(achievementName)) {
            console.log(`Achievement Unlocked: ${achievementName}`);
            this.unlockedAchievements[achievementName] = true;
            this.save();
        }
    }

    // Resetea todos los logros (útil para depuración)
    reset() {
        this.unlockedAchievements = {};
        this.save();
        console.log('All achievements have been reset.');
    }
}

// Creamos una instancia global para que sea accesible desde cualquier escena.
const achievementManager = new AchievementManager();


class AwardsState extends Phaser.Scene {
    constructor() {
        super({ key: "AwardsState" });
        this.keyState = {};
        this.awardsData = null; // Para almacenar los datos cargados del JSON
        this.selectedIndex = 0; // Índice de la opción seleccionada
        this.awardItems = []; // Array para almacenar los elementos de logros
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    preload() {
        this.load.image("menuDesat", "public/assets/images/menuDesat.png");
        this.load.image("bubbleBox", "public/assets/images/states/AwardsState/bubbleBox.png");
        this.load.image("lockedachievement", "public/assets/images/states/AwardsState/lockedachievement.png");
        this.load.atlasXML("menuAwards", "public/assets/images/states/MainMenuState/options/menu_awards.png", "public/assets/images/states/MainMenuState/options/menu_awards.xml");

        // Cargar sonidos
        this.load.audio('selectSound', 'public/assets/audio/sounds/scrollMenu.ogg');
        this.load.audio('confirmSound', 'public/assets/audio/sounds/confirmMenu.ogg');
        this.load.audio('cancelSound', 'public/assets/audio/sounds/cancelMenu.ogg');

        // Cargar botón de back para móviles
        if (this.isMobile) {
            this.load.atlasXML('backButton', 
                'public/assets/images/UI/mobile/backButton.png', 
                'public/assets/images/UI/mobile/backButton.xml'
            );
        }

        // Cargar el archivo JSON con los datos de logros
        this.load.json("awardsData", "public/assets/data/Awards.json");

        // Crear un listener para cuando el JSON se cargue
        this.load.on('filecomplete-json-awardsData', () => {
            this.awardsData = this.cache.json.get('awardsData');
            console.log('[AwardsState] Awards data loaded:', Object.keys(this.awardsData).length, 'awards');
            this.loadAwardsIcons();
        });

        // Listener para cuando todas las cargas se completen
        this.load.on('complete', () => {
            console.log('[AwardsState] All assets loaded, creating scene...');
        });
    }

    // Función para cargar dinámicamente los iconos después de tener los datos
    loadAwardsIcons() {
        if (!this.awardsData) {
            console.error('[AwardsState] No awards data available for loading icons');
            return;
        }
        
        console.log('[AwardsState] Loading award icons...');
        
        // Recorremos el JSON de logros y cargamos cada icono único
        for (const [key, value] of Object.entries(this.awardsData)) {
            // Usamos el nombre del logro como clave para la imagen
            this.load.image(key, value.icon);
            console.log(`[AwardsState] Queued icon: ${key} -> ${value.icon}`);
        }
        
        // Iniciar la carga de los iconos si no estamos ya cargando
        if (!this.load.isLoading()) {
            this.load.start();
        }
    }

    // Función auxiliar para obtener los datos de los logros desde el JSON cargado
    getAwardsData() {
        return this.awardsData || {};
    }

    // Método para formatear nombres de teclas (copiado de OptionsState)
    formatKeyName(key, code) {
        const specialKeys = {
            " ": "SPACE",
            ArrowUp: "UP",
            ArrowDown: "DOWN",
            ArrowLeft: "LEFT",
            ArrowRight: "RIGHT",
            Control: "CTRL",
            Alt: "ALT",
            Shift: "SHIFT",
            Tab: "TAB",
            CapsLock: "CAPS",
            Backspace: "BACKSPACE",
            Delete: "DELETE",
            Insert: "INSERT",
            Home: "HOME",
            End: "END",
            PageUp: "PAGEUP",
            PageDown: "PAGEDOWN",
            Enter: "ENTER",
            Meta: "META",
            ContextMenu: "MENU",
        };
        if (specialKeys[key]) return specialKeys[key];
        if (key && key.startsWith("F") && key.length <= 3) return key.toUpperCase();
        if (code && code.startsWith("Numpad")) return code.replace("Numpad", "NUM_");
        if (key && key.length === 1) return key.toUpperCase();
        return key ? key.toUpperCase() : "";
    }

    // Configurar controles de entrada
    setupInputs() {
        // Obtener controles personalizados del localStorage o usar valores por defecto
        const getKeyFromStorage = (key, fallback) => {
            const value = localStorage.getItem(key);
            return value && value !== "null" && value !== "undefined" ? value : fallback;
        };

        const controls = {
            up: getKeyFromStorage('CONTROLS.UI.UP', 'UP'),
            down: getKeyFromStorage('CONTROLS.UI.DOWN', 'DOWN'),
            back: getKeyFromStorage('CONTROLS.UI.BACK', 'BACKSPACE')
        };

        this.input.keyboard.removeAllListeners('keydown');
        this.input.keyboard.on('keydown', (event) => {
            const pressed = this.formatKeyName(event.key, event.code);

            if (pressed === controls.up) {
                this.changeSelection(-1);
            } else if (pressed === controls.down) {
                this.changeSelection(1);
            } else if (pressed === controls.back) {
                this.handleBack();
            }
        });
    }

    // Cambiar selección con navegación circular
    changeSelection(direction) {
        if (this.awardItems.length === 0) return;

        // Reproducir sonido de navegación
        if (this.selectSound) {
            this.selectSound.play();
        }

        // Calcular nueva selección
        const totalItems = this.awardItems.length;
        this.selectedIndex = (this.selectedIndex + direction + totalItems) % totalItems;

        // Centrar la opción seleccionada en la pantalla
        this.scrollToSelected();
        this.updateSelection();
    }

    // Centrar la opción seleccionada en Y
    scrollToSelected() {
        if (!this.awardsContainer || this.awardItems.length === 0) return;

        const selectedItem = this.awardItems[this.selectedIndex];
        const { height } = this.scale;
        
        // Calcular la posición Y para centrar el elemento seleccionado
        const targetY = (height / 2) - selectedItem.y;

        // Animación suave para mover el container
        this.tweens.add({
            targets: this.awardsContainer,
            y: targetY,
            duration: 300,
            ease: 'Cubic.easeOut'
        });
    }

    // Actualizar el estado visual de todos los elementos
    updateSelection() {
        this.awardItems.forEach((item, index) => {
            const isSelected = index === this.selectedIndex;
            
            // Actualizar el tinte del bubble box (sin amarillo)
            if (item.bubbleBox) {
                // Restaurar tinte original (sin tinte amarillo)
                const isUnlocked = achievementManager.isUnlocked(item.title);
                if (isUnlocked) {
                    item.bubbleBox.setTint(0xDDFFDD);
                } else {
                    item.bubbleBox.clearTint();
                }
            }

            // Efecto de alpha más pronunciado para la selección
            const targetAlpha = isSelected ? 1.0 : 0.6;
            
            [item.bubbleBox, item.icon, item.titleText, item.descText].forEach(element => {
                if (element) {
                    this.tweens.add({
                        targets: element,
                        alpha: targetAlpha,
                        duration: 200,
                        ease: 'Cubic.easeOut'
                    });
                }
            });
        });
    }

    // Configurar controles móviles
    setupMobileControls() {
        if (!this.isMobile) return;

        let startY = 0;
        let currentY = 0;
        let isDragging = false;
        const dragThreshold = 10;

        this.input.on('pointerdown', (pointer) => {
            startY = pointer.y;
            currentY = pointer.y;
            isDragging = false;
        });

        this.input.on('pointermove', (pointer) => {
            const deltaY = pointer.y - currentY;
            
            if (Math.abs(pointer.y - startY) > dragThreshold) {
                isDragging = true;
            }

            if (isDragging) {
                // Calcular cuántos elementos moverse basado en el delta
                const itemHeight = 120; // Altura aproximada de cada item
                const moveThreshold = itemHeight * 0.3;
                
                if (Math.abs(deltaY) > moveThreshold) {
                    const direction = deltaY > 0 ? -1 : 1;
                    this.changeSelection(direction);
                    currentY = pointer.y;
                }
            }
        });

        this.input.on('pointerup', () => {
            isDragging = false;
        });
    }

    // Configurar botón de back móvil
    setupMobileBackButton() {
        if (!this.isMobile) return;

        const { width, height } = this.scale;
        
        this.backButton = this.add.sprite(width - 105, height - 75, 'backButton')
            .setScrollFactor(0)
            .setDepth(100)
            .setInteractive()
            .setScale(0.5)
            .setFrame('back0000');
        
        this.backButton.on('pointerdown', () => {
            if (this.cancelSound) {
                this.cancelSound.play();
            }
            
            // Crear animación del botón
            this.anims.create({
                key: 'backPress',
                frames: this.anims.generateFrameNames('backButton', {
                    prefix: 'back',
                    zeroPad: 4,
                    start: 0,
                    end: 22
                }),
                frameRate: 24,
                repeat: 0
            });

            this.backButton.play('backPress');
            
            // Delay antes de cambiar escena
            this.time.delayedCall(100, () => {
                this.handleBack();
            });
        });
    }

    create() {
        // Verificar que los datos de logros estén cargados
        if (!this.awardsData) {
            console.error('[AwardsState] Awards data not loaded yet, retrying in 100ms...');
            // Reintentar después de un breve delay
            this.time.delayedCall(100, () => {
                if (this.cache.json.exists('awardsData')) {
                    this.awardsData = this.cache.json.get('awardsData');
                    this.scene.restart();
                } else {
                    console.error('[AwardsState] Awards data still not available after retry');
                }
            });
            return;
        }

        console.log('[AwardsState] Creating scene with', Object.keys(this.awardsData).length, 'awards');

        // Cargar sonidos
        this.selectSound = this.sound.add('selectSound');
        this.confirmSound = this.sound.add('confirmSound');
        this.cancelSound = this.sound.add('cancelSound');

        // --- CONFIGURACIÓN INICIAL ---
        const bg = this.add.image(0, 0, "menuDesat")
            .setOrigin(0, 0)
            .setDisplaySize(this.game.config.width, this.game.config.height);

        const awardsSprite = this.add.sprite(this.game.config.width / 2, 80, "menuAwards")
            .setOrigin(0.5)
            .setScale(1.1)
            .setScrollFactor(0); // Mantener fijo en pantalla

        this.anims.create({
            key: "awards", 
            frames: this.anims.generateFrameNames("menuAwards", {
                prefix: "awards white",
                start: 0,
                end: 2,
                zeroPad: 4
            }), 
            frameRate: 12,
            repeat: -1
        });
        awardsSprite.play("awards");

        // --- PARA PRUEBAS: Desbloquea un logro al presionar la tecla 'U' ---
        this.input.keyboard.on('keydown-U', () => {
            achievementManager.unlock("That's How You Do It!");
            this.scene.restart(); // Reinicia la escena para ver el cambio
        });

        // --- PARA PRUEBAS: Botón para resetear los logros ---
        const resetButton = this.add.text(this.game.config.width - 20, 20, 'Resetear Logros', { 
            font: "18px VCR", 
            color: "#FFFF00", 
            backgroundColor: "#000000", 
            padding: { x: 5, y: 5 } 
        })
        .setOrigin(1, 0)
        .setInteractive();
        resetButton.on('pointerdown', () => {
            achievementManager.reset();
            this.scene.restart(); // Reinicia la escena para ver el cambio
        });

        // --- CREACIÓN DEL CONTENEDOR NAVEGABLE ---
        const BUBBLE_SCALE = 0.65; // Reducir la escala de la burbuja
        const ICON_SIZE = 80;
        const PADDING = 40;
        const listStartY = 180;

        this.awardsContainer = this.add.container(this.game.config.width / 2, listStartY);
        this.awardItems = []; // Resetear array

        const awardsData = Object.entries(this.getAwardsData());
        let currentY = 0;

        // --- BUCLE DE GENERACIÓN DE LOGROS ---
        awardsData.forEach(([title, details], index) => {
            const isUnlocked = achievementManager.isUnlocked(title);

            // 1. Fondo del logro (bubbleBox)
            const bubbleBox = this.add.image(0, currentY, "bubbleBox")
                .setOrigin(0.5)
                .setScale(BUBBLE_SCALE);
            
            if (isUnlocked) {
                bubbleBox.setTint(0xDDFFDD); // Tinte verde claro para indicar desbloqueo
            }

            // 2. Icono
            const iconKey = isUnlocked ? title : "lockedachievement";
            const achievementIcon = this.add.image(
                bubbleBox.x - bubbleBox.displayWidth * 0.42, 
                bubbleBox.y, 
                iconKey
            )
            .setDisplaySize(ICON_SIZE, ICON_SIZE)
            .setOrigin(0.5);

            // 3. Textos
            const textStartX = bubbleBox.x - bubbleBox.displayWidth * 0.3;
            const textWidth = bubbleBox.displayWidth * 0.55;
            
            // Mostrar texto real si está desbloqueado, o "???" si está bloqueado
            const displayTitle = isUnlocked ? title : "???";
            const displayMessage = isUnlocked ? details.message : "???";
            
            const titleText = this.add.text(textStartX, bubbleBox.y - 18, displayTitle, {
                font: "22px VCR",
                color: "#000000",
                fontWeight: "bold",
                wordWrap: { width: textWidth }
            }).setOrigin(0, 0.5);

            const descText = this.add.text(textStartX, bubbleBox.y + 20, displayMessage, {
                font: "16px VCR",
                color: "#000000",
                wordWrap: { 
                    width: textWidth,
                    useAdvancedWrap: true 
                }
            }).setOrigin(0, 0.5);

            // 4. Crear objeto de item y añadir al contenedor
            const itemData = {
                bubbleBox,
                icon: achievementIcon,
                titleText,
                descText,
                title,
                y: currentY
            };

            this.awardItems.push(itemData);
            this.awardsContainer.add([bubbleBox, achievementIcon, titleText, descText]);
            
            currentY += bubbleBox.displayHeight + PADDING;
        });

        // --- CONFIGURACIÓN INICIAL DE NAVEGACIÓN ---
        this.selectedIndex = 0;
        this.scrollToSelected();
        this.updateSelection();

        // --- CONFIGURAR CONTROLES ---
        this.setupInputs();

        // --- CONFIGURAR CONTROLES MÓVILES ---
        if (this.isMobile) {
            this.setupMobileControls();
            this.setupMobileBackButton();
        }
    }

    handleBack() {
        if (this.cancelSound) {
            this.cancelSound.play();
        }
        this.scene.start("MainMenuState");
    }

    // Limpieza al cerrar la escena
    shutdown() {
        // Limpiar listeners
        this.input.keyboard.removeAllListeners();
        this.input.removeAllListeners();
        
        // Limpiar referencias
        this.awardItems = [];
        this.selectedIndex = 0;
        
        if (this.backButton) {
            this.backButton.destroy();
            this.backButton = null;
        }
        
        if (this.awardsContainer) {
            this.awardsContainer.destroy();
            this.awardsContainer = null;
        }
    }
}

game.scene.add("AwardsState", AwardsState);
