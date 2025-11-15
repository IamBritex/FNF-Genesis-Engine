// import { NumberAnimation } from '../../ui/storymode/NumberAnimation.js'; // [ELIMINADO]

export class RatingText {
    // --- [MODIFICADO] ---
    // Aceptar 'ratingManager' (que será la instancia de Score.js)
    constructor(scene, ratingManager) {
    // --- [FIN MODIFICADO] ---
        this.scene = scene;
        
        // --- [MODIFICADO] ---
        // Asignar el manager recibido
        this.ratingManager = ratingManager;
        // --- [FIN MODIFICADO] ---
        
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
        this.container = this.scene.add.container(0, 0);
        this.container.setName("RatingText_container"); 

        // --- [MODIFICADO] ---
        // Posicionar el texto relativo a la barra de vida, centrado.
        // La barra está en (y: scene.scale.height - 70)
        const healthBarY = this.scene.scale.height - 70;
        
        // Aumentar el offset de 25 a 45 para que esté "más abajo"
        let yPosition = healthBarY + 45; 
        // --- [FIN MODIFICADO] ---

        this.mainText = this.scene.add.text(
            this.config.position.x, 
            yPosition,             
            '',
            this.config.style
        )
        .setOrigin(0.5) 
        .setScrollFactor(0)
        .setDepth(102); // Asegurarse de que esté visible

        this.container.add(this.mainText);

        // --- [MODIFICADO] ---
        // El depth se establece en PlayState.js
        // this.container.setDepth(101); 
        // --- [FIN MODIFICADO] ---
        this.container.setScrollFactor(0);
        this.container.setVisible(true);

        // --- [MODIFICADO] ---
        // La asignación a la UI Camera se hace en PlayState.js
        // if (this.scene.cameraController) {
        //     this.scene.cameraController.addToUILayer(this.container);
        // }
        // --- [FIN MODIFICADO] ---

        this.updateMainText();
    }

    updateMainText() {
        if (!this.ratingManager || !this.mainText) return;

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