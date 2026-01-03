import { initVolumeControl, VolumeUIScene } from "../soundtray/styleSoundtray.js";
import { touchHere } from "../touchHere.js";
import { CrashHandler } from "../CrashHandler.js";

// Main game configuration
const gameConfig = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  parent: "game-container",

  dom: {
    createContainer: true
  },

  scene: [touchHere, VolumeUIScene],
  backgroundColor: "#000000",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    expandParent: true,
    fullscreenTarget: "game-container",
  },
  autoFocus: true,
  disableContextMenu: true,
};

// Initialize the game
window.game = new Phaser.Game(gameConfig);

game.events.on("ready", () => {
  window.crashHandler = new CrashHandler(game.scene.scenes[0]);
  if (game.sound) {
    game.sound.pauseOnBlur = false;
  }
});

initVolumeControl();