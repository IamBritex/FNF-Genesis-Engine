/**
 * characterElements.js
 * Se encarga de cargar las texturas/atlas y crear los sprites de los personajes.
 */
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
    const createSprite = (charName, stageBlock) => {
      if (!charName || !stageBlock) return null;

      const textureKey = `char_${charName}_${this.sessionId}`;
      const texture = this.scene.textures.get(textureKey);

      if (!texture || !texture.source || !texture.source[0] || !texture.source[0].glTexture) return null;
      if (texture.frameTotal <= 1) return null;

      const jsonData = jsonContents.get(charName);
      if (!jsonData) return null;

      const isPixel = jsonData.isPixel === true || jsonData.no_antialiasing === true || jsonData.antialiasing === false;
      if (isPixel) texture.setFilter(Phaser.Textures.FilterMode.NEAREST);

      const singDuration = jsonData.sing_duration || 4;

      // --- Lógica de Offsets ---
      const allOffsets = new Map();
      if (jsonData.animations) {
        jsonData.animations.forEach(anim => {
          if (anim.anim && anim.offsets) allOffsets.set('offset_' + anim.anim, anim.offsets);
        });
      }

      let frameWidth = 1, frameHeight = 1;
      let animToPlayKey = `${textureKey}_idle`;
      let fallbackAnimKey = `${textureKey}_danceLeft`;

      let defaultAnimData = jsonData.animations.find(a => a.anim === 'idle' || a.anim === 'idle-loop');
      if (!defaultAnimData) {
        defaultAnimData = jsonData.animations.find(a => a.anim === 'danceLeft' || a.anim === 'danceLeft-loop');
        animToPlayKey = fallbackAnimKey;
      }

      const initialAnimName = (defaultAnimData && defaultAnimData.anim) ? defaultAnimData.anim : 'idle';
      const initialOffset = allOffsets.get('offset_' + initialAnimName) || [0, 0];

      const frames = texture.getFrameNames();
      if (frames.length > 0 && frames[0] !== '__BASE') {
        const frame = texture.get(frames[0]);
        frameWidth = frame.width;
        frameHeight = frame.height;
      }

      const baseScale = jsonData.scale || 1;
      const finalScale = baseScale * stageBlock.scale;
      const scaledWidth = frameWidth * finalScale;
      const scaledHeight = frameHeight * finalScale;

      const anchorX = stageBlock.position[0];
      const anchorY = stageBlock.position[1];

      // "Base" es la posición 0,0 lógica del personaje antes de aplicar offsets
      // IMPORTANTE: Esta es la referencia fija para todas las animaciones futuras
      const baseX = anchorX - (initialOffset[0] * finalScale) - (scaledWidth / 2);
      const baseY = anchorY - (initialOffset[1] * finalScale) - scaledHeight;

      // Posición inicial actual (Base + Offset Inicial)
      const initialX = baseX + (initialOffset[0] * finalScale);
      const initialY = baseY + (initialOffset[1] * finalScale);

      const sprite = this.scene.add.sprite(initialX, initialY, textureKey);

      sprite.setDepth(stageBlock.layer);
      sprite.setAlpha(stageBlock.opacity);
      sprite.setVisible(stageBlock.visible);

      if (stageBlock.scroll_x !== undefined && stageBlock.scroll_y !== undefined) {
        sprite.setScrollFactor(stageBlock.scroll_x, stageBlock.scroll_y);
      } else {
        sprite.setScrollFactor(stageBlock.scrollFactor ?? 1);
      }

      if (stageBlock.angle) sprite.setAngle(stageBlock.angle);
      sprite.setScale(finalScale);

      const defaultFlipX = jsonData.flip_x === true;
      const stageFlipX = stageBlock.flip_x === true;
      sprite.setFlipX(defaultFlipX !== stageFlipX);
      sprite.setFlipY(stageBlock.flip_y === true);

      if (this.cameraManager) this.cameraManager.assignToGame(sprite);

      sprite.setOrigin(0, 0);

      if (this.scene.anims.exists(animToPlayKey)) {
        sprite.play({ key: animToPlayKey });
      } else if (this.scene.anims.exists(fallbackAnimKey)) {
        sprite.play({ key: fallbackAnimKey });
      }

      // Guardamos datos vitales para recalcular posición
      sprite.setData('textureKey', textureKey);
      sprite.setData('baseX', baseX);
      sprite.setData('baseY', baseY);
      sprite.setData('charScale', finalScale); // Guardamos la escala final calculada

      // Guardamos todos los offsets en el sprite
      allOffsets.forEach((value, key) => sprite.setData(key, value));

      sprite.setData('isSinging', false);
      sprite.setData('singDuration', singDuration);
      sprite.setData('singBeatCountdown', 0);

      // =================================================================
      // --- MÉTODOS HELPER INYECTADOS (CORREGIDOS) ---
      // =================================================================

      /**
       * Reproduce una animación aplicando su offset correspondiente.
       */
      sprite.playAnim = function (animName, force = false) {
        const tKey = this.getData('textureKey');
        const fullKey = `${tKey}_${animName}`;

        if (this.scene.anims.exists(fullKey)) {
          this.play(fullKey, force);

          // [CORRECCIÓN] Recalcular posición X/Y basada en el offset
          const offset = this.getData('offset_' + animName) || [0, 0];
          const bX = this.getData('baseX');
          const bY = this.getData('baseY');
          const s = this.getData('charScale'); // Usar la escala guardada

          // La fórmula mágica: Pos = Base + (Offset * Escala)
          // Nota: Algunos motores restan el offset. Si ves que se mueve al revés, cambia + por -
          this.x = bX + (offset[0] * s);
          this.y = bY + (offset[1] * s);

        } else {
          console.warn(`[CharacterElements] Animación faltante: ${animName}`);
        }
      };

      /**
       * Vuelve a la animación de baile por defecto.
       */
      sprite.dance = function () {
        const tKey = this.getData('textureKey');
        if (this.scene.anims.exists(`${tKey}_idle`)) {
          this.playAnim('idle');
        } else if (this.scene.anims.exists(`${tKey}_danceLeft`)) {
          this.playAnim('danceLeft');
        } else if (this.scene.anims.exists(`${tKey}_danceRight`)) {
          this.playAnim('danceRight');
        }
      };
      // =================================================================

      return sprite;
    };

    this.bf = createSprite(names.player, stageData.player);
    this.dad = createSprite(names.enemy, stageData.enemy);
    this.gf = createSprite(names.gfVersion, stageData.playergf);

    return { bf: this.bf, dad: this.dad, gf: this.gf };
  }

  destroy() {
    this.bf?.destroy();
    this.dad?.destroy();
    this.gf?.destroy();
  }
}