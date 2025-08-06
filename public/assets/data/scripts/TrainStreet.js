export default class TrainStreetScript {
    constructor(scene) {
        this.scene = scene;
        this.trainLayers = [];
        this.isMoving = false;
        this.lastMoveTime = 0;
        this.moveInterval = 20000;
        this.startPositions = [3100, 4700];
        this.endX = -6100;
        this.lerpTime = 0;
        this.lerpDuration = 2000;
        this.trainSound = null;
        this.soundPlayed = false;
        this.gfHairBlown = false;
        this.isInitialized = false;
    }

    async init() {
        try {
            await this.setupTrainLayers();
            await this.loadSound();
            this.isInitialized = true;
        } catch (error) {
            console.error('Error initializing TrainStreet:', error);
        }
    }

    async setupTrainLayers() {
        this.trainLayers = this.findTrainLayers();
        this.configureTrainLayers();
    }

    findTrainLayers() {
        return this.scene.stageManager.layers.filter(layer => 
            layer.layerData?.layer === 5 && 
            layer.layerData?.namePath?.toLowerCase().includes('train') // Cambiar path por namePath
        );
    }

    configureTrainLayers() {
        this.trainLayers.forEach((layer, index) => {
            if (!layer.image) return;

            this.setupTrainImage(layer.image, index);
            this.setInitialPosition(layer.image, index, layer.layerData.position[1]);
        });
    }

    setupTrainImage(image, index) {
        image.setVisible(true)
             .setDepth(5)
             .setScrollFactor(1)
             .setActive(true)
             .setOrigin(0, 0);

        if (!this.scene.children.exists(image)) {
            this.scene.add.existing(image);
        }
    }

    setInitialPosition(image, index, defaultY = 190) {
        image.setX(this.startPositions[index] || this.startPositions[0]);
        image.setY(defaultY);
    }

    async loadSound() {
        try {
            // Check if sound already exists to prevent duplicates
            if (this.scene.cache.audio.exists('trainPass')) {
                this.trainSound = this.scene.sound.add('trainPass');
                return;
            }

            this.scene.load.audio('trainPass', 'public/assets/audio/sounds/train_passes.mp3');
            await new Promise(resolve => {
                this.scene.load.once('complete', resolve);
                this.scene.load.start();
            });
            
            this.trainSound = this.scene.sound.add('trainPass');
        } catch (error) {
            console.error('Error loading train sound:', error);
        }
    }

    startTrainMovement() {
        if (this.isMoving) return;
        
        this.isMoving = true;
        this.lerpTime = 0;
        this.resetTrainPositions();
    }

    resetTrainPositions() {
        this.trainLayers.forEach((layer, index) => {
            if (layer.image) {
                layer.image.setX(this.startPositions[index] || this.startPositions[0]);
                layer.image.setVisible(true);
            }
        });
    }

    lerp(start, end, t) {
        return start + (end - start) * t;
    }

    update(time, delta) {
        if (!this.isInitialized) return;
        
        this.checkSoundTiming(time);
        this.checkMovementTiming(time);
        this.updateTrainPositions(time, delta);
    }

    checkSoundTiming(time) {
        if (!this.isMoving && !this.soundPlayed && time - this.lastMoveTime >= this.moveInterval - 4000) {
            this.trainSound.play();
            this.soundPlayed = true;
        }
    }

    checkMovementTiming(time) {
        if (!this.isMoving && time - this.lastMoveTime >= this.moveInterval) {
            this.startTrainMovement();
        }
    }

    updateTrainPositions(time, delta) {
        if (!this.isMoving || !this.trainLayers) return;

        try {
            this.lerpTime += delta;
            const t = Math.min(this.lerpTime / this.lerpDuration, 1);
            
            this.trainLayers.forEach((layer, index) => {
                if (layer.image) {
                    const startX = this.startPositions[index] || this.startPositions[0];
                    const currentX = this.lerp(startX, this.endX, t);
                    layer.image.setX(currentX);

                    // Check if train is visible in camera view
                    const camera = this.scene.cameraController.gameCamera;
                    const trainInView = currentX + layer.image.width > camera.scrollX && 
                                      currentX < camera.scrollX + camera.width;

                    // Handle GF animations based on train visibility
                    if (trainInView && !this.gfHairBlown) {
                        // Train just entered view, play hairBlow
                        this.gfHairBlown = true;
                        if (this.scene.characters) {
                            this.scene.characters.playAnimation(this.scene.characters.currentGF, "hairBlow", true);
                        }
                    } else if (!trainInView && this.gfHairBlown && t >= 1) {
                        // Train left view, play hairFall
                        this.gfHairBlown = false;
                        if (this.scene.characters) {
                            this.scene.characters.playAnimation(this.scene.characters.currentGF, "hairFall", true);
                        }
                    }
                }
            });

            if (t >= 1) this.completeMovement(time);
        } catch (error) {
            console.error('Error in train update:', error);
            this.isMoving = false;
        }
    }

    completeMovement(time) {
        this.isMoving = false;
        this.soundPlayed = false;
        this.lastMoveTime = time;
        this.resetTrainPositions();

        // Ensure hairFall plays when train movement completes
        if (this.gfHairBlown) {
            this.gfHairBlown = false;
            if (this.scene.characters) {
                this.scene.characters.playAnimation(this.scene.characters.currentGF, "hairFall", true);
            }
        }
    }

    cleanup() {
        try {
            if (this.trainSound) {
                this.trainSound.stop();
                this.trainSound.destroy();
                this.trainSound = null;
            }

            if (this.trainLayers) {
                this.trainLayers.forEach(layer => {
                    if (layer.image) {
                        layer.image.setVisible(false);
                        layer.image.setActive(false);
                    }
                });
            }

            this.trainLayers = [];
            this.isMoving = false;
            this.soundPlayed = false;
            this.gfHairBlown = false;
            this.lerpTime = 0;
            this.lastMoveTime = 0;
            this.isInitialized = false;

        } catch (error) {
            console.error('Error in TrainStreet cleanup:', error);
        }
    }

    destroy() {
        this.cleanup();
        this.scene = null;
        this.trainLayers = null;
        this.trainSound = null;
    }
}