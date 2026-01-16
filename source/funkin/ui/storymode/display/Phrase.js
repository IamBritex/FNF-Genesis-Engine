import { smEvents } from '../events/SMEventBus.js';

export class Phrase {
    constructor(scene) {
        this.scene = scene;
        this.text = null;

        // Binding para poder remover el listener después
        this.onWeekChanged = this.update.bind(this);
        smEvents.on('week-changed', this.onWeekChanged);
    }

    create() {
        const { width } = this.scene.scale;
        
        this.text = this.scene.add.text(width - 20, 10, "", { 
            fontFamily: 'VCR', 
            fontSize: '32px', 
            color: '#FFFFFF', 
            align: 'right' 
        })
        .setOrigin(1, 0)
        .setAlpha(0.7)
        .setDepth(1000);
        
        this.scene.levelTitleText = this.text; 
    }

    update(eventData) {
        // Validación extra: si el texto fue destruido, no hacer nada
        if (!this.text || !this.text.active) return;
        
        // Soporte para recibir el evento directo o los datos
        const weekData = eventData.weekData || eventData;
        if (!weekData) return;

        const content = weekData.phrase || weekData.weekName || "";
        this.text.setText(content.toUpperCase());
    }

    destroy() {
        // IMPORTANTE: Dejar de escuchar el evento
        smEvents.off('week-changed', this.onWeekChanged);

        if (this.text) {
            this.text.destroy();
            this.text = null;
        }
    }
}