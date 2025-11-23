import { Characters } from '../../../../play/characters/Characters.js';
import { CharactersData } from '../../../../play/characters/charactersData.js';
import { CharacterBooper } from '../../../../play/characters/charactersBooper.js';

export class StageCharacters {
    constructor(scene, cameraManager, elementsManager, conductor) { 
        this.scene = scene;
        this.cameraManager = cameraManager;
        this.elementsManager = elementsManager;
        this.conductor = conductor; 

        this.characterIcons = new Map();
        this.characterIcons.set('player', 'bf');
        this.characterIcons.set('enemy', 'dad');
        this.characterIcons.set('gfVersion', 'gf');
        
        this.cameraOffsets = new Map();
        this.cameraOffsets.set('player', { x: 69, y: 113 });
        this.cameraOffsets.set('enemy', { x: 300, y: 300 });
        this.cameraOffsets.set('gfVersion', { x: 300, y: 300 });

        const fakeChartData = {
            player: 'bf',
            enemy: 'dad',
            gfVersion: 'gf',
            bpm: this.conductor.bpm, 
            speed: 1
        };

        const mockStageHandler = {
            stageContent: this.createMockStageContent()
        };

        this.characterHandler = new Characters(
            this.scene,
            fakeChartData,
            this.cameraManager,
            mockStageHandler,
            this.conductor 
        );
        
        this.onSwapCompleteCallback = null;
        this.charToCleanup = null;
    }

    createMockStageContent() {
        const defaultPlayerPos = [1046, 776];
        const defaultEnemyPos = [320, 850];
        const defaultGfPos = [712, 697];
        const defaultPlayerOffsets = this.cameraOffsets.get('player');
        const defaultEnemyOffsets = this.cameraOffsets.get('enemy');
        const defaultGfOffsets = this.cameraOffsets.get('gfVersion');
        const baseProps = { scale: 1, layer: 5, opacity: 1, scrollFactor: 1, visible: true, flip_x: false };
        return {
            stage: [
                { player: { ...baseProps, position: defaultPlayerPos, layer: 3, camera_Offset: [defaultPlayerOffsets.x, defaultPlayerOffsets.y] } }, 
                { enemy: { ...baseProps, position: defaultEnemyPos, layer: 2, camera_Offset: [defaultEnemyOffsets.x, defaultEnemyOffsets.y] } },
                { playergf: { ...baseProps, position: defaultGfPos, layer: 1, camera_Offset: [defaultGfOffsets.x, defaultGfOffsets.y] } }
            ]
        };
    }

    preload() {
        this.characterHandler.loadCharacterJSONs();
    }

    create() {
        this.characterHandler.processAndLoadImages();
        this.scene.load.off('complete', this.onAtlasesLoaded, this);
        this.scene.load.once('complete', this.onAtlasesLoaded, this);
        this.scene.load.start();
    }

    onAtlasesLoaded() {
        console.log("StageCharacters: Atlases de personajes cargados.");
        this.scene.load.off('complete', this.onAtlasesLoaded, this);
        this.characterHandler.createAnimationsAndSprites();
        this.registerCharactersWithSelector();
        this.onCharactersReady();
    }
    
    onCharactersReady() {
        console.log("StageEditor: Personajes listos.");
        if (this.scene.layersPanel) this.scene.layersPanel.refreshList();
        if (!this.scene.camerasBoxes) {
            this.scene.camerasBoxes = new (this.scene.CamerasBoxes)(this.scene, this);
            this.scene.cameraManager.assignToGame(this.scene.camerasBoxes.group);
            this.scene.camerasBoxes.setVisible(this.scene.isCamBoxVisible);
        }
        this.scene.isCharactersReady = true;
        if (this.scene.editorMethods) this.scene.editorMethods.openWelcomeWindow();
        
        if (this.scene.loadingScreen) {
            this.scene.loadingScreen.destroy();
        }
    }

    updateCharacterData(charKey, newCharName, newIconName, onLoadedCallback) {
        if (!this.characterHandler || !this.characterHandler.chartCharacterNames) return;
        
        const oldCharName = this.characterHandler.chartCharacterNames[charKey];
        this.characterIcons.set(charKey, newIconName);
        
        if (oldCharName === newCharName) { 
            if (onLoadedCallback) onLoadedCallback(); 
            return; 
        }
        
        this.characterHandler.chartCharacterNames[charKey] = newCharName;
        this.onSwapCompleteCallback = onLoadedCallback;
        this.charToCleanup = oldCharName;
        
        const jsonKey = `char_${newCharName}`;
        const jsonPath = `public/data/characters/${newCharName}.json`;
        
        this.scene.load.off('filecomplete-json-' + jsonKey, this.onSwapJSONLoaded, this);
        this.scene.load.json(jsonKey, jsonPath);
        this.scene.load.once('filecomplete-json-' + jsonKey, this.onSwapJSONLoaded, this);
        this.scene.load.start();
    }

    swapTestCharacter(gameObject, newCharName, newIconName) {
        if (!gameObject) return;
        const charName = gameObject.getData('characterName');
        let charKey = null;
        if (charName.includes('(BF)')) charKey = 'player';
        else if (charName.includes('(Dad)')) charKey = 'enemy';
        else if (charName.includes('(GF)')) charKey = 'gfVersion';
        
        if (!charKey) return;
        
        const onSwapLoaded = () => {
            this.refreshCharacterSpritesFromData();
            let newSprite = null;
            if (charKey === 'player') newSprite = this.characterHandler.characterElements.bf;
            if (charKey === 'enemy') newSprite = this.characterHandler.characterElements.dad;
            if (charKey === 'gfVersion') newSprite = this.characterHandler.characterElements.gf;
            if (newSprite && this.elementsManager) this.elementsManager.setSelected(newSprite);
        };
        
        this.updateCharacterData(charKey, newCharName, newIconName, onSwapLoaded.bind(this));
    }

    onSwapJSONLoaded(key, type, data) {
        const charName = key.replace('char_', '');
        
        // FIX: Actualizamos el mapa de JSONs cargados inmediatamente. 
        // Esto es crucial para que el cleanup funcione correctamente en futuros swaps.
        this.characterHandler.loadedCharacterJSONs.set(charName, data);

        this.characterHandler.characterElements.preloadAtlases(
            this.characterHandler.chartCharacterNames,
            this.characterHandler.loadedCharacterJSONs
        );
        
        this.scene.load.off('complete', this.onSwapAtlasLoaded, this);
        this.scene.load.once('complete', this.onSwapAtlasLoaded, this);
        this.scene.load.start();
    }

    onSwapAtlasLoaded() {
        this.scene.load.off('complete', this.onSwapAtlasLoaded, this);
        const charToCleanup = this.charToCleanup;
        this.charToCleanup = null; 
        
        if (this.onSwapCompleteCallback) {
            this.onSwapCompleteCallback();
            this.onSwapCompleteCallback = null;
        }
        
        if (charToCleanup) this.cleanupCharacterAssets(charToCleanup);
    }

    cleanupCharacterAssets(charName) {
        if (!charName) return;
        
        const textureKey = `char_${charName}`;
        const jsonKey = `char_${charName}`;
        
        // Recuperar el JSON antes de borrarlo para saber qué animaciones limpiar
        const jsonData = this.characterHandler.loadedCharacterJSONs.get(charName);
        
        if (this.scene.cache.json.exists(jsonKey)) {
            this.scene.cache.json.remove(jsonKey);
        }
        
        this.characterHandler.loadedCharacterJSONs.delete(charName);
        
        // Limpiar animaciones antiguas para evitar errores de "sourceSize of null"
        if (jsonData && jsonData.animations) {
            jsonData.animations.forEach(animation => {
                const animKey = `${textureKey}_${animation.anim}`;
                if (this.scene.anims.exists(animKey)) {
                    this.scene.anims.remove(animKey);
                }
            });
        }
        
        if (this.scene.textures.exists(textureKey)) {
            this.scene.textures.remove(textureKey);
        }
    }

    updateCharacterProperties(stageContent) {
        if (!this.characterHandler || !stageContent) return;
        const newStageData = CharactersData.extractStageData(stageContent);
        this.characterHandler.stageCharacterData = newStageData;
        this.updateOffsetsFromData(newStageData);
        this.characterHandler.characterElements.destroy();
        this.characterHandler.characterElements.createSprites(
            this.characterHandler.chartCharacterNames,
            this.characterHandler.stageCharacterData,
            this.characterHandler.loadedCharacterJSONs
        );
        this.registerCharactersWithSelector();
    }

    updateOffsetsFromData(stageCharacterData) {
        if (stageCharacterData.player?.camera_Offset) this.cameraOffsets.set('player', { x: stageCharacterData.player.camera_Offset[0], y: stageCharacterData.player.camera_Offset[1] });
        if (stageCharacterData.enemy?.camera_Offset) this.cameraOffsets.set('enemy', { x: stageCharacterData.enemy.camera_Offset[0], y: stageCharacterData.enemy.camera_Offset[1] });
        if (stageCharacterData.playergf?.camera_Offset) this.cameraOffsets.set('gfVersion', { x: stageCharacterData.playergf.camera_Offset[0], y: stageCharacterData.playergf.camera_Offset[1] });
    }

    registerCharactersWithSelector() {
        if (!this.elementsManager || !this.characterHandler.characterElements) return;
        const { bf, dad, gf } = this.characterHandler.characterElements;
        if (bf) { bf.setData('characterName', 'Player (BF)'); bf.setData('healthicon', this.characterIcons.get('player')); this.elementsManager.registerElement(bf); }
        if (dad) { dad.setData('characterName', 'Opponent (Dad)'); dad.setData('healthicon', this.characterIcons.get('enemy')); this.elementsManager.registerElement(dad); }
        if (gf) { gf.setData('characterName', 'Girlfriend (GF)'); gf.setData('healthicon', this.characterIcons.get('gfVersion')); this.elementsManager.registerElement(gf); }
    }

    getCameraOffsets(charKey) { return this.cameraOffsets.get(charKey) || { x: 0, y: 0 }; }
    setCameraOffset(charKey, axis, value) {
        const offsets = this.cameraOffsets.get(charKey);
        if (offsets) offsets[axis] = value;
    }

    startTestMode(bpm) {
        console.log("[StageCharacters] Iniciando Modo de Prueba.");
        if (!this.characterHandler) return;
        if (this.conductor) {
            this.conductor.bpm = bpm;
            this.conductor.crochet = (60 / this.conductor.bpm) * 1000;
            this.conductor.stepCrochet = this.conductor.crochet / 4;
        }
        if (!this.characterHandler.characterBooper || this.characterHandler.characterBooper.bpm !== bpm) {
            this.characterHandler.characterBooper = new CharacterBooper(this.scene, bpm);
        }
        const { bf, dad, gf } = this.characterHandler.characterElements;
        this.characterHandler.characterBooper.setCharacterSprites(bf, dad, gf);
        this.characterHandler.characterBooper.startBeatSystem();
    }

    stopTestMode() {
        console.log("[StageCharacters] Deteniendo Modo de Prueba.");
        if (!this.characterHandler || !this.characterHandler.characterBooper) return;
        this.characterHandler.characterBooper.stopBeatSystem();
        const { bf, dad, gf } = this.characterHandler.characterElements;
        if (this.characterHandler.characterBooper) {
            if(bf) this.characterHandler.characterBooper.playAnimation(bf, 'idle', true);
            if(dad) this.characterHandler.characterBooper.playAnimation(dad, 'idle', true);
            if(gf) this.characterHandler.characterBooper.playAnimation(gf, 'idle', true);
        }
    }

    updateBopper(songPosition) {
        if (this.characterHandler && this.characterHandler.characterBooper) {
            this.characterHandler.characterBooper.update(songPosition);
        }
    }

    refreshCharacterSpritesFromData() {
        if (!this.characterHandler || !this.characterHandler.stageCharacterData) return;
        const data = this.characterHandler.stageCharacterData;
        const { bf, dad, gf } = this.characterHandler.characterElements;
        
        // Helper para capturar posición segura
        const getSafeBottomCenter = (el) => {
            if (!el || !el.active) return [0, 0];
            if (el.anims) el.anims.stop();
            
            const frames = el.texture.getFrameNames();
            if (frames.length > 0) {
                const idleFrame = frames.find(f => f.toLowerCase().includes('idle')) || frames[0];
                el.setFrame(idleFrame);
            }
            
            el.setOrigin(el.originX, el.originY);
            const x = el.x - (el.displayWidth * (el.originX - 0.5));
            const y = el.y - (el.displayHeight * (el.originY - 1.0));
            return [Math.round(x), Math.round(y)];
        };

        if (bf && data.player) { data.player.layer = bf.depth; data.player.position = getSafeBottomCenter(bf); }
        if (dad && data.enemy) { data.enemy.layer = dad.depth; data.enemy.position = getSafeBottomCenter(dad); }
        if (gf && data.playergf) { data.playergf.layer = gf.depth; data.playergf.position = getSafeBottomCenter(gf); }

        // Reconstruir sprites
        this.characterHandler.characterElements.destroy();
        // processAndLoadImages no es necesario aquí ya que los recursos ya deberían estar en caché 
        // y createAnimationsAndSprites usa loadedCharacterJSONs que ya fue actualizado en onSwapJSONLoaded
        this.characterHandler.createAnimationsAndSprites();
        
        if (this.characterHandler.characterBooper) {
            this.characterHandler.characterBooper.setCharacterSprites(
                this.characterHandler.characterElements.bf,
                this.characterHandler.characterElements.dad,
                this.characterHandler.characterElements.gf
            );
        }
        this.registerCharactersWithSelector();
    }

    shutdown() {
        this.scene.load.off('complete', this.onAtlasesLoaded, this);
        this.scene.load.off('complete', this.onSwapAtlasLoaded, this);
        
        if (this.characterHandler && this.characterHandler.chartCharacterNames) {
             const { player, enemy, gfVersion } = this.characterHandler.chartCharacterNames;
             if(player) this.scene.load.off(`filecomplete-json-char_${player}`, this.onSwapJSONLoaded, this);
             if(enemy) this.scene.load.off(`filecomplete-json-char_${enemy}`, this.onSwapJSONLoaded, this);
             if(gfVersion) this.scene.load.off(`filecomplete-json-char_${gfVersion}`, this.onSwapJSONLoaded, this);
        }
        this.onSwapCompleteCallback = null;

        if (this.characterHandler && this.characterHandler.loadedCharacterJSONs) {
            this.characterHandler.loadedCharacterJSONs.forEach((jsonData, charName) => {
                if (!jsonData || !jsonData.animations) return;
                const textureKey = `char_${charName}`;
                jsonData.animations.forEach(animation => {
                    const animKey = `${textureKey}_${animation.anim}`;
                    if (this.scene.anims.exists(animKey)) this.scene.anims.remove(animKey);
                });
            });
        }

        if (this.characterHandler) this.characterHandler.shutdown();
        this.characterIcons.clear();
        this.cameraOffsets.clear();
        this.charToCleanup = null;
        this.conductor = null;
    }
}