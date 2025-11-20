/**
 * Stage.js
 * Clase principal para manejar la carga y lógica del escenario.
 */
import { StageData } from './StageData.js';
import { StageElements } from './StageElements.js';
// Importamos CameraManager para que StageElements pueda usarlo
import { CameraManager } from '../camera/Camera.js';

export class Stage {
  /**
   * @param {Phaser.Scene} scene - La escena de PlayState.
   * @param {object} chartData - El chartData procesado por ChartDataHandler.
   * @param {CameraManager} cameraManager - El gestor de cámaras.
   * @param {import('../Conductor.js').Conductor} conductor - El gestor de BPM.
   */
  constructor(scene, chartData, cameraManager, conductor) { // <-- [MODIFICADO]
    this.scene = scene;
    this.cameraManager = cameraManager; 
    /** * El gestor de ritmo.
     * @type {import('../Conductor.js').Conductor} 
     */
    this.conductor = conductor; // <-- [NUEVO]
    
    this.stageDataKey = StageData.extract(chartData);
    this.stageKey = null; 
    this.defaultStageKey = 'StageJSON_stage'; // El JSON de fallback
    this.stageContent = null; 

    // --- [MODIFICADO] ---
    // Crear el manejador de elementos (pasando el cameraManager y el conductor)
    this.stageElements = new StageElements(this.scene, this.stageDataKey, this.cameraManager, this.conductor);
    // --- [FIN MODIFICADO] ---
  }

  /**
   * (Paso 1) Registra el JSON del stage (específico Y el de fallback)
   */
  loadStageJSON() {
    if (!this.stageDataKey) {
      console.log("Stage.js: No hay datos de escenario, no se cargará nada.");
      return;
    }

    // --- ¡¡LÓGICA DE FALLBACK!! ---

    // 1. Prepara la carga del JSON específico
    this.stageKey = `StageJSON_${this.stageDataKey}`; // ej. "StageJSON_spooky"
    const specificPath = `public/data/stages/${this.stageDataKey}.json`;
    
    if (!this.scene.cache.json.exists(this.stageKey)) {
        this.scene.load.json(this.stageKey, specificPath);
        console.log(`Stage.js: Registrando carga de: ${specificPath}`);
    }

    // 2. Prepara la carga del JSON por defecto (si no está ya cargado)
    const defaultPath = 'public/data/stages/stage.json';
    if (!this.scene.cache.json.exists(this.defaultStageKey)) {
        this.scene.load.json(this.defaultStageKey, defaultPath);
        console.log(`Stage.js: Registrando carga de fallback: ${defaultPath}`);
    }
    // --- FIN DE LA LÓGICA ---
  }

  /**
   * (Paso 2) Esta función es llamada por PlayState DESPUÉS de que el JSON carga.
   * Lee el JSON y registra las IMÁGENES en la cola de carga.
   */
  loadStageImages() {
    if (this.stageContent) return; // Ya lo procesamos

    // --- ¡¡LÓGICA DE FALLBACK!! ---
    // 1. Intenta obtener el JSON específico
    if (this.scene.cache.json.exists(this.stageKey)) {
        this.stageContent = this.scene.cache.json.get(this.stageKey);
    } 
    // 2. Si falla, usa el JSON por defecto
    else {
        console.warn(`Stage.js: No se pudo encontrar el JSON del stage en caché: ${this.stageKey}. Cargando '${this.defaultStageKey}' por defecto.`);
        this.stageContent = this.scene.cache.json.get(this.defaultStageKey);
        
        // Actualizamos el stageDataKey para que StageElements busque
        // las imágenes en la carpeta 'stage' y no en 'spooky'
        this.stageElements.stageDataKey = "stage";
        this.stageElements.spritesheetHandler.stageDataKey = "stage";
    }
    // --- FIN DE LA LÓGICA ---

    console.log("--- CONTENIDO DEL STAGE JSON (cargado por Stage.js) ---");
    console.log(this.stageContent);

    // Usar StageElements para AÑADIR las imágenes a la cola de carga
    if (this.stageElements) {
      this.stageElements.preloadImages(this.stageContent);
    }
  }

  /**
   * (Paso 3) Esta función es llamada por PlayState DESPUÉS de que las imágenes cargan.
   * Crea los sprites en la escena.
   */
  createStageElements() {
    if (this.stageElements) {
      this.stageElements.createSprites(this.stageContent);
    }
  }

  /**
   * Limpia los recursos del escenario.
   */
  shutdown() {
    const finalStageKey = this.stageElements?.stageDataKey || this.stageDataKey;

    if (this.stageElements) {
      this.stageElements.destroy();
      this.stageElements = null;
    }

    if (this.stageContent && this.stageContent.stage) {
      for (const item of this.stageContent.stage) {
        if (item.type === "image" || item.type === "spritesheet") {
          const namePath = item.namePath;
          const textureKey = `stage_${finalStageKey}_${namePath}`;
          if (this.scene.textures.exists(textureKey)) {
            this.scene.textures.remove(textureKey);
          }
        }
      }
    }
    
    // Limpia ambos JSONs del caché
    if (this.stageKey && this.scene.cache.json.exists(this.stageKey)) {
      this.scene.cache.json.remove(this.stageKey);
    }
    if (this.defaultStageKey && this.scene.cache.json.exists(this.defaultStageKey)) {
      this.scene.cache.json.remove(this.defaultStageKey);
    }
    console.log("Stage.js: Shutdown y limpieza de caché.");
  }
}