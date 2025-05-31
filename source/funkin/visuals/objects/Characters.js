export class Characters {
  constructor(scene) {
    this.scene = scene;
    this.loadedCharacters = new Map();
    this.notesController = scene.arrowsManager;
    this.currentPlayer = null;
    this.currentEnemy = null;
    this.currentGF = null;
    this.tweens = new Map();
    this.lastCombo = 0;
    this.idleTimers = new Map();
    this.lastBeat = 0;
    this.heldDirections = new Map();
    this.enemyHeldDirections = new Map();

    // Depths por defecto (se pueden sobrescribir desde StageManager)
    this.characterDepths = {
      player1: 60,  // Valor por defecto para player1
      player2: 50,  // Valor por defecto para player2
      gf: 40        // Valor por defecto para gf
    };

    // Configuración de idle basada en BPM
    this.idleConfig = {
      beatsToIdle: 4,  // Number of beats before returning to idle
      beatOffset: 0    // Current beat counter for idle timing
    };

    this.ratingManager = scene.ratingManager;
    this.setupComboReactions();
  }

  // Método para actualizar depths desde StageManager
  updateCharacterDepths(depthsConfig) {
    if (depthsConfig.player1 !== undefined) {
      this.characterDepths.player1 = depthsConfig.player1;
      if (this.currentPlayer) {
        const player = this.loadedCharacters.get(this.currentPlayer);
        if (player?.sprite) player.sprite.setDepth(depthsConfig.player1);
      }
    }
    
    if (depthsConfig.player2 !== undefined) {
      this.characterDepths.player2 = depthsConfig.player2;
      if (this.currentEnemy) {
        const enemy = this.loadedCharacters.get(this.currentEnemy);
        if (enemy?.sprite) enemy.sprite.setDepth(depthsConfig.player2);
      }
    }
    
    if (depthsConfig.gf !== undefined) {
      this.characterDepths.gf = depthsConfig.gf;
      if (this.currentGF) {
        const gf = this.loadedCharacters.get(this.currentGF);
        if (gf?.sprite) gf.sprite.setDepth(depthsConfig.gf);
      }
    }
  }

  async loadCharacterFromSong(songData) {
    if (!songData.song) return;

    const { player1, player2, gfVersion } = songData.song;
    this.currentPlayer = player1;
    this.currentEnemy = player2;
    this.currentGF = gfVersion;

    const loadPromises = [
      this.createCharacter(player1, true),
      this.createCharacter(player2, false),
    ];

    if (gfVersion) {
      loadPromises.push(this.createGFCharacter(gfVersion));
    }

    await Promise.all(loadPromises);
  }

  async createCharacter(characterId, isPlayer) {
    try {
      const textureKey = `character_${characterId}`;
      const characterPath = `public/assets/data/characters/${characterId}.json`;
      const response = await fetch(characterPath);
      const characterData = await response.json();

      if (!this.scene.textures.exists(textureKey)) {
        throw new Error(`Texture ${textureKey} not found!`);
      }

      let sprite = this.scene.add.sprite(0, 0, textureKey);
      sprite.setOrigin(0, 0);
      
      // Asignar depth basado en el tipo de personaje
      const depthKey = isPlayer ? 'player1' : 
                      (characterId === this.currentGF ? 'gf' : 'player2');
      sprite.setDepth(this.characterDepths[depthKey]);

      const texture = this.scene.textures.get(textureKey);
      
      if (isPlayer) {
        this.flipPlayerFrames(texture);
        sprite.setFlipX(characterData.flip_x === false);
      } else {
        sprite.setFlipX(characterData.flip_x === true);
      }

      sprite.setScale(characterData.scale || 1);

      const characterInfo = {
        data: characterData,
        sprite: sprite,
        textureKey: textureKey,
        currentAnimation: null,
        isReady: false,
        basePosition: {
          x: characterData.position[0],
          y: characterData.position[1],
        },
        idleTimer: 0,
        animationsInitialized: false,
        isPlayer: isPlayer
      };

      gsap.set(sprite, {
        x: characterData.position[0],
        y: characterData.position[1],
      });

      await this.setupAnimations(characterInfo);
      await new Promise(resolve => this.scene.time.delayedCall(16, resolve));
      
      characterInfo.animationsInitialized = true;
      characterInfo.isReady = true;
      this.loadedCharacters.set(characterId, characterInfo);
      
      await this.ensureIdleAnimation(characterId);
      this.subscribeToNoteEvents(characterId);

      return characterInfo;
    } catch (error) {
      console.error(`Error loading character ${characterId}:`, error);
      return null;
    }
  }

  async createGFCharacter(characterId) {
    try {
      const textureKey = `character_${characterId}`;
      const characterPath = `public/assets/data/characters/${characterId}.json`;
      const response = await fetch(characterPath);
      const characterData = await response.json();

      const sprite = this.scene.add.sprite(0, 0, textureKey);
      sprite.setOrigin(0, 0);
      sprite.setDepth(this.characterDepths.gf);
      sprite.setFlipX(characterData.flip_x === true);
      sprite.setScale(characterData.scale || 1);

      const characterInfo = {
        data: characterData,
        sprite: sprite,
        textureKey: textureKey,
        isPlayer: false,
        currentAnimation: null,
        isGF: true,
        animationsInitialized: false,
        isReady: false,
        basePosition: {
          x: characterData.position[0],
          y: characterData.position[1],
        },
        idleTimer: 0
      };

      gsap.set(sprite, {
        x: characterData.position[0],
        y: characterData.position[1],
      });

      await this.setupGFAnimation(characterInfo);
      characterInfo.animationsInitialized = true;
      characterInfo.isReady = true;
      
      this.loadedCharacters.set(characterId, characterInfo);
      this.playGFIdleAnimation(characterId);

      return characterInfo;
    } catch (error) {
      console.error(`Error creating GF character ${characterId}:`, error);
      return null;
    }
  }

  async setupGFAnimation(characterInfo) {
    const { data, textureKey } = characterInfo;
    const bpm = this.scene.songData?.song?.bpm || 100;
    
    const animationPromises = data.animations.map(animation => {
      return new Promise((resolve) => {
        const frames = this.scene.textures.get(textureKey).getFrameNames();
        
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
          const animKey = `${textureKey}_${animation.anim}`;

          // Ajustar frameRate basado en BPM
          const frameRate = animation.fps || (24 * (bpm / 100));

          if (!this.scene.anims.exists(animKey)) {
            this.scene.anims.create({
              key: animKey,
              frames: animationFrames.map((frameName) => ({
                key: textureKey,
                frame: frameName,
              })),
              frameRate: frameRate,
              repeat: animation.anim === "idle" || animation.loop ? -1 : 0,
            });
          }
        }
        resolve();
      });
    });

    await Promise.all(animationPromises);
  }

  playGFIdleAnimation(characterId) {
    const character = this.loadedCharacters.get(characterId);
    if (!character || !character.isGF) return;

    const animKey = `${character.textureKey}_idle`;
    character.sprite.play(animKey);
    character.currentAnimation = "idle";
    this.applyOffsets(characterId, "idle");
  }

  flipPlayerFrames(texture) {
    const frames = texture.getFrameNames();
    frames.forEach((frameName) => {
      const frame = texture.frames[frameName];
      if (frame && !frame._flipped) {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = frame.width;
        canvas.height = frame.height;

        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(
          frame.source.image,
          -frame.cutX - frame.width,
          frame.cutY,
          frame.width,
          frame.height,
          0,
          0,
          frame.width,
          frame.height
        );
        ctx.restore();

        texture.add(frameName, 0, frame.cutX, frame.cutY, frame.width, frame.height, canvas);
        frame._flipped = true;
      }
    });
  }

  async setupAnimations(characterInfo) {
    const { data, textureKey } = characterInfo;
    const bpm = this.scene.songData?.song?.bpm || 100;
    const crochet = (60000 / bpm);

    const createAnimationPromises = data.animations.map(animation => {
      return new Promise((resolve) => {
        const frames = this.scene.textures.get(textureKey).getFrameNames();
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
          const animKey = `${characterInfo.textureKey}_${animation.anim}`;
          const frameRate = animation.fps || (24 * (bpm / 100));

          if (!this.scene.anims.exists(animKey)) {
            this.scene.anims.create({
              key: animKey,
              frames: animationFrames.map((frameName) => ({
                key: textureKey,
                frame: frameName,
              })),
              frameRate: frameRate,
              repeat: animation.anim === "idle" || animation.loop ? -1 : 0,
              duration: animation.anim === "idle" || animation.loop ? -1 : 
                       Math.ceil((animationFrames.length / frameRate) * 1000 / crochet) * crochet
            });
          }
        }
        resolve();
      });
    });

    await Promise.all(createAnimationPromises);
  }

  async ensureIdleAnimation(characterId) {
    const character = this.loadedCharacters.get(characterId);
    if (!character || !character.isReady) return;

    const animKey = `${character.textureKey}_idle`;
    
    await new Promise(resolve => {
      if (this.scene.anims.exists(animKey)) {
        resolve();
      } else {
        this.scene.time.delayedCall(100, resolve);
      }
    });

    this.playAnimation(characterId, "idle", false);
  }

  applyOffsets(characterId, animName) {
    const character = this.loadedCharacters.get(characterId);
    if (!character) return;

    const animation = character.data.animations.find((a) => a.anim === animName);
    if (!animation) return;

    if (this.tweens.has(characterId)) {
      this.tweens.get(characterId).kill();
      this.tweens.delete(characterId);
    }

    gsap.set(character.sprite, {
      x: character.basePosition.x,
      y: character.basePosition.y,
    });

    const offsets = animation.offsets || [0, 0];
    const [offsetX, offsetY] = offsets;

    const tween = gsap.to(character.sprite, {
      x: character.basePosition.x + offsetX,
      y: character.basePosition.y + offsetY,
      duration: 0,
      ease: "none",
      overwrite: "auto",
    });

    this.tweens.set(characterId, tween);
  }

  playAnimation(characterId, animName, force = false) {
    const character = this.loadedCharacters.get(characterId);
    if (!character || !character.isReady || !character.animationsInitialized) return;

    // Siempre actualizar el tiempo de la última animación si no es idle
    if (animName !== "idle") {
      character.lastAnimationTime = this.scene.songPosition;
      character.lastAnimationBeat = Math.floor(this.scene.lastBeat);
    }

    const animation = character.data.animations.find(a => a.anim === animName);
    if (!animation) {
      console.warn(`Animation ${animName} not found for character ${characterId}`);
      if (animName !== "idle") {
        this.playAnimation(characterId, "idle", true);
      }
      return;
    }

    this.applyOffsets(characterId, animName);
    const animKey = `${character.textureKey}_${animation.anim}`;
    
    if (this.scene.anims.exists(animKey)) {
        const anim = this.scene.anims.get(animKey);
        const bpm = this.scene.songData?.song?.bpm || 100;
        const crochet = (60000 / bpm);
        
        const frameRate = animation.fps || (24 * (bpm / 100));
        
        if (anim.frameRate !== frameRate) {
            anim.frameRate = frameRate;
        }

        character.sprite.stop();
        
        // Si es GF y la animación no es idle, configurar el retorno a idle
        if (character.isGF && animName !== "idle") {
            character.sprite.play(animKey);
            character.sprite.once('animationcomplete', () => {
                this.playAnimation(characterId, "idle", true);
            });
        } else {
            character.sprite.play(animKey);
        }
        
        character.currentAnimation = animName;

        // Sincronizar duración si no es idle o loop
        if (animation.anim !== "idle" && !animation.loop) {
            const frames = anim.frames.length;
            const animDuration = (frames / frameRate) * 1000;
            const beats = Math.ceil(animDuration / crochet);
            anim.duration = beats * crochet;
        }
    } else {
      console.warn(`Animation ${animKey} not found for character ${characterId}`);
      if (animName !== "idle") {
        this.playAnimation(characterId, "idle", true);
      }
    }
  }

  handleGFComboReactions(newCombo) {
    const gf = this.loadedCharacters.get(this.currentGF);
    if (!gf) {
        console.log('GF no encontrada');
        return;
    }

    if (newCombo >= 50 && this.lastCombo < 50) {
        this.playAnimation(this.currentGF, "cheer");
    }
    else if (newCombo === 0 && this.lastCombo >= 50) {
        this.playAnimation(this.currentGF, "sad");
    }

    this.lastCombo = newCombo;
  }

  subscribeToNoteEvents(characterId) {
    if (!this.notesController) return;

    this.notesController.events.on('strumlineStateChange', (data) => {
      const character = this.loadedCharacters.get(characterId);
      if (!character) return;

      const isPlayerNote = data.isPlayerNote;
      const isCorrectCharacter = (isPlayerNote && characterId === this.currentPlayer) || 
                                (!isPlayerNote && characterId === this.currentEnemy);

      if (isCorrectCharacter) {
        const directions = isPlayerNote ? this.heldDirections : this.enemyHeldDirections;
        const bpm = this.scene.songData?.song?.bpm || 100;
        const crochet = (60000 / bpm);
        
        if (data.state === 'confirm') {
          const directionAnims = {
            0: "singLEFT",
            1: "singDOWN",
            2: "singUP",
            3: "singRIGHT"
          };
          
          const animName = directionAnims[data.direction];
          
          // Actualizar el tiempo de inicio para ambos jugador y enemigo
          directions.set(data.direction, {
            anim: animName,
            isSustain: data.sustainNote,
            startTime: this.scene.songPosition,
            duration: crochet * 2 // Duración fija de 2 beats para todas las animaciones
          });
          
          // Forzar la reproducción de la animación para que se reinicie
          this.playAnimation(characterId, animName, true);
        } else if (data.state === 'miss') {
          this.playAnimation(characterId, data.animation, true);
        } else if (data.state === 'static') {
          directions.delete(data.direction);
        }
      }
    });
  }

  update(elapsed) {
    if (!this.scene.songData?.song?.bpm) return;

    const bpm = this.scene.songData.song.bpm;
    const currentBeat = this.scene.lastBeat;
    const crochet = (60000 / bpm);

    for (const [characterId, character] of this.loadedCharacters) {
      if (!character || !character.isReady) continue;

      const isPlayer = characterId === this.currentPlayer;
      const directions = isPlayer ? this.heldDirections : this.enemyHeldDirections;
      const hasActiveSustain = Array.from(directions.values()).some(note => note?.isSustain);
      const currentTime = this.scene.songPosition;

      // Manejar animaciones de notas para ambos jugadores
      if (characterId !== this.currentGF && character.currentAnimation !== "idle") {
        const animStartTime = character.lastAnimationTime || 0;
        const timeSinceAnim = currentTime - animStartTime;

        if (timeSinceAnim >= crochet * 2 && !hasActiveSustain) {
          this.playAnimation(characterId, "idle");
        }
      }

      // Manejar animaciones en beat
      if (this.lastBeat !== currentBeat) {
        if (characterId === this.currentGF) {
          if (currentBeat % 2 === 0) {
            this.playAnimation(characterId, "idle", true);
          }
        } else if (character.currentAnimation === "idle") {
          if (currentBeat % 2 === 0) {
            this.playAnimation(characterId, "idle", true);
          }
        }
      }
    }

    this.lastBeat = currentBeat;
  }

  onBeat(beat) {
    this.lastBeat = beat;
  }

  cleanup() {
    try {
      // Limpiar sprites y contenedores
      if (this.container) {
        this.container.removeAll(true);
        this.container.destroy();
        this.container = null;
      }

      // Limpiar referencias a personajes
      for (const [characterId, character] of this.loadedCharacters) {
        if (character?.sprite) {
          character.sprite.destroy();
        }
      }
      this.loadedCharacters.clear();

      // Limpiar tweens
      this.tweens.forEach(tween => tween.kill());
      this.tweens.clear();

      // Limpiar timers y direcciones
      this.idleTimers.clear();
      this.heldDirections.clear();
      this.enemyHeldDirections.clear();

      // Limpiar eventos de combo
      if (this.ratingManager) {
          this.ratingManager.events.off('comboChanged');
      }

      console.log('Characters cleanup complete');
    } catch (error) {
      console.error('Error during Characters cleanup:', error);
    }
  }

  updateBPM(newBPM) {
    for (const [characterId, character] of this.loadedCharacters) {
      if (!character?.data?.animations) continue;

      character.data.animations.forEach(animation => {
        const animKey = `${character.textureKey}_${animation.anim}`;
        if (this.scene.anims.exists(animKey)) {
          // Ajustar frameRate basado en el nuevo BPM
          const frameRate = animation.fps || (24 * (newBPM / 100));
          const anim = this.scene.anims.get(animKey);
          
          // Solo actualizar si el frameRate es diferente
          if (anim.frameRate !== frameRate) {
            anim.frameRate = frameRate;
            
            // Si la animación está reproduciéndose, reiniciarla
            if (character.currentAnimation === animation.anim) {
              this.playAnimation(characterId, animation.anim, true);
            }
          }
        }
      });
    }
  }

  setupComboReactions() {
    if (!this.ratingManager) return;

    this.ratingManager.events.on('comboChanged', (newCombo) => {
        this.handleGFComboReactions(newCombo);
    });
  }


}
