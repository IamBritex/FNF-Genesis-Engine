import { StageElements } from '../../../play/stage/StageElements.js';

// --- Lógica de Electron ---
let isElectron = !!window.process && !!window.process.type;
let fs, path, appDataPath; 
let RECENTS_FILE_PATH = null;

if (isElectron) {
    try {
        fs = require('fs');
        path = require('path');
        const { app } = require('@electron/remote'); 
        appDataPath = app.getPath('userData');
        RECENTS_FILE_PATH = path.join(appDataPath, 'recent-stages.json');
    } catch (e) {
        console.error("Error al cargar módulos de Electron:", e);
        isElectron = false;
    }
}

export class EditorStageManager {

    constructor(scene, cameraManager, elementsManager) {
        this.scene = scene;
        this.cameraManager = cameraManager;
        this.elementsManager = elementsManager;

        this.stageElementsHandler = null;
        this.currentStageName = null;
        this.currentStageContent = null;
        this.onStageAssetsReadyCallback = null;
        
        this.recentStages = [];
    }
    
    loadRecentStagesList() {
        try {
            if (isElectron && RECENTS_FILE_PATH && fs.existsSync(RECENTS_FILE_PATH)) {
                const data = fs.readFileSync(RECENTS_FILE_PATH, 'utf-8');
                this.recentStages = JSON.parse(data);
            } else if (!isElectron) {
                const data = localStorage.getItem('recentStages');
                if (data) {
                    this.recentStages = JSON.parse(data);
                }
            }
        } catch (e) {
            console.error("Error al cargar escenarios recientes:", e);
            this.recentStages = [];
        }
    }
    
    getRecentStages() { return this.recentStages; }

    addRecentStage(stageName) {
        if (!stageName) return;
        this.recentStages = this.recentStages.filter(s => s !== stageName);
        this.recentStages.unshift(stageName);
        this.recentStages = this.recentStages.slice(0, 3);
        try {
            const data = JSON.stringify(this.recentStages);
            if (isElectron && RECENTS_FILE_PATH) {
                fs.writeFileSync(RECENTS_FILE_PATH, data);
            } else if (!isElectron) {
                localStorage.setItem('recentStages', data);
            }
        } catch (e) {
            console.error("Error al guardar escenarios recientes:", e);
        }
    }

    loadStage(stageName, onReadyCallback) {
        console.log(`[EditorStageManager] Iniciando carga de escenario: ${stageName}`);
        this.onStageAssetsReadyCallback = onReadyCallback || null;
        this.cleanupStage(); 

        this.currentStageName = stageName;
        
        this.stageElementsHandler = new StageElements(
            this.scene, 
            this.currentStageName, 
            this.cameraManager, 
            this.scene.conductor 
        );
        
        const jsonKey = `stage_json_${stageName}`;
        const jsonPath = `public/data/stages/${stageName}.json`;
        
        this.scene.load.off('filecomplete-json-' + jsonKey, this.onStageJsonLoaded, this);
        this.scene.load.json(jsonKey, jsonPath);
        this.scene.load.once('filecomplete-json-' + jsonKey, this.onStageJsonLoaded, this);
        this.scene.load.start();
    }

    onStageJsonLoaded(key, type, data) {
        console.log(`[EditorStageManager] JSON del escenario '${this.currentStageName}' cargado.`);
        this.currentStageContent = data;
        this.stageElementsHandler.preloadImages(this.currentStageContent);
        this.scene.load.off('complete', this.onStageAssetsLoaded, this);
        this.scene.load.once('complete', this.onStageAssetsLoaded, this);
        this.scene.load.start();
    }

    onStageAssetsLoaded() {
        console.log(`[EditorStageManager] Assets del escenario '${this.currentStageName}' cargados.`);
        
        if (this.stageElementsHandler && this.currentStageContent) {
            this.stageElementsHandler.createSprites(this.currentStageContent);
        }
        
        if (this.elementsManager && this.stageElementsHandler && this.currentStageContent) {
            const stageJsonData = this.currentStageContent.stage || [];

            const findJsonItem = (namePath) => {
                const searchRecursive = (list) => {
                    for (const node of list) {
                        if (node.namePath === namePath) return node;
                        const keys = Object.keys(node);
                        const groupKey = keys.find(k => node[k] && node[k].type === 'group');
                        if (groupKey) {
                            const found = searchRecursive(node[groupKey].children || []);
                            if (found) return found;
                        }
                        else if (keys.length === 1 && node[keys[0]].namePath === namePath) {
                            return node[keys[0]];
                        }
                    }
                    return null;
                };
                return searchRecursive(stageJsonData);
            };

            // 1. Registrar Imágenes
            const stageImages = this.stageElementsHandler.stageElements || [];
            stageImages.forEach(img => {
                let name = img.texture.key.replace(`stage_${this.currentStageName}_`, '');
                img.setData('characterName', name);
                this.elementsManager.registerElement(img);
            });
            
            // 2. Registrar Spritesheets
            const stageSprites = this.stageElementsHandler.spritesheetHandler.createdSprites || [];
            stageSprites.forEach(spr => {
                let name = spr.texture.key.replace(`stage_${this.currentStageName}_`, '');
                spr.setData('characterName', name);
                const item = findJsonItem(name);
                if (item) {
                    spr.setData('origin', item.origin || [0.5, 0.5]);
                    spr.setData('animPlayList', item.animation?.play_list || {});
                    spr.setData('animPlayMode', item.animation?.play_mode || 'None');
                    spr.setData('animFrameRate', item.animation?.frameRate || 24);
                    spr.setData('animBeat', item.animation?.beat || [1]);
                }
                this.elementsManager.registerElement(spr);
            });
            
            // [CAMBIO] Ya no llamamos a layersPanel.loadFromJSON aquí.
            // Se llamará en el callback (StageEditor.js) cuando TODO (inc. personajes) esté listo.
        }
        
        this.addRecentStage(this.currentStageName);
        
        console.log(`[EditorStageManager] Escenario '${this.currentStageName}' cargado y creado.`);
        if (this.onStageAssetsReadyCallback) {
            this.onStageAssetsReadyCallback(this.currentStageContent);
        }
    }

    cleanupStage() {
        if (!this.stageElementsHandler || !this.currentStageName) return;

        console.log(`[EditorStageManager] Limpiando escenario anterior: ${this.currentStageName}`);
        
        const stageKey = `stage_json_${this.currentStageName}`;
        this.scene.load.off('filecomplete-json-' + stageKey, this.onStageJsonLoaded, this);
        this.scene.load.off('complete', this.onStageAssetsLoaded, this);

        if (this.scene.cache.json.exists(stageKey)) {
            this.scene.cache.json.remove(stageKey);
        }

        this.stageElementsHandler.destroy();
        this.stageElementsHandler = null;
        this.currentStageName = null;
        this.currentStageContent = null;
        this.onStageAssetsReadyCallback = null;
    }

    shutdown() {
        this.cleanupStage();
    }
}