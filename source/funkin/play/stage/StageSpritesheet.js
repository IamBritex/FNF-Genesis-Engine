/**
 * StageSpritesheet.js
 * Se encarga de precargar y crear los spritesheets animados de un escenario.
 */

/**
 * El punto de anclaje (origen) por defecto para los spritesheets.
 * @type {{x: number, y: number}}
 */
export const SPRITESHEET_ORIGIN = { x: 0.5, y: 0.5 };

export class StageSpritesheet {
  /**
   * @param {Phaser.Scene} scene - La escena de PlayState.
   * @param {string} stageDataKey - El nombre del escenario (ej. "spooky").
   * @param {import('../camera/Camera.js').CameraManager} cameraManager - El gestor de cámaras.
   * @param {import('../Conductor.js').Conductor} conductor - El gestor de BPM.
   */
  constructor(scene, stageDataKey, cameraManager, conductor) { 
    this.scene = scene;
    this.stageDataKey = stageDataKey;
    this.cameraManager = cameraManager;
    /** * El gestor de ritmo.
     * @type {import('../Conductor.js').Conductor | null} 
     */
    this.conductor = conductor; 
    
    /** @type {Array<Phaser.GameObjects.Sprite>} */
    this.createdSprites = [];
    
    /** * Flag para asegurar que solo registramos el listener una vez.
     * @type {boolean} 
     */
    this.beatListenerRegistered = false; 
  }

  /**
   * Registra los assets del spritesheet (imagen y XML) en la cola de carga.
   * @param {object} item - El objeto del elemento desde el JSON del escenario.
   */
  preload(item) {
    const namePath = item.namePath;
    if (!namePath) {
      console.warn("StageSpritesheet: Elemento no tiene 'namePath'", item);
      return;
    }

    const textureKey = `stage_${this.stageDataKey}_${namePath}`;
    if (this.scene.textures.exists(textureKey)) {
      return;
    }

    const basePath = `public/images/stages/${this.stageDataKey}/${namePath}`;
    const imagePath = `${basePath}.png`;
    const xmlPath = `${basePath}.xml`;

    this.scene.load.atlasXML(textureKey, imagePath, xmlPath);
    console.log(`StageSpritesheet: Registrando carga de Atlas: ${imagePath}`);
  }

  /**
   * Crea el sprite, las animaciones y lo configura para 'Loop' o 'Beat'.
   * @param {object} item - El objeto del elemento desde el JSON del escenario.
   */
  create(item) {
    const namePath = item.namePath;
    const textureKey = `stage_${this.stageDataKey}_${namePath}`;

    if (!this.scene.textures.exists(textureKey)) {
      console.warn(`StageSpritesheet: Textura no encontrada para crear sprite: ${textureKey}`);
      return;
    }
    
    const anim = item.animation || {};
    const play_list = anim.play_list || {}; 
    const play_mode = anim.play_mode || 'None';
    const frameRate = anim.frameRate || 24;
    
    // Nombres de las animaciones definidas en play_list
    const animNames = Object.keys(play_list); 

    if (animNames.length === 0) {
        console.warn(`StageSpritesheet: 'play_list' está vacío para ${namePath}. No se creará el sprite.`);
        return;
    }

    // 1. Crear las animaciones de Phaser basadas en 'play_list'
    for (const animName of animNames) {
        const animKey = `${textureKey}_${animName}`; 
        if (this.scene.anims.exists(animKey)) continue;

        const animData = play_list[animName]; 
        if (!animData || !animData.prefix || !animData.indices) {
            console.warn(`StageSpritesheet: Datos de anim '${animName}' inválidos para ${textureKey}.`);
            continue;
        }

        const frameNames = animData.indices.map(idx => `${animData.prefix}${idx}`);
        
        const phaserFrames = [];
        for (const frame of frameNames) {
            if (this.scene.textures.get(textureKey).has(frame)) {
                phaserFrames.push({ key: textureKey, frame: frame });
            } else {
                console.warn(`StageSpritesheet: Frame '${frame}' no encontrado en atlas '${textureKey}'`);
            }
        }

        if (phaserFrames.length > 0) {
            this.scene.anims.create({
                key: animKey,
                frames: phaserFrames,
                frameRate: frameRate,
                repeat: 0, 
            });
        }
    }

    // 2. Crear el sprite
    const firstAnimName = animNames[0]; 
    const firstAnimData = play_list[firstAnimName];
    const firstFrame = `${firstAnimData.prefix}${firstAnimData.indices[0]}`;

    if (!this.scene.textures.get(textureKey).has(firstFrame)) {
        console.error(`StageSpritesheet: Frame inicial '${firstFrame}' no existe. Abortando creación de sprite.`);
        return;
    }

    const sprite = this.scene.add.sprite(item.position[0], item.position[1], textureKey, firstFrame);

    // 3. Aplicar propiedades (FORZANDO ORIGEN 0,0)
    sprite.setOrigin(0, 0); // [CAMBIO] Origen siempre 0,0
    
    sprite.setScale(item.scale ?? 1);
    sprite.setDepth(item.layer);
    sprite.setAlpha(item.opacity ?? 1);
    sprite.setFlipX(item.flip_x || false);
    sprite.setFlipY(item.flip_y || false);
    
    // Lógica de Scroll X/Y (si existe en el JSON)
    if (item.scroll_x !== undefined && item.scroll_y !== undefined) {
        sprite.setScrollFactor(item.scroll_x, item.scroll_y);
    } else {
        sprite.setScrollFactor(item.scrollFactor ?? 1);
    }
    
    // Lógica de Rotación
    if (item.angle) {
        sprite.setAngle(item.angle);
    }

    sprite.setData('baseX', item.position[0]);
    sprite.setData('baseY', item.position[1]);

    // 4. Asignar a la cámara de juego
    this.cameraManager.assignToGame(sprite);

    // 5. Configurar y reproducir animación
    const firstAnimKey = `${textureKey}_${firstAnimName}`; 

    if (play_mode === 'Loop') {
        const animToPlay = this.scene.anims.get(firstAnimKey);
        if (animToPlay) {
            animToPlay.repeat = -1; 
            sprite.play(firstAnimKey);
        } else {
            console.warn(`StageSpritesheet: No se encontró la anim 'Loop' ${firstAnimKey}`);
        }
    } else if (play_mode === 'Beat') {
        const beatInterval = (anim.beat && anim.beat[0] > 0) ? anim.beat[0] : 1;
        
        sprite.setData('beat_anim_list', animNames.map(name => `${textureKey}_${name}`));
        sprite.setData('beat_anim_interval', beatInterval);
        sprite.setData('beat_anim_index', 0); 
        sprite.setData('beat_anim_countdown', beatInterval); 
        
        if (this.scene.anims.exists(firstAnimKey)) {
            sprite.play(firstAnimKey);
        }
    }

    // 6. Registrar el listener del Conductor
    if (play_mode === 'Beat' && this.conductor && !this.beatListenerRegistered) {
        this.conductor.on('beat', this.onBeatUpdate, this);
        this.beatListenerRegistered = true;
    }

    this.createdSprites.push(sprite);
  }

  /**
   * Se llama en cada beat del Conductor.
   */
  onBeatUpdate(beat) {
      if (!this.createdSprites || !this.scene) return;

      for (const sprite of this.createdSprites) {
          if (!sprite || !sprite.active) continue;
          
          const animList = sprite.getData('beat_anim_list');
          if (!animList) continue; 

          let interval = sprite.getData('beat_anim_interval');
          let countdown = sprite.getData('beat_anim_countdown');

          countdown--;

          if (countdown <= 0) {
              let index = sprite.getData('beat_anim_index');
              index = (index + 1) % animList.length; 
              
              const nextAnimKey = animList[index];
              
              if (this.scene && this.scene.anims.exists(nextAnimKey)) {
                  sprite.play(nextAnimKey);
              }

              sprite.setData('beat_anim_index', index);
              sprite.setData('beat_anim_countdown', interval); 
          } else {
              sprite.setData('beat_anim_countdown', countdown);
          }
      }
  }

  /**
   * Destruye todos los sprites creados y quita el listener del conductor.
   */
  destroy() {
    if (this.beatListenerRegistered && this.conductor) {
        this.conductor.off('beat', this.onBeatUpdate, this);
        this.beatListenerRegistered = false;
    }

    this.createdSprites.forEach(s => s.destroy());
    this.createdSprites = [];

    this.conductor = null;
    this.scene = null;
    this.cameraManager = null;
  }
}