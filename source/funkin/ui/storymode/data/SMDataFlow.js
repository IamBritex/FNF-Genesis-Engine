import ModHandler from '../../../../core/ModHandler.js';

export class SMDataFlow {
    /**
     * @param {Phaser.Scene} scene 
     * @param {SMData} dataModel 
     */
    constructor(scene, dataModel) {
        this.scene = scene;
        this.data = dataModel;
    }

    // (La función preload se ha movido a SMPreload.js)

    async loadWeeks() {
        const weekList = [];
        const loadPromises = [];
        
        const combinedWeeks = await ModHandler.getCombinedWeekList(this.scene.cache);

        console.log("Lista maestra de semanas:", combinedWeeks);

        combinedWeeks.forEach(weekName => loadPromises.push(this._loadSingleWeek(weekName)));

        try {
            const results = await Promise.allSettled(loadPromises);
            results.forEach((result) => {
                if (result.status === 'fulfilled' && result.value) {
                    weekList.push(result.value);
                }
            });
            await this.processWeeks(weekList);
        } catch (error) {
            console.error('Error cargando datos de semanas:', error);
            await this.processWeeks(weekList);
        }
    }

    async _loadSingleWeek(weekName) {
        try {
            const weekPath = await ModHandler.getPath('data', `weeks/${weekName}.json`);
            const response = await fetch(weekPath);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const week = await response.json();
            this.scene.cache.json.add(weekName, week);
            return weekName;
        } catch (error) {
            console.warn(`Error cargando semana ${weekName}:`, error);
            return null;
        }
    }

    async processWeeks(weekList) {
        this.data.selectedWeekIndex = 0;
        this.data.weeks = {};

        const visibleWeeks = weekList.filter(week => {
            const weekData = this.scene.cache.json.get(week);
            return weekData && (weekData.StoryVisible !== false);
        });

        for (const week of visibleWeeks) {
            const weekData = this.scene.cache.json.get(week);
            if (!weekData) continue;
            if (!weekData.weekCharacters) weekData.weekCharacters = ["", "bf", "gf"];

            this.data.weeks[week] = {
                bg: weekData.weekBackground,
                tracks: weekData.tracks,
                phrase: weekData.phrase,
                weekName: weekData.weekName,
                weekCharacters: weekData.weekCharacters,
                StoryVisible: weekData.StoryVisible !== false,
            };
        }

        this.data.weekKeys = Object.keys(this.data.weeks);

        if (this.data.weekKeys.length > 0) {
            await this._loadInitialAssets();
        } else {
            console.warn("No visible weeks found.");
        }
    }

    async _loadInitialAssets() {
        const assetsToLoad = new Map();
        const loadPromises = [];

        for (const weekKey of this.data.weekKeys) {
            const weekData = this.scene.cache.json.get(weekKey);
            if (weekData && weekData.weekName) {
                const titleKey = `${weekData.weekName}Title`;
                if (!this.scene.textures.exists(titleKey)) {
                    const path = await ModHandler.getPath('images', `menu/storymode/titles/${weekData.weekName}.png`);
                    assetsToLoad.set(`title_${titleKey}`, { key: titleKey, path: path });
                }
            }
        }

        if (assetsToLoad.size > 0) {
            assetsToLoad.forEach(asset => {
                this.scene.load.image(asset.key, asset.path);
            });
            loadPromises.push(new Promise(resolve => this.scene.load.once('complete', resolve)));
            if (!this.scene.load.isLoading()) this.scene.load.start();
        }

        await this.loadCharactersForCurrentWeek();
        if (loadPromises.length > 0) await Promise.all(loadPromises);
    }

    async loadCharactersForCurrentWeek() {
        const weekKey = this.data.getCurrentWeekKey();
        if (!weekKey) return;
        const weekData = this.scene.cache.json.get(weekKey);
        if (!weekData || !weekData.weekCharacters) return;

        const charactersToLoad = [];
        let needsLoadStart = false;

        for (const characterName of weekData.weekCharacters) {
            if (!characterName || this.data.characterCache[characterName]) continue;

            const needsAtlas = !this.scene.textures.exists(characterName);
            const needsJson = !this.scene.cache.json.exists(`${characterName}Data`);

            if (needsAtlas || needsJson) {
                charactersToLoad.push(characterName);

                const pngPath = await ModHandler.getPath('images', `menu/storymode/menucharacters/Menu_${characterName}.png`);
                const xmlPath = await ModHandler.getPath('images', `menu/storymode/menucharacters/Menu_${characterName}.xml`);
                const jsonPath = await ModHandler.getPath('images', `menu/storymode/menucharacters/${characterName}.json`);

                if (needsAtlas) {
                    this.scene.load.atlasXML(characterName, pngPath, xmlPath);
                    needsLoadStart = true;
                }
                if (needsJson) {
                    this.scene.load.json(`${characterName}Data`, jsonPath);
                    needsLoadStart = true;
                }
            }
        }

        if (charactersToLoad.length > 0) {
            const loadPromise = new Promise((resolve) => {
                const onComplete = () => {
                    charactersToLoad.forEach(char => this.data.characterCache[char] = true);
                    resolve();
                };
                this.scene.load.once('complete', onComplete);
                if (needsLoadStart && !this.scene.load.isLoading()) this.scene.load.start();
                else if (!needsLoadStart) onComplete();
            });
            await loadPromise;
        }
    }
}