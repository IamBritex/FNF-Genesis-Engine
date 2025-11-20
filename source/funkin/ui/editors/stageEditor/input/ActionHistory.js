/**
 * source/funkin/ui/editors/stage/ActionHistory.js
 * Un manejador simple para las acciones de Deshacer (Undo) y Rehacer (Redo).
 */

// Importar el nuevo serializador
import { createFromData } from './ElementSerializer.js';

export class ActionHistory {

    /**
     * @param {Phaser.Scene} scene La escena principal (StageEditor)
     */
    constructor(scene) {
        this.scene = scene;
        this.undoStack = [];
        this.redoStack = [];
        
        this.maxHistory = 50;
    }

    /**
     * Añade una nueva acción al historial.
     * @param {object} action
     */
    addAction(action) {
        if (this.undoStack.length >= this.maxHistory) {
            this.undoStack.shift();
        }
        
        this.undoStack.push(action);
        
        if (this.redoStack.length > 0) {
            this.redoStack = [];
        }
        
        console.log(`[ActionHistory] Acción añadida: ${action.type}`);
    }

    /**
     * Deshace la última acción.
     */
    undo() {
        if (this.undoStack.length === 0) {
            console.log("[ActionHistory] Nada que deshacer.");
            return;
        }

        // Reproducir sonido de deshacer
        try {
            this.scene.sound.play('undo');
        } catch (e) {
            console.warn("No se pudo reproducir el sonido 'undo'.");
        }

        const action = this.undoStack.pop();
        this.redoStack.push(action);

        console.log(`[ActionHistory] Deshaciendo: ${action.type}`);
        this.executeAction(action, 'undo');
    }

    /**
     * Rehace la última acción deshecha.
     */
    redo() {
        if (this.redoStack.length === 0) {
            console.log("[ActionHistory] Nada que rehacer.");
            return;
        }

        const action = this.redoStack.pop();
        this.undoStack.push(action);

        console.log(`[ActionHistory] Rehaciendo: ${action.type}`);
        this.executeAction(action, 'redo');
    }

    /**
     * Ejecuta la lógica para revertir o reaplicar una acción.
     * @param {object} action La acción a ejecutar.
     * @param {'undo' | 'redo'} mode Modo de ejecución.
     */
    executeAction(action, mode) {
        const isUndo = (mode === 'undo');
        
        switch(action.type) {
            case 'move':
                const element = action.element;
                
                if (!element || !element.active) {
                    console.warn("[ActionHistory] El elemento de esta acción ya no existe.");
                    return;
                }

                const targetPos = isUndo ? action.oldPos : action.newPos;
                
                element.x = targetPos.x;
                element.y = targetPos.y;

                if (this.scene.elementsManager) {
                    this.scene.elementsManager.setSelected(element);
                }
                break;
            
            case 'delete':
                if (isUndo) {
                    // --- DESHACER ELIMINACIÓN (Re-crear) ---
                    // Usar el nuevo método centralizado
                    const newElement = createFromData(this.scene, action.elementData);
                    action.elementRef = newElement; 
                } else {
                    // --- REHACER ELIMINACIÓN (Destruir) ---
                    const elementToDestroy = action.elementRef;
                    if (elementToDestroy && elementToDestroy.active) {
                        this.scene.elementsManager.clearSelection();
                        elementToDestroy.destroy();
                        
                        if (this.scene.layersPanel) {
                            this.scene.layersPanel.refreshList();
                        }
                    } else {
                        console.warn("[ActionHistory] Redo: El elemento a eliminar ya no existía.");
                    }
                }
                break;
        }
    }

    /**
     * Limpia el historial.
     */
    clear() {
        this.undoStack = [];
        this.redoStack = [];
    }
}