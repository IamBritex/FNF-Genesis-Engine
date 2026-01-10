import ModHandler from "../../../core/ModHandler.js";

export class ChartDataHandler {

  /**
   * @param {Phaser.Scene} scene
   * @param {string} targetSongId
   * @param {string} difficultyId
   */
  static async preloadChart(scene, targetSongId, difficultyId) {
    if (!targetSongId || !difficultyId) return;

    let chartFileName = (difficultyId.toLowerCase() === 'normal')
      ? `${targetSongId}.json`
      : `${targetSongId}-${difficultyId}.json`;

    const chartInternalPath = `${targetSongId}/charts/${chartFileName}`;
    const chartFinalPath = await ModHandler.getPath('songs', chartInternalPath);
    const chartKey = `Chart_${targetSongId}_${difficultyId}`;

    scene.load.json(chartKey, chartFinalPath);
    console.log(`[ChartData] Pre-cargando Chart: ${chartFinalPath}`);
  }

  static processChartData(scene, targetSongId, difficultyId) {
    const chartKey = `Chart_${targetSongId}_${difficultyId}`;

    if (!scene.cache.json.exists(chartKey)) {
      console.error(`Error Crítico: Chart ${chartKey} no encontrado.`);
      return null;
    }

    const chartData = scene.cache.json.get(chartKey);
    if (!chartData || !chartData.song) return null;

    const songData = chartData.song;

    return {
      ...songData,
      noteSkin: songData.noteSkin || "Funkin",
      events: songData.events
    };
  }

  static shutdown(scene, targetSongId, difficultyId) {
    const chartKey = `Chart_${targetSongId}_${difficultyId}`;
    const eventsKey = `Events_${targetSongId}`;

    if (scene.cache.json.exists(chartKey)) scene.cache.json.remove(chartKey);
    if (scene.cache.json.exists(eventsKey)) scene.cache.json.remove(eventsKey);
  }
}