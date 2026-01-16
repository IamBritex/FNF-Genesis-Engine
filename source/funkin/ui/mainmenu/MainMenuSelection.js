export class MainMenuSelection {
    /**
     * @param {Phaser.Scene} scene
     */
    constructor(scene) {
        this.scene = scene;
    }

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
     * Maneja la interacción táctil directa sobre una opción.
     * @param {number} index - El índice de la opción tocada.
     */
    handleTouch(index) {
        if (!this.scene.canInteract) return;

        if (this.scene.selectedIndex === index) {
            // Si ya estaba seleccionada, confirmamos (comportamiento de Enter)
            this.confirmSelection();
        } else {
            // Si no estaba seleccionada, la seleccionamos
            this.scene.selectSound.play();
            this.scene.selectedIndex = index;
            this.updateSelection();
        }
    }

    updateSelection() {
        this.scene.menuItems.forEach((item, index) => {
            const baseKey = item.texture.key; 
            const animType = (index === this.scene.selectedIndex) ? 'selected' : 'idle';
            const fullAnimKey = `${baseKey}_${animType}`;

            if (item.anims && (!item.anims.currentAnim || item.anims.currentAnim.key !== fullAnimKey)) {
                if (this.scene.anims.exists(fullAnimKey)) {
                    item.play(fullAnimKey);
                }
            }
        });

        // Aseguramos que la cámara siga al ítem seleccionado
        if (this.scene.menuItems[this.scene.selectedIndex]) {
            const targetY = this.scene.menuItems[this.scene.selectedIndex].y;
            if (this.scene.camFollow) {
                this.scene.camFollow.setPosition(this.scene.camFollow.x, targetY);
            }
        }
    }

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
}