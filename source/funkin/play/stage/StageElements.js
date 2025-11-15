/**
 * StageElements.js
 * Se encarga de precargar y crear los sprites
 * (imágenes, spritesheets) de un escenario.
 */
import { StageSpritesheet } from "./StageSpritesheet.js";
export class StageElements {
  /**
   * @param {Phaser.Scene} scene - La escena de PlayState.
   * @param {string} stageDataKey - El nombre del escenario (ej. "school").
   * @param {import('../camera/Camera.js').CameraManager} cameraManager - El gestor de cámaras.
   */
  constructor(scene, stageDataKey, cameraManager) {
    this.scene = scene;
    this.stageDataKey = stageDataKey; // (Puede ser actualizado por Stage.js al de "stage")
    this.cameraManager = cameraManager; // Guardamos la referencia
    this.stageElements = [];
    this.spritesheetHandler = new StageSpritesheet(scene, stageDataKey, cameraManager);
  }

  /**
   * Lee el JSON del escenario y registra las imágenes necesarias en la cola de carga.
   * @param {object} stageContent - El contenido del JSON del escenario.
   */
  preloadImages(stageContent) {
    if (!this.cameraManager) {
        console.error("StageElements: No se puede precargar sin CameraManager.");
        return;
    }
    if (!stageContent || !stageContent.stage) return;

    for (const item of stageContent.stage) {
      // --- [MODIFICADO] ---
      if (item.type === "spritesheet") {
        this.spritesheetHandler.preload(item);
      } else if (item.type === "image") {
      // --- [FIN MODIFICADO] ---

        const namePath = item.namePath;
        if (!namePath) {
          console.warn("StageElements: Elemento de imagen no tiene 'namePath'", item);
          continue;
        }

        // Usamos el stageDataKey (que puede ser el original o el de fallback)
        const textureKey = `stage_${this.stageDataKey}_${namePath}`;
        
        if (this.scene.textures.exists(textureKey)) {
          continue;
        }

        // Ruta a la imagen (ej. .../stages/stage/stageback.png)
        const imagePath = `public/images/stages/${this.stageDataKey}/${namePath}.png`;
        
        this.scene.load.image(textureKey, imagePath);
        console.log(`StageElements: Registrando carga de: ${imagePath}`);
      }
    }
  }

  /**
   * Crea los sprites en la escena usando los assets ya cargados.
   * @param {object} stageContent - El contenido del JSON del escenario.
   */
  createSprites(stageContent) {
    if (!this.cameraManager) {
        console.error("StageElements: No se puede crear sprites sin CameraManager.");
        return;
    }
    if (!stageContent || !stageContent.stage) return;

    for (const item of stageContent.stage) {
      // --- [MODIFICADO] ---
      if (item.type === "spritesheet") {
        this.spritesheetHandler.create(item);
        continue; // Pasar al siguiente elemento
      } else if (item.type === "image") {
      // --- [FIN MODIFICADO] ---

        const namePath = item.namePath;
        const textureKey = `stage_${this.stageDataKey}_${namePath}`;

        if (!this.scene.textures.exists(textureKey)) {
          console.warn(`StageElements: No se pudo crear el sprite, textura no encontrada: ${textureKey}`);
          continue;
        }

        const sprite = this.scene.add.image(
          item.position[0],
          item.position[1],
          textureKey
        );

        sprite.setDepth(item.layer);
        sprite.setAlpha(item.opacity);
        sprite.setFlipX(item.flip_x);
        sprite.setScrollFactor(item.scrollFactor);
        sprite.setData('baseX', item.position[0]);
        sprite.setData('baseY', item.position[1]);

        // --- ¡¡AQUÍ ESTÁ LA SOLUCIÓN!! ---
        // Asignar el sprite SÓLO a la gameCamera
        this.cameraManager.assignToGame(sprite);
        // --- FIN DE LA SOLUCIÓN ---

        this.stageElements.push(sprite);
      }
    }
    
    console.log(`StageElements: Creados ${this.stageElements.length} elementos visuales.`);
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