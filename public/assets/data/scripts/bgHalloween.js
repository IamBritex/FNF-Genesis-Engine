export default class BgHalloweenScript {
    constructor(scene) {
        this.scene = scene;
        this.background = null;
        this.lastLightningTime = 0;
        this.lightningInterval = 20000;
        this.isLightning = false;
        this.thunderSounds = [];
        this.animationDuration = 900; // 1.5 seconds for lightning effect
        this.characterResetDelay = 1000; // 2 seconds before characters reset
    }

    async init() {
        // Find the background layer
        const bgLayer = this.scene.stageManager.layers.find(layer => 
            layer.layerData?.path?.includes('halloween_bg')
        );

        if (!bgLayer?.image) {
            console.log('Halloween background not found');
            return;
        }

        const { x, y } = bgLayer.image;
        const textureKey = 'halloween_bg';

        try {
            // Load spritesheet if not already loaded
            if (!this.scene.textures.exists(textureKey)) {
                // Load the image first
                this.scene.load.image(textureKey, 'public/assets/images/stages/spooky/halloween_bg.png');
                await new Promise((resolve, reject) => {
                    this.scene.load.once('complete', resolve);
                    this.scene.load.once('loaderror', reject);
                    this.scene.load.start();
                });

                // Load and parse XML
                const xmlResponse = await fetch('public/assets/images/stages/spooky/halloween_bg.xml');
                const xmlText = await xmlResponse.text();
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlText, "text/xml");

                // Parse frame data
                const texture = this.scene.textures.get(textureKey);
                const frames = Array.from(xmlDoc.getElementsByTagName('SubTexture'));

                frames.forEach(subtexture => {
                    const frameName = subtexture.getAttribute('name');
                    const frameX = parseInt(subtexture.getAttribute('x'));
                    const frameY = parseInt(subtexture.getAttribute('y'));
                    const frameW = parseInt(subtexture.getAttribute('width'));
                    const frameH = parseInt(subtexture.getAttribute('height'));

                    texture.add(frameName, 0, frameX, frameY, frameW, frameH);
                });
            }

            // Create animated sprite
            bgLayer.image.destroy();
            this.background = this.scene.add.sprite(x, y, textureKey, 'halloweem bg0000');
            this.background.setOrigin(0, 0);
            bgLayer.image = this.background;

            // Setup animations
            this.setupAnimations(textureKey);
            await this.loadSound();

            // Set initial animation
            this.background.play('bg_idle');

        } catch (error) {
            console.error('Error initializing background:', error);
        }
    }

    setupAnimations(textureKey) {
        // Create animations if they don't exist
        if (!this.scene.anims.exists('lightning_strike')) {
            this.scene.anims.create({
                key: 'lightning_strike',
                frames: [
                    { key: textureKey, frame: 'halloweem bg0000', duration: 200 },
                    { key: textureKey, frame: 'halloweem bg lightning strike0000', duration: 800 },
                    { key: textureKey, frame: 'halloweem bg0000', duration: 500 }
                ],
                frameRate: 8, // Even slower for more dramatic effect
                repeat: 0
            });
        }

        if (!this.scene.anims.exists('bg_idle')) {
            this.scene.anims.create({
                key: 'bg_idle',
                frames: [{ key: textureKey, frame: 'halloweem bg0000' }],
                frameRate: 1,
                repeat: -1
            });
        }
    }

    async loadSound() {
        try {
            const soundKeys = ['thunder_1', 'thunder_2'];
            
            // Load both thunder sounds
            soundKeys.forEach(key => {
                if (!this.scene.cache.audio.exists(key)) {
                    this.scene.load.audio(key, `public/assets/audio/sounds/${key}.mp3`);
                }
            });

            // Wait for sounds to load if needed
            if (this.scene.load.list.size > 0) {
                await new Promise((resolve, reject) => {
                    this.scene.load.once('complete', resolve);
                    this.scene.load.once('loaderror', reject);
                    this.scene.load.start();
                });
            }

            // Store both thunder sounds
            this.thunderSounds = soundKeys.map(key => this.scene.sound.add(key));

        } catch (error) {
            console.warn('Thunder sounds not loaded:', error);
            this.thunderSounds = [];
        }
    }

    startLightning() {
        if (!this.background || this.isLightning) return;

        this.isLightning = true;

        // Optimize sound playing
        const randomSound = this.thunderSounds.length > 0 ? 
            Phaser.Math.RND.pick(this.thunderSounds) : null;
        
        if (randomSound) {
            randomSound.play({ volume: 0.8 });
        }

        // Cache characters reference
        const characters = this.scene.characters;
        if (characters) {
            // Play scared animations
            if (characters.player1) {
                characters.playAnimation(characters.player1, "scared", true);
            }
            if (characters.currentGF) {
                characters.playAnimation(characters.currentGF, "scared", true);
            }
        }

        // Play lightning animation
        this.background.play('lightning_strike');

        // Use scene time event instead of setTimeout
        this.scene.time.delayedCall(this.animationDuration, () => {
            if (!this.background) return;
            
            this.background.play('bg_idle');
            this.isLightning = false;
            this.lastLightningTime = this.scene.time.now;

            // Reset characters using scene time event
            this.scene.time.delayedCall(this.characterResetDelay - this.animationDuration, () => {
                if (!characters) return;

                if (characters.player1) {
                    characters.playAnimation(characters.player1, "idle", true);
                }
                if (characters.currentGF) {
                    characters.playAnimation(characters.currentGF, "idle", true);
                }
            });
        });
    }

    update(time, _delta) {
        // Only check for lightning if we have a background and aren't currently in lightning state
        if (this.background && !this.isLightning && 
            time - this.lastLightningTime >= this.lightningInterval) {
            this.startLightning();
        }
    }

    cleanup() {
        if (this.thunderSounds) {
            this.thunderSounds.forEach(sound => {
                if (sound?.stop) sound.stop();
                if (sound?.destroy) sound.destroy();
            });
            this.thunderSounds = [];
        }

        if (this.background) {
            this.background.stop();
            this.background = null;
        }

        this.isLightning = false;
        this.lastLightningTime = 0;
    }
}