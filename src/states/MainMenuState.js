class MainMenuState extends Phaser.Scene {
    constructor() {
        super({ key: "MainMenuState" });
        this.selectedIndex = 0;
        this.scrollSpeed = 70;
        this.bgScrollSpeed = 70;
        this.keyCooldown = false;
        this.enterCooldown = false;
    }

    preload() {
        console.log("MainMenuState cargando...");
        
        // Load config file
        this.load.json('menuConfig', 'src/config/menuConfig.json');
        
        this.load.image('menuBackground', 'public/assets/images/states/MainMenuState/menuBG.png');
        
        // Load sounds
        this.load.audio('selectSound', 'public/assets/sounds/scrollMenu.ogg');
        this.load.audio('confirmSound', 'public/assets/sounds/confirmMenu.ogg');
        this.load.audio('cancelSound', 'public/assets/sounds/cancelMenu.ogg');
    }

    create() {
        // Load config
        this.config = this.cache.json.get('menuConfig');
        
        // Load sprites first
        this.config.menuOptions.forEach(option => {
            this.load.atlasXML(
                option.spritesheetKey,
                `${option.spritePath}.png`,
                `${option.spritePath}.xml`
            );
        });
        
        // Start loading sprites
        this.load.start();
        
        // Wait for sprites to load before creating animations and menu
        this.load.once('complete', () => {
            this.createAnimations();
            this.setupMenu();
        });
    }

    setupMenu() {
        // Move all the menu setup code here
        const { width, height } = this.scale;

        // ====== BACKGROUND ======
        this.bg = this.add.image(width / 2, 0, 'menuBackground')
            .setOrigin(0.5, 0)
            .setScale(1.6);

        this.selectSound = this.sound.add('selectSound');
        this.confirmSound = this.sound.add('confirmSound');
        this.cancelSound = this.sound.add('cancelSound');

        this.createAnimations();

        // ====== OPTIONS CONTAINER ======
        this.menuContainer = this.add.container(0, 0);

        // Ajustar el espaciado vertical entre opciones
        const spacing = 140; // Aumentamos de 120 a 140 para dar más espacio

        this.menuOptions = this.config.menuOptions.map((option, index) => {
            return this.add.sprite(650, 100 + spacing * index, option.spritesheetKey);
        });

        // Ajustar la cámara para mostrar todo el contenido
        const lastOptionY = this.menuOptions[this.menuOptions.length - 1].y;
        this.cameras.main.setBounds(0, 0, width, lastOptionY + 150); // Padding

        this.menuOptions.forEach((option, index) => {
            option.play(this.getAnimationKey(index));
            this.menuContainer.add(option);
        });

        this.updateSelection();

        // Añadir interactividad táctil para Android
        if (this.game.device.os.android) {
            this.menuOptions.forEach((option, index) => {
                option.setInteractive();
                
                option.on('pointerdown', () => {
                    if (this.selectedIndex === index) {
                        // Si ya está seleccionada, ejecutar la opción
                        this.selectOption();
                    } else {
                        // Si no está seleccionada, seleccionarla
                        const difference = index - this.selectedIndex;
                        this.changeSelection(difference);
                    }
                });
            });

            // Inicializar AndroidSupport si está disponible
            if (window.AndroidSupport) {
                window.AndroidSupport.initialize(this);
            }
        }

        // ====== INPUT KEYS ======
        this.setupInputs();
    }

    setupInputs() {
        const inputs = {
            'ArrowDown': () => this.changeSelection(1),
            'ArrowUp': () => this.changeSelection(-1),
            'Enter': () => this.selectOption(),
            'Digit7': () => this.handleEditorState()
        };

        this.input.keyboard.on('keydown', (event) => {
            if (!this.keyCooldown && inputs[event.code]) {
                this.keyCooldown = true;
                inputs[event.code]();
                this.time.delayedCall(150, () => this.keyCooldown = false);
            }
        });
    }

    handleInput(key) {
        if (this.keyCooldown) return; 

        this.keyCooldown = true;
        this.time.delayedCall(150, () => { this.keyCooldown = false; });

        // Añadir detección de tecla 7
        if (key === "Digit7") {
            if (!this.scene.get("EditorsState")) {
                console.warn("Escena EditorsState no existe.");
                return;
            }
            this.scene.get("TransitionScene").startTransition("EditorsState");
            return;
        }

        if (key === "ArrowDown") this.changeSelection(1);
        if (key === "ArrowUp") this.changeSelection(-1);
        if (key === "Enter") this.selectOption();
    }

    createAnimations() {
        this.config.menuOptions.forEach(option => {
            ['basic', 'white'].forEach(type => {
                const animKey = `${option.animPrefix}_${type === 'basic' ? 'animation' : 'white'}`;
                
                // Verificar si la animación ya existe
                if (this.anims.exists(animKey)) {
                    return; // Skip if animation already exists
                }

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

        // ====== MUEVE EL BACKGROUND Y EL MENÚ ======
        this.tweens.add({
            targets: this.menuContainer,
            y: -this.selectedIndex * this.scrollSpeed,
            duration: 200,
            ease: 'Power2'
        });

        this.tweens.add({
            targets: this.bg,
            y: -this.selectedIndex * this.bgScrollSpeed,
            duration: 200,
            ease: 'Power2'
        });

        this.updateSelection();
        this.selectSound.play();
    }

    updateSelection() {
        this.menuOptions.forEach((option, index) => {
            if (index === this.selectedIndex) {
                option.play(this.getWhiteAnimationKey(index));

                this.tweens.add({
                    targets: option,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 200,
                    ease: 'Power2'
                });
            } else {
                option.play(this.getAnimationKey(index));

                this.tweens.add({
                    targets: option,
                    scaleX: 0.9,
                    scaleY: 0.9,
                    duration: 200,
                    ease: 'Power2'
                });
            }
        });
    }

    verifyScene(sceneName) {
        const sceneExists = this.scene.get(sceneName);
        if (!sceneExists) {
            console.warn(`Escena "${sceneName}" no existe.`);
            this.cancelSound.play();
            this.cameras.main.shake(200, 0.01);
            return false;
        }
        return true;
    }

    selectOption() {
        if (this.enterCooldown) return;
        this.enterCooldown = true;

        const { selectedIndex, config } = this;
        const selectedOption = this.menuOptions[selectedIndex];
        const selectedScene = config.menuOptions[selectedIndex].targetScene;

        if (!this.verifyScene(selectedScene)) {
            this.tweens.add({
                targets: selectedOption,
                x: selectedOption.x + 10,
                duration: 50,
                yoyo: true,
                repeat: 3,
                onComplete: () => this.enterCooldown = false
            });
            return;
        }

        this.handleValidScene(selectedOption, selectedScene);
    }

    handleInvalidScene(option) {
        console.warn(`Escena "${selectedScene}" no existe.`);
        this.cancelSound.play();
        
        this.tweens.add({
            targets: option,
            x: option.x + 10,
            duration: 50,
            yoyo: true,
            repeat: 3,
            onComplete: () => this.enterCooldown = false
        });

        this.cameras.main.shake(200, 0.01);
    }

    handleValidScene(option, scene) {
        const { blinkDelay, blinkRepeats, transitionDelay } = this.config.transitionConfig;
        
        this.confirmSound.play();
        
        const blinkEvent = this.time.addEvent({
            delay: blinkDelay,
            repeat: blinkRepeats,
            callback: () => option.visible = !option.visible
        });

        this.time.delayedCall(transitionDelay, () => {
            blinkEvent.remove();
            option.visible = true;
            this.scene.get("TransitionScene").startTransition(scene);
            this.enterCooldown = false;
        });
    }

    handleEditorState() {
        if (!this.verifyScene("EditorsState")) return;
        this.scene.get("TransitionScene").startTransition("EditorsState");
    }
}

game.scene.add("MainMenuState", MainMenuState);
