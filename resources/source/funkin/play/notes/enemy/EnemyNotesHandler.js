import { BaseNotesHandler } from "../BaseNotesHandler.js";
import { Strumline } from "../Strumline.js";
import { PlayEvents } from "../../PlayEvents.js"; // [IMPORTANTE]

export class EnemyNotesHandler extends BaseNotesHandler {
    constructor(scene, notesData, strumlines, config) {
        super(scene, notesData, strumlines, config);
        
        this.enemyActiveHolds = { 0: null, 1: null, 2: null, 3: null };
        this.notesVisible = true; 
        this._loadPreferences();
    }

    _loadPreferences() {
        try {
            const stored = localStorage.getItem('genesis_preferences');
            if (stored) {
                const prefs = JSON.parse(stored);
                if (prefs && typeof prefs['opt-oppnotes'] !== 'undefined') {
                    this.notesVisible = prefs['opt-oppnotes'];
                }
            }
        } catch (e) {
            console.warn("[EnemyNotesHandler] Error cargando preferencias:", e);
        }
        
        if (this.notesGroup && !this.notesVisible) {
            this.notesGroup.setVisible(false);
        }
    }

    update(songPosition) {
        super.update(songPosition);

        // Forzar invisibilidad si la opción está activa
        if (!this.notesVisible) {
            if (this.notesGroup) this.notesGroup.setVisible(false);
            this.notesData.forEach(n => {
                if (n.spawned && n.holdContainer && n.holdContainer.visible) {
                    n.holdContainer.setVisible(false);
                }
            });
        }

        this.processBotLogic(songPosition);
    }

    processBotLogic(songPosition) {
        // Golpear notas
        for (const noteData of this.notesData) {
            if (noteData.spawned && !noteData.wasHit && !noteData.botProcessed) {
                if (songPosition >= noteData.strumTime) {
                    noteData.botProcessed = true;
                    this.hitEnemyNote(noteData);
                }
            }
        }

        // Soltar holds
        for (const direction in this.enemyActiveHolds) {
            const holdData = this.enemyActiveHolds[direction];
            if (!holdData) continue;
            
            const holdEndTime = holdData.strumTime + holdData.sustainLength;
            if (songPosition >= holdEndTime) {
                Strumline.setStaticFrame(this.strums, parseInt(direction, 10));
                this.enemyActiveHolds[direction] = null;
            }
        }
    }

    hitEnemyNote(noteData) {
        const direction = noteData.noteDirection;
        noteData.wasHit = true;

        // --- EMITIR EVENTO ---
        this.scene.events.emit(PlayEvents.NOTE_HIT, {
            note: noteData,
            rating: 'sick',
            isPlayer: false,
            direction: direction
        });
        // ---------------------

        const noteSprite = this.findNoteSprite(noteData);
        
        if (noteData.isHoldNote) {
            Strumline.playConfirmAnimation(this.strums, direction, true);
            this.enemyActiveHolds[direction] = noteData;
            noteData.isBeingHeld = true;

            if (noteData.holdContainer && !this.notesVisible) {
                noteData.holdContainer.setVisible(false);
            }

            if (noteSprite) {
                this.notesGroup.remove(noteSprite, false, false);
                noteSprite.setVisible(false);
                noteData.spriteRef = noteSprite; 
            }
        } else {
            Strumline.playConfirmAnimation(this.strums, direction, false);
            if (noteSprite) {
                this.notesGroup.remove(noteSprite, true, true);
            }
        }
    }

    findNoteSprite(noteData) {
        return this.notesGroup.getChildren().find(sprite => 
            sprite.noteData === noteData
        );
    }
}