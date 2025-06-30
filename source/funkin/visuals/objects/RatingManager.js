export class RatingManager {
    constructor(scene) {
        this.scene = scene;
        this.defaultConfig = {
            imagePaths: {
                sick: 'public/assets/images/ratings/sick.png',
                good: 'public/assets/images/ratings/good.png',
                bad: 'public/assets/images/ratings/bad.png',
                shit: 'public/assets/images/ratings/shit.png',
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
        this.events = new Phaser.Events.EventEmitter();
        this.score = 0; // Add score property
    }

    initProperties() {
        this.combo = 0;
        this.maxCombo = 0;
        this.misses = 0;
        this.score = 0;
        this.totalNotesHit = 0;
        this.totalNotes = 0;
        
        // Dentro de initProperties(), amplía las ventanas de precisión:
        this.ratings = {
            sick: { timing: 60, count: 0, weight: 1.0, score: 350 },   // antes 45
            good: { timing: 120, count: 0, weight: 0.75, score: 200 }, // antes 95
            bad:  { timing: 180, count: 0, weight: 0.5, score: 100 },  // antes 140
            shit: { timing: 250, count: 0, weight: 0.25, score: 50 },  // antes 180
            miss: { timing: Infinity, count: 0, weight: 0, score: -10 }
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
        
        // Crear un contenedor principal para todos los elementos del rating
        this.container = this.scene.add.container(0, 0);
        this.container.setDepth(100);
        
        // Asignar el contenedor a la capa UI
        if (this.scene.cameraController) {
            this.container.setScrollFactor(0);
            this.scene.cameraController.addToUILayer(this.container);
        }
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

    updateComboNumbers(shouldAnimate = true) {
        // Ya no llamamos a clearComboNumbers() al inicio
        
        // Si el combo es 0, no mostramos nada
        if (this.combo === 0) return;
        
        const comboStr = this.combo.toString().padStart(3, '0');
        const { positions } = this.defaultConfig;
        const { comboNumbers } = positions;
        
        const baseX = positions.rating.x !== null ? positions.rating.x : this.scene.cameras.main.width / 2;
        const baseY = positions.rating.y + comboNumbers.y;
        
        const totalWidth = (comboStr.length - 1) * comboNumbers.spacing;
        const startX = baseX - (totalWidth / 2) + comboNumbers.x;

        comboStr.split('').forEach((digit, i) => {
            const x = startX + (i * comboNumbers.spacing);
            const textureKey = `number_${digit}`;

            if (!this.scene.textures.exists(textureKey)) {
                console.error(`Missing texture for number: ${digit}`);
                return;
            }

            const numberImage = this.scene.add.sprite(x, baseY, textureKey)
                .setVisible(true)
                .setDepth(100)
                .setScale(comboNumbers.scale)
                .setRotation(comboNumbers.rotation * Math.PI / 180)
                .setAlpha(1)
                .setScrollFactor(0);

            // Añadir al contenedor UI
            this.container.add(numberImage);
            this.comboNumbers.push(numberImage);
            
            if (shouldAnimate) {
                this.animateComboNumber(numberImage);
            }
        });
    }

    clearComboNumbers() {
        // Solo matamos las tweens activas sin destruir los números
        this.activeNumberAnimations.forEach(anim => anim?.target?.scene && this.scene.tweens.killTweensOf(anim.target));
        this.activeNumberAnimations = [];
    }

    animateComboNumber(number) {
        const { animation } = this.defaultConfig;
        const startY = number.y;
        const peakY = startY - animation.riseHeight;
        
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
                        // Eliminamos el número solo cuando termina su animación
                        const index = this.comboNumbers.indexOf(number);
                        if (index !== -1) {
                            this.comboNumbers.splice(index, 1);
                        }
                        number.destroy();
                    }
                });
                
                this.activeNumberAnimations.push(fallAnim);
            }
        });
        
        this.activeNumberAnimations.push(riseAnim);
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
        
        // Actualizar combo
        if (rating === "shit") {
            this.combo = 0;
            this.clearComboNumbers();
        } else {
            this.combo++;
            this.maxCombo = Math.max(this.maxCombo, this.combo);
            this.updateComboNumbers(true);
        }
        
        // Actualizar score y contadores
        const baseScore = this.ratings[rating].score;
        const comboMultiplier = Math.floor(this.combo / 10);
        this.score += baseScore + (comboMultiplier * 10);
        
        this.ratings[rating].count++;
        this.totalNotesHit++;
        this.totalNotes++;
        
        // Emitir eventos
        this.events.emit('noteHit', { rating, timeDiff });
        this.events.emit('comboChanged', this.combo);
        this.events.emit('scoreChanged', this.score);
        
        this.showRatingImage(rating);
        
        return rating;
    }

    recordSustainHit() {
        // Actualizar score para notas sustain
        const sustainScore = 50;
        this.score += sustainScore;
        this.events.emit('scoreChanged', this.score);
    }

    recordMiss() {
        this.combo = 0;
        this.misses++;
        this.ratings.miss.count++;
        this.totalNotes++;
        this.score += this.ratings.miss.score;
        
        this.clearComboNumbers();
        
        // Emitir eventos
        this.events.emit('noteMiss');
        this.events.emit('comboChanged', this.combo);
        this.events.emit('scoreChanged', this.score);
        
        this.showRatingImage("miss");
    }

    showRatingImage(rating) {
        if (rating === "miss") return;

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
            .setDepth(100)
            .setScale(animation.imageScale)
            .setAlpha(1)
            .setScrollFactor(0);

        // Añadir la imagen al contenedor UI
        this.container.add(newImage);
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

    getResults() {
        const accuracy = this.calculateAccuracy();
        
        return {
            score: this.score,
            misses: this.misses,
            combo: this.combo,
            maxCombo: this.maxCombo,
            accuracy: accuracy,
            totalNotes: this.totalNotes,
            ratings: this.ratings
        };
    }

    calculateAccuracy() {
        if (this.totalNotes === 0) return 0;
        
        const weightedSum = 
            (this.ratings.sick.count * this.ratings.sick.weight) +
            (this.ratings.good.count * this.ratings.good.weight) +
            (this.ratings.bad.count * this.ratings.bad.weight) +
            (this.ratings.shit.count * this.ratings.shit.weight);
        
        return weightedSum / this.totalNotes;
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
        this.score = 0;

        Object.values(this.ratings).forEach(rating => rating.count = 0);
        this.clearComboNumbers();
    }

    on(event, fn) {
        this.events.on(event, fn);
   }

    // Añadir método para guardar datos en localStorage
    saveScoreData(songName, difficulty) {
        const accuracy = this.calculateAccuracy();
        const scoreData = {
            score: this.score,
            combo: this.combo,
            maxCombo: this.maxCombo,
            misses: this.misses,
            totalNotesHit: this.totalNotesHit,
            totalNotes: this.totalNotes,
            accuracy: accuracy,
            difficulty: difficulty
        };

        // Guardar datos específicos de la canción
        const songKey = `score_${songName}_${difficulty}`;
        
        // Verificar si hay un puntaje anterior
        const existingData = localStorage.getItem(songKey);
        if (existingData) {
            const oldScore = JSON.parse(existingData).score;
            // Solo guardar si el nuevo puntaje es mayor
            if (this.score > oldScore) {
                localStorage.setItem(songKey, JSON.stringify(scoreData));
            }
        } else {
            // Si no hay puntaje anterior, guardar el nuevo
            localStorage.setItem(songKey, JSON.stringify(scoreData));
        }

        return scoreData;
    }

    // Añadir método para cargar datos
    loadScoreData(songName, difficulty) {
        const songKey = `score_${songName}_${difficulty}`;
        const savedData = localStorage.getItem(songKey);
        return savedData ? JSON.parse(savedData) : null;
    }
}