export class Characters {
    constructor(scene) {
        this.scene = scene;
        this.loadedCharacters = new Map();
        this.notesController = scene.arrowsManager;
        this.currentPlayer = null;
        this.currentEnemy = null;
    }

    async loadCharacterFromSong(songData) {
        if (!songData.song) return;

        const { player1, player2 } = songData.song;
        
        this.currentPlayer = player1;
        this.currentEnemy = player2;
        
        await Promise.all([
            this.loadCharacter(player1, true),
            this.loadCharacter(player2, false)
        ]);
    }

    async loadCharacter(characterId, isPlayer) {
        try {
            const characterPath = `public/assets/data/characters/${characterId}.json`;
            const characterData = await fetch(characterPath).then(r => r.json());

            const baseImagePath = `public/assets/images/${characterData.image}`;
            const textureKey = `character_${characterId}`;

            this.scene.load.atlasXML(
                textureKey,
                `${baseImagePath}.png`,
                `${baseImagePath}.xml`
            );
            
            await new Promise(resolve => {
                this.scene.load.once('complete', resolve);
                this.scene.load.start();
            });

            const sprite = this.scene.add.sprite(
                characterData.position[0],
                characterData.position[1],
                textureKey
            );

            // Establecer depth para que los personajes estén debajo de las flechas
            sprite.setDepth(1);
            
            // Si es jugador, volteamos cada frame de la textura
            if (isPlayer) {
                const texture = this.scene.textures.get(textureKey);
                const frames = texture.getFrameNames();
                
                frames.forEach(frameName => {
                    const frame = texture.frames[frameName];
                    if (frame && !frame._flipped) {
                        // Crear un canvas temporal para voltear el frame
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        canvas.width = frame.width;
                        canvas.height = frame.height;
                        
                        // Dibujar el frame volteado
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
                        
                        // Actualizar la textura con el frame volteado
                        texture.add(frameName, 0, 
                            frame.cutX, frame.cutY, 
                            frame.width, frame.height,
                            canvas
                        );
                        frame._flipped = true;
                    }
                });
            } else {
                // Para personajes que no son jugador, usar flip_x del JSON
                sprite.setFlipX(characterData.flip_x);
            }

            sprite.setScale(characterData.scale || 1);
            
            const characterInfo = {
                data: characterData,
                sprite: sprite,
                textureKey: textureKey,
                isPlayer: isPlayer,
                currentAnimation: null
            };

            this.setupAnimations(characterInfo);
            this.loadedCharacters.set(characterId, characterInfo);
            
            // Iniciar con animación idle
            this.playAnimation(characterId, 'idle');

            // Suscribirse a eventos de notas
            this.subscribeToNoteEvents(characterId);

            return characterInfo;

        } catch (error) {
            console.error(`Error loading character ${characterId}:`, error);
            return null;
        }
    }

    setupAnimations(characterInfo) {
        const { data, textureKey } = characterInfo;
        
        data.animations.forEach(animation => {
            const frames = this.scene.textures.get(textureKey).getFrameNames();
            let animationFrames;

            // Special handling for idle animation
            const isIdle = animation.anim === 'idle';

            if (animation.indices && animation.indices.length > 0) {
                // Use specific indices
                animationFrames = animation.indices.map(index => {
                    const paddedIndex = String(index).padStart(4, '0');
                    return frames.find(frame => frame.startsWith(`${animation.name}${paddedIndex}`));
                }).filter(Boolean);
            } else {
                // Get all frames that match the animation name
                animationFrames = frames.filter(frame => 
                    frame.startsWith(animation.name)
                ).sort();
            }

            if (animationFrames.length > 0) {
                const animKey = `${textureKey}_${animation.anim}`;
                
                if (!this.scene.anims.exists(animKey)) {
                    const config = {
                        key: animKey,
                        frames: animationFrames.map(frameName => ({
                            key: textureKey,
                            frame: frameName
                        })),
                        frameRate: animation.fps || 24,
                        repeat: isIdle ? -1 : (animation.loop ? -1 : 0) // Force idle to loop
                    };
                    
                    this.scene.anims.create(config);

                    // Debug log for idle animation
                    if (isIdle) {
                        console.log('Idle animation setup:', {
                            key: animKey,
                            frames: animationFrames,
                            frameRate: animation.fps || 24
                        });
                    }
                }
            }
        });
    }

    playAnimation(characterId, animName) {
        const character = this.loadedCharacters.get(characterId);
        if (!character) return;

        const animation = character.data.animations.find(a => a.anim === animName);
        if (!animation) return;

        const animKey = `${character.textureKey}_${animation.anim}`;
        const isIdle = animName === 'idle';

        // Solo interrumpir si la nueva animación es diferente
        if (character.currentAnimation !== animName) {
            // Cancelar timeout anterior si existe
            if (character.idleTimeout) {
                character.idleTimeout.remove();
                character.idleTimeout = null;
            }

            // Reproducir la animación
            character.sprite.play(animKey);
            character.currentAnimation = animName;

            // Si no es idle y no es una animación en loop, programar retorno a idle
            if (!isIdle && !animation.loop) {
                const bpm = this.scene.songData?.song?.bpm || 100;
                const stepCrochet = (60 / bpm) * 1000 / 4;
                
                character.idleTimeout = this.scene.time.delayedCall(
                    stepCrochet * 2,
                    () => this.playAnimation(characterId, 'idle')
                );
            }
        } else if (isIdle && !character.sprite.anims.isPlaying) {
            // Ensure idle animation keeps playing
            character.sprite.play(animKey);
        }
    }

    subscribeToNoteEvents(characterId) {
        if (!this.notesController) return;

        const heldDirections = new Map();
        const IDLE_DELAY = 400; // 500ms delay before returning to idle

        // Listen for CPU/enemy note hits
        this.notesController.events.on('cpuNoteHit', (noteData) => {
            const character = this.loadedCharacters.get(characterId);
            if (!character || characterId !== this.currentEnemy) return;

            const directionAnims = {
                0: 'singLEFT',
                1: 'singDOWN',
                2: 'singUP',
                3: 'singRIGHT'
            };
            
            const animName = directionAnims[noteData.direction];
            heldDirections.set(noteData.direction, animName);
            
            // Play the animation
            this.playAnimation(characterId, animName);

            // Set a timeout with fixed 500ms delay
            if (character.idleTimeout) {
                character.idleTimeout.remove();
            }
            
            character.idleTimeout = this.scene.time.delayedCall(
                IDLE_DELAY, // Use fixed 500ms delay instead of stepCrochet
                () => {
                    heldDirections.delete(noteData.direction);
                    this.playAnimation(characterId, 'idle');
                }
            );
        });

        // Regular player note events
        this.notesController.events.on('noteHit', (noteData) => {
            const character = this.loadedCharacters.get(characterId);
            if (!character || characterId !== this.currentPlayer) return;

            const isCorrectPlayer = (noteData.isPlayerNote && characterId === this.currentPlayer) || 
                                 (!noteData.isPlayerNote && characterId === this.currentEnemy);

            if (isCorrectPlayer) {
                const directionAnims = {
                    0: 'singLEFT',
                    1: 'singDOWN',
                    2: 'singUP',
                    3: 'singRIGHT'
                };
                
                const animName = directionAnims[noteData.direction];
                heldDirections.set(noteData.direction, animName);
                
                // Reproducir animación en loop mientras la nota esté presionada
                this.playLoopingAnimation(characterId, animName);
            }
        });

        // For player note release
        this.notesController.events.on('noteReleased', (noteData) => {
            const character = this.loadedCharacters.get(characterId);
            if (!character || characterId !== this.currentPlayer) return;

            const isCorrectPlayer = (noteData.isPlayerNote && characterId === this.currentPlayer) || 
                                 (!noteData.isPlayerNote && characterId === this.currentEnemy);

            if (isCorrectPlayer) {
                heldDirections.delete(noteData.direction);
                
                // Add delay before returning to idle
                if (character.idleTimeout) {
                    character.idleTimeout.remove();
                }
                
                character.idleTimeout = this.scene.time.delayedCall(
                    IDLE_DELAY,
                    () => this.playAnimation(characterId, 'idle')
                );
            }
        });

        // Iniciar con idle animation
        this.playAnimation(characterId, 'idle');
    }

    playLoopingAnimation(characterId, animName, isHolding = true) {
        const character = this.loadedCharacters.get(characterId);
        if (!character) return;

        const animation = character.data.animations.find(a => a.anim === animName);
        if (!animation) return;

        const animKey = `${character.textureKey}_${animation.anim}`;

        // Si la tecla se suelta (isHolding = false), volver a idle
        if (!isHolding) {
            const idleAnim = `${character.textureKey}_idle`;
            character.sprite.play(idleAnim, true);
            character.currentAnimation = 'idle';
            return;
        }

        // Forzar que la animación se reproduzca en loop mientras se mantiene
        if (character.currentAnimation !== animName) {
            if (character.idleTimeout) {
                character.idleTimeout.remove();
                character.idleTimeout = null;
            }

            character.sprite.play(animKey, true);
            character.currentAnimation = animName;
        }
    }
}