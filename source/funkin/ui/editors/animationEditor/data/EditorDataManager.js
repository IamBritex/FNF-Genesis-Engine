import { ActionHistory } from '../input/actionHistory.js';
import { CharacterElements } from '../../../../play/characters/characterElements.js';
import { CharacterAnimations } from '../../../../play/characters/charactersAnimations.js';

export class EditorDataManager {
    constructor(scene) {
        this.scene = scene;
        
        // Estado de Datos
        this.currentJsonData = null;
        this.characterName = "unknown";
        this.currentCharacter = null; // El sprite
        
        // Referencias de archivos
        this.currentPngUrl = null;
        this.currentXmlUrl = null;
        
        // Sistemas
        this.history = new ActionHistory(scene);
        this.iconCacheIds = {};

        // Helpers del juego
        this.elementsHelper = null;
        this.animationsHelper = new CharacterAnimations(scene);
    }

    // --- GESTIÓN DE CARGA ---

    loadCharacter(data) {
        this.clearPreviousAssets();
        this.history.clear();
        this.iconCacheIds = {};
        this.characterName = data.name || 'character';

        if (data.mode === 'desktop_existing') {
            this._loadDesktop(data.name);
        } else if (data.mode === 'new') {
            this._createNew(data);
        } else if (data.mode === 'web_existing') {
            this._loadWeb(data);
        }
    }

    _loadDesktop(charName) {
        this.currentPngUrl = `public/images/characters/${charName}.png`;
        this.currentXmlUrl = `public/images/characters/${charName}.xml`;

        this.scene.toastManager.show("Cargando...", `Cargando ${charName}...`);
        const jsonKey = `char_${charName}`;
        const jsonPath = `public/data/characters/${charName}.json`;

        // Forzar recarga para editores
        if (this.scene.cache.json.exists(jsonKey)) {
            this.scene.cache.json.remove(jsonKey);
        }

        this.scene.load.json(jsonKey, jsonPath);
        this.scene.load.once(`filecomplete-json-${jsonKey}`, (key, type, jsonData) => {
            this._processData(charName, jsonData);
        });
        this.scene.load.start();
    }

    _createNew(data) {
        const textureKey = `new_char_${Date.now()}`;
        this.scene.load.atlasXML(textureKey, data.pngUrl, data.xmlUrl);
        this.scene.load.once('complete', () => {
            // Crear sprite temporal para el DataManager (aunque CharacterPreview crea el suyo visual)
            // Aquí definimos la estructura base del JSON
            this.currentJsonData = {
                image: "characters/" + data.name,
                scale: 1,
                sing_duration: 4,
                healthicon: "face",
                animations: [],
                flip_x: false,
                no_antialiasing: false,
                healthbar_colors: [255, 0, 0],
                camera_position: [0, 0]
            };
            
            // Intentar auto-detectar idle
            const texture = this.scene.textures.get(textureKey);
            const frames = texture.getFrameNames();
            if (frames.length > 0) {
                const prefix = frames[0].replace(/[0-9]+$/, '').trim();
                this.createAnimation('idle', prefix, 24, false);
            }

            this._finalizeLoad("Nuevo", "Atlas importado.");
        });
        this.scene.load.start();
    }

    _loadWeb(data) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const jsonData = JSON.parse(e.target.result);
                const textureKey = `web_char_${Date.now()}`;
                
                this.scene.load.atlasXML(textureKey, data.pngUrl, data.xmlUrl);
                this.scene.load.once('complete', () => {
                    this._finalizeProcess(jsonData);
                    this._finalizeLoad("Web", "Personaje cargado.");
                });
                this.scene.load.start();
            } catch (err) {
                console.error(err);
                this.scene.toastManager.show("Error", "JSON inválido.");
            }
        };
        reader.readAsText(data.jsonFile);
    }

    _processData(charName, jsonData) {
        this.currentJsonData = jsonData;
        
        // Cargar Atlas
        this.elementsHelper = new CharacterElements(this.scene, this.scene.cameraManager, this.scene.sessionId);
        const jsonMap = new Map();
        jsonMap.set(charName, jsonData);
        const names = { player: charName };
        
        this.elementsHelper.preloadAtlases(names, jsonMap);
        
        const onAssetsReady = () => {
            this._finalizeLoad("Éxito", "Personaje cargado.");
        };

        if (this.scene.load.totalToLoad === 0 && !this.scene.load.isLoading()) {
            onAssetsReady();
        } else {
            this.scene.load.once('complete', onAssetsReady);
            this.scene.load.start();
        }
    }

    _finalizeProcess(jsonData) {
        this.currentJsonData = jsonData;
    }

    _finalizeLoad(title, msg) {
        this.scene.toastManager.show(title, msg);
        
        // Notificar a la escena y componentes
        this.scene.events.emit('characterLoaded', this.currentJsonData);
        
        // Pasar datos al CharacterPreview para que cree el sprite visual
        if (this.scene.characterPreview) {
            this.scene.characterPreview.onDataLoaded(this.currentJsonData);
        }
    }

    // --- MANIPULACIÓN DE DATOS (API) ---

    updateProperty(field, value) {
        if (!this.currentJsonData) return;
        
        const oldValue = this.currentJsonData[field];
        this.currentJsonData[field] = value;

        // Emitir evento de cambio
        this.scene.events.emit('propertyChanged', { field, value });
    }

    createAnimation(animName, prefix, fps = 24, loop = false) {
        if (!this.currentJsonData) return;

        const newAnim = {
            anim: animName,
            name: prefix,
            fps: fps,
            loop: loop,
            indices: [],
            offsets: [0, 0]
        };

        this.currentJsonData.animations.push(newAnim);
        this.scene.events.emit('animationCreated', newAnim);
        this.scene.events.emit('characterLoaded', this.currentJsonData); // Refrescar listas
    }

    deleteAnimation(index) {
        if (!this.currentJsonData) return;
        const deleted = this.currentJsonData.animations.splice(index, 1)[0];
        
        this.scene.events.emit('animationDeleted', deleted);
        this.scene.events.emit('characterLoaded', this.currentJsonData);
    }

    updateAnimationData(animName, field, value) {
        if (!this.currentJsonData) return;
        const anim = this.currentJsonData.animations.find(a => a.anim === animName);
        if (anim) {
            anim[field] = value;
            // Si cambia el nombre, necesitamos refrescar mapeos
            if (field === 'anim' || field === 'name') {
                this.scene.events.emit('characterLoaded', this.currentJsonData);
            }
        }
    }

    // --- UTILIDADES ---

    clearPreviousAssets() {
        if (this.currentPngUrl && this.currentPngUrl.startsWith('blob:')) URL.revokeObjectURL(this.currentPngUrl);
        if (this.currentXmlUrl && this.currentXmlUrl.startsWith('blob:')) URL.revokeObjectURL(this.currentXmlUrl);
        this.currentPngUrl = null;
        this.currentXmlUrl = null;
        this.currentJsonData = null;
    }

    shutdown() {
        this.clearPreviousAssets();
        this.history.clear();
    }
}