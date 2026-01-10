/**
 * funkin/play/characters/Characters.js
 */
import { CharactersData } from "./charactersData.js"
import { CharacterElements } from "./characterElements.js"
import { CharacterAnimations } from "./charactersAnimations.js"
import { CharacterBooper } from "./charactersBooper.js"
import { NoteDirection } from "../notes/NoteDirection.js"
import ModHandler from "../../../core/ModHandler.js"

export class Characters {
  constructor(scene, chartData, cameraManager, stageHandler, conductor, sessionId) {
    this.scene = scene
    this.cameraManager = cameraManager
    this.stageHandler = stageHandler
    this.sessionId = sessionId

    this.chartCharacterNames = CharactersData.extractChartData(chartData)

    console.log("--- DATOS DE PERSONAJES (desde chartData) ---")
    console.log(this.chartCharacterNames)

    this.stageCharacterData = null
    this.loadedCharacterJSONs = new Map()

    this.booper = new CharacterBooper(this.scene, conductor?.bpm || 100)

    this.characterElements = new CharacterElements(this.scene, this.cameraManager, this.sessionId)
    this.characterAnimations = new CharacterAnimations(this.scene)

    this.bf = null
    this.dad = null
    this.gf = null
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
          console.log(`Characters.js: Registrando carga de JSON: ${path}`)
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

    const loadedJSONs = {}
    if (bfJSON) loadedJSONs[this.chartCharacterNames.player] = bfJSON
    if (dadJSON) loadedJSONs[this.chartCharacterNames.enemy] = dadJSON
    if (gfJSON) loadedJSONs[this.chartCharacterNames.gfVersion] = gfJSON

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
    this.booper.setCharacterSprites(this.bf, this.dad, this.gf)
  }

  startBeatSystem() {
    if (this.booper) this.booper.startBeatSystem()
  }

  dance() {
    const chars = [this.bf, this.dad, this.gf]
    chars.forEach((char) => {
      if (!char || !char.active || !char.anims) return
      if (char.anims.exists('idle')) {
        this.booper.playAnimation(char, 'idle', true)
      } else if (char.anims.exists('danceRight')) {
        this.booper.playAnimation(char, 'danceRight', true)
      }
    })
  }

  playSingAnimation(isPlayer, direction) {
    const charSprite = isPlayer ? this.bf : this.dad
    if (!charSprite || !charSprite.active) return
    const dirName = NoteDirection.getNameUpper(direction)
    const animName = `sing${dirName}`
    charSprite.setData("isSinging", true)
    const singDuration = charSprite.getData("singDuration") || 4
    charSprite.setData("singBeatCountdown", singDuration)
    this.booper.playAnimation(charSprite, animName, true)
  }

  playMissAnimation(isPlayer, direction) {
    const charSprite = isPlayer ? this.bf : this.dad
    if (!charSprite || !charSprite.active) return
    const dirName = NoteDirection.getNameUpper(direction)
    const animName = `sing${dirName}miss`
    charSprite.setData("isSinging", true)
    const singDuration = charSprite.getData("singDuration") || 4
    charSprite.setData("singBeatCountdown", singDuration)
    this.booper.playAnimation(charSprite, animName, true)
  }

  update(songPosition) {
    if (this.booper) this.booper.update(songPosition)
  }

  shutdown() {
    if (this.characterElements) {
      this.characterElements.destroy()
    }
    if (this.booper) {
      this.booper.stopBeatSystem()
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
        for (const [animKey, anim] of Object.entries(anims)) {
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
        if (this.scene.cache.xml.exists(key)) this.scene.cache.xml.remove(key)
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

    console.log("Characters shutdown complete")
  }
}