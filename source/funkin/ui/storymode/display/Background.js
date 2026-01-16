import { smEvents } from '../events/SMEventBus.js';

export class Background {
    constructor(scene) {
        this.scene = scene;
        this.bgElement = null;
        this.defaultColor = 0xF9CF51;

        this.onWeekChangedBinding = this.onWeekChanged.bind(this);
        smEvents.on('week-changed', this.onWeekChangedBinding);
    }

    create() {
        const { width } = this.scene.scale;
        this.bgElement = this.scene.add.rectangle(width / 2, 56 + 200, width, 400, this.defaultColor)
            .setOrigin(0.5, 0.5)
            .setDepth(100);
    }

    onWeekChanged(data) {
        if (data && data.weekData) {
            this.update(data.weekData);
        }
    }

    update(weekData) {
        if (!this.bgElement || !this.bgElement.active || !weekData) return;

        const bgData = weekData.bg;
        const parsedColor = this.parseColor(bgData);
        const isColor = parsedColor !== null;
        
        let isImage = false;
        if (!isColor && bgData && this.scene.textures.exists(bgData)) {
            isImage = true;
        }

        this.scene.tweens.killTweensOf(this.bgElement);

        if (isColor || (!isImage && !isColor)) {
            const targetColor = isColor ? parsedColor : this.defaultColor;
            
            if (this.bgElement.type !== 'Rectangle') {
                this.replaceWithRectangle(targetColor);
            } else {
                this.tweenColor(targetColor);
            }
        } 
        else if (isImage) {
            if (this.bgElement.type !== 'Image' || this.bgElement.texture.key !== bgData) {
                this.replaceWithImage(bgData);
            }
        }
    }

    replaceWithRectangle(color) {
        const { width } = this.scene.scale;
        this.bgElement.destroy();
        this.bgElement = this.scene.add.rectangle(width / 2, 56 + 200, width, 400, color)
            .setOrigin(0.5, 0.5)
            .setDepth(100);
    }

    replaceWithImage(texture) {
        const { width } = this.scene.scale;
        this.bgElement.destroy();
        this.bgElement = this.scene.add.image(width / 2, 56 + 200, texture)
            .setOrigin(0.5, 0.5)
            .setDepth(100);
    }

    tweenColor(targetColor) {
        const startColor = Phaser.Display.Color.ValueToColor(this.bgElement.fillColor);
        const endColor = Phaser.Display.Color.ValueToColor(targetColor);

        this.scene.tweens.add({
            targets: { t: 0 },
            t: 1,
            duration: 400,
            ease: 'Linear',
            onUpdate: (tween) => {
                const interpolated = Phaser.Display.Color.Interpolate.ColorWithColor(
                    startColor, endColor, 100, tween.progress * 100
                );
                const colorInt = Phaser.Display.Color.GetColor(interpolated.r, interpolated.g, interpolated.b);
                if (this.bgElement && this.bgElement.active) {
                    this.bgElement.setFillStyle(colorInt);
                }
            }
        });
    }

    parseColor(input) {
        if (typeof input !== 'string') return null;
        input = input.trim();
        if (input.startsWith('#')) return parseInt(input.replace('#', '0x'), 16);
        if (input.startsWith('0x')) return parseInt(input, 16);
        const rgbRegex = /^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i;
        const match = input.match(rgbRegex);
        if (match) return Phaser.Display.Color.GetColor(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]));
        return null;
    }

    destroy() {
        smEvents.off('week-changed', this.onWeekChangedBinding);
        if (this.bgElement) this.bgElement.destroy();
    }
}