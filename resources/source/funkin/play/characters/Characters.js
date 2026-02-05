import { CharactersData } from "./charactersData.js"
import { CharacterElements } from "./characterElements.js"
import { CharacterAnimations } from "./charactersAnimations.js"
import ModHandler from "../../../core/ModHandler.js"
import { PlayEvents } from "../PlayEvents.js" // [IMPORTANTE]

export class Characters {
  /**
   * @param {Phaser.Scene} scene
   * @param {object} chartData
   * @param {import('../camera/Camera.js').CameraManager} cameraManager
   * @param {import('../stage/Stage.js').Stage} stageHandler
   * @param {import('../data/Conductor.js').Conductor} conductor
   * @param {string} sessionId
   */
  constructor(scene, chartData, cameraManager, stageHandler, conductor, sessionId) {
    this.scene = scene
    this.cameraManager = cameraManager
    this.stageHandler = stageHandler
    this.sessionId = sessionId
    this.conductor = conductor

    this.chartCharacterNames = CharactersData.extractChartData(chartData)

    this.stageCharacterData = null
    this.loadedCharacterJSONs = new Map()

    this.characterElements = new CharacterElements(this.scene, this.cameraManager, this.sessionId)
    this.characterAnimations = new CharacterAnimations(this.scene)

    this.bf = null
    this.dad = null
    this.gf = null
    
    // Iniciamos la escucha de eventos
    this.setupEventListeners();
  }

  setupEventListeners() {
      // 1. Escuchar Golpes de Nota (Cantar)
      this.scene.events.on(PlayEvents.NOTE_HIT, this.onNoteHit, this);
      
      // 2. Escuchar Fallos (Animación de Miss)
      this.scene.events.on(PlayEvents.NOTE_MISS, this.onNoteMiss, this);

      // 3. Escuchar el Ritmo (Bailar)
      // Asumimos que PlayScene o Conductor emite 'beat_hit' a través de scene.events
      this.scene.events.on(PlayEvents.BEAT_HIT, this.onBeatHit, this);
  }

  async loadCharacterJSONs() {
    if (!this.chartCharacterNames) return
    const names = this.chartCharacterNames

    const loadChar = async (key, charName) => {
      if (charName) {
        const charKey = `char_${charName}`
        if (!this.scene.cache.json.exists(charKey)) {
          const path = await ModHandler.getPath('data', `characters/${charName}.json`);
          this.scene.load.json(charKey, path)
        }
      }
    }

    await loadChar("player", names.player)
    await loadChar("enemy", names.enemy)
    await loadChar("gf", names.gfVersion)
  }

  processAndLoadImages() {
    if (!this.stageCharacterData) {
      const stageContent = this.stageHandler.stageContent
      this.stageCharacterData = CharactersData.extractStageData(stageContent)
    }
    this.loadedCharacterJSONs.clear()
    const getJSON = (charName) => {
      if (!charName) return null
      const charKey = `char_${charName}`
      if (this.scene.cache.json.exists(charKey)) {
        const content = this.scene.cache.json.get(charKey)
        this.loadedCharacterJSONs.set(charName, content)
        return content
      }
      return null
    }
    getJSON(this.chartCharacterNames.player)
    getJSON(this.chartCharacterNames.enemy)
    getJSON(this.chartCharacterNames.gfVersion)

    this.characterElements.preloadAtlases(this.chartCharacterNames, this.loadedCharacterJSONs)
  }

  createAnimationsAndSprites() {
    this.characterAnimations.createAllAnimations(this.chartCharacterNames, this.loadedCharacterJSONs, this.sessionId)
    const sprites = this.characterElements.createSprites(
      this.chartCharacterNames,
      this.stageCharacterData,
      this.loadedCharacterJSONs,
    )
    this.bf = sprites.bf
    this.dad = sprites.dad
    this.gf = sprites.gf
  }

  startBeatSystem() {
      // Ya no necesitamos registrar manualmente al conductor aquí si usamos eventos globales,
      // pero si el conductor no usa scene.events, mantenemos esto como fallback.
      if (this.conductor) {
          // Opción Híbrida: Si el conductor emite localmente, lo re-emitimos o manejamos
          // Idealmente, el Conductor debería hacer: scene.events.emit(PlayEvents.BEAT_HIT, beat)
      }
  }

  // --- EVENT HANDLERS ---

  /**
   * Se ejecuta cuando ocurre un evento NOTE_HIT global.
   * @param {object} data - { isPlayer, note, rating }
   */
  onNoteHit(data) {
      // Determinar quién canta basado en data.isPlayer o data.note.isPlayerNote
      const isPlayer = data.isPlayer ?? (data.note ? data.note.isPlayerNote : true);
      const direction = data.note ? data.note.noteDirection : data.direction;

      const char = isPlayer ? this.bf : this.dad;
      if (char) {
          // false = no es miss
          char.sing(direction, false); 
      }
  }

  /**
   * Se ejecuta cuando ocurre un evento NOTE_MISS global.
   * @param {object} data - { isPlayer, direction }
   */
  onNoteMiss(data) {
      // Generalmente solo el jugador falla visualmente, pero soportamos ambos
      const isPlayer = data.isPlayer !== undefined ? data.isPlayer : true;
      const direction = data.direction;

      const char = isPlayer ? this.bf : this.dad;
      if (char) {
          // true = es miss
          char.sing(direction, true);
      }
  }

  /**
   * Se ejecuta en cada Beat.
   * @param {number} beat 
   */
  onBeatHit(beat) {
      // Delegamos a los personajes el baile
      if (this.bf) this.bf.onBeat(beat);
      if (this.dad) this.dad.onBeat(beat);
      
      if (this.gf) {
          const gfBpm = this.gf.charJson?.bpm || this.conductor?.bpm || 100;
          const currentBpm = this.conductor?.bpm || 100;
          const steps = Math.round(gfBpm / currentBpm) || 1;
          
          if (beat % steps === 0) {
              this.gf.onBeat(beat);
          }
      }
  }

  // --- UPDATE ---

  update(songPosition) {
     // Ya no necesitamos chequear lógica aquí, todo es por eventos.
     // Se mantiene por si se necesita lógica continua (ej. pelo al viento).
  }

  // --- CLEANUP ---

  shutdown() {
    // Desuscribir eventos
    this.scene.events.off(PlayEvents.NOTE_HIT, this.onNoteHit, this);
    this.scene.events.off(PlayEvents.NOTE_MISS, this.onNoteMiss, this);
    this.scene.events.off(PlayEvents.BEAT_HIT, this.onBeatHit, this);

    if (this.characterElements) {
      this.characterElements.destroy()
    }

    if (this.bf) { this.bf.destroy(); this.bf = null; }
    if (this.dad) { this.dad.destroy(); this.dad = null; }
    if (this.gf) { this.gf.destroy(); this.gf = null; }

    // Limpieza de caché (igual que antes)
    if (this.chartCharacterNames) {
      const names = this.chartCharacterNames
      const suffix = this.sessionId ? `_${this.sessionId}` : '';
      const keysToRemove = [`char_${names.player}${suffix}`, `char_${names.enemy}${suffix}`, `char_${names.gfVersion}${suffix}`];

      if (this.scene.anims) {
        const anims = this.scene.anims.anims.entries
        const animKeysToDelete = []
        for (const [animKey] of Object.entries(anims)) {
            keysToRemove.forEach(key => {
                if (animKey.startsWith(key)) animKeysToDelete.push(animKey);
            });
        }
        animKeysToDelete.forEach((key) => this.scene.anims.remove(key))
      }

      keysToRemove.forEach((key) => {
        if (this.scene.textures.exists(key)) this.scene.textures.remove(key)
      })
    }
  }
}