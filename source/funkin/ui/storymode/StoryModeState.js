// ====== ARCHIVO: StoryModeState.js ======
import { StoryMenuHandler } from './StoryMenuHandler.js';
import { PlayState } from '../../play/PlayState.js';

class StoryModeState extends Phaser.Scene {
    constructor() {
        super({ key: "StoryModeState" });
        this.weeks = {};
        this.weekKeys = [];
        this.selectedWeekIndex = 0;
        this.difficulties = ["easy", "normal", "hard"];
        this.selectedDifficulty = 1;
        this.characters = [];
        this.characterCache = {};
        this.canPressEnter = true;

        this.handler = null;
    }

    preload() {
        console.log("StoryModeState preload started");
        this.loadedAssets = new Set();

        this.load.text('weekList', 'public/data/ui/weeks.txt');
        this.load.image('tracksLabel', 'public/images/menu/storymode/Menu_Tracks.png');
        this.load.audio('scrollSound', 'public/assets/audio/sounds/scrollMenu.ogg');
        this.load.audio('confirmSound', 'public/assets/audio/sounds/confirmMenu.ogg');
        this.load.audio('cancelSound', 'public/assets/audio/sounds/cancelMenu.ogg');
        
        // Cargar la música del menú por si venimos de PlayState
        this.load.audio("freakyMenu", "public/assets/audio/sounds/FreakyMenu.mp3");

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
            console.log("Essential preload complete");
            this.loadWeekData();
        });

        // No iniciamos load aquí
    }

    async loadWeekData() {
        const weekList = [];
        const loadPromises = [];
        const baseWeekList = this.cache.text.get('weekList').trim().split('\n').map(w => w.trim()).filter(w => w.length > 0);
        baseWeekList.forEach(weekName => loadPromises.push(this._loadSingleWeek(weekName)));
        try {
            const results = await Promise.allSettled(loadPromises);
            results.forEach((result) => { if (result.status === 'fulfilled' && result.value) weekList.push(result.value); });
            this.processWeeks(weekList);
        } catch (error) { console.error('Error loading week data:', error); this.processWeeks(weekList); }
    }
    async _loadSingleWeek(weekName) {
        try {
            const weekPath = `public/data/weeks/${weekName}.json`;
            const response = await fetch(weekPath);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const week = await response.json();
            this.cache.json.add(weekName, week);
            return weekName;
        } catch (error) { console.warn(`Error loading base week ${weekName}:`, error); return null; }
    }

    create() {
        if (window.Genesis && window.Genesis.discord) {
            Genesis.discord.setActivity({
                details: "Menu in Friday Night Funkin'", 
                state: "Story Menu"
            });
        }
        
        // --- Lógica de Música del Menú ---
        // Verificar si la música del menú ya existe y se está reproduciendo
        if (!this.sound.get('freakyMenu')) {
            this.sound.add('freakyMenu');
        }
        
        const menuMusic = this.sound.get('freakyMenu');
        
        // Si no se está reproduciendo (ej. volviendo de PlayState), la iniciamos
        if (menuMusic && !menuMusic.isPlaying) {
            menuMusic.play({ loop: true, volume: 0.7 });
        }
        // -------------------------------

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
    }

    async processWeeks(weekList) {
        console.log("Processing weeks");
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
                bg: weekData.weekBackground, // Solo guardamos la clave o el #color
                tracks: weekData.tracks,
                phrase: weekData.phrase,
                weekName: weekData.weekName,
                weekCharacters: weekData.weekCharacters,
                StoryVisible: weekData.StoryVisible !== false,
            };
        }

        this.weekKeys = Object.keys(this.weeks);
        console.log("Processed weeks:", this.weeks);

        if (this.weekKeys.length > 0) {
            try {
                await this._loadInitialAssets();
                this.initializeScene();
            } catch (error) {
                console.error("Error loading initial assets:", error);
                this.scene.start("MainMenuState");
            }
        } else {
            console.warn("No visible weeks found for Story Mode");
            this.scene.start("MainMenuState");
        }
    }

     async _loadInitialAssets() {
        const firstWeekKey = this.weekKeys[this.selectedWeekIndex];
        const firstWeekData = this.cache.json.get(firstWeekKey);
        if (!firstWeekData) throw new Error("First week data not found");

        const assetsToLoad = new Map();
        const loadPromises = [];

        // Títulos de TODAS las semanas
        this.weekKeys.forEach(weekKey => {
            const weekData = this.cache.json.get(weekKey);
            if (weekData && typeof weekData.weekName === 'string' && weekData.weekName) {
                const titleKey = `${weekData.weekName}Title`;
                if (!this.textures.exists(titleKey)) {
                     assetsToLoad.set(`title_${titleKey}`, { type: 'image', key: titleKey, path: `public/images/menu/storymode/titles/${weekData.weekName}.png` });
                }
            } else {
                 console.warn(`Invalid weekName found for week key ${weekKey}`);
            }
        });

         if (assetsToLoad.size > 0) {
            assetsToLoad.forEach(asset => {
                if (asset.type === 'image' && typeof asset.key === 'string' && asset.key) {
                     this.load.image(asset.key, asset.path);
                } else {
                    console.error("Attempted to load image with invalid key:", asset.key);
                }
            });
            loadPromises.push(new Promise(resolve => this.load.once('complete', resolve)));
            if (!this.load.isLoading()) this.load.start();
         }

        // Personajes de la PRIMERA semana (espera aquí)
        await this._loadCharactersForWeek(this.selectedWeekIndex);

        if (loadPromises.length > 0) {
             await Promise.all(loadPromises);
        }
    }

    async _loadCharactersForWeek(weekIndex) {
        const weekKey = this.weekKeys[weekIndex];
        const weekData = this.cache.json.get(weekKey);
        if (!weekData || !weekData.weekCharacters) return;

        const charactersToLoad = [];
        let needsLoadStart = false;

        for (const characterName of weekData.weekCharacters) {
            if (typeof characterName !== 'string' || !characterName || this.characterCache[characterName]) continue;

            const needsAtlas = !this.textures.exists(characterName);
            const needsJson = !this.cache.json.exists(`${characterName}Data`);

            if (needsAtlas || needsJson) {
                charactersToLoad.push(characterName);
                const baseCharPath = 'public/images/menu/storymode/menucharacters';
                if (needsAtlas) {
                    this.load.atlasXML(characterName, `${baseCharPath}/Menu_${characterName}.png`, `${baseCharPath}/Menu_${characterName}.xml`);
                    needsLoadStart = true;
                }
                if (needsJson) {
                    this.load.json(`${characterName}Data`, `${baseCharPath}/${characterName}.json`);
                    needsLoadStart = true;
                }
            }
        }

        if (charactersToLoad.length > 0) {
            const loadPromise = new Promise((resolve, reject) => {
                const onComplete = () => {
                    this.load.off('complete', onComplete);
                    this.load.off('loaderror', onError);
                    charactersToLoad.forEach(char => this.characterCache[char] = true);
                    resolve();
                };
                const onError = (file) => {
                    this.load.off('complete', onComplete);
                    this.load.off('loaderror', onError);
                    console.error(`Failed to load character asset: ${file.key}`);
                    const charName = file.key.replace('Data', '');
                    if (charactersToLoad.includes(charName)) {
                       this.characterCache[charName] = true;
                    }
                    resolve();
                };

                this.load.on('complete', onComplete);
                this.load.on('loaderror', onError);

                 if (needsLoadStart && !this.load.isLoading()) {
                    this.load.start();
                 } else if (!needsLoadStart && !this.load.isLoading()) {
                      onComplete();
                 }
            });
             await loadPromise;
        }
    }


    initializeScene() {
        const { width, height } = this.scale;

        // Sonidos
        this.selectSound = this.sound.add('scrollSound');
        this.confirmSound = this.sound.add('confirmSound');
        this.cancelSound = this.sound.add('cancelSound');

        // --- CAMBIO: Crear fondo inicial como rectángulo amarillo ---
        const yellowColorHex = 0xF9CF51;
        this.weekBackground = this.add.rectangle(width / 2, 56 + 200, width, 400, yellowColorHex)
            .setOrigin(0.5, 0.5)
            .setDepth(100);

        const firstWeek = this.weeks[this.weekKeys[this.selectedWeekIndex]]; // Needed for title text

        this.scoreText = this.add.text(20, 10, "HIGH SCORE: 0", { fontFamily: 'VCR', fontSize: '32px', color: '#FFFFFF' }).setDepth(1000);
        this.levelTitleText = this.add.text(width - 20, 10, firstWeek.weekName.toUpperCase(), { fontFamily: 'VCR', fontSize: '32px', color: '#FFFFFF', align: 'right' }).setOrigin(1, 0).setAlpha(0.7).setDepth(1000);

        this.weekTitlesContainer = this.add.container(width / 2, 0);
        this.weekTitlesContainer.setDepth(15);

        this.weekKeys.forEach((weekKey, index) => {
            const weekData = this.weeks[weekKey];
            const titleKey = `${weekData.weekName}Title`;
            if (this.textures.exists(titleKey)) {
                const title = this.add.image(0, 0, titleKey).setOrigin(0.5, 0.5).setAlpha(0.6);
                title.setData('isFlashing', false);
                this.weekTitlesContainer.add(title);
            } else {
                 console.error(`Title texture ${titleKey} not found for week ${weekKey}.`);
                 const placeholder = this.add.text(0,0, weekData.weekName || 'MISSING', {fontSize: '40px', color: '#ff0000'}).setOrigin(0.5,0.5).setAlpha(0.6);
                 this.weekTitlesContainer.add(placeholder);
            }
        });

        const diffY = 520;
        const diffImgY = 535;
        const diffScale = 0.9;

        this.leftDifficultyArrow = this.add.sprite(width - 410, diffY, 'storymenu/arrows').setInteractive().setDepth(1000).setScale(diffScale);
        this.rightDifficultyArrow = this.add.sprite(width - 35, diffY, 'storymenu/arrows').setInteractive().setDepth(1000).setScale(diffScale);

         if (!this.anims.exists('leftIdle')) {
            this.anims.create({ key: 'leftIdle', frames: this.anims.generateFrameNames('storymenu/arrows', {prefix: 'leftIdle', end: 0, zeroPad: 4}), });
            this.anims.create({ key: 'leftConfirm', frames: this.anims.generateFrameNames('storymenu/arrows', {prefix: 'leftConfirm', end: 0, zeroPad: 4}), });
            this.anims.create({ key: 'rightIdle', frames: this.anims.generateFrameNames('storymenu/arrows', {prefix: 'rightIdle', end: 0, zeroPad: 4}), });
            this.anims.create({ key: 'rightConfirm', frames: this.anims.generateFrameNames('storymenu/arrows', {prefix: 'rightConfirm', end: 0, zeroPad: 4}), });
        }

        this.leftDifficultyArrow.play('leftIdle');
        this.rightDifficultyArrow.play('rightIdle');

        this.difficultyImage = this.add.image(width - 222, diffImgY, this.difficulties[this.selectedDifficulty]).setOrigin(0.5, 0.5).setDepth(1000).setScale(diffScale);

        this.trackLabel = this.add.image(width * 0.05, 56 + 400 + 100, 'tracksLabel').setOrigin(0.5, 0.5);
        this.trackTexts = [];

        // --- INICIALIZAR EL HANDLER ---
        this.handler = new StoryMenuHandler(this);
        this.handler.loadCharacters();
        this.handler.setupInputs();
        this.handler.repositionTitles();
        this.handler.updateTracks();

        const firstTitle = this.weekTitlesContainer.list[this.selectedWeekIndex];
        if (firstTitle) {
             firstTitle.setAlpha(1);
        } else {
             console.error("Could not find the first title object to set alpha.");
        }

        this.leftDifficultyArrow.on('pointerdown', () => this.handler.onKeyLeft());
        this.rightDifficultyArrow.on('pointerdown', () => this.handler.onKeyRight());
        this.leftDifficultyArrow.on('pointerup', () => this.handler.onKeyUpUp());
        this.rightDifficultyArrow.on('pointerup', () => this.handler.onKeyRightUp());
    }

    shutdown() {
        console.log("StoryModeState shutdown");
        if (this.handler) {
            this.handler.destroy();
            this.handler = null;
        }
        this.characters.forEach(c => c.destroy());
        this.characters = [];
        this.weekKeys = [];
        this.weeks = {};
        this.characterCache = {};
         if (this.scoreAnimator) { this.scoreAnimator.stop(); this.scoreAnimator = null; }
        this.tweens.killAll();
        
        // NOTA: No detenemos toda la música aquí (this.sound.stopAll()), 
        // porque queremos que la música del menú continúe si vamos hacia atrás.
        // Si vamos a PlayState, la música se detendrá allí o al transicionar.
        
        this.load.reset();
    }
}

globalThis.PlayState = PlayState;
game.scene.add("StoryModeState", StoryModeState);