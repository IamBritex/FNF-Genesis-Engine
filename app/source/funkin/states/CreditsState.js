class CreditsState extends Phaser.Scene {
    constructor() {
        super('CreditsState');
        this.iconJumpTweens = new Map();
        this.currentColor = 0x000000;
        this.targetColor = 0x000000;
    }

    creditsData = [];
    creditContainer;
    menuItems = [];
    selectableItems = [];
    curSelected = 0;

    preload() {
        this.load.image('bg', 'public/assets/images/menuDesat.png');
        this.load.json('credits', 'public/assets/data/Credits.json');
        
        this.load.on('filecomplete-json-credits', () => {
            const creditsData = this.cache.json.get('credits')?.credits || [];
            
            const loadedIcons = new Set();
            creditsData.forEach(category => 
                category.sections.forEach(section =>
                    section.users.forEach(user => {
                        const iconKey = `icon_${user.icon}`;
                        if (!loadedIcons.has(iconKey)) {
                            this.load.image(iconKey, 
                                `public/assets/images/states/Credits/${user.icon}.png`
                            );
                            loadedIcons.add(iconKey);
                        }
                    })
                )
            );
            
            // Iniciamos la carga de los iconos
            if (!this.load.isLoading()) {
                this.load.start();
            }
        });
    }

    // Método para formatear nombres de teclas igual que en OptionsState
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

        this.input.keyboard.removeAllListeners('keydown');
        this.input.keyboard.on('keydown', (event) => {
            const pressed = this.formatKeyName(event.key, event.code);

            if (pressed === controls.up) {
                this.curSelected = (this.curSelected - 1 + this.selectableItems.length) % this.selectableItems.length;
            } else if (pressed === controls.down) {
                this.curSelected = (this.curSelected + 1) % this.selectableItems.length;
            } else if (pressed === controls.accept) {
                const selected = this.selectableItems[this.curSelected];
                if (selected?.link) window.open(selected.link, '_blank');
            } else if (pressed === controls.back || pressed === "BACKSPACE") {
                this.scene.get("TransitionScene").startTransition("MainMenuState");
            }
        });

        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
            if (deltaY > 0) {
                this.curSelected = (this.curSelected + 1) % this.selectableItems.length;
            } else if (deltaY < 0) {
                this.curSelected = (this.curSelected - 1 + this.selectableItems.length) % this.selectableItems.length;
            }
        });
    }

    create() {
        this.creditsData = [];
        this.menuItems = [];
        this.selectableItems = [];
        this.curSelected = 0;
        
        this.creditsData = this.cache.json.get('credits').credits;
        
        this.setupCreditsDisplay();
        this.setupInputs(); // <-- Agrega esto para usar controles personalizados
    }

    setupCreditsDisplay() {
        const { width, height } = this.scale;

        if (this.creditContainer) this.creditContainer.destroy(true);
        this.menuItems = [];
        this.selectableItems = [];

        const bg = this.add.image(width / 2, height / 2, 'bg')
            .setOrigin(0.5)
            .setScale(1.1)
            .setDepth(1);

        this.bgRect = this.add.rectangle(0, 0, width, height, 0x000000)
            .setOrigin(0, 0)
            .setDepth(4)
            .setAlpha(0.5);

        this.doChessEffect(bg);

        this.creditContainer = this.add.container(0, 0)
            .setDepth(5);

        let textX = 128;
        let currentY = 50;

        for (const category of this.creditsData) {
            const categoryText = this.add.text(textX, currentY, category.title.toUpperCase(), {
                fontSize: '120px',
                color: '#000',
                fontFamily: 'FNF',
                fontStyle: 'bold'
            }).setOrigin(0, 0);

            this.creditContainer.add(categoryText);
            this.menuItems.push(categoryText);
            currentY += categoryText.height + 24;

            for (const section of category.sections) {
                const titleText = this.add.text(textX + 40, currentY, section.title.toUpperCase(), {
                    fontSize: '80px',
                    color: '#222',
                    fontFamily: 'FNF',
                    fontStyle: 'bold'
                }).setOrigin(0, 0);

                this.creditContainer.add(titleText);
                this.menuItems.push(titleText);
                currentY += titleText.height + 12;

                for (const user of section.users) {
                    const userContainer = this.add.container(textX, currentY);
                    userContainer.bgColor = user.bgColor;

                    const icon = this.add.image(0, 0, `icon_${user.icon}`, 0)
                        .setOrigin(0, 0)
                        .setDisplaySize(150, 150);

                    const nameText = this.add.text(icon.displayWidth + 10, 0, user.name.toUpperCase(), {
                        fontSize: '50px',
                        color: '#000',
                        fontFamily: 'FNF',
                        fontStyle: 'bold'
                    }).setOrigin(0, 0);

                    const descText = this.add.text(icon.displayWidth + 10, nameText.height + 4, user.description.toUpperCase(), {
                        fontSize: '45px',
                        color: '#555',
                        fontFamily: 'FNF'
                    }).setOrigin(0, 0);

                    userContainer.add([icon, nameText, descText]);
                    userContainer.link = user.link;

                    this.creditContainer.add(userContainer);
                    this.menuItems.push(userContainer);
                    this.selectableItems.push(userContainer);

                    const bounds = userContainer.getBounds();
                    currentY += bounds.height + 16;
                }

                currentY += 24;
            }
        }

        this.input.keyboard.on('keydown-UP', () => {
            this.curSelected = (this.curSelected - 1 + this.selectableItems.length) % this.selectableItems.length;
        });

        this.input.keyboard.on('keydown-DOWN', () => {
            this.curSelected = (this.curSelected + 1) % this.selectableItems.length;
        });

        this.input.keyboard.on('keydown-ENTER', () => {
            const selected = this.selectableItems[this.curSelected];
            if (selected?.link) window.open(selected.link, '_blank');
        });

        this.input.keyboard.on('keydown-ESC', () => {
            this.scene.get("TransitionScene").startTransition("MainMenuState");
        });

        this.input.keyboard.on('keydown-BACKSPACE', () => {
            this.scene.get("TransitionScene").startTransition("MainMenuState");
        });

        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
            if (deltaY > 0) {
                this.curSelected = (this.curSelected + 1) % this.selectableItems.length;
            } else if (deltaY < 0) {
                this.curSelected = (this.curSelected - 1 + this.selectableItems.length) % this.selectableItems.length;
            }
        });

        if (this.selectableItems.length > 0) {
            const firstUser = this.selectableItems[0];
            if (firstUser.bgColor) {
                this.currentColor = Number(firstUser.bgColor.replace('#', '0x'));
                this.bgRect.setFillStyle(this.currentColor);
            }
        }
    }

    update() {
        this.updateTextPositions();
    }

    updateTextPositions() {
        const centerY = this.scale.height / 2;
        const selectedItem = this.selectableItems[this.curSelected];
        
        if (!selectedItem || this.menuItems.length === 0) return;
        
        if (selectedItem.bgColor) {
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
            
            // Combinar los componentes en un solo color
            this.currentColor = (newRGB.r << 16) | (newRGB.g << 8) | newRGB.b;
            this.bgRect.setFillStyle(this.currentColor);
        }

        const selIndex = this.menuItems.indexOf(selectedItem);
        const targetYs = new Array(this.menuItems.length);
        targetYs[selIndex] = centerY - selectedItem.getBounds().height / 2;

        for (let i = selIndex - 1; i >= 0; i--) {
            const next = this.menuItems[i + 1];
            const curr = this.menuItems[i];
            const nextH = next.getBounds().height;
            const currH = curr.getBounds().height;
            targetYs[i] = targetYs[i + 1] - (currH + 20);
        }

        for (let i = selIndex + 1; i < this.menuItems.length; i++) {
            const prev = this.menuItems[i - 1];
            const curr = this.menuItems[i];
            const prevH = prev.getBounds().height;
            const currH = curr.getBounds().height;
            targetYs[i] = targetYs[i - 1] + (prevH + 20);
        }

        for (let i = 0; i < this.menuItems.length; i++) {
            const item = this.menuItems[i];
            item.y = Phaser.Math.Linear(item.y, targetYs[i], 0.05);

            if (this.selectableItems.includes(item)) {
                const isSelected = item === selectedItem;
                const icon = item.list[0];

                for (let child of item.list) {
                    if (child.setColor) {
                        child.setColor('#fff');
                        child.setAlpha(isSelected ? 1 : 0.6);
                    }
                }
            }
        }
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
}

game.scene.add('CreditsState', CreditsState);