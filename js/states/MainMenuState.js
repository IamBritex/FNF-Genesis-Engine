class MainMenuState extends Phaser.Scene {
    constructor() {
        super({ key: "MainMenuState" });
        this.selectedIndex = 0;
        this.scrollSpeed = 50; 
        this.bgScrollSpeed = 50; 
    }

    preload() {
        console.log("MainMenuState cargado correctamente");

        this.load.image('menuBackground', 'assets/MainMenuState/menuBG.png');

        // ====== LOAD SPRITESHEETS ======
        this.load.atlasXML('menuStoryMode', 'assets/MainMenuState/options/menu_story_mode.png', 'assets/MainMenuState/options/menu_story_mode.xml');
        this.load.atlasXML('menuFreePlay', 'assets/MainMenuState/options/menu_freeplay.png', 'assets/MainMenuState/options/menu_freeplay.xml');
        this.load.atlasXML('menuAwards', 'assets/MainMenuState/options/menu_awards.png', 'assets/MainMenuState/options/menu_awards.xml');
        this.load.atlasXML('menuOptions', 'assets/MainMenuState/options/menu_options.png', 'assets/MainMenuState/options/menu_options.xml');
        this.load.atlasXML('menuMods', 'assets/MainMenuState/options/menu_mods.png', 'assets/MainMenuState/options/menu_mods.xml');
        this.load.atlasXML('menuCredits', 'assets/MainMenuState/options/menu_credits.png', 'assets/MainMenuState/options/menu_credits.xml');

        // ====== LOAD SOUNDS ======
        this.load.audio('selectSound', 'assets/sounds/scrollMenu.ogg');
        this.load.audio('confirmSound', 'assets/sounds/confirmMenu.ogg');
    }

    create() {
        const { width, height } = this.scale;

        // ====== BACKGROUND ======
        this.bg = this.add.image(width / 2, 0, 'menuBackground')
            .setOrigin(0.5, 0)
            .setScale(1.4);

        this.selectSound = this.sound.add('selectSound');
        this.confirmSound = this.sound.add('confirmSound');

        this.createAnimations();

        // ====== OPTIONS CONTAINER ======
        this.menuContainer = this.add.container(0, 0);

        this.menuOptions = [
            this.add.sprite(650, 100, 'menuStoryMode'),
            this.add.sprite(650, 250, 'menuFreePlay'),
            this.add.sprite(650, 400, 'menuAwards'),
            this.add.sprite(650, 550, 'menuOptions'),
            this.add.sprite(650, 700, 'menuMods'),
            this.add.sprite(650, 850, 'menuCredits')
        ];

        this.menuOptions.forEach((option, index) => {
            option.play(this.getAnimationKey(index));
            this.menuContainer.add(option);
        });

        this.updateSelection();

        // ====== INPUT KEYS ======
        this.input.keyboard.on('keydown-DOWN', () => this.changeSelection(1));
        this.input.keyboard.on('keydown-UP', () => this.changeSelection(-1));
        this.input.keyboard.on('keydown-ENTER', () => this.selectOption());
    }

    createAnimations() {
        const keys = [
            { name: 'menuStoryMode', prefix: 'story_mode' },
            { name: 'menuFreePlay', prefix: 'freeplay' },
            { name: 'menuAwards', prefix: 'awards' },
            { name: 'menuOptions', prefix: 'options' },
            { name: 'menuMods', prefix: 'mods' },
            { name: 'menuCredits', prefix: 'credits' }
        ];

        keys.forEach(({ name, prefix }) => {
            this.anims.create({
                key: `${prefix}_animation`,
                frames: this.anims.generateFrameNames(name, {
                    prefix: `${prefix} basic000`,
                    start: 0,
                    end: 8,
                    zeroPad: 1
                }),
                frameRate: 19,
                repeat: -1
            });

            this.anims.create({
                key: `${prefix}_white`,
                frames: this.anims.generateFrameNames(name, {
                    prefix: `${prefix} white000`,
                    start: 0,
                    end: 2,
                    zeroPad: 1
                }),
                frameRate: 20,
                repeat: -1
            });
        });
    }

    getAnimationKey(index) {
        const keys = ['story_mode', 'freeplay', 'awards', 'options', 'mods', 'credits'];
        return `${keys[index]}_animation`;
    }

    getWhiteAnimationKey(index) {
        const keys = ['story_mode', 'freeplay', 'awards', 'options', 'mods', 'credits'];
        return `${keys[index]}_white`;
    }

    changeSelection(direction) {
        const prevIndex = this.selectedIndex;
        const totalOptions = this.menuOptions.length;
        this.selectedIndex = (this.selectedIndex + direction + totalOptions) % totalOptions;
    
        // ====== SCROLL EFFECT IN THE MENU ======
        this.tweens.add({
            targets: this.menuContainer,
            y: -this.selectedIndex * this.scrollSpeed,
            duration: 200,
            ease: 'Power2'
        });
    
        // ====== MOVE THE BACKGROUND ======
        if ((prevIndex === 0 && direction === -1) || (prevIndex === totalOptions - 1 && direction === 1)) {
            this.tweens.add({
                targets: this.bg,
                y: this.selectedIndex === 0 ? 0 : -this.bgScrollSpeed * (totalOptions - 1),
                duration: 200,
                ease: 'Power2'
            });
        } else {
            this.tweens.add({
                targets: this.bg,
                y: this.bg.y - (direction * this.bgScrollSpeed),
                duration: 200,
                ease: 'Power2'
            });
        }
    
        this.updateSelection();
        this.selectSound.play();
    }    

    updateSelection() {
        this.menuOptions.forEach((option, index) => {
            if (index === this.selectedIndex) {
                option.play(this.getWhiteAnimationKey(index));

                // ====== ZOOM IN OPTION SELECTED ======
                this.tweens.add({
                    targets: option,
                    scaleX: 1.2,
                    scaleY: 1.2,
                    duration: 200,
                    ease: 'Power2'
                });
            } else {
                option.play(this.getAnimationKey(index));

                this.tweens.add({
                    targets: option,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 200,
                    ease: 'Power2'
                });
            }
        });
    }

    selectOption() {
        const sceneNames = [
            'StoryModeState',
            'FreeplayState',
            'AwardsState',
            'OptionsState',
            'ModsState',
            'CreditsState'
        ];
    
        console.log("Seleccionaste:", sceneNames[this.selectedIndex]); // <- Ver si llega aquí
    
        const selectedOption = this.menuOptions[this.selectedIndex];
        this.confirmSound.play();
    
        this.time.addEvent({
            delay: 100,
            repeat: 24, 
            callback: () => {
                selectedOption.visible = !selectedOption.visible;
            }
        });
    
        this.time.delayedCall(1700, () => {
            console.log("Cambiando a:", sceneNames[this.selectedIndex]); // <- Ver si intenta cambiar de escena
            this.scene.start(sceneNames[this.selectedIndex]);
        });
    }
}

game.scene.add("MainMenuState", MainMenuState);
