import { StageSpritesheet } from "./StageSpritesheet.js";

/**
 * El punto de anclaje (origen) por defecto para las imágenes.
 * @type {{x: number, y: number}}
 */
export const IMAGE_ORIGIN = { x: 0.5, y: 0.5 };

export class StageElements {
  /**
   * @param {Phaser.Scene} scene - La escena de PlayState.
   * @param {string} stageDataKey - El nombre del escenario (ej. "school").
   * @param {import('../camera/Camera.js').CameraManager} cameraManager - El gestor de cámaras.
   * @param {import('../Conductor.js').Conductor} conductor - El gestor de BPM.
   */
  constructor(scene, stageDataKey, cameraManager, conductor) {
    this.scene = scene;
    this.stageDataKey = stageDataKey;
    this.cameraManager = cameraManager;
    this.conductor = conductor;
    
    /** @type {Array<Phaser.GameObjects.Image>} */
    this.stageElements = [];

    this.spritesheetHandler = new StageSpritesheet(scene, stageDataKey, cameraManager, this.conductor);
  }

  /**
   * Lee el JSON del escenario y registra las imágenes necesarias en la cola de carga.
   * Soporta recursividad para Grupos.
   * @param {object} stageContent - El contenido del JSON del escenario.
   */
  preloadImages(stageContent) {
    if (!this.cameraManager) {
        console.error("StageElements: No se puede precargar sin CameraManager.");
        return;
    }
    if (!stageContent || !stageContent.stage) return;

    this._traverseStageData(stageContent.stage, (item, type) => {
        if (type === "spritesheet") {
            this.spritesheetHandler.preload(item);
        } else if (type === "image") {
            const namePath = item.namePath;
            if (namePath) {
                const textureKey = `stage_${this.stageDataKey}_${namePath}`;
                if (!this.scene.textures.exists(textureKey)) {
                    const imagePath = `public/images/stages/${this.stageDataKey}/${namePath}.png`;
                    this.scene.load.image(textureKey, imagePath);
                    console.log(`StageElements: Registrando carga de: ${imagePath}`);
                }
            }
        }
    });
  }

  /**
   * Crea los sprites en la escena usando los assets ya cargados.
   * Soporta recursividad para Grupos.
   * @param {object} stageContent - El contenido del JSON del escenario.
   */
  createSprites(stageContent) {
    if (!this.cameraManager) {
        console.error("StageElements: No se puede crear sprites sin CameraManager.");
        return;
    }
    if (!stageContent || !stageContent.stage) return;

    this._traverseStageData(stageContent.stage, (item, type) => {
        if (type === "spritesheet") {
            this.spritesheetHandler.create(item);
        } else if (type === "image") {
            this._createSingleImage(item);
        }
    });
    
    console.log(`StageElements: Creados ${this.stageElements.length} elementos visuales.`);
  }

  _createSingleImage(item) {
      const namePath = item.namePath;
      const textureKey = `stage_${this.stageDataKey}_${namePath}`;

      if (!this.scene.textures.exists(textureKey)) {
          console.warn(`StageElements: No se pudo crear el sprite, textura no encontrada: ${textureKey}`);
          return;
      }

      // --- [NUEVO] Detectar Pixel Art en Stage Elements ---
      if (item.isPixel) {
          const texture = this.scene.textures.get(textureKey);
          if (texture) {
              texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
          }
      }
      // --- [FIN NUEVO] ---

      const sprite = this.scene.add.image(
          item.position[0],
          item.position[1],
          textureKey
      );

      // Usar el origen por defecto FIJO para imágenes.
      sprite.setOrigin(IMAGE_ORIGIN.x, IMAGE_ORIGIN.y);
      
      sprite.setScale(item.scale ?? 1);
      sprite.setDepth(item.layer);
      sprite.setAlpha(item.opacity ?? 1);
      sprite.setFlipX(item.flip_x || false);
      sprite.setFlipY(item.flip_y || false); 
      sprite.setScrollFactor(item.scrollFactor ?? 1);
      sprite.setData('baseX', item.position[0]);
      sprite.setData('baseY', item.position[1]);

      this.cameraManager.assignToGame(sprite);
      this.stageElements.push(sprite);
  }

  /**
   * Función auxiliar para recorrer la estructura del escenario recursivamente.
   */
  _traverseStageData(nodeList, callback) {
      if (!Array.isArray(nodeList)) return;

      for (const node of nodeList) {
          if (node.type) {
              if (node.type === 'group') {
                  if (node.children) this._traverseStageData(node.children, callback);
              } else {
                  callback(node, node.type);
              }
              continue;
          }

          const keys = Object.keys(node);
          if (keys.length === 1) {
              const key = keys[0];
              const content = node[key];
              
              if (content && content.type === 'group') {
                  if (content.children) {
                      this._traverseStageData(content.children, callback);
                  }
              } else if (content && (content.type === 'image' || content.type === 'spritesheet')) {
                  callback(content, content.type);
              }
          }
      }
  }

  /**
   * Destruye todos los elementos creados.
   */
  destroy() {
    for (const element of this.stageElements) {
      element.destroy();
    }
    this.spritesheetHandler.destroy();
    this.stageElements = [];
  }
}