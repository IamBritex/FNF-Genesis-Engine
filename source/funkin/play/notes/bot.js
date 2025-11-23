import { Strumline } from "./Strumline.js";
import { HitWindow } from '../judgments/HitWindow.js';

/**
 * BotAutoHandler.js
 * Se encarga de la lógica del bot para golpear
 * las notas del enemigo Y (si se activa) las del jugador.
 */
export class BotAutoHandler {

    constructor(notesHandler, isEnemyBotActive = true) {
        this.notesHandler = notesHandler;
        
        this.isEnemyBotActive = isEnemyBotActive;
        this.isPlayerBotActive = false;
        
        this.enemyActiveHolds = { 0: null, 1: null, 2: null, 3: null }; 
        this.playerActiveHolds = { 0: null, 1: null, 2: null, 3: null }; 

        /**
         * @type {import('../characters/Characters.js').Characters | null}
         */
        this.charactersHandler = null;
    }

    /**
     * Recibe la referencia al CharactersHandler desde NotesHandler.
     * @param {import('../characters/Characters.js').Characters} handler
     */
    setCharactersHandler(handler) {
        this.charactersHandler = handler;
    }

    togglePlayerBot() {
        this.isPlayerBotActive = !this.isPlayerBotActive;
        console.log("Player Botplay:", this.isPlayerBotActive);

        if (!this.isPlayerBotActive) {
            for (let i = 0; i < 4; i++) {
                if (this.playerActiveHolds[i]) {
                    Strumline.setStaticFrame(this.notesHandler.playerStrums, i);
                    this.playerActiveHolds[i] = null;
                }
                if (this.notesHandler.activeHolds[i]) {
                    this.notesHandler.activeHolds[i] = null;
                }
            }
        }
    }

    update(songPosition) {
        const nh = this.notesHandler;

        for (const noteData of nh.parsedNotes) {
            
            if (noteData.tooLate || noteData.botProcessed) {
                continue;
            }

            if (noteData.isPlayerNote) {
                if (this.isPlayerBotActive && songPosition >= noteData.strumTime) {
                    noteData.botProcessed = true;
                    this.hitPlayerNote(noteData);
                }
            } else {
                if (this.isEnemyBotActive && songPosition >= noteData.strumTime) {
                    noteData.botProcessed = true;
                    this.hitEnemyNote(noteData);
                }
            }
        }

        for (const direction in this.enemyActiveHolds) {
            const holdData = this.enemyActiveHolds[direction];
            if (!holdData) continue;
            const holdEndTime = holdData.strumTime + holdData.sustainLength;
            if (songPosition >= holdEndTime) {
                Strumline.setStaticFrame(nh.enemyStrums, parseInt(direction, 10));
                this.enemyActiveHolds[direction] = null;
            }
        }

        for (const direction in this.playerActiveHolds) {
            const holdData = this.playerActiveHolds[direction];
            if (!holdData) continue;
            const holdEndTime = holdData.strumTime + holdData.sustainLength;
            if (songPosition >= holdEndTime) {
                nh.releaseHold(parseInt(direction, 10), false);
                this.playerActiveHolds[direction] = null;
            }
        }
    }

    /**
     * Lógica para "golpear" una nota del ENEMIGO
     */
    hitEnemyNote(noteData) {
        const nh = this.notesHandler;
        const direction = noteData.noteDirection;
        
        // 1. Marcar la nota como golpeada (en el array de datos)
        noteData.wasHit = true; 

        // 2. Tocar la animación de canto
        if (this.charactersHandler) {
            this.charactersHandler.playSingAnimation(false, direction); 
        }

        // 3. Encontrar el sprite
        // (Esto ahora funcionará gracias a la corrección en findNoteSprite)
        let noteSprite = this.findNoteSprite(nh.enemyNotesGroup, noteData);

        // 4. Procesar y eliminar el sprite
        if (noteData.isHoldNote) {
            Strumline.playConfirmAnimation(nh.enemyStrums, direction, true);
            this.enemyActiveHolds[direction] = noteData;
            noteData.isBeingHeld = true; 
            
            if (noteSprite) {
                nh.enemyNotesGroup.remove(noteSprite, false, false); 
                noteSprite.setVisible(false);
                noteData.spriteRef = noteSprite;
            }
        } else {
            Strumline.playConfirmAnimation(nh.enemyStrums, direction, false);
            if (noteSprite) {
                // ¡Aquí es donde se elimina la nota normal del enemigo!
                nh.enemyNotesGroup.remove(noteSprite, true, true);
            }
        }
    }

    /**
     * Lógica para "golpear" una nota del JUGADOR.
     */
    hitPlayerNote(noteData) {
        const nh = this.notesHandler;

        let noteSprite = this.findNoteSprite(nh.playerNotesGroup, noteData);

        if (!noteSprite && !noteData.isHoldNote) {
             return;
        }

        const timeDiff = 0;
        const rating = HitWindow.judge(timeDiff); 

        // Llamar a la función real de hitNote
        nh.hitNote(noteSprite, rating, timeDiff);

        if (noteData.isHoldNote) {
            this.playerActiveHolds[noteData.noteDirection] = noteData;
        }
    }


    // --- [CORREGIDO] ---
    /**
     * Función de utilidad para encontrar el sprite de una nota.
     * Se eliminó la comprobación de '!sprite.noteData.wasHit'
     * que estaba causando el conflicto en 'hitEnemyNote'.
     */
    findNoteSprite(group, noteData) {
        return group.getChildren().find(sprite => 
            sprite.noteData && 
            // !sprite.noteData.wasHit && // <--- ESTA LÍNEA CAUSABA EL ERROR (se eliminó)
            sprite.noteData.strumTime === noteData.strumTime && 
            sprite.noteData.noteDirection === noteData.noteDirection
        );
    }
    // --- [FIN DE LA CORRECCIÓN] ---

    shutdown() {
        this.enemyActiveHolds = { 0: null, 1: null, 2: null, 3: null };
        this.playerActiveHolds = { 0: null, 1: null, 2: null, 3: null };
        
        this.charactersHandler = null; 
        
        this.notesHandler = null;
    }
}