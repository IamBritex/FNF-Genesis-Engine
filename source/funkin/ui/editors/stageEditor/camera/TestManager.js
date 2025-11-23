/**
 * Gestiona exclusivamente la lógica del "Modo Prueba" (Test Mode).
 */
export class TestManager {

    /**
     * @param {import('../StageEditor.js').StageEditor} scene La escena principal.
     */
    constructor(scene) {
        this.scene = scene;
        this.isActive = false;
        this.cameraFocusIndex = 0;
        
        // Almacenar el zoom del editor para restaurarlo después
        this.previousEditorZoom = 1.0;
        // Almacenar posición previa para restaurar
        this.previousScroll = { x: 0, y: 0 };
    }

    toggle() {
        this.isActive = !this.isActive;
        this.scene.isTestMode = this.isActive;
        
        console.log(`[TestManager] Estado cambiado a: ${this.isActive}`);

        this.updateInterfaceVisibility();

        if (this.isActive) {
            this.start();
        } else {
            this.stop();
        }
    }

    start() {
        // 1. Guardar estado anterior del editor
        this.previousEditorZoom = this.scene.baseZoom;
        this.previousScroll = { 
            x: this.scene.baseScrollX, 
            y: this.scene.baseScrollY 
        };

        // 2. Calcular el Zoom correcto para el modo juego (Fit to Screen / Ajustar a pantalla)
        // Esto simula como se vería el juego en una ventana de 1280x720
        const baseWidth = 1280;
        const baseHeight = 720;
        const scaleX = this.scene.scale.width / baseWidth;
        const scaleY = this.scene.scale.height / baseHeight;
        
        // Usamos el menor para asegurar que quepa todo (estilo FIT)
        const gameZoom = Math.min(scaleX, scaleY);
        
        // 3. APLICAR ZOOM INMEDIATAMENTE Y BLOQUEAR EL EDITOR
        // Sobrescribimos baseZoom para que el update() del StageEditor no intente regresar al zoom anterior
        this.scene.baseZoom = gameZoom;
        this.scene.gameCam.setZoom(gameZoom);

        if (this.scene.conductor) {
            this.scene.conductor.on('beat', this.onBeat, this);
            this.scene.conductor.start();
        }

        // Preparar personajes
        if (this.scene.stageCharacters && this.scene.stageCharacters.characterHandler) {
            // FIX: No refrescar desde data para evitar que se resetee la posición si se movió en el editor
            // this.scene.stageCharacters.refreshCharacterSpritesFromData(); 
            this.scene.stageCharacters.startTestMode(this.scene.conductor.bpm);
        }

        // Bloquear selección
        if (this.scene.elementsManager) {
            this.scene.elementsManager.isSelectionLocked = true;
            this.scene.elementsManager.clearSelection();
        }

        this.refreshAndPlayAnimations();
        
        // 4. POSICIONAR CÁMARA Y SINCRONIZAR 'BASE'
        this.resetCameraFocus();
        
        // TRUCO CRÍTICO: Actualizamos baseScrollX/Y a la posición actual de la cámara.
        // Esto evita que la cámara intente "viajar" (hacer zoom out) hacia la posición antigua del editor
        // durante el primer frame del modo prueba.
        this.scene.baseScrollX = this.scene.gameCam.scrollX;
        this.scene.baseScrollY = this.scene.gameCam.scrollY;
    }

    stop() {
        // Restaurar zoom y posición del usuario del editor
        this.scene.baseZoom = this.previousEditorZoom;
        this.scene.baseScrollX = this.previousScroll.x;
        this.scene.baseScrollY = this.previousScroll.y;

        if (this.scene.conductor) {
            this.scene.conductor.off('beat', this.onBeat, this);
            this.scene.conductor.stop();
        }

        if (this.scene.elementsManager) {
            this.scene.elementsManager.isSelectionLocked = false;
        }

        if (this.scene.camerasBoxes) {
            this.scene.camerasBoxes.setVisible(this.scene.isCamBoxVisible);
        }

        if (this.scene.stageCharacters) {
            this.scene.stageCharacters.stopTestMode();
        }

        this.stopAllAnimations();
        this.resetEditorCamera();
    }

    update(delta) {
        if (!this.isActive) return;

        if (this.scene.conductor) {
            this.scene.conductor.update(delta);
        }

        this.updateCameraFollow(delta);
    }

    onBeat(beat) {
        if (!this.isActive || beat === 0) return;

        // Cambiar enfoque de cámara cada 4 beats
        if (beat % 4 === 0) {
            this.cameraFocusIndex = (this.cameraFocusIndex + 1) % 3;
            this.updateCameraFocusTarget();
        }

        if (this.scene.stageCharacters && this.scene.conductor) {
            this.scene.stageCharacters.updateBopper(this.scene.conductor.songPosition);
        }

        if (this.scene.elementsManager) {
            for (const el of this.scene.elementsManager.registeredElements) {
                if (el.type === 'Sprite' && !this.isTestCharacter(el.getData('characterName'))) {
                    const playMode = el.getData('animPlayMode');
                    const beatInterval = (el.getData('animBeat') || [1])[0];

                    if (playMode === 'Beat' && (beat % beatInterval === 0)) {
                        if (this.scene.cameraEditor) {
                            this.scene.cameraEditor.playElementAnimation(el, true);
                        }
                    }
                }
            }
        }
    }

    updateCameraFollow(delta) {
        const cam = this.scene.gameCam;
        const target = this.scene.cameraFocusPoint;
        
        if (!cam || !target) return;

        const elapsedSeconds = delta / 1000;
        // Aumenté un poco la velocidad del lerp para que se sienta más responsivo como el juego real
        const posLerpSpeed = elapsedSeconds * 3.5; 

        const centerX = cam.width / (2 * cam.zoom);
        const centerY = cam.height / (2 * cam.zoom);

        cam.scrollX = Phaser.Math.Linear(cam.scrollX, target.x - centerX, posLerpSpeed);
        cam.scrollY = Phaser.Math.Linear(cam.scrollY, target.y - centerY, posLerpSpeed);
    }

    updateCameraFocusTarget() {
        if (!this.scene.stageCharacters?.characterHandler?.characterElements) return;

        const { bf, dad, gf } = this.scene.stageCharacters.characterHandler.characterElements;
        let target = null;
        let charKey = 'player';

        switch (this.cameraFocusIndex) {
            case 0: target = bf; charKey = 'player'; break;
            case 1: target = dad; charKey = 'enemy'; break;
            case 2: target = gf; charKey = 'gfVersion'; break;
        }

        if (!target || !target.visible) {
            this.cameraFocusIndex = 0;
            target = bf;
            charKey = 'player';
        }

        if (target && this.scene.cameraFocusPoint) {
            const offsets = this.scene.stageCharacters.getCameraOffsets(charKey);
            
            // CORRECCIÓN IMPORTANTE:
            // Alineación exacta con CamerasBoxes.js.
            // Usamos target.x + offsets.x DIRECTAMENTE.
            // No agregamos (target.width / 2) porque los offsets ya suelen considerar el punto focal deseado.
            this.scene.cameraFocusPoint.setPosition(
                target.x + offsets.x, 
                target.y + offsets.y
            );
        }
    }

    updateInterfaceVisibility() {
        const displayMode = this.isActive ? 'none' : 'block';
        const flexDisplay = this.isActive ? 'none' : 'flex';

        if (this.scene.cameraManager?.HUDCamera) {
            this.scene.cameraManager.HUDCamera.setVisible(!this.isActive);
        }
        
        this.setDomDisplay(this.scene.navBar, displayMode);
        this.setDomDisplay(this.scene.layersPanel, flexDisplay);
        this.setDomDisplay(this.scene.propertiesWindow?.windowInstance, flexDisplay);
    }

    setDomDisplay(obj, display) {
        if (obj?.domElement?.node) {
            obj.domElement.node.style.display = display;
        } else if (obj?.domElement?.style) {
            obj.domElement.style.display = display;
        }
    }

    resetCameraFocus() {
        this.cameraFocusIndex = 0;
        this.updateCameraFocusTarget();
        
        // Centrar inmediatamente al iniciar para evitar paneos largos desde la posición del editor
        const cam = this.scene.gameCam;
        if (cam && this.scene.cameraFocusPoint) {
            const centerX = cam.width / (2 * cam.zoom);
            const centerY = cam.height / (2 * cam.zoom);
            
            // Setear directamente scrollX/Y
            cam.scrollX = this.scene.cameraFocusPoint.x - centerX;
            cam.scrollY = this.scene.cameraFocusPoint.y - centerY;
        }
    }

    resetEditorCamera() {
        const cam = this.scene.gameCam;
        if (cam) {
            cam.stopFollow();
            
            // Restaurar posición y zoom guardados al inicio de start()
            cam.setZoom(this.previousEditorZoom);
            cam.scrollX = this.previousScroll.x;
            cam.scrollY = this.previousScroll.y;
            
            // Sincronizar las variables base del editor
            this.scene.baseZoom = this.previousEditorZoom;
            this.scene.baseScrollX = this.previousScroll.x;
            this.scene.baseScrollY = this.previousScroll.y;
        }
    }

    refreshAndPlayAnimations() {
        if (!this.scene.cameraEditor) return;
        this.scene.cameraEditor.refreshAllElementAnimations();

        if (this.scene.elementsManager) {
            for (const el of this.scene.elementsManager.registeredElements) {
                if (el.type === 'Sprite' && !this.isTestCharacter(el.getData('characterName'))) {
                    if (el.getData('animPlayMode') === 'Loop') {
                        this.scene.cameraEditor.playElementAnimation(el);
                    }
                }
            }
        }
    }

    stopAllAnimations() {
        if (!this.scene.cameraEditor || !this.scene.elementsManager) return;

        for (const el of this.scene.elementsManager.registeredElements) {
            if (el.type === 'Sprite' && !this.isTestCharacter(el.getData('characterName'))) {
                this.scene.cameraEditor.stopElementAnimation(el);
            }
        }
    }

    isTestCharacter(name) {
        return name === 'Player (BF)' || name === 'Opponent (Dad)' || name === 'Girlfriend (GF)';
    }
}