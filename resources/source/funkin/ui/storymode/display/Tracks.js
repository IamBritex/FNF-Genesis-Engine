import { smEvents } from '../events/SMEventBus.js';

export class Tracks {
    constructor(scene) {
        this.scene = scene;
        this.label = null;
        this.texts = [];
        this.container = null;

        this.onWeekChangedBinding = this.onWeekChanged.bind(this);
        smEvents.on('week-changed', this.onWeekChangedBinding);
    }

    create() {
        const x = this.scene.scale.width * 0.05;
        this.label = this.scene.add.image(x, 0, 'tracksLabel').setOrigin(0.5, 0.5);
        this.container = this.scene.add.container(0, 0);
    }

    onWeekChanged(data) {
        if (data && data.weekData) {
            this.update(data.weekData.tracks);
        }
    }

    update(trackList) {
        // Limpiar textos anteriores
        this.texts.forEach(t => t.destroy());
        this.texts = [];
        this.container.removeAll(true);

        const tracklistX = this.scene.scale.width * 0.05 + 150;
        const baseY = 56 + 400 + 70; 
        
        // Validar que la etiqueta existe antes de usarla
        if (this.label && this.label.active) {
            this.label.setPosition(tracklistX, baseY);
            this.container.setPosition(tracklistX, this.label.y + 45);
            this.label.x = this.container.x;
        }

        if (!trackList) return;

        let flatTracks = [];
        if (Array.isArray(trackList)) {
            flatTracks = trackList.flat(Infinity);
        } else {
            flatTracks = [trackList];
        }

        flatTracks.forEach((trackName, i) => {
            const displayName = String(trackName || "").toUpperCase();
            if (!displayName) return;

            const text = this.scene.add.text(0, i * 30, displayName, { 
                fontFamily: 'VCR', 
                fontSize: '32px', 
                color: '#E55777',
                align: 'center'
            })
            .setOrigin(0.5, 0.5);
            
            this.texts.push(text);
            this.container.add(text);
        });
    }

    destroy() {
        smEvents.off('week-changed', this.onWeekChangedBinding);
        
        if (this.label) this.label.destroy();
        if (this.container) this.container.destroy();
        this.texts.forEach(t => t.destroy());
    }
}