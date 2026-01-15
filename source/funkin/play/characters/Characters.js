import { CharactersData } from "./charactersData.js"
import { CharacterElements } from "./characterElements.js"
import { CharacterAnimations } from "./charactersAnimations.js"
import ModHandler from "../../../core/ModHandler.js"

export class Characters {
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
    
    this.beatRegistered = false;
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
    const bfJSON = getJSON(this.chartCharacterNames.player)
    const dadJSON = getJSON(this.chartCharacterNames.enemy)
    const gfJSON = getJSON(this.chartCharacterNames.gfVersion)

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
      if (this.conductor && !this.beatRegistered) {
          this.conductor.on('beat', this.onBeatHit, this);
          this.beatRegistered = true;
      }
  }

  onBeatHit(beat) {
      if (this.bf) this.bf.onBeat(beat);
      if (this.dad) this.dad.onBeat(beat);
      
      if (this.gf) {
          const gfBpm = this.gf.charJson?.bpm || this.conductor.bpm;
          const steps = Math.round(gfBpm / this.conductor.bpm) || 1;
          
          if (beat % steps === 0) {
              this.gf.onBeat(beat);
          }
      }
  }

  dance() {
    if (this.bf) this.bf.dance();
    if (this.dad) this.dad.dance();
    if (this.gf) this.gf.dance();
  }

  playSingAnimation(isPlayer, direction) {
    const char = isPlayer ? this.bf : this.dad;
    if (char) char.sing(direction, false);
  }

  playMissAnimation(isPlayer, direction) {
    const char = isPlayer ? this.bf : this.dad;
    if (char) char.sing(direction, true);
  }

  update(songPosition) {
     // Controlado por eventos
  }

  shutdown() {
    if (this.beatRegistered && this.conductor) {
        this.conductor.off('beat', this.onBeatHit, this);
        this.beatRegistered = false;
    }

    if (this.characterElements) {
      this.characterElements.destroy()
    }

    if (this.bf) { this.bf.destroy(); this.bf = null; }
    if (this.dad) { this.dad.destroy(); this.dad = null; }
    if (this.gf) { this.gf.destroy(); this.gf = null; }

    if (this.chartCharacterNames) {
      const names = this.chartCharacterNames
      const suffix = this.sessionId ? `_${this.sessionId}` : '';
      const keysToRemove = [`char_${names.player}${suffix}`, `char_${names.enemy}${suffix}`, `char_${names.gfVersion}${suffix}`];

      if (this.scene.anims) {
        const anims = this.scene.anims.anims.entries
        const animKeysToDelete = []
        for (const [animKey] of Object.entries(anims)) {
          for (const textureKey of keysToRemove) {
            if (animKey.startsWith(textureKey)) {
              animKeysToDelete.push(animKey)
              break
            }
          }
        }
        animKeysToDelete.forEach((key) => this.scene.anims.remove(key))
      }

      keysToRemove.forEach((key) => {
        if (this.scene.textures.exists(key)) this.scene.textures.remove(key)
      })
    }

    if (this.loadedCharacterJSONs) {
      this.loadedCharacterJSONs.forEach((content, charName) => {
        const charKey = `char_${charName}`
        if (this.scene.cache.json.exists(charKey)) {
          this.scene.cache.json.remove(charKey)
        }
      })
      this.loadedCharacterJSONs.clear()
    }
  }
}