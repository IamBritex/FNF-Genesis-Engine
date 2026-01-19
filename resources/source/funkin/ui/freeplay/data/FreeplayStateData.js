/**
 * Gestiona el estado lógico del Freeplay (Selección, Dificultades, Puntajes).
 */
export class FreeplayStateData {
    constructor() {
        this.songs = [];
        this.curSelected = 0;
        this.curDifficulty = 1;
        this.lastDiff = 1;
    }

    setSongs(songs) {
        this.songs = songs || [];
        this.curSelected = 0;
    }

    changeSelection(change) {
        if (this.songs.length === 0) return;

        this.curSelected += change;

        if (this.curSelected < 0) this.curSelected = this.songs.length - 1;
        if (this.curSelected >= this.songs.length) this.curSelected = 0;

        const song = this.getCurrentSong();
        if (song.difficulties && this.curDifficulty >= song.difficulties.length) {
            this.curDifficulty = 0;
        }
    }

    changeDiff(change) {
        const song = this.getCurrentSong();
        if (!song || !song.difficulties) return;

        this.curDifficulty += change;

        if (this.curDifficulty < 0) this.curDifficulty = song.difficulties.length - 1;
        if (this.curDifficulty >= song.difficulties.length) this.curDifficulty = 0;
        
        this.lastDiff = this.curDifficulty;
    }

    getCurrentSong() {
        return this.songs[this.curSelected];
    }

    getCurrentDifficultyName() {
        const song = this.getCurrentSong();
        if (!song || !song.difficulties) return "NORMAL";
        return song.difficulties[this.curDifficulty].toUpperCase();
    }
    
    getCurrentDifficultyId() {
        const song = this.getCurrentSong();
        if (!song || !song.difficulties) return "normal";
        return song.difficulties[this.curDifficulty];
    }

    getCurrentScore() {
        return 0;
    }
}