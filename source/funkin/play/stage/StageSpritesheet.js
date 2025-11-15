/**
 * StageSpritesheet.js
 * Se encarga de precargar y crear los spritesheets animados de un escenario.
 */
export class StageSpritesheet {
  /**
   * @param {Phaser.Scene} scene - La escena de PlayState.
   * @param {string} stageDataKey - El nombre del escenario (ej. "spooky").
   * @param {import('../camera/Camera.js').CameraManager} cameraManager - El gestor de cámaras.
   */
  constructor(scene, stageDataKey, cameraManager) {
    this.scene = scene;
    this.stageDataKey = stageDataKey;
    this.cameraManager = cameraManager;
    this.createdSprites = [];
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
   * Crea el sprite, las animaciones y lo configura en la escena.
   * @param {object} item - El objeto del elemento desde el JSON del escenario.
   */
  create(item) {
    const namePath = item.namePath;
    const textureKey = `stage_${this.stageDataKey}_${namePath}`;

    if (!this.scene.textures.exists(textureKey)) {
      console.warn(`StageSpritesheet: Textura no encontrada para crear sprite: ${textureKey}`);
      return;
    }

    // 1. Crear animaciones a partir del atlas
    const frames = this.scene.textures.get(textureKey).getFrameNames();
    const animationGroups = this.groupFramesByAnimation(frames);

    Object.entries(animationGroups).forEach(([animName, animFrames]) => {
      const animKey = `${textureKey}_${animName}`;
      if (this.scene.anims.exists(animKey)) return;

      this.scene.anims.create({
        key: animKey,
        frames: animFrames.sort().map((frame) => ({ key: textureKey, frame })),
        frameRate: item.fps || 24,
        repeat: -1, // Siempre en bucle por defecto para escenarios
      });
    });

    // 2. Crear el sprite
    const sprite = this.scene.add.sprite(item.position[0], item.position[1], textureKey);

    // --- [SOLUCIÓN] ---
    // Establecer el origen en la esquina superior izquierda para que coincida con el editor.
    sprite.setOrigin(0, 0);

    // 3. Aplicar propiedades
    sprite.setDepth(item.layer);
    sprite.setAlpha(item.opacity);
    sprite.setFlipX(item.flip_x);
    sprite.setScrollFactor(item.scrollFactor);
    sprite.setData('baseX', item.position[0]);
    sprite.setData('baseY', item.position[1]);

    // 4. Asignar a la cámara de juego
    this.cameraManager.assignToGame(sprite);

    // 5. Reproducir la primera animación disponible
    const firstAnimName = Object.keys(animationGroups)[0];
    if (firstAnimName) {
      sprite.play(`${textureKey}_${firstAnimName}`);
    }

    this.createdSprites.push(sprite);
  }

  /**
   * Agrupa los nombres de los frames por prefijo de animación.
   * @param {string[]} frames - Array con todos los nombres de los frames.
   * @returns {object} - Objeto con las animaciones agrupadas.
   */
  groupFramesByAnimation(frames) {
    const animationGroups = {};
    frames.forEach((frame) => {
      const baseAnimName = frame.replace(/\d+$/, "");
      if (!animationGroups[baseAnimName]) {
        animationGroups[baseAnimName] = [];
      }
      animationGroups[baseAnimName].push(frame);
    });
    return animationGroups;
  }

  /**
   * Destruye todos los sprites creados.
   */
  destroy() {
    this.createdSprites.forEach(s => s.destroy());
    this.createdSprites = [];
  }
}