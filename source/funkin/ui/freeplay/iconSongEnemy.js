import { HealthIcon } from '../../play/health/healthIcon.js';

export class IconSongEnemy extends Phaser.GameObjects.Container {
    /**
     * @param {Phaser.Scene} scene
     * @param {number} x
     * @param {number} y
     * @param {string} iconName Nombre del icono (ej: 'dad', 'bf')
     */
    constructor(scene, x, y, iconName) {
        super(scene, x, y);
        this.scene = scene;
        this.iconName = iconName || 'face';

        this.sessionId = 'freeplay_session';

        // La clase HealthIcon maneja internamente el fallback a 'face'
        // si no encuentra la textura solicitada.
        this.healthIcon = new HealthIcon(this.scene, this.iconName, false, false, this.sessionId);

        this.healthIcon.bpm = 102;

        this.createIcon();
    }

    async createIcon() {
        await this.healthIcon.create(0, 0);

        if (this.healthIcon.sprite) {
            this.add(this.healthIcon.sprite);
            // Asegurar frame normal
            this.healthIcon.updateIconState(false);
        }
    }

    playBeat(time, delta) {
        if (this.healthIcon) {
            this.healthIcon.updateBeatBounce(time, delta);
        }
    }

    idle() {
        if (this.healthIcon && this.healthIcon.sprite) {
            const targetScale = this.healthIcon.minIconScale || 1;
            if (this.healthIcon.sprite.scaleX !== targetScale) {
                this.healthIcon.sprite.setScale(
                    Phaser.Math.Linear(this.healthIcon.sprite.scaleX, targetScale, 0.2)
                );
                this.healthIcon.curIconScale = this.healthIcon.sprite.scaleX;
            }
        }
    }

    destroy() {
        if (this.healthIcon) {
            this.healthIcon.destroy();
        }
        super.destroy();
    }
}