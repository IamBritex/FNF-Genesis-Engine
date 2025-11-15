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
   * Crea los sprites de los personajes y les aplica las propiedades del stage.json.
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

      // --- [NUEVO] Guardar Sing Duration ---
      // Si no existe, usamos 4 beats por defecto
      const singDuration = jsonData.sing_duration || 4;
      // --- Fin del cambio ---
      
      // --- ¡¡INICIO DE LA LÓGICA DE ANCLAJE (COPIADA DEL EDITOR)!! ---
      let frameWidth = 1;
      let frameHeight = 1;
      let animToPlayKey = `${textureKey}_idle`;
      let fallbackAnimKey = `${textureKey}_danceLeft`;

      // 1. Encontrar la animación 'idle' (o 'danceLeft' como fallback) en el JSON del personaje
      let defaultAnimData = jsonData.animations.find(a => a.anim === 'idle' || a.anim === 'idle-loop');
      
      if (!defaultAnimData) {
        defaultAnimData = jsonData.animations.find(a => a.anim === 'danceLeft' || a.anim === 'danceLeft-loop');
        animToPlayKey = fallbackAnimKey; // Usaremos danceLeft si idle no existe
      }

      // 2. Obtener las dimensiones del primer frame de esa animación
      if (defaultAnimData && defaultAnimData.name) {
        const frames = this.scene.textures.get(textureKey).getFrameNames();
        // Buscamos un frame que COMIENCE con el nombre de la animación.
        // ej. 'bf idle dance' puede tener frames como 'bf idle dance0000', 'bf idle dance0001', etc.
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

      // 3. Calcular la escala total (JSON del personaje * JSON del escenario)
      const baseScale = jsonData.scale || 1;
      const finalScale = baseScale * stageBlock.scale;

      // 4. Calcular las dimensiones finales escaladas
      const scaledWidth = frameWidth * finalScale;
      const scaledHeight = frameHeight * finalScale;

      // 5. Obtener la POSICIÓN DE ANCLAJE (Bottom-Center) del stage.json
      const anchorX = stageBlock.position[0];
      const anchorY = stageBlock.position[1];

      // 6. Calcular la posición final (Top-Left) para el sprite con origin (0, 0)
      const finalX = anchorX - (scaledWidth / 2);
      const finalY = anchorY - scaledHeight;
      
      // --- FIN DE LA LÓGICA DE ANCLAJE ---
      
      const baseX = finalX;
      const baseY = finalY;
      // Usamos un Map para guardar los offsets que le pondremos al sprite
      const allOffsets = new Map();
      if (jsonData.animations) {
        jsonData.animations.forEach(anim => {
          if (anim.anim && anim.offsets) {
            allOffsets.set('offset_' + anim.anim, anim.offsets);
          }
        });
      }
      
      // Calcular la POSICIÓN INICIAL (con offset de 'idle' o 'danceLeft')
      const initialAnimName = (defaultAnimData && defaultAnimData.anim) ? defaultAnimData.anim : null;
      let initialX = baseX;
      let initialY = baseY;

      if (initialAnimName) {
          // Busca el offset inicial (ej. 'offset_idle') en el Map
          const initialOffset = allOffsets.get('offset_' + initialAnimName) || [0, 0];
          // Aplica el offset escalado
          initialX = baseX + (initialOffset[0] * finalScale);
          initialY = baseY + (initialOffset[1] * finalScale);
      }
      // --- Fin del cambio ---

      const sprite = this.scene.add.sprite(initialX, initialY, textureKey);

      // 8. Aplicar propiedades del stage.json
      sprite.setDepth(stageBlock.layer);
      sprite.setAlpha(stageBlock.opacity);
      sprite.setScrollFactor(stageBlock.scrollFactor);
      sprite.setVisible(stageBlock.visible);
      
      // 9. Aplicar escala
      sprite.setScale(finalScale);

      // 10. Aplicar Flip (XOR)
      const defaultFlip = jsonData.flip_x === true;
      const stageFlip = stageBlock.flip_x === true;
      sprite.setFlipX(defaultFlip !== stageFlip); 

      // 11. Asignar a la cámara de juego
      if (this.cameraManager) {
        this.cameraManager.assignToGame(sprite);
      }

      // 12. Aplicar origen (¡CRUCIAL! Debe ser 0,0 para que el cálculo funcione)
      sprite.setOrigin(0, 0);

      // 13. Reproducir animación "idle" o "danceLeft"
      if (this.scene.anims.exists(animToPlayKey)) {
        sprite.play({ key: animToPlayKey }); 
      } else {
        // Fallback si la anim 'idle' no existe pero 'danceLeft' sí
        if (this.scene.anims.exists(fallbackAnimKey)) {
           sprite.play({ key: fallbackAnimKey });
        } else {
           console.warn(`CharacterElements: No se encontró la animación 'idle' o 'danceLeft' para ${charName}`);
        }
      }
      
      // Guardar el nombre de la textura en el sprite para el booper
      sprite.setData('textureKey', textureKey);
      
      // --- [NUEVO] Guardar la posición base y TODOS los offsets en el sprite ---
      sprite.setData('baseX', baseX);
      sprite.setData('baseY', baseY);
      allOffsets.forEach((value, key) => {
        sprite.setData(key, value);
      });
      // --- Fin del cambio ---
      
      // --- [NUEVO] ---
      // Inicializar la bandera de "cantando"
      sprite.setData('isSinging', false);
      // Guardar sing_duration y el contador de beats
      sprite.setData('singDuration', singDuration);
      sprite.setData('singBeatCountdown', 0); // Inicia en 0
      // --- Fin del cambio ---
      
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