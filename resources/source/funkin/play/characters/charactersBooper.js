/**
 * charactersBooper.js
 * Módulo para manejar el ritmo (beats) de los personajes.
 */
export class CharacterBooper {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} bpm - BPM de la canción (desde chartData)
   */
  constructor(scene, bpm) {
    this.scene = scene;
    this.bpm = bpm || 100;

    // Lógica de cálculo de beat
    this.crochet = (60 / this.bpm) * 1000;
    this.stepCrochet = this.crochet / 4;
    this.currentStep = 0;
    this.lastStep = 0;
    
    this.isPlaying = false;
    this.bf = null;
    this.dad = null;
    this.gf = null;

    this.gfDanceDirection = "right"; // Para alternar
  }

  /**
   * Recibe las referencias a los sprites de los personajes.
   * @param {Phaser.GameObjects.Sprite} bf
   * @param {Phaser.GameObjects.Sprite} dad
   * @param {Phaser.GameObjects.Sprite} gf
   */
  setCharacterSprites(bf, dad, gf) {
    this.bf = bf;
    this.dad = dad;
    this.gf = gf;
  }

  startBeatSystem() {
    this.isPlaying = true;
    this.currentStep = 0;
    this.lastStep = 0;
    console.log(`CharacterBooper: Sistema iniciado a ${this.bpm} BPM.`);
  }

  stopBeatSystem() {
    this.isPlaying = false;
  }

  /**
   * Debe ser llamado desde PlayScene.update()
   * @param {number} songPosition - El tiempo actual de la canción en ms.
   */
  update(songPosition) {
    if (!this.isPlaying || songPosition < 0) return;

    const oldStep = this.currentStep;
    
    // El reloj ahora es la posición de la canción
    this.currentStep = Math.floor(songPosition / this.stepCrochet); 

    if (this.currentStep > this.lastStep) {
      this.lastStep = this.currentStep;

      // Cada 4 steps es un beat
      if (this.currentStep % 4 === 0) {
        this.onBeat(Math.floor(this.currentStep / 4));
      }
    }
  }

  /**
   * Se llama en cada beat.
   * @param {number} beat - El número del beat actual
   */
  onBeat(beat) {
    if (!this.isPlaying) return;

    // --- [LÓGICA DE BF] ---
    if (this.bf && this.bf.active) {
      if (this.bf.getData('isSinging')) {
        // Está cantando, descontamos un beat
        let countdown = this.bf.getData('singBeatCountdown');
        countdown--;
        
        if (countdown <= 0) {
          // Se acabó el tiempo de canto
          this.bf.setData('isSinging', false);
          this.bf.setData('singBeatCountdown', 0);
          this.playAnimation(this.bf, 'idle'); // Volver a idle
        } else {
          // Aún está cantando, guardar el nuevo valor
          this.bf.setData('singBeatCountdown', countdown);
        }
      } else {
        // Si no está cantando, reproducir idle (no forzar)
        this.playAnimation(this.bf, 'idle', false);
      }
    }

    // --- [LÓGICA DE DAD MODIFICADA] ---
    if (this.dad && this.dad.active) {
       if (this.dad.getData('isSinging')) {
        // Está cantando, descontamos un beat
        let countdown = this.dad.getData('singBeatCountdown');
        countdown--;
        
        if (countdown <= 0) {
          // Se acabó el tiempo de canto
          this.dad.setData('isSinging', false);
          this.dad.setData('singBeatCountdown', 0);
          this.playAnimation(this.dad, 'idle'); // Volver a idle
        } else {
          // Aún está cantando, guardar el nuevo valor
          this.dad.setData('singBeatCountdown', countdown);
        }
      } else {
        // Si no está cantando, reproducir idle (no forzar)
        this.playAnimation(this.dad, 'idle', false);
      }
    }

    // --- Lógica de GF (Sin cambios) ---
    if (this.gf && this.gf.active) {
      
      // 1. Decidimos la dirección:
      if (beat % 2 === 0) {
        this.gfDanceDirection = this.gfDanceDirection === "left" ? "right" : "left";
      }

      // 2. Reproducimos la animación:
      const animToPlay = this.gfDanceDirection === "left" ? 'danceLeft' : 'danceRight';
      this.playAnimation(this.gf, animToPlay);
    }
  }

  /**
   * Reproduce una animación en un sprite, respetando si ya está sonando.
   * @param {Phaser.GameObjects.Sprite} sprite
   * @param {string} animName - El nombre corto (ej. "idle")
   * @param {boolean} [force=false] - Si es true, fuerza la reproducción incluso si ya se está reproduciendo.
   */
  playAnimation(sprite, animName, force = false) {
    
    // --- [INICIO DE LA CORRECCIÓN] ---
    // ¡Añadir esta línea!
    // Si el sprite es nulo o está inactivo, no hacer nada.
    if (!sprite || !sprite.active) return;
    // --- [FIN DE LA CORRECCIÓN] ---

    const textureKey = sprite.getData('textureKey');
    if (!textureKey) return;
    
    const animKey = `${textureKey}_${animName}`; // ej. char_bf_idle

    // --- [CAMBIO] Lógica de Fallback ---
    if (!this.scene.anims.exists(animKey)) {
        // Si la animación de canto (ej. 'singLEFT') no existe...
        if (animName.startsWith('sing')) {
            // ...intentamos reproducir 'idle' en su lugar.
            this.playAnimation(sprite, 'idle', force);
        }
        // Si 'idle' tampoco existe, o era 'idle' la que falló, simplemente retornamos.
        return; 
    }
    // --- Fin del cambio ---

    // --- [MODIFICADO] Lógica para reiniciar animación (Goal 3) ---
    const currentAnim = sprite.anims.currentAnim;

    // Si 'force' es true, 'ignoreIfPlaying' es false (o sea, SÍ reiniciar)
    // Si 'force' es false (idle), 'ignoreIfPlaying' es true (o sea, NO reiniciar)
    const ignoreIfPlaying = !force; 

    // Condición para SÍ reproducir:
    // 1. No hay animación actual
    // 2. La animación es diferente
    // 3. La animación no se está reproduciendo
    // 4. Se está forzando (force = true)
    if (force || !currentAnim || currentAnim.key !== animKey || !sprite.anims.isPlaying) {
      
      // Usamos 'play' con el 'ignoreIfPlaying' calculado.
      // Si force=true, ignoreIfPlaying=false -> Reinicia la animación
      // Si force=false, ignoreIfPlaying=true -> No reinicia 'idle' si ya está sonando
      sprite.play(animKey, ignoreIfPlaying); 

      // --- (Lógica de Offsets - sin cambios) ---
      const baseX = sprite.getData('baseX');
      const baseY = sprite.getData('baseY');
      const offset = sprite.getData('offset_' + animName) || [0, 0];
      const scale = sprite.scaleX; 
      if (baseX !== undefined && baseY !== undefined) {
          sprite.setPosition(baseX + (offset[0] * scale), baseY + (offset[1] * scale));
      }
      // --- Fin de Offsets ---
    }
    // --- Fin del cambio ---
  }
}