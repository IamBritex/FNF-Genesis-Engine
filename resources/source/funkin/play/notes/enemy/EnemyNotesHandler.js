import { BaseNotesHandler } from "../BaseNotesHandler.js";
import { Strumline } from "../Strumline.js";
import { NoteDirection } from "../NoteDirection.js";

export class EnemyNotesHandler extends BaseNotesHandler {
    constructor(scene, notesData, strumlines, config) {
        super(scene, notesData, strumlines, config);
        
        // Mapa de holds activos específicos para la lógica de CPU
        this.enemyActiveHolds = { 0: null, 1: null, 2: null, 3: null };

        // --- VISIBILIDAD DE NOTAS (opt-oppnotes) ---
        this.notesVisible = true; // Valor por defecto
        this._loadPreferences();
    }

    _loadPreferences() {
        try {
            const stored = localStorage.getItem('genesis_preferences');
            if (stored) {
                const prefs = JSON.parse(stored);
                // Si existe la propiedad, la usamos. Si no, se mantiene true por defecto.
                if (prefs && typeof prefs['opt-oppnotes'] !== 'undefined') {
                    this.notesVisible = prefs['opt-oppnotes'];
                }
            }
        } catch (e) {
            console.warn("[EnemyNotesHandler] Error cargando preferencias opt-oppnotes:", e);
        }

        console.log(`[EnemyNotesHandler] Notas del oponente visibles: ${this.notesVisible}`);
        
        // Aplicar inmediatamente si el grupo ya existe
        if (this.notesGroup && !this.notesVisible) {
            this.notesGroup.setVisible(false);
        }
    }

    update(songPosition) {
        // 1. Movimiento base
        super.update(songPosition);

        // Forzar invisibilidad si la opción está desactivada
        if (!this.notesVisible) {
            if (this.notesGroup) this.notesGroup.setVisible(false);

            // Asegurar que las colas (sustain) también se oculten si no están en el grupo
            this.notesData.forEach(n => {
                // Solo ocultamos las que no han sido golpeadas aquí (las golpeadas se manejan en hitEnemyNote)
                // o las que siguen visibles por error.
                if (n.spawned && n.holdContainer && n.holdContainer.visible) {
                    n.holdContainer.setVisible(false);
                }
            });
        }

        // 2. Lógica de CPU (Bot)
        this.processBotLogic(songPosition);
    }

    processBotLogic(songPosition) {
        // Golpear notas nuevas
        for (const noteData of this.notesData) {
            if (noteData.spawned && !noteData.wasHit && !noteData.botProcessed) {
                if (songPosition >= noteData.strumTime) {
                    noteData.botProcessed = true;
                    this.hitEnemyNote(noteData);
                }
            }
        }

        // Soltar notas largas (holds)
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

        // 1. Animación del Personaje
        if (this.charactersHandler) {
            this.charactersHandler.playSingAnimation(false, direction);
        }

        // 2. Gestión visual
        const noteSprite = this.findNoteSprite(noteData);
        
        if (noteData.isHoldNote) {
            // [ANIMACIÓN] El brillo del receptor SIEMPRE se muestra
            Strumline.playConfirmAnimation(this.strums, direction, true);

            this.enemyActiveHolds[direction] = noteData;
            noteData.isBeingHeld = true;

            // [CORRECCIÓN CRÍTICA]
            // Antes se ocultaba siempre con .setVisible(false). 
            // Ahora SOLO se oculta si la opción de invisibilidad está ACTIVA.
            // Si son visibles, dejamos el contenedor visible para que se consuma visualmente.
            if (noteData.holdContainer && !this.notesVisible) {
                noteData.holdContainer.setVisible(false);
            }

            if (noteSprite) {
                // Sacar del grupo para gestión individual
                this.notesGroup.remove(noteSprite, false, false);
                
                // La cabeza de la nota SIEMPRE se oculta al golpearla (se consume)
                noteSprite.setVisible(false);

                noteData.spriteRef = noteSprite; 
            }
        } else {
            // Nota normal
            Strumline.playConfirmAnimation(this.strums, direction, false);

            if (noteSprite) {
                this.notesGroup.remove(noteSprite, true, true);
            }
        }
    }

    findNoteSprite(noteData) {
        return this.notesGroup.getChildren().find(sprite => 
            sprite.noteData && 
            sprite.noteData.strumTime === noteData.strumTime && 
            sprite.noteData.noteDirection === noteData.noteDirection
        );
    }
}