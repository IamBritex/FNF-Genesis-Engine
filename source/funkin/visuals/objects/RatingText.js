export class RatingText {
    constructor(scene) {
        this.scene = scene;
        this.ratingManager = scene.ratingManager;
        
        if (!this.ratingManager) {
            console.error('RatingManager no está disponible en la escena');
            return;
        }

        this.config = {
            position: {
                x: scene.scale.width / 2,
                y: scene.scale.height - 30
            },
            style: {
                fontFamily: 'VCR',
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
        // Crear contenedor principal
        this.container = this.scene.add.container(0, 0);
        this.container.setName("RatingText_container"); // Añadir nombre para debugging
        
        // Crear el texto dentro del contenedor
        this.mainText = this.scene.add.text(
            this.config.position.x,
            this.config.position.y,
            '',
            this.config.style
        )
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(999);

        // Agregar el texto al contenedor
        this.container.add(this.mainText);
        
        // Configurar el contenedor
        this.container.setDepth(1000);
        this.container.setScrollFactor(0);
        this.container.setVisible(true);
        
        // Añadir explícitamente a la capa UI
        if (this.scene.cameraController) {
            this.scene.cameraController.addToUILayer(this.container);
        }
        
        this.updateMainText();
    }

    updateMainText() {
        if (!this.ratingManager || !this.mainText) return;

        const score = this.ratingManager.score;
        const misses = this.ratingManager.misses;
        const combo = this.ratingManager.combo;
        const accuracy = (this.ratingManager.calculateAccuracy() * 100).toFixed(2);
        const rating = this.getRatingText(this.ratingManager.calculateAccuracy());

        const text = `Score: ${score} | Misses: ${misses} | Accuracy: ${accuracy}% | Rating: ${rating}`;
        this.mainText.setText(text);
        
        // Centrar y ajustar escala si es necesario
        const maxWidth = this.scene.scale.width - 40;
        if (this.mainText.width > maxWidth) {
            const scale = maxWidth / this.mainText.width;
            this.mainText.setScale(scale);
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
    }
}