export default class CameraScript {
    constructor(scene) {
        this.scene = scene;
        this.defaultZoom = {
            game: 1,
            ui: 1
        };
        this.currentZoomTween = null;
    }

    async define(...inputs) {
        const [cameraType, zoom, focusTarget] = inputs;

        if (!this.scene.cameraController) {
            console.error('CameraController not found');
            return;
        }

        // Handle zoom with smooth transition
        if (typeof zoom === 'number') {
            // Stop any existing zoom tween
            if (this.currentZoomTween) {
                this.currentZoomTween.stop();
            }

            switch (cameraType?.toLowerCase()) {
                case 'gamecamera':
                    const gameCamera = this.scene.cameraController.gameCamera;
                    if (gameCamera) {
                        this.currentZoomTween = this.scene.tweens.add({
                            targets: gameCamera,
                            zoom: zoom,
                            duration: 500, // Duration in milliseconds
                            ease: 'Power2',
                            onUpdate: () => {
                                this.scene.cameraController.gameZoom = gameCamera.zoom;
                            },
                            onComplete: () => {
                                this.scene.cameraController.gameZoom = zoom;
                                this.currentZoomTween = null;
                            }
                        });
                    }
                    break;

                case 'uicamera':
                    const uiCamera = this.scene.cameraController.uiCamera;
                    if (uiCamera) {
                        this.currentZoomTween = this.scene.tweens.add({
                            targets: uiCamera,
                            zoom: zoom,
                            duration: 500, // Duration in milliseconds
                            ease: 'Power2',
                            onUpdate: () => {
                                this.scene.cameraController.defaultZoom = uiCamera.zoom;
                            },
                            onComplete: () => {
                                this.scene.cameraController.defaultZoom = zoom;
                                this.currentZoomTween = null;
                            }
                        });
                    }
                    break;

                default:
                    console.warn('Invalid camera type:', cameraType);
                    return;
            }
        }

        // Handle focus target
        if (focusTarget !== undefined) {
            const characters = this.scene.characters;
            if (!characters) return;

            // Reset previous forced target
            this.scene.cameraController.followSinging = false;
            this.scene.cameraController.forcedTarget = null;  // Fixed the typo here

            if (focusTarget === null) {
                // Restore singing-based autofocus
                this.scene.cameraController.followSinging = true;
                return;
            }

            // Set new forced target
            switch (focusTarget) {
                case 1:
                    this.scene.cameraController.forcedTarget = 'player1';
                    break;
                case 2:
                    this.scene.cameraController.forcedTarget = 'player2';
                    break;
                case 'gf':
                    this.scene.cameraController.forcedTarget = 'gf';
                    break;
                default:
                    console.warn('Invalid focus target:', focusTarget);
                    return;
            }

            // Force immediate camera update
            const targetCharacter = this.scene.characters.loadedCharacters.get(
                focusTarget === 1 ? characters.currentPlayer :
                focusTarget === 2 ? characters.currentEnemy :
                characters.currentGF
            );

            if (targetCharacter?.sprite) {
                this.scene.cameraController.updateCameraPosition(targetCharacter.data || targetCharacter);
            }
        }
    }

    cleanup() {
        if (this.currentZoomTween) {
            this.currentZoomTween.stop();
            this.currentZoomTween = null;
        }

        if (this.scene.cameraController) {
            // Smooth transition back to default zoom
            const gameCamera = this.scene.cameraController.gameCamera;
            const uiCamera = this.scene.cameraController.uiCamera;

            if (gameCamera) {
                this.scene.tweens.add({
                    targets: gameCamera,
                    zoom: this.defaultZoom.game,
                    duration: 500,
                    ease: 'Power2',
                    onUpdate: () => {
                        this.scene.cameraController.gameZoom = gameCamera.zoom;
                    }
                });
            }

            if (uiCamera) {
                this.scene.tweens.add({
                    targets: uiCamera,
                    zoom: this.defaultZoom.ui,
                    duration: 500,
                    ease: 'Power2',
                    onUpdate: () => {
                        this.scene.cameraController.defaultZoom = uiCamera.zoom;
                    }
                });
            }

            // Restore singing follow
            this.scene.cameraController.followSinging = true;
            this.scene.cameraController.forcedTarget = null;
        }
    }
}