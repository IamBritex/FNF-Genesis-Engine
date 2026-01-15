import { HealthIcon } from '../../../play/health/healthIcon.js';

export class IconSongEnemy extends Phaser.GameObjects.Container {
    constructor(scene, x, y, iconName) {
        super(scene, x, y);
        this.scene = scene;
        this.iconName = iconName || 'face';
        this.sessionId = 'freeplay_session';

        this.healthIcon = new HealthIcon(this.scene, this.iconName, false, false, this.sessionId);
        this.healthIcon.bpm = 102;
        this.createIcon();
    }

    async createIcon() {
        await this.healthIcon.create(0, 0);
        if (this.healthIcon.sprite) {
            this.add(this.healthIcon.sprite);
            this.healthIcon.updateIconState(false);
        }
    }

    playBeat(time, delta) {
        if (this.healthIcon) this.healthIcon.updateBeatBounce(time, delta);
    }

    idle() {
        if (this.healthIcon && this.healthIcon.sprite) {
            const targetScale = this.healthIcon.minIconScale || 1;
            if (this.healthIcon.sprite.scaleX !== targetScale) {
                this.healthIcon.sprite.setScale(
                    Phaser.Math.Linear(this.healthIcon.sprite.scaleX, targetScale, 0.2)
                );
            }
        }
    }

    destroy() {
        if (this.healthIcon) this.healthIcon.destroy();
        super.destroy();
    }
}