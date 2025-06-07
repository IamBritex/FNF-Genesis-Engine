export default class HudHide {
    constructor(scene) {
        this.scene = scene;
        this.isHidden = false;
        this.defaultElements = [
            'healthBar',
            'ratingText', 
            'timeBar',
            'iconP1',
            'iconP2',
            'scoreTxt'
        ];
        // Store original positions
        this.originalPositions = {};
    }

    async init() {
        // Store original positions first
        this.defaultElements.forEach(element => {
            if (this.scene[element]) {
                this.originalPositions[element] = {
                    y: this.scene[element].y
                };
            }
        });
    }

    async define(...inputs) {
        if (!this.scene.cameraController) return;

        const elementsToHide = inputs.length > 0 ? inputs : this.defaultElements;
        this.isHidden = !this.isHidden;

        elementsToHide.forEach(element => {
            if (this.scene[element]) {
                const isBottomElement = ['healthBar', 'ratingText', 'iconP1', 'iconP2', 'scoreTxt'].includes(element);
                
                // Get target Y position
                const targetY = this.isHidden 
                    ? (isBottomElement ? this.scene.game.config.height + 100 : -100)
                    : this.originalPositions[element].y;

                // Animate position change
                this.scene.tweens.add({
                    targets: this.scene[element],
                    y: targetY,
                    duration: 1000,
                    ease: this.isHidden ? 'Back.In' : 'Back.Out'
                });
            }
        });
    }

    cleanup() {
        // Reset all elements to original positions
        Object.entries(this.originalPositions).forEach(([element, pos]) => {
            if (this.scene[element]) {
                this.scene.tweens.killTweensOf(this.scene[element]);
                this.scene[element].y = pos.y;
            }
        });
        this.isHidden = false;
    }
}