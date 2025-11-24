/**
 * charactersData.js
 * Módulo para extraer los datos de los personajes (player, enemy, gf) del chartData
 * y del stageContent.
 */
export class CharactersData {
  
  /**
   * Extrae los NOMBRES de los personajes y datos del chartData.
   * @param {object} chartData - El objeto chartData completo de PlayState.
   * @returns {object | null} Objeto con { player, enemy, gfVersion, bpm, speed }
   */
  static extractChartData(chartData) {
    if (chartData) {
      return {
        player: chartData.player,
        enemy: chartData.enemy,
        // --- ¡¡CORREGIDO!! ---
        gfVersion: chartData.gfVersion, // Antes 'gfStyle'
        // --- FIN ---
        bpm: chartData.bpm || 100, 
        speed: chartData.speed || 1
      };
    }
    console.warn("CharactersData: No se pasó chartData para extraer los nombres.");
    return null;
  }

  /**
   * Extrae los BLOQUES DE DATOS de los personajes del JSON del escenario.
   * @param {object} stageContent - El contenido del JSON del escenario (cargado por Stage.js).
   * @returns {object} Objeto con { player, enemy, playergf }
   */
  static extractStageData(stageContent) {
    const charData = {
      player: null,
      enemy: null,
      playergf: null
    };

    if (stageContent && stageContent.stage) {
      for (const item of stageContent.stage) {
        if (item.player) {
          charData.player = item.player;
        } else if (item.enemy) {
          charData.enemy = item.enemy;
        } else if (item.playergf) {
          charData.playergf = item.playergf;
        }
      }
    } else {
      console.warn("CharactersData: No se pasó stageContent para extraer los datos del escenario. Usando valores por defecto.");
      // Valores por defecto estándar para evitar crashes
      charData.player = { position: [770, 100], scale: 1, layer: 1 };
      charData.enemy = { position: [100, 100], scale: 1, layer: 1 };
      charData.playergf = { position: [400, 130], scale: 1, layer: 0 };
    }

    return charData;
  }
}