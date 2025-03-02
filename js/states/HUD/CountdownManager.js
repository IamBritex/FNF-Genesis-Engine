export class CountdownManager {
    constructor(scene, callback) {
        this.scene = scene;
        this.callback = callback; // Lo que se ejecutará después del conteo
        this.countdownImages = ['set', 'ready', 'go'];
        this.step = 0;
    }

    startCountdown() {
        this.showStep();
    }

    showStep() {
        if (this.step < this.countdownImages.length) {
            const image = this.scene.add.image(this.scene.scale.width / 2, this.scene.scale.height / 2, this.countdownImages[this.step]);
            this.scene.time.delayedCall(1000, () => {
                image.destroy();
                this.step++;
                this.showStep();
            });
        } else {
            this.callback(); // Llamar la función cuando termine el conteo
        }
    }
}
