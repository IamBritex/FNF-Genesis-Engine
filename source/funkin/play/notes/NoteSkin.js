import ModHandler from "../../../core/ModHandler.js";

export class NoteSkin {

    constructor(scene, chartData) {
        this.scene = scene;
        this.skinName = (chartData && chartData.noteSkin) ? chartData.noteSkin : "Funkin";
        this.config = null;
        this.jsonKey = `skinCfg_${this.skinName}`;
    }

    async preloadJSON() {
        const path = await ModHandler.getPath('data', `noteSkins/${this.skinName}.json`);

        if (!this.scene.cache.json.exists(this.jsonKey)) {
            this.scene.load.json(this.jsonKey, path);
            console.log(`NoteSkin: Cargando configuración JSON desde ${path}`);
        }
    }

    async loadAssets() {
        if (this.scene.cache.json.exists(this.jsonKey)) {
            this.config = this.scene.cache.json.get(this.jsonKey);
        } else {
            console.warn(`NoteSkin: Configuración para '${this.skinName}' no encontrada. Usando 'Funkin' por defecto.`);
            this.config = this.scene.cache.json.get('skinCfg_Funkin');
        }

        if (!this.config) {
            console.error("NoteSkin: Error crítico. No se pudo cargar ninguna configuración de skin.");
            return;
        }

        const assetFolder = this.config.asset || "Funkin";

        const loadAtlas = async (defName, fileName) => {
            const key = `${defName}_${this.skinName}`;
            if (!this.scene.textures.exists(key)) {
                const imgPath = await ModHandler.getPath('images', `noteSkins/${assetFolder}/${fileName}.png`);
                const xmlPath = await ModHandler.getPath('images', `noteSkins/${assetFolder}/${fileName}.xml`);

                this.scene.load.atlasXML(key, imgPath, xmlPath);
            }
        };

        if (this.config.strumline) await loadAtlas("noteStrumline", this.config.strumline.image);
        if (this.config.notes) await loadAtlas("notes", this.config.notes.image);
        if (this.config.sustain) await loadAtlas("NOTE_hold_assets", this.config.sustain.image);
    }

    getSkinData() {
        return this.config;
    }

    getTextureKey(component) {
        const map = {
            'strumline': 'noteStrumline',
            'notes': 'notes',
            'sustain': 'NOTE_hold_assets'
        };
        const prefix = map[component];
        return `${prefix}_${this.skinName}`;
    }

    getStrumOffsets() {
        return this.config?.strumline?.offsets || { static: { x: 0, y: 0 }, press: { x: 0, y: 0 }, confirm: { x: 0, y: 0 } };
    }
}