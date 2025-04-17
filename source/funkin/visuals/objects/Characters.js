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
    this.idleTimers = new Map(); // Para guardar los timers de cada personaje
    this.lastBeat = 0;
    this.heldDirections = new Map(); // Añadir heldDirections para el jugador
    this.enemyHeldDirections = new Map(); // Añadir heldDirections para el enemigo
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
        idleTimer: 0, // Añadir idleTimer
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
                
                this.playAnimation(characterId, directionAnims[data.direction], true);
                
                // Solo actualizar el estado de sustain si realmente es una nota sostenida
                if (data.sustainNote) {
                    directions.set(data.direction, {
                        anim: directionAnims[data.direction],
                        isSustain: true
                    });
                }
            } else if (data.state === 'static') {
                // Solo eliminar la dirección si existía previamente
                if (directions.has(data.direction)) {
                    directions.delete(data.direction);
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
        this.playAnimation(characterId, animName, true);
        
        // Solo actualizar el estado de sustain si realmente es una nota sostenida
        if (noteData.sustainNote) {
            this.enemyHeldDirections.set(noteData.direction, {
                anim: animName,
                isSustain: true
            });
        }
    });
  }

  update(elapsed) {
    if (!this.scene.songData?.song?.bpm) return;

    // Multiplicamos por 4 para hacer el tiempo de retorno más largo
    const stepCrochet = ((60 / this.scene.songData.song.bpm) * 1000) * 4;
    
    for (const [characterId, character] of this.loadedCharacters) {
        const isPlayer = characterId === this.currentPlayer;
        const directions = isPlayer ? this.heldDirections : this.enemyHeldDirections;
        const hasSustainNote = Array.from(directions.values()).some(note => note?.isSustain);

        if (hasSustainNote) {
            character.idleTimer = 0;
            continue;
        }

        if (character.idleTimer < stepCrochet / 1000) {
            character.idleTimer += elapsed;
            
            if (character.idleTimer >= stepCrochet / 1000 && 
                character.currentAnimation !== "idle") {
                this.playAnimation(characterId, "idle", true);
            }
        }
    }
  }

  onBeat(beat) {
    this.lastBeat = beat;
  }
}