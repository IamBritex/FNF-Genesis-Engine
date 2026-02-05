import { PlayEvents } from "../PlayEvents.js";

/**
 * PopUpManager.js
 * Maneja los efectos visuales de calificación y el combo.
 * Usa un Container para garantizar que se renderice en la capa UI.
 */
export class PopUpManager {

    constructor(scene, cameraManager) {
        this.scene = scene;
        this.cameraManager = cameraManager;
        this.isShuttingDown = false;

        // Container para agrupar visualmente todos los popups en la capa UI
        this.judgementContainer = this.scene.add.container(0, 0);
        
        if (this.cameraManager) {
            this.cameraManager.assignToUI(this.judgementContainer);
        }

        this.combo = 0;
        this.activePopUpSprites = [];
        
        this.comboConfig = {
            positions: {
                rating: { x: this.scene.cameras.main.width / 2, y: this.scene.cameras.main.height * 0.4 },
                comboNumbers: { x: 0, y: 60, spacing: 40 }
            },
            animation: {
                rating: { scale: 0.7, riseHeight: 30, riseDuration: 200, fallDuration: 500, randomFallVariation: 0.2, fadeStartRatio: 0.5 },
                combo: { scale: 0.5, riseHeight: 20, riseDuration: 150, fallDuration: 300, randomFallVariation: 0.4, fadeStartRatio: 0.6 }
            }
        };

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.scene.events.on(PlayEvents.NOTE_HIT, this.onNoteHit, this);
        this.scene.events.on(PlayEvents.NOTE_MISS, this.onNoteMiss, this);
    }

    static preload(scene) {
        const skinPath = 'public/images/ui/popup/funkin/';
        const ratings = ['sick', 'good', 'bad', 'shit'];
        ratings.forEach(r => scene.load.image(r, `${skinPath}${r}.png`));
        
        for (let i = 0; i < 10; i++) {
            scene.load.image(`num${i}`, `${skinPath}num${i}.png`);
        }
    }

    onNoteHit(data) {
        if (!data.isPlayer) return;
        this.showPopUp(data.rating);
    }

    onNoteMiss(data) {
        if (!data.isPlayer) return;
        this.showPopUp('miss');
    }

    _isSceneActive() {
        return this.scene && this.scene.sys && this.scene.sys.settings.active;
    }

    showPopUp(rating) {
        if (!this._isSceneActive() || this.isShuttingDown) return;

        // Actualizar Combo
        if (rating === 'sick' || rating === 'good' || rating === 'bad') {
            this.combo++;
            this.updateComboNumbers();
        } else {
            this.combo = 0;
        }

        // Mostrar Rating Sprite
        if (rating === 'miss') return;
        if (!this.scene.textures.exists(rating)) return;

        const { positions, animation } = this.comboConfig;
        const animConfig = animation.rating;
        const { x, y } = positions.rating;

        this._createAndAnimateSprite(rating, x, y, animConfig, 2000);
    }

    updateComboNumbers() {
        if (!this._isSceneActive() || this.isShuttingDown || this.combo === 0) return;
        
        const comboStr = this.combo.toString().padStart(3, '0');
        const { positions, animation } = this.comboConfig;
        const animConfig = animation.combo;

        const totalWidth = (comboStr.length * (43 * animConfig.scale));
        const startX = (positions.rating.x + positions.comboNumbers.x) - (totalWidth / 2);
        const baseY = positions.rating.y + positions.comboNumbers.y;

        for (let i = 0; i < comboStr.length; i++) {
            const digit = comboStr[i];
            const x = startX + (i * positions.comboNumbers.spacing);
            
            this._createAndAnimateSprite(`num${digit}`, x, baseY, animConfig, 1900);
        }
    }

    /**
     * Helper interno para crear y animar un sprite de popup de forma segura.
     */
    _createAndAnimateSprite(textureKey, x, y, animConfig, depth) {
        if (!this.scene.textures.exists(textureKey)) return;

        try {
            const sprite = this.scene.add.image(x, y, textureKey);
            
            // Agregar al contenedor UI
            if (this.judgementContainer) {
                this.judgementContainer.add(sprite);
            }
            
            sprite.setDepth(depth)
                  .setScale(animConfig.scale)
                  .setAlpha(1)
                  .setOrigin(0.5);

            this.activePopUpSprites.push(sprite);
            this._animatePopUp(sprite, animConfig);
        } catch (e) {
            // No
        }
    }

    _animatePopUp(target, animConfig) {
        if (!target || this.isShuttingDown) return;

        const startY = target.y;
        const peakY = startY - animConfig.riseHeight;
        
        this.scene.tweens.add({
            targets: target,
            y: peakY,
            duration: animConfig.riseDuration,
            ease: "Sine.easeOut",
            onComplete: () => {
                if (this.isShuttingDown || !target.active) return; 

                const randomFactor = 1 - animConfig.randomFallVariation/2 + Math.random() * animConfig.randomFallVariation;
                const fallDuration = animConfig.fallDuration * randomFactor;
                const fadeStart = animConfig.fadeStartRatio * randomFactor;
                
                this.scene.tweens.add({
                    targets: target,
                    y: startY,
                    duration: fallDuration,
                    ease: "Sine.easeIn",
                    onUpdate: (tween) => {
                        if (target.active && tween.progress >= fadeStart) {
                            target.setAlpha(1 - (tween.progress - fadeStart) / (1 - fadeStart));
                        }
                    },
                    onComplete: () => {
                        if (target.active && !this.isShuttingDown) {
                            target.destroy();
                            // Limpieza del array de tracking
                            const idx = this.activePopUpSprites.indexOf(target);
                            if (idx > -1) this.activePopUpSprites.splice(idx, 1);
                        }
                    }
                });
            }
        });
    }

    shutdown() {
        this.isShuttingDown = true;
        
        this.scene.events.off(PlayEvents.NOTE_HIT, this.onNoteHit, this);
        this.scene.events.off(PlayEvents.NOTE_MISS, this.onNoteMiss, this);
        
        if (this.scene && this.scene.tweens) {
            this.scene.tweens.killTweensOf(this.activePopUpSprites);
        }
        
        if (this.judgementContainer) {
            this.judgementContainer.destroy(); 
            this.judgementContainer = null;
        }
        
        this.activePopUpSprites = [];
        this.scene = null;
        this.cameraManager = null;
    }
}