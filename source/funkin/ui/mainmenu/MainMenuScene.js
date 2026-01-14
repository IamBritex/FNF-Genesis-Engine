import { MenuInputHandler } from './MenuInputHandler.js';
import { MenuOptionSprite } from './MenuOptionSprite.js';
import { MainMenuOptions } from './MainMenuOptions.js';

class MainMenuScene extends Phaser.Scene {
    constructor() {
        super({ key: "MainMenuScene" });
        this.selectedIndex = 0;
        this.menuItems = [];
        this.canInteract = false;
        this.camFollow = null;
        this.flickerTimer = null;

        this.inputHandler = new MenuInputHandler(this);
    }

    preload() {
        this.load.image('menuBackground', 'public/images/menu/bg/menuBG.png');
        this.load.image('menuFlash', 'public/images/menu/bg/menuBGMagenta.png'); 
        
        this.load.audio('selectSound', 'public/sounds/scrollMenu.ogg');
        this.load.audio('confirmSound', 'public/sounds/confirmMenu.ogg');
        this.load.audio('cancelSound', 'public/sounds/cancelMenu.ogg');
        
        this.load.audio("freakyMenu", "public/assets/audio/sounds/FreakyMenu.mp3");

        // Carga modularizada de las opciones
        MainMenuOptions.preload(this);
    }

    create() {
        // [MODIFICADO] Código de Discord eliminado según instrucciones.
        
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

        // Obtener datos desde MainMenuOptions
        const spriteData = MainMenuOptions.getSpriteData(this.game.config.width, this.game.config.height);

        // --- Crear Fondo ---
        const bgData = spriteData.bg;
        const bg = this.add.sprite(bgData.x, bgData.y, 'menuBackground');
        bg.setScale(bgData.scale).setScrollFactor(bgData.scrollFactor).setDepth(bgData.depth);

        // --- Crear Flash ---
        const flashData = spriteData.flash;
        this.menuFlash = this.add.sprite(flashData.x, flashData.y, 'menuFlash');
        this.menuFlash.setScale(flashData.scale).setScrollFactor(flashData.scrollFactor).setDepth(flashData.depth);
        this.menuFlash.setVisible(false).setAlpha(1);

        // --- Crear Botones del Menú usando el átomo MenuOption ---
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
        
        this.cameras.main.fadeIn(250, 0, 0, 0, (cam, progress) => {
            if (progress === 1) {
                this.canInteract = true;
            }
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

        this.menuItems = [];
        this.canInteract = false;
        this.camFollow = null;
        this.selectSound?.stop();
        this.confirmSound?.stop();
        this.cancelSound?.stop();
    }
}

game.scene.add("MainMenuScene", MainMenuScene);