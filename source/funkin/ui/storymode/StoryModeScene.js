import { StoryMenuHandler } from './StoryMenuHandler.js';
import { PlayScene } from '../../play/PlayScene.js';
import ModHandler from '../../../core/ModHandler.js';

class StoryModeScene extends Phaser.Scene {
    constructor() {
        super({ key: "StoryModeScene" });
        this.weeks = {};
        this.weekKeys = [];
        this.selectedWeekIndex = 0;
        this.difficulties = ["easy", "normal", "hard"];
        this.selectedDifficulty = 1;
        this.characters = [];
        this.characterCache = {};
        this.canPressEnter = true;

        this.handler = null;
        
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.minSwipeDistance = 30;
    }

    preload() {
        console.log("StoryModeState preload started");

        this.load.text('weekList', 'public/data/ui/weeks.txt');
        this.load.image('tracksLabel', 'public/images/menu/storymode/Menu_Tracks.png');
        this.load.audio('scrollSound', 'public/sounds/scrollMenu.ogg');
        this.load.audio('confirmSound', 'public/sounds/confirmMenu.ogg');
        this.load.audio('cancelSound', 'public/sounds/cancelMenu.ogg');
        this.load.audio("freakyMenu", "public/sounds/FreakyMenu.mp3");

        // --- Cargar fuente VCR ---
        this.load.font('VCR', 'public/fonts/vcr.ttf');

        const difficulties = ['easy', 'normal', 'hard'];
        difficulties.forEach(diff => {
            this.load.image(diff, `public/images/menu/storymode/difficults/${diff}.png`);
        });

        this.load.atlasXML(
            'storymenu/arrows',
            'public/images/menu/storymode/arrows.png',
            'public/images/menu/storymode/arrows.xml'
        );

        this.load.once('complete', () => {
            console.log("Preload base completo. Iniciando carga de semanas...");
            this.loadWeekData();
        });
    }

    async loadWeekData() {
        const weekList = [];
        const loadPromises = [];

        const combinedWeeks = await ModHandler.getCombinedWeekList(this.cache);

        console.log("Lista maestra de semanas:", combinedWeeks);

        combinedWeeks.forEach(weekName => loadPromises.push(this._loadSingleWeek(weekName)));

        try {
            const results = await Promise.allSettled(loadPromises);
            results.forEach((result) => {
                if (result.status === 'fulfilled' && result.value) {
                    weekList.push(result.value);
                }
            });
            this.processWeeks(weekList);
        } catch (error) {
            console.error('Error cargando datos de semanas:', error);
            this.processWeeks(weekList);
        }
    }

    async _loadSingleWeek(weekName) {
        try {
            const weekPath = await ModHandler.getPath('data', `weeks/${weekName}.json`);

            const response = await fetch(weekPath);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const week = await response.json();

            this.cache.json.add(weekName, week);
            return weekName;
        } catch (error) {
            console.warn(`Error cargando semana ${weekName}:`, error);
            return null;
        }
    }

    create() {
        if (window.Genesis && window.Genesis.discord) {
            Genesis.discord.setActivity({
                details: "Menu in Friday Night Funkin'",
                state: "Story Menu"
            });
        }

        if (!this.sound.get('freakyMenu')) this.sound.add('freakyMenu');
        const menuMusic = this.sound.get('freakyMenu');
        if (menuMusic && !menuMusic.isPlaying) menuMusic.play({ loop: true, volume: 0.7 });

        this.canPressEnter = true;
        this.keyState = {};
        this.registry.remove('selectedWeekIndex');

        this.add.rectangle(this.scale.width / 2, 0, this.scale.width, 56, 0x000000)
            .setOrigin(0.5, 0).setDepth(500);

        this.events.on('wake', () => {
            this.canPressEnter = true;
            this.keyState = {};
            if (this.handler) { this.handler.setupInputs(); }
        });

        this.input.on('pointerdown', (pointer) => {
            this.touchStartX = pointer.x;
            this.touchStartY = pointer.y;
        });

        this.input.on('pointerup', (pointer) => {
            if (!this.handler) return;

            const diffX = pointer.x - this.touchStartX;
            const diffY = pointer.y - this.touchStartY;
            const absX = Math.abs(diffX);
            const absY = Math.abs(diffY);

            if (absX > absY && absX > this.minSwipeDistance) {
                this.selectSound?.play();
                if (diffX < 0) this.handler.changeDifficulty(1); 
                else this.handler.changeDifficulty(-1);
            } 
            else if (absY > absX && absY > this.minSwipeDistance) {
                this.selectSound?.play();
                if (diffY < 0) this.handler.changeWeek(1);
                else this.handler.changeWeek(-1);
            }
        });
    }
    
    update(time, delta) {
        if (this.handler && this.handler.handleGamepadInput && this.canPressEnter) {
            this.handler.handleGamepadInput(time, delta);
        }
    }

    async processWeeks(weekList) {
        this.selectedWeekIndex = 0;
        this.weeks = {};

        const visibleWeeks = weekList.filter(week => {
            const weekData = this.cache.json.get(week);
            return weekData && (weekData.StoryVisible !== false);
        });

        for (const week of visibleWeeks) {
            const weekData = this.cache.json.get(week);
            if (!weekData) continue;
            if (!weekData.weekCharacters) weekData.weekCharacters = ["", "bf", "gf"];

            this.weeks[week] = {
                bg: weekData.weekBackground,
                tracks: weekData.tracks,
                phrase: weekData.phrase,
                weekName: weekData.weekName,
                weekCharacters: weekData.weekCharacters,
                StoryVisible: weekData.StoryVisible !== false,
            };
        }

        this.weekKeys = Object.keys(this.weeks);

        if (this.weekKeys.length > 0) {
            try {
                await this._loadInitialAssets();
                this.initializeScene();
            } catch (error) {
                console.error("Error loading initial assets:", error);
                this.scene.start("MainMenuScene");
            }
        } else {
            console.warn("No visible weeks found.");
            this.scene.start("MainMenuScene");
        }
    }

    async _loadInitialAssets() {
        const assetsToLoad = new Map();
        const loadPromises = [];

        for (const weekKey of this.weekKeys) {
            const weekData = this.cache.json.get(weekKey);
            if (weekData && weekData.weekName) {
                const titleKey = `${weekData.weekName}Title`;
                if (!this.textures.exists(titleKey)) {
                    const path = await ModHandler.getPath('images', `menu/storymode/titles/${weekData.weekName}.png`);
                    assetsToLoad.set(`title_${titleKey}`, { key: titleKey, path: path });
                }
            }
        }

        if (assetsToLoad.size > 0) {
            assetsToLoad.forEach(asset => {
                this.load.image(asset.key, asset.path);
            });
            loadPromises.push(new Promise(resolve => this.load.once('complete', resolve)));
            if (!this.load.isLoading()) this.load.start();
        }

        await this._loadCharactersForWeek(this.selectedWeekIndex);
        if (loadPromises.length > 0) await Promise.all(loadPromises);
    }

    async _loadCharactersForWeek(weekIndex) {
        const weekKey = this.weekKeys[weekIndex];
        const weekData = this.cache.json.get(weekKey);
        if (!weekData || !weekData.weekCharacters) return;

        const charactersToLoad = [];
        let needsLoadStart = false;

        for (const characterName of weekData.weekCharacters) {
            if (!characterName || this.characterCache[characterName]) continue;

            const needsAtlas = !this.textures.exists(characterName);
            const needsJson = !this.cache.json.exists(`${characterName}Data`);

            if (needsAtlas || needsJson) {
                charactersToLoad.push(characterName);

                const pngPath = await ModHandler.getPath('images', `menu/storymode/menucharacters/Menu_${characterName}.png`);
                const xmlPath = await ModHandler.getPath('images', `menu/storymode/menucharacters/Menu_${characterName}.xml`);
                const jsonPath = await ModHandler.getPath('images', `menu/storymode/menucharacters/${characterName}.json`);

                if (needsAtlas) {
                    this.load.atlasXML(characterName, pngPath, xmlPath);
                    needsLoadStart = true;
                }
                if (needsJson) {
                    this.load.json(`${characterName}Data`, jsonPath);
                    needsLoadStart = true;
                }
            }
        }

        if (charactersToLoad.length > 0) {
            const loadPromise = new Promise((resolve) => {
                const onComplete = () => {
                    charactersToLoad.forEach(char => this.characterCache[char] = true);
                    resolve();
                };
                this.load.once('complete', onComplete);
                if (needsLoadStart && !this.load.isLoading()) this.load.start();
                else if (!needsLoadStart) onComplete();
            });
            await loadPromise;
        }
    }

    initializeScene() {
        const { width } = this.scale;
        this.selectSound = this.sound.add('scrollSound');
        this.confirmSound = this.sound.add('confirmSound');
        this.cancelSound = this.sound.add('cancelSound');

        const yellowColorHex = 0xF9CF51;
        this.weekBackground = this.add.rectangle(width / 2, 56 + 200, width, 400, yellowColorHex)
            .setOrigin(0.5, 0.5).setDepth(100);

        const firstWeek = this.weeks[this.weekKeys[this.selectedWeekIndex]];

        this.scoreText = this.add.text(20, 10, "HIGH SCORE: 0", { fontFamily: 'VCR', fontSize: '32px', color: '#FFFFFF' }).setDepth(1000);
        this.levelTitleText = this.add.text(width - 20, 10, firstWeek.weekName.toUpperCase(), { fontFamily: 'VCR', fontSize: '32px', color: '#FFFFFF', align: 'right' }).setOrigin(1, 0).setAlpha(0.7).setDepth(1000);

        this.weekTitlesContainer = this.add.container(width / 2, 0);
        this.weekTitlesContainer.setDepth(15);

        this.weekKeys.forEach((weekKey, index) => {
            const weekData = this.weeks[weekKey];
            const titleKey = `${weekData.weekName}Title`;
            let item;

            if (this.textures.exists(titleKey)) {
                item = this.add.image(0, 0, titleKey).setOrigin(0.5, 0.5).setAlpha(0.6);
                item.setData('isFlashing', false);
            } else {
                item = this.add.text(0, 0, weekData.weekName || 'MISSING', { fontSize: '40px', color: '#ff0000' }).setOrigin(0.5, 0.5).setAlpha(0.6);
            }
            
            item.setInteractive();
            item.on('pointerup', () => {
                if (!this.handler) return;
                
                const distance = Phaser.Math.Distance.Between(
                    this.input.activePointer.downX, this.input.activePointer.downY,
                    this.input.activePointer.upX, this.input.activePointer.upY
                );

                if (distance > this.minSwipeDistance) return;

                if (this.selectedWeekIndex === index) {
                    this.handler.handleConfirm();
                }
            });

            this.weekTitlesContainer.add(item);
        });

        const diffY = 520;
        const diffImgY = 535;
        const diffScale = 0.9;

        this.leftDifficultyArrow = this.add.sprite(width - 410, diffY, 'storymenu/arrows').setInteractive().setDepth(1000).setScale(diffScale);
        this.rightDifficultyArrow = this.add.sprite(width - 35, diffY, 'storymenu/arrows').setInteractive().setDepth(1000).setScale(diffScale);

        if (!this.anims.exists('leftIdle')) {
            this.anims.create({ key: 'leftIdle', frames: this.anims.generateFrameNames('storymenu/arrows', { prefix: 'leftIdle', end: 0, zeroPad: 4 }), });
            this.anims.create({ key: 'leftConfirm', frames: this.anims.generateFrameNames('storymenu/arrows', { prefix: 'leftConfirm', end: 0, zeroPad: 4 }), });
            this.anims.create({ key: 'rightIdle', frames: this.anims.generateFrameNames('storymenu/arrows', { prefix: 'rightIdle', end: 0, zeroPad: 4 }), });
            this.anims.create({ key: 'rightConfirm', frames: this.anims.generateFrameNames('storymenu/arrows', { prefix: 'rightConfirm', end: 0, zeroPad: 4 }), });
        }

        this.leftDifficultyArrow.play('leftIdle');
        this.rightDifficultyArrow.play('rightIdle');

        this.difficultyImage = this.add.image(width - 222, diffImgY, this.difficulties[this.selectedDifficulty]).setOrigin(0.5, 0.5).setDepth(1000).setScale(diffScale);

        this.trackLabel = this.add.image(width * 0.05, 56 + 400 + 100, 'tracksLabel').setOrigin(0.5, 0.5);
        this.trackTexts = [];

        this.handler = new StoryMenuHandler(this);
        this.handler.loadCharacters();
        this.handler.setupInputs();
        this.handler.repositionTitles();
        this.handler.updateTracks();

        const firstTitle = this.weekTitlesContainer.list[this.selectedWeekIndex];
        if (firstTitle) firstTitle.setAlpha(1);

        this.leftDifficultyArrow.on('pointerdown', () => this.handler.onKeyLeft());
        this.rightDifficultyArrow.on('pointerdown', () => this.handler.onKeyRight());
        this.leftDifficultyArrow.on('pointerup', () => this.handler.onKeyUpUp());
        this.rightDifficultyArrow.on('pointerup', () => this.handler.onKeyRightUp());
    }

    shutdown() {
        if (this.handler) { this.handler.destroy(); this.handler = null; }
        this.characters.forEach(c => c.destroy());
        this.characters = [];
        this.weekKeys = [];
        this.weeks = {};
        this.characterCache = {};
        if (this.scoreAnimator) { this.scoreAnimator.stop(); this.scoreAnimator = null; }
        this.tweens.killAll();
        this.load.reset();
        this.input.off('pointerdown');
        this.input.off('pointerup');
    }
}

globalThis.PlayScene = PlayScene;
game.scene.add("StoryModeScene", StoryModeScene);