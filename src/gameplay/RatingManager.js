// RatingManager.js
export class RatingManager {
    constructor(scene) {
        this.scene = scene;
        this.defaultConfig = {
            imagePaths: {
                sick: 'public/assets/images/ratings/sick.png',
                good: 'public/assets/images/ratings/good.png',
                bad: 'public/assets/images/ratings/bad.png',
                shit: 'public/assets/images/ratings/shit.png',
                miss: 'public/assets/images/ratings/miss.png',
                numbers: Array(10).fill().map((_, i) => `public/assets/images/states/PlayState/PopNum/num${i}.png`)
            },
            positions: {
                rating: { x: null, y: 200 },
                comboNumbers: { 
                    x: 0, y: 50, spacing: 30, scale: 0.5, rotation: 0
                }
            },
            animation: {
                riseHeight: 50, 
                riseDuration: 400, 
                fallDuration: 900,
                fadeStartRatio: 0.4, 
                imageScale: 0.6, 
                randomFallVariation: 0.4
            }
        };
        this.initProperties();
    }

    initProperties() {
        this.combo = this.maxCombo = this.misses = 0;
        this.totalNotesHit = this.totalNotes = 0;
        this.showInitialZeros = false;

        this.ratings = {
            sick: { timing: 58, count: 0, weight: 1 },
            good: { timing: 95, count: 0, weight: 0.75 },
            bad: { timing: 140, count: 0, weight: 0.5 },
            shit: { timing: 180, count: 0, weight: 0.25 },
            miss: { timing: Infinity, count: 0, weight: 0 }
        };

        this.ratingImages = {};
        this.comboNumbers = [];
        this.activeNumberAnimations = [];
        this.activeRatingInstances = [];
    }

    configure(config) {
        const merge = (target, source) => {
            if (!source) return target;
            const result = {...target};
            Object.keys(source).forEach(key => {
                if (source[key] instanceof Object && key in target) {
                    result[key] = merge(target[key], source[key]);
                } else {
                    result[key] = source[key];
                }
            });
            return result;
        };
        this.defaultConfig = merge(this.defaultConfig, config);
    }

    async create() {
        await this.preloadAssets();
    }

    preloadAssets() {
        return new Promise((resolve) => {
            const { imagePaths } = this.defaultConfig;
            const totalAssets = Object.keys(imagePaths).length - 1 + 10;
            let loadedAssets = 0;

            const checkComplete = () => {
                loadedAssets++;
                if (loadedAssets === totalAssets) resolve();
            };

            Object.entries(imagePaths).forEach(([key, path]) => {
                if (key !== 'numbers') {
                    const textureKey = `rating_${key}`;
                    if (!this.scene.textures.exists(textureKey)) {
                        this.scene.load.image(textureKey, path);
                        this.scene.load.once(`filecomplete-image-${textureKey}`, checkComplete);
                    } else {
                        checkComplete();
                    }
                }
            });

            for (let i = 0; i < 10; i++) {
                const textureKey = `number_${i}`;
                if (!this.scene.textures.exists(textureKey)) {
                    this.scene.load.image(textureKey, imagePaths.numbers[i]);
                    this.scene.load.once(`filecomplete-image-${textureKey}`, checkComplete);
                } else {
                    checkComplete();
                }
            }

            this.scene.load.start();
        });
    }

    createSprite(key, x, y, depth, scale = 1, rotation = 0) {
        if (!this.scene) {
            console.error('Escena no disponible en createSprite');
            return null;
        }
        
        if (!this.scene.textures.exists(key)) {
            console.error(`Error: La textura "${key}" no existe en la caché. Texturas disponibles:`, 
                          this.scene.textures.getTextureKeys());
            return null;
        }
        
        try {
            return this.scene.add.sprite(x, y, key)
                .setVisible(false)
                .setDepth(depth)
                .setScale(scale)
                .setRotation(rotation * Math.PI / 180);
        } catch (error) {
            console.error(`Error al crear sprite con key ${key}:`, error);
            return null;
        }
    }

    updateComboNumbers() {
        if (this.combo === 0 && !this.showInitialZeros) {
            this.clearComboNumbers();
            return;
        }
        
        this.clearComboNumbers();
        
        const comboStr = this.combo.toString().padStart(3, '0');
        const { positions, imagePaths } = this.defaultConfig;
        const { comboNumbers } = positions;
        
        const baseX = positions.rating.x !== null ? positions.rating.x : this.scene.cameras.main.width / 2;
        const baseY = positions.rating.y + comboNumbers.y;
        
        const totalWidth = (comboStr.length - 1) * comboNumbers.spacing;
        const startX = baseX - (totalWidth / 2) + comboNumbers.x;

        // Create and show all numbers at once
        for (let i = 0; i < comboStr.length; i++) {
            const digit = parseInt(comboStr[i]);
            const x = startX + (i * comboNumbers.spacing);
            const textureKey = `number_${digit}`;

            if (!this.scene.textures.exists(textureKey)) {
                console.error(`Missing texture for number: ${digit}`);
                continue;
            }

            const numberImage = this.scene.add.sprite(x, baseY, textureKey)
                .setVisible(true)
                .setDepth(16)
                .setScale(comboNumbers.scale)
                .setRotation(comboNumbers.rotation * Math.PI / 180)
                .setAlpha(1);

            this.comboNumbers.push(numberImage);
        }
        
        this.animateComboNumbers();
    }

    clearComboNumbers() {
        this.activeNumberAnimations.forEach(anim => anim?.target?.scene && this.scene.tweens.killTweensOf(anim.target));
        this.comboNumbers.forEach(number => number?.scene && number.destroy());
        this.activeNumberAnimations = [];
        this.comboNumbers = [];
    }

    animateComboNumbers() {
        const { animation } = this.defaultConfig;
        
        this.comboNumbers.forEach(number => {
            const startY = number.y;
            const peakY = startY - animation.riseHeight;
            
            number.setVisible(true).setAlpha(1);
            
            const riseAnim = this.scene.tweens.add({
                targets: number,
                y: peakY,
                duration: animation.riseDuration,
                ease: "Sine.easeOut",
                onComplete: () => {
                    const randomFactor = 1 - animation.randomFallVariation/2 + Math.random() * animation.randomFallVariation;
                    const fallDuration = animation.fallDuration * randomFactor;
                    const fadeStart = animation.fadeStartRatio * randomFactor;
                    
                    const fallAnim = this.scene.tweens.add({
                        targets: number,
                        y: startY,
                        duration: fallDuration,
                        ease: "Sine.easeIn",
                        onUpdate: (tween) => {
                            if (tween.progress >= fadeStart) {
                                number.setAlpha(1 - (tween.progress - fadeStart) / (1 - fadeStart));
                            }
                        },
                        onComplete: () => {
                            number.setVisible(false);
                            const index = this.activeNumberAnimations.findIndex(a => a.target === number);
                            if (index !== -1) this.activeNumberAnimations.splice(index, 1);
                            if (this.activeNumberAnimations.length === 0) this.clearComboNumbers();
                        }
                    });
                    
                    this.activeNumberAnimations.push(fallAnim);
                }
            });
            
            this.activeNumberAnimations.push(riseAnim);
        });
    }

    getRatingForTimeDiff(timeDiff) {
        timeDiff = Math.abs(timeDiff);
        if (timeDiff <= this.ratings.sick.timing) return "sick";
        if (timeDiff <= this.ratings.good.timing) return "good";
        if (timeDiff <= this.ratings.bad.timing) return "bad";
        if (timeDiff <= this.ratings.shit.timing) return "shit";
        return "miss";
    }

    recordHit(timeDiff) {
        const rating = this.getRatingForTimeDiff(timeDiff);
        
        if (rating === "bad" || rating === "shit") {
            this.combo = 0;
            this.showInitialZeros = true;
        } else {
            this.combo++;
        }
        
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        this.ratings[rating].count++;
        this.totalNotesHit++;
        this.totalNotes++;
        
        this.showRatingImage(rating);
        this.updateComboNumbers();
        
        return rating;
    }

    recordSustainHit() {
        // Only update score, no UI update needed
        this.score = (this.score || 0) + 100;
    }

    recordMiss() {
        this.misses++;
        this.combo = 0;
        this.ratings.miss.count++;
        this.totalNotes++;
        this.showInitialZeros = true;
        
        this.showRatingImage("miss");
        this.updateComboNumbers();
    }

    showRatingImage(rating) {
        const { positions, animation } = this.defaultConfig;
        const centerX = positions.rating.x !== null ? positions.rating.x : this.scene.cameras.main.width / 2;
        const startY = positions.rating.y;
        const peakY = startY - animation.riseHeight;
        const textureKey = `rating_${rating}`;

        if (!this.scene.textures.exists(textureKey)) {
            console.error(`Missing texture for rating: ${rating}`);
            return;
        }

        const newImage = this.scene.add.sprite(centerX, startY, textureKey)
            .setVisible(true)
            .setDepth(15)
            .setScale(animation.imageScale)
            .setAlpha(1);

        this.activeRatingInstances.push(newImage);
        this.animateRating(newImage, startY, peakY);
    }

    animateRating(image, startY, peakY) {
        const { animation } = this.defaultConfig;

        this.scene.tweens.add({
            targets: image,
            y: peakY,
            duration: animation.riseDuration,
            ease: "Sine.easeOut",
            onComplete: () => {
                const randomFactor = 1 - animation.randomFallVariation/2 + Math.random() * animation.randomFallVariation;
                const fallDuration = animation.fallDuration * randomFactor;
                const fadeStart = animation.fadeStartRatio * randomFactor;

                this.scene.tweens.add({
                    targets: image,
                    y: startY,
                    duration: fallDuration,
                    ease: "Sine.easeIn",
                    onUpdate: (tween) => {
                        if (tween.progress >= fadeStart) {
                            image.setAlpha(1 - (tween.progress - fadeStart) / (1 - fadeStart));
                        }
                    },
                    onComplete: () => {
                        const index = this.activeRatingInstances.indexOf(image);
                        if (index !== -1) this.activeRatingInstances.splice(index, 1);
                        image.destroy();
                    }
                });
            }
        });
    }

    reset() {
        this.activeNumberAnimations.forEach(anim => anim?.target?.scene && this.scene.tweens.killTweensOf(anim.target));
        this.activeRatingInstances.forEach(instance => {
            if (instance?.scene) {
                this.scene.tweens.killTweensOf(instance);
                instance.destroy();
            }
        });
        
        this.combo = this.maxCombo = this.misses = 0;
        this.totalNotes = this.totalNotesHit = 0;
        this.showInitialZeros = false;

        Object.values(this.ratings).forEach(rating => rating.count = 0);
        this.clearComboNumbers();
    }
}