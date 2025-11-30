/**
 * NoteSkin.js
 * Maneja la lógica de configuración y offsets de las notas.
 * Lee un JSON de configuración y provee los datos a Strumline, NoteSpawner, etc.
 */
export class NoteSkin {
    
    constructor(scene, chartData) {
        this.scene = scene;
        // Obtener el nombre del skin del chart, o usar "Funkin" por defecto
        this.skinName = (chartData && chartData.noteSkin) ? chartData.noteSkin : "Funkin";
        
        // Datos procesados del JSON
        this.config = null; 
        
        // Clave de caché para el JSON
        this.jsonKey = `skinCfg_${this.skinName}`;
    }

    /**
     * Paso 1: Cargar el JSON de configuración del NoteSkin.
     * Se debe llamar antes de cargar los atlas.
     */
    preloadJSON() {
        const path = `public/data/noteSkins/${this.skinName}.json`;
        
        if (!this.scene.cache.json.exists(this.jsonKey)) {
            this.scene.load.json(this.jsonKey, path);
            console.log(`NoteSkin: Cargando configuración JSON desde ${path}`);
        }
    }

    /**
     * Paso 2: Leer el JSON y cargar las imágenes/XML (Assets).
     * Esto se llama en el 'create' de la escena o tras cargar el JSON.
     */
    loadAssets() {
        // 1. Obtener la configuración. Si falla, intentar cargar Funkin por defecto
        if (this.scene.cache.json.exists(this.jsonKey)) {
            this.config = this.scene.cache.json.get(this.jsonKey);
        } else {
            console.warn(`NoteSkin: Configuración para '${this.skinName}' no encontrada. Usando 'Funkin' por defecto.`);
            // Fallback duro si el JSON no cargó
            this.config = this.scene.cache.json.get('skinCfg_Funkin');
        }

        if (!this.config) {
            console.error("NoteSkin: Error crítico. No se pudo cargar ninguna configuración de skin.");
            return;
        }

        const assetFolder = this.config.asset || "Funkin";
        const basePath = `public/images/noteSkins/${assetFolder}/`;

        // Helper para cargar atlas
        const loadAtlas = (defName, fileName) => {
            const key = `${defName}_${this.skinName}`; // ej: noteStrumline_Funkin
            if (!this.scene.textures.exists(key)) {
                this.scene.load.atlasXML(key, `${basePath}${fileName}.png`, `${basePath}${fileName}.xml`);
            }
        };

        // Cargar los 3 componentes principales basados en el JSON
        if (this.config.strumline) loadAtlas("noteStrumline", this.config.strumline.image);
        if (this.config.notes)     loadAtlas("notes", this.config.notes.image);
        if (this.config.sustain)   loadAtlas("NOTE_hold_assets", this.config.sustain.image);
    }

    /**
     * Devuelve el objeto de configuración completo.
     */
    getSkinData() {
        return this.config;
    }

    /**
     * Devuelve la clave de textura generada para un componente específico.
     * @param {string} component - 'strumline', 'notes', o 'sustain'
     */
    getTextureKey(component) {
        // Mapeo interno de nombres de JSON a prefijos de textura
        const map = {
            'strumline': 'noteStrumline',
            'notes': 'notes',
            'sustain': 'NOTE_hold_assets'
        };
        const prefix = map[component];
        return `${prefix}_${this.skinName}`;
    }

    /**
     * Obtiene los offsets específicos para el strumline.
     */
    getStrumOffsets() {
        return this.config?.strumline?.offsets || { static: {x:0,y:0}, press: {x:0,y:0}, confirm: {x:0,y:0} };
    }
}