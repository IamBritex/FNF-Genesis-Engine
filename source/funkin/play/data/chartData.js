import ModHandler from "../../../core/ModHandler.js";

export class ChartDataHandler {

  /**
   * Carga SOLAMENTE el archivo JSON del chart principal.
   */
  static preloadChart(scene, targetSongId, difficultyId) {
    if (!targetSongId || !difficultyId) return;

    let chartFileName = (difficultyId.toLowerCase() === 'normal')
      ? `${targetSongId}.json`
      : `${targetSongId}-${difficultyId}.json`;

    // Ruta: songs/Bopeebo/charts/Bopeebo.json
    const chartInternalPath = `${targetSongId}/charts/${chartFileName}`;
    const chartFinalPath = ModHandler.getPath('songs', chartInternalPath);
    const chartKey = `Chart_${targetSongId}_${difficultyId}`;

    scene.load.json(chartKey, chartFinalPath);
    console.log(`[ChartData] Pre-cargando Chart: ${chartFinalPath}`);
  }

  /**
   * Procesa los datos. Si 'events' es true, lo deja como true para que PlayScene lo maneje.
   */
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
      // Si songData.events es 'true', se pasa tal cual.
      // Si es un array, se pasa el array.
      events: songData.events
    };
  }

  static shutdown(scene, targetSongId, difficultyId) {
    const chartKey = `Chart_${targetSongId}_${difficultyId}`;
    const eventsKey = `Events_${targetSongId}`; // Por si acaso se cargó después

    if (scene.cache.json.exists(chartKey)) scene.cache.json.remove(chartKey);
    if (scene.cache.json.exists(eventsKey)) scene.cache.json.remove(eventsKey);
  }
}