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
   */
  constructor(scene, chartData, cameraManager, stageHandler) {
    this.scene = scene;
    this.cameraManager = cameraManager;
    this.stageHandler = stageHandler; 
    
    // 1. Extraer NOMBRES y BPM (ahora usa gfVersion)
    this.chartCharacterNames = CharactersData.extractChartData(chartData);
    
    console.log("--- DATOS DE PERSONAJES (desde chartData) ---");
    console.log(this.chartCharacterNames);

    this.stageCharacterData = null; 
    this.loadedCharacterJSONs = new Map(); 

    this.booper = new CharacterBooper(this.scene, this.chartCharacterNames.bpm);

    this.characterElements = new CharacterElements(this.scene, this.cameraManager);
    this.characterAnimations = new CharacterAnimations(this.scene);

    this.bf = null;
    this.dad = null;
    this.gf = null;
  }

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

  processAndLoadImages() {
    const stageContent = this.stageHandler.stageContent;
    this.stageCharacterData = CharactersData.extractStageData(stageContent);

    const getJSON = (charName) => {
      if (!charName) return null;
      const charKey = `char_${charName}`;
      if (this.scene.cache.json.exists(charKey)) {
        const content = this.scene.cache.json.get(charKey);
        this.loadedCharacterJSONs.set(charName, content);
        return content;
      }
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

  createAnimationsAndSprites() {
    this.characterAnimations.createAllAnimations(this.chartCharacterNames, this.loadedCharacterJSONs);
    const sprites = this.characterElements.createSprites(this.chartCharacterNames, this.stageCharacterData, this.loadedCharacterJSONs);

    this.bf = sprites.bf;
    this.dad = sprites.dad;
    this.gf = sprites.gf;
    
    this.booper.setCharacterSprites(this.bf, this.dad, this.gf);
  }

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

    // 1. Determinar el nombre de la animación (ej. 'singUP', 'singLEFT')
    const dirName = NoteDirection.getNameUpper(direction); // 'LEFT', 'DOWN', 'UP', 'RIGHT'
    const animName = `sing${dirName}`; // 'singLEFT', 'singDOWN', etc.

    // 2. Marcamos como "cantando" Y reiniciamos el contador de beats.
    charSprite.setData('isSinging', true);
    const singDuration = charSprite.getData('singDuration') || 4;
    charSprite.setData('singBeatCountdown', singDuration);


    // 3. Usamos la función playAnimation del Booper.
    // El 'true' final (force) es crucial para reiniciar la anim.
    this.booper.playAnimation(charSprite, animName, true);
  }


  // --- [FUNCIÓN MODIFICADA] ---
  /**
   * Llama a la animación de "fallo" (miss) para el personaje.
   * @param {boolean} isPlayer - ¿Es el jugador (true) o el enemigo (false)?
   * @param {number} direction - La dirección de la nota (0-3).
   */
  playMissAnimation(isPlayer, direction) {
      const charSprite = isPlayer ? this.bf : this.dad;
      if (!charSprite || !charSprite.active) return;
  
      // 1. Determinar el nombre de la animación (ej. 'singUPmiss', 'singLEFTmiss')
      const dirName = NoteDirection.getNameUpper(direction); // 'LEFT', 'DOWN', 'UP', 'RIGHT'
      const animName = `sing${dirName}miss`; // 'singLEFTmiss', 'singDOWNmiss', etc.
  
      // 2. [¡MODIFICADO!] Marcamos el sprite como "cantando" (ocupado)
      // y establecemos el contador de beats usando 'singDuration'
      // igual que en playSingAnimation.
      charSprite.setData('isSinging', true);
      const singDuration = charSprite.getData('singDuration') || 4; // Leemos la duración
      charSprite.setData('singBeatCountdown', singDuration); // La aplicamos
  
      // 3. Usamos la función playAnimation del Booper para forzar la anim.
      // El 'true' final (force) es crucial.
      this.booper.playAnimation(charSprite, animName, true);
  }
  // --- Fin de la modificación ---


  update(songPosition) {
    if (this.booper) {
      this.booper.update(songPosition);
    }
  }

  shutdown() {
    if (this.characterElements) {
      this.characterElements.destroy();
    }
    if (this.booper) {
      this.booper.stopBeatSystem();
    }

    if (this.chartCharacterNames) {
        const names = this.chartCharacterNames;
        if (names.player) this.scene.textures.remove(`char_${names.player}`);
        if (names.enemy) this.scene.textures.remove(`char_${names.enemy}`);
        if (names.gfVersion) this.scene.textures.remove(`char_${names.gfVersion}`);
    }
    
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