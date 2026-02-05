import { BaseNotesHandler } from "../BaseNotesHandler.js";
import { PlayerJudgement } from "../../judgments/PlayerJudgement.js";
import { _initInput } from "./initInput.js";
import { toggleBotMode, updateBotPlayState, processBotLogic } from "./botPlay.js";
import { onStrumPressed, onStrumReleased, hitNote, missNote, releaseHold, onHoldFinished } from "./inputLogic.js";

export class PlayerNotesHandler extends BaseNotesHandler {
    constructor(scene, notesData, strumlines, config) {
        super(scene, notesData, strumlines, config);

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
            // Verificar si alguna nota pasó su tiempo de hit y se convirtió en miss
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
        // Limpiar listeners de forma segura
        if (this.keyListeners) {
            this.keyListeners.forEach((keyObj) => {
                // [FIX] Verificar que keyObj existe y tiene el método 'off'
                if (keyObj && typeof keyObj.off === 'function') {
                    keyObj.off('down', keyObj._downHandler);
                    keyObj.off('up', keyObj._upHandler);
                }
            });
            this.keyListeners = [];
        }

        if (this.scene && this.scene.events) {
            this.scene.events.off('shutdown', this.onSceneShutdown, this);
        }

        // Destruir grupos de notas
        if (this.notesGroup) {
            this.notesGroup.destroy(true);
            this.notesGroup = null;
        }

        // Llamar al destroy de la clase base
        super.destroy();
    }
}