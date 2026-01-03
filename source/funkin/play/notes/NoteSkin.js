import ModHandler from "../../../core/ModHandler.js";

/**
 * NoteSkin.js
 * Maneja la lógica de configuración y offsets de las notas.
 * Soporta Modding para skins personalizados.
 */
export class NoteSkin {

    constructor(scene, chartData) {
        this.scene = scene;
        // Obtener el nombre del skin del chart, o usar "Funkin" por defecto
        this.skinName = (chartData && chartData.noteSkin) ? chartData.noteSkin : "Funkin";
        this.config = null;
        this.jsonKey = `skinCfg_${this.skinName}`;
    }

    /**
     * Paso 1: Cargar el JSON de configuración del NoteSkin.
     */
    preloadJSON() {
        // [MODIFICADO] Verificar si existe en Mod primero
        const path = ModHandler.getPath('data', `noteSkins/${this.skinName}.json`);

        if (!this.scene.cache.json.exists(this.jsonKey)) {
            this.scene.load.json(this.jsonKey, path);
            console.log(`NoteSkin: Cargando configuración JSON desde ${path}`);
        }
    }

    /**
     * Paso 2: Leer el JSON y cargar las imágenes/XML (Assets).
     */
    loadAssets() {
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

        // [MODIFICADO] Helper para cargar atlas usando rutas dinámicas
        const loadAtlas = (defName, fileName) => {
            const key = `${defName}_${this.skinName}`; // ej: noteStrumline_Funkin
            if (!this.scene.textures.exists(key)) {
                // ModHandler se encarga de ver si el archivo existe en el mod
                const imgPath = ModHandler.getPath('images', `noteSkins/${assetFolder}/${fileName}.png`);
                const xmlPath = ModHandler.getPath('images', `noteSkins/${assetFolder}/${fileName}.xml`);

                this.scene.load.atlasXML(key, imgPath, xmlPath);
            }
        };

        if (this.config.strumline) loadAtlas("noteStrumline", this.config.strumline.image);
        if (this.config.notes) loadAtlas("notes", this.config.notes.image);
        if (this.config.sustain) loadAtlas("NOTE_hold_assets", this.config.sustain.image);
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