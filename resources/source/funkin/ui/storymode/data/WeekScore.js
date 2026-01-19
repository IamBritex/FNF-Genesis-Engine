export class WeekScore {
    constructor(scene) {
        this.scene = scene;
    }

    getScore(weekName, difficulty) {
        if (!weekName) return 0;
        const weekKey = `weekScore_${weekName}_${difficulty}`;
        return parseInt(localStorage.getItem(weekKey) || "0");
    }

    saveScore(weekName, difficulty, score) {
        if (!weekName) return;
        const weekKey = `weekScore_${weekName}_${difficulty}`;
        const currentScore = this.getScore(weekName, difficulty);
        
        if (score > currentScore) {
            localStorage.setItem(weekKey, score.toString());
        }
    }
}