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
   * Ahora soporta detección de Pixel Art y validación robusta de texturas.
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
      
      // --- VERIFICACIÓN DE TEXTURA ROBUSTA ---
      const texture = this.scene.textures.get(textureKey);

      // 1. Verificar existencia de la textura y su fuente
      if (!texture || !texture.source || !texture.source[0]) {
        console.warn(`CharacterElements: Textura '${textureKey}' no encontrada o corrupta. Evitando creación.`);
        return null;
      }

      // 2. Verificar si la textura tiene frames (indica que el Atlas XML se cargó correctamente)
      // Si frameTotal es <= 1 (solo el frame __BASE), significa que no se parsearon frames del XML.
      // Esto causa que las animaciones no se encuentren y puede llevar al crash de glTexture si se intenta renderizar.
      if (texture.frameTotal <= 1) {
         console.warn(`CharacterElements: La textura '${textureKey}' tiene 0 frames (fallo en Atlas XML). Evitando creación para prevenir crash.`);
         return null;
      }

      // 3. Verificar glTexture (prevención del crash específico reportado)
      if (!texture.source[0].glTexture) {
        console.warn(`CharacterElements: La textura '${textureKey}' no tiene glTexture lista. Evitando creación.`);
        return null;
      }
      
      const jsonData = jsonContents.get(charName);

      if (!jsonData) {
        console.warn(`CharacterElements: No se encontró JSON data para '${charName}'. Abortando creación de sprite.`);
        return null;
      }

      // --- [NUEVO] Detectar Pixel Art ---
      // Verifica las propiedades comunes para pixel art en motores FNF
      const isPixel = jsonData.isPixel === true || jsonData.no_antialiasing === true || jsonData.antialiasing === false;
      
      if (isPixel) {
          // Establecer filtro Nearest Neighbor para bordes definidos (pixel art nítido)
          texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
      // --- [FIN NUEVO] ---
      
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
        // Si no hay animación por defecto, intentamos usar el primer frame disponible para evitar errores
        const frames = texture.getFrameNames();
        if (frames.length > 0 && frames[0] !== '__BASE') {
             const frame = texture.get(frames[0]);
             frameWidth = frame.width;
             frameHeight = frame.height;
        }
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
      const baseX = anchorX - (initialOffset[0] * finalScale) - (scaledWidth / 2);
      const baseY = anchorY - (initialOffset[1] * finalScale) - scaledHeight;
      
      // 9. Calcular la POSICIÓN INICIAL
      const initialX = baseX + (initialOffset[0] * finalScale);
      const initialY = baseY + (initialOffset[1] * finalScale);
      
      // --- [FIN DE LÓGICA DE POSICIONAMIENTO] ---
      
      const sprite = this.scene.add.sprite(initialX, initialY, textureKey);

      // 10. Aplicar propiedades
      sprite.setDepth(stageBlock.layer);
      sprite.setAlpha(stageBlock.opacity);
      sprite.setVisible(stageBlock.visible);
      
      if (stageBlock.scroll_x !== undefined && stageBlock.scroll_y !== undefined) {
          sprite.setScrollFactor(stageBlock.scroll_x, stageBlock.scroll_y);
      } else {
          sprite.setScrollFactor(stageBlock.scrollFactor ?? 1);
      }

      if (stageBlock.angle) {
          sprite.setAngle(stageBlock.angle);
      }
      
      sprite.setScale(finalScale);

      const defaultFlipX = jsonData.flip_x === true;
      const stageFlipX = stageBlock.flip_x === true;
      sprite.setFlipX(defaultFlipX !== stageFlipX