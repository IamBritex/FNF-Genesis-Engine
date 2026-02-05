import { PlayEvents } from "../PlayEvents.js";

/**
 * RatingText.js
 * Muestra el texto de puntuación en pantalla (Score, Misses, Accuracy).
 */
export class RatingText {
    
    constructor(scene) {
        this.scene = scene;
        this.isBotPlay = false;
        
        this.config = {
            position: {
                x: scene.scale.width / 2,
                y: scene.scale.height - 30
            },
            style: {
                fontFamily: 'VCR OSD Mono',
                fontSize: '20px',
                color: '#FFFFFF',
                align: 'center',
                stroke: '#000000',
                strokeThickness: 3
            }
        };
        
        this.mainText = null;
        this.container = null;
        
        this.init();
        this.setupEventListeners();
    }

    init() {
        if (!this.scene) return;

        this.container = this.scene.add.container(0, 0);
        this.container.setName("RatingText_container");

        // Calcular posición relativa a la barra de vida
        const healthBarY = this.scene.scale.height - 70;
        const yPosition = healthBarY + 45;

        this.mainText = this.scene.add.text(
            this.config.position.x,
            yPosition,
            'Score: 0 | Misses: 0 | Accuracy: 0.00%',
            this.config.style
        );
        this.mainText.setOrigin(0.5).setScrollFactor(0).setDepth(102);

        this.container.add(this.mainText);
        this.container.setScrollFactor(0);
        this.container.alpha = 0;
    }

    show(duration = 250) {
        if (this.container && this.container.active && this.container.alpha === 0) {
            this.scene.tweens.add({
                targets: this.container,
                alpha: 1,
                duration: duration,
                ease: 'Linear'
            });
        }
    }

    setupEventListeners() {
        this.scene.events.on(PlayEvents.SCORE_CHANGED, this.onScoreChanged, this);
        this.scene.events.on(PlayEvents.BOTPLAY_CHANGED, this.onBotPlayChanged, this);
    }

    onBotPlayChanged(isBot) {
        this.isBotPlay = isBot;
        this.updateTextDisplay(0, 0, 0);
    }

    onScoreChanged(data) {
        this.updateTextDisplay(data.score, data.misses, data.accuracy);
    }

    updateTextDisplay(score, misses, accuracyVal) {
        if (!this.mainText || !this.mainText.active) return;

        if (this.isBotPlay) {
            this.mainText.setText("BOTPLAY");
            return;
        }

        const accPercent = (accuracyVal * 100).toFixed(2);
        const ratingLabel = this.getRatingString(accuracyVal);
        const newText = `Score: ${score} | Misses: ${misses} | Accuracy: ${accPercent}% | Rating: ${ratingLabel}`;
        
        this.mainText.setText(newText);
    }

    getRatingString(accuracy) {
        if (accuracy >= 1) return 'Perfect!!';
        if (accuracy >= 0.95) return 'Sick!';
        if (accuracy >= 0.9) return 'Great';
        if (accuracy >= 0.8) return 'Good';
        if (accuracy >= 0.7) return 'Meh';
        return 'Bad';
    }

    destroy() {
        if (this.scene) {
            this.scene.events.off(PlayEvents.SCORE_CHANGED, this.onScoreChanged, this);
            this.scene.events.off(PlayEvents.BOTPLAY_CHANGED, this.onBotPlayChanged, this);
        }
        
        if (this.container) {
            this.container.destroy(true);
            this.container = null;
        }
        
        this.mainText = null;
        this.scene = null;
    }
}