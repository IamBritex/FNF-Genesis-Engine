import { AnimateAtlasCharacter } from "./AnimateAtlasCharacter.js";
import { CharacterPositioner } from "./CharacterPositioner.js";

export class CharacterElements {
  constructor(scene, cameraManager, sessionId) {
    this.scene = scene;
    this.cameraManager = cameraManager;
    this.sessionId = sessionId;

    this.bf = null;
    this.dad = null;
    this.gf = null;
  }

  preloadAtlases(names, jsonContents) {
    if (!names) return;

    const loadAtlas = (charName) => {
      const jsonData = jsonContents.get(charName);
      if (!jsonData || !jsonData.image) return;

      const textureKey = `char_${charName}_${this.sessionId}`;
      if (this.scene.textures.exists(textureKey)) return;

      const imagePath = jsonData.image.replace("characters/", "");
      const texturePath = `public/images/characters/${imagePath}.png`;
      const atlasPath = `public/images/characters/${imagePath}.xml`;

      this.scene.load.atlasXML(textureKey, texturePath, atlasPath);
    };

    loadAtlas(names.player);
    loadAtlas(names.enemy);
    loadAtlas(names.gfVersion);
  }

  createSprites(names, stageData, jsonContents) {
    const createChar = (charName, stageBlock) => {
      if (!charName || !stageBlock) return null;

      const textureKey = `char_${charName}_${this.sessionId}`;
      if (!this.scene.textures.exists(textureKey)) return null;

      const jsonData = jsonContents.get(charName);
      if (!jsonData) return null;

      const isPixel = jsonData.isPixel === true || jsonData.no_antialiasing === true || jsonData.antialiasing === false;
      if (isPixel) {
        const tex = this.scene.textures.get(textureKey);
        tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }

      // --- POSICIONAMIENTO MODULARIZADO ---
      const frameName = this.scene.textures.get(textureKey).getFrameNames()[0];
      const frame = this.scene.textures.getFrame(textureKey, frameName);
      const frameDims = { width: frame ? frame.width : 0, height: frame ? frame.height : 0 };

      let initialOffset = [0, 0];
      const idleAnim = jsonData.animations?.find(a => a.anim === 'idle');
      const danceAnim = jsonData.animations?.find(a => a.anim === 'danceLeft');
      
      if (idleAnim && idleAnim.offsets) initialOffset = idleAnim.offsets;
      else if (danceAnim && danceAnim.offsets) initialOffset = danceAnim.offsets;

      const charScale = jsonData.scale || 1;
      
      // Calcular posición
      const { x: baseX, y: baseY } = CharacterPositioner.calculateBasePosition(
          stageBlock.position[0],
          stageBlock.position[1],
          charScale,
          frameDims,
          initialOffset
      );

      // Crear Personaje
      const character = new AnimateAtlasCharacter(
          this.scene,
          baseX,
          baseY,
          textureKey,
          jsonData
      );

      // Propiedades visuales
      character.setDepth(stageBlock.layer);
      character.setAlpha(stageBlock.opacity);
      character.setVisible(stageBlock.visible);

      if (stageBlock.scroll_x !== undefined && stageBlock.scroll_y !== undefined) {
        character.setScrollFactor(stageBlock.scroll_x, stageBlock.scroll_y);
      } else {
        character.setScrollFactor(stageBlock.scrollFactor ?? 1);
      }

      if (stageBlock.angle) character.setAngle(stageBlock.angle);

      const stageScale = stageBlock.scale || 1;
      character.setScale(character.scaleX * stageScale);
      character.charScale = character.scaleX; 

      const stageFlipX = stageBlock.flip_x === true;
      if (stageFlipX) character.setFlipX(!character.flipX);
      character.setFlipY(stageBlock.flip_y === true);

      character.setData('charName', charName);

      if (this.cameraManager) this.cameraManager.assignToGame(character);

      return character;
    };

    this.bf = createChar(names.player, stageData.player);
    this.dad = createChar(names.enemy, stageData.enemy);
    this.gf = createChar(names.gfVersion, stageData.playergf);

    return { bf: this.bf, dad: this.dad, gf: this.gf };
  }

  destroy() {
    this.bf?.destroy();
    this.dad?.destroy();
    this.gf?.destroy();
  }
}