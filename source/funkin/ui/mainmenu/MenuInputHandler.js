import { MainMenuSelection } from './MainMenuSelection.js';

export class MenuInputHandler {
    /**
     * @param {Phaser.Scene} scene
     */
    constructor(scene) {
        this.scene = scene;
        this.selectionManager = new MainMenuSelection(scene);
    }

    initControls() {
        this.onKeyUp = () => this.selectionManager.changeSelection(-1);
        this.onKeyDown = () => this.selectionManager.changeSelection(1);
        this.onKeyEnter = () => this.selectionManager.confirmSelection();
        this.onKeyBackspace = () => this.goBack();

        this.onKeySeven = () => {
            if (this.scene.canInteract) {
                this.scene.canInteract = false;
                this.scene.sound.play('confirmSound');

                this.scene.cameras.main.fadeOut(500, 0, 0, 0);
                this.scene.cameras.main.once('camerafadeoutcomplete', () => {
                    this.scene.scene.start('Editor');
                });
            }
        };

        this.onWheel = (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            if (deltaY > 0) {
                this.selectionManager.changeSelection(1);
            } else if (deltaY < 0) {
                this.selectionManager.changeSelection(-1);
            }
        };

        this.scene.input.keyboard.on('keydown-UP', this.onKeyUp);
        this.scene.input.keyboard.on('keydown-DOWN', this.onKeyDown);
        this.scene.input.keyboard.on('keydown-ENTER', this.onKeyEnter);
        this.scene.input.keyboard.on('keydown-BACKSPACE', this.onKeyBackspace);
        this.scene.input.keyboard.on('keydown-SEVEN', this.onKeySeven);

        this.scene.input.on('wheel', this.onWheel);
    }

    updateSelection() {
        this.selectionManager.updateSelection();
    }

    goBack() {
        if (!this.scene.canInteract) return;

        this.scene.canInteract = false;
        this.scene.cancelSound.play();
        this.scene.startExitState('introDance');
    }

    destroy() {
        this.scene.input.keyboard.off('keydown-UP', this.onKeyUp);
        this.scene.input.keyboard.off('keydown-DOWN', this.onKeyDown);
        this.scene.input.keyboard.off('keydown-ENTER', this.onKeyEnter);
        this.scene.input.keyboard.off('keydown-BACKSPACE', this.onKeyBackspace);
        this.scene.input.keyboard.off('keydown-SEVEN', this.onKeySeven);

        this.scene.input.off('wheel', this.onWheel);
    }
}