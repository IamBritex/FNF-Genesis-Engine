export class DataManager {
  constructor(scene) {
      this.scene = scene;
      this.isDataVisible = false;
      this.isGridVisible = false;
      this.dataTexts = [];
      this.gridLines = [];
      this.startTime = 0;
  }

  init(data) {
      this.isStoryMode = data.isStoryMode || false;
      this.storyPlaylist = data.storyPlaylist || [];
      this.songList = data.songList || data.storyPlaylist || [];
      this.currentSongIndex = data.currentSongIndex || 0;
      this.storyDifficulty = data.storyDifficulty || data.selectedDifficulty || 'normal';
      this.campaignScore = data.campaignScore || 0;
      this.campaignMisses = data.campaignMisses || 0;
      
      this.weekName = data.weekName;
      this.weekBackground = data.weekBackground;
      this.weekCharacters = data.weekCharacters;
      this.weekTracks = data.weekTracks;
      
      this.isMod = Boolean(data.isMod);
      this.modPath = data.modPath || null;
      this.modName = data.modName || null;

      if (!this.songList || this.songList.length === 0) {
          this.songList = this.storyPlaylist;
      }
  }

  getSceneData() {
      return {
          storyPlaylist: this.storyPlaylist,
          storyDifficulty: this.storyDifficulty,
          isStoryMode: this.isStoryMode,
          campaignScore: this.campaignScore,
          campaignMisses: this.campaignMisses,
          weekName: this.weekName,
          weekBackground: this.weekBackground,
          weekCharacters: this.weekCharacters,
          weekTracks: this.weekTracks,
          selectedDifficulty: this.selectedDifficulty,
          currentSongIndex: this.currentSongIndex
      };
  }

  setStartTime(startTime) {
      this.startTime = startTime;
  }
}