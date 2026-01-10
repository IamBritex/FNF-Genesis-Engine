import { BaseNotesHandler } from "../BaseNotesHandler.js";
import { PlayerJudgement } from "../../judgments/PlayerJudgement.js";
import { _initInput } from "./_initInput.js";
import { toggleBotMode, updateBotPlayState, processBotLogic } from "./_botPlay.js";
import { onStrumPressed, onStrumReleased, hitNote, missNote, releaseHold, onHoldFinished } from "./_inputLogic.js";

export class PlayerNotesHandler extends BaseNotesHandler {
    constructor(scene, notesData, strumlines, config, scoreManager) {
        super(scene, notesData, strumlines, config);

        this.scoreManager = scoreManager;
        this.activeInput = { 0: false, 1: false, 2: false, 3: false };
        this.gameplayInputListeners = [];
        this.isBotPlay = false;
        this.ghostTapEnabled = true;

        this._initInput();
    }

    _initInput() {
        _initInput.call(this);
    }

    toggleBotMode() {
        toggleBotMode.call(this);
    }

    updateBotPlayState() {
        updateBotPlayState.call(this);
    }

    update(songPosition) {
        super.update(songPosition);

        if (this.isBotPlay) {
            this.processBotLogic(songPosition);
        } else {
            const missedResults = PlayerJudgement.checkMisses(songPosition, this.notesGroup, this.activeHolds);
            missedResults.forEach((miss) => {
                this.missNote(miss.noteSprite, miss.noteData, miss.timeDiff);
            });
        }
    }

    processBotLogic(songPosition) {
        processBotLogic.call(this, songPosition);
    }

    onStrumPressed(direction) {
        onStrumPressed.call(this, direction);
    }

    onStrumReleased(direction) {
        onStrumReleased.call(this, direction);
    }

    hitNote(noteSprite, rating, timeDiff) {
        hitNote.call(this, noteSprite, rating, timeDiff);
    }

    missNote(noteSprite, noteData = null, timeDiff = null) {
        missNote.call(this, noteSprite, noteData, timeDiff);
    }

    releaseHold(direction, wasReleasedEarly) {
        releaseHold.call(this, direction, wasReleasedEarly);
    }

    onHoldFinished(noteData) {
        onHoldFinished.call(this, noteData);
    }

    destroy() {
        super.destroy();
        this.gameplayInputListeners.forEach(({ keyObj, downHandler, upHandler }) => {
            keyObj.off("down", downHandler);
            keyObj.off("up", upHandler);
        });
        this.gameplayInputListeners = [];
    }
}