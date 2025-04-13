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

  // Modificar el método createCharacter
  async createCharacter(characterId, isPlayer) {
    try {
      const textureKey = `character_${characterId}`;
      const characterPath = `public/assets/data/characters/${characterId}.json`;
      const response = await fetch(characterPath);
      const characterData = await response.json();

      // Verificar que la textura exista y esté lista
      if (!this.scene.textures.exists(textureKey)) {
        throw new Error(`Texture ${textureKey} not found!`);
      }

      let sprite = this.scene.add.sprite(0, 0, textureKey);
      sprite.setOrigin(0, 0);
      sprite.setDepth(isPlayer ? 2 : 1);

      const texture = this.scene.textures.get(textureKey);
      
      if (isPlayer) {
        this.flipPlayerFrames(texture);
        sprite.setFlipX(characterData.flip_x === false);
      } else if (characterId === this.currentGF) {
        sprite.setFlipX(characterData.flip_x === true);
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
        idleTimeout: null,  // Añadir esta línea
        animationsInitialized: false  // Añadir esta línea
      };

      // Set initial position
      gsap.set(sprite, {
        x: characterData.position[0],
        y: characterData.position[1],
      });

      // Initialize animations
      await this.setupAnimations(characterInfo);
      
      // Esperar un frame adicional para asegurar que las animaciones estén listas
      await new Promise(resolve => this.scene.time.delayedCall(16, resolve));
      
      characterInfo.animationsInitialized = true;
      characterInfo.isReady = true;
      this.loadedCharacters.set(characterId, characterInfo);
      
      // Asegurarse de que la animación idle se reproduce correctamente
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
        console.log('Creando GF:', characterId); // Debug log
        const textureKey = `character_${characterId}`;
        const characterPath = `public/assets/data/characters/${characterId}.json`;
        const response = await fetch(characterPath);
        const characterData = await response.json();

        console.log('Datos de GF cargados:', characterData); // Debug log

        const sprite = this.scene.add.sprite(0, 0, textureKey);
        sprite.setOrigin(0, 0);
        sprite.setDepth(0);
        sprite.setFlipX(characterData.flip_x === true); // Añadir esto
        sprite.setScale(characterData.scale || 1);

        const characterInfo = {
            data: characterData,
            sprite: sprite,
            textureKey: textureKey,
            isPlayer: false,
            currentAnimation: null,
            isGF: true,
            animationsInitialized: false, // Añadir esta propiedad
            isReady: false, // Añadir esta propiedad
            basePosition: {
                x: characterData.position[0],
                y: characterData.position[1],
            },
        };

        gsap.set(sprite, {
            x: characterData.position[0],
            y: characterData.position[1],
        });

        await this.setupGFAnimation(characterInfo); // Hacer async
        characterInfo.animationsInitialized = true;
        characterInfo.isReady = true;
        
        this.loadedCharacters.set(characterId, characterInfo);
        console.log('GF creada, reproduciendo idle...'); // Debug log
        this.playGFIdleAnimation(characterId);

        return characterInfo;
    } catch (error) {
        console.error(`Error creating GF character ${characterId}:`, error);
        return null;
    }
}

  async setupGFAnimation(characterInfo) {
    console.log('Configurando animaciones de GF...'); // Debug log
    const { data, textureKey } = characterInfo;
    
    const animationPromises = data.animations.map(animation => {
        return new Promise((resolve) => {
            const frames = this.scene.textures.get(textureKey).getFrameNames();
            console.log(`Frames encontrados para ${animation.anim}:`, frames.length); // Debug log
            
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
                console.log(`Creando animación ${animKey} con ${animationFrames.length} frames`); // Debug log

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
                console.warn(`No se encontraron frames para la animación: ${animation.anim} (${animation.name})`);
            }
            resolve();
        });
    });

    await Promise.all(animationPromises);
    console.log('Animaciones de GF configuradas'); // Debug log
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
    
    // Esperar a que la animación idle exista
    await new Promise(resolve => {
        if (this.scene.anims.exists(animKey)) {
            resolve();
        } else {
            this.scene.time.delayedCall(100, resolve);
        }
    });

    // Forzar la reproducción de idle
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

  // Modificar el método playAnimation
  playAnimation(characterId, animName, holdNote = false) {
    const character = this.loadedCharacters.get(characterId);
    if (!character || !character.isReady || !character.animationsInitialized) return;

    const animation = character.data.animations.find(a => a.anim === animName);
    if (!animation) return;

    // Limpiar timeout previo si existe
    if (character.idleTimeout) {
        character.idleTimeout.remove();
        character.idleTimeout = null;
    }

    this.applyOffsets(characterId, animName);
    const animKey = `${character.textureKey}_${animation.anim}`;
    
    // Verificar si la animación existe antes de reproducirla
    if (this.scene.anims.exists(animKey)) {
        // Siempre reiniciar la animación, incluso si es la misma
        character.sprite.play(animKey, true); // El true fuerza el reinicio
        character.currentAnimation = animName;

        // Programar retorno a idle solo si no es una nota sostenida y no es idle
        if (!holdNote && animName !== "idle") {
            character.idleTimeout = this.scene.time.delayedCall(600, () => {
                if (character.isReady && character.animationsInitialized) {
                    this.playAnimation(characterId, "idle", false);
                }
            });
        }
    } else {
        console.warn(`Animation ${animKey} not found for character ${characterId}`);
        if (animName !== "idle") {
            this.playAnimation(characterId, "idle", false);
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

        if ((data.isPlayerNote && characterId === this.currentPlayer) || 
            (!data.isPlayerNote && characterId === this.currentEnemy)) {
            const directions = data.isPlayerNote ? heldDirections : enemyHeldDirections;
            
            if (data.state === 'confirm') {
                const directionAnims = {
                    0: "singLEFT",
                    1: "singDOWN",
                    2: "singUP",
                    3: "singRIGHT"
                };
                // Siempre reproducir la animación en confirm
                this.playAnimation(characterId, directionAnims[data.direction], true);
                directions.set(data.direction, directionAnims[data.direction]);
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

    // Modificar el evento CPU hit en subscribeToNoteEvents
    this.notesController.on('cpuNoteHit', (data) => {
        const character = this.loadedCharacters.get(characterId);
        if (!character || characterId !== this.currentEnemy) return;

        const directionAnims = {
            0: "singLEFT",
            1: "singDOWN",
            2: "singUP",
            3: "singRIGHT"
        };

        const animName = directionAnims[data.direction];
        this.playAnimation(characterId, animName, data.sustainNote);
        enemyHeldDirections.set(data.direction, animName);

        // Solo programar el retorno a idle si no es una nota sostenida
        if (!data.sustainNote) {
            if (character.idleTimeout) {
                character.idleTimeout.remove();
            }
            character.idleTimeout = this.scene.time.delayedCall(600, () => {
                if (enemyHeldDirections.size === 0) {
                    this.playAnimation(characterId, "idle", false);
                }
            });
        }
    });

    // Añadir evento específico para notas sostenidas del CPU
    this.notesController.on('cpuSustainEnd', (data) => {
        const character = this.loadedCharacters.get(characterId);
        if (!character || characterId !== this.currentEnemy) return;

        enemyHeldDirections.delete(data.direction);

        // Programar retorno a idle solo cuando no hay más notas sostenidas
        if (enemyHeldDirections.size === 0) {
            if (character.idleTimeout) {
                character.idleTimeout.remove();
            }
            character.idleTimeout = this.scene.time.delayedCall(600, () => {
                this.playAnimation(characterId, "idle", false);
            });
        }
    });

    // Modificar el evento noteReleased
    this.notesController.on('noteReleased', (data) => {
        const character = this.loadedCharacters.get(characterId);
        if (!character) return;

        const isRelevantCharacter = (data.isPlayerNote && characterId === this.currentPlayer) || 
          (!data.isPlayerNote && characterId === this.currentEnemy);

        if (isRelevantCharacter) {
            const directions = data.isPlayerNote ? heldDirections : enemyHeldDirections;
            directions.delete(data.direction);

            // Si no hay notas siendo sostenidas, programar retorno a idle
            if (directions.size === 0) {
                if (character.idleTimeout) {
                    character.idleTimeout.remove();
                }
                character.idleTimeout = this.scene.time.delayedCall(600, () => {
                    this.playAnimation(characterId, "idle", false);
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

        // Agregar retorno a idle para animaciones de fallo
        if (noteData.isMiss) {
            if (character.idleTimeout) {
                character.idleTimeout.remove();
            }
            character.idleTimeout = this.scene.time.delayedCall(600, () => {
                this.playAnimation(characterId, "idle");
            });
        }
    });
  }
}