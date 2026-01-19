import { WeekScore } from '../data/WeekScore.js';
import { smEvents } from '../events/SMEventBus.js';

export class UpdateWeekScore {
    constructor(scene) {
        this.scene = scene;
        this.text = null;
        this.scoreData = new WeekScore(scene);
        this.currentDifficultyName = "normal"; 

        this.onWeekChangedBinding = this.onWeekChanged.bind(this);
        this.onDifficultyChangedBinding = this.onDifficultyChanged.bind(this);

        smEvents.on('week-changed', this.onWeekChangedBinding);
        smEvents.on('difficulty-changed', this.onDifficultyChangedBinding);
    }

    create() {
        this.text = this.scene.add.text(20, 10, "HIGH SCORE: 0", { 
            fontFamily: 'VCR', 
            fontSize: '32px', 
            color: '#FFFFFF' 
        }).setDepth(1000);
        this.scene.scoreText = this.text; 
    }

    onWeekChanged(data) {
        if (data && data.weekData) {
            this.update(data.weekData.weekName, this.currentDifficultyName);
        }
    }

    onDifficultyChanged(data) {
        this.currentDifficultyName = data.difficultyName;
        this.update(data.weekName, this.currentDifficultyName);
    }

    update(weekName, difficulty) {
        if (!this.text || !this.text.active) return;
        const score = this.scoreData.getScore(weekName, difficulty);
        this.text.setText(`HIGH SCORE: ${score}`);
    }

    destroy() {
        smEvents.off('week-changed', this.onWeekChangedBinding);
        smEvents.off('difficulty-changed', this.onDifficultyChangedBinding);
        if (this.text) this.text.destroy();
    }
}