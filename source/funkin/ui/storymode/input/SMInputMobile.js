import { smEvents } from '../events/SMEventBus.js';

export class SMInputMobile {
    constructor(handler) {
        this.handler = handler;
        this.scene = handler.scene;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.minSwipeDistance = 30;
        this.isProcessing = false;

        // Binding para poder remover el listener correctamente
        this.onDifficultyChangedBinding = this.updateDifficultyInteraction.bind(this);
    }

    setup() {
        // --- 1. Lógica de Swipe y Scroll (Original) ---
        this.onMouseWheel = async (pointer, gameObjects, deltaX, deltaY) => {
            if (this.isProcessing) return;
            this.isProcessing = true;
            
            if (deltaY > 0) await this.handler.navigateWeek(1);
            else if (deltaY < 0) await this.handler.navigateWeek(-1);

            this.scene.time.delayedCall(200, () => { this.isProcessing = false; });
        };
        this.scene.input.on('wheel', this.onMouseWheel);

        this.onPointerDown = (pointer) => {
            this.touchStartX = pointer.x;
            this.touchStartY = pointer.y;
        };

        this.onPointerUp = (pointer) => {
            if (this.isProcessing) return;

            const diffX = pointer.x - this.touchStartX;
            const diffY = pointer.y - this.touchStartY;
            const absX = Math.abs(diffX);
            const absY = Math.abs(diffY);

            // Solo activar swipe si la distancia es significativa
            if (absX > this.minSwipeDistance || absY > this.minSwipeDistance) {
                this.isProcessing = true;
                
                if (absX > absY) {
                    if (diffX < 0) this.handler.navigateDifficulty(1); 
                    else this.handler.navigateDifficulty(-1);
                } 
                else {
                    if (diffY < 0) this.handler.navigateWeek(1);
                    else this.handler.navigateWeek(-1);
                }

                this.scene.time.delayedCall(300, () => { this.isProcessing = false; });
            }
        };

        this.scene.input.on('pointerdown', this.onPointerDown);
        this.scene.input.on('pointerup', this.onPointerUp);

        // --- 2. Lógica de Interacción Directa (Touch/Click) ---
        this.setupUIInteraction();
    }

    setupUIInteraction() {
        const diffDisplay = this.handler.difficultyDisplay;
        const titlesDisplay = this.handler.titlesDisplay;

        // A) Flechas de Dificultad
        if (diffDisplay) {
            this.makeInteractive(diffDisplay.leftArrow, () => smEvents.emit('ui-difficulty-change', -1));
            this.makeInteractive(diffDisplay.rightArrow, () => smEvents.emit('ui-difficulty-change', 1));
            
            // Imagen de dificultad inicial
            this.updateDifficultyInteraction(); 
            
            // Escuchar cambios de dificultad para reactivar la nueva imagen
            smEvents.on('difficulty-changed', this.onDifficultyChangedBinding);
        }

        // B) Títulos de Semanas
        if (titlesDisplay && titlesDisplay.items) {
            titlesDisplay.items.forEach((item, index) => {
                this.makeInteractive(item, () => {
                    smEvents.emit('ui-week-select', index);
                });
            });
        }
    }

    updateDifficultyInteraction() {
        // Pequeño delay para asegurar que Difficulty.js ya creó el nuevo sprite
        // (Aunque al ser síncrono el evento, debería estar disponible inmediatamente si Difficulty se suscribe antes)
        const diffDisplay = this.handler.difficultyDisplay;
        if (diffDisplay && diffDisplay.activeSprite) {
            this.makeInteractive(diffDisplay.activeSprite, () => smEvents.emit('ui-difficulty-change', 1));
        }
    }

    makeInteractive(gameObject, callback) {
        if (!gameObject) return;

        // Si ya es interactivo, no lo duplicamos (opcional, pero buena práctica)
        if (!gameObject.input) {
            gameObject.setInteractive({ useHandCursor: true });
        }

        // Usamos 'pointerup' para detectar el toque final
        gameObject.on('pointerup', (pointer) => {
            // Evitar conflicto con el swipe: solo disparar si fue un tap corto (poca distancia)
            const dist = Phaser.Math.Distance.Between(pointer.downX, pointer.downY, pointer.upX, pointer.upY);
            if (dist < 10) { 
                callback();
            }
        });
    }

    destroy() {
        this.scene.input.off('wheel', this.onMouseWheel);
        this.scene.input.off('pointerdown', this.onPointerDown);
        this.scene.input.off('pointerup', this.onPointerUp);
        
        // Limpiar listener del bus
        smEvents.off('difficulty-changed', this.onDifficultyChangedBinding);
    }
}