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
      this.songList = data.storyPlaylist || [];
      this.currentSongIndex = 0;
      this.storyDifficulty = data.selectedDifficulty || 'normal'; // Asegurarse de usar selectedDifficulty
      this.storyPlaylist = data.storyPlaylist ? data.storyPlaylist.flat() : [];
      this.campaignScore = data.campaignScore;
      this.campaignMisses = data.campaignMisses;
      this.weekName = data.weekName;
      this.weekBackground = data.weekBackground;
      this.weekCharacters = data.weekCharacters;
      this.weekTracks = data.weekTracks;
      this.selectedDifficulty = data.selectedDifficulty;
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

  setupF3Toggle() {
      const keyF3 = this.scene.input.keyboard.addKey("F3");
      const keyG = this.scene.input.keyboard.addKey("G");

      keyF3.on("down", () => {
          this.isDataVisible = !this.isDataVisible;
          this.isDataVisible ? this.showData() : this.hideData();
      });

      keyG.on("down", () => {
          this.toggleGridVisibility();
      });
  }

  showData() {
      this.updateData();
  }

  hideData() {
      this.dataTexts.forEach((text) => text.destroy());
      this.dataTexts = [];
  }

  updateData() {
      if (!this.isDataVisible) return;
      this.hideData();

      const { width, height } = this.scene.scale;
      const songData = this.scene.songData?.song || {};
      
      // Calculate total notes and separate them by player/enemy
      let totalNotes = 0;
      let enemyNotes = 0;
      let playerNotes = 0;

      if (songData.notes) {
          songData.notes.forEach(section => {
              if (section.sectionNotes) {
                  section.sectionNotes.forEach(note => {
                      totalNotes++;
                      // En FNF, las notas con mustHitSection true son del jugador
                      if (section.mustHitSection) {
                          if (note[1] < 4) playerNotes++;
                          else enemyNotes++;
                      } else {
                          if (note[1] < 4) enemyNotes++;
                          else playerNotes++;
                      }
                  });
              }
          });
      }

      const leftData = {
          FPS: Math.round(this.scene.game.loop.actualFps),
          "Current Song": this.songList[this.currentSongIndex] || "None",
          "Enemy": songData.player2 || "Unknown",
          "Player": songData.player1 || "Unknown",
          "GF Version": songData.gfVersion || "Unknown",
          "Total Notes": totalNotes,
          "Enemy Notes": enemyNotes,
          "Player Notes": playerNotes,
          "Total Sections": songData.notes ? songData.notes.length : 0,
          "Speed": songData.speed || 1,
          "BPM": songData.bpm || 100,
          Playtime: this.formatTime(this.scene.time.now - this.startTime),
      };

      const rightData = {
          Week: this.weekName || "Not available",
          Playlist: this.storyPlaylist ? this.storyPlaylist.join(", ") : "Not available",
          Difficulty: this.storyDifficulty || "Not available",
          Background: this.weekBackground || "Not available",
          Characters: this.weekCharacters ? this.weekCharacters.join(", ") : "Not available",
          Score: this.campaignScore || 0,
          Misses: this.campaignMisses || 0,
          "Story Mode": this.isStoryMode ? "Enabled" : "Disabled",
      };

      this.createDebugTexts(leftData, 20, 20, 0);
      this.createDebugTexts(rightData, width - 20, 20, 1);
  }

  createDebugTexts(data, startX, startY, align) {
      const lineHeight = 28;

      Object.entries(data).forEach(([key, value], index) => {
          const text = this.scene.add
              .text(startX, startY + index * lineHeight, `${key}: ${value}`, {
                  fontFamily: "Arial",
                  fontSize: "22px",
                  color: "#FFFFFF",
                  align: "left",
              })
              .setOrigin(align, 0);

          this.dataTexts.push(text);
      });
  }

  toggleGridVisibility() {
      this.isGridVisible = !this.isGridVisible;
      this.isGridVisible ? this.showGrid() : this.hideGrid();
  }

  showGrid() {
      const { width, height } = this.scene.scale;
      const gridSize = 100;

      for (let x = 0; x <= width; x += gridSize) {
          this.createGridLine(x, 0, x, height);
          this.createGridText(x + 2, 2, `X: ${x}`);
      }

      for (let y = 0; y <= height; y += gridSize) {
          this.createGridLine(0, y, width, y);
          this.createGridText(2, y + 2, `Y: ${y}`);
      }
  }

  createGridLine(x1, y1, x2, y2) {
      const line = this.scene.add.line(0, 0, x1, y1, x2, y2, 0xffff00).setOrigin(0, 0).setDepth(10);
      this.gridLines.push(line);
  }

  createGridText(x, y, text) {
      const coordText = this.scene.add.text(x, y, text, { fontSize: "16px", color: "#FFFF00" }).setDepth(11);
      this.gridLines.push(coordText);
  }

  hideGrid() {
      this.gridLines.forEach((line) => line.destroy());
      this.gridLines = [];
  }

  formatTime(milliseconds) {
      const seconds = Math.floor(milliseconds / 1000);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
}