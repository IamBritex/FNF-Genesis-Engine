/**
 * Characters.js
 * Clase principal para manejar la carga y lógica de los personajes (BF, Dad, GF).
 */
import { CharactersData } from './charactersData.js';
import { CharacterElements } from './characterElements.js';
import { CharacterAnimations } from './charactersAnimations.js';
import { CharacterBooper } from './charactersBooper.js';
import { CameraManager } from '../camera/Camera.js';
import { NoteDirection } from '../notes/NoteDirection.js';

export class Characters {
  /**
   * @param {Phaser.Scene} scene - La escena de PlayState.
   * @param {object} chartData - El chartData procesado por ChartDataHandler.
   * @param {CameraManager} cameraManager - El gestor de cámaras.
   * @param {import('../stage/Stage.js').Stage} stageHandler - El gestor del escenario.
   * @param {import('../Conductor.js').Conductor} conductor - El gestor de BPM.
   */
  constructor(scene, chartData, cameraManager, stageHandler, conductor) {
    this.scene = scene;
    this.cameraManager = cameraManager;
    /** @type {import('../stage/Stage.js').Stage} */
    this.stageHandler = stageHandler; 
    
    this.chartCharacterNames = CharactersData.extractChartData(chartData);
    
    console.log("--- DATOS DE PERSONAJES (desde chartData) ---");
    console.log(this.chartCharacterNames);

    this.stageCharacterData = null; 
    this.loadedCharacterJSONs = new Map(); 

    this.booper = new CharacterBooper(this.scene, conductor?.bpm || 100);

    this.characterElements = new CharacterElements(this.scene, this.cameraManager);
    this.characterAnimations = new CharacterAnimations(this.scene);

    /** @type {Phaser.GameObjects.Sprite | null} */
    this.bf = null;
    /** @type {Phaser.GameObjects.Sprite | null} */
    this.dad = null;
    /** @type {Phaser.GameObjects.Sprite | null} */
    this.gf = null;
  }

  /**
   * Registra los JSON de los personajes en la cola de carga.
   */
  loadCharacterJSONs() {
    if (!this.chartCharacterNames) return;
    
    const names = this.chartCharacterNames;

    const loadChar = (key, charName) => {
      if (charName) {
        const charKey = `char_${charName}`;
        if (!this.scene.cache.json.exists(charKey)) {
          const path = `public/data/characters/${charName}.json`;
          this.scene.load.json(charKey, path);
          console.log(`Characters.js: Registrando carga de JSON: ${path}`);
        }
      }
    };

    loadChar('player', names.player);
    loadChar('enemy', names.enemy);
    loadChar('gf', names.gfVersion);
  }

  /**
   * Procesa los JSON cargados y registra las imágenes (Atlas) en la cola de carga.
   */
  processAndLoadImages() {
    // --- [INICIO DE LA CORRECCIÓN] ---
    // Solo extrae los datos del stageContent SI AÚN NO EXISTEN.
    // Si 'refreshCharacterSpritesFromData' (en StageCharacters.js)
    // ya guardó la posición/capa en 'this.stageCharacterData',
    // esta línea NO debe sobrescribirlo.
    if (!this.stageCharacterData) {
        const stageContent = this.stageHandler.stageContent;
        this.stageCharacterData = CharactersData.extractStageData(stageContent);
    }
    // --- [FIN DE LA CORRECCIÓN] ---


    // --- [INICIO DE LA CORRECCIÓN (de tu archivo)] ---
    // Limpiar el mapa antes de poblarlo.
    // Esto asegura que al refrescar (como en un cambio de personaje),
    // solo los personajes actuales (ej. 'bf', 'dad', 'gf-car') estén en el mapa.
    this.loadedCharacterJSONs.clear();
    // --- [FIN DE LA CORRECCIÓN] ---

    const getJSON = (charName) => {
      if (!charName) return null;
      const charKey = `char_${charName}`;
      if (this.scene.cache.json.exists(charKey)) {
        const content = this.scene.cache.json.get(charKey);
        // Poblar el mapa (ahora limpio)
        this.loadedCharacterJSONs.set(charName, content);
        return content;
      }
      console.warn(`Characters.js: No se encontró el JSON en caché para '${charName}' (key: ${charKey})`);
      return null;
    };
    
    const bfJSON = getJSON(this.chartCharacterNames.player);
    const dadJSON = getJSON(this.chartCharacterNames.enemy);
    const gfJSON = getJSON(this.chartCharacterNames.gfVersion); 

    console.log("--- DATOS DE PERSONAJE (extraídos desde stage.json) ---");
    console.log(this.stageCharacterData);

    console.log("--- CONTENIDO DE JSONs DE PERSONAJES (cargados) ---");
    const loadedJSONs = {};
    if (bfJSON) loadedJSONs[this.chartCharacterNames.player] = bfJSON;
    if (dadJSON) loadedJSONs[this.chartCharacterNames.enemy] = dadJSON;
    if (gfJSON) loadedJSONs[this.chartCharacterNames.gfVersion] = gfJSON;
    console.log(loadedJSONs);

    this.characterElements.preloadAtlases(this.chartCharacterNames, this.loadedCharacterJSONs);
  }

  /**
   * Crea las animaciones y los sprites de los personajes.
   */
  createAnimationsAndSprites() {
    this.characterAnimations.createAllAnimations(this.chartCharacterNames, this.loadedCharacterJSONs);
    const sprites = this.characterElements.createSprites(this.chartCharacterNames, this.stageCharacterData, this.loadedCharacterJSONs);

    this.bf = sprites.bf;
    this.dad = sprites.dad;
    this.gf = sprites.gf;
    
    this.booper.setCharacterSprites(this.bf, this.dad, this.gf);
  }

  /**
   * Inicia el sistema de ritmo (bopping).
   */
  startBeatSystem() {
    if (this.booper) {
      this.booper.startBeatSystem();
    }
  }

  /**
   * Llama a la animación de canto para el personaje apropiado.
   * @param {boolean} isPlayer - ¿Es el jugador (true) o el enemigo (false)?
   * @param {number} direction - La dirección de la nota (0=izquierda, 1=abajo, 2=arriba, 3=derecha).
   */
  playSingAnimation(isPlayer, direction) {
    const charSprite = isPlayer ? this.bf : this.dad;
    if (!charSprite || !charSprite.active) return;

    const dirName = NoteDirection.getNameUpper(direction); // 'LEFT', 'DOWN', 'UP', 'RIGHT'
    const animName = `sing${dirName}`; // 'singLEFT', 'singDOWN', etc.

    charSprite.setData('isSinging', true);
    const singDuration = charSprite.getData('singDuration') || 4;
    charSprite.setData('singBeatCountdown', singDuration);

    this.booper.playAnimation(charSprite, animName, true);
  }

  /**
   * Llama a la animación de "fallo" (miss) para el personaje.
   * @param {boolean} isPlayer - ¿Es el jugador (true) o el enemigo (false)?
   * @param {number} direction - La dirección de la nota (0-3).
   */
  playMissAnimation(isPlayer, direction) {
      const charSprite = isPlayer ? this.bf : this.dad;
      if (!charSprite || !charSprite.active) return;
  
      const dirName = NoteDirection.getNameUpper(direction); 
      const animName = `sing${dirName}miss`; 
  
      charSprite.setData('isSinging', true);
      const singDuration = charSprite.getData('singDuration') || 4; 
      charSprite.setData('singBeatCountdown', singDuration); 
  
      this.booper.playAnimation(charSprite, animName, true);
  }

  /**
   * Actualiza el estado del CharacterBooper.
   * @param {number} songPosition - El tiempo actual de la canción en ms.
   */
  update(songPosition) {
    if (this.booper) {
      this.booper.update(songPosition);
    }
  }

  /**
   * Limpia y destruye los recursos de los personajes.
   */
  shutdown() {
    if (this.characterElements) {
      this.characterElements.destroy();
    }
    if (this.booper) {
      this.booper.stopBeatSystem();
    }

    // Limpiar texturas
    if (this.chartCharacterNames) {
        const names = this.chartCharacterNames;
        if (names.player) this.scene.textures.remove(`char_${names.player}`);
        if (names.enemy) this.scene.textures.remove(`char_${names.enemy}`);
        if (names.gfVersion) this.scene.textures.remove(`char_${names.gfVersion}`);
    }
    
    // Limpiar JSONs del caché
    this.loadedCharacterJSONs.forEach((content, charName) => {
      const charKey = `char_${charName}`;
      if (this.scene.cache.json.exists(charKey)) {
        this.scene.cache.json.remove(charKey);
      }
    });
    this.loadedCharacterJSONs.clear();
    console.log("Characters.js: Shutdown y limpieza de caché.");
  }
}