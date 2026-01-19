import { smEvents } from '../events/SMEventBus.js';

export class Titles {
    constructor(scene) {
        this.scene = scene;
        this.container = null;
        this.items = [];

        this.onWeekChangedBinding = this.onWeekChanged.bind(this);
        this.onWeekConfirmedBinding = this.onWeekConfirmed.bind(this);

        smEvents.on('week-changed', this.onWeekChangedBinding);
        smEvents.on('week-confirmed', this.onWeekConfirmedBinding);
    }

    create(weekKeys, weeksData) {
        const { width } = this.scene.scale;
        this.container = this.scene.add.container(width / 2, 0).setDepth(15);
        this.items = [];

        weekKeys.forEach((weekKey, index) => {
            const weekData = weeksData[weekKey];
            const titleKey = `${weekData.weekName}Title`;
            let item;

            if (this.scene.textures.exists(titleKey)) {
                item = this.scene.add.image(0, 0, titleKey).setOrigin(0.5, 0.5).setAlpha(0.6);
            } else {
                item = this.scene.add.text(0, 0, weekData.weekName || 'MISSING', { fontSize: '40px', color: '#ff0000' })
                    .setOrigin(0.5, 0.5).setAlpha(0.6);
            }

            item.setData('index', index);
            this.container.add(item);
            this.items.push(item);
        });

        this.scene.weekTitlesContainer = this.container; 
    }

    onWeekChanged(data) {
        this.scroll(data.weekIndex);
    }

    onWeekConfirmed(weekIndex) {
        this.flash(weekIndex);
    }

    scroll(selectedIndex) {
        const spacing = 120;
        const selectedY = 530;

        this.items.forEach((item, index) => {
            if (!item.active) return;

            let targetY = 0;
            if (index < selectedIndex) { 
                targetY = selectedY - (spacing * (selectedIndex - index)); 
            } else { 
                targetY = selectedY + (spacing * (index - selectedIndex)); 
            }
            
            this.scene.tweens.add({
                targets: item,
                y: targetY,
                duration: 450, 
                ease: 'Cubic.easeInOut'
            });

            if (index === selectedIndex) item.setAlpha(1);
            else item.setAlpha(0.6);
        });
    }

    flash(index, onComplete) {
        const item = this.items[index];
        if (!item || !item.active) {
            if (onComplete) onComplete();
            return;
        }

        this.scene.tweens.add({
            targets: item,
            tint: 0x33FFFF,
            duration: 50,
            ease: 'Linear',
            yoyo: true,
            repeat: 10,
            onComplete: () => {
                if (item.active) item.clearTint();
                if (onComplete) onComplete();
            }
        });
    }

    destroy() {
        smEvents.off('week-changed', this.onWeekChangedBinding);
        smEvents.off('week-confirmed', this.onWeekConfirmedBinding);
        
        if (this.container) this.container.destroy();
        this.items.forEach(i => i.destroy());
    }
}