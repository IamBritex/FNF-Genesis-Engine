/**
 * characterElements.js
 * Se encarga de cargar las texturas/atlas y crear los sprites de los personajes.
 */
export class CharacterElements {
  /**
   * @param {Phaser.Scene} scene
   * @param {import('../camera/Camera.js').CameraManager} cameraManager
   */
  constructor(scene, cameraManager) {
    this.scene = scene;
    this.cameraManager = cameraManager;
    
    this.bf = null;
    this.dad = null;
    this.gf = null;
  }

  /**
   * Registra los atlas de los personajes en la cola de carga de Phaser.
   * @param {object} names - { player, enemy, gfVersion }
   * @param {Map<string, object>} jsonContents - Map con el contenido de los JSONs de personajes
   */
  preloadAtlases(names, jsonContents) {
    if (!names) return;

    // Función auxiliar para cargar un atlas
    const loadAtlas = (charName) => {
      const jsonData = jsonContents.get(charName);
      if (!jsonData || !jsonData.image) return;

      const textureKey = `char_${charName}`; // ej. "char_gf"
      
      if (this.scene.textures.exists(textureKey)) {
        return;
      }
      
      const imagePath = jsonData.image.replace("characters/", "");
      
      const texturePath = `public/images/characters/${imagePath}.png`;
      const atlasPath = `public/images/characters/${imagePath}.xml`;

      this.scene.load.atlasXML(textureKey, texturePath, atlasPath);
      console.log(`CharacterElements: Registrando carga de Atlas: ${texturePath}`);
    };

    loadAtlas(names.player);
    loadAtlas(names.enemy);
    loadAtlas(names.gfVersion);
  }

  /**
   * [MODIFICADO] Crea los sprites de los personajes y les aplica las propiedades del stage.json.
   * Ahora soporta scroll diferenciado (X/Y), rotación y flip Y.
   * @param {object} names - { player, enemy, gfVersion }
   * @param {object} stageData - { player, enemy, playergf }
   * @param {Map<string, object>} jsonContents - Map con el contenido de los JSONs de personajes
   * @returns {object} - { bf, dad, gf }
   */
  createSprites(names, stageData, jsonContents) {
    // Función auxiliar para crear un sprite
    const createSprite = (charName, stageBlock) => {
      if (!charName || !stageBlock) return null;

      const textureKey = `char_${charName}`;
      const texture = this.scene.textures.get(textureKey);

      if (!texture || !texture.source || !texture.source[0] || !texture.source[0].glTexture) {
        console.warn(`CharacterElements: No se pudo crear sprite para '${charName}', textura no encontrada o no lista: ${textureKey}`);
        return null;
      }
      
      const jsonData = jsonContents.get(charName);

      if (!jsonData) {
        console.warn(`CharacterElements: No se encontró JSON data para '${charName}'. Abortando creación de sprite.`);
        return null;
      }
      
      const singDuration = jsonData.sing_duration || 4;
      
      // --- [INICIO DE LÓGICA DE POSICIONAMIENTO] ---

      // 1. Crear el Map de offsets ANTES
      const allOffsets = new Map();
      if (jsonData.animations) {
        jsonData.animations.forEach(anim => {
          if (anim.anim && anim.offsets) {
            allOffsets.set('offset_' + anim.anim, anim.offsets);
          }
        });
      }

      // 2. Encontrar la animación 'idle' (o 'danceLeft' como fallback)
      let frameWidth = 1, frameHeight = 1;
      let animToPlayKey = `${textureKey}_idle`;
      let fallbackAnimKey = `${textureKey}_danceLeft`;
      
      let defaultAnimData = jsonData.animations.find(a => a.anim === 'idle' || a.anim === 'idle-loop');
      if (!defaultAnimData) {
        defaultAnimData = jsonData.animations.find(a => a.anim === 'danceLeft' || a.anim === 'danceLeft-loop');
        animToPlayKey = fallbackAnimKey; 
      }

      // 3. Obtener el offset de la anim por defecto
      const initialAnimName = (defaultAnimData && defaultAnimData.anim) ? defaultAnimData.anim : 'idle';
      const initialOffset = allOffsets.get('offset_' + initialAnimName) || [0, 0];

      // 4. Obtener las dimensiones del primer frame
      if (defaultAnimData && defaultAnimData.name) {
        const frames = this.scene.textures.get(textureKey).getFrameNames();
        const firstFrameName = frames.find(f => f.startsWith(defaultAnimData.name));

        if (firstFrameName) {
          const frame = this.scene.textures.get(textureKey).get(firstFrameName);
          frameWidth = frame.width;
          frameHeight = frame.height;
        } else {
          console.warn(`CharacterElements: No se encontró ningún frame para el prefijo: ${defaultAnimData.name}`);
        }
      } else {
        console.warn(`CharacterElements: No se encontró 'idle' o 'danceLeft' en ${charName}.json`);
      }

      // 5. Calcular la escala total
      const baseScale = jsonData.scale || 1;
      const finalScale = baseScale * stageBlock.scale;

      // 6. Calcular las dimensiones finales escaladas
      const scaledWidth = frameWidth * finalScale;
      const scaledHeight = frameHeight * finalScale;

      // 7. Obtener la POSICIÓN DE ANCLAJE (Bottom-Center) del stage.json
      const anchorX = stageBlock.position[0];
      const anchorY = stageBlock.position[1];

      // 8. Calcular el 'baseX' y 'baseY' (el punto 0,0 lógico)
      // El punto (0,0) lógico se calcula restando el offset de la anim 'idle' 
      // y las dimensiones del frame 'idle' desde el punto de anclaje (Centro-Abajo).
      const baseX = anchorX - (initialOffset[0] * finalScale) - (scaledWidth / 2);
      const baseY = anchorY - (initialOffset[1] * finalScale) - scaledHeight;
      
      // 9. Calcular la POSICIÓN INICIAL (con offset de 'idle' o 'danceLeft')
      const initialX = baseX + (initialOffset[0] * finalScale);
      const initialY = baseY + (initialOffset[1] * finalScale);
      
      // --- [FIN DE LÓGICA DE POSICIONAMIENTO] ---
      
      const sprite = this.scene.add.sprite(initialX, initialY, textureKey);

      // 10. Aplicar propiedades generales del stage.json
      sprite.setDepth(stageBlock.layer);
      sprite.setAlpha(stageBlock.opacity);
      sprite.setVisible(stageBlock.visible);
      
      // [NUEVO] Lógica de Scroll X/Y
      if (stageBlock.scroll_x !== undefined && stageBlock.scroll_y !== undefined) {
          sprite.setScrollFactor(stageBlock.scroll_x, stageBlock.scroll_y);
      } else {
          sprite.setScrollFactor(stageBlock.scrollFactor ?? 1);
      }

      // [NUEVO] Lógica de Rotación
      if (stageBlock.angle) {
          sprite.setAngle(stageBlock.angle);
      }
      
      // 11. Aplicar escala
      sprite.setScale(finalScale);

      // 12. Aplicar Flip X (XOR con el valor por defecto del personaje)
      const defaultFlipX = jsonData.flip_x === true;
      const stageFlipX = stageBlock.flip_x === true;
      sprite.setFlipX(defaultFlipX !== stageFlipX); 

      // [NUEVO] Aplicar Flip Y
      sprite.setFlipY(stageBlock.flip_y === true);

      // 13. Asignar a la cámara de juego
      if (this.cameraManager) {
        this.cameraManager.assignToGame(sprite);
      }

      // 14. Aplicar origen (¡CRUCIAL! Debe ser 0,0 para que la lógica de offsets funcione)
      sprite.setOrigin(0, 0);

      // 15. Reproducir animación "idle" o "danceLeft"
      if (this.scene.anims.exists(animToPlayKey)) {
        sprite.play({ key: animToPlayKey }); 
      } else {
        if (this.scene.anims.exists(fallbackAnimKey)) {
           sprite.play({ key: fallbackAnimKey });
        } else {
           console.warn(`CharacterElements: No se encontró la animación 'idle' o 'danceLeft' para ${charName}`);
        }
      }
      
      sprite.setData('textureKey', textureKey);
      
      // 16. Guardar el 'baseX' y 'baseY' (el 0,0 lógico)
      sprite.setData('baseX', baseX);
      sprite.setData('baseY', baseY);
      allOffsets.forEach((value, key) => {
        sprite.setData(key, value);
      });
      
      // 17. Inicializar la bandera de "cantando"
      sprite.setData('isSinging', false);
      sprite.setData('singDuration', singDuration);
      sprite.setData('singBeatCountdown', 0);
      
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