import { BaseNotesHandler } from "../BaseNotesHandler.js";
import { Strumline } from "../Strumline.js";
import { NoteDirection } from "../NoteDirection.js";
import { PlayerJudgement } from "../../judgments/PlayerJudgement.js";
import { HitWindow } from "../../judgments/HitWindow.js";

export class PlayerNotesHandler extends BaseNotesHandler {
    constructor(scene, notesData, strumlines, config, scoreManager) {
        super(scene, notesData, strumlines, config);
        
        this.scoreManager = scoreManager;
        this.activeInput = { 0: false, 1: false, 2: false, 3: false };
        this.gameplayInputListeners = [];
        this.isBotPlay = false;

        this._initInput();
    }

    _initInput() {
        const keyMap = {
            A: NoteDirection.LEFT, S: NoteDirection.DOWN, W: NoteDirection.UP, D: NoteDirection.RIGHT,
            LEFT: NoteDirection.LEFT, DOWN: NoteDirection.DOWN, UP: NoteDirection.UP, RIGHT: NoteDirection.RIGHT,
        };

        Object.keys(keyMap).forEach((keyName) => {
            const direction = keyMap[keyName];
            const keyObj = this.scene.input.keyboard.addKey(keyName);

            const onDown = () => {
                if (this.scene.pauseHandler?.isPaused) return;
                if (this.isBotPlay) return;

                if (!this.activeInput[direction]) {
                    this.activeInput[direction] = true;
                    this.onStrumPressed(direction);
                }
            };

            const onUp = () => {
                if (this.scene.pauseHandler?.isPaused) return;
                if (this.isBotPlay) return;

                if (this.activeInput[direction]) {
                    this.activeInput[direction] = false;
                    this.onStrumReleased(direction);
                }
            };

            keyObj.on("down", onDown);
            keyObj.on("up", onUp);
            this.gameplayInputListeners.push({ keyObj, downHandler: onDown, upHandler: onUp });
        });

        // Botplay toggle
        const bKey = this.scene.input.keyboard.addKey("B");
        const onBotKey = () => {
             if (this.scene.pauseHandler?.isPaused) return;
             this.toggleBotMode();
        };
        bKey.on("down", onBotKey);
        this.gameplayInputListeners.push({ keyObj: bKey, downHandler: onBotKey, upHandler: () => {} });
    }

    toggleBotMode() {
        this.isBotPlay = !this.isBotPlay;
        console.log("Player Botplay:", this.isBotPlay);
        if (this.scene.ratingText) {
            this.scene.ratingText.setBotPlay(this.isBotPlay);
        }
        // Limpiar holds si se desactiva
        if (!this.isBotPlay) {
            for (let i = 0; i < 4; i++) {
                if (this.activeHolds[i]) {
                    this.releaseHold(i, false);
                }
            }
        }
    }

    update(songPosition) {
        // 1. Movimiento base
        super.update(songPosition);

        // 2. Botplay o Chequeo de Misses
        if (this.isBotPlay) {
            this.processBotLogic(songPosition);
        } else {
            // Verificar notas pasadas (Miss)
            const missedResults = PlayerJudgement.checkMisses(songPosition, this.notesGroup, this.activeHolds);
            missedResults.forEach((miss) => {
                this.missNote(miss.noteSprite, miss.noteData, miss.timeDiff);
            });
        }
    }

    processBotLogic(songPosition) {
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

    onStrumPressed(direction) {
        if (!this.activeHolds[direction]) {
            Strumline.playPressAnimation(this.strums, direction);
        }
        
        const songPosition = this.scene.songAudio?.inst?.seek * 1000 ?? 0;
        const result = PlayerJudgement.judgeInput(direction, songPosition, this.notesGroup);

        if (result.note) {
            this.hitNote(result.note, result.rating, result.timeDiff);
        } else {
            // Ghost tapping logic opcional aquí (si quisieras penalizar clicks al aire)
        }
    }

    onStrumReleased(direction) {
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

    hitNote(noteSprite, rating, timeDiff) {
        if (noteSprite && !noteSprite.active) return;
        
        // Recuperar data (puede venir del sprite o si es bot, directo de data)
        const noteData = noteSprite ? noteSprite.noteData : null; 
        if (!noteData || noteData.wasHit) return;

        noteData.wasHit = true;

        // 1. Animación Personaje
        if (this.charactersHandler) {
            this.charactersHandler.playSingAnimation(true, noteData.noteDirection);
        }

        // 2. Voces
        if (this.scene.chartData.needsVoices && this.scene.songAudio?.voices?.[0]) {
            this.scene.songAudio.voices[0].setVolume(1);
        }

        // 3. Puntuación y UI
        if (this.scene.popUpManager) this.scene.popUpManager.popUpScore(rating);
        if (this.scoreManager) this.scoreManager.processHit(rating, timeDiff);

        // 4. Gestión Visual
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

    missNote(noteSprite, noteData = null, timeDiff = null) {
        const dataToUse = noteData || noteSprite?.noteData;
        if (!dataToUse || dataToUse.tooLate) return;

        dataToUse.tooLate = true;

        if (this.scoreManager) this.scoreManager.processMiss();
        
        // Silenciar voz
        if (this.scene.chartData.needsVoices && this.scene.songAudio?.voices?.[0]) {
            this.scene.songAudio.voices[0].setVolume(0);
        }

        if (this.charactersHandler) {
            this.charactersHandler.playMissAnimation(true, dataToUse.noteDirection);
        }

        if (this.scene.popUpManager) this.scene.popUpManager.popUpScore("miss");

        // Sonido de fallo
        const missSoundKey = `missnote${Phaser.Math.Between(1, 3)}`;
        if (this.scene.cache.audio.has(missSoundKey)) {
            this.scene.sound.play(missSoundKey, { volume: 0.6 });
        }

        // Visual de nota gris
        if (noteSprite && noteSprite.active) {
            noteSprite.setTint(0x808080).setAlpha(0.6);
        }
        
        // Si era un hold, limpiarlo
        if (dataToUse.isHoldNote && this.activeHolds[dataToUse.noteDirection]?.noteData === dataToUse) {
            this.releaseHold(dataToUse.noteDirection, false);
        }
    }

    releaseHold(direction, wasReleasedEarly) {
        const holdRef = this.activeHolds[direction];
        if (!holdRef || !holdRef.noteData) return;
        
        const noteData = holdRef.noteData;
        noteData.isBeingHeld = false;
        this.activeHolds[direction] = null;
        
        Strumline.setStaticFrame(this.strums, direction);

        if (wasReleasedEarly) {
            this.missNote(null, noteData, Infinity);
        } else {
            // Limpieza normal si terminó bien
            if (noteData.spriteRef) {
                noteData.spriteRef.destroy();
                noteData.spriteRef = null;
            }
        }
    }
    
    // Sobrescritura del hook de Base
    onHoldFinished(noteData) {
        // Cuando un hold termina naturalmente, simular input release si no está en botplay
        if (this.isBotPlay) return;

        const direction = noteData.noteDirection;
        if (this.activeInput[direction]) {
             Strumline.playPressAnimation(this.strums, parseInt(direction, 10));
        } else {
             Strumline.setStaticFrame(this.strums, parseInt(direction, 10));
             this.activeHolds[direction] = null;
        }
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