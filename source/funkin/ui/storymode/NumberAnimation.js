// ====== ARCHIVO: NumberAnimation.js ======
export class NumberAnimation {
    constructor(scene, textObject) {
        this.scene = scene;
        this.textObject = textObject;
        this.tween = null;
        this.isAnimating = false;
    }

    animateNumber(startValue, endValue, prefix = "", suffix = "", duration = 500) {
        // Detener animación anterior si existe
        this.stop();

        // Objeto para animar el valor
        let animatedValue = { value: startValue };
        this.isAnimating = true;

        this.tween = this.scene.tweens.add({
            targets: animatedValue,
            value: endValue,
            duration: duration,
            ease: 'Linear', // O la curva de easing que prefieras
            onUpdate: () => {
                if (this.textObject && this.textObject.active) {
                    this.textObject.setText(prefix + Math.round(animatedValue.value) + suffix);
                }
            },
            onComplete: () => {
                // Asegurar valor final exacto y limpiar
                if (this.textObject && this.textObject.active) {
                   this.textObject.setText(prefix + Math.round(endValue) + suffix);
                }
                this.isAnimating = false;
                this.tween = null;
            },
            onStop: () => {
                 // Asegurar valor final si se detiene
                if (this.textObject && this.textObject.active) {
                   this.textObject.setText(prefix + Math.round(endValue) + suffix);
                }
                this.isAnimating = false;
                this.tween = null;
            }
        });
    }

    stop() {
        if (this.tween) {
            this.tween.stop(); // Llama a onStop
        }
        this.isAnimating = false;
    }
}