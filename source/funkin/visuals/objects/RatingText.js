export class RatingText {
    constructor(scene) {
        this.scene = scene;
        this.ratingManager = scene.ratingManager;
        this.arrowsManager = scene.arrowsManager;
        
        if (!this.ratingManager) {
            console.error('RatingManager no está disponible en la escena');
            return;
        }

        this.textGroup = [];
        this.config = {
            position: {
                x: this.scene.cameras.main.width / 2,
                y: this.scene.cameras.main.height - 30
            },
            style: {
                fontFamily: 'VCR', // CAMBIO: usar la fuente cargada
                fontSize: '20px',
                color: '#FFFFFF',
                align: 'center',
                stroke: '#000000',
                strokeThickness: 3
            },
            spacing: 5
        };
        
        this.init();
        this.setupEventListeners();
        this.updateTexts();
    }

    init() {
        this.mainText = this.scene.add.text(
            this.config.position.x,
            this.config.position.y,
            '',
            this.config.style
        )
        .setDepth(150) // CAMBIO: profundidad establecida a 150
        .setOrigin(0.5, 0.5);

        this.updateMainText();
    }

    updateMainText() {
        if (!this.ratingManager) return;

        const score = this.ratingManager.score;
        const misses = this.ratingManager.misses;
        const combo = this.ratingManager.combo;
        const accuracy = (this.ratingManager.calculateAccuracy() * 100).toFixed(2);
        const rating = this.getRatingText(this.ratingManager.calculateAccuracy());

        // Formato con separador |
        const text = `Score: ${score} | Misses: ${misses} | Accuracy: ${accuracy}% | Combo: ${combo} | Rating: ${rating}`;
        
        this.mainText.setText(text);

        // Mantener centrado y ajustar escala si es necesario
        const maxWidth = this.scene.cameras.main.width - 40; // 20px de margen a cada lado
        if (this.mainText.width > maxWidth) {
            const scale = maxWidth / this.mainText.width;
            this.mainText.setScale(scale);
        } else {
            this.mainText.setScale(1);
        }

        // Asegurar que el texto permanezca centrado después de cambios
        this.mainText.x = this.scene.cameras.main.width / 2;
    }

    setupEventListeners() {
        if (!this.ratingManager) return;

        // Usar bind para mantener el contexto correcto
        const boundUpdate = this.updateMainText.bind(this);

        this.ratingManager.events.on('scoreChanged', boundUpdate);
        this.ratingManager.events.on('comboChanged', boundUpdate);
        this.ratingManager.events.on('noteHit', boundUpdate);
        this.ratingManager.events.on('noteMiss', boundUpdate);

        // Actualización periódica como respaldo
        this.updateTimer = this.scene.time.addEvent({
            delay: 100,
            callback: boundUpdate,
            loop: true
        });
    }

    getRatingText(accuracy) {
        if (accuracy >= 1) return 'Perfect!!';
        if (accuracy >= 0.95) return 'Sick!';
        if (accuracy >= 0.9) return 'Great';
        if (accuracy >= 0.8) return 'Good';
        if (accuracy >= 0.7) return 'Meh';
        return 'Bad';
    }

    // Actualizar textos (mantener por compatibilidad)
    updateTexts() {
        this.updateMainText();
    }

    destroy() {
        if (this.updateTimer) {
            this.updateTimer.remove();
        }

        if (this.ratingManager?.events) {
            this.ratingManager.events.removeAllListeners();
        }

        if (this.mainText) {
            this.mainText.destroy();
        }
    }
}