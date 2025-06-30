export class HoldNotes {
    constructor(scene, notesController) {
        this.scene = scene;
        this.notesController = notesController;
    }

    // Actualiza una hold note del jugador
    updateHoldNote(note, currentTime) {
        if (note.cleanedUp) return;
        
        const elapsedTime = currentTime - note.strumTime;
        const totalDuration = note.sustainLength;
        const progressRatio = Math.min(1, elapsedTime / totalDuration);
        const segmentsToDestroy = Math.floor(progressRatio * note.holdSprites.length);

        // Destruir segmentos que deben desaparecer
        for (let i = note.holdSegmentsDestroyed; i < segmentsToDestroy; i++) {
            if (i < note.holdSprites.length) {
                const sprite = note.holdSprites[i];
                if (sprite && sprite.active) {
                    sprite.destroy();
                    note.holdSprites[i] = null;
                }
            }
        }
        note.holdSegmentsDestroyed = segmentsToDestroy;

        const holdEndTime = note.strumTime + note.sustainLength;
        const directionIndex = note.noteDirection;
        const direction = this.notesController.directions[directionIndex];
        const arrow = this.notesController.strumlines.playerStrumline[directionIndex];
        const keyObj = this.notesController.keyBindings[direction][0];
        const isKeyDown = keyObj && keyObj.isDown;
        const strumPos = this.notesController.getStrumlinePositions(true)[directionIndex];
        const holdOffset = this.notesController.offsets.hold;
        const downScroll = localStorage.getItem('GAMEPLAY.NOTE SETTINGS.DOWNSCROLL') === 'true';
        const destroyOffset = 570; // Ajusta este valor a tu gusto

        if (!note.isPlayerNote) return;

        if (note.holdSprites && note.holdSprites.length > 0 && note.holdContainer && note.sprite) {
            // Destruir segmentos cuando pasan la strumline
            if (note.isBeingHeld && isKeyDown) {
                let segmentDestroyed = false;

                // Revisar cada segmento y destruir si pasa la strumline
                for (let i = 0; i < note.holdSprites.length; i++) {
                    const sprite = note.holdSprites[i];
                    if (sprite && sprite.active) {
                        // Obtener posición global del segmento
                        const spriteWorld = sprite.getWorldTransformMatrix();
                        const spriteY = sprite.parentContainer
                            ? sprite.parentContainer.y + sprite.y
                            : sprite.y;
                        const spriteHeight = sprite.displayHeight;
                        const spriteTop = spriteY;
                        const spriteBottom = spriteY + spriteHeight;

                        // Detectar colisión basada en scroll direction
                        if (
                            (!downScroll && spriteBottom >= strumPos.y + destroyOffset) ||
                            (downScroll && spriteTop <= strumPos.y - destroyOffset)
                        ) {
                            sprite.destroy();
                            note.holdSprites[i] = null;
                            segmentDestroyed = true;

                            // Si es el último segmento, limpiar toda la nota
                            if (i === note.holdSprites.length - 1) {
                                this.cleanUpHoldNote(note);
                                this.notesController.activeHoldNotes[directionIndex] = null;
                                note.holdEndPassed = true;
                            }
                            break;
                        }
                    }
                }

                // Mantener flecha en estado de confirmación
                const confirmPos = this.notesController.getStrumlinePositions(true)[directionIndex];
                arrow.setPosition(confirmPos.x, confirmPos.y)
                    .setTexture('noteStrumline', `confirm${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`)
                    .setScale(this.notesController.strumlines.defaultScale.confirm);

                // Puntuación mientras se mantiene presionada
                if (currentTime - note.holdScoreTime >= this.notesController.holdScoreInterval) {
                    this.notesController.score += this.notesController.holdScoreRate;
                    note.holdScoreTime = currentTime;

                    if (currentTime - note.lastHoldHealthTime >= this.notesController.healthConfig.holdRate) {
                        if (this.scene.healthBar) {
                            this.scene.healthBar.heal(this.notesController.healthConfig.holdGain);
                        }
                        note.lastHoldHealthTime = currentTime;
                    }
                }

                // Resetear idleTimer del personaje
                const character = this.scene.characters?.loadedCharacters.get(this.scene.characters?.currentPlayer);
                if (character) {
                    character.idleTimer = 0;
                }
            } else if (!note.holdReleased && currentTime < holdEndTime) {
                // Si se soltó la tecla antes de tiempo
                note.holdReleased = true;
                this.notesController.ratingManager.recordMiss();
                if (this.scene.healthBar) {
                    this.scene.healthBar.damage(this.notesController.healthConfig.missLoss);
                }
            }

            // Verificar si la nota debe ser limpiada
            if (currentTime >= holdEndTime) {
                this.cleanUpHoldNote(note);
                this.notesController.activeHoldNotes[directionIndex] = null;
                note.holdEndPassed = true;
            }
        }
    }

    // Actualiza una hold note del enemigo
    updateEnemyHoldNote(note, currentTime) {
        if (note.cleanedUp) return;
        
        const elapsedTime = currentTime - note.strumTime;
        const totalDuration = note.sustainLength;
        const progressRatio = Math.min(1, elapsedTime / totalDuration);
        const segmentsToDestroy = Math.floor(progressRatio * note.holdSprites.length);

        // Destruir segmentos que deben desaparecer
        for (let i = note.holdSegmentsDestroyed; i < segmentsToDestroy; i++) {
            if (i < note.holdSprites.length) {
                const sprite = note.holdSprites[i];
                if (sprite && sprite.active) {
                    sprite.destroy();
                    note.holdSprites[i] = null;
                }
            }
        }
        note.holdSegmentsDestroyed = segmentsToDestroy;

        const holdEndTime = note.strumTime + note.sustainLength;
        const directionIndex = note.noteDirection;
        const direction = this.notesController.directions[directionIndex];
        const arrow = this.notesController.strumlines.enemyStrumline[directionIndex];
        const strumPos = this.notesController.getStrumlinePositions(false)[directionIndex];
        const holdOffset = this.notesController.offsets.hold;
        const downScroll = localStorage.getItem('GAMEPLAY.NOTE SETTINGS.DOWNSCROLL') === 'true';
        const destroyOffset = 20; // Ajusta este valor a tu gusto

        if (note.holdSprites && note.holdSprites.length > 0 && note.holdContainer && note.sprite) {
            // Destruir segmentos cuando pasan la strumline
            if (note.enemyHoldActive) {
                let segmentDestroyed = false;

                for (let i = 0; i < note.holdSprites.length; i++) {
                    const sprite = note.holdSprites[i];
                    if (sprite && sprite.active) {
                        // Obtener posición global del segmento
                        const spriteWorld = sprite.getWorldTransformMatrix();
                        const spriteY = sprite.parentContainer
                            ? sprite.parentContainer.y + sprite.y
                            : sprite.y;
                        const spriteHeight = sprite.displayHeight;
                        const spriteTop = spriteY;
                        const spriteBottom = spriteY + spriteHeight;

                        // Detectar colisión basada en scroll direction
                        if (
                            (!downScroll && spriteBottom >= strumPos.y + destroyOffset) ||
                            (downScroll && spriteTop <= strumPos.y - destroyOffset)
                        ) {
                            sprite.destroy();
                            note.holdSprites[i] = null;
                            segmentDestroyed = true;

                            // Si es el último segmento, limpiar toda la nota
                            if (i === note.holdSprites.length - 1) {
                                this.cleanUpHoldNote(note);
                                note.enemyHoldActive = false;
                                note.holdEndPassed = true;

                                // Volver a estado estático
                                arrow.x = arrow.originalX;
                                arrow.y = arrow.originalY;
                                arrow.setTexture('noteStrumline', `static${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`);
                                arrow.setScale(this.notesController.strumlines.defaultScale.static);
                            }
                            break;
                        }
                    }
                }

                // Mantener flecha en estado de confirmación
                const confirmPos = this.notesController.getStrumlinePositions(false)[directionIndex];
                arrow.setPosition(confirmPos.x, confirmPos.y)
                    .setTexture('noteStrumline', `confirm${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`)
                    .setScale(this.notesController.strumlines.defaultScale.confirm);

                // Resetear idleTimer del personaje
                const character = this.scene.characters?.loadedCharacters.get(this.scene.characters?.currentEnemy);
                if (character) {
                    character.idleTimer = 0;
                }
            }

            // Verificar si la nota debe ser limpiada
            if (currentTime >= holdEndTime) {
                this.cleanUpHoldNote(note);
                note.enemyHoldActive = false;
                note.holdEndPassed = true;

                // Volver a estado estático
                arrow.x = arrow.originalX;
                arrow.y = arrow.originalY;
                arrow.setTexture('noteStrumline', `static${direction.charAt(0).toUpperCase() + direction.slice(1)}0001`);
                arrow.setScale(this.notesController.strumlines.defaultScale.static);
            }
        }
    }

    // Limpia y destruye una hold note
    cleanUpHoldNote(note) {
        if (note.sprite?.active) {
            note.sprite.destroy();
            note.sprite = null;
        }
        if (note.holdSprites) {
            note.holdSprites.forEach(sprite => {
                if (sprite?.active) sprite.destroy();
            });
            note.holdSprites = [];
        }
        if (note.holdContainer?.active) {
            note.holdContainer.destroy();
            note.holdContainer = null;
        }
        note.isBeingHeld = false;
        note.enemyHoldActive = false;
        note.holdReleased = true;
        note.holdEndPassed = true;
        note.wasHit = true;
        note.tooLate = true;
        note.cleanedUp = true;
    }
}
