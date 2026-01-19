import { SMPlaylist } from './SMPlaylist.js';

export class SMDataShared {
    /**
     * @param {Object} weekData - Datos crudos de la semana
     * @param {string} weekKey - ID de la semana
     * @param {string} difficultyName - Nombre de la dificultad (easy, normal, hard)
     */
    static createPlaySceneData(weekData, weekKey, difficultyName) {
        const playlist = SMPlaylist.getPlaylist(weekData);

        return {
            isStoryMode: true,
            playlistSongIds: playlist,
            Score: 0,
            storyTitle: weekData.weekName || "Unknown Week",
            DifficultyID: difficultyName,
            WeekId: weekKey,
            targetSongId: playlist[0] || null,
            currentSongIndex: 0
        };
    }
}