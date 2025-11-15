// source/core/phaser/game.js

import coreWindow from "./coreWindow.js";
import { initVolumeControl, VolumeUIScene } from "../soundtray/styleSoundtray.js";
import { CrashHandler } from "../CrashHandler.js"; // Importación existente

// Main game configuration
const gameConfig = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  parent: "game-container",
  scene: [coreWindow, VolumeUIScene],
  backgroundColor: "#000000",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    expandParent: true,
    fullscreenTarget: "game-container",
  },
};

// Initialize the game
window.game = new Phaser.Game(gameConfig);

game.events.on("ready", () => {
  // 1. Inicializar Crash Handler
  window.crashHandler = new CrashHandler(game.scene.scenes[0]);

  // 2. Configurar listeners de errores globales
  window.onerror = (message, source, lineno, colno, error) => {
    console.log("window.onerror capturado:");
    if (window.crashHandler) {
      // Pasamos el objeto 'error' si existe, si no, creamos uno nuevo
      window.crashHandler.showError(error || new Error(message));
    }
    return true; // Previene el manejo de errores por defecto del navegador
  };

  window.onunhandledrejection = (event) => {
    console.log("window.onunhandledrejection capturado:");
    if (window.crashHandler) {
      const error = event.reason || new Error('Rechazo de promesa no manejado');
      window.crashHandler.showError(error);
    }
  };
});

initVolumeControl();

// Focus management
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    game.loop.sleep();
  } else {
    game.loop.wake();
  }
});

window.addEventListener("blur", () => game.loop.sleep());
window.addEventListener("focus", () => game.loop.wake());