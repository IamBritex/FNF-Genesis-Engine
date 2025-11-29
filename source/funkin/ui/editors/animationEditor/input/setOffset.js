export class SetOffset {
    /**
     * @param {import('../animationEditor.js').AnimationEditor} scene
     */
    constructor(scene) {
        this.scene = scene;
        
        // Modificadores de velocidad (estándar)
        this.keyShift = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
        this.keyAlt = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ALT);
        this.keyCtrl = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.CTRL);

        // Teclas de dirección dinámicas
        this.keys = {};

        // Inicializar y escuchar cambios
        this.updateKeys();
        this.scene.events.on('keybindingsUpdated', this.updateKeys, this);
    }

    updateKeys() {
        // Limpiar teclas anteriores para evitar duplicados
        if (this.keys) {
            Object.values(this.keys).forEach(k => {
                if (k) this.scene.input.keyboard.removeKey(k);
            });
        }

        // Obtener el mapa de teclas actual
        // Asegúrate de que PreferencesManager esté inicializado en la escena
        if (!this.scene.preferencesManager) return;

        const prefs = this.scene.preferencesManager.getKeymap();
        
        // Helper para obtener el código de tecla de Phaser
        const getCode = (action) => {
            if (!prefs[action]) return null;
            const keyName = prefs[action].key.toUpperCase();
            return Phaser.Input.Keyboard.KeyCodes[keyName];
        };

        this.keys = {
            up: this.scene.input.keyboard.addKey(getCode('OFF_UP')),
            down: this.scene.input.keyboard.addKey(getCode('OFF_DOWN')),
            left: this.scene.input.keyboard.addKey(getCode('OFF_LEFT')),
            right: this.scene.input.keyboard.addKey(getCode('OFF_RIGHT'))
        };

        console.log("[SetOffset] Teclas de offset actualizadas.");
    }

    update(delta) {
        if (!this.scene.currentCharacter || !this.scene.currentJsonData) return;

        // Si el usuario está escribiendo en un input HTML, no movemos nada
        if (this.scene.isTyping) return;

        const sprite = this.scene.currentCharacter;
        if (!sprite.anims || !sprite.anims.currentAnim) return;

        // Seguridad: Si update corre antes de inicializar teclas
        if (!this.keys.up) return;

        let dx = 0;
        let dy = 0;
        
        // Lógica de velocidad
        let currentStep = 5; // Normal
        
        if (this.keyShift.isDown) {
            currentStep = 1; // Precisión (Shift)
        } else if (this.keyCtrl.isDown) {
            currentStep = 10; // Rápido (Ctrl)
        }

        // Usar las teclas dinámicas configuradas
        // CheckDown con delay de 100ms para control preciso
        if (this.scene.input.keyboard.checkDown(this.keys.left, 100)) dx = -currentStep; 
        if (this.scene.input.keyboard.checkDown(this.keys.right, 100)) dx = currentStep; 
        if (this.scene.input.keyboard.checkDown(this.keys.up, 100)) dy = -currentStep;   
        if (this.scene.input.keyboard.checkDown(this.keys.down, 100)) dy = currentStep;  

        if (dx !== 0 || dy !== 0) {
            this.applyOffset(dx, dy);
        }
    }

    applyOffset(dx, dy) {
        const sprite = this.scene.currentCharacter;
        const currentAnimKey = sprite.anims.currentAnim.key;
        
        // Buscar la animación correspondiente en el JSON
        const animData = this.scene.currentJsonData.animations.find(a => currentAnimKey.endsWith(`_${a.anim}`));
        
        if (animData) {
            // Capturar estado ANTERIOR para el historial
            const prevOffsets = [...(animData.offsets || [0, 0])];
            
            if (!animData.offsets) animData.offsets = [0, 0];
            animData.offsets[0] += dx;
            animData.offsets[1] += dy;
            
            // Capturar estado NUEVO
            const newOffsets = [...animData.offsets];

            // Aplicar cambio visual
            if (this.scene.characterPreview) {
                this.scene.characterPreview.applyOffset(animData.anim);
            } else if (this.scene.applyAnimOffset) {
                this.scene.applyAnimOffset(sprite, animData.anim);
            }

            // Notificar a la UI (Properties Window)
            this.scene.events.emit('animOffsetChanged', animData.anim);

            // Registrar en historial
            this.scene.history.add({
                description: `Mover ${animData.anim} (${dx}, ${dy})`,
                undo: () => {
                    animData.offsets = prevOffsets;
                    this.scene.applyAnimOffset(sprite, animData.anim);
                    this.scene.events.emit('animOffsetChanged', animData.anim);
                },
                redo: () => {
                    animData.offsets = newOffsets;
                    this.scene.applyAnimOffset(sprite, animData.anim);
                    this.scene.events.emit('animOffsetChanged', animData.anim);
                }
            });
        }
    }
}