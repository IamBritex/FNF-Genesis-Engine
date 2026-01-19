/**
 * PlaySceneData.js
 * * Maneja la inicialización y gestión de datos para el PlayScene.
 */
export class PlaySceneData {
  /**
   * Inicializa los datos de la escena, buscándolos directamente o en el registry.
   * Esta lógica se extrajo de PlayScene.init() para modularizar.
   * * @param {Phaser.Scene} scene - La instancia de la escena PlayScene.
   * @param {object} data - Datos pasados directamente a través de scene.start().
   * @returns {object} Los datos de inicialización procesados.
   */
  static init(scene, data) {
    let playData = data; // Asumir datos directos inicialmente

    // Comprobar si los datos directos no son válidos (null, undefined, o objeto vacío)
    if (!playData || Object.keys(playData).length === 0) {
      // Si los datos directos no son válidos, intentar obtenerlos del registry
      playData = scene.registry.get("PlaySceneData");

      if (playData) {
        // La limpieza del registry se hace aquí, al momento de leer.
        scene.registry.remove("PlaySceneData");
      } else {
        // Si el registry tampoco tiene datos, registrar advertencia y usar {} por defecto
        console.warn("PlayScene no pudo encontrar datos de inicialización!");
        playData = {};
      }
    }

    // Asignar los datos finales (ya sea del parámetro directo, del registry, o el {} de fallback)
    const initData = playData;

    // Mantener un log para confirmar los datos finales que se están usando
    console.log("PlaySceneData.init() usando datos:", initData);

    return initData;
  }

  /**
   * Limpia cualquier dato persistente que este módulo pudiera manejar.
   * (Llamado por PlayScene.shutdown)
   * @param {Phaser.Scene} scene - La instancia de la escena.
   */
  static shutdown(scene) {
    // En este diseño actual, PlaySceneData no retiene ningún dato estático
    // ni maneja datos persistentes *después* de init().
    // La limpieza principal (registry.remove) se realiza en init().
    // Si en el futuro este módulo manejara un caché global,
    // aquí sería el lugar para limpiarlo.
    console.log("PlaySceneData.shutdown() llamado. (No se requiere limpieza activa).");
  }
}