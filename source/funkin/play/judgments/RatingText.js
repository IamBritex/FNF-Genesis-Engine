export class RatingText {
    constructor(scene, ratingManager) {
        this.scene = scene;
        this.ratingManager = ratingManager;
        this.isBotPlay = false; 
        
        if (!this.ratingManager) {
            console.error('RatingManager no está disponible para RatingText');
            return;
        }

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
        
        this.init();
        this.setupEventListeners();
    }

    init() {
        this.container = this.scene.add.container(0, 0);
        this.container.setName("RatingText_container"); 

        const healthBarY = this.scene.scale.height - 70;
        let yPosition = healthBarY + 45; 

        this.mainText = this.scene.add.text(
            this.config.position.x, 
            yPosition,             
            '',
            this.config.style
        )
        .setOrigin(0.5) 
        .setScrollFactor(0)
        .setDepth(102); 

        this.container.add(this.mainText);

        this.container.setScrollFactor(0);
        
        // [MODIFICADO] Inicia invisible
        this.container.alpha = 0;
        this.container.setVisible(true);

        this.updateMainText();
    }

    // [NUEVO] Método para aparecer
    show(duration = 250) {
        if (this.container && this.container.alpha === 0) {
            this.scene.tweens.add({
                targets: this.container,
                alpha: 1,
                duration: duration,
                ease: 'Linear'
            });
        }
    }

    setBotPlay(active) {
        this.isBotPlay = active;
        this.updateMainText();
    }

    updateMainText() {
        if (!this.ratingManager || !this.mainText) return;

        if (this.isBotPlay) {
            this.mainText.setText("BOTPLAY");
            return;
        }

        const score = this.ratingManager.score;
        const misses = this.ratingManager.misses;
        const accuracy = (this.ratingManager.calculateAccuracy() * 100).toFixed(2);
        const rating = this.getRatingText(this.ratingManager.calculateAccuracy());

        const newText = `Score: ${score} | Misses: ${misses} | Accuracy: ${accuracy}% | Rating: ${rating}`;
        
        if (this.mainText.text !== newText) {
            this.mainText.setText(newText);
        }
    }

    getRatingText(accuracy) {
        if (accuracy >= 1) return 'Perfect!!';
        if (accuracy >= 0.95) return 'Sick!';
        if (accuracy >= 0.9) return 'Great';
        if (accuracy >= 0.8) return 'Good';
        if (accuracy >= 0.7) return 'Meh';
        return 'Bad';
    }

    setupEventListeners() {
        if (!this.ratingManager?.events) return;

        const events = ['scoreChanged', 'comboChanged', 'noteHit', 'noteMiss'];
        events.forEach(event => {
            this.ratingManager.events.on(event, () => this.updateMainText());
        });
    }

    destroy() {
        if (this.container) {
            this.container.destroy(true);
        }
        if (this.ratingManager?.events) {
            this.ratingManager.events.removeAllListeners();
        }
        this.ratingManager = null;
    }
}