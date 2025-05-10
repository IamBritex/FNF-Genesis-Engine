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
      
      // Asignar depth basado en el tipo de personaje (usando valores de characterDepths)
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
        idleTimeout: null,
        idleTimer: 0,
        animationsInitialized: false 
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
        sprite.setDepth(this.characterDepths.gf); // Usar el depth configurado
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

                if (!this.scene.anims.exists(animKey)) {
                    this.scene.anims.create({
                        key: animKey,
                        frames: animationFrames.map((frameName) => ({
                            key: textureKey,
                            frame: frameName,
                        })),
                        frameRate: animation.fps || 24,
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
                const animKey = `${textureKey}_${animation.anim}`;

                if (!this.scene.anims.exists(animKey)) {
                    this.scene.anims.create({
                        key: animKey,
                        frames: animationFrames.map((frameName) => ({
                            key: textureKey,
                            frame: frameName,
                        })),
                        frameRate: animation.fps || 24,
                        repeat: animation.anim === "idle" || animation.loop ? -1 : 0,
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

    if (animName !== "idle") {
        character.idleTimer = 0;
    }

    const animation = character.data.animations.find(a => a.anim === animName);
    if (!animation) return;

    this.applyOffsets(characterId, animName);
    const animKey = `${character.textureKey}_${animation.anim}`;
    
    if (this.scene.anims.exists(animKey)) {
        if (character.currentAnimation === animName) {
            character.sprite.stop();
        }
        character.sprite.play(animKey, true);
        character.currentAnimation = animName;
    } else {
        console.warn(`Animation ${animKey} not found for character ${characterId}`);
        if (animName !== "idle") {
            this.playAnimation(characterId, "idle", true);
        }
    }
  }

  playAnimation(characterId, animName, force = false) {
    const character = this.loadedCharacters.get(characterId);
    if (!character || !character.isReady || !character.animationsInitialized) return;

    // Resetear el idleTimer cuando se reproduce cualquier animación que no sea idle
    if (animName !== "idle") {
        character.idleTimer = 0;
    }

    const animation = character.data.animations.find(a => a.anim === animName);
    if (!animation) return;

    this.applyOffsets(characterId, animName);
    const animKey = `${character.textureKey}_${animation.anim}`;
    
    if (this.scene.anims.exists(animKey)) {
        // Si es la misma animación, la reiniciamos
        if (character.currentAnimation === animName) {
            character.sprite.stop();
        }
        character.sprite.play(animKey, true);
        character.currentAnimation = animName;
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
      console.log('GF no encontrada'); // Debug log
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
    
    this.notesController.on('strumlineStateChange', (data) => {
        const character = this.loadedCharacters.get(characterId);
        if (!character) return;

        if ((data.isPlayerNote && characterId === this.currentPlayer) || 
            (!data.isPlayerNote && characterId === this.currentEnemy)) {
            const directions = data.isPlayerNote ? this.heldDirections : this.enemyHeldDirections;
            
            if (data.state === 'confirm') {
                const directionAnims = {
                    0: "singLEFT",
                    1: "singDOWN",
                    2: "singUP",
                    3: "singRIGHT"
                };
                
                const animName = directionAnims[data.direction];
                
                // Si es una nota sustain, solo actualizamos la dirección si no existe
                if (data.sustainNote) {
                    if (!directions.has(data.direction)) {
                        this.playAnimation(characterId, animName, true);
                        directions.set(data.direction, {
                            anim: animName,
                            isSustain: true,
                            startTime: Date.now()
                        });
                    }
                    character.idleTimer = 0; // <-- Esto asegura que el timer se mantenga en 0 mientras se sostiene
                } else {
                    // Si no es sustain, reproducimos la animación normalmente
                    this.playAnimation(characterId, animName, true);
                }
                
            } else if (data.state === 'static') {
                // Solo removemos la dirección si era sustain
                const note = directions.get(data.direction);
                if (note && note.isSustain) {
                    directions.delete(data.direction);

                    // Verificar si aún hay otras direcciones sostenidas
                    const hasOtherSustains = Array.from(directions.values()).some(note => note?.isSustain);
                    if (!hasOtherSustains) {
                        // Solo volvemos a idle si no hay otras notas sustain
                        character.idleTimer = 0; // Aquí lo pones en 0 para que empiece a contar desde el próximo update
                    }
                }
            }
        }
    });

    this.notesController.events.on('enemyNoteHit', (noteData) => {
        const character = this.loadedCharacters.get(characterId);
        if (!character || characterId !== this.currentEnemy) return;

        const directionAnims = {
            0: "singLEFT",
            1: "singDOWN",
            2: "singUP",
            3: "singRIGHT"
        };

        const animName = noteData.animation || directionAnims[noteData.direction];
        
        // Forzar la animación incluso si ya está reproduciéndose
        this.playAnimation(characterId, animName, true);
        
        // Actualizar el estado de sustain
        if (noteData.sustainNote) {
            this.enemyHeldDirections.set(noteData.direction, {
                anim: animName,
                isSustain: true,
                startTime: Date.now() // Añadimos timestamp para tracking
            });
            character.idleTimer = 0; // Aseguramos que el timer se resetea
        } else {
            // Si no es sustain, limpiamos cualquier sustain previo en esa dirección
            this.enemyHeldDirections.delete(noteData.direction);
        }
    });

    // Añadir un nuevo listener para el fin de notas del enemigo
    this.notesController.events.on('enemyNoteDone', (noteData) => {
        const character = this.loadedCharacters.get(characterId);
        if (!character || characterId !== this.currentEnemy) return;

        const note = this.enemyHeldDirections.get(noteData.direction);
        if (note && note.isSustain) {
            this.enemyHeldDirections.delete(noteData.direction);
        }

        // Solo volvemos a idle si no hay otras notas sustain activas
        const hasOtherSustains = Array.from(this.enemyHeldDirections.values()).some(note => note?.isSustain);
        if (!hasOtherSustains) {
            character.idleTimer = 0;
        }
    });

    this.notesController.on('noteMiss', (data) => {
        const character = this.loadedCharacters.get(characterId);
        if (!character) return;

        // Solo reproducir animación de fallo si es el jugador y corresponde
        if (characterId === this.currentPlayer) {
            // Usa el nombre de animación recibido o construye uno por dirección
            const missAnim = data.animation || (
                ["singLEFTmiss", "singDOWNmiss", "singUPmiss", "singRIGHTmiss"][data.direction]
            );
            this.playAnimation(characterId, missAnim, true);
            character.idleTimer = 0; // Opcional: reinicia el timer de idle
        }
    });

    // Escuchar el evento de sustainHold para mantener la animación y el idleTimer
    this.notesController.events.on('sustainHold', (data) => {
        const character = this.loadedCharacters.get(characterId);
        if (!character) return;

        // Solo aplica si es el personaje correcto
        if ((data.isPlayerNote && characterId === this.currentPlayer) ||
            (!data.isPlayerNote && characterId === this.currentEnemy)) {
            if (data.isHolding) {
                if (character.currentAnimation !== data.animation) {
                    this.playAnimation(characterId, data.animation, true);
                }
                character.idleTimer = 0;
            }
        }
    });
  }

  update(elapsed) {
    if (!this.scene.songData?.song?.bpm) return;

    const stepCrochet = ((60 / this.scene.songData.song.bpm) * 1000) * 1.5;

    for (const [characterId, character] of this.loadedCharacters) {
      const isPlayer = characterId === this.currentPlayer;
      const directions = isPlayer ? this.heldDirections : this.enemyHeldDirections;

      // Buscar la nota sustain más reciente (por startTime)
      let latestSustain = null;
      for (const note of directions.values()) {
        if (note?.isSustain) {
          if (!latestSustain || note.startTime > latestSustain.startTime) {
            latestSustain = note;
          }
        }
      }

      if (latestSustain) {
        character.idleTimer = 0;
        // Solo cambia la animación si no es la actual
        if (character.currentAnimation !== latestSustain.anim) {
          this.playAnimation(characterId, latestSustain.anim, true);
        }
        continue;
      }

      // Si NO hay notas sustain, idleTimer empieza a contar
      character.idleTimer += elapsed;

      if (character.idleTimer >= stepCrochet / 1000 && character.currentAnimation !== "idle") {
        this.playAnimation(characterId, "idle", true);
      }                                                                                                                                                                                               
    }
  }

  onBeat(beat) {
    this.lastBeat = beat;
  }
}