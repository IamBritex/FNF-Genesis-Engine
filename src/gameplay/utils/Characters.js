export class Characters {
  constructor(scene) {
    this.scene = scene;
    this.loadedCharacters = new Map();
    this.notesController = scene.arrowsManager;
    this.currentPlayer = null;
    this.currentEnemy = null;
    this.currentGF = null;
    this.tweens = new Map();
    this.lastCombo = 0; // Añadir tracking del último combo
  }

  async loadCharacterFromSong(songData) {
    // Carga los personajes desde los datos de la canción - Load characters from song data
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

      const sprite = this.scene.add.sprite(0, 0, textureKey);
      sprite.setOrigin(0, 0);
      sprite.setDepth(isPlayer ? 2 : 1);

      // Only flip frames if it's the player, NEVER for enemies
      if (isPlayer) {
        const texture = this.scene.textures.get(textureKey);
        this.flipPlayerFrames(texture);
      }

      sprite.setScale(characterData.scale || 1);

      const characterInfo = {
        data: characterData,
        sprite: sprite,
        textureKey: textureKey,
        isPlayer: isPlayer,
        currentAnimation: null,
        basePosition: {
          x: characterData.position[0],
          y: characterData.position[1],
        },
      };

      // Set initial position
      gsap.set(sprite, {
        x: characterData.position[0],
        y: characterData.position[1],
      });

      // Initialize animations and events
      this.setupAnimations(characterInfo);
      this.loadedCharacters.set(characterId, characterInfo);
      this.playAnimation(characterId, "idle");
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
      sprite.setDepth(0);
      sprite.setScale(characterData.scale || 1);

      const characterInfo = {
        data: characterData,
        sprite: sprite,
        textureKey: textureKey,
        isPlayer: false,
        currentAnimation: null,
        isGF: true,
        basePosition: {
          x: characterData.position[0],
          y: characterData.position[1],
        },
      };

      gsap.set(sprite, {
        x: characterData.position[0],
        y: characterData.position[1],
      });

      this.setupGFAnimation(characterInfo);
      this.loadedCharacters.set(characterId, characterInfo);
      this.playGFIdleAnimation(characterId);

      return characterInfo;
    } catch (error) {
      console.error(`Error creating GF character ${characterId}:`, error);
      return null;
    }
  }

  setupGFAnimation(characterInfo) {
    const { data, textureKey } = characterInfo;
    
    // Procesar todas las animaciones, no solo idle
    data.animations.forEach(animation => {
        const frames = this.scene.textures.get(textureKey).getFrameNames();
        let animationFrames;

        if (animation.indices?.length > 0) {
            animationFrames = animation.indices
                .map((index) => {
                    const paddedIndex = String(index).padStart(4, "0");
                    // Usar animation.name para buscar los frames
                    return frames.find((frame) => frame.startsWith(`${animation.name}${paddedIndex}`));
                })
                .filter(Boolean);
        } else {
            // Usar animation.name para filtrar los frames
            animationFrames = frames.filter((frame) => frame.startsWith(animation.name)).sort();
        }

        if (animationFrames.length > 0) {
            // Usar animation.anim para la key de la animación
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
        } else {
            console.warn(`No frames found for animation: ${animation.anim} (${animation.name})`);
        }
    });
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

  setupAnimations(characterInfo) {
    const { data, textureKey } = characterInfo;

    data.animations.forEach((animation) => {
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
    });
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

  playAnimation(characterId, animName, holdNote = false) {
    const character = this.loadedCharacters.get(characterId);
    if (!character) return;

    const animation = character.data.animations.find(a => a.anim === animName);
    if (!animation) return;

    // Limpiar timeout previo si existe
    if (character.idleTimeout) {
        character.idleTimeout.remove();
        character.idleTimeout = null;
    }

    this.applyOffsets(characterId, animName);
    const animKey = `${character.textureKey}_${animation.anim}`;
    character.sprite.play(animKey);
    character.currentAnimation = animName;

    // No programar retorno a idle si es una animación sing o si es una nota sostenida
    if (!holdNote && animName !== "idle" && !animName.startsWith('sing')) {
        character.idleTimeout = this.scene.time.delayedCall(600, () => {
            this.playAnimation(characterId, "idle");
        });
    }
  }

  handleGFComboReactions(newCombo) {
    const gf = this.loadedCharacters.get(this.currentGF);
    if (!gf) return;

    // Si alcanzamos 50 de combo, hacer cheer
    if (newCombo >= 50 && this.lastCombo < 50) {
        this.playAnimation(this.currentGF, "cheer");
    }
    // Si perdimos un combo que era mayor a 50, hacer sad
    else if (newCombo === 0 && this.lastCombo > 50) {
        this.playAnimation(this.currentGF, "sad");
    }

    this.lastCombo = newCombo;
  }

  subscribeToNoteEvents(characterId) {
    if (!this.notesController) return;

    const heldDirections = new Map();
    const enemyHeldDirections = new Map();
    
    // Agregar suscripción a eventos de combo
    if (this.notesController.ratingManager) {
        this.notesController.ratingManager.on('comboChanged', (combo) => {
            this.handleGFComboReactions(combo);
        });
    }

    // Suscribirse al evento de confirmación de strumline
    this.notesController.on('strumlineStateChange', (data) => {
        const character = this.loadedCharacters.get(characterId);
        if (!character) return;

        // Si es el personaje correcto (jugador o enemigo)
        if ((data.isPlayerNote && character.isPlayer) || (!data.isPlayerNote && !character.isPlayer)) {
            const directions = data.isPlayerNote ? heldDirections : enemyHeldDirections;
            
            if (data.state === 'confirm') {
                // Mantener la animación sing mientras esté en confirm
                const directionAnims = {
                    0: "singLEFT",
                    1: "singDOWN",
                    2: "singUP",
                    3: "singRIGHT"
                };
                directions.set(data.direction, directionAnims[data.direction]);
                this.playAnimation(characterId, directionAnims[data.direction], true);
            } else if (data.state === 'static') {
                // Eliminar la dirección del mapa cuando vuelve a static
                directions.delete(data.direction);
                
                // Programar retorno a idle con delay
                if (directions.size === 0) {
                    if (character.idleTimeout) {
                        character.idleTimeout.remove();
                    }
                    character.idleTimeout = this.scene.time.delayedCall(600, () => {
                        this.playAnimation(characterId, "idle");
                    });
                }
            }
        }
    });

    // Evento CPU hit para el enemigo
    this.notesController.on('cpuNoteHit', (data) => {
        const character = this.loadedCharacters.get(characterId);
        if (!character || character.isPlayer || characterId !== this.currentEnemy) return;

        const directionAnims = {
            0: "singLEFT",
            1: "singDOWN",
            2: "singUP",
            3: "singRIGHT"
        };

        const animName = directionAnims[data.direction];
        enemyHeldDirections.set(data.direction, animName);
        this.playAnimation(characterId, animName, true);
    });

    // Evento noteReleased
    this.notesController.on('noteReleased', (data) => {
        const character = this.loadedCharacters.get(characterId);
        if (!character) return;

        const isRelevantCharacter = (data.isPlayerNote && character.isPlayer) || 
                                  (!data.isPlayerNote && !character.isPlayer);

        if (isRelevantCharacter) {
            const directions = data.isPlayerNote ? heldDirections : enemyHeldDirections;
            directions.delete(data.direction);

            // Si no hay notas siendo sostenidas, programar retorno a idle con delay
            if (directions.size === 0) {
                if (character.idleTimeout) {
                    character.idleTimeout.remove();
                }
                character.idleTimeout = this.scene.time.delayedCall(600, () => {
                    this.playAnimation(characterId, "idle");
                });
            }
        }
    });

    // Evento noteHit para el jugador
    this.notesController.events.on('noteHit', (noteData) => {
        const character = this.loadedCharacters.get(characterId);
        if (!character || characterId !== this.currentPlayer) return;

        const directionAnims = {
            0: noteData.isMiss ? "singLEFTmiss" : "singLEFT",
            1: noteData.isMiss ? "singDOWNmiss" : "singDOWN",
            2: noteData.isMiss ? "singUPmiss" : "singUP", 
            3: noteData.isMiss ? "singRIGHTmiss" : "singRIGHT"
        };

        const animName = noteData.animation || directionAnims[noteData.direction];
        
        if (!noteData.isMiss) {
            heldDirections.set(noteData.direction, animName);
        }
        this.playAnimation(characterId, animName, !noteData.isMiss);
    });
  }
}