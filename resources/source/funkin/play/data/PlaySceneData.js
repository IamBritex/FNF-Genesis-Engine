/**
 * PlaySceneData.js
 * Inicialización y gestión de datos de transición para PlayScene.
 */
export class PlaySceneData {
  
  /**
   * Obtiene los datos de inicialización desde los parámetros o el registry.
   * @param {Phaser.Scene} scene
   * @param {object} data
   * @returns {object} Datos procesados.
   */
  static init(scene, data) {
    let playData = data;

    if (!playData || Object.keys(playData).length === 0) {
      playData = scene.registry.get("PlaySceneData");

      if (playData) {
        scene.registry.remove("PlaySceneData");
      } else {
        playData = {};
      }
    }

    return playData;
  }

  static shutdown(scene) {
    // No requiere limpieza activa en este diseño
  }
}