export class ActionHistory {
    /**
     * @param {Phaser.Scene} scene La escena principal para acceder a Toast y sonidos.
     */
    constructor(scene) {
        this.scene = scene;
        this.undoStack = [];
        this.redoStack = [];
        this.maxHistory = 50; // Límite de pasos guardados
    }

    /**
     * Registra una nueva acción en el historial.
     * @param {Object} action Objeto con estructura { undo: Function, redo: Function, description: string }
     */
    add(action) {
        if (!action.undo || !action.redo) {
            console.warn("ActionHistory: Acción inválida (faltan métodos undo/redo)", action);
            return;
        }
        
        // Al hacer algo nuevo, el futuro alternativo (redo) se pierde
        this.redoStack = [];
        
        this.undoStack.push(action);
        
        // Mantener el límite de memoria
        if (this.undoStack.length > this.maxHistory) {
            this.undoStack.shift(); 
        }
        
        console.log(`[History] Acción añadida: ${action.description || 'Sin descripción'}`);
    }

    undo() {
        if (this.undoStack.length === 0) {
            this.scene.toastManager.show("Info", "Nada que deshacer.");
            return;
        }

        const action = this.undoStack.pop();
        action.undo();
        this.redoStack.push(action);
        
        this.scene.toastManager.show("Deshacer", action.description || "Acción deshecha");
        if (this.scene.sound.get('undo')) this.scene.sound.play('undo');
    }

    redo() {
        if (this.redoStack.length === 0) {
            this.scene.toastManager.show("Info", "Nada que rehacer.");
            return;
        }

        const action = this.redoStack.pop();
        action.redo();
        this.undoStack.push(action);
        
        this.scene.toastManager.show("Rehacer", action.description || "Acción rehecha");
        // Usamos el mismo sonido o uno diferente si tuvieras 'redo'
        if (this.scene.sound.get('undo')) this.scene.sound.play('undo'); 
    }
    
    clear() {
        this.undoStack = [];
        this.redoStack = [];
    }
}