import Alphabet from "../../utils/Alphabet.js";

class CreditsState extends Phaser.Scene {
    constructor() {
        super('CreditsState');
        this.iconJumpTweens = new Map();
        this.currentColor = 0x000000;
        this.targetColor = 0x000000;
        this.isDragging = false;
        this.lastDragPosition = null;
        this.isMobile = this.detectMobile();
        this.creditsData = [];
        this.creditContainer = null;
        this.menuItems = [];
        this.selectableItems = [];
        this.curSelected = 0;
        this.lastSelectedIndex = 0;
    }

    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    preload() {
        this.load.image('bg', 'public/assets/images/menuDesat.png');
        this.load.json('credits', 'public/assets/data/Credits.json');
        this.load.atlas("bold", "public/assets/images/UI/bold.png", "public/assets/images/UI/bold.json");

        this.load.on('filecomplete-json-credits', () => {
            const creditsData = this.cache.json.get('credits')?.credits || [];
            const loadedIcons = new Set();

            creditsData.forEach(category =>
                category.sections.forEach(section =>
                    section.users.forEach(user => {
                        const iconKey = `icon_${user.icon}`;
                        if (!loadedIcons.has(iconKey)) {
                            this.load.image(iconKey, `public/assets/images/states/Credits/${user.icon}.png`);
                            loadedIcons.add(iconKey);
                        }
                    })
                )
            );

            if (!this.load.isLoading()) {
                this.load.start();
            }
        });

        if (this.isMobile) {
            this.load.atlasXML('backButton', 
                'public/assets/images/UI/mobile/backButton.png', 
                'public/assets/images/UI/mobile/backButton.xml'
            );
        }
    }

    create() {
        this.creditsData = this.cache.json.get('credits').credits;
        this.setupBackground();
        this.setupCreditsContainer();
        this.setupInputs();
        
        if (this.isMobile) {
            this.setupMobileControls();
        }
    }

    setupBackground() {
        const { width, height } = this.scale;
        const bg = this.add.image(width / 2, height / 2, 'bg')
            .setOrigin(0.5)
            .setScale(1.1)
            .setDepth(1);

        this.bgRect = this.add.rectangle(0, 0, width, height, 0x000000)
            .setOrigin(0, 0)
            .setDepth(4)
            .setAlpha(0.5);

        this.doChessEffect(bg);
    }

    setupCreditsContainer() {
        if (this.creditContainer) {
            this.creditContainer.destroy(true);
        }

        this.creditContainer = this.add.container(0, 0).setDepth(5);
        this.menuItems = [];
        this.selectableItems = [];
        
        let textX = 128;
        let currentY = 50;

        for (const category of this.creditsData) {
            const categoryText = new Alphabet(this, textX, currentY, category.title, true, 1.2);
            this.creditContainer.add(categoryText);
            this.menuItems.push(categoryText);
            currentY += categoryText.height + 24;

            for (const section of category.sections) {
                const titleText = new Alphabet(this, textX + 40, currentY, section.title, true, 1);
                this.creditContainer.add(titleText);
                this.menuItems.push(titleText);
                currentY += titleText.height + 12;

                for (const user of section.users) {
                    const userContainer = this.add.container(textX, currentY);
                    userContainer.bgColor = user.bgColor;

                    const icon = this.add.image(0, 0, `icon_${user.icon}`)
                        .setOrigin(0, 0)
                        .setDisplaySize(150, 150);

                    const nameText = new Alphabet(this, icon.displayWidth + 10, 0, user.name, true, 0.8);
                    const descText = new Alphabet(this, icon.displayWidth + 10, nameText.height + 4, user.description, false, 0.7);

                    userContainer.add([icon, nameText, descText]);
                    userContainer.link = user.link;

                    this.creditContainer.add(userContainer);
                    this.menuItems.push(userContainer);
                    this.selectableItems.push(userContainer);

                    currentY += userContainer.getBounds().height + 16;
                }
                currentY += 24;
            }
        }

        if (this.selectableItems.length > 0) {
            const firstUser = this.selectableItems[0];
            if (firstUser.bgColor) {
                this.currentColor = Number(firstUser.bgColor.replace('#', '0x'));
                this.bgRect.setFillStyle(this.currentColor);
            }
        }
    }

    setupMobileControls() {
        this.input.on('pointerdown', (pointer) => {
            this.isDragging = true;
            this.lastDragPosition = pointer.y;
        });

        this.input.on('pointermove', (pointer) => {
            if (this.isDragging && this.lastDragPosition) {
                const delta = pointer.y - this.lastDragPosition;
                this.creditContainer.y += delta;

                // Calcular el ítem más cercano al centro
                const centerY = this.scale.height / 2;
                let closestItem = null;
                let closestDistance = Number.MAX_VALUE;

                this.selectableItems.forEach((item, index) => {
                    const distance = Math.abs((item.y + this.creditContainer.y) - centerY);
                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestItem = index;
                    }
                });

                if (closestItem !== null && closestItem !== this.curSelected) {
                    this.curSelected = closestItem;
                }

                this.lastDragPosition = pointer.y;
            }
        });

        this.input.on('pointerup', () => {
            this.isDragging = false;
            this.lastDragPosition = null;
        });

        // Reemplazar la zona de retroceso con el botón animado
        const { width, height } = this.scale;
        
        this.backButton = this.add.sprite(width - 105, height - 75, 'backButton')
            .setScrollFactor(0)
            .setDepth(100)
            .setInteractive()
            .setScale(0.5)
            .setFrame('back0000');
        
        this.backButton.on('pointerdown', () => {
            // Reproducir la animación
            this.sound.play('cancelMenu');
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
            
            // Esperar a que la animación llegue a la mitad antes de cambiar de escena
            this.time.delayedCall(50, () => {
                this.scene.get("TransitionScene").startTransition("MainMenuState");
            });
        });
    }

    setupInputs() {
        // Obtener controles guardados en localStorage con manejo de teclas especiales
        const specialKeys = {
            'ArrowUp': 'UP',
            'ArrowDown': 'DOWN',
            'ArrowLeft': 'LEFT',
            'ArrowRight': 'RIGHT',
            'Enter': 'ENTER',
            'Escape': 'ESCAPE',
            ' ': 'SPACE'
        };

        const controls = {
            up: localStorage.getItem('CONTROLS.UI.UP') || 'UP',
            down: localStorage.getItem('CONTROLS.UI.DOWN') || 'DOWN',
            back: localStorage.getItem('CONTROLS.UI.BACK') || 'ESCAPE'
        };

        this.input.keyboard.removeAllListeners();

        this.input.keyboard.on('keydown', (event) => {
            if (this.isDragging) return;

            // Normalizar la tecla presionada
            let pressedKey = event.key;
            
            // Convertir teclas especiales
            if (specialKeys[pressedKey]) {
                pressedKey = specialKeys[pressedKey];
            } else {
                pressedKey = pressedKey.toUpperCase();
            }

            // Comprobar contra los controles guardados
            if (pressedKey === controls.up || pressedKey === 'UP') {
                this.changeSelection(-1);
            } else if (pressedKey === controls.down || pressedKey === 'DOWN') {
                this.changeSelection(1);
            } else if (pressedKey === controls.back || pressedKey === 'ESCAPE' || pressedKey === 'BACKSPACE') {
                this.scene.get("TransitionScene").startTransition("MainMenuState");
            }
        });
    }

    changeSelection(change) {
        if (this.selectableItems.length === 0) return;

        let newSelected = this.curSelected + change;
        
        // Implementación de selección circular
        if (newSelected < 0) {
            // Si estamos en el primer elemento y vamos hacia arriba, ir al último
            newSelected = this.selectableItems.length - 1;
        } else if (newSelected >= this.selectableItems.length) {
            // Si estamos en el último elemento y vamos hacia abajo, ir al primero
            newSelected = 0;
        }
        
        this.curSelected = newSelected;
        this.lastSelectedIndex = this.curSelected;
    }

    update() {
        if (!this.isDragging) {
            this.updateSelectionPosition();
        }
        this.updateColors();
    }

    updateSelectionPosition() {
        const centerY = this.scale.height / 2;
        const selectedItem = this.selectableItems[this.curSelected];

        if (!selectedItem || this.menuItems.length === 0) return;

        // Actualizar posición del contenedor para centrar el elemento seleccionado
        const targetY = centerY - (selectedItem.y + selectedItem.height / 2);
        this.creditContainer.y = Phaser.Math.Linear(this.creditContainer.y, targetY, 0.1);

        // Actualizar opacidad de los elementos
        this.selectableItems.forEach((item, index) => {
            const isSelected = index === this.curSelected;
            item.list.forEach(child => {
                if (child.setAlpha) {
                    child.setAlpha(isSelected ? 1 : 0.6);
                }
            });
        });
    }

    updateColors() {
        const selectedItem = this.selectableItems[this.curSelected];
        if (!selectedItem?.bgColor) return;

        this.targetColor = Number(selectedItem.bgColor.replace('#', '0x'));
        
        const currentRGB = {
            r: (this.currentColor >> 16) & 0xFF,
            g: (this.currentColor >> 8) & 0xFF,
            b: this.currentColor & 0xFF
        };

        const targetRGB = {
            r: (this.targetColor >> 16) & 0xFF,
            g: (this.targetColor >> 8) & 0xFF,
            b: this.targetColor & 0xFF
        };

        const lerpFactor = 0.1;
        const newRGB = {
            r: Math.round(Phaser.Math.Linear(currentRGB.r, targetRGB.r, lerpFactor)),
            g: Math.round(Phaser.Math.Linear(currentRGB.g, targetRGB.g, lerpFactor)),
            b: Math.round(Phaser.Math.Linear(currentRGB.b, targetRGB.b, lerpFactor))
        };

        this.currentColor = (newRGB.r << 16) | (newRGB.g << 8) | newRGB.b;
        this.bgRect.setFillStyle(this.currentColor);
    }

    doChessEffect(image) {
        const frag = `
            precision mediump float;
            uniform vec2 resolution;
            uniform sampler2D iChannel0;
            uniform float time;
            void main () {
                float SPEED = -50.0;
                float ZOOM = 0.6;
                float offset = time * SPEED / 100.0;
                vec2 position = vec2(gl_FragCoord.x / ZOOM / 100.0 + offset, (resolution.y - gl_FragCoord.y) / ZOOM / 100.0 + offset);
                vec2 uv = gl_FragCoord.xy / resolution.xy;
                uv.y = 1.0 - uv.y;
                vec4 color = texture2D(iChannel0, uv);
                if (mod(floor(position.x) + floor(position.y), 2.0) == 1.0) {
                    color.rgb *= 1.25; 
                }
                gl_FragColor = color;
            }
        `;

        const base = new Phaser.Display.BaseShader('simpleTexture', frag);
        const shader = this.add.shader(base, image.width / 2, image.height / 2, image.width, image.height, [])
            .setDepth(3);
    }

    shutdown() {
        this.input.keyboard.removeAllListeners();
        this.input.removeAllListeners();
        if (this.creditContainer) {
            this.creditContainer.destroy(true);
        }
    }
}

game.scene.add('CreditsState', CreditsState);