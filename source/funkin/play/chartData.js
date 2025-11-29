/**
 * chartData.js
 * Módulo para cargar y procesar los archivos .json de los charts.
 */
export class ChartDataHandler {

  /**
   * Carga el archivo JSON del chart de la canción.
   * (Llamado por PlayScene.preload)
   */
  static preloadChart(scene, targetSongId, difficultyId) {
    if (!targetSongId || !difficultyId) {
      console.error("ChartDataHandler.preloadChart: Faltan targetSongId o difficultyId.");
      return;
    }

    const basePath = `public/songs/${targetSongId}/charts/`;
    let chartFileName;

    if (difficultyId.toLowerCase() === 'normal') {
      chartFileName = `${targetSongId}.json`;
    } else {
      chartFileName = `${targetSongId}-${difficultyId}.json`;
    }

    const chartPath = `${basePath}${chartFileName}`;
    const chartKey = `Chart_${targetSongId}_${difficultyId}`;

    scene.load.json(chartKey, chartPath);
    console.log(`ChartDataHandler: Cargando Chart ${chartKey} desde ${chartPath}`);
  }

  /**
   * Obtiene los datos del chart cargados, los procesa y los devuelve.
   * (Llamado por PlayScene.create)
   */
  static processChartData(scene, targetSongId, difficultyId) {
    if (!targetSongId || !difficultyId) {
      console.warn("ChartDataHandler.processChartData: Faltan IDs para buscar el chart.");
      return null;
    }

    const chartKey = `Chart_${targetSongId}_${difficultyId}`;

    if (scene.cache.json.exists(chartKey)) {
      const chartData = scene.cache.json.get(chartKey);

      if (chartData && chartData.song) {
        const songData = chartData.song;

        // Extraemos los datos solicitados
        const extractedData = {
          player: songData.player,
          enemy: songData.enemy,
          gfVersion: songData.gfVersion,
          notes: songData.notes,
          song: songData.song,
          stage: songData.stage,
          needsVoices: songData.needsVoices,
          bpm: songData.bpm,
          speed: songData.speed,
          // [MODIFICADO] Extraer créditos para el menú de pausa
          credits: songData.credits || { Artist: "Unknown", Charter: "Unknown" }
        };

        console.log("--- DATOS DEL CHART EXTRAÍDOS (desde ChartDataHandler) ---");
        console.log(extractedData);
        
        return extractedData; // Devolvemos los datos

      } else {
        console.error(`Error: El JSON del chart (${chartKey}) no tiene la propiedad 'song'.`);
        return null;
      }

    } else {
      console.error(`Error Crítico: No se encontró el JSON del chart en el caché: ${chartKey}`);
      return null;
    }
  }

  /**
   * Limpia los datos del chart del caché de Phaser.
   * (Llamado por PlayScene.shutdown)
   */
  static shutdown(scene, targetSongId, difficultyId) {
    if (!targetSongId || !difficultyId) {
      return;
    }
    const chartKey = `Chart_${targetSongId}_${difficultyId}`;
    
    // Limpieza explícita
    if (scene.cache.json.exists(chartKey)) {
      scene.cache.json.remove(chartKey);
      console.log(`ChartDataHandler: Limpiado ${chartKey} del caché.`);
    }
  }
}