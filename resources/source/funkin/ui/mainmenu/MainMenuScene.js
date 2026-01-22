import { MenuInputHandler } from './MenuInputHandler.js';
import { MenuOptionSprite } from './MenuOptionSprite.js';
import { MainMenuOptions } from './MainMenuOptions.js';
import { MainMenuSelection } from './MainMenuSelection.js';

class MainMenuScene extends Phaser.Scene {
    constructor() {
        super({ key: "MainMenuScene" });
        this.selectedIndex = 0;
        this.menuItems = [];
        this.canInteract = false;
        this.camFollow = null;
        this.flickerTimer = null;

        this.inputHandler = new MenuInputHandler(this);
        this.selectionLogic = new MainMenuSelection(this);
        
        // Variables para control táctil
        this.touchStartY = 0;
        this.isSwiping = false;
    }

    preload() {
        this.load.image('menuBackground', 'public/images/menu/bg/menuBG.png');
        this.load.image('menuFlash', 'public/images/menu/bg/menuBGMagenta.png'); 
        
        this.load.audio('selectSound', 'public/sounds/scrollMenu.ogg');
        this.load.audio('confirmSound', 'public/sounds/confirmMenu.ogg');
        this.load.audio('cancelSound', 'public/sounds/cancelMenu.ogg');
        
        this.load.audio("freakyMenu", "public/assets/audio/sounds/FreakyMenu.mp3");

        MainMenuOptions.preload(this);
    }

    create() {
        if (!this.sound.get('freakyMenu')) {
            this.sound.add('freakyMenu');
        }
        
        const music = this.sound.get('freakyMenu');
        if (music && !music.isPlaying) {
            music.play({ loop: true, volume: 0.7 });
        } else if (music && music.isPlaying) {
            if (music.volume < 0.7) {
                this.tweens.add({
                    targets: music,
                    volume: 0.7,
                    duration: 1000
                });
            }
        }
        
        this.selectSound = this.sound.add('selectSound');
        this.confirmSound = this.sound.add('confirmSound');
        this.cancelSound = this.sound.add('cancelSound');

        const spriteData = MainMenuOptions.getSpriteData(this.game.config.width, this.game.config.height);
        const { width, height } = this.scale;

        // --- Crear Fondo con Zoom Adaptativo (Cover) ---
        const bgData = spriteData.bg;
        const bg = this.add.sprite(bgData.x, bgData.y, 'menuBackground');
        
        /**
         * Lógica de Zoom Adaptativo:
         * 1. Calcula la escala necesaria para cubrir ancho y alto sin deformar (Cover).
         * 2. Elige el mayor valor entre la escala "Cover" y la escala original de bgData.
         * Esto asegura que cubra la pantalla en móviles sin romper la lógica de zoom existente.
         */
        const bgScaleX = width / bg.width;
        const bgScaleY = height / bg.height;
        const bgCoverScale = Math.max(bgScaleX, bgScaleY);
        const finalBgScale = Math.max(bgData.scale, bgCoverScale);

        bg.setScale(finalBgScale).setScrollFactor(bgData.scrollFactor).setDepth(bgData.depth);

        // --- Crear Flash con Zoom Adaptativo (Cover) ---
        const flashData = spriteData.flash;
        this.menuFlash = this.add.sprite(flashData.x, flashData.y, 'menuFlash');
        
        const flashScaleX = width / this.menuFlash.width;
        const flashScaleY = height / this.menuFlash.height;
        const flashCoverScale = Math.max(flashScaleX, flashScaleY);
        const finalFlashScale = Math.max(flashData.scale, flashCoverScale);

        this.menuFlash.setScale(finalFlashScale).setScrollFactor(flashData.scrollFactor).setDepth(flashData.depth);
        this.menuFlash.setVisible(false).setAlpha(1);

        // --- Crear Botones del Menú ---
        this.menuItems = [];
        spriteData.items.forEach((data) => {
            const menuOption = new MenuOptionSprite(this, data);
            this.menuItems.push(menuOption);
        });
        
        const screenCenterX = this.game.config.width / 2;
        
        this.camFollow = new Phaser.GameObjects.Zone(this, screenCenterX, this.menuItems[0].y, 1, 1);
        this.add.existing(this.camFollow);
        this.cameras.main.startFollow(this.camFollow, true, 0.08, 0.08);

        this.inputHandler.initControls();
        this.inputHandler.updateSelection();

        // --- Lógica para Móviles (Touch & Swipe) ---
        if (!this.sys.game.device.os.desktop) {
            this.setupMobileControls();
        }
        
        this.cameras.main.fadeIn(250, 0, 0, 0, (cam, progress) => {
            if (progress === 1) {
                this.canInteract = true;
            }
        });
    }

    // --- IMPORTANTE: Loop Update para detectar Gamepad ---
    update(time, delta) {
        if (this.canInteract && this.inputHandler) {
            this.inputHandler.handleGamepadInput(time, delta);
        }
    }

    setupMobileControls() {
        this.input.on('pointerdown', (pointer) => {
            this.touchStartY = pointer.y;
            this.isSwiping = false;
        });

        this.input.on('pointermove', (pointer) => {
            if (!pointer.isDown || !this.canInteract) return;

            const swipeThreshold = 70; // Reducido de 30 a 10 para ser más sensible
            const diffY = pointer.y - this.touchStartY;

            if (Math.abs(diffY) > swipeThreshold) {
                this.isSwiping = true; 

                if (diffY < 0) {
                    this.selectionLogic.changeSelection(1);
                } else {
                    this.selectionLogic.changeSelection(-1);
                }
                this.touchStartY = pointer.y; // Reset para múltiples swipes
            }
        });

        this.menuItems.forEach((item, index) => {
            item.setInteractive(); 
            
            item.on('pointerup', () => {
                if (!this.isSwiping) {
                    this.selectionLogic.handleTouch(index);
                }
                this.isSwiping = false;
            });
        });
    }

    startExitState(sceneKey) {
        this.canInteract = false;

        this.menuItems.forEach((item, index) => {
            if (index !== this.selectedIndex) {
                this.tweens.add({ targets: item, alpha: 0, duration: 200, ease: 'Cubic.easeOut' });
            }
        });

        if (this.scene.get("TransitionScene")?.startTransition) {
            this.scene.get("TransitionScene").startTransition(sceneKey);
        } else {
            console.warn("TransitionScene no encontrada. Usando fadeOut simple.");
            this.cameras.main.fadeOut(300, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                 if (this.scene.keys[sceneKey]) this.scene.start(sceneKey);
            });
        }
    }

    shutdown() {
        if (this.inputHandler) {
            this.inputHandler.destroy();
            this.inputHandler = null;
        }

        if (this.flickerTimer) {
            this.flickerTimer.remove();
            this.flickerTimer = null;
        }

        this.input.off('pointerdown');
        this.input.off('pointermove');
        if (this.menuItems) {
            this.menuItems.forEach(item => item.off('pointerup'));
        }

        this.menuItems = [];
        this.canInteract = false;
        this.camFollow = null;
        this.selectionLogic = null;
        
        this.selectSound?.stop();
        this.confirmSound?.stop();
        this.cancelSound?.stop();
    }
}

game.scene.add("MainMenuScene", MainMenuScene);