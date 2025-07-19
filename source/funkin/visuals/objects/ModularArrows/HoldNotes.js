export class HoldNotes {
    constructor(scene, notesController) {
        this.scene = scene;
        this.notesController = notesController;
    }

    // Actualiza una hold note del jugador
    updateHoldNote(note, currentTime) {
        if (note.cleanedUp) return;

        const holdEndTime = note.strumTime + note.sustainLength;
        const directionIndex = note.noteDirection;
        const direction = this.notesController.directions[directionIndex];
        const arrow = this.notesController.strumlines.playerStrumline[directionIndex];
        const keyObj = this.notesController.keyBindings[direction][0];
        const isKeyDown = keyObj && keyObj.isDown;

        if (!note.isPlayerNote) return;

        if (note.holdSprites && note.holdSprites.length > 0 && note.holdContainer) {
            // Eliminar pieza por pieza mientras se presiona la nota y cruza la línea de golpeo
            const holdStartTime = note.strumTime;
            const holdDuration = note.sustainLength;
            const numPieces = note.holdSprites.length;
            const pieceHeight = note.holdPieceHeight || 32 * this.notesController.noteSpawner.defaultScale.holds;

            const strumPos = this.notesController.getStrumlinePositions(note.isPlayerNote)[directionIndex];
            const downScroll = localStorage.getItem("GAMEPLAY.NOTE SETTINGS.DOWNSCROLL") === "true";

            // Solo eliminar piezas si la nota está siendo presionada
            if (isKeyDown && !note.holdReleased) {
                for (let i = note.holdSegmentsDestroyed || 0; i < numPieces; i++) {
                    const piece = note.holdSprites[i];
                    if (!piece) continue;

                    // Calcular el tiempo en el que esta pieza toca la strumline
                    const pieceTime = holdStartTime + (holdDuration * (i / numPieces));
                    const scrollSpeed = 0.45 * this.notesController.speed * (this.notesController.currentBPM / 100);
                    const timeDiff = pieceTime - currentTime;
                    let pieceY;
                    if (downScroll) {
                        pieceY = strumPos.y - timeDiff * scrollSpeed;
                    } else {
                        pieceY = strumPos.y + timeDiff * scrollSpeed;
                    }
                    const containerY = note.holdContainer.y;
                    const pieceScreenY = containerY + (piece.y || 0);

                    // Si la pieza ya cruzó la línea de golpeo, eliminarla
                    const crossedLine = (downScroll && pieceScreenY >= strumPos.y + 54) || (!downScroll && pieceScreenY <= strumPos.y + 84);
                    if (crossedLine) {
                        piece.destroy();
                        note.holdSprites[i] = null;
                        note.holdSegmentsDestroyed = i + 1;
                    } else {
                        // Solo eliminar una pieza por frame
                        break;
                    }
                }
            }

            // Si se soltó la tecla antes de tiempo, eliminar el resto de piezas de golpe
            if (!isKeyDown && !note.holdReleased && currentTime < holdEndTime) {
                note.holdReleased = true;
                this.notesController.ratingManager.recordMiss();
                if (this.scene.healthBar) {
                    this.scene.healthBar.damage(this.notesController.healthConfig.missLoss);
                }
                // Eliminar todas las piezas restantes
                for (let i = note.holdSegmentsDestroyed || 0; i < numPieces; i++) {
                    const piece = note.holdSprites[i];
                    if (piece) piece.destroy();
                    note.holdSprites[i] = null;
                }
                note.holdSegmentsDestroyed = numPieces;
            }

            // Verificar si la nota debe ser limpiada
            if (currentTime >= holdEndTime || note.holdSegmentsDestroyed >= numPieces) {
                this.cleanUpHoldNote(note);
                this.notesController.activeHoldNotes[directionIndex] = null;
                note.holdEndPassed = true;
            }
        }
    }

    // Actualiza una hold note del enemigo
    updateEnemyHoldNote(note, currentTime) {
        if (note.cleanedUp) return;

        const holdEndTime = note.strumTime + note.sustainLength;
        const directionIndex = note.noteDirection;
        const direction = this.notesController.directions[directionIndex];
        const arrow = this.notesController.strumlines.enemyStrumline[directionIndex];

        if (note.holdSprites && note.holdSprites.length > 0 && note.holdContainer) {
            const holdStartTime = note.strumTime;
            const holdDuration = note.sustainLength;
            const numPieces = note.holdSprites.length;
            const pieceHeight = note.holdPieceHeight || 32 * this.notesController.noteSpawner.defaultScale.holds;

            const strumPos = this.notesController.getStrumlinePositions(note.isPlayerNote)[directionIndex];
            const downScroll = localStorage.getItem("GAMEPLAY.NOTE SETTINGS.DOWNSCROLL") === "true";

            for (let i = note.holdSegmentsDestroyed || 0; i < numPieces; i++) {
                const piece = note.holdSprites[i];
                if (!piece) continue;

                const pieceTime = holdStartTime + (holdDuration * (i / numPieces));
                const scrollSpeed = 0.45 * this.notesController.speed * (this.notesController.currentBPM / 100);
                const timeDiff = pieceTime - currentTime;
                let pieceY;
                if (downScroll) {
                    pieceY = strumPos.y - timeDiff * scrollSpeed;
                } else {
                    pieceY = strumPos.y + timeDiff * scrollSpeed;
                }
                const containerY = note.holdContainer.y;
                const pieceScreenY = containerY + (piece.y || 0);

                // Ajusta el umbral si lo deseas
                const crossedLine = (downScroll && pieceScreenY >= strumPos.y + 54) || (!downScroll && pieceScreenY <= strumPos.y + 84);
                if (crossedLine) {
                    piece.destroy();
                    note.holdSprites[i] = null;
                    note.holdSegmentsDestroyed = i + 1;

                    // Mantener la strumline en confirm mientras haya piezas
                    this.notesController.events.emit('strumlineStateChange', {
                        direction: directionIndex,
                        isPlayerNote: false,
                        state: 'confirm'
                    });

                    // Si es la última pieza, poner static tras destruirla
                    if (i === numPieces - 1 && arrow) {
                        note.isBeingHeld = false; // Marcar como ya no sostenida
                        this.notesController.scene.time.delayedCall(0, () => {
                            this.notesController.events.emit('strumlineStateChange', {
                                direction: directionIndex,
                                isPlayerNote: false,
                                state: 'static'
                            });
                        });
                    }
                } else {
                    // Solo eliminar una pieza por frame
                    break;
                }
            }

            // Si la nota termina o todas las piezas fueron destruidas, limpiar
            if (currentTime >= holdEndTime || note.holdSegmentsDestroyed >= numPieces) {
                this.cleanUpHoldNote(note);
                this.notesController.activeEnemyHoldNotes[directionIndex] = null;
                note.holdEndPassed = true;
            }
        

            // Si la nota termina o todas las piezas fueron destruidas, limpiar
            if (currentTime >= holdEndTime || note.holdSegmentsDestroyed >= numPieces) {
                this.cleanUpHoldNote(note);
                this.notesController.activeEnemyHoldNotes[directionIndex] = null;
                note.holdEndPassed = true;
            }
        }
    }

    // Limpia y destruye una hold note
    cleanUpHoldNote(note) {
        note.cleanedUp = true;
        this.notesController.noteSpawner.cleanUpNote(note);
    }
}
