/* charactersAnimations.js
 * Se encarga de crear las animaciones de Phaser
 * a partir de los datos de los personajes.
 */
export class CharacterAnimations {
  constructor(scene) {
    this.scene = scene;
  }

  /**
   * Itera sobre todos los personajes y crea sus animaciones.
   * [MODIFICADO] Acepta sessionId
   */
  createAllAnimations(names, jsonContents, sessionId) {
    if (!names) return;

    // Función auxiliar para procesar un personaje
    const setupAnims = (charName) => {
      const jsonData = jsonContents.get(charName);
      if (!jsonData || !jsonData.animations) return;
      
      // Usar clave única
      const textureKey = `char_${charName}_${sessionId}`;
      
      if (!this.scene.textures.exists(textureKey)) {
        console.warn(`CharacterAnimations: No se pueden crear anims, textura no encontrada: ${textureKey}`);
        return;
      }

      const frames = this.scene.textures.get(textureKey).getFrameNames();

      for (const animation of jsonData.animations) {
        const animKey = `${textureKey}_${animation.anim}`; // ej. char_bf_12345_idle
        
        if (this.scene.anims.exists(animKey)) {
          continue;
        }

        let animationFrames;

        if (animation.indices?.length > 0) {
          animationFrames = animation.indices
            .map((index) => {
              const paddedIndex = String(index).padStart(4, "0"); 
              return frames.find((frame) => frame.startsWith(`${animation.name}${paddedIndex}`));
            })
            .filter(Boolean); 

        } else {
          animationFrames = frames.filter((frame) => frame.startsWith(animation.name)).sort();
        }

        if (animationFrames.length > 0) {
          const frameRate = animation.fps || 24;
          const repeatVal = 0; // No loopear

          this.scene.anims.create({
            key: animKey,
            frames: animationFrames.map((frameName) => ({
              key: textureKey,
              frame: frameName,
            })),
            frameRate: frameRate,
            repeat: repeatVal,
          });
        } else {
            console.warn(`CharacterAnimations: 0 frames encontrados para anim: ${animation.name} (Key: ${animKey})`);
        }
      }
    };

    setupAnims(names.player);
    setupAnims(names.enemy);
    setupAnims(names.gfVersion);
  }
}