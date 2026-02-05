export class CharacterAnimations {
  constructor(scene) { this.scene = scene; }

  createAllAnimations(names, jsonContents, sessionId) {
    if (!names) return;
    const setupAnims = (charName) => {
      const jsonData = jsonContents.get(charName);
      if (!jsonData || !jsonData.animations) return;
      const textureKey = `char_${charName}_${sessionId}`;
      if (!this.scene.textures.exists(textureKey)) return;
      const frames = this.scene.textures.get(textureKey).getFrameNames();

      for (const animation of jsonData.animations) {
        const animKey = `${textureKey}_${animation.anim}`;
        if (this.scene.anims.exists(animKey)) continue;

        let animationFrames;
        if (animation.indices?.length > 0) {
          animationFrames = animation.indices.map((index) => {
              const paddedIndex = String(index).padStart(4, "0"); 
              return frames.find((frame) => frame.startsWith(`${animation.name}${paddedIndex}`));
            }).filter(Boolean); 
        } else {
          animationFrames = frames.filter((frame) => frame.startsWith(animation.name)).sort();
        }

        if (animationFrames.length > 0) {
          this.scene.anims.create({
            key: animKey,
            frames: animationFrames.map((frameName) => ({ key: textureKey, frame: frameName })),
            frameRate: animation.fps || 24,
            repeat: 0,
          });
        }
      }
    };
    setupAnims(names.player);
    setupAnims(names.enemy);
    setupAnims(names.gfVersion);
  }
}