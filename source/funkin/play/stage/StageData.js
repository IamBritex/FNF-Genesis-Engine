/**
 * StageData.js
 * Módulo para extraer los datos específicos del escenario (stage) del chartData.
 */
export class StageData {
  /**
   * Extrae los datos del escenario (stage) del chartData.
   * @param {object} chartData - El objeto chartData completo de PlayState.
   * @returns {object | null} Los datos del escenario, o null si no se encuentran.
   */
  static extract(chartData) {
    if (chartData && chartData.stage) {
      // Devuelve la información del escenario (ej. "stage", "weekeb")
      return chartData.stage;
    }
    
    console.warn("StageData: No se encontró 'chartData.stage' en los datos del chart.");
    return null;
  }
}