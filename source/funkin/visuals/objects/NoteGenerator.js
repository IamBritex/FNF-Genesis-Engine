export class NoteGenerator {
    constructor(scene, config, events) {
        this.scene = scene;
        this.config = config;
        this.events = events;
        this.songNotes = [];
        this.playerNotes = [];
        this.enemyNotes = [];
    }

    spawnNote(note) {
        const isPlayer = note.isPlayerNote;
        const directionIndex = note.noteDirection;
        const direction = this.config.directions[directionIndex];
        const posConfig = isPlayer ? this.config.playerNotes : this.config.enemyNotes;
        
        const pos = posConfig[directionIndex];
        const currentTime = this.scene.songPosition;
        const timeDiff = note.strumTime - currentTime;
        const scrollSpeed = 0.45 * this.config.speed;
        const targetY = isPlayer ? 
            this.config.playerStatic[directionIndex].y : 
            this.config.enemyStatic[directionIndex].y;
        const initialY = targetY + (timeDiff * scrollSpeed);
        
        // Crear nota principal
        const noteSprite = this.scene.add.sprite(pos.x, initialY, 'notes', 
            `note${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`);
        
        noteSprite.setScale(this.config.scale.notes);
        noteSprite.setDepth(15);
        note.sprite = noteSprite;
        note.spawned = true;

        if (note.isHoldNote) this.createHoldNoteSegments(note, initialY, directionIndex);
        
        if (isPlayer) this.playerNotes.push(note);
        else this.enemyNotes.push(note);
    }

    createHoldNoteSegments(note, initialY, directionIndex) {
        const holdColor = this.config.holdColors[directionIndex];
        const pos = note.isPlayerNote ? 
            this.config.playerNotes[directionIndex] : 
            this.config.enemyNotes[directionIndex];
        
        const holdDuration = note.sustainLength;
        const pixelsPerMs = 0.45 * this.config.speed;
        const holdLength = holdDuration * pixelsPerMs;
        const numPieces = Math.ceil(holdLength / this.config.holdSegmentHeight);
        
        note.holdSprites = [];
        
        for (let i = 0; i < numPieces; i++) {
            const segmentY = initialY + (i * this.config.holdSegmentHeight);
            const holdPiece = this.scene.add.sprite(pos.x, segmentY, 'NOTE_hold_assets', `${holdColor} hold piece0000`);
            holdPiece.setScale(this.config.scale.holds).setOrigin(0.5, 0).setDepth(14);
            note.holdSprites.push(holdPiece);
        }
        
        const endY = initialY + (numPieces * this.config.holdSegmentHeight);
        const holdEnd = this.scene.add.sprite(pos.x, endY, 'NOTE_hold_assets', `${holdColor} hold end0000`);
        holdEnd.setScale(this.config.scale.holds).setOrigin(0.5, 0).setDepth(14);
        note.holdSprites.push(holdEnd);
    }

    cleanUpNote(note) {
        if (note.sprite?.active) note.sprite.destroy();
        if (note.holdSprites) note.holdSprites.forEach(s => s?.destroy());
        
        note.wasHit = true;
        note.isBeingHeld = false;
        this.events.emit('noteEnd', { direction: note.noteDirection, isPlayerNote: note.isPlayerNote });
    }
}