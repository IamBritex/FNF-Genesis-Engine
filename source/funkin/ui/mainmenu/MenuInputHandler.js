/**
 * Maneja toda la lógica de entrada y navegación para una escena de menú.
 */
export class MenuInputHandler {
    /**
     * @param {Phaser.Scene} scene La escena del menú que este handler controlará.
     */
    constructor(scene) {
        this.scene = scene;
    }

    /**
     * Vincula los eventos del teclado a las acciones del menú.
     */
    initControls() {
        this.onKeyUp = () => this.changeSelection(-1);
        this.onKeyDown = () => this.changeSelection(1);
        this.onKeyEnter = () => this.confirmSelection();
        this.onKeyBackspace = () => this.goBack();
        
        this.onKeySeven = () => {
            if (this.scene.canInteract) {
                /**
                 * Al lanzar el modal, no pausamos la escena,
                 * solo le quitamos la interactividad.
                 * Esto es VITAL para que el 'backdrop-filter' (blur) funcione.
                 */
                this.scene.canInteract = false; 
                this.scene.scene.launch('EditorsScene');
            }
        };

        this.onWheel = (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            if (deltaY > 0) {
                this.changeSelection(1);
            } else if (deltaY < 0) {
                this.changeSelection(-1);
            }
        };

        this.scene.input.keyboard.on('keydown-UP', this.onKeyUp);
        this.scene.input.keyboard.on('keydown-DOWN', this.onKeyDown);
        this.scene.input.keyboard.on('keydown-ENTER', this.onKeyEnter);
        this.scene.input.keyboard.on('keydown-BACKSPACE', this.onKeyBackspace);
        this.scene.input.keyboard.on('keydown-SEVEN', this.onKeySeven);
        
        this.scene.input.on('wheel', this.onWheel);
    }

    /**
     * Cambia el ítem seleccionado (arriba/abajo).
     * @param {number} change -1 para arriba, 1 para abajo.
     */
    changeSelection(change) {
        if (!this.scene.canInteract) return;
        
        this.scene.selectSound.play();
        this.scene.selectedIndex += change;

        if (this.scene.selectedIndex < 0) {
            this.scene.selectedIndex = this.scene.menuItems.length - 1;
        } else if (this.scene.selectedIndex >= this.scene.menuItems.length) {
            this.scene.selectedIndex = 0;
        }
        
        this.updateSelection();
    }

    /**
     * Actualiza la animación de los ítems y mueve la cámara.
     */
    updateSelection() {
        this.scene.menuItems.forEach((item, index) => {
            const spriteId = item.texture.key;
            if (index === this.scene.selectedIndex) {
                AssetsDriver.playAnimation(spriteId, 'selected', true);
            } else {
                AssetsDriver.playAnimation(spriteId, 'idle', true);
            }
        });

        // Con origen 0.5, item.y es el centro.
        // La cámara debe seguir el centro.
        const targetY = this.scene.menuItems[this.scene.selectedIndex].y;
        this.scene.camFollow.setPosition(this.scene.camFollow.x, targetY);
    }

    /**
     * Confirma la selección (ENTER).
     */
    confirmSelection() {
        if (!this.scene.canInteract) return;
        
        this.scene.canInteract = false;
        this.scene.confirmSound.play();
        const selectedItem = this.scene.menuItems[this.scene.selectedIndex];

        const duration = 1100, interval = 90;
        this.scene.menuFlash.setVisible(true);
        if (this.scene.flickerTimer) this.scene.flickerTimer.remove();

        const totalFlickers = Math.floor(duration / interval);
        let flickerCount = 0;

        this.scene.flickerTimer = this.scene.time.addEvent({
            delay: interval,
            callback: () => {
                this.scene.menuFlash.setVisible(!this.scene.menuFlash.visible);
                selectedItem.setVisible(!selectedItem.visible);
                flickerCount++;
                if (flickerCount >= totalFlickers) {
                    this.scene.menuFlash.setVisible(false);
                    selectedItem.setVisible(true);
                    this.scene.flickerTimer.remove();
                    this.scene.flickerTimer = null;
                }
            },
            loop: true
        });

        const targetScene = this.scene.menuItems[this.scene.selectedIndex].targetScene;
        this.scene.time.delayedCall(800, () => {
            this.scene.startExitState(targetScene);
        });
    }

    /**
     * Regresa a la pantalla de título (ESC).
     */
    goBack() {
        if (!this.scene.canInteract) return;
        
        this.scene.canInteract = false;
        this.scene.cancelSound.play();
        this.scene.startExitState('introDance');
    }

    /**
     * Limpia todos los listeners del teclado.
     * Se debe llamar en el 'shutdown' de la escena.
     */
    destroy() {
        this.scene.input.keyboard.off('keydown-UP', this.onKeyUp);
        this.scene.input.keyboard.off('keydown-DOWN', this.onKeyDown);
        this.scene.input.keyboard.off('keydown-ENTER', this.onKeyEnter);
        this.scene.input.keyboard.off('keydown-BACKSPACE', this.onKeyBackspace);
        this.scene.input.keyboard.off('keydown-SEVEN', this.onKeySeven);
        
        this.scene.input.off('wheel', this.onWheel);
    }
}