/**
 * charactersBooper.js
 * Módulo para manejar el baile rítmico.
 * Ahora es reactivo: recibe órdenes en lugar de calcular el tiempo.
 */
export class CharacterBooper {
  constructor(scene) {
    this.scene = scene;
    this.bf = null;
    this.dad = null;
    this.gf = null;
    this.gfDanceDirection = "right";
  }

  setCharacterSprites(bf, dad, gf) {
    this.bf = bf;
    this.dad = dad;
    this.gf = gf;
  }

  /**
   * Llamado cuando ocurre un BEAT.
   * @param {number} beat 
   */
  onBeat(beat) {
    // BF
    if (this.bf && this.bf.active) {
        // La lógica de "si está cantando no bailes" ahora se maneja dentro del propio personaje (AnimateAtlasCharacter)
        // o en su módulo CharacterSing. Aquí solo mandamos la señal de "baila si puedes".
        this.playAnimation(this.bf, 'idle', false); 
    }

    // DAD
    if (this.dad && this.dad.active) {
        this.playAnimation(this.dad, 'idle', false);
    }

    // GF (Alternancia)
    if (this.gf && this.gf.active) {
      if (beat % 2 === 0) {
        this.gfDanceDirection = this.gfDanceDirection === "left" ? "right" : "left";
      }
      const animToPlay = this.gfDanceDirection === "left" ? 'danceLeft' : 'danceRight';
      this.playAnimation(this.gf, animToPlay, true); // GF suele forzar el baile
    }
  }

  playAnimation(sprite, animName, force = false) {
    if (!sprite || !sprite.active) return;
    
    // Delegamos al método inteligente del sprite si existe
    if (typeof sprite.playAnim === 'function') {
        // playAnim(animName, ignoreIfPlaying) -> ignoreIfPlaying es lo opuesto a force
        sprite.playAnim(animName, !force);
    } else {
        // Fallback estándar de Phaser
        const textureKey = sprite.getData('textureKey');
        const animKey = `${textureKey}_${animName}`;
        if (this.scene.anims.exists(animKey)) {
             sprite.play(animKey, !force);
        }
    }
  }
}