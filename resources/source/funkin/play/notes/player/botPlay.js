import { PlayEvents } from "../../PlayEvents.js";

/**
 * Lógica del Botplay / Showcase Mode
 * @this {import('./PlayerNotesHandler').PlayerNotesHandler}
 */
export function toggleBotMode() {
    this.isBotPlay = !this.isBotPlay;
    this.updateBotPlayState();

    // Limpiar holds si se desactiva
    if (!this.isBotPlay) {
        for (let i = 0; i < 4; i++) {
            if (this.activeHolds[i]) {
                this.releaseHold(i, false);
            }
        }
    }
}

/**
 * Actualiza el estado visual y cámaras emitiendo un evento.
 * @this {import('./PlayerNotesHandler').PlayerNotesHandler}
 */
export function updateBotPlayState() {
    console.log("Player Botplay State:", this.isBotPlay);

    // --- ANTES: Llamada directa (Causante del Error) ---
    // this.scene.ratingText.setBotPlay(this.isBotPlay);
    // this.scene.cameraManager.UICamera.setVisible(...)

    // --- AHORA: Full Eventos ---
    // Emitimos que el estado cambió. RatingText y CameraManager escucharán.
    this.scene.events.emit(PlayEvents.BOTPLAY_CHANGED, this.isBotPlay);
}

/**
 * Procesa la lógica de golpeo automático de notas (Bot)
 * @this {import('./PlayerNotesHandler').PlayerNotesHandler}
 * @param {number} songPosition
 */
export function processBotLogic(songPosition) {
    // Golpear notas automáticamente
    for (const noteData of this.notesData) {
        if (noteData.spawned && !noteData.wasHit && !noteData.tooLate && !noteData.botProcessed) {
            if (songPosition >= noteData.strumTime) {
                noteData.botProcessed = true;
                // Encontrar sprite
                const sprite = this.notesGroup.getChildren().find(s => s.noteData === noteData);
                if (sprite || noteData.isHoldNote) {
                    this.hitNote(sprite, "sick", 0); // Bot siempre hace sick

                    if (noteData.isHoldNote) {
                        this.activeHolds[noteData.noteDirection] = { noteData: noteData };
                    }
                }
            }
        }
    }

    // Soltar holds automáticamente
    for (const direction in this.activeHolds) {
        const holdRef = this.activeHolds[direction];
        if (!holdRef || !holdRef.noteData) continue;

        const holdEndTime = holdRef.noteData.strumTime + holdRef.noteData.sustainLength;
        if (songPosition >= holdEndTime) {
            this.releaseHold(parseInt(direction, 10), false);
        }
    }
}