import { SMInputHandler } from './input/SMInputHandler.js';
import { Background } from './display/Background.js';
import { SelectWeek } from './display/SelectWeek.js';
import { Titles } from './display/Titles.js';
import { Tracks } from './display/Tracks.js';
import { Phrase } from './display/Phrase.js';
import { UpdateWeekScore } from './display/UpdateWeekScore.js';
import { Difficulty } from './display/Difficulty.js';
import { SMCharacters } from './data/SMCharacters.js';
import { Characters } from './display/Characters.js'; 
import { SMDataShared } from './data/SMDataShared.js';
import { SMPlaylist } from './data/SMPlaylist.js';
import { smEvents } from './events/SMEventBus.js'; 

export class StoryMenuHandler {
    constructor(scene) {
        this.scene = scene;
        this.data = scene.smData; 
        this.dataFlow = scene.dataFlow;
        
        this.bgDisplay = new Background(scene);
        this.titlesDisplay = new Titles(scene);
        this.tracksDisplay = new Tracks(scene);
        this.phraseDisplay = new Phrase(scene);
        this.scoreDisplay = new UpdateWeekScore(scene);
        this.difficultyDisplay = new Difficulty(scene);
        this.selectWeekDisplay = new SelectWeek(scene);
        
        this.charDataHelper = new SMCharacters(scene);
        this.inputHandler = new SMInputHandler(this);

        this.activeSprites = [];
        
        // --- LISTENERS DE INTERACCIÓN UI ---
        this.onUiDifficultyChangeBinding = this.onUiDifficultyChange.bind(this);
        this.onUiWeekSelectBinding = this.onUiWeekSelect.bind(this);

        smEvents.on('ui-difficulty-change', this.onUiDifficultyChangeBinding);
        smEvents.on('ui-week-select', this.onUiWeekSelectBinding);
    }

    // Acción al dar click en flechas o imagen de dificultad
    onUiDifficultyChange(direction) {
        this.changeDifficulty(direction);
    }

    // Acción al dar click en un título de semana
    onUiWeekSelect(index) {
        // Si clickeas la semana que YA está seleccionada -> CONFIRMAR (Enter)
        if (this.data.selectedWeekIndex === index) {
            this.handleConfirm();
        } 
        // Si clickeas otra semana -> SELECCIONARLA (Saltar a ella)
        else {
            this.scene.sound.play('scrollSound');
            this.data.selectedWeekIndex = index;
            this.emitUpdate();
        }
    }

    create() {
        this.bgDisplay.create();
        this.titlesDisplay.create(this.data.weekKeys, this.data.weeks);
        this.tracksDisplay.create();
        this.phraseDisplay.create();
        this.scoreDisplay.create();
        
        this.difficultyDisplay.create(this.data.difficulties);
        this.selectWeekDisplay.create(this.data.difficulties); 
        
        this.emitUpdate();
    }

    setupInputs() {
        this.inputHandler.setup();
    }

    handleGamepadInput(time, delta) {
        this.inputHandler.update(time, delta);
    }

    async changeWeek(direction) {
        this.data.changeWeek(direction);
        this.emitUpdate();
    }

    changeDifficulty(direction) {
        if (direction === 0) return;
        this.data.changeDifficulty(direction);
        this.scene.sound.play('scrollSound');
        
        smEvents.emit('difficulty-changed', {
            difficultyIndex: this.data.selectedDifficulty,
            difficultyName: this.data.getCurrentDifficultyName(),
            weekName: this.data.getCurrentWeek().weekName,
            direction: direction 
        });
    }

    emitUpdate() {
        const currentWeek = this.data.getCurrentWeek();
        const weekIndex = this.data.selectedWeekIndex;

        smEvents.emit('week-changed', {
            weekData: currentWeek,
            weekIndex: weekIndex,
            weekKeys: this.data.weekKeys
        });

        this.dataFlow.loadCharactersForCurrentWeek().then(() => {
            this.updateCharacters(currentWeek);
        });
    }

    updateCharacters(weekData) {
        this.activeSprites.forEach(sprite => sprite.destroy());
        this.activeSprites = [];

        const charsToCreate = this.charDataHelper.getCharactersData(weekData);

        charsToCreate.forEach(config => {
            const charSprite = new Characters(this.scene, config.x, config.y, config.data);
            this.activeSprites.push(charSprite);
        });
    }

    handleConfirm() {
        if (!this.scene.canPressEnter) return;
        this.scene.canPressEnter = false;
        this.scene.sound.play('confirmSound');

        this.activeSprites.forEach(sprite => sprite.playConfirmAnim());
        
        smEvents.emit('week-confirmed', this.data.selectedWeekIndex);
        
        this.titlesDisplay.flash(this.data.selectedWeekIndex, () => {
            this.startWeekSequence();
        });
    }

    startWeekSequence() {
        const selectedWeekData = this.data.getCurrentWeek();
        const selectedWeekKey = this.data.getCurrentWeekKey();

        if (!selectedWeekData) {
             this.scene.canPressEnter = true;
             return; 
        }

        const playlistSongIds = SMPlaylist.getPlaylist(selectedWeekData);
        const storyData = SMDataShared.createPlaySceneData(
            selectedWeekData, 
            selectedWeekKey, 
            this.data.getCurrentDifficultyName()
        );

        this.scene.registry.set('PlaySceneData', storyData);
        this.selectWeekDisplay.startWeek(storyData);
    }

    handleBack() {
        if (!this.scene.canPressEnter) return;
        this.scene.sound.play('cancelSound');
        this.scene.scene.start("MainMenuScene");
    }

    destroy() {
        this.inputHandler.destroy();
        this.activeSprites.forEach(sprite => sprite.destroy());
        this.activeSprites = [];
        
        // Limpiar listeners propios
        smEvents.off('ui-difficulty-change', this.onUiDifficultyChangeBinding);
        smEvents.off('ui-week-select', this.onUiWeekSelectBinding);
        
        // Limpiar bus general
        smEvents.removeAllListeners();
    }
}