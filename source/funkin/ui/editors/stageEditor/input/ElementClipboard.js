import { serializeElement, createFromData } from './ElementSerializer.js';

/**
 * Gestiona el portapapeles interno del editor (Copiar, Pegar, Duplicar).
 */
export class ElementClipboard {
    /**
     * @param {import('../StageEditor.js').StageEditor} scene La escena principal.
     * @param {import('../objects/Elements.js').ElementSelector} elementsManager
     */
    constructor(scene, elementsManager) {
        this.scene = scene;
        this.elementsManager = elementsManager;
        
        /**
         * Almacena los datos serializados del elemento copiado.
         * @type {object | null}
         */
        this.clipboardData = null;
    }

    /**
     * Copia el elemento actualmente seleccionado al portapapeles.
     */
    copySelectedElement() {
        if (!this.elementsManager.selectedElement) {
            this.scene.toastManager.show("Error", "No hay ningún elemento seleccionado.");
            return;
        }

        // Usamos el serializador interno, no el de guardado.
        this.clipboardData = serializeElement(this.elementsManager.selectedElement);
        
        const name = this.clipboardData.data.characterName || this.clipboardData.type;
        this.scene.toastManager.show("Elemento Copiado", `${name} copiado al portapapeles.`);
    }

    /**
     * Pega el elemento del portapapeles en la posición del ratón.
     */
    pasteFromClipboard() {
        if (!this.clipboardData) {
            this.scene.toastManager.show("Error", "El portapapeles está vacío.");
            return;
        }

        // Crear una copia de los datos
        const newData = JSON.parse(JSON.stringify(this.clipboardData));

        // Actualizar la posición a la del puntero del ratón en el mundo del juego
        newData.x = this.scene.input.activePointer.worldX;
        newData.y = this.scene.input.activePointer.worldY;

        // Crear el nuevo elemento a partir de los datos
        const newElement = createFromData(this.scene, newData);
        
        // createFromData ya se encarga de registrar y seleccionar
        this.scene.toastManager.show("Elemento Pegado", `${newData.data.characterName || newData.type} pegado.`);
    }

    /**
     * Duplica el elemento seleccionado (copia y pega inmediatamente).
     */
    duplicateSelectedElement() {
        if (!this.elementsManager.selectedElement) {
            this.scene.toastManager.show("Error", "No hay ningún elemento seleccionado.");
            return;
        }
        
        // Copiar
        const data = serializeElement(this.elementsManager.selectedElement);

        // Modificar posición (pegarlo ligeramente desplazado)
        data.x += 20;
        data.y += 20;

        // "Pegar"
        const newElement = createFromData(this.scene, data);
        
        const name = data.data.characterName || data.type;
        this.scene.toastManager.show("Elemento Duplicado", `${name} duplicado.`);
    }
}