export class SMEventBus extends Phaser.Events.EventEmitter {
    constructor() {
        super();
    }
}

// Singleton instance para usar en toda la escena de StoryMode
export const smEvents = new SMEventBus();