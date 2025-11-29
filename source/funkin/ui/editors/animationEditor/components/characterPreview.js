import { CharacterElements } from '../../../../play/characters/characterElements.js';
import { CharacterAnimations } from '../../../../play/characters/charactersAnimations.js';

export class CharacterPreview {
    /**
     * @param {import('../animationEditor.js').AnimationEditor} scene
     * @param {import('../../../../play/camera/Camera.js').CameraManager} cameraManager
     * @param {string} sessionId
     */
    constructor(scene, cameraManager, sessionId) {
        this.scene = scene;
        this.cameraManager = cameraManager;
        this.sessionId = sessionId;

        this.elementsHelper = null;
        this.animationsHelper = null;
        
        this.character = null;
        this.jsonData = null;
        this.name = "unknown";

        this.ghostSprite = null;
        this.isGhostActive = false;

        this.keys = {};
        
        this.dragStartOffsets = [0, 0];
    }

    create() {
        this.animationsHelper = new CharacterAnimations(this.scene);
        
        this.keys = this.scene.input.keyboard.addKeys({
            W: Phaser.Input.Keyboard.KeyCodes.W,
            A: Phaser.Input.Keyboard.KeyCodes.A,
            S: Phaser.Input.Keyboard.KeyCodes.S,
            D: Phaser.Input.Keyboard.KeyCodes.D,
            Q: Phaser.Input.Keyboard.KeyCodes.Q, 
            E: Phaser.Input.Keyboard.KeyCodes.E, 
            SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
            Z: Phaser.Input.Keyboard.KeyCodes.Z,
            X: Phaser.Input.Keyboard.KeyCodes.X 
        });

        this.scene.events.on('animLoopChanged', this.updateLoopState, this);
    }

    loadCharacter(data) {
        this.clear();
        this.name = data.name || 'character';

        if (data.mode === 'desktop_existing') {
            this._loadDesktop(data.name);
        } else if (data.mode === 'new') {
            this._createNew(data);
        } else if (data.mode === 'web_existing') {
            this._loadWeb(data);
        }
        
        this.scene.characterName = this.name;
    }

    _loadDesktop(charName) {
        this.scene.currentPngUrl = `public/images/characters/${charName}.png`;
        this.scene.currentXmlUrl = `public/images/characters/${charName}.xml`;

        this.scene.toastManager.show("Cargando...", `Cargando ${charName}...`);
        const jsonKey = `char_${charName}`;
        const jsonPath = `public/data/characters/${charName}.json`;

        if (this.scene.cache.json.exists(jsonKey)) {
            const jsonData = this.scene.cache.json.get(jsonKey);
            this._processData(charName, jsonData);
        } else {
            this.scene.load.json(jsonKey, jsonPath);
            this.scene.load.once('filecomplete-json-' + jsonKey, (key, type, jsonData) => {
                this._processData(charName, jsonData);
            });
            this.scene.load.start();
        }
    }

    _createNew(data) {
        const textureKey = `new_char_${Date.now()}`;
        this.scene.load.atlasXML(textureKey, data.pngUrl, data.xmlUrl);
        this.scene.load.once('complete', () => {
            this._createSimpleSprite(textureKey);
            
            this.jsonData = {
                image: "characters/" + data.name,
                scale: 1,
                sing_duration: 4,
                healthicon: "face",
                animations: []
            };
            
            const texture = this.scene.textures.get(textureKey);
            const frames = texture.getFrameNames();
            
            if (frames.length > 0) {
                const firstFrame = frames[0];
                const prefix = firstFrame.replace(/[0-9]+$/, '').trim();
                
                this.jsonData.animations.push({
                    anim: "idle",
                    name: prefix,
                    fps: 24,
                    loop: false,
                    indices: [],
                    offsets: [0, 0]
                });
                
                // [FIX] Filtrado Estricto también aquí
                const matchedFrames = frames.filter(f => {
                    if (!f.startsWith(prefix)) return false;
                    const suffix = f.slice(prefix.length);
                    return /^[0-9]*$/.test(suffix);
                }).sort();
                
                const animKey = `${textureKey}_idle`;

                this.scene.anims.create({
                    key: animKey,
                    frames: matchedFrames.map(f => ({ key: textureKey, frame: f })),
                    frameRate: 24
                });
                
                this.character.play(animKey);
            }

            this._calculateBaseCoordinates();
            this._finalizeLoad("Nuevo", "Atlas importado.");
        });
        this.scene.load.start();
    }

    _loadWeb(data) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                this.jsonData = JSON.parse(e.target.result);
                const textureKey = `web_char_${Date.now()}`;
                
                this.scene.load.atlasXML(textureKey, data.pngUrl, data.xmlUrl);
                this.scene.load.once('complete', () => {
                    this._createSimpleSprite(textureKey);
                    
                    if (this.jsonData.animations) {
                        const texture = this.scene.textures.get(textureKey);
                        const allFrames = texture.getFrameNames();

                        this.jsonData.animations.forEach(anim => {
                            const animKey = `${textureKey}_${anim.anim}`;
                            const prefix = anim.name;
                            
                            // [FIX] Filtrado Estricto
                            const matchedFrames = allFrames.filter(f => {
                                if (!f.startsWith(prefix)) return false;
                                const suffix = f.slice(prefix.length);
                                return /^[0-9]*$/.test(suffix);
                            }).sort();
                            
                            if (matchedFrames.length > 0) {
                                 this.scene.anims.create({
                                    key: animKey,
                                    frames: matchedFrames.map(f => ({ key: textureKey, frame: f })),
                                    frameRate: anim.fps || 24,
                                    repeat: anim.loop ? -1 : 0
                                });
                            }
                        });
                        
                        const idleAnim = `${textureKey}_idle`;
                        if (this.scene.anims.exists(idleAnim)) {
                            this.character.play(idleAnim);
                        }
                    }

                    this._calculateBaseCoordinates();
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
        this.jsonData = jsonData;
        const sessionId = this.sessionId;
        
        this.elementsHelper = new CharacterElements(this.scene, this.cameraManager, sessionId);
        
        const jsonMap = new Map();
        jsonMap.set(charName, jsonData);
        
        const names = { player: charName };
        this.elementsHelper.preloadAtlases(names, jsonMap);
        
        const onAssetsReady = () => {
            this._createVisuals(names, jsonMap, sessionId);
        };

        if (this.scene.load.totalToLoad === 0 && !this.scene.load.isLoading()) {
            onAssetsReady();
        } else {
            this.scene.load.once('complete', onAssetsReady);
            this.scene.load.start();
        }
    }

    _createVisuals(names, jsonMap, sessionId) {
        if (this.animationsHelper) {
            this.animationsHelper.createAllAnimations(names, jsonMap, sessionId);
        }
        
        const mockStageData = {
            player: { position: [0, 0], scale: 1, layer: 1, opacity: 1, visible: true }
        };
        
        const sprites = this.elementsHelper.createSprites(names, mockStageData, jsonMap);
        
        if (sprites.bf) {
            this.character = sprites.bf;
            this.character.setOrigin(0, 0);
            this.cameraManager.assignToGame(this.character);
            this._enableDrag();
            this._calculateBaseCoordinates();
            this._finalizeLoad("Éxito", "Personaje cargado.");
        } else {
            this.scene.toastManager.show("Error", "Fallo al crear sprite.");
        }
    }

    _createSimpleSprite(textureKey) {
        this.character = this.scene.add.sprite(0, 0, textureKey);
        this.character.setOrigin(0, 0);
        this.cameraManager.assignToGame(this.character);
        this._enableDrag();
    }

    _enableDrag() {
        if (!this.character) return;

        this.character.setInteractive({ 
            cursor: 'pointer', 
            pixelPerfect: true 
        });
        this.scene.input.setDraggable(this.character);

        this.character.on('dragstart', () => {
            this.scene.input.setDefaultCursor('grabbing');
            if (this.character && this.jsonData && this.character.anims.currentAnim) {
                const currentKey = this.character.anims.currentAnim.key;
                const animData = this.jsonData.animations.find(a => currentKey.endsWith(`_${a.anim}`));
                if (animData) {
                    this.dragStartOffsets = [...(animData.offsets || [0, 0])];
                }
            }
        });

        this.character.on('drag', (pointer, dragX, dragY) => {
            if (!this.jsonData) return;
            const baseX = this.character.getData('baseX') || 0;
            const baseY = this.character.getData('baseY') || 0;
            const newOffX = Math.round(dragX - baseX);
            const newOffY = Math.round(dragY - baseY);
            this._updateAnimOffsetFromDrag(newOffX, newOffY);
        });

        this.character.on('dragend', () => {
            this.scene.input.setDefaultCursor('default');
            this.character.setInteractive({ cursor: 'pointer', pixelPerfect: true });

            if (this.character && this.jsonData && this.character.anims.currentAnim) {
                const currentKey = this.character.anims.currentAnim.key;
                const animData = this.jsonData.animations.find(a => currentKey.endsWith(`_${a.anim}`));
                
                if (animData) {
                    const oldOffsets = [...this.dragStartOffsets];
                    const newOffsets = [...animData.offsets];

                    if (oldOffsets[0] !== newOffsets[0] || oldOffsets[1] !== newOffsets[1]) {
                        this.scene.history.add({
                            description: `Arrastrar ${animData.anim}`,
                            undo: () => {
                                animData.offsets = oldOffsets;
                                this.applyOffset(animData.anim);
                                this.scene.events.emit('animOffsetChanged', animData.anim);
                            },
                            redo: () => {
                                animData.offsets = newOffsets;
                                this.applyOffset(animData.anim);
                                this.scene.events.emit('animOffsetChanged', animData.anim);
                            }
                        });
                    }
                }
            }
        });
    }

    _updateAnimOffsetFromDrag(x, y) {
        if (!this.character || !this.character.anims.currentAnim) return;
        const currentKey = this.character.anims.currentAnim.key;
        const animData = this.jsonData.animations.find(a => currentKey.endsWith(`_${a.anim}`));

        if (animData) {
            animData.offsets = [x, y];
            this.applyOffset(animData.anim);
            this.scene.events.emit('animOffsetChanged', animData.anim);
        }
    }

    _calculateBaseCoordinates() {
        if (!this.character || !this.jsonData) return;

        const anims = this.jsonData.animations;
        let idleOffset = [0, 0];
        
        const idleAnim = anims.find(a => a.anim.startsWith('idle')) || anims.find(a => a.anim.startsWith('danceLeft'));
        
        if (idleAnim && idleAnim.offsets) {
            idleOffset = idleAnim.offsets;
        }
        
        const baseX = -idleOffset[0];
        const baseY = -idleOffset[1];
        
        this.character.setData('baseX', baseX);
        this.character.setData('baseY', baseY);
        
        this.character.x = baseX + idleOffset[0];
        this.character.y = baseY + idleOffset[1];
    }

    _finalizeLoad(title, msg) {
        this.scene.toastManager.show(title, msg);
        this.centerCamera();
        
        this.scene.currentCharacter = this.character;
        this.scene.currentJsonData = this.jsonData;

        if (this.scene.healthBarPreview) {
            const icon = this.jsonData.healthicon || 'face';
            const colors = this.jsonData.healthbar_colors || [255, 0, 0];
            const hexColor = Phaser.Display.Color.GetColor(colors[0], colors[1], colors[2]);
            this.scene.healthBarPreview.updateVisuals(hexColor, icon);
        }

        this.scene.events.emit('characterLoaded', this.jsonData);
    }

    playAnimation(animName, force = false) {
        if (!this.character || !this.jsonData) return;

        const textureKey = this.character.texture.key;
        const animKey = `${textureKey}_${animName}`;

        if (!this.scene.anims.exists(animKey)) return;

        const animData = this.jsonData.animations.find(a => a.anim === animName);
        if (animData) {
            const animObj = this.scene.anims.get(animKey);
            if (animObj) {
                animObj.repeat = animData.loop ? -1 : 0;
            }
        }

        this.character.play(animKey, !force);
        this.applyOffset(animName);

        this.scene.events.emit('animSelected', animName);
    }

    applyOffset(animName) {
        if (!this.character || !this.jsonData) return;
        const animData = this.jsonData.animations.find(a => a.anim === animName);
        if (!animData) return;

        if (!animData.offsets) animData.offsets = [0, 0];

        const offset = animData.offsets;
        const baseX = this.character.getData('baseX') || 0;
        const baseY = this.character.getData('baseY') || 0;
        
        this.character.x = baseX + offset[0];
        this.character.y = baseY + offset[1];
    }

    toggleGhost(isActive) {
        this.isGhostActive = isActive;
        if (!isActive) {
            if (this.ghostSprite) {
                this.ghostSprite.destroy();
                this.ghostSprite = null;
            }
        } else {
            this._createGhostSnapshot();
        }
    }

    _createGhostSnapshot() {
        if (!this.character) return;
        if (this.ghostSprite) this.ghostSprite.destroy();

        this.ghostSprite = this.scene.add.sprite(
            this.character.x, 
            this.character.y, 
            this.character.texture.key, 
            this.character.frame.name
        );
        this.ghostSprite.setScale(this.character.scaleX, this.character.scaleY);
        this.ghostSprite.setOrigin(0, 0); 
        this.ghostSprite.setFlipX(this.character.flipX);
        this.ghostSprite.setFlipY(this.character.flipY);
        this.ghostSprite.setAlpha(0.5);
        this.ghostSprite.setDepth(this.character.depth - 1);
        
        this.cameraManager.assignToGame(this.ghostSprite);
    }

    centerCamera() {
        const gameCam = this.scene.gameCam;
        if (!gameCam) return;
        
        const centerX = 0 - (gameCam.width / (2 * gameCam.zoom));
        const centerY = 0 - (gameCam.height / (2 * gameCam.zoom));
        
        gameCam.scrollX = centerX;
        gameCam.scrollY = centerY;
        
        this.scene.baseScrollX = centerX;
        this.scene.baseScrollY = centerY;
    }

    clear() {
        if (this.character) {
            this.character.destroy();
            this.character = null;
        }
        if (this.ghostSprite) {
            this.ghostSprite.destroy();
            this.ghostSprite = null;
            this.isGhostActive = false;
        }
        this.jsonData = null;
        this.scene.currentCharacter = null;
        this.scene.currentJsonData = null;
    }

    replayCurrentAnim() {
        if (!this.character || !this.character.anims.currentAnim) return;
        const key = this.character.anims.currentAnim.key;
        this.character.play(key, false);
    }

    updateLoopState(isLooping) {
        if (!this.character || !this.character.anims.currentAnim) return;
        
        const currentKey = this.character.anims.currentAnim.key;
        const animDef = this.scene.anims.get(currentKey);
        
        if (animDef) {
            animDef.repeat = isLooping ? -1 : 0;
            this.character.play(currentKey, false);
        }
    }

    stepFrame(direction) {
        if (!this.character || !this.character.anims.currentAnim) return;

        if (this.character.anims.isPlaying) {
            this.character.anims.pause();
        }

        const anim = this.character.anims;
        const total = anim.currentAnim.frames.length;
        let nextIndex = anim.currentFrame.index - 1 + direction;

        if (nextIndex >= total) nextIndex = 0;
        if (nextIndex < 0) nextIndex = total - 1;

        const nextFrame = anim.currentAnim.frames[nextIndex];
        if (nextFrame) {
            anim.setCurrentFrame(nextFrame);
        }
    }

    update(time, delta) {
        if (this.scene.isTyping || !this.character || !this.jsonData) return;

        if (Phaser.Input.Keyboard.JustDown(this.keys.W)) this.playAnimation('singUP');
        if (Phaser.Input.Keyboard.JustDown(this.keys.S)) this.playAnimation('singDOWN');
        if (Phaser.Input.Keyboard.JustDown(this.keys.A)) this.playAnimation('singLEFT');
        if (Phaser.Input.Keyboard.JustDown(this.keys.D)) this.playAnimation('singRIGHT');
        
        if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) {
            this.replayCurrentAnim();
        }

        if (Phaser.Input.Keyboard.JustDown(this.keys.Z)) {
            this.stepFrame(-1);
        }
        if (Phaser.Input.Keyboard.JustDown(this.keys.X)) {
            this.stepFrame(1);
        }

        const animsList = this.jsonData.animations;
        if (animsList.length > 0) {
            let currentIndex = 0;
            if (this.character.anims.currentAnim) {
                const currentKey = this.character.anims.currentAnim.key;
                currentIndex = animsList.findIndex(a => currentKey.endsWith(`_${a.anim}`));
                if (currentIndex === -1) currentIndex = 0;
            }

            if (Phaser.Input.Keyboard.JustDown(this.keys.Q)) {
                let prevIndex = currentIndex - 1;
                if (prevIndex < 0) prevIndex = animsList.length - 1;
                this.playAnimation(animsList[prevIndex].anim);
            }
            else if (Phaser.Input.Keyboard.JustDown(this.keys.E)) {
                let nextIndex = (currentIndex + 1) % animsList.length;
                this.playAnimation(animsList[nextIndex].anim);
            }
        }

        if (this.character.anims.currentFrame) {
            const frameName = this.character.anims.currentFrame.textureFrame;
            this.scene.events.emit('animFrameUpdate', frameName);
        }
    }

    destroy() {
        this.clear();
        this.scene.events.off('animLoopChanged', this.updateLoopState, this);
    }
}