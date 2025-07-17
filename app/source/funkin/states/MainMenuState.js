class MainMenuState extends Phaser.Scene {
    constructor() {
        super({ key: "MainMenuState" });
        this.selectedIndex = 0;
    }

    init() {
        // Opcional: Si quieres que siempre empiece en la primera opción, descomenta la siguiente línea:
        // this.selectedIndex = 0;
    }

    preload() {
        this.load.json('menuConfig', 'public/assets/data/menuConfig.json');
        this.load.image('menuBackground', 'public/assets/images/menuBG.png');
        this.load.audio('selectSound', 'public/assets/audio/sounds/scrollMenu.ogg');
        this.load.audio('confirmSound', 'public/assets/audio/sounds/confirmMenu.ogg');
        this.load.audio('cancelSound', 'public/assets/audio/sounds/cancelMenu.ogg');
    }

    create() {
        this.config = this.cache.json.get('menuConfig');
        this.config.menuOptions.forEach(option => {
            const baseName = option.spritePath.split('/').pop();
            option.key = baseName.replace('menu_', '');
            option.spritesheetKey = `menu${baseName.charAt(0).toUpperCase() + baseName.slice(1)}`;
            option.animPrefix = baseName.replace('menu_', '');
            this.load.atlasXML(
                option.spritesheetKey,
                `${option.spritePath}.png`,
                `${option.spritePath}.xml`
            );
        });
        this.load.start();
        this.load.once('complete', () => {
            this.createAnimations();
            this.setupMenu();
        });
    }

    setupMenu() {
        const { width, height } = this.scale;
        const bgScale = 1.3;
        this.bg = this.add.image(width / 2, 0, 'menuBackground')
            .setOrigin(0.5, 0)
            .setScale(bgScale);

        this.selectSound = this.sound.add('selectSound');
        this.confirmSound = this.sound.add('confirmSound');
        this.cancelSound = this.sound.add('cancelSound');

        this.menuContainer = this.add.container(0, 0);
        this.menuOptions = this.config.menuOptions.map((option, index) => {
            const sprite = this.add.sprite(option.position.x, option.position.y, option.spritesheetKey);
            sprite.setOrigin(0.5);
            this.menuContainer.add(sprite);
            return sprite;
        });

        this.updateSelection();

        if (this.game.device.os.android) {
            this.menuOptions.forEach((option, index) => {
                option.setInteractive();
                option.on('pointerdown', () => {
                    if (this.selectedIndex === index) {
                        this.selectOption();
                    } else {
                        this.changeSelection(index - this.selectedIndex);
                    }
                });
            });
            if (window.AndroidSupport) window.AndroidSupport.initialize(this);
        }

        this.setupInputs();

        this.changeSelection(0);
    }

    // Copia este método de OptionsState para formatear teclas igual
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

    setupInputs() {
        // Obtener controles personalizados del localStorage
        const getKeyFromStorage = (key, fallback) => {
            const value = localStorage.getItem(key);
            return value && value !== "null" && value !== "undefined" ? value : fallback;
        };

        // Mapea los controles de UI a teclas reales (en formato amigable)
        const controls = {
            up: getKeyFromStorage('CONTROLS.UI.UP', 'UP'),
            down: getKeyFromStorage('CONTROLS.UI.DOWN', 'DOWN'),
            accept: getKeyFromStorage('CONTROLS.UI.ACCEPT', 'ENTER'),
            back: getKeyFromStorage('CONTROLS.UI.BACK', 'ESCAPE')
        };

        this.input.keyboard.on('keydown', (event) => {
            const pressed = this.formatKeyName(event.key, event.code);

            if (pressed === controls.up) {
                this.changeSelection(-1);
            } else if (pressed === controls.down) {
                this.changeSelection(1);
            } else if (pressed === controls.accept) {
                this.selectOption();
            } else if (pressed === controls.back) {
                this.scene.get('FlashEffect').startTransition('GfDanceState');
            } else if (event.code === 'Digit7') {
                this.handleEditorState();
            }
        });

        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            this.changeSelection(deltaY > 0 ? 1 : -1);
        });
    }

    createAnimations() {
        this.config.menuOptions.forEach(option => {
            ['basic', 'white'].forEach(type => {
                const animKey = `${option.animPrefix}_${type === 'basic' ? 'animation' : 'white'}`;
                if (!this.anims.exists(animKey)) {
                    const config = this.config.animations[type];
                    this.anims.create({
                        key: animKey,
                        frames: this.anims.generateFrameNames(option.spritesheetKey, {
                            prefix: `${option.animPrefix} ${type}000`,
                            start: 0,
                            end: config.endFrame,
                            zeroPad: 1
                        }),
                        frameRate: config.frameRate,
                        repeat: -1
                    });
                }
            });
        });
    }

    getAnimationKey(index) {
        return `${this.config.menuOptions[index].animPrefix}_animation`;
    }

    getWhiteAnimationKey(index) {
        return `${this.config.menuOptions[index].animPrefix}_white`;
    }

    changeSelection(direction) {
        const totalOptions = this.menuOptions.length;
        this.selectedIndex = (this.selectedIndex + direction + totalOptions) % totalOptions;

        const { height } = this.scale;
        const selectedOption = this.menuOptions[this.selectedIndex];

        // Centra la opción seleccionada en la pantalla
        const targetY = height / 2 - selectedOption.y;

        this.tweens.add({
            targets: this.menuContainer,
            y: targetY,
            duration: 300,
            ease: 'Cubic.easeOut'
        });

        // --- Scroll del fondo adaptativo ---
        const bgHeight = this.bg.displayHeight;
        const camHeight = this.cameras.main.height;

        // Calcula el rango de scroll posible según las opciones
        const spacing = this.config.spacing || 160;
        const totalMenuHeight = spacing * (totalOptions - 1);
        const maxScroll = Math.max(0, totalMenuHeight - (camHeight / 2)); // margen para centrar

        // Calcula el porcentaje de scroll según la opción seleccionada
        let percent = 0;
        if (totalOptions > 1) {
            percent = this.selectedIndex / (totalOptions - 1);
        }

        // Calcula el desplazamiento máximo permitido para el fondo
        const minBgY = Math.min(0, camHeight - bgHeight);
        const maxBgY = 0;

        // El fondo se mueve proporcional al porcentaje de scroll
        let bgTargetY = Phaser.Math.Linear(maxBgY, minBgY, percent);

        this.tweens.add({
            targets: this.bg,
            y: bgTargetY,
            duration: 600,
            ease: 'Cubic.easeOut'
        });

        this.updateSelection();
        this.selectSound.play();
    }

    updateSelection() {
        this.menuOptions.forEach((option, index) => {
            if (index === this.selectedIndex) {
                option.play(this.getWhiteAnimationKey(index));
                // Animación suave para la opción seleccionada
                this.tweens.add({
                    targets: option,
                    scaleX: 1.1,
                    scaleY: 1.1,
                    alpha: 1,
                    duration: 250,
                    ease: 'Cubic.easeOut'
                });
                // Usar option.position.x en vez de option.x para evitar el error
                this.tweens.add({
                    targets: option,
                    x: option.position ? option.position.x + 20 : option.x,
                    duration: 250,
                    ease: 'Cubic.easeOut',
                    yoyo: true,
                    repeat: 0
                });
            } else {
                option.play(this.getAnimationKey(index));
                // Animación suave para las no seleccionadas
                this.tweens.add({
                    targets: option,
                    scaleX: 0.9,
                    scaleY: 0.9,
                    alpha: 0.7,
                    duration: 250,
                    ease: 'Cubic.easeOut'
                });
                // Usar option.position.x en vez de option.x para evitar el error
                this.tweens.add({
                    targets: option,
                    x: option.position ? option.position.x : option.x,
                    duration: 250,
                    ease: 'Cubic.easeOut'
                });
            }
        });
    }

    verifyScene(sceneName) {
        const sceneExists = this.scene.get(sceneName);
        if (!sceneExists) {
            this.cancelSound.play();
            this.cameras.main.shake(200, 0.01);
            return false;
        }
        return true;
    }

    selectOption() {
        const { selectedIndex, config } = this;
        const selectedOption = this.menuOptions[selectedIndex];
        const selectedScene = config.menuOptions[selectedIndex].targetScene;

        if (!this.verifyScene(selectedScene)) return;
        this.handleValidScene(selectedOption, selectedScene);
    }

    handleInvalidScene(option) {
        // Implementa si es necesario
    }

    handleValidScene(option, scene) {
        this.confirmSound.play();
        this.scene.get("TransitionScene").startTransition(scene);
    }

    handleEditorState() {
        if (!this.scene.get("EditorsState")) return;
        this.scene.get("TransitionScene").startTransition("EditorsState");
    }
}

game.scene.add("MainMenuState", MainMenuState);