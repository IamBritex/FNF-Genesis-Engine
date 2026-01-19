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
 * Actualiza el estado visual y cámaras según el Botplay
 * @this {import('./PlayerNotesHandler').PlayerNotesHandler}
 */
export function updateBotPlayState() {
    console.log("Player Botplay State:", this.isBotPlay);

    // Notificar al texto de rating (si existe)
    if (this.scene.ratingText) {
        this.scene.ratingText.setBotPlay(this.isBotPlay);
    }

    // Lógica de Showcase: Ocultar/Mostrar las cámaras de UI y HUD
    if (this.scene.cameraManager) {
        const uiCam = this.scene.cameraManager.UICamera;
        const hudCam = this.scene.cameraManager.HUDCamera;

        // Si es BotPlay -> Ocultar UI (visible = false). Si no -> Mostrar UI (visible = true)
        const isVisible = !this.isBotPlay;

        if (uiCam) {
            uiCam.setVisible(isVisible);
            console.log(`[PlayerNotesHandler] UICamera visible: ${isVisible}`);
        }
        if (hudCam) {
            hudCam.setVisible(isVisible);
            console.log(`[PlayerNotesHandler] HUDCamera visible: ${isVisible}`);
        }
    }
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