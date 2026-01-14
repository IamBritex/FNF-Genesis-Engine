import { Strumline } from "../Strumline.js";
import { PlayerJudgement } from "../../judgments/PlayerJudgement.js";
import { HitWindow } from "../../judgments/HitWindow.js";
import { NoteDirection } from "../NoteDirection.js";

/**
 * Lógica de procesamiento de inputs y notas del jugador.
 * @this {import('./PlayerNotesHandler.js').PlayerNotesHandler}
 */

export function onStrumPressed(direction) {
    if (!this.activeHolds[direction]) {
        Strumline.playPressAnimation(this.strums, direction);
    }

    const songPosition = this.scene.songAudio?.inst?.seek * 1000 ?? 0;
    const result = PlayerJudgement.judgeInput(direction, songPosition, this.notesGroup);

    if (result.note) {
        this.hitNote(result.note, result.rating, result.timeDiff);
    } else {
        // Lógica de Ghost Tapping
        if (!this.ghostTapEnabled) {
            this.missNote(null, { noteDirection: direction }, Infinity);
        }
    }
}

export function onStrumReleased(direction) {
    const activeHoldData = this.activeHolds[direction]?.noteData;

    if (activeHoldData) {
        const songPosition = (this.scene.songAudio?.inst?.seek * 1000) ?? 0;
        const noteEndTime = activeHoldData.strumTime + activeHoldData.sustainLength;

        // Si soltó muy temprano, es miss
        if (songPosition < noteEndTime - HitWindow.SHIT_WINDOW_MS && !activeHoldData.holdEndPassed) {
            this.releaseHold(direction, true); // true = early release
        } else {
            this.releaseHold(direction, false);
        }
    } else {
        Strumline.setStaticFrame(this.strums, direction);
    }
}

export function hitNote(noteSprite, rating, timeDiff) {
    if (noteSprite && !noteSprite.active) return;

    const noteData = noteSprite ? noteSprite.noteData : null;
    if (!noteData || noteData.wasHit) return;

    noteData.wasHit = true;

    if (this.charactersHandler) {
        this.charactersHandler.playSingAnimation(true, noteData.noteDirection);
    }

    if (this.scene.chartData.needsVoices && this.scene.songAudio?.voices?.[0]) {
        this.scene.songAudio.voices[0].setVolume(1);
    }

    if (this.scene.popUpManager) this.scene.popUpManager.popUpScore(rating);
    if (this.scoreManager) this.scoreManager.processHit(rating, timeDiff);

    if (noteData.isHoldNote) {
        noteData.isBeingHeld = true;
        this.activeHolds[noteData.noteDirection] = { noteData: noteData };
        Strumline.playConfirmAnimation(this.strums, noteData.noteDirection, true);

        if (noteSprite) {
            this.notesGroup.remove(noteSprite, false, false);
            noteSprite.setVisible(false);
            noteData.spriteRef = noteSprite;
        }
    } else {
        Strumline.playConfirmAnimation(this.strums, noteData.noteDirection, false);
        if (noteSprite) {
            this.notesGroup.remove(noteSprite, true, true);
        }
    }
}

export function missNote(noteSprite, noteData = null, timeDiff = null) {
    const dataToUse = noteData || noteSprite?.noteData;
    if (!dataToUse || dataToUse.tooLate) return;

    dataToUse.tooLate = true;

    if (this.scoreManager) this.scoreManager.processMiss();

    if (this.scene.chartData.needsVoices && this.scene.songAudio?.voices?.[0]) {
        this.scene.songAudio.voices[0].setVolume(0);
    }

    if (this.charactersHandler) {
        this.charactersHandler.playMissAnimation(true, dataToUse.noteDirection);
    }

    if (this.scene.popUpManager) this.scene.popUpManager.popUpScore("miss");

    const missSoundKey = `missnote${Phaser.Math.Between(1, 3)}`;
    if (this.scene.cache.audio.has(missSoundKey)) {
        this.scene.sound.play(missSoundKey, { volume: 0.6 });
    }

    if (noteSprite && noteSprite.active) {
        noteSprite.setTint(0x808080).setAlpha(0.6);
    }

    if (dataToUse.isHoldNote && this.activeHolds[dataToUse.noteDirection]?.noteData === dataToUse) {
        this.releaseHold(dataToUse.noteDirection, false);
    }
}

export function releaseHold(direction, wasReleasedEarly) {
    const holdRef = this.activeHolds[direction];
    if (!holdRef || !holdRef.noteData) return;

    const noteData = holdRef.noteData;
    noteData.isBeingHeld = false;
    this.activeHolds[direction] = null;

    Strumline.setStaticFrame(this.strums, direction);

    if (wasReleasedEarly) {
        this.missNote(null, noteData, Infinity);
    } else {
        if (noteData.spriteRef) {
            noteData.spriteRef.destroy();
            noteData.spriteRef = null;
        }
    }
}

export function onHoldFinished(noteData) {
    if (this.isBotPlay) return;

    const direction = noteData.noteDirection;
    if (this.activeInput[direction]) {
        Strumline.playPressAnimation(this.strums, parseInt(direction, 10));
    } else {
        Strumline.setStaticFrame(this.strums, parseInt(direction, 10));
        this.activeHolds[direction] = null;
    }
}