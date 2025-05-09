export class InputController {
    constructor(scene, config, events, arrowManager, noteGenerator) {
        this.scene = scene;
        this.config = config;
        this.events = events;
        this.arrowManager = arrowManager;
        this.noteGenerator = noteGenerator;
        this.keysHeld = { left: false, down: false, up: false, right: false };
    }

    setupKeyBindings() {
        this.keyBindings = {
            left: [this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT), this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A)],
            down: [this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN), this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S)],
            up: [this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP), this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W)],
            right: [this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT), this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)]
        };

        this.config.directions.forEach((direction, index) => {
            this.keyBindings[direction].forEach(key => {
                key.on('down', () => this.handleKeyPress(index));
                key.on('up', () => this.handleKeyRelease(index));
            });
        });
    }

    handleKeyPress(directionIndex) {
        const arrow = this.arrowManager.playerArrows[directionIndex];
        if (!arrow) return;

        this.keysHeld[this.config.directions[directionIndex]] = true;
        this.arrowManager.updateArrowState(arrow, 'confirm');
        this.checkNoteHit(directionIndex);
    }

    handleKeyRelease(directionIndex) {
        const arrow = this.arrowManager.playerArrows[directionIndex];
        this.keysHeld[this.config.directions[directionIndex]] = false;
        this.arrowManager.resetArrow(arrow);
        this.events.emit('noteReleased', { direction: directionIndex, isPlayerNote: true });
    }

    checkNoteHit(directionIndex) {
        const currentTime = this.scene.songPosition;
        const note = this.noteGenerator.songNotes.find(n => 
            n.isPlayerNote && n.noteDirection === directionIndex && 
            !n.wasHit && Math.abs(n.strumTime - currentTime) <= this.config.safeZoneOffset
        );

        if (note) this.hitNote(note, Math.abs(note.strumTime - currentTime));
    }

    hitNote(note, timeDiff) {
        note.wasHit = true;
        this.noteGenerator.cleanUpNote(note);
        this.events.emit('noteHit', { 
            direction: note.noteDirection, 
            isPlayerNote: true, 
            timeDiff: timeDiff 
        });
    }

    autoHitEnemyNote(note) {
        note.wasHit = true;
        const arrow = this.arrowManager.enemyArrows[note.noteDirection];
        this.arrowManager.updateArrowState(arrow, 'confirm', false);
        this.noteGenerator.cleanUpNote(note);
        this.events.emit('cpuNoteHit', { direction: note.noteDirection, isPlayerNote: false });
    }
}