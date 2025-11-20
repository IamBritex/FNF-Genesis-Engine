/**
 * Gestiona la cámara del EDITOR (paneo manual, zoom, WASD) y utilidades de animación.
 * Soporta reasignación de teclas mediante PreferencesManager.
 */
export class CameraEditor {

    /**
     * @param {import('../StageEditor.js').StageEditor} scene La escena principal del editor.
     */
    constructor(scene) {
        this.scene = scene;
        
        // Configuración de velocidad
        this.moveSpeed = 600; // Píxeles por segundo base
        this.turboMultiplier = 2.5; // Multiplicador con Turbo (Shift)
        this.zoomSpeed = 1.0; // Velocidad de zoom
        
        // Referencias a las teclas de Phaser
        this.keys = {
            UP: null,
            DOWN: null,
            LEFT: null,
            RIGHT: null,
            TURBO: null,
            ZOOM_IN: null,  // E
            ZOOM_OUT: null  // Q
        };

        // Escuchar cambios en los atajos para recargar las teclas al vuelo
        this.scene.events.on('keybindingsUpdated', this.initKeys, this);
    }

    /**
     * Inicializa o reinicializa las teclas de movimiento basándose en las preferencias.
     */
    initKeys() {
        // Limpiar teclas anteriores
        Object.values(this.keys).forEach(key => {
            if (key) this.scene.input.keyboard.removeKey(key);
        });

        const keymap = this.scene.preferencesManager.getKeymap();

        const getKeyCode = (actionName) => {
            const binding = keymap[actionName];
            if (!binding || !binding.key) return null;
            const keyStr = binding.key.toUpperCase();
            return Phaser.Input.Keyboard.KeyCodes[keyStr] || null;
        };

        const upCode = getKeyCode('CAM_UP');
        const downCode = getKeyCode('CAM_DOWN');
        const leftCode = getKeyCode('CAM_LEFT');
        const rightCode = getKeyCode('CAM_RIGHT');
        const turboCode = getKeyCode('CAM_TURBO');
        
        // Nuevos códigos para Zoom
        const zoomInCode = getKeyCode('ZOOM_IN');
        const zoomOutCode = getKeyCode('ZOOM_OUT');

        if (upCode) this.keys.UP = this.scene.input.keyboard.addKey(upCode);
        if (downCode) this.keys.DOWN = this.scene.input.keyboard.addKey(downCode);
        if (leftCode) this.keys.LEFT = this.scene.input.keyboard.addKey(leftCode);
        if (rightCode) this.keys.RIGHT = this.scene.input.keyboard.addKey(rightCode);
        if (turboCode) this.keys.TURBO = this.scene.input.keyboard.addKey(turboCode);
        
        if (zoomInCode) this.keys.ZOOM_IN = this.scene.input.keyboard.addKey(zoomInCode);
        if (zoomOutCode) this.keys.ZOOM_OUT = this.scene.input.keyboard.addKey(zoomOutCode);

        console.log("[CameraEditor] Teclas de movimiento y zoom actualizadas.");
    }

    /**
     * Actualiza la posición de la cámara del editor basada en inputs y suavizado.
     */
    update(delta) {
        // Si estamos en modo prueba, no movemos la cámara del editor
        if (this.scene.isTestMode) return;

        this.processInput(delta);
        this.applySmoothMovement(delta);
    }

    processInput(delta) {
        if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
            return;
        }

        // Calcular velocidad ajustada al zoom y delta
        let speed = this.moveSpeed * (delta / 1000);
        
        // Ajustar velocidad según el zoom para que se sienta constante
        // A mayor zoom (más cerca), más lento; a menor zoom (más lejos), más rápido.
        const zoomFactor = Math.max(0.1, this.scene.baseZoom);
        speed /= zoomFactor;

        // Verificar Turbo
        if (this.keys.TURBO && this.keys.TURBO.isDown) {
            speed *= this.turboMultiplier;
        }

        // Movimiento
        if (this.keys.UP && this.keys.UP.isDown) this.scene.baseScrollY -= speed;
        if (this.keys.DOWN && this.keys.DOWN.isDown) this.scene.baseScrollY += speed;
        if (this.keys.LEFT && this.keys.LEFT.isDown) this.scene.baseScrollX -= speed;
        if (this.keys.RIGHT && this.keys.RIGHT.isDown) this.scene.baseScrollX += speed;

        // --- Lógica de Zoom (Q / E) ---
        if (this.keys.ZOOM_IN && this.keys.ZOOM_IN.isDown) {
            this.scene.baseZoom += this.zoomSpeed * (delta / 1000);
        }
        if (this.keys.ZOOM_OUT && this.keys.ZOOM_OUT.isDown) {
            this.scene.baseZoom -= this.zoomSpeed * (delta / 1000);
        }

        // Clamping del Zoom (Límites)
        this.scene.baseZoom = Phaser.Math.Clamp(this.scene.baseZoom, 0.1, 5.0);
    }

    applySmoothMovement(delta) {
        const cam = this.scene.gameCam;
        if (!cam) return;

        const elapsedSeconds = delta / 1000;
        const panLerpSpeed = elapsedSeconds * 10; 

        cam.scrollX = Phaser.Math.Linear(cam.scrollX, this.scene.baseScrollX, panLerpSpeed);
        cam.scrollY = Phaser.Math.Linear(cam.scrollY, this.scene.baseScrollY, panLerpSpeed);
    }
    
    panToElement(element) {
        if (!element || !this.scene.gameCam || this.scene.isTestMode) return;

        const scene = this.scene;
        const centerX = scene.gameCam.width / 2 / scene.gameCam.zoom;
        const centerY = scene.gameCam.height / 2 / scene.gameCam.zoom;

        scene.baseScrollX = element.x - centerX;
        scene.baseScrollY = element.y - centerY;
    }

    // ----------------------------------------------------------------------
    // UTILIDADES DE ANIMACIÓN
    // ----------------------------------------------------------------------

    refreshAllElementAnimations() {
        const scene = this.scene;
        if (!scene.elementsManager) return;

        for (const el of scene.elementsManager.registeredElements) {
            if (el.type === 'Sprite' && !this.isTestCharacter(el.getData('characterName'))) {
                this.refreshElementAnimations(el);
            }
        }
    }

    refreshElementAnimations(el) {
        const playList = el.getData('animPlayList');
        if (!playList || typeof playList !== 'object' || Array.isArray(playList)) return;

        const textureKey = el.texture.key;
        const frameRate = el.getData('animFrameRate') || 24;

        Object.entries(playList).forEach(([animName, animData]) => {
            const animKey = `${textureKey}_${animName}`;
            if (this.scene.anims.exists(animKey)) this.scene.anims.remove(animKey);

            const prefix = animData.prefix || '';
            const indices = animData.indices || [];
            if (!indices || indices.length === 0) return;

            const frames = indices.map(index => ({ key: textureKey, frame: prefix + index }));
            const texture = this.scene.textures.get(textureKey);
            const validFrames = frames.filter(f => texture.has(f.frame));

            if (validFrames.length > 0) {
                this.scene.anims.create({
                    key: animKey,
                    frames: validFrames,
                    frameRate: frameRate,
                    repeat: 0 
                });
            }
        });
    }

    playElementAnimation(el, onBeat = false) {
        const playList = el.getData('animPlayList');
        let animNames = [];
        if (Array.isArray(playList)) animNames = playList;
        else if (typeof playList === 'object') animNames = Object.keys(playList);
        
        if (!animNames || animNames.length === 0) return;

        let animIndex = el.getData('animIndex') || 0;
        if (onBeat) {
            animIndex = (animIndex + 1) % animNames.length;
            el.setData('animIndex', animIndex);
        }

        const animName = animNames[animIndex];
        const animKey = `${el.texture.key}_${animName}`;

        if (!this.scene.anims.exists(animKey)) return;
        
        const frameRate = el.getData('animFrameRate') || 24;
        const anim = this.scene.anims.get(animKey);
        if (anim && anim.frameRate !== frameRate) {
            anim.frameRate = frameRate;
            if (el.anims.currentAnim?.key === animKey) el.anims.updateFrameRate(frameRate);
        }
        
        const animOffsets = el.getData('animOffsets') || {};
        const offset = animOffsets[animName] || [0, 0];
        
        if (offset[0] !== 0 || offset[1] !== 0) {
            el.setDisplayOrigin(el.originX * el.width - offset[0], el.originY * el.height - offset[1]);
        } else {
            el.setOrigin(el.originX, el.originY);
        }

        const playMode = el.getData('animPlayMode');
        
        if (playMode === 'Beat') {
            el.play(animKey); 
        } else if (playMode === 'Loop') {
            if (el.anims.currentAnim?.key !== animKey || !el.anims.isPlaying) {
                el.off('animationcomplete');
                const animKeys = animNames.map(name => `${el.texture.key}_${name}`);
                if (animKeys.length > 0) {
                    el.play(animKeys[0]); 
                    if (animKeys.length > 1) el.chain(animKeys.slice(1)); 
                    el.on(`animationcomplete-${animKeys[animKeys.length - 1]}`, () => {
                        if (el.getData('animPlayMode') === 'Loop' && this.scene.isTestMode) {
                            el.play(animKeys[0]);
                        }
                    }, el);
                }
            }
        }
    }

    stopElementAnimation(el) {
        el.anims.stop();
        el.setData('animIndex', 0); 
        el.off('animationcomplete', undefined, el, undefined);

        const playList = el.getData('animPlayList') || {};
        let firstAnimName = Array.isArray(playList) ? playList[0] : Object.keys(playList)[0];
        
        if (!firstAnimName) {
             const frames = this.scene.textures.get(el.texture.key).getFrameNames();
             const groups = this.groupFramesByAnimation(frames);
             firstAnimName = Object.keys(groups)[0];
        }
        
        if (firstAnimName) {
            const animKey = `${el.texture.key}_${firstAnimName}`;
            if (this.scene.anims.exists(animKey)) {
                const anim = this.scene.anims.get(animKey);
                if (anim.frames.length > 0) el.setFrame(anim.frames[0].frame.name);
            }
        }
        el.setOrigin(el.originX, el.originY);
    }

    groupFramesByAnimation(frames) {
        const groups = {};
        frames.forEach((frame) => {
            if (frame === '__BASE') return;
            const baseAnimName = frame.replace(/\d+$/, "");
            if (!groups[baseAnimName]) groups[baseAnimName] = [];
            groups[baseAnimName].push(frame);
        });
        return groups;
    }

    isTestCharacter(name) {
        return name === 'Player (BF)' || name === 'Opponent (Dad)' || name === 'Girlfriend (GF)';
    }
}