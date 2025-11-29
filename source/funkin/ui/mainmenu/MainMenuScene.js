import { MenuInputHandler } from './MenuInputHandler.js';

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

    init() {
        this.defineSpriteData();
    }

    defineSpriteData() {
        const frameRate = 24;
        const spacing = 160;
        const startY = this.game.config.height / 2 - (spacing * (5 - 1)) / 2;
        const centerX = this.game.config.width / 2;
        const itemX = centerX + 35; 
        const bgScrollFactor = 0.10; 

        this.spriteData = {
            bg: { x: centerX, y: this.game.config.height / 2, scale: 1.2, scrollFactor: bgScrollFactor, depth: 1 },
            flash: { x: centerX, y: this.game.config.height / 2, scale: 1.2, scrollFactor: bgScrollFactor, depth: 2 },
            items: [
                {
                    id: 'storymode', texture: 'storymode', scene: 'StoryModeScene',
                    x: itemX, y: startY, origin: { x: 0.5, y: 0.5 }, depth: 10, scrollFactor: { x: 1, y: 0.4 },
                    animations: [
                        { name: 'storymode idle', anim: 'idle', fps: frameRate, loop: true, indices: [0,1,2,3,4,5,6,7,8] },
                        { name: 'storymode selected', anim: 'selected', fps: frameRate, loop: true, indices: [0,1,2] }
                    ]
                },
                {
                    id: 'freeplay', texture: 'freeplay', scene: 'FreeplayScene',
                    x: itemX, y: startY + spacing, origin: { x: 0.5, y: 0.5 }, depth: 10, scrollFactor: { x: 1, y: 0.4 },
                    animations: [
                        { name: 'freeplay idle', anim: 'idle', fps: frameRate, loop: true },
                        { name: 'freeplay selected', anim: 'selected', fps: frameRate, loop: true }
                    ]
                },
                {
                    id: 'multiplayer', texture: 'multiplayer', scene: 'RoomsScene',
                    x: itemX, y: startY + (spacing * 2), origin: { x: 0.5, y: 0.5 }, depth: 10, scrollFactor: { x: 1, y: 0.4 },
                    animations: [
                        { name: 'multiplayer basic', anim: 'idle', fps: frameRate, loop: true },
                        { name: 'multiplayer white', anim: 'selected', fps: frameRate, loop: true }
                    ]
                },
                {
                    id: 'options', texture: 'options', scene: 'OptionsScene',
                    x: itemX, y: startY + (spacing * 3), origin: { x: 0.5, y: 0.5 }, depth: 10, scrollFactor: { x: 1, y: 0.4 },
                    animations: [
                        { name: 'options idle', anim: 'idle', fps: frameRate, loop: true },
                        { name: 'options selected', anim: 'selected', fps: frameRate, loop: true }
                    ]
                },
                {
                    id: 'credits', texture: 'credits', scene: 'CreditsScene',
                    x: itemX, y: startY + (spacing * 4), origin: { x: 0.5, y: 0.5 }, depth: 10, scrollFactor: { x: 1, y: 0.4 },
                    animations: [
                        { name: 'credits idle', anim: 'idle', fps: frameRate, loop: true },
                        { name: 'credits selected', anim: 'selected', fps: frameRate, loop: true }
                    ]
                }
            ]
        };
    }

    preload() {
        this.load.image('menuBackground', 'public/images/menu/bg/menuBG.png');
        this.load.image('menuFlash', 'public/images/menu/bg/menuBGMagenta.png'); 
        
        this.load.audio('selectSound', 'public/sounds/scrollMenu.ogg');
        this.load.audio('confirmSound', 'public/sounds/confirmMenu.ogg');
        this.load.audio('cancelSound', 'public/sounds/cancelMenu.ogg');
        
        // Asegurar que la música del menú esté cargada por si venimos de un editor
        this.load.audio("freakyMenu", "public/assets/audio/sounds/FreakyMenu.mp3");

        const path = 'public/images/menu/mainmenu/';
        this.load.atlasXML('storymode', `${path}storymode.png`, `${path}storymode.xml`);
        this.load.atlasXML('freeplay', `${path}freeplay.png`, `${path}freeplay.xml`);
        this.load.atlasXML('options', `${path}options.png`, `${path}options.xml`);
        this.load.atlasXML('multiplayer', `${path}multiplayer.png`, `${path}multiplayer.xml`);
        this.load.atlasXML('credits', `${path}credits.png`, `${path}credits.xml`);
    }

    async create() {
        if (window.Genesis && window.Genesis.discord) {
            Genesis.discord.setActivity({
                details: "Menu in Friday Night Funkin'", 
                state: "Main Menu"
            });
        }
        
        // Lógica de Música: Si no está sonando FreakyMenu, reproducirla
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
        
        AssetsDriver.setScene(this);

        this.selectSound = this.sound.add('selectSound');
        this.confirmSound = this.sound.add('confirmSound');
        this.cancelSound = this.sound.add('cancelSound');

        // Crear assets
        const bg = await AssetsDriver.createSpriteFromData('menuBG', this.spriteData.bg, 'menuBackground');
        bg.setScrollFactor(this.spriteData.bg.scrollFactor); 

        this.menuFlash = await AssetsDriver.createSpriteFromData('menuFlash', this.spriteData.flash, 'menuFlash');
        this.menuFlash.setScrollFactor(this.spriteData.flash.scrollFactor);
        this.menuFlash.setVisible(false).setAlpha(1);

        // Crear items
        this.menuItems = [];
        const itemPromises = this.spriteData.items.map(async (data) => {
            const sprite = await AssetsDriver.createSpriteFromData(data.id, data, data.texture);
            sprite.targetScene = data.scene;
            sprite.setScrollFactor(data.scrollFactor.x, data.scrollFactor.y);
            
            sprite.setOrigin(0.5, 0.5);

            sprite.x = data.x + (sprite.width / 2);
            sprite.y = data.y + (sprite.height / 2);

            return sprite;
        });
        
        this.menuItems = await Promise.all(itemPromises);

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