/**
 * Muestra u oculta la caja de delimitación del elemento seleccionado.
 * (Lógica del caso 'toggleBoundingBox' de executeModule)
 * @param {import('../objects/Elements.js').ElementSelector} elementsManager El gestor de elementos.
 */
export function toggleBoundingBox(elementsManager) {
    if (elementsManager) {
        elementsManager.isBoxVisible = !elementsManager.isBoxVisible;
    }
}


/**
 * stage/CamerasBoxes.js
 * Crea y gestiona los rectángulos visuales que representan el campo
 * de visión de la cámara para cada personaje (BF, Dad, GF).
 */
export class CamerasBoxes {

    /**
     * @param {Phaser.Scene} scene La escena del StageEditor.
     * @param {import('../input/StageCharacters.js').StageCharacters} stageCharacters El gestor de personajes.
     */
    constructor(scene, stageCharacters) {
        this.scene = scene;
        this.stageCharacters = stageCharacters;

        /**
         * La resolución base del juego.
         * @type {{width: number, height: number}}
         */
        this.baseResolution = { width: 1280, height: 720 };
        
        // Colores distintivos
        const bfColor = 0x00ff00; // Verde
        const dadColor = 0xff0000; // Rojo
        const gfColor = 0xffff00; // Amarillo
        const alpha = 0.3; // 30% de opacidad

        /**
         * Rectángulo visual para la cámara de BF.
         * @type {Phaser.GameObjects.Rectangle}
         */
        this.bfBox = this.createBox(bfColor, alpha);
        
        /**
         * Rectángulo visual para la cámara de Dad.
         * @type {Phaser.GameObjects.Rectangle}
         */
        this.dadBox = this.createBox(dadColor, alpha);
        
        /**
         * Rectángulo visual para la cámara de GF.
         * @type {Phaser.GameObjects.Rectangle}
         */
        this.gfBox = this.createBox(gfColor, alpha);

        /**
         * Grupo que contiene todas las cajas de cámara para fácil gestión.
         * @type {Phaser.GameObjects.Group}
         */
        this.group = this.scene.add.group([this.bfBox, this.dadBox, this.gfBox]);
        
        // Profundidad alta
        this.group.setDepth(9996);
        
        this.isGroupVisible = false;
    }

    /**
     * Crea un rectángulo individual (camField).
     * @param {number} color El color de relleno (hex).
     * @param {number} alpha La opacidad (0-1).
     * @returns {Phaser.GameObjects.Rectangle}
     */
    createBox(color, alpha) {
        const rect = this.scene.add.rectangle(
            0, 0, 
            this.baseResolution.width, 
            this.baseResolution.height
        );
        rect.setOrigin(0, 0);
        rect.setFillStyle(color, alpha);
        rect.setStrokeStyle(2, color, 1.0); // Borde sólido
        rect.setVisible(false);
        return rect;
    }

    /**
     * Actualiza la posición y visibilidad de todas las cajas.
     * Se debe llamar en el 'update' de la escena principal.
     */
    update() {
        if (!this.stageCharacters || !this.stageCharacters.characterHandler) {
            return;
        }

        const { bf, dad, gf } = this.stageCharacters.characterHandler.characterElements;

        this.updateBox(this.bfBox, bf, 'player');
        this.updateBox(this.dadBox, dad, 'enemy');
        this.updateBox(this.gfBox, gf, 'gfVersion');
    }

    /**
     * Lógica para actualizar una caja específica.
     * @param {Phaser.GameObjects.Rectangle} box El rectángulo a actualizar.
     * @param {Phaser.GameObjects.Sprite} character El sprite del personaje.
     * @param {string} charKey La clave del personaje ('player', 'enemy', 'gfVersion').
     */
    updateBox(box, character, charKey) {
        // Ocultar la caja si el personaje no existe
        if (!character) {
            box.setVisible(false);
            return;
        }

        // Si el grupo NO es visible, la caja NO se muestra
        if (!this.isGroupVisible) {
            box.setVisible(false);
            return;
        }

        // Si llegamos aquí, el personaje existe Y el grupo es visible
        box.setVisible(true);

        const anchorX = character.x;
        const anchorY = character.y;

        const offsets = this.stageCharacters.getCameraOffsets(charKey);

        const focusX = anchorX + offsets.x;
        const focusY = anchorY + offsets.y;
        
        const camX = focusX - (this.baseResolution.width / 2);
        const camY = focusY - (this.baseResolution.height / 2);

        box.setPosition(camX, camY);
    }

    /**
     * Establece la visibilidad de todo el grupo de cajas.
     * @param {boolean} isVisible 
     */
    setVisible(isVisible) {
        this.isGroupVisible = isVisible;
    }

    /**
     * Limpia y destruye las cajas.
     */
    destroy() {
        if (this.group) {
            this.group.destroy(true); // Destruye el grupo y sus hijos
        }
        this.scene = null;
        this.stageCharacters = null;
        this.bfBox = null;
        this.dadBox = null;
        this.gfBox = null;
    }
}