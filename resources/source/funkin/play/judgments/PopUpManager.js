/**
 * PopUpManager.js
 * Maneja la creación y animación de los sprites de juicio (Sick, Good, etc.)
 * y la lógica y animación del COMBO.
 */
export class PopUpManager {

    /**
     * @param {Phaser.Scene} scene - La escena (PlayScene).
     * @param {import('../camera/Camera.js').CameraManager} cameraManager - El gestor de cámaras.
     */
    constructor(scene, cameraManager) {
        this.scene = scene;
        this.cameraManager = cameraManager;

        this.judgementGroup = this.scene.add.group();
        // Asignamos el grupo a la UI (esto es bueno para la organización)
        this.cameraManager.assignToUI(this.judgementGroup);

        this.combo = 0;
        
        /**
         * Almacena las animaciones (tweens) de los NÚMEROS de combo activas.
         * @type {Array<Phaser.Tweens.Tween>}
         */
        this.activeComboTweens = [];

        /**
         * Configuración por defecto para las animaciones y posiciones.
         */
        this.comboConfig = {
            positions: {
                rating: { x: this.scene.cameras.main.width / 2, y: this.scene.cameras.main.height * 0.4 },
                comboNumbers: {
                    x: 0,
                    y: 60,
                    spacing: 40
                }
            },
            animation: {
                rating: {
                    scale: 0.7,
                    riseHeight: 30,
                    riseDuration: 200,
                    fallDuration: 500, 
                    randomFallVariation: 0.2,
                    fadeStartRatio: 0.5
                },
                combo: {
                    scale: 0.6,
                    riseHeight: 20,
                    riseDuration: 150,
                    fallDuration: 300,
                    randomFallVariation: 0.4, 
                    fadeStartRatio: 0.6
                }
            }
        };
    }

    /**
     * Precarga las imágenes necesarias.
     * @param {Phaser.Scene} scene 
     */
    static preload(scene) {
        const skinPath = 'public/images/ui/popup/funkin/';
        
        scene.load.image('sick', `${skinPath}sick.png`);
        scene.load.image('good', `${skinPath}good.png`);
        scene.load.image('bad', `${skinPath}bad.png`);
        scene.load.image('shit', `${skinPath}shit.png`);
        
        for (let i = 0; i < 10; i++) {
            scene.load.image(`num${i}`, `public/images/ui/popup/funkin/num${i}.png`);
        }
    }

    /**
     * Maneja el juicio, actualiza el combo y muestra los pop-ups.
     * @param {string} rating - El juicio ('sick', 'good', 'bad', 'shit', 'miss').
     */
    popUpScore(rating) {

        // --- [MODIFICADO] Lógica de Salud (Castigo/Recompensa) ---
        // 'this.scene' es el PlayScene, que tiene los métodos damage() y heal()
        if (this.scene && typeof this.scene.damage === 'function' && typeof this.scene.heal === 'function') {
            switch(rating) {
                case 'sick':
                    // Recompensa máxima
                    this.scene.heal(1.5); // (1.5 * healMultiplier)
                    break;
                case 'good':
                    // Recompensa normal
                    this.scene.heal(1.0); // (1.0 * healMultiplier)
                    break;
                case 'bad':
                    // Recompensa baja (o puedes poner 0 si 'bad' no cura)
                    this.scene.heal(0.5); // (0.5 * healMultiplier)
                    break;
                case 'shit':
                    // Castigo
                    this.scene.damage(1.0); // (1.0 * damageMultiplier)
                    break;
                case 'miss':
                    // Castigo máximo
                    this.scene.damage(1.5); // (1.5 * damageMultiplier)
                    break;
                // 'default' (si el rating es nulo o no reconocido) no hace nada.
            }
        }
        // --- [FIN MODIFICADO] ---


        
        // --- 1. Lógica de Combo ---
        if (rating === 'sick' || rating === 'good' || rating === 'bad') {
            this.combo++;
            this.updateComboNumbers(true); // Animar los números
        } else if (rating === 'shit' || rating === 'miss') {
            if (this.combo > 0) {
                this.combo = 0;
                this.clearComboNumbers(); // Limpiar números en pantalla
            }
        }

        // --- 2. Lógica de Calificación (Pop-up "Sick!", etc.) ---
        if (!rating || rating === 'miss' || !this.scene.textures.exists(rating)) {
            return;
        }

        const { positions, animation } = this.comboConfig;
        const animConfig = animation.rating;
        const { x, y } = positions.rating;

        const ratingSprite = this.judgementGroup.create(x, y, rating);
        if (!ratingSprite) return;

        // Asignamos explícitamente el sprite a la cámara UI
        // para quitarlo de la cámara del juego.
        this.cameraManager.assignToUI(ratingSprite);

        ratingSprite.setDepth(2000)
            .setScale(animConfig.scale)
            .setOrigin(0.5, 0.5)
            .setAlpha(1);

        this._animatePopUp(ratingSprite, animConfig, null);
    }

    /**
     * Muestra los números del combo actual.
     * @param {boolean} shouldAnimate - Si los números deben animarse.
     */
    updateComboNumbers(shouldAnimate = true) {
        if (this.combo === 0) return;
        
        this.clearComboNumbers();

        const comboStr = this.combo.toString().padStart(3, '0');
        const { positions, animation } = this.comboConfig;
        const { comboNumbers } = positions;
        const animConfig = animation.combo;

        const baseX = positions.rating.x + comboNumbers.x;
        const baseY = positions.rating.y + comboNumbers.y;
        
        const totalWidth = (comboStr.length - 1) * comboNumbers.spacing;
        const startX = baseX - (totalWidth / 2);

        comboStr.split('').forEach((digit, i) => {
            const x = startX + (i * comboNumbers.spacing);
            const textureKey = `num${digit}`;

            if (!this.scene.textures.exists(textureKey)) {
                console.error(`Missing texture for number: ${digit}`);
                return;
            }

            const numberImage = this.judgementGroup.create(x, baseY, textureKey);
            if (!numberImage) return;

            // Asignamos explícitamente CADA NÚMERO a la cámara UI.
            this.cameraManager.assignToUI(numberImage);

            numberImage.setDepth(1900) 
                .setScale(animConfig.scale) 
                .setAlpha(1);
            
            if (shouldAnimate) {
                this._animatePopUp(numberImage, animConfig, this.activeComboTweens);
            }
        });
    }

    /**
     * Limpia los números de combo activos en pantalla.
     */
    clearComboNumbers() {
        this.activeComboTweens.forEach(tween => {
            if (tween && tween.targets && tween.targets[0]) {
                tween.stop();
                tween.targets[0].destroy();
            }
        });
        this.activeComboTweens = [];
    }

    /**
     * Función de animación genérica para calificaciones Y números.
     * @param {Phaser.GameObjects.Sprite} target - El sprite a animar.
     * @param {object} animConfig - El objeto de configuración.
     * @param {Array<Phaser.Tweens.Tween> | null} tweenList - (Opcional) Array para rastrear la tween.
     */
    _animatePopUp(target, animConfig, tweenList) {
        if (!this.scene || !target) {
            return;
        }

        const startY = target.y;
        const peakY = startY - animConfig.riseHeight;
        
        const removeTween = (tween) => {
            if (!tweenList) return; 
            const index = tweenList.indexOf(tween);
            if (index !== -1) {
                tweenList.splice(index, 1);
            }
        };

        const riseAnim = this.scene.tweens.add({
            targets: target,
            y: peakY,
            duration: animConfig.riseDuration,
            ease: "Sine.easeOut",
            onComplete: () => {
                removeTween(riseAnim); 

                if (!this.scene || !target.scene) { 
                    target.destroy();
                    return;
                }

                const randomFactor = 1 - animConfig.randomFallVariation/2 + Math.random() * animConfig.randomFallVariation;
                const fallDuration = animConfig.fallDuration * randomFactor;
                const fadeStart = animConfig.fadeStartRatio * randomFactor;
                
                const fallAnim = this.scene.tweens.add({
                    targets: target,
                    y: startY,
                    duration: fallDuration,
                    ease: "Sine.easeIn",
                    onUpdate: (tween) => {
                        if (tween.progress >= fadeStart) {
                            target.setAlpha(1 - (tween.progress - fadeStart) / (1 - fadeStart));
                        }
                    },
                    onComplete: () => {
                        removeTween(fallAnim);
                        target.destroy(); 
                    },
                    onStop: () => {
                        removeTween(fallAnim);
                    }
                });
                
                if (tweenList) tweenList.push(fallAnim);
            },
            onStop: () => {
                removeTween(riseAnim);
            }
        });
        
        if (tweenList) tweenList.push(riseAnim);
    }

    /**
     * Limpia las referencias al apagar la escena.
     */
    shutdown() {
        this.clearComboNumbers(); 
        this.judgementGroup.destroy(true);
        this.scene = null;
        this.cameraManager = null;
    }
}