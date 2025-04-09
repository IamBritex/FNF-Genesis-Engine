export class Characters {
  constructor(scene) {
    this.scene = scene;
    this.loadedCharacters = new Map();
    this.notesController = scene.arrowsManager;
    this.currentPlayer = null;
    this.currentEnemy = null;
    this.currentGF = null;
    this.tweens = new Map();
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
    const idleAnimation = data.animations.find((anim) => anim.anim === "idle");

    if (idleAnimation) {
      const frames = this.scene.textures.get(textureKey).getFrameNames();
      let idleFrames;

      if (idleAnimation.indices?.length > 0) {
        idleFrames = idleAnimation.indices
          .map((index) => {
            const paddedIndex = String(index).padStart(4, "0");
            return frames.find((frame) => frame.startsWith(`${idleAnimation.name}${paddedIndex}`));
          })
          .filter(Boolean);
      } else {
        idleFrames = frames.filter((frame) => frame.startsWith(idleAnimation.name)).sort();
      }

      if (idleFrames.length > 0) {
        const animKey = `${textureKey}_idle`;

        if (!this.scene.anims.exists(animKey)) {
          this.scene.anims.create({
            key: animKey,
            frames: idleFrames.map((frameName) => ({
              key: textureKey,
              frame: frameName,
            })),
            frameRate: idleAnimation.fps || 24,
            repeat: -1,
          });
        }
      }
    }
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

  playAnimation(characterId, animName) {
    const character = this.loadedCharacters.get(characterId);
    if (!character) return;

    const animation = character.data.animations.find((a) => a.anim === animName);
    if (!animation) return;

    if (character.currentAnimation !== animName) {
      if (character.idleTimeout) {
        character.idleTimeout.remove();
        character.idleTimeout = null;
      }

      this.applyOffsets(characterId, animName);

      const animKey = `${character.textureKey}_${animation.anim}`;
      character.sprite.play(animKey);
      character.currentAnimation = animName;

      if (animName !== "idle" && !animation.loop) {
        const stepCrochet = ((60 / (this.scene.songData?.song?.bpm || 100)) * 1000) / 4;
        character.idleTimeout = this.scene.time.delayedCall(stepCrochet * 2, () =>
          this.playAnimation(characterId, "idle")
        );
      }
    }
  }

  subscribeToNoteEvents(characterId) {
    if (!this.notesController) return;

    // Mapa para direcciones presionadas - Map for held note directions
    const heldDirections = new Map();
    // Retraso para volver al idle - Delay before returning to idle
    const IDLE_DELAY = 400;

    // Eventos para notas de CPU - CPU note hit events
    this.notesController.events.on("cpuNoteHit", (noteData) => {
      const character = this.loadedCharacters.get(characterId);
      if (!character || characterId !== this.currentEnemy) return;

      // Mapeo de direcciones a animaciones - Direction to animation mapping
      const directionAnims = {
        0: "singLEFT",
        1: "singDOWN",
        2: "singUP",
        3: "singRIGHT",
      };

      const animName = directionAnims[noteData.direction];
      heldDirections.set(noteData.direction, animName);
      this.playAnimation(characterId, animName);

      if (character.idleTimeout) {
        character.idleTimeout.remove();
      }

      character.idleTimeout = this.scene.time.delayedCall(IDLE_DELAY, () => {
        heldDirections.delete(noteData.direction);
        this.playAnimation(characterId, "idle");
      });
    });

    // Eventos para notas del jugador - Player note hit events
    this.notesController.events.on("noteHit", (noteData) => {
      const character = this.loadedCharacters.get(characterId);
      if (!character || characterId !== this.currentPlayer) return;

      const isCorrectPlayer =
        (noteData.isPlayerNote && characterId === this.currentPlayer) ||
        (!noteData.isPlayerNote && characterId === this.currentEnemy);

      if (isCorrectPlayer) {
        const directionAnims = {
          0: "singLEFT",
          1: "singDOWN",
          2: "singUP",
          3: "singRIGHT",
        };

        const animName = directionAnims[noteData.direction];
        heldDirections.set(noteData.direction, animName);
        this.playAnimation(characterId, animName);
      }
    });

    // Eventos para soltar notas - Note release events
    this.notesController.events.on("noteReleased", (noteData) => {
      const character = this.loadedCharacters.get(characterId);
      if (!character || characterId !== this.currentPlayer) return;

      const isCorrectPlayer =
        (noteData.isPlayerNote && characterId === this.currentPlayer) ||
        (!noteData.isPlayerNote && characterId === this.currentEnemy);

      if (isCorrectPlayer) {
        heldDirections.delete(noteData.direction);

        if (character.idleTimeout) {
          character.idleTimeout.remove();
        }

        character.idleTimeout = this.scene.time.delayedCall(IDLE_DELAY, () =>
          this.playAnimation(characterId, "idle")
        );
      }
    });

    this.playAnimation(characterId, "idle");
  }

  playLoopingAnimation(characterId, animName, isHolding = true) {
    const character = this.loadedCharacters.get(characterId);
    if (!character) return;

    const animation = character.data.animations.find((a) => a.anim === animName);
    if (!animation) return;

    if (!isHolding) {
      this.playAnimation(characterId, "idle");
      return;
    }

    if (character.currentAnimation !== animName) {
      this.playAnimation(characterId, animName);
    }
  }
}