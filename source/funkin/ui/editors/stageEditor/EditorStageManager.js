import { StageElements } from '../../../play/stage/StageElements.js';

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
    
    // MODIFICADO: Ahora devuelve una promesa
    loadRecentStagesList() {
        const storageKey = 'StageEditor/Stages/recent-stages';
        
        return Genesis.storage.load(storageKey).then(data => {
            if (Array.isArray(data)) {
                this.recentStages = data;
                console.log("[EditorStageManager] Recientes cargados:", this.recentStages);
            } else {
                this.recentStages = [];
            }
            return this.recentStages;
        }).catch(e => {
            console.error("Error cargando recientes:", e);
            this.recentStages = [];
            return [];
        });
    }
    
    getRecentStages() { return this.recentStages; }

    addRecentStage(stageName) {
        if (!stageName) return;
        this.recentStages = this.recentStages.filter(s => s !== stageName);
        this.recentStages.unshift(stageName);
        this.recentStages = this.recentStages.slice(0, 10); 
        
        const storageKey = 'StageEditor/Stages/recent-stages';
        Genesis.storage.save(storageKey, this.recentStages);
    }

    loadStage(stageName, onReadyCallback) {
        console.log(`[EditorStageManager] Cargando: ${stageName}`);
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
        
        this.scene.load.off('filecomplete-json-' + jsonKey);
        this.scene.load.json(jsonKey, jsonPath);
        this.scene.load.once('filecomplete-json-' + jsonKey, this.onStageJsonLoaded, this);
        this.scene.load.start();
    }

    onStageJsonLoaded(key, type, data) {
        this.currentStageContent = data;
        this.stageElementsHandler.preloadImages(this.currentStageContent);
        this.scene.load.off('complete', this.onStageAssetsLoaded, this);
        this.scene.load.once('complete', this.onStageAssetsLoaded, this);
        this.scene.load.start();
    }

    onStageAssetsLoaded() {
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
                        } else if (keys.length === 1 && node[keys[0]].namePath === namePath) {
                            return node[keys[0]];
                        }
                    }
                    return null;
                };
                return searchRecursive(stageJsonData);
            };

            const stageImages = this.stageElementsHandler.stageElements || [];
            stageImages.forEach(img => {
                let name = img.texture.key.replace(`stage_${this.currentStageName}_`, '');
                img.setData('characterName', name);
                this.elementsManager.registerElement(img);
            });
            
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
                    spr.setData('animOffsets', item.animation?.offsets || {});
                }
                this.elementsManager.registerElement(spr);
            });
        }
        
        this.addRecentStage(this.currentStageName);
        
        if (this.onStageAssetsReadyCallback) {
            this.onStageAssetsReadyCallback(this.currentStageContent);
        }
    }

    cleanupStage() {
        if (!this.stageElementsHandler || !this.currentStageName) return;
        
        const stageKey = `stage_json_${this.currentStageName}`;
        this.scene.load.off('filecomplete-json-' + stageKey);
        this.scene.load.off('complete', this.onStageAssetsLoaded);

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