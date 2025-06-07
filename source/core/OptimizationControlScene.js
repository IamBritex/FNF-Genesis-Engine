export class OptimizationControlScene extends Phaser.Scene {
    constructor() {
        super({ key: 'OptimizationControlScene', active: true });
    }

    create() {
        this.input.keyboard.on('keydown-O', () => {
            const currentMode = localStorage.getItem('ultraLowPerformanceMode') === 'true';
            const newMode = !currentMode;
            
            localStorage.setItem('ultraLowPerformanceMode', newMode);
            
            const message = this.add.text(this.cameras.main.centerX, 100, 
                `Switching to ${newMode ? 'Ultra Low' : 'High'} Performance Mode...`, 
                {
                    fontFamily: 'Arial',
                    fontSize: '20px',
                    color: '#FFFFFF',
                    backgroundColor: '#000000',
                    padding: { x: 10, y: 5 }
                }
            ).setOrigin(0.5);
            message.setDepth(10000);

            this.tweens.add({
                targets: message,
                alpha: 0,
                duration: 400,
                ease: 'Power2',
                onComplete: () => {
                    message.destroy();
                    window.location.reload();
                }
            });
        });
    }
}