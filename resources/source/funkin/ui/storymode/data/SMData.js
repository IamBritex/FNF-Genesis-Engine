export class SMData {
    constructor() {
        // Datos principales
        this.weeks = {};
        this.weekKeys = [];
        this.difficulties = ["easy", "normal", "hard"];
        
        // Estado de la selección
        this.selectedWeekIndex = 0;
        this.selectedDifficulty = 1;
        
        // Caché de recursos lógicos
        this.characterCache = {};
    }

    // --- Métodos de Gestión de Estado ---

    changeWeek(direction) {
        this.selectedWeekIndex = (this.selectedWeekIndex + direction + this.weekKeys.length) % this.weekKeys.length;
    }

    changeDifficulty(direction) {
        this.selectedDifficulty = (this.selectedDifficulty + direction + this.difficulties.length) % this.difficulties.length;
    }

    getCurrentWeek() {
        if (this.weekKeys.length === 0) return null;
        return this.weeks[this.weekKeys[this.selectedWeekIndex]];
    }

    getCurrentWeekKey() {
        if (this.weekKeys.length === 0) return null;
        return this.weekKeys[this.selectedWeekIndex];
    }

    getCurrentDifficultyName() {
        return this.difficulties[this.selectedDifficulty];
    }
}