window.AndroidSupport = class AndroidSupport {
    static instance = null;
    static buttonA = null;
    static buttonB = null;
    static buttonUp = null;
    static buttonDown = null;
    static buttonLeft = null;
    static buttonRight = null;
    static isEnabled = false;
    static gameWidth = 0;
    static gameHeight = 0;

    constructor() {
        if (AndroidSupport.instance) {
            throw new Error("Use AndroidSupport.initialize()");
        }
    }

    static initialize(scene) {
        if (!scene?.game?.device?.os?.android) return false;
        
        if (!this.instance) {
            this.instance = new AndroidSupport();
            this.isEnabled = true;
            this.gameWidth = scene.game.config.width;
            this.gameHeight = scene.game.config.height;
            this.createVirtualButtons(scene);
        }
        
        return true;
    }

    static createVirtualButtons(scene) {
        if (!scene) return;

        const buttonConfig = {
            scale: 1.2,
            alpha: 0.6,
            depth: 999,
            scrollFactor: 0
        };

        // Action buttons (right side)
        this.buttonA = this.createButton(scene, {
            x: this.gameWidth - 240,
            y: this.gameHeight - 110,
            texture: 'virtualpad',
            frame: 'a',
            ...buttonConfig
        });

        this.buttonB = this.createButton(scene, {
            x: this.gameWidth - 80,
            y: this.gameHeight - 110,
            texture: 'virtualpad',
            frame: 'b',
            ...buttonConfig
        });

        // Direction buttons (left side)
        const arrowConfig = {
            ...buttonConfig,
            scale: 1
        };

        this.buttonUp = this.createButton(scene, {
            x: 190,
            y: this.gameHeight - 300,
            texture: 'virtualpad',
            frame: 'up',
            ...arrowConfig
        });

        this.buttonDown = this.createButton(scene, {
            x: 190,
            y: this.gameHeight - 80,
            texture: 'virtualpad',
            frame: 'down',
            ...arrowConfig
        });

        this.buttonLeft = this.createButton(scene, {
            x: 70,
            y: this.gameHeight - 190,
            texture: 'virtualpad',
            frame: 'left',
            ...arrowConfig
        });

        this.buttonRight = this.createButton(scene, {
            x: 310,
            y: this.gameHeight - 190,
            texture: 'virtualpad',
            frame: 'right',
            ...arrowConfig
        });

        this.setupButtonEvents();
    }

    static createButton(scene, config) {
        if (!scene || !config) return null;
        
        return scene.add.sprite(config.x, config.y, config.texture, config.frame)
            .setInteractive()
            .setScrollFactor(config.scrollFactor)
            .setDepth(config.depth)
            .setAlpha(config.alpha)
            .setScale(config.scale);
    }

    static setupButtonEvents() {
        this.setupButtonA();
        this.setupButtonB();
        this.setupArrowButtons();
    }

    static setupButtonA() {
        if (!this.buttonA) return;

        this.buttonA.on('pointerdown', () => {
            this.createKeyEvent('Enter', 13, true);
        });
        
        this.buttonA.on('pointerup', () => {
            this.createKeyEvent('Enter', 13, false);
        });
    }

    static setupButtonB() {
        if (!this.buttonB) return;

        this.buttonB.on('pointerdown', () => {
            this.createKeyEvent('Backspace', 8, true);
        });
        
        this.buttonB.on('pointerup', () => {
            this.createKeyEvent('Backspace', 8, false);
        });
    }

    static setupArrowButtons() {
        const arrows = [
            { button: this.buttonUp, key: 'ArrowUp', keyCode: 38 },
            { button: this.buttonDown, key: 'ArrowDown', keyCode: 40 },
            { button: this.buttonLeft, key: 'ArrowLeft', keyCode: 37 },
            { button: this.buttonRight, key: 'ArrowRight', keyCode: 39 }
        ];

        arrows.forEach(({ button, key, keyCode }) => {
            if (!button) return;

            button.on('pointerdown', () => {
                this.createKeyEvent(key, keyCode, true);
            });

            button.on('pointerup', () => {
                this.createKeyEvent(key, keyCode, false);
            });
        });
    }

    static createKeyEvent(key, keyCode, isDown) {
        if (!key || !keyCode) return;
        
        const event = new KeyboardEvent(isDown ? 'keydown' : 'keyup', {
            key: key,
            code: key,
            keyCode: keyCode,
            which: keyCode,
            bubbles: true,
            cancelable: true
        });
        document.dispatchEvent(event);
    }

    static isAndroid() {
        return Boolean(this.isEnabled);
    }

    static destroy() {
        const buttons = [
            'buttonA', 'buttonB',
            'buttonUp', 'buttonDown',
            'buttonLeft', 'buttonRight'
        ];

        buttons.forEach(buttonName => {
            if (this[buttonName]) {
                this[buttonName].removeAllListeners();
                this[buttonName].destroy();
                this[buttonName] = null;
            }
        });

        this.reset();
    }

    static reset() {
        this.isEnabled = false;
        this.instance = null;
        this.gameWidth = 0;
        this.gameHeight = 0;
    }
}

window.hitboxAndroid = class hitboxAndroid {
    static instance = null;
    static hitboxLeft = null;
    static hitboxDown = null;
    static hitboxUp = null;
    static hitboxRight = null;
    static isEnabled = false;
    static gameWidth = 0;
    static gameHeight = 0;
    static currentScene = null;  // Add scene reference

    static initialize(scene) {
        if (!scene?.game?.device?.os?.android) return false;
        
        if (!this.instance) {
            this.instance = new hitboxAndroid();
            this.isEnabled = true;
            this.gameWidth = scene.game.config.width;
            this.gameHeight = scene.game.config.height;
            this.currentScene = scene;  // Store scene reference
            this.createHitboxes(scene);
        }
        
        return true;
    }

    static createHitboxes(scene) {
        if (!scene) return;

        const hitboxConfig = {
            alpha: 0.4,
            depth: 999,
            scrollFactor: 0
        };

        // Create hitboxes for each direction
        this.hitboxLeft = this.createHitbox(scene, {
            x: 0,
            y: 0,
            texture: 'hitbox',
            frame: 'left',
            ...hitboxConfig
        });

        this.hitboxDown = this.createHitbox(scene, {
            x: 320,
            y: 0,
            texture: 'hitbox',
            frame: 'down',
            ...hitboxConfig
        });

        this.hitboxUp = this.createHitbox(scene, {
            x: 640,
            y: 0,
            texture: 'hitbox',
            frame: 'up',
            ...hitboxConfig
        });

        this.hitboxRight = this.createHitbox(scene, {
            x: 960,
            y: 0,
            texture: 'hitbox',
            frame: 'right',
            ...hitboxConfig
        });

        this.setupHitboxEvents();  // No need to pass scene anymore
    }

    static createHitbox(scene, config) {
        if (!scene || !config) return null;
        
        return scene.add.sprite(config.x, config.y, config.texture, config.frame)
            .setOrigin(0, 0)
            .setInteractive()
            .setScrollFactor(config.scrollFactor)
            .setDepth(config.depth)
            .setAlpha(config.alpha);
    }

    static setupHitboxEvents() {
        if (!this.currentScene) return;  // Use stored scene reference

        const hitboxes = [
            { hitbox: this.hitboxUp, key: 'ArrowUp', keyCode: 38 },
            { hitbox: this.hitboxDown, key: 'ArrowDown', keyCode: 40 },
            { hitbox: this.hitboxLeft, key: 'ArrowLeft', keyCode: 37 },
            { hitbox: this.hitboxRight, key: 'ArrowRight', keyCode: 39 }
        ];

        const activeTouches = new Map();

        hitboxes.forEach(({ hitbox, key, keyCode }) => {
            if (!hitbox) return;

            hitbox.on('pointerdown', (pointer) => {
                if (!activeTouches.has(hitbox)) {
                    activeTouches.set(hitbox, new Set());
                }
                activeTouches.get(hitbox).add(pointer.id);
                this.createKeyEvent(key, keyCode, true);
            });

            hitbox.on('pointerup', (pointer) => {
                if (activeTouches.has(hitbox)) {
                    const touches = activeTouches.get(hitbox);
                    if (touches.has(pointer.id)) {
                        touches.delete(pointer.id);
                        if (touches.size === 0) {
                            this.createKeyEvent(key, keyCode, false);
                            activeTouches.delete(hitbox);
                        }
                    }
                }
            });
        });

        // Global pointerup handler
        this.currentScene.input.on('pointerup', (pointer) => {
            activeTouches.forEach((touches, hitbox) => {
                if (touches.has(pointer.id)) {
                    touches.delete(pointer.id);
                    if (touches.size === 0) {
                        const hitboxData = hitboxes.find(h => h.hitbox === hitbox);
                        if (hitboxData) {
                            this.createKeyEvent(hitboxData.key, hitboxData.keyCode, false);
                            activeTouches.delete(hitbox);
                        }
                    }
                }
            });
        });
    }

    static createKeyEvent(key, keyCode, isDown) {
        if (!key || !keyCode) return;
        
        const event = new KeyboardEvent(isDown ? 'keydown' : 'keyup', {
            key: key,
            code: key,
            keyCode: keyCode,
            which: keyCode,
            bubbles: true,
            cancelable: true
        });
        document.dispatchEvent(event);
    }

    static isAndroid() {
        return Boolean(this.isEnabled);
    }

    static destroy() {
        const hitboxes = [
            'hitboxLeft', 'hitboxDown',
            'hitboxUp', 'hitboxRight'
        ];

        hitboxes.forEach(hitboxName => {
            if (this[hitboxName]) {
                this[hitboxName].removeAllListeners();
                this[hitboxName].destroy();
                this[hitboxName] = null;
            }
        });

        this.reset();
    }

    static reset() {
        this.isEnabled = false;
        this.instance = null;
        this.gameWidth = 0;
        this.gameHeight = 0;
        this.currentScene = null;  // Reset scene reference
    }
}