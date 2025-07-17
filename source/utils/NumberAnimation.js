export class NumberAnimation {
    constructor(scene, textObject) {
        this.scene = scene;
        this.textObject = textObject;
        this.isAnimating = false;
        this.currentAnimation = null;
        this.isDestroyed = false;
    }

    stop() {
        if (this.currentAnimation) {
            this.scene.tweens.remove(this.currentAnimation);
        }
        this.isAnimating = false;
        this.currentAnimation = null;
    }

    destroy() {
        this.stop();
        this.isDestroyed = true;
        this.textObject = null;
        this.scene = null;
    }

    async animateNumber(start, end, prefix = "", suffix = "", duration = 500) {
        // Si el objeto está destruido o no hay texto, no hacer nada
        if (this.isDestroyed || !this.textObject || !this.textObject.scene) {
            return;
        }

        // Detener cualquier animación anterior
        this.stop();
        
        this.isAnimating = true;
        
        // Crear un objeto para animar
        const numberObj = { value: start };
        
        // Crear la animación
        this.currentAnimation = this.scene.tweens.add({
            targets: numberObj,
            value: end,
            duration: duration,
            ease: 'Linear',
            onUpdate: () => {
                // Verificar si el texto aún existe antes de actualizar
                if (this.textObject && this.textObject.scene) {
                    try {
                        const currentValue = Math.floor(numberObj.value);
                        const randomOffset = Math.floor(Math.random() * 10) - 5;
                        const displayValue = Math.max(0, currentValue + randomOffset);
                        this.textObject.setText(prefix + displayValue + suffix);
                    } catch (error) {
                        console.warn('Error updating number animation:', error);
                        this.stop();
                    }
                } else {
                    this.stop();
                }
            },
            onComplete: () => {
                // Verificar si el texto aún existe antes de la actualización final
                if (this.textObject && this.textObject.scene) {
                    try {
                        this.textObject.setText(prefix + end + suffix);
                    } catch (error) {
                        console.warn('Error setting final number:', error);
                    }
                }
                this.isAnimating = false;
                this.currentAnimation = null;
            }
        });
    }
}